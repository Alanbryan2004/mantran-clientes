import { useState, useEffect } from 'react'
import { X, Check, Rocket, Globe, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { isReadOnlyUser } from '../lib/auth'

interface ModulosModalProps {
  isOpen: boolean
  onClose: () => void
  clienteId: string | null
  clienteNome: string
  clienteTipo?: string
}

type ModuloMantran = {
  id: string
  nome: string
  tipo: string
}

const MELI_NOME = 'Mercado Livre'
const NFSE_NOME = 'NFSE'
const MANTRAN_WEB_NOME = 'MantranWeb'
const PROCESSOS_SHOPEE = ['First Mile', 'Line Haul', 'Last Mile', 'Mobile Hub']

export function ModulosModal({ isOpen, onClose, clienteId, clienteNome, clienteTipo }: ModulosModalProps) {
  const [modulosDisponiveis, setModulosDisponiveis] = useState<ModuloMantran[]>([])
  const [clienteModulos, setClienteModulos] = useState<string[]>([])
  const [clienteProcessos, setClienteProcessos] = useState<string[]>([])
  const [clienteTipoAtual, setClienteTipoAtual] = useState<string>(clienteTipo || '')
  const [mostrarProcessosShopee, setMostrarProcessosShopee] = useState(false)
  const [savingProcesso, setSavingProcesso] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [implBusy, setImplBusy] = useState(false)
  const [implMsg, setImplMsg] = useState('')
  // Implantações já existentes do cliente — para esconder o botão se já criada.
  const [implantacoesCliente, setImplantacoesCliente] = useState<any[]>([])

  const isShopee = (clienteTipoAtual || clienteTipo || '').toUpperCase() === 'SHOPEE' || clienteProcessos.length > 0
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
      setClienteTipoAtual(clienteTipo || '')
      setMostrarProcessosShopee(false)
      fetchDados()
    } else {
      setClienteModulos([])
      setClienteProcessos([])
      setClienteTipoAtual(clienteTipo || '')
      setMostrarProcessosShopee(false)
      setSavingProcesso(null)
      setImplMsg('')
      setImplantacoesCliente([])
    }
  }, [isOpen, clienteId, clienteTipo])

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

        // 3. Processos Shopee e tipo do cliente
        try {
          const { tipo, processos } = await api.getClienteProcessosShopee(clienteId, clienteNome)
          setClienteProcessos(processos || [])
          if (tipo) setClienteTipoAtual(tipo)
        } catch (errProc) {
          console.warn('Aviso ao carregar processos:', errProc)
        }
      }

      await fetchImplantacoesCliente()
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const isMantranWeb = clienteModulos.includes(MANTRAN_WEB_NOME)

  const handleToggleProcesso = async (processo: string, isChecked: boolean) => {
    if (!clienteId || isReadOnlyUser()) return
    setSavingProcesso(processo)

    const novos = isChecked
      ? [...clienteProcessos.filter(p => p !== processo), processo]
      : clienteProcessos.filter(p => p !== processo)

    setClienteProcessos(novos)

    try {
      await api.updateClienteProcessosShopee(clienteId, novos, clienteNome)
      window.dispatchEvent(new CustomEvent('mantran:modulos-updated', { detail: { clienteId, processo, isChecked } }))
      window.dispatchEvent(new CustomEvent('mantran:processos-updated', { detail: { clienteId, processos: novos } }))
    } catch (err: any) {
      console.error('Erro ao alternar processo:', err)
      alert('Erro ao atualizar processo: ' + (err?.message || 'Falha na gravação'))
      setClienteProcessos(clienteProcessos)
    } finally {
      setSavingProcesso(null)
    }
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Header Compacto */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Módulos e Integrações</h2>
              {isShopee && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Truck className="w-3 h-3" /> Shopee
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{clienteNome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3">
          
          {/* BARRA SUPERIOR INTEGRADA: MantranWeb + Processos Shopee lado a lado */}
          {!loading && (
            <div className={`grid grid-cols-1 ${isShopee || mostrarProcessosShopee ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
              
              {/* CARD MANTRANWEB (Compacto) */}
              <div className={`px-3 py-2 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                isMantranWeb 
                  ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/40 shadow-xs' 
                  : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isMantranWeb 
                      ? 'bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950 border-cyan-300' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white tracking-wide">MantranWeb</span>
                      {isMantranWeb ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          <Check className="w-2.5 h-2.5 text-cyan-400" /> 100% Web
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          C# Desktop
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
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
                    <div className={`w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all cursor-pointer ${
                      isMantranWeb ? 'peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-emerald-500' : ''
                    }`}></div>
                  </label>
                </div>
              </div>

              {/* CARD PROCESSOS SHOPEE (Compacto - 4 botões na mesma linha) */}
              {(isShopee || mostrarProcessosShopee) ? (
                <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-orange-950/30 via-slate-900 to-slate-900 border border-orange-500/40 flex items-center justify-between gap-2.5 shadow-xs">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white hidden sm:inline">Processos</span>
                    <span className="text-[10px] font-bold text-orange-300/90 bg-orange-500/15 px-1.5 py-0.5 rounded border border-orange-500/30">
                      {clienteProcessos.length}/4
                    </span>
                  </div>

                  {/* 4 Botões Inline */}
                  <div className="grid grid-cols-4 gap-1.5 flex-1 min-w-0">
                    {PROCESSOS_SHOPEE.map(processo => {
                      const isChecked = clienteProcessos.includes(processo)
                      const isSaving = savingProcesso === processo
                      return (
                        <button
                          key={processo}
                          type="button"
                          disabled={!clienteId || isReadOnlyUser() || !!savingProcesso}
                          onClick={() => handleToggleProcesso(processo, !isChecked)}
                          className={`py-1 px-1.5 rounded-md border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 select-none truncate cursor-pointer ${
                            isChecked 
                              ? 'bg-orange-500/25 border-orange-500/70 text-orange-200 shadow-xs' 
                              : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-500 text-slate-400'
                          } ${isSaving ? 'opacity-60 animate-pulse' : ''}`}
                          title={processo}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[9px] ${
                            isChecked ? 'bg-orange-500 text-slate-950 font-black' : 'border border-slate-600 bg-slate-900/60'
                          }`}>
                            {isChecked ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                          </span>
                          <span className="truncate">{processo}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Link discreto para clientes não-Shopee */
                <div className="flex items-center justify-end px-2">
                  <button
                    type="button"
                    onClick={() => setMostrarProcessosShopee(true)}
                    className="text-xs text-slate-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/40 border border-slate-700/60 hover:border-orange-500/40"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Vincular Processos Shopee</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Faixa de ação: Criar implantação dedicada (Compacta) */}
          {!loading && ((temNfse && !jaTemImplNfse) || (temMeli && !jaTemImplMeli)) && !isReadOnlyUser() && (
            <div className="px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Rocket className="w-4 h-4 text-brand-400 shrink-0" />
                <span className="text-brand-200 font-semibold truncate">Criar implantação dedicada para módulos ativos</span>
                {implMsg && <span className="text-brand-300 font-bold truncate">({implMsg})</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {temNfse && !jaTemImplNfse && (
                  <button
                    type="button"
                    onClick={() => criarImplantacaoDedicada('NFSE')}
                    disabled={implBusy}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-md shadow flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-3 h-3" />
                    <span>{implBusy ? '...' : 'Implantação NFSE'}</span>
                  </button>
                )}
                {temMeli && !jaTemImplMeli && (
                  <button
                    type="button"
                    onClick={() => criarImplantacaoDedicada('MELI')}
                    disabled={implBusy}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md shadow flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-3 h-3" />
                    <span>{implBusy ? '...' : 'Implantação MELI'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Seção Módulos Mantran */}
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Módulos Mantran
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {modulosList.filter(m => clienteModulos.includes(m.nome)).length} de {modulosList.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5">
                  {modulosList.map(modulo => {
                    const isChecked = clienteModulos.includes(modulo.nome)
                    return (
                      <label 
                        key={modulo.id} 
                        className={`flex items-center py-1.5 px-2.5 rounded-md border cursor-pointer transition-all duration-150 select-none ${
                          isChecked 
                            ? 'bg-brand-500/15 border-brand-500/50 text-brand-300' 
                            : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 shrink-0 transition-colors ${
                          isChecked ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-500 bg-slate-900/60'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => handleToggle(modulo.nome, e.target.checked)}
                        />
                        <span className="text-xs font-medium truncate">{modulo.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Seção Integrações */}
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Integrações
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {integracoesList.filter(m => clienteModulos.includes(m.nome)).length} de {integracoesList.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5">
                  {integracoesList.map(modulo => {
                    const isChecked = clienteModulos.includes(modulo.nome)
                    return (
                      <label 
                        key={modulo.id} 
                        className={`flex items-center py-1.5 px-2.5 rounded-md border cursor-pointer transition-all duration-150 select-none ${
                          isChecked 
                            ? 'bg-purple-500/15 border-purple-500/50 text-purple-300' 
                            : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 shrink-0 transition-colors ${
                          isChecked ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-500 bg-slate-900/60'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => handleToggle(modulo.nome, e.target.checked)}
                        />
                        <span className="text-xs font-medium truncate">{modulo.nome}</span>
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
