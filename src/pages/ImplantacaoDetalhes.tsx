import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, Building, CheckCircle2, Clock, AlertCircle, Trophy, Settings2, History, Plus, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { api } from '../lib/api'
import { EditarOperacoesModal } from '../components/EditarOperacoesModal'
import clsx from 'clsx'

export function ImplantacaoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [implantacao, setImplantacao] = useState<any>(null)
  const [etapas, setEtapas] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Historico form state
  const getCurrentDateTimeLocal = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [historicoDataHora, setHistoricoDataHora] = useState(getCurrentDateTimeLocal())
  const [historicoTexto, setHistoricoTexto] = useState('')
  const [addingHistorico, setAddingHistorico] = useState(false)
  const [isHistoricoExpanded, setIsHistoricoExpanded] = useState(false)

  useEffect(() => {
    if (id) {
      fetchImplantacao()
      fetchHistorico()
    }
  }, [id])

  const sortEtapasWithFeedbackLast = (list: any[]) => {
    if (!list || list.length === 0) return []
    const withoutFeedback = list.filter(e => e.nome_etapa !== 'Feedback')
    const feedback = list.find(e => e.nome_etapa === 'Feedback')
    withoutFeedback.sort((a, b) => a.ordem - b.ordem)
    if (feedback) {
      withoutFeedback.push(feedback)
    }
    return withoutFeedback
  }

  const fetchImplantacao = async () => {
    setLoading(true)
    try {
      const data = await api.getImplantacaoById(id!)
      setImplantacao(data)
      const sorted = sortEtapasWithFeedbackLast(data.implantacao_etapas || [])
      setEtapas(sorted)
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar a implantação')
      navigate('/implantacoes')
    } finally {
      setLoading(false)
    }
  }

  const fetchHistorico = async () => {
    try {
      const data = await api.getImplantacaoHistorico(id!)
      setHistorico(data)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  const handleAddHistorico = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!historicoTexto.trim() || !id) return

    setAddingHistorico(true)
    try {
      await api.insertImplantacaoHistorico({
        implantacao_id: id,
        data_hora: new Date(historicoDataHora).toISOString(),
        texto: historicoTexto.trim()
      })
      
      setHistoricoTexto('')
      setHistoricoDataHora(getCurrentDateTimeLocal())
      await fetchHistorico()
    } catch (err: any) {
      console.error('Erro ao adicionar histórico:', err)
      alert('Erro ao adicionar histórico: ' + err.message)
    } finally {
      setAddingHistorico(false)
    }
  }

  const handleDeleteHistorico = async (historicoId: string) => {
    if (!confirm('Deseja realmente remover este registro do histórico?')) return
    try {
      await api.deleteImplantacaoHistorico(historicoId)
      await fetchHistorico()
    } catch (err: any) {
      console.error('Erro ao excluir histórico:', err)
    }
  }

  const handleUpdateEtapa = async (etapaId: string, novoValor: string) => {
    // Optimistic update
    setEtapas(prev => prev.map(e => e.id === etapaId ? { ...e, valor: novoValor } : e))

    try {
      await api.updateImplantacaoEtapa(etapaId, novoValor)
      
      // Check if all etapas are OK -> auto-complete
      const updatedEtapas = etapas.map(e => e.id === etapaId ? { ...e, valor: novoValor } : e)
      const allOk = updatedEtapas.every(e => e.valor === 'OK')
      
      if (allOk && implantacao.status !== 'Concluído') {
        await api.updateImplantacaoStatus(id!, 'Concluído')
        setImplantacao((prev: any) => ({ ...prev, status: 'Concluído' }))
      } else if (!allOk && implantacao.status === 'Concluído') {
        await api.updateImplantacaoStatus(id!, 'Em Andamento')
        setImplantacao((prev: any) => ({ ...prev, status: 'Em Andamento' }))
      }
    } catch (err) {
      console.error(err)
      fetchImplantacao()
      alert('Erro ao salvar o status.')
    }
  }

  const calculateProgress = () => {
    if (etapas.length === 0) return 0
    const ok = etapas.filter(e => e.valor === 'OK').length
    return Math.round((ok / etapas.length) * 100)
  }

  const formatDateTimeDisplay = (isoString: string) => {
    try {
      const d = new Date(isoString)
      const date = d.toLocaleDateString('pt-BR')
      const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return `${date} ${time}`
    } catch (_) {
      return isoString
    }
  }

  const getStatusIcon = (valor: string) => {
    switch (valor) {
      case 'OK': return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'PENDENTE': return <Clock className="w-4 h-4 text-amber-400" />
      default: return <AlertCircle className="w-4 h-4 text-slate-500" />
    }
  }

  const getStatusStyle = (valor: string) => {
    switch (valor) {
      case 'OK': return 'bg-green-500/10 text-green-400 border-green-500/30'
      case 'PENDENTE': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      default: return 'bg-slate-800 text-slate-400 border-slate-700'
    }
  }

  if (loading) return <div className="text-slate-400 p-8 text-center">Carregando implantação...</div>
  if (!implantacao) return <div className="text-slate-400 p-8 text-center">Implantação não encontrada.</div>

  const progress = calculateProgress()
  const isComplete = progress === 100
  const isShopee = implantacao.tipo_cliente === 'SHOPEE'

  // Limit items for display when collapsed
  const visibleHistorico = isHistoricoExpanded ? historico : historico.slice(0, 3)
  const hasMoreHistorico = historico.length > 3

  return (
    <div className="space-y-6 w-full max-w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/implantacoes')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{implantacao.nome_empresa}</h2>
              <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                isShopee 
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {isShopee ? <ShoppingBag className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
                {implantacao.tipo_cliente}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                isComplete 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                  : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
              }`}>
                {isComplete ? '✓ Concluído' : 'Em Andamento'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Criado em {new Date(implantacao.created_at).toLocaleDateString('pt-BR')} • {etapas.length} etapas no processo
            </p>
          </div>
        </div>

        {/* Edit Operations / Modules button */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="btn-secondary flex items-center gap-2 text-sm shadow-md"
        >
          <Settings2 className="w-4 h-4 text-brand-400" />
          {isShopee ? 'Alterar Operações' : 'Alterar Módulos'}
        </button>
      </div>

      {/* Full Width Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Base Info */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base Alocada</span>
          <p className="text-xl font-black font-mono text-white mt-1">
            {implantacao.bases?.nome_base || '—'}
          </p>
          <span className="text-xs text-slate-500">Base do sistema</span>
        </div>

        {/* Operations or Modules */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-5 shadow-lg md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isShopee ? 'Operações Shopee' : 'Módulos Selecionados'}
            </span>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline"
            >
              Editar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {isShopee ? (
              implantacao.operacoes_shopee?.length > 0 ? (
                implantacao.operacoes_shopee.map((op: string) => (
                  <span key={op} className="text-xs font-bold px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20">
                    {op}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">Nenhuma operação configurada</span>
              )
            ) : (
              implantacao.modulos_normal?.length > 0 ? (
                implantacao.modulos_normal.map((mod: string) => (
                  <span key={mod} className="text-xs font-bold px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                    {mod}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">Nenhum módulo configurado</span>
              )
            )}
          </div>
        </div>

        {/* Progress Bar Card */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progresso Geral</span>
            <span className={`text-2xl font-black ${isComplete ? 'text-green-400' : 'text-brand-500'}`}>{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-brand-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {etapas.filter(e => e.valor === 'OK').length} de {etapas.length} etapas concluídas
          </p>
        </div>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 flex items-center gap-4 shadow-lg">
          <Trophy className="w-10 h-10 text-green-400 shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-green-400">Implantação Concluída! 🎉</h3>
            <p className="text-sm text-green-400/70">Todas as etapas foram finalizadas com sucesso.</p>
          </div>
        </div>
      )}

      {/* 1. Full-Width Interactive Etapas Grid / Table */}
      <div className="bg-dark-card border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-white">Etapas de Implantação</h3>
            <p className="text-xs text-slate-400">Acompanhe e atualize o status de cada etapa do processo</p>
          </div>
          <span className="text-xs text-slate-500 font-mono font-bold">
            {etapas.filter(e => e.valor === 'OK').length}/{etapas.length} OK
          </span>
        </div>

        {/* Grid layout spanning full width (3-4 columns on large screens, 2 on medium, 1 on mobile) */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-950/20">
          {etapas.map((etapa, index) => (
            <div 
              key={etapa.id} 
              className={clsx(
                "flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 shadow-md",
                etapa.valor === 'OK' 
                  ? 'bg-green-500/5 border-green-500/30' 
                  : etapa.valor === 'PENDENTE'
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
                    {index + 1}
                  </span>
                  <h4 className={clsx(
                    "text-sm font-bold leading-tight",
                    etapa.valor === 'OK' ? 'text-green-300' : 'text-slate-200'
                  )}>
                    {etapa.nome_etapa}
                  </h4>
                </div>
                <div className="shrink-0">
                  {getStatusIcon(etapa.valor)}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
                <select
                  value={etapa.valor}
                  onChange={(e) => handleUpdateEtapa(etapa.id, e.target.value)}
                  className={clsx(
                    "text-xs font-bold py-1.5 px-3 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none text-center min-w-[120px]",
                    getStatusStyle(etapa.valor)
                  )}
                >
                  <option value="EM BRANCO">EM BRANCO</option>
                  <option value="OK">OK</option>
                  <option value="PENDENTE">PENDENTE</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. CARD DE HISTÓRICO (AGORA NO FINAL DA PÁGINA) */}
      <div className="bg-dark-card border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-brand-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Histórico da Implantação</h3>
              <p className="text-xs text-slate-400">Registro de eventos, contatos e ocorrências com o cliente</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            {historico.length} {historico.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="p-5 space-y-5">
          {/* Add History Form */}
          <form onSubmit={handleAddHistorico} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Novo Registro no Histórico</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative shrink-0">
                <input
                  type="datetime-local"
                  value={historicoDataHora}
                  onChange={e => setHistoricoDataHora(e.target.value)}
                  className="input-field py-2 px-3 text-xs w-full sm:w-48 bg-slate-800 border-slate-700 text-slate-200"
                  required
                />
              </div>
              <input
                type="text"
                value={historicoTexto}
                onChange={e => setHistoricoTexto(e.target.value)}
                placeholder="Ex: Cliente não atendeu / Reagendou treinamento / Enviou documentos..."
                className="input-field py-2 px-3 text-xs flex-1 bg-slate-800 border-slate-700 text-slate-200"
                required
              />
              <button
                type="submit"
                disabled={addingHistorico || !historicoTexto.trim()}
                className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingHistorico ? 'Adicionando...' : 'Adicionar'}</span>
              </button>
            </div>
          </form>

          {/* History Timeline */}
          {historico.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-900/30 rounded-xl border border-slate-800/50">
              Nenhum evento registrado no histórico. Adicione o primeiro registro acima.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleHistorico.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl border border-slate-800/80 group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-bold shrink-0 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {formatDateTimeDisplay(item.data_hora)}
                    </span>
                    <p className="text-xs text-slate-200 font-medium truncate flex-1">
                      {item.texto}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistorico(item.id)}
                    className="ml-3 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                    title="Excluir evento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Show Expand / Collapse button if > 3 items */}
              {hasMoreHistorico && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsHistoricoExpanded(!isHistoricoExpanded)}
                    className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
                  >
                    {isHistoricoExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Recolher Histórico</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Ver mais ({historico.length - 3} registros restantes)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for editing operations / modules */}
      <EditarOperacoesModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        implantacao={implantacao}
        onSuccess={fetchImplantacao}
      />
    </div>
  )
}
