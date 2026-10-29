import { useState, useEffect } from 'react'
import { X, Check, Rocket, Globe } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { isReadOnlyUser } from '../lib/auth'

interface ModulosModalProps {
  isOpen: boolean
  onClose: () => void
  clienteId: string | null
  clienteNome: string
}

type ModuloMantran = {
  id: string
  nome: string
  tipo: string
}

const MELI_NOME = 'Mercado Livre'
const NFSE_NOME = 'NFSE'
const MANTRAN_WEB_NOME = 'MantranWeb'

export function ModulosModal({ isOpen, onClose, clienteId, clienteNome }: ModulosModalProps) {
  const [modulosDisponiveis, setModulosDisponiveis] = useState<ModuloMantran[]>([])
  const [clienteModulos, setClienteModulos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [implBusy, setImplBusy] = useState(false)
  const [implMsg, setImplMsg] = useState('')
  // Implantações já existentes do cliente — para esconder o botão se já criada.
  const [implantacoesCliente, setImplantacoesCliente] = useState<any[]>([])

  const temMeli = clienteModulos.includes(MELI_NOME)
  const temNfse = clienteModulos.includes(NFSE_NOME)

  // Já existe implantação dedicada daquele módulo? (pelo card de treinamento)
  const temCard = (nomeCard: string) =>
    implantacoesCliente.some(impl =>
      (impl.implantacao_etapas || []).some(
        (e: any) => (e.nome_etapa || '').trim().toLowerCase() === nomeCard
      )
    )
  const jaTemImplNfse = temCard('treinamento nfse')
  const jaTemImplMeli = temCard('treinamento meli') || temCard('mercado livre')

  // Cards de cada implantação dedicada (sempre os 4, variando só o treinamento)
  const CARDS_BASE = ['Checkpoint', 'Configurar Base', 'Testes']
  const CARDS_NFSE = [...CARDS_BASE, 'Treinamento NFSE']
  const CARDS_MELI = [...CARDS_BASE, 'Treinamento MELI']

  useEffect(() => {
    if (isOpen) {
      fetchDados()
    } else {
      setClienteModulos([])
      setImplMsg('')
      setImplantacoesCliente([])
    }
  }, [isOpen, clienteId])

  const fetchImplantacoesCliente = async () => {
    if (!clienteId) { setImplantacoesCliente([]); return }
    try {
      const lista = await api.getImplantacoesByClienteId(clienteId)
      setImplantacoesCliente(lista || [])
    } catch (err) {
      console.error('Erro ao buscar implantações do cliente:', err)
      setImplantacoesCliente([])
    }
  }

  // Cria uma implantação DEDICADA para um módulo (NFSE ou MELI) com os 4 cards.
  // Cada clique cria uma nova implantação (sem travar duplicação), conforme pedido.
  const criarImplantacaoDedicada = async (modulo: 'NFSE' | 'MELI') => {
    if (!clienteId || isReadOnlyUser()) return
    const cards = modulo === 'MELI' ? CARDS_MELI : CARDS_NFSE
    setImplBusy(true)
    setImplMsg('')
    try {
      const nova = await api.createImplantacaoComCards({
        cliente_id: clienteId,
        nome_empresa: clienteNome,
        cards
      })
      setImplMsg(`Implantação de ${modulo} criada com sucesso.`)
      await fetchImplantacoesCliente()
      const tipoLabel = (nova?.tipo_cliente || '').toUpperCase() === 'SHOPEE' ? 'Shopee' : 'Padrão'
      await api.createNotificacao({
        titulo: `🚀 Nova Implantação (${modulo}): ${clienteNome}`,
        mensagem: `A implantação de ${modulo} da empresa "${clienteNome}" (${tipoLabel}) foi iniciada. Cards: ${cards.join(', ')}.`,
        tipo: 'nova_implantacao',
        implantacao_id: nova?.id || null,
        cliente_id: clienteId,
        dados_extras: {
          nome_empresa: clienteNome,
          tipo_cliente: nova?.tipo_cliente || null,
          origem: 'modulos_cliente',
          modulo,
          cards
        }
      }).catch(err => console.warn('Aviso ao notificar nova implantação:', err))
    } catch (err: any) {
      console.error('Erro ao criar implantação dedicada:', err)
      setImplMsg('Erro: ' + (err?.message || 'Falha na operação'))
    } finally {
      setImplBusy(false)
    }
  }

  const fetchDados = async () => {
    setLoading(true)
    try {
      // 1. Todos os módulos/integrações disponíveis
      const { data: mantranData, error: err1 } = await supabase
        .from('modulos_mantran')
        .select('*')
        .order('nome', { ascending: true })
      if (err1) throw err1
      setModulosDisponiveis(mantranData || [])

      // 2. Módulos já marcados do cliente
      if (clienteId) {
        const { data: clientData, error: err2 } = await supabase
          .from('modulos')
          .select('nome_modulo')
          .eq('cliente_id', clienteId)
        if (err2) throw err2
        setClienteModulos(clientData ? clientData.map(m => m.nome_modulo) : [])
      }

      await fetchImplantacoesCliente()
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const isMantranWeb = clienteModulos.includes(MANTRAN_WEB_NOME)

  const handleToggle = async (nomeModulo: string, isChecked: boolean) => {
    if (!clienteId || isReadOnlyUser()) return

    try {
      if (nomeModulo === MANTRAN_WEB_NOME) {
        await api.setClienteMantranWeb(clienteId, isChecked)
        if (isChecked) {
          setClienteModulos(prev => [...prev.filter(m => m !== MANTRAN_WEB_NOME), MANTRAN_WEB_NOME])
        } else {
          setClienteModulos(prev => prev.filter(m => m !== MANTRAN_WEB_NOME))
        }
        window.dispatchEvent(new CustomEvent('mantran:modulos-updated', { detail: { clienteId, nomeModulo, isChecked } }))
        return
      }

      if (isChecked) {
        // Add module
        const { error } = await supabase.from('modulos').insert([{
          cliente_id: clienteId,
          nome_modulo: nomeModulo,
          ativo: true
        }])
        if (error) throw error
        setClienteModulos(prev => [...prev, nomeModulo])
      } else {
        // Remove module
        const { error } = await supabase.from('modulos')
          .delete()
          .eq('cliente_id', clienteId)
          .eq('nome_modulo', nomeModulo)
        if (error) throw error
        setClienteModulos(prev => prev.filter(m => m !== nomeModulo))
      }
      window.dispatchEvent(new CustomEvent('mantran:modulos-updated', { detail: { clienteId, nomeModulo, isChecked } }))
    } catch (err: any) {
      console.error('Erro ao alternar módulo:', err)
      alert('Erro ao atualizar: ' + err.message)
    }
  }

  if (!isOpen) return null

  const modulosList = modulosDisponiveis.filter(m => m.tipo === 'MÓDULO' && m.nome !== MANTRAN_WEB_NOME)
  const integracoesList = modulosDisponiveis.filter(m => m.tipo === 'INTEGRAÇÃO' && m.nome !== MANTRAN_WEB_NOME)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Módulos e Integrações</h2>
            <p className="text-sm text-slate-400">{clienteNome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* FLAG MANTRANWEB NO TOPO */}
          {!loading && (
            <div className={`mb-6 p-4 rounded-xl border transition-all duration-300 flex items-center justify-between gap-4 ${
              isMantranWeb 
                ? 'bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-950/20' 
                : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
            }`}>
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                  isMantranWeb 
                    ? 'bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/25' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <Globe className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white tracking-wide">MantranWeb</h3>
                    {isMantranWeb ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs">
                        <Check className="w-3 h-3 text-cyan-400" /> Migrado para a Web
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Ambiente C# (Desktop Legado)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isMantranWeb 
                      ? 'Este cliente já foi migrado com sucesso e está operando na nova plataforma 100% Web.' 
                      : 'Marque esta flag quando o cliente for migrado do C# para a nova plataforma totalmente Web.'}
                  </p>
                </div>
              </div>

              {/* Flag / Switch */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                  {isMantranWeb ? 'Ativo' : 'Inativo'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isMantranWeb}
                    disabled={!clienteId || isReadOnlyUser()}
                    onChange={(e) => handleToggle(MANTRAN_WEB_NOME, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-8 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all cursor-pointer ${
                    isMantranWeb ? 'peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-emerald-500 shadow-md shadow-cyan-500/20' : ''
                  }`}></div>
                </label>
              </div>
            </div>
          )}
          {/* Faixa de ação: aparece quando NFSE/MELI marcado E ainda não existe
              implantação dedicada daquele módulo. Some após criar. */}
          {!loading && ((temNfse && !jaTemImplNfse) || (temMeli && !jaTemImplMeli)) && !isReadOnlyUser() && (
            <div className="mb-6 p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <Rocket className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-brand-200">Criar implantação dedicada</p>
                  <p className="text-xs text-brand-200/70">
                    Cada módulo gera uma implantação própria com os cards: Checkpoint, Configurar Base, Testes e o treinamento correspondente.
                  </p>
                  {implMsg && <p className="text-[11px] text-brand-300 mt-1 font-semibold">{implMsg}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {temNfse && !jaTemImplNfse && (
                  <button
                    type="button"
                    onClick={() => criarImplantacaoDedicada('NFSE')}
                    disabled={implBusy}
                    className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 rounded-lg shadow-lg shadow-brand-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>{implBusy ? 'Processando...' : 'Criar Implantação NFSE'}</span>
                  </button>
                )}
                {temMeli && !jaTemImplMeli && (
                  <button
                    type="button"
                    onClick={() => criarImplantacaoDedicada('MELI')}
                    disabled={implBusy}
                    className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-lg shadow-lg shadow-amber-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>{implBusy ? 'Processando...' : 'Criar Implantação MELI'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Seção Módulos */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-slate-800">
                  Módulos Mantran
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modulosList.map(modulo => {
                    const isChecked = clienteModulos.includes(modulo.nome)
                    return (
                      <label 
                        key={modulo.id} 
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isChecked 
                            ? 'bg-brand-500/10 border-brand-500/50 text-brand-300' 
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${
                          isChecked ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-500 bg-slate-900/50'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => handleToggle(modulo.nome, e.target.checked)}
                        />
                        <span className="text-sm font-medium">{modulo.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Seção Integrações */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-slate-800">
                  Integrações
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {integracoesList.map(modulo => {
                    const isChecked = clienteModulos.includes(modulo.nome)
                    return (
                      <label 
                        key={modulo.id} 
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isChecked 
                            ? 'bg-purple-500/10 border-purple-500/50 text-purple-300' 
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${
                          isChecked ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-500 bg-slate-900/50'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => handleToggle(modulo.nome, e.target.checked)}
                        />
                        <span className="text-sm font-medium">{modulo.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
