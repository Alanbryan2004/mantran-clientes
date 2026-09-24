import { useState, useEffect } from 'react'
import { 
  Palmtree, 
  FileText, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Upload, 
  Download, 
  File, 
  Trash2, 
  User, 
  Shield, 
  Sparkles, 
  HelpCircle,
  Eye,
  CalendarDays,
  Send,
  Building2,
  Paperclip,
  Check,
  X
} from 'lucide-react'
import { api, type SolicitacaoFerias, type FaltaAtestado } from '../lib/api'
import { getLoggedUser, isAdminUser } from '../lib/auth'
import clsx from 'clsx'

export function RH() {
  const user = getLoggedUser()
  const isAdmin = isAdminUser()

  const [tab, setTab] = useState<'ferias' | 'faltas' | 'gestao'>('ferias')
  const [loading, setLoading] = useState(true)

  // Listas
  const [feriasList, setFeriasList] = useState<SolicitacaoFerias[]>([])
  const [faltasList, setFaltasList] = useState<FaltaAtestado[]>([])

  // Modal Solicitar Férias
  const [isFeriasModalOpen, setIsFeriasModalOpen] = useState(false)
  const [anoVigencia, setAnoVigencia] = useState(new Date().getFullYear())
  const [q1Inicio, setQ1Inicio] = useState('')
  const [q1Fim, setQ1Fim] = useState('')
  const [q2Inicio, setQ2Inicio] = useState('')
  const [q2Fim, setQ2Fim] = useState('')
  const [feriasObs, setFeriasObs] = useState('')
  const [salvandoFerias, setSalvandoFerias] = useState(false)

  // Modal Comunicar Falta / Enviar Atestado
  const [isFaltaModalOpen, setIsFaltaModalOpen] = useState(false)
  const [faltaInicio, setFaltaInicio] = useState('')
  const [faltaFim, setFaltaFim] = useState('')
  const [motivoFalta, setMotivoFalta] = useState('Doença / Atestado Médico')
  const [descricaoFalta, setDescricaoFalta] = useState('')
  const [arquivoNome, setArquivoNome] = useState('')
  const [arquivoUrl, setArquivoUrl] = useState('')
  const [arquivoTipo, setArquivoTipo] = useState('')
  const [salvandoFalta, setSalvandoFalta] = useState(false)

  // Modal Avaliação RH (Admin)
  const [itemAvaliacao, setItemAvaliacao] = useState<{ type: 'ferias' | 'falta'; item: any } | null>(null)
  const [statusAvaliacao, setStatusAvaliacao] = useState<string>('Aprovado')
  const [respostaRh, setRespostaRh] = useState('')
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false)

  // Visualizador de Atestado
  const [previewAtestado, setPreviewAtestado] = useState<FaltaAtestado | null>(null)

  useEffect(() => {
    fetchData()
  }, [user?.id, tab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (tab === 'gestao' && isAdmin) {
        // Admin vê todas as solicitações
        const [ferias, faltas] = await Promise.all([
          api.getSolicitacoesFerias(),
          api.getFaltasEAtestados()
        ])
        setFeriasList(ferias)
        setFaltasList(faltas)
      } else {
        // Usuário comum vê as próprias
        const [ferias, faltas] = await Promise.all([
          api.getSolicitacoesFerias(user?.id),
          api.getFaltasEAtestados(user?.id)
        ])
        setFeriasList(ferias)
        setFaltasList(faltas)
      }
    } catch (err) {
      console.error('Erro ao carregar dados de RH:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-calcular Data Fim (15 dias) ao preencher Data Início
  const handleQ1InicioChange = (dataStr: string) => {
    setQ1Inicio(dataStr)
    if (dataStr) {
      const d = new Date(dataStr + 'T00:00:00')
      d.setDate(d.getDate() + 14) // 15 dias corridos
      setQ1Fim(d.toISOString().split('T')[0])
    }
  }

  const handleQ2InicioChange = (dataStr: string) => {
    setQ2Inicio(dataStr)
    if (dataStr) {
      const d = new Date(dataStr + 'T00:00:00')
      d.setDate(d.getDate() + 14) // 15 dias corridos
      setQ2Fim(d.toISOString().split('T')[0])
    }
  }

  const handleFaltaInicioChange = (dataStr: string) => {
    setFaltaInicio(dataStr)
    if (!faltaFim || faltaFim < dataStr) {
      setFaltaFim(dataStr)
    }
  }

  // Upload do arquivo de atestado em base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      alert('O arquivo selecionado é muito grande. Tamanho máximo: 8MB.')
      return
    }

    setArquivoNome(file.name)
    setArquivoTipo(file.type)

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string
      setArquivoUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const handleSalvarFerias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!q1Inicio || !q1Fim) {
      alert('Por favor, selecione as datas da 1ª Quinzena.')
      return
    }

    setSalvandoFerias(true)
    try {
      await api.insertSolicitacaoFerias({
        usuario_id: user?.id || 'temp',
        usuario_nome: user?.nome || user?.login || 'Colaborador',
        ano_vigencia: anoVigencia,
        quinzena_1_inicio: q1Inicio,
        quinzena_1_fim: q1Fim,
        quinzena_1_dias: 15,
        quinzena_2_inicio: q2Inicio || null,
        quinzena_2_fim: q2Fim || null,
        quinzena_2_dias: q2Inicio ? 15 : null,
        observacoes: feriasObs.trim() || null
      })

      setIsFeriasModalOpen(false)
      setQ1Inicio('')
      setQ1Fim('')
      setQ2Inicio('')
      setQ2Fim('')
      setFeriasObs('')
      await fetchData()
      alert('Solicitação de férias enviada com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao enviar solicitação: ' + err.message)
    } finally {
      setSalvandoFerias(false)
    }
  }

  const handleSalvarFalta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!faltaInicio) {
      alert('Por favor, informe a data da falta.')
      return
    }

    const dtInicio = new Date(faltaInicio + 'T00:00:00')
    const dtFim = new Date((faltaFim || faltaInicio) + 'T00:00:00')
    const diffTime = Math.abs(dtFim.getTime() - dtInicio.getTime())
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    setSalvandoFalta(true)
    try {
      await api.insertFaltaAtestado({
        usuario_id: user?.id || 'temp',
        usuario_nome: user?.nome || user?.login || 'Colaborador',
        data_falta_inicio: faltaInicio,
        data_falta_fim: faltaFim || faltaInicio,
        dias_afastamento: dias,
        motivo: motivoFalta,
        descricao: descricaoFalta.trim() || null,
        possui_atestado: !!arquivoUrl,
        arquivo_atestado_nome: arquivoNome || null,
        arquivo_atestado_url: arquivoUrl || null,
        arquivo_atestado_tipo: arquivoTipo || null
      })

      setIsFaltaModalOpen(false)
      setFaltaInicio('')
      setFaltaFim('')
      setDescricaoFalta('')
      setArquivoNome('')
      setArquivoUrl('')
      setArquivoTipo('')
      await fetchData()
      alert('Falta / Atestado comunicado com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao enviar comunicado: ' + err.message)
    } finally {
      setSalvandoFalta(false)
    }
  }

  const handleSalvarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemAvaliacao) return

    setSalvandoAvaliacao(true)
    try {
      const aprovador = user?.nome || user?.login || 'Administrador'

      if (itemAvaliacao.type === 'ferias') {
        await api.updateStatusFerias(
          itemAvaliacao.item.id,
          statusAvaliacao as any,
          respostaRh.trim(),
          aprovador
        )
      } else {
        await api.updateStatusFalta(
          itemAvaliacao.item.id,
          statusAvaliacao as any,
          respostaRh.trim(),
          aprovador
        )
      }

      setItemAvaliacao(null)
      setRespostaRh('')
      await fetchData()
      alert('Status atualizado com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar avaliação: ' + err.message)
    } finally {
      setSalvandoAvaliacao(false)
    }
  }

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return new Date(dateStr).toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'Aprovado' || status === 'Abonado / Aprovado') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {status}
        </span>
      )
    }
    if (status === 'Reprovado' || status === 'Recusado') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" /> {status}
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> {status}
      </span>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-teal-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-md">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Portal de RH Mantran
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
                  Colaborador
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Planejamento de férias em 2 quinzenas, comunicação de faltas e envio de atestados médicos
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsFeriasModalOpen(true)}
            className="btn-primary py-2.5 px-4 flex items-center gap-2 text-xs font-bold shadow-lg shadow-brand-500/10 cursor-pointer"
          >
            <Palmtree className="w-4 h-4" />
            <span>Solicitar Férias</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFaltaModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Comunicar Falta / Atestado</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setTab('ferias')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            tab === 'ferias'
              ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          )}
        >
          <Palmtree className="w-4 h-4 text-brand-400" />
          <span>Minhas Férias ({feriasList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('faltas')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            tab === 'faltas'
              ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          )}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Faltas e Atestados ({faltasList.length})</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setTab('gestao')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ml-auto",
              tab === 'gestao'
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/30 border border-purple-500/20"
            )}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Gestão de Equipe (Admin)</span>
          </button>
        )}
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Carregando informações de RH...
        </div>
      ) : tab === 'ferias' ? (
        /* ================= ABA FÉRIAS ================= */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">Regra de Férias Mantran (2 Quinzenas):</p>
              <p className="text-slate-400">
                Cada colaborador usufrui de suas férias divididas em <strong>2 quinzenas separadas (15 dias cada)</strong>. 
                Você pode solicitar uma quinzena por vez ou ambas ao mesmo tempo para aprovação prévia da gestão.
              </p>
            </div>
          </div>

          {feriasList.length === 0 ? (
            <div className="bg-dark-card border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-800/60 border border-slate-700/60 mx-auto flex items-center justify-center text-slate-500">
                <Palmtree className="w-7 h-7 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-white">Nenhuma solicitação de férias cadastrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Clique no botão "Solicitar Férias" acima para planejar seu período de descanso de 15 dias.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feriasList.map((f) => (
                <div 
                  key={f.id} 
                  className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Vigência: <strong className="text-white">{f.ano_vigencia}</strong>
                      </span>
                    </div>
                    {getStatusBadge(f.status)}
                  </div>

                  {/* Detalhes das Quinzenas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1ª Quinzena */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-brand-400">1ª Quinzena</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 font-semibold">
                          {f.quinzena_1_dias} dias
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {formatDateDisplay(f.quinzena_1_inicio)} até {formatDateDisplay(f.quinzena_1_fim)}
                      </p>
                    </div>

                    {/* 2ª Quinzena */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-teal-400">2ª Quinzena</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 font-semibold">
                          {f.quinzena_2_inicio ? `${f.quinzena_2_dias || 15} dias` : 'A definir'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {f.quinzena_2_inicio ? (
                          `${formatDateDisplay(f.quinzena_2_inicio)} até ${formatDateDisplay(f.quinzena_2_fim)}`
                        ) : (
                          <span className="text-slate-500 italic">Pendente de agendamento</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {f.observacoes && (
                    <div className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
                      <span className="text-slate-500 font-medium block text-[11px] mb-0.5">Observações do Colaborador:</span>
                      {f.observacoes}
                    </div>
                  )}

                  {f.resposta_rh && (
                    <div className="text-xs text-amber-200 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      <span className="text-amber-400 font-bold block text-[11px] mb-0.5">Retorno do RH:</span>
                      {f.resposta_rh}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Solicitado em {formatDateDisplay(f.created_at)}</span>
                    {f.aprovado_por && (
                      <span>Avaliado por: <strong className="text-slate-300">{f.aprovado_por}</strong></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'faltas' ? (
        /* ================= ABA FALTAS E ATESTADOS ================= */
        <div className="space-y-4">
          {faltasList.length === 0 ? (
            <div className="bg-dark-card border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-800/60 border border-slate-700/60 mx-auto flex items-center justify-center text-slate-500">
                <FileText className="w-7 h-7 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-white">Nenhum comunicado de falta ou atestado registrado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Precisa justificar uma ausência médica ou imprevisto? Clique em "Comunicar Falta / Atestado" acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {faltasList.map((item) => (
                <div 
                  key={item.id}
                  className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {item.motivo}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Período da Ausência:</span>
                        <span className="font-semibold text-white">
                          {formatDateDisplay(item.data_falta_inicio)}
                          {item.data_falta_fim && item.data_falta_fim !== item.data_falta_inicio && (
                            ` até ${formatDateDisplay(item.data_falta_fim)}`
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-bold border border-brand-500/20">
                        {item.dias_afastamento} {item.dias_afastamento > 1 ? 'dias' : 'dia'}
                      </span>
                    </div>

                    {item.descricao && (
                      <p className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40 line-clamp-2">
                        {item.descricao}
                      </p>
                    )}
                  </div>

                  {/* Anexo de Atestado & Ações */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    {item.arquivo_atestado_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewAtestado(item)}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">Ver Atestado ({item.arquivo_atestado_nome || 'Arquivo'})</span>
                      </button>
                    ) : (
                      <div className="text-center py-1.5 text-[11px] text-slate-500 italic">
                        Sem documento anexado
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Enviado em {formatDateDisplay(item.created_at)}</span>
                      {item.aprovado_por && (
                        <span>RH: <strong className="text-slate-300">{item.aprovado_por}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ================= ABA GESTÃO ADMIN ================= */
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-200">
              <p className="font-bold text-purple-300 mb-0.5">Painel Administrativo de RH</p>
              <p className="opacity-90">
                Visualize e analise todas as solicitações de férias e atestados médicos de todos os colaboradores da equipe Mantran.
              </p>
            </div>
          </div>

          {/* Férias da Equipe */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Palmtree className="w-4 h-4 text-brand-400" />
              Solicitações de Férias da Equipe ({feriasList.length})
            </h3>

            <div className="bg-dark-card border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5">Colaborador</th>
                      <th className="p-3.5">Ano</th>
                      <th className="p-3.5">1ª Quinzena</th>
                      <th className="p-3.5">2ª Quinzena</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {feriasList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          Nenhuma solicitação de férias da equipe no momento.
                        </td>
                      </tr>
                    ) : (
                      feriasList.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-3.5 font-bold text-white">
                            {f.usuario_nome}
                          </td>
                          <td className="p-3.5 text-slate-300">{f.ano_vigencia}</td>
                          <td className="p-3.5 text-slate-300 font-mono">
                            {formatDateDisplay(f.quinzena_1_inicio)} a {formatDateDisplay(f.quinzena_1_fim)}
                          </td>
                          <td className="p-3.5 text-slate-300 font-mono">
                            {f.quinzena_2_inicio ? (
                              `${formatDateDisplay(f.quinzena_2_inicio)} a ${formatDateDisplay(f.quinzena_2_fim)}`
                            ) : (
                              <span className="text-slate-500 italic">Não informada</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {getStatusBadge(f.status)}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setItemAvaliacao({ type: 'ferias', item: f })
                                setStatusAvaliacao(f.status || 'Aprovado')
                                setRespostaRh(f.resposta_rh || '')
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all cursor-pointer"
                            >
                              Avaliar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Atestados e Faltas da Equipe */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Faltas & Atestados Médicos da Equipe ({faltasList.length})
            </h3>

            <div className="bg-dark-card border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5">Colaborador</th>
                      <th className="p-3.5">Motivo</th>
                      <th className="p-3.5">Período</th>
                      <th className="p-3.5">Dias</th>
                      <th className="p-3.5">Atestado</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {faltasList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Nenhum comunicado de falta ou atestado registrado.
                        </td>
                      </tr>
                    ) : (
                      faltasList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-3.5 font-bold text-white">
                            {item.usuario_nome}
                          </td>
                          <td className="p-3.5 text-slate-300">{item.motivo}</td>
                          <td className="p-3.5 text-slate-300 font-mono">
                            {formatDateDisplay(item.data_falta_inicio)}
                            {item.data_falta_fim && item.data_falta_fim !== item.data_falta_inicio && (
                              ` a ${formatDateDisplay(item.data_falta_fim)}`
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-brand-400">{item.dias_afastamento}d</td>
                          <td className="p-3.5">
                            {item.arquivo_atestado_url ? (
                              <button
                                type="button"
                                onClick={() => setPreviewAtestado(item)}
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>Ver anexo</span>
                              </button>
                            ) : (
                              <span className="text-slate-500">Sem anexo</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setItemAvaliacao({ type: 'falta', item })
                                setStatusAvaliacao(item.status || 'Abonado / Aprovado')
                                setRespostaRh(item.observacoes_rh || '')
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all cursor-pointer"
                            >
                              Avaliar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SOLICITAR FÉRIAS ================= */}
      {isFeriasModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Solicitar Período de Férias</h2>
                  <p className="text-xs text-slate-400">Direito a 2 Quinzenas separadas (15 dias cada)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFeriasModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarFerias} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Ano de Vigência */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Ano de Exercício / Vigência
                </label>
                <input
                  type="number"
                  min={2024}
                  max={2030}
                  value={anoVigencia}
                  onChange={e => setAnoVigencia(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm font-semibold focus:border-brand-500"
                />
              </div>

              {/* 1ª Quinzena */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-brand-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> 1ª Quinzena (Obrigatória - 15 dias)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-bold">15 Dias</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={q1Inicio}
                      onChange={e => handleQ1InicioChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Fim (15º dia)</label>
                    <input
                      type="date"
                      value={q1Fim}
                      onChange={e => setQ1Fim(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2ª Quinzena (Opcional) */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> 2ª Quinzena (Opcional / Agendamento)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-bold">15 Dias</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={q2Inicio}
                      onChange={e => handleQ2InicioChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Fim (15º dia)</label>
                    <input
                      type="date"
                      value={q2Fim}
                      onChange={e => setQ2Fim(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observações / Justificativa
                </label>
                <textarea
                  value={feriasObs}
                  onChange={e => setFeriasObs(e.target.value)}
                  placeholder="Ex: Alinhado previamente com a equipe de suporte..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFeriasModalOpen(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoFerias}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{salvandoFerias ? 'Enviando...' : 'Enviar Solicitação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL COMUNICAR FALTA / ATESTADO ================= */}
      {isFaltaModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Comunicar Falta / Enviar Atestado</h2>
                  <p className="text-xs text-slate-400">Envio de justificativa e comprovante médico</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFaltaModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarFalta} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Motivo */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Motivo da Ausência
                </label>
                <select
                  value={motivoFalta}
                  onChange={e => setMotivoFalta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-brand-500"
                >
                  <option value="Doença / Atestado Médico">Doença / Atestado Médico</option>
                  <option value="Consulta Médica / Exame">Consulta Médica / Exame</option>
                  <option value="Acompanhamento Familiar">Acompanhamento Familiar</option>
                  <option value="Motivo Pessoal / Imprevisto">Motivo Pessoal / Imprevisto</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Data Início da Falta
                  </label>
                  <input
                    type="date"
                    value={faltaInicio}
                    onChange={e => handleFaltaInicioChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Data Fim da Falta
                  </label>
                  <input
                    type="date"
                    value={faltaFim}
                    onChange={e => setFaltaFim(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Upload de Atestado */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Anexar Atestado / Comprovante (PDF ou Imagem)
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-brand-500/50 rounded-xl p-4 text-center bg-slate-900/40 transition-colors">
                  <input
                    type="file"
                    id="atestado-input"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="atestado-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-brand-400" />
                    {arquivoNome ? (
                      <div className="text-xs">
                        <span className="font-bold text-emerald-400">{arquivoNome}</span>
                        <p className="text-[11px] text-slate-500">Clique para trocar o arquivo</p>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="font-bold text-white">Clique para selecionar o arquivo</span>
                        <p className="text-[11px] text-slate-500">Formatos aceitos: PDF, PNG, JPG (até 8MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Detalhes / Justificativa
                </label>
                <textarea
                  value={descricaoFalta}
                  onChange={e => setDescricaoFalta(e.target.value)}
                  placeholder="Informações adicionais para o departamento de RH..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFaltaModalOpen(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoFalta}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{salvandoFalta ? 'Enviando...' : 'Registrar Falta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL AVALIAÇÃO RH (ADMIN) ================= */}
      {itemAvaliacao && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <div>
                  <h2 className="text-base font-bold text-white">Avaliar Solicitação (RH)</h2>
                  <p className="text-xs text-slate-400">{itemAvaliacao.item.usuario_nome}</p>
                </div>
              </div>
              <button 
                onClick={() => setItemAvaliacao(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarAvaliacao} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Decisão do RH
                </label>
                <select
                  value={statusAvaliacao}
                  onChange={e => setStatusAvaliacao(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-brand-500"
                >
                  {itemAvaliacao.type === 'ferias' ? (
                    <>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Reprovado">Reprovado</option>
                    </>
                  ) : (
                    <>
                      <option value="Abonado / Aprovado">Abonado / Aprovado</option>
                      <option value="Em Análise">Em Análise</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Recusado">Recusado</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Retorno / Observação para o Colaborador
                </label>
                <textarea
                  value={respostaRh}
                  onChange={e => setRespostaRh(e.target.value)}
                  placeholder="Ex: Férias aprovadas. Bom descanso! / Atestado validado com sucesso."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setItemAvaliacao(null)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAvaliacao}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvandoAvaliacao ? 'Salvando...' : 'Confirmar Avaliação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL VISUALIZADOR DE ATESTADO ================= */}
      {previewAtestado && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white truncate max-w-sm">
                  {previewAtestado.arquivo_atestado_nome || 'Atestado Médico'}
                </span>
              </div>
              <button 
                onClick={() => setPreviewAtestado(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-950 min-h-[300px]">
              {previewAtestado.arquivo_atestado_url ? (
                previewAtestado.arquivo_atestado_url.startsWith('data:image') || previewAtestado.arquivo_atestado_tipo?.startsWith('image') ? (
                  <img 
                    src={previewAtestado.arquivo_atestado_url} 
                    alt="Atestado" 
                    className="max-h-[60vh] max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <iframe 
                    src={previewAtestado.arquivo_atestado_url} 
                    title="PDF Atestado"
                    className="w-full h-[60vh] rounded-lg border border-slate-800"
                  />
                )
              ) : (
                <p className="text-sm text-slate-500">Visualização não disponível</p>
              )}
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Colaborador: <strong>{previewAtestado.usuario_nome}</strong>
              </span>
              {previewAtestado.arquivo_atestado_url && (
                <a
                  href={previewAtestado.arquivo_atestado_url}
                  download={previewAtestado.arquivo_atestado_nome || 'Atestado.pdf'}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
