import { useState, useEffect } from 'react'
import { X, Check, Rocket, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

export function ModulosModal({ isOpen, onClose, clienteId, clienteNome }: ModulosModalProps) {
  const navigate = useNavigate()
  const [modulosDisponiveis, setModulosDisponiveis] = useState<ModuloMantran[]>([])
  const [clienteModulos, setClienteModulos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  // Implantação atual do cliente (se houver) — define o comportamento do botão de implantação.
  const [implantacaoCliente, setImplantacaoCliente] = useState<any | null>(null)
  const [implBusy, setImplBusy] = useState(false)
  const [implMsg, setImplMsg] = useState('')

  const temMeli = clienteModulos.includes(MELI_NOME)
  const temNfse = clienteModulos.includes(NFSE_NOME)
  // Habilita o fluxo de implantação se NFSE ou MELI estiver ativo.
  const habilitaImplantacao = temMeli || temNfse

  useEffect(() => {
    if (isOpen) {
      fetchDados()
    } else {
      setClienteModulos([])
      setImplantacaoCliente(null)
      setImplMsg('')
    }
  }, [isOpen, clienteId])

  const fetchImplantacaoCliente = async () => {
    if (!clienteId) { setImplantacaoCliente(null); return }
    try {
      const impl = await api.getImplantacaoByClienteId(clienteId)
      setImplantacaoCliente(impl)
    } catch (err) {
      console.error('Erro ao buscar implantação do cliente:', err)
      setImplantacaoCliente(null)
    }
  }

  const handleCriarImplantacao = async () => {
    if (!clienteId || isReadOnlyUser()) return
    // Cards a incluir conforme os módulos ativos (MELI e/ou NFSE)
    const cards: string[] = []
    if (temMeli) cards.push(MELI_NOME)
    if (temNfse) cards.push(NFSE_NOME)
    if (cards.length === 0) return

    setImplBusy(true)
    setImplMsg('')
    try {
      if (implantacaoCliente) {
        // Já existe implantação → adiciona apenas os cards que faltam
        const adicionados: string[] = []
        for (const card of cards) {
          const ok = await api.addEtapaToImplantacao(implantacaoCliente.id, card)
          if (ok) adicionados.push(card)
        }
        if (adicionados.length > 0) {
          setImplMsg(`Card(s) adicionado(s): ${adicionados.join(', ')}.`)
          await api.createNotificacao({
            titulo: `➕ Cards adicionados: ${clienteNome}`,
            mensagem: `Novo(s) card(s) adicionado(s) à implantação da empresa "${clienteNome}": ${adicionados.join(', ')}.`,
            tipo: 'nova_implantacao',
            implantacao_id: implantacaoCliente.id,
            cliente_id: clienteId,
            dados_extras: { nome_empresa: clienteNome, origem: 'modulos_cliente', cards: adicionados }
          }).catch(err => console.warn('Aviso ao notificar cards:', err))
        } else {
          setImplMsg('A implantação já possui esse(s) card(s).')
        }
        await fetchImplantacaoCliente()
      } else {
        // Sem implantação → cria uma com os cards marcados
        const nova = await api.createImplantacaoComCards({
          cliente_id: clienteId,
          nome_empresa: clienteNome,
          cards
        })
        setImplantacaoCliente({ ...nova, implantacao_etapas: cards.map(c => ({ nome_etapa: c })) })
        setImplMsg('Implantação criada com sucesso.')
        // Notifica a equipe de Suporte sobre a NOVA implantação ativada pelo Comercial
        const tipoLabel = (nova?.tipo_cliente || '').toUpperCase() === 'SHOPEE' ? 'Shopee' : 'Padrão'
        await api.createNotificacao({
          titulo: `🚀 Nova Implantação: ${clienteNome}`,
          mensagem: `A implantação da empresa "${clienteNome}" (${tipoLabel}) foi iniciada. Cards: ${cards.join(', ')}.`,
          tipo: 'nova_implantacao',
          implantacao_id: nova?.id || null,
          cliente_id: clienteId,
          dados_extras: {
            nome_empresa: clienteNome,
            tipo_cliente: nova?.tipo_cliente || null,
            origem: 'modulos_cliente',
            cards
          }
        }).catch(err => console.warn('Aviso ao notificar nova implantação:', err))
      }
    } catch (err: any) {
      console.error('Erro ao criar/atualizar implantação:', err)
      setImplMsg('Erro: ' + (err?.message || 'Falha na operação'))
    } finally {
      setImplBusy(false)
    }
  }

  const fetchDados = async () => {
    setLoading(true)
    try {
      // 1. Fetch all available modules
      const { data: mantranData, error: err1 } = await supabase
        .from('modulos_mantran')
        .select('*')
        .order('nome', { ascending: true })
      
      if (err1) throw err1
      setModulosDisponiveis(mantranData || [])

      // 2. Fetch current client's modules
      if (clienteId) {
        const { data: clientData, error: err2 } = await supabase
          .from('modulos')
          .select('nome_modulo')
          .eq('cliente_id', clienteId)
        
        if (err2) throw err2
        
        setClienteModulos(clientData ? clientData.map(m => m.nome_modulo) : [])
      }

      // Carrega a implantação do cliente (para o fluxo MELI)
      await fetchImplantacaoCliente()
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (nomeModulo: string, isChecked: boolean) => {
    if (!clienteId || isReadOnlyUser()) return

    try {
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
    } catch (err: any) {
      console.error('Erro ao alternar módulo:', err)
      alert('Erro ao atualizar: ' + err.message)
    }
  }

  if (!isOpen) return null

  const modulosList = modulosDisponiveis.filter(m => m.tipo === 'MÓDULO')
  const integracoesList = modulosDisponiveis.filter(m => m.tipo === 'INTEGRAÇÃO')

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
          {/* Faixa de ação: aparece quando NFSE ou MELI está marcado */}
          {!loading && habilitaImplantacao && !isReadOnlyUser() && (
            <div className="mb-6 p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Rocket className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-brand-200">
                    {[temMeli && 'Mercado Livre (MELI)', temNfse && 'NFSE'].filter(Boolean).join(' + ')} marcado(s)
                  </p>
                  <p className="text-xs text-brand-200/70">
                    {implantacaoCliente
                      ? 'O cliente já possui uma implantação.'
                      : 'O cliente ainda não tem implantação. Crie uma com os cards correspondentes.'}
                  </p>
                  {implMsg && <p className="text-[11px] text-brand-300 mt-1 font-semibold">{implMsg}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {implantacaoCliente ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/implantacoes/${implantacaoCliente.id}`)}
                    className="px-4 py-2 text-xs font-bold text-brand-300 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Implantação</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCriarImplantacao}
                    disabled={implBusy}
                    className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 rounded-lg shadow-lg shadow-brand-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>{implBusy ? 'Processando...' : 'Criar Implantação'}</span>
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
