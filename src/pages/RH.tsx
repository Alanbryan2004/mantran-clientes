import { useState, useEffect, useMemo } from 'react'
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
  Eye,
  CalendarDays,
  Send,
  Building2,
  Paperclip,
  Check,
  X,
  Laptop,
  Users2,
  Home,
  Briefcase,
  Layers,
  Activity,
  CalendarCheck2,
  CalendarRange,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  MapPin,
  Settings,
  ChevronRight,
  UserCheck
} from 'lucide-react'
import { 
  api, 
  type SolicitacaoFerias, 
  type FaltaAtestado, 
  type EscalaHomeOffice,
  type UsuarioSistema 
} from '../lib/api'
import { getLoggedUser, isAdminUser } from '../lib/auth'
import clsx from 'clsx'

export function RH() {
  const user = getLoggedUser()
  const isAdmin = isAdminUser()

  // Abas principais
  const [tab, setTab] = useState<'dashboard' | 'ferias' | 'home_office' | 'faltas' | 'equipe' | 'gestao'>('dashboard')
  const [loading, setLoading] = useState(true)

  // Listas de dados
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [feriasList, setFeriasList] = useState<SolicitacaoFerias[]>([])
  const [faltasList, setFaltasList] = useState<FaltaAtestado[]>([])
  const [homeOfficeList, setHomeOfficeList] = useState<EscalaHomeOffice[]>([])
  const [todasFeriasEquipe, setTodasFeriasEquipe] = useState<SolicitacaoFerias[]>([])

  // Filtros & Buscas
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroDiaHomeOffice, setFiltroDiaHomeOffice] = useState<string>('todos')
  const [anoFiltro, setAnoFiltro] = useState<number>(new Date().getFullYear())

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

  // Modal / Edição de Home Office
  const [isHomeOfficeModalOpen, setIsHomeOfficeModalOpen] = useState(false)
  const [editingHomeOffice, setEditingHomeOffice] = useState<{
    usuario_id: string
    usuario_nome: string
    modalidade: 'Híbrido' | '100% Presencial' | '100% Remoto'
    segunda: boolean
    terca: boolean
    quarta: boolean
    quinta: boolean
    sexta: boolean
    sabado: boolean
    observacoes: string
  } | null>(null)
  const [salvandoHomeOffice, setSalvandoHomeOffice] = useState(false)

  // Modal Avaliação RH (Admin / Gestor)
  const [itemAvaliacao, setItemAvaliacao] = useState<{ type: 'ferias' | 'falta'; item: any } | null>(null)
  const [statusAvaliacao, setStatusAvaliacao] = useState<string>('Aprovado')
  const [respostaRh, setRespostaRh] = useState('')
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false)

  // Visualizador de Atestado
  const [previewAtestado, setPreviewAtestado] = useState<FaltaAtestado | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [allUsers, todasFerias, faltas, escalas] = await Promise.all([
        api.getUsuariosSistema().catch(() => []),
        api.getSolicitacoesFerias().catch(() => []),
        api.getFaltasEAtestados().catch(() => []),
        api.getEscalasHomeOffice().catch(() => [])
      ])

      setUsuarios(allUsers.filter(u => u.perfil !== 'Cliente'))
      setTodasFeriasEquipe(todasFerias || [])
      setFeriasList(todasFerias || [])
      setFaltasList(faltas || [])
      setHomeOfficeList(escalas || [])
    } catch (err) {
      console.error('Erro ao carregar dados do portal de RH:', err)
    } finally {
      setLoading(false)
    }
  }

  // Obter dia da semana atual (0: Domingo, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sab)
  const hoje = new Date()
  const diaSemanaHojeIndex = hoje.getDay() // 1 = seg, 2 = ter, etc.
  const hojeStr = hoje.toISOString().split('T')[0]

  const getDiaSemanaProp = (index: number): 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | null => {
    switch (index) {
      case 1: return 'segunda'
      case 2: return 'terca'
      case 3: return 'quarta'
      case 4: return 'quinta'
      case 5: return 'sexta'
      case 6: return 'sabado'
      default: return null
    }
  }

  const diaAtualProp = getDiaSemanaProp(diaSemanaHojeIndex)

  // Cálculos de Indicadores em Tempo Real
  const kpis = useMemo(() => {
    // 1. Quem está de férias hoje
    const emFeriasHoje = todasFeriasEquipe.filter(f => {
      if (f.status === 'Reprovado') return false
      const q1Ativa = f.quinzena_1_inicio && f.quinzena_1_fim && (hojeStr >= f.quinzena_1_inicio && hojeStr <= f.quinzena_1_fim)
      const q2Ativa = f.quinzena_2_inicio && f.quinzena_2_fim && (hojeStr >= f.quinzena_2_inicio && hojeStr <= f.quinzena_2_fim)
      return q1Ativa || q2Ativa
    })

    // 2. Quem está de atestado/falta hoje
    const emAtestadoHoje = faltasList.filter(fa => {
      if (fa.status === 'Recusado') return false
      const dataFim = fa.data_falta_fim || fa.data_falta_inicio
      return hojeStr >= fa.data_falta_inicio && hojeStr <= dataFim
    })

    // 3. Quem está em Home Office hoje
    const emHomeOfficeHoje = homeOfficeList.filter(ho => {
      if (ho.modalidade === '100% Remoto') return true
      if (ho.modalidade === '100% Presencial') return false
      if (diaAtualProp && ho[diaAtualProp]) return true
      return false
    })

    // 4. Pendências de RH
    const feriasPendentes = todasFeriasEquipe.filter(f => f.status === 'Pendente')
    const faltasPendentes = faltasList.filter(f => f.status === 'Pendente' || f.status === 'Em Análise')

    return {
      totalColaboradores: usuarios.length || homeOfficeList.length || 8,
      emFeriasHoje,
      emAtestadoHoje,
      emHomeOfficeHoje,
      feriasPendentes,
      faltasPendentes
    }
  }, [todasFeriasEquipe, faltasList, homeOfficeList, usuarios, hojeStr, diaAtualProp])

  // Verificação estrita de conflito de férias entre colaboradores
  const checkConflitoPeriodo = (inicio: string, fim: string, quinzenaNum: 1 | 2) => {
    if (!inicio || !fim) return null

    for (const f of todasFeriasEquipe) {
      if (f.status === 'Reprovado') continue
      // Ignora as solicitações do próprio usuário logado
      if (f.usuario_id === user?.id || (user?.nome && f.usuario_nome?.toLowerCase() === user?.nome?.toLowerCase())) continue

      // Checa 1ª quinzena do colega
      if (f.quinzena_1_inicio && f.quinzena_1_fim) {
        if (inicio <= f.quinzena_1_fim && fim >= f.quinzena_1_inicio) {
          return {
            conflito: true,
            quinzena: quinzenaNum,
            funcionarioNome: f.usuario_nome,
            periodoInicio: f.quinzena_1_inicio,
            periodoFim: f.quinzena_1_fim,
            status: f.status
          }
        }
      }

      // Checa 2ª quinzena do colega
      if (f.quinzena_2_inicio && f.quinzena_2_fim) {
        if (inicio <= f.quinzena_2_fim && fim >= f.quinzena_2_inicio) {
          return {
            conflito: true,
            quinzena: quinzenaNum,
            funcionarioNome: f.usuario_nome,
            periodoInicio: f.quinzena_2_inicio,
            periodoFim: f.quinzena_2_fim,
            status: f.status
          }
        }
      }
    }

    return null
  }

  // Auto-cálculo de datas para 15 dias corridos
  const handleQ1InicioChange = (dataStr: string) => {
    setQ1Inicio(dataStr)
    if (dataStr) {
      const d = new Date(dataStr + 'T00:00:00')
      d.setDate(d.getDate() + 14) // 15 dias
      setQ1Fim(d.toISOString().split('T')[0])
    }
  }

  const handleQ2InicioChange = (dataStr: string) => {
    setQ2Inicio(dataStr)
    if (dataStr) {
      const d = new Date(dataStr + 'T00:00:00')
      d.setDate(d.getDate() + 14) // 15 dias
      setQ2Fim(d.toISOString().split('T')[0])
    }
  }

  const handleFaltaInicioChange = (dataStr: string) => {
    setFaltaInicio(dataStr)
    if (!faltaFim || faltaFim < dataStr) {
      setFaltaFim(dataStr)
    }
  }

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

    // 1. Validar conflito na 1ª Quinzena
    const conflitoQ1 = checkConflitoPeriodo(q1Inicio, q1Fim, 1)
    if (conflitoQ1) {
      alert(`⚠️ Bloqueio de Férias: O funcionário "${conflitoQ1.funcionarioNome}" já possui férias agendadas neste período (${formatDateDisplay(conflitoQ1.periodoInicio)} até ${formatDateDisplay(conflitoQ1.periodoFim)}).\n\nNão é permitido que dois funcionários retirem férias simultâneas. Por favor escolha outra data.`)
      return
    }

    // 2. Validar conflito na 2ª Quinzena (se preenchida)
    if (q2Inicio && q2Fim) {
      const conflitoQ2 = checkConflitoPeriodo(q2Inicio, q2Fim, 2)
      if (conflitoQ2) {
        alert(`⚠️ Bloqueio de Férias na 2ª Quinzena: O funcionário "${conflitoQ2.funcionarioNome}" já possui férias agendadas neste período (${formatDateDisplay(conflitoQ2.periodoInicio)} até ${formatDateDisplay(conflitoQ2.periodoFim)}).\n\nNão é permitido que dois funcionários retirem férias simultâneas. Por favor escolha outra data.`)
        return
      }

      if (q1Inicio <= q2Fim && q1Fim >= q2Inicio) {
        alert('A 2ª Quinzena não pode sobrepor a 1ª Quinzena.')
        return
      }
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

  const handleAbrirEdicaoHomeOffice = (colaborador?: { id: string; nome: string }) => {
    const targetId = colaborador?.id || user?.id || 'temp'
    const targetNome = colaborador?.nome || user?.nome || user?.login || 'Colaborador'
    const escalaExistente = homeOfficeList.find(h => h.usuario_id === targetId || h.usuario_nome.toLowerCase() === targetNome.toLowerCase())

    if (escalaExistente) {
      setEditingHomeOffice({
        usuario_id: targetId,
        usuario_nome: escalaExistente.usuario_nome,
        modalidade: escalaExistente.modalidade,
        segunda: escalaExistente.segunda,
        terca: escalaExistente.terca,
        quarta: escalaExistente.quarta,
        quinta: escalaExistente.quinta,
        sexta: escalaExistente.sexta,
        sabado: escalaExistente.sabado,
        observacoes: escalaExistente.observacoes || ''
      })
    } else {
      setEditingHomeOffice({
        usuario_id: targetId,
        usuario_nome: targetNome,
        modalidade: 'Híbrido',
        segunda: false,
        terca: false,
        quarta: false,
        quinta: false,
        sexta: false,
        sabado: false,
        observacoes: ''
      })
    }
    setIsHomeOfficeModalOpen(true)
  }

  const handleSalvarHomeOffice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHomeOffice) return

    setSalvandoHomeOffice(true)
    try {
      await api.upsertEscalaHomeOffice(editingHomeOffice)
      setIsHomeOfficeModalOpen(false)
      setEditingHomeOffice(null)
      await fetchData()
      alert('Escala de Home Office salva com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar escala: ' + err.message)
    } finally {
      setSalvandoHomeOffice(false)
    }
  }

  const handleSalvarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemAvaliacao) return

    setSalvandoAvaliacao(true)
    try {
      const aprovador = user?.nome || user?.login || 'Gestor RH'

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
      alert('Avaliação de RH salva com sucesso!')
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

  // Filtragem de Home Office por dia
  const filteredHomeOfficeList = useMemo(() => {
    return homeOfficeList.filter(item => {
      const matchBusca = !filtroBusca || item.usuario_nome.toLowerCase().includes(filtroBusca.toLowerCase())
      if (!matchBusca) return false

      if (filtroDiaHomeOffice === 'todos') return true
      if (filtroDiaHomeOffice === 'hoje') {
        if (item.modalidade === '100% Remoto') return true
        if (item.modalidade === '100% Presencial') return false
        return diaAtualProp ? !!item[diaAtualProp] : false
      }
      if (filtroDiaHomeOffice === 'segunda') return item.modalidade === '100% Remoto' || item.segunda
      if (filtroDiaHomeOffice === 'terca') return item.modalidade === '100% Remoto' || item.terca
      if (filtroDiaHomeOffice === 'quarta') return item.modalidade === '100% Remoto' || item.quarta
      if (filtroDiaHomeOffice === 'quinta') return item.modalidade === '100% Remoto' || item.quinta
      if (filtroDiaHomeOffice === 'sexta') return item.modalidade === '100% Remoto' || item.sexta
      return true
    })
  }, [homeOfficeList, filtroBusca, filtroDiaHomeOffice, diaAtualProp])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* ================= TOP HEADER BANNER ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/50 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-brand-500/5 to-transparent pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-teal-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/10">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Recursos Humanos & Equipe
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
                  Mantran RH
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestão integrada de Férias (2 Quinzenas), Faltas/Atestados, Escala de Home Office e Indicadores de Pessoas
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            type="button"
            onClick={() => setIsFeriasModalOpen(true)}
            className="btn-primary py-2.5 px-4 flex items-center gap-2 text-xs font-bold shadow-lg shadow-brand-500/20 cursor-pointer"
          >
            <Palmtree className="w-4 h-4" />
            <span>Solicitar Férias</span>
          </button>

          <button
            type="button"
            onClick={() => handleAbrirEdicaoHomeOffice()}
            className="py-2.5 px-4 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span>Meu Home Office</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFaltaModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Atestado / Falta</span>
          </button>
        </div>
      </div>

      {/* ================= NAVIGATION TABS ================= */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setTab('dashboard')}
          className={clsx(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            tab === 'dashboard'
              ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          )}
        >
          <Activity className="w-4 h-4 text-brand-400" />
          <span>Dashboard & Indicadores</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('ferias')}
          className={clsx(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            tab === 'ferias'
              ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          )}
        >
          <Palmtree className="w-4 h-4 text-amber-400" />
          <span>Férias & Quinzenas ({feriasList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('home_office')}
          className={clsx(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            tab === 'home_office'
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          )}
        >
          <Home className="w-4 h-4 text-cyan-400" />
          <span>Escala de Home Office ({homeOfficeList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('faltas')}
          className={clsx(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            tab === 'faltas'
              ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          )}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Faltas e Atestados ({faltasList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('equipe')}
          className={clsx(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            tab === 'equipe'
              ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          )}
        >
          <Users2 className="w-4 h-4 text-blue-400" />
          <span>Dossiê da Equipe ({usuarios.length || homeOfficeList.length})</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setTab('gestao')}
            className={clsx(
              "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ml-auto whitespace-nowrap",
              tab === 'gestao'
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/30 border border-purple-500/20"
            )}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Aprovações RH {kpis.feriasPendentes.length + kpis.faltasPendentes.length > 0 && `(${kpis.feriasPendentes.length + kpis.faltasPendentes.length})`}</span>
          </button>
        )}
      </div>

      {/* ================= TAB 1: DASHBOARD & INDICADORES ================= */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm animate-pulse">
          Carregando dados executivos de RH...
        </div>
      ) : tab === 'dashboard' ? (
        <div className="space-y-6">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Em Férias Hoje */}
            <div className="bg-dark-card border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Férias Hoje</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Palmtree className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{kpis.emFeriasHoje.length}</span>
                <span className="text-xs text-slate-400">colaboradores</span>
              </div>
              <p className="mt-2 text-[11px] text-amber-300/80">
                {kpis.emFeriasHoje.length > 0 
                  ? kpis.emFeriasHoje.map(f => f.usuario_nome).join(', ')
                  : 'Nenhum colaborador em férias hoje'}
              </p>
            </div>

            {/* 2. Home Office Hoje */}
            <div className="bg-dark-card border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Home Office Hoje</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{kpis.emHomeOfficeHoje.length}</span>
                <span className="text-xs text-slate-400">remotos</span>
              </div>
              <p className="mt-2 text-[11px] text-cyan-300/80">
                {kpis.emHomeOfficeHoje.length > 0
                  ? `${kpis.emHomeOfficeHoje.map(h => h.usuario_nome).slice(0, 3).join(', ')}${kpis.emHomeOfficeHoje.length > 3 ? ` +${kpis.emHomeOfficeHoje.length - 3}` : ''}`
                  : 'Toda equipe em presencial hoje'}
              </p>
            </div>

            {/* 3. Atestados / Faltas */}
            <div className="bg-dark-card border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atestados no Mês</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{faltasList.length}</span>
                <span className="text-xs text-slate-400">registros</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {kpis.emAtestadoHoje.length > 0 
                  ? `${kpis.emAtestadoHoje.length} em afastamento ativo hoje`
                  : 'Nenhum afastamento ativo hoje'}
              </p>
            </div>

            {/* 4. Total Equipe & Pendências */}
            <div className="bg-dark-card border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quadro Mantran</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Users2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{kpis.totalColaboradores}</span>
                <span className="text-xs text-slate-400">membros</span>
              </div>
              <p className="mt-2 text-[11px] text-purple-300/80">
                {kpis.feriasPendentes.length + kpis.faltasPendentes.length > 0
                  ? `${kpis.feriasPendentes.length + kpis.faltasPendentes.length} pendência(s) de aprovação`
                  : 'Tudo em dia com o RH'}
              </p>
            </div>
          </div>

          {/* PRESENÇA HOJE - QUADRO DINÂMICO */}
          <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-400" />
                  Presença & Alocação da Equipe Hoje ({new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })})
                </h2>
                <p className="text-xs text-slate-400">
                  Visão em tempo real de quem está no escritório presencial, em home office, férias ou atestado médico.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTab('home_office')}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Escala Semanal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {usuarios.map(u => {
                const fAtiva = todasFeriasEquipe.find(f => {
                  if (f.status === 'Reprovado') return false
                  const matchUser = f.usuario_id === u.id || f.usuario_nome.toLowerCase() === u.nome.toLowerCase()
                  if (!matchUser) return false
                  const q1 = f.quinzena_1_inicio && f.quinzena_1_fim && (hojeStr >= f.quinzena_1_inicio && hojeStr <= f.quinzena_1_fim)
                  const q2 = f.quinzena_2_inicio && f.quinzena_2_fim && (hojeStr >= f.quinzena_2_inicio && hojeStr <= f.quinzena_2_fim)
                  return q1 || q2
                })

                const faAtiva = faltasList.find(fa => {
                  if (fa.status === 'Recusado') return false
                  const matchUser = fa.usuario_id === u.id || fa.usuario_nome.toLowerCase() === u.nome.toLowerCase()
                  if (!matchUser) return false
                  const fim = fa.data_falta_fim || fa.data_falta_inicio
                  return hojeStr >= fa.data_falta_inicio && hojeStr <= fim
                })

                const hoEscala = homeOfficeList.find(h => h.usuario_id === u.id || h.usuario_nome.toLowerCase() === u.nome.toLowerCase())
                const isHomeOfficeHoje = hoEscala?.modalidade === '100% Remoto' || (diaAtualProp && hoEscala?.[diaAtualProp])

                let statusText = '🏢 Escritório Presencial'
                let statusBg = 'bg-slate-900 border-slate-800 text-slate-300'
                let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700'

                if (fAtiva) {
                  statusText = '🌴 Em Férias'
                  statusBg = 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  badgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                } else if (faAtiva) {
                  statusText = '🩺 Atestado Médico'
                  statusBg = 'bg-red-950/20 border-red-500/30 text-red-200'
                  badgeClass = 'bg-red-500/15 text-red-300 border-red-500/30'
                } else if (isHomeOfficeHoje) {
                  statusText = '🏠 Home Office Hoje'
                  statusBg = 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
                  badgeClass = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                }

                return (
                  <div 
                    key={u.id}
                    className={clsx("p-3.5 rounded-2xl border transition-all flex items-center justify-between", statusBg)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 font-bold flex items-center justify-center text-xs text-white uppercase shrink-0">
                        {u.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate max-w-[150px]">{u.nome}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{u.perfil}</p>
                      </div>
                    </div>

                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-lg border", badgeClass)}>
                      {statusText}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* PRÓXIMAS FÉRIAS & REGRAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Linha do Tempo de Férias */}
            <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-400" />
                Próximos Períodos de Férias Agendados
              </h3>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {todasFeriasEquipe.filter(f => f.status !== 'Reprovado').length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">Nenhum período de férias agendado no momento.</p>
                ) : (
                  todasFeriasEquipe.filter(f => f.status !== 'Reprovado').map(f => (
                    <div key={f.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{f.usuario_nome}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          1ª Quinzena: {formatDateDisplay(f.quinzena_1_inicio)} a {formatDateDisplay(f.quinzena_1_fim)}
                          {f.quinzena_2_inicio && ` • 2ª Quinzena: ${formatDateDisplay(f.quinzena_2_inicio)} a ${formatDateDisplay(f.quinzena_2_fim)}`}
                        </span>
                      </div>
                      {getStatusBadge(f.status)}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Política de Férias e Diretrizes Mantran */}
            <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                Diretrizes de RH Mantran
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                    Regra das 2 Quinzenas
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Cada colaborador usufrui de suas férias anuais divididas em 2 quinzenas separadas (15 dias corridos cada).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Bloqueio de Férias Simultâneas
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Para assegurar a continuidade do atendimento e implantações, nenhum colaborador pode retirar férias no mesmo período que outro colega.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-cyan-400" />
                    Regime de Home Office
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    A escala de trabalho remoto deve ser mantida atualizada para alinhamento entre o suporte técnico, comercial e clientes.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : tab === 'ferias' ? (
        /* ================= TAB 2: FÉRIAS & QUINZENAS ================= */
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-card border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-amber-400" />
                Painel de Férias da Equipe Mantran ({anoFiltro})
              </h2>
              <p className="text-xs text-slate-400">
                Visualização de solicitações, períodos aprovados e bloqueio de sobreposições.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFeriasModalOpen(true)}
                className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Solicitação</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feriasList.map((f) => (
              <div 
                key={f.id} 
                className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 font-bold flex items-center justify-center text-xs">
                      {f.usuario_nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{f.usuario_nome}</p>
                      <span className="text-[10px] text-slate-400">Exercício: {f.ano_vigencia}</span>
                    </div>
                  </div>
                  {getStatusBadge(f.status)}
                </div>

                {/* Quinzenas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-400">1ª Quinzena</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 font-semibold">15 dias</span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {formatDateDisplay(f.quinzena_1_inicio)} até {formatDateDisplay(f.quinzena_1_fim)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-400">2ª Quinzena</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 font-semibold">
                        {f.quinzena_2_inicio ? '15 dias' : 'A definir'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {f.quinzena_2_inicio ? (
                        `${formatDateDisplay(f.quinzena_2_inicio)} até ${formatDateDisplay(f.quinzena_2_fim)}`
                      ) : (
                        <span className="text-slate-500 italic">Pendente</span>
                      )}
                    </p>
                  </div>
                </div>

                {f.observacoes && (
                  <p className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
                    <strong className="text-slate-400 block text-[11px]">Obs:</strong>
                    {f.observacoes}
                  </p>
                )}

                {f.resposta_rh && (
                  <p className="text-xs text-amber-200 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    <strong className="text-amber-400 block text-[11px]">Parecer do RH:</strong>
                    {f.resposta_rh}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Enviado em {formatDateDisplay(f.created_at)}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemAvaliacao({ type: 'ferias', item: f })
                        setStatusAvaliacao(f.status || 'Aprovado')
                        setRespostaRh(f.resposta_rh || '')
                      }}
                      className="text-xs font-bold text-brand-400 hover:text-brand-300 underline cursor-pointer"
                    >
                      Avaliar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'home_office' ? (
        /* ================= TAB 3: ESCALA DE HOME OFFICE ================= */
        <div className="space-y-5">
          
          <div className="bg-dark-card border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-cyan-400" />
                Escala Semanal de Trabalho & Home Office
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie os dias remotos e presenciais de cada colaborador da equipe Mantran.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleAbrirEdicaoHomeOffice()}
                className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Configurar Escala</span>
              </button>
            </div>
          </div>

          {/* Filtros de Dia */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            {[
              { id: 'todos', label: 'Todos os Dias' },
              { id: 'hoje', label: '⭐ Hoje' },
              { id: 'segunda', label: 'Segunda-feira' },
              { id: 'terca', label: 'Terça-feira' },
              { id: 'quarta', label: 'Quarta-feira' },
              { id: 'quinta', label: 'Quinta-feira' },
              { id: 'sexta', label: 'Sexta-feira' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroDiaHomeOffice(f.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  filtroDiaHomeOffice === f.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Grid / Tabela Semanal de Home Office */}
          <div className="bg-dark-card border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Colaborador</th>
                    <th className="p-4">Modalidade</th>
                    <th className="p-4 text-center">Seg</th>
                    <th className="p-4 text-center">Ter</th>
                    <th className="p-4 text-center">Qua</th>
                    <th className="p-4 text-center">Qui</th>
                    <th className="p-4 text-center">Sex</th>
                    <th className="p-4 text-center">Hoje</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHomeOfficeList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Nenhum colaborador encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredHomeOfficeList.map((item) => {
                      const isHojeRemoto = item.modalidade === '100% Remoto' || (diaAtualProp && item[diaAtualProp])
                      return (
                        <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-4 font-bold text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 font-bold flex items-center justify-center text-xs text-white">
                                {item.usuario_nome.charAt(0)}
                              </div>
                              <span>{item.usuario_nome}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className={clsx(
                              "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                              item.modalidade === '100% Remoto'
                                ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                : item.modalidade === '100% Presencial'
                                ? "bg-slate-800 text-slate-300 border-slate-700"
                                : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                            )}>
                              {item.modalidade}
                            </span>
                          </td>

                          {/* Seg a Sex */}
                          {['segunda', 'terca', 'quarta', 'quinta', 'sexta'].map((diaKey) => {
                            const isRemoto = item.modalidade === '100% Remoto' || (item as any)[diaKey]
                            return (
                              <td key={diaKey} className="p-4 text-center">
                                {isRemoto ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs border border-cyan-500/40">
                                    🏠
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800/40 text-slate-600 font-bold text-xs">
                                    🏢
                                  </span>
                                )}
                              </td>
                            )
                          })}

                          {/* Status Hoje */}
                          <td className="p-4 text-center">
                            <span className={clsx(
                              "text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-block",
                              isHojeRemoto
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            )}>
                              {isHojeRemoto ? '🏠 Remoto' : '🏢 Presencial'}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleAbrirEdicaoHomeOffice({ id: item.usuario_id, nome: item.usuario_nome })}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : tab === 'faltas' ? (
        /* ================= TAB 4: FALTAS & ATESTADOS ================= */
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-card border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Comunicação de Ausências & Atestados Médicos
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhamento de justificativas, atestados anexados e abonos do RH.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFaltaModalOpen(true)}
              className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Comunicar Falta / Atestado</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {faltasList.map((item) => (
              <div 
                key={item.id}
                className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[170px]">
                      👤 {item.usuario_nome}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">{item.motivo}</span>
                      <span className="font-semibold text-white">
                        {formatDateDisplay(item.data_falta_inicio)}
                        {item.data_falta_fim && item.data_falta_fim !== item.data_falta_inicio && (
                          ` a ${formatDateDisplay(item.data_falta_fim)}`
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-bold border border-brand-500/20">
                      {item.dias_afastamento}d
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
                      Sem anexo
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{formatDateDisplay(item.created_at)}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setItemAvaliacao({ type: 'falta', item })
                          setStatusAvaliacao(item.status || 'Abonado / Aprovado')
                          setRespostaRh(item.observacoes_rh || '')
                        }}
                        className="text-xs font-bold text-brand-400 hover:text-brand-300 underline cursor-pointer"
                      >
                        Avaliar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'equipe' ? (
        /* ================= TAB 5: DOSSIÊ DA EQUIPE ================= */
        <div className="space-y-5">
          <div className="bg-dark-card border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users2 className="w-5 h-5 text-blue-400" />
                Quadro Geral de Colaboradores & Dossiê Mantran
              </h2>
              <p className="text-xs text-slate-400">
                Resumo unificado de cada colaborador com perfil, status de férias e escala semanal.
              </p>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
                placeholder="Buscar colaborador..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usuarios.filter(u => !filtroBusca || u.nome.toLowerCase().includes(filtroBusca.toLowerCase())).map(u => {
              const fUsuario = todasFeriasEquipe.filter(f => f.usuario_id === u.id || f.usuario_nome.toLowerCase() === u.nome.toLowerCase())
              const hoUsuario = homeOfficeList.find(h => h.usuario_id === u.id || h.usuario_nome.toLowerCase() === u.nome.toLowerCase())

              return (
                <div 
                  key={u.id}
                  className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500/20 to-blue-500/20 border border-brand-500/30 text-brand-300 font-bold flex items-center justify-center text-sm">
                      {u.nome.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{u.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                          {u.perfil}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">@{u.login}</span>
                      </div>
                    </div>
                  </div>

                  {/* Informações de Trabalho */}
                  <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Modalidade:</span>
                      <span className="font-bold text-cyan-400">{hoUsuario?.modalidade || 'Presencial'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Home Office:</span>
                      <span className="font-mono text-slate-300">
                        {hoUsuario?.modalidade === '100% Remoto' 
                          ? 'Integral (Seg-Sex)' 
                          : hoUsuario ? (
                              [
                                hoUsuario.segunda && 'Seg',
                                hoUsuario.terca && 'Ter',
                                hoUsuario.quarta && 'Qua',
                                hoUsuario.quinta && 'Qui',
                                hoUsuario.sexta && 'Sex'
                              ].filter(Boolean).join(', ') || 'Nenhum dia fixo'
                            ) : 'Padrão Escritório'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Férias no Ano:</span>
                      <span className="font-bold text-amber-400">
                        {fUsuario.length > 0 ? `${fUsuario.length} período(s)` : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAbrirEdicaoHomeOffice({ id: u.id, nome: u.nome })}
                      className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors"
                    >
                      Ajustar Escala
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ================= TAB 6: GESTÃO & APROVAÇÕES RH (ADMIN) ================= */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-200">
              <p className="font-bold text-purple-300 mb-0.5">Painel de Decisão do RH</p>
              <p className="opacity-90">
                Aprovação e parecer sobre solicitações de férias e atestados médicos de todos os colaboradores Mantran.
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
                          <td className="p-3.5 font-bold text-white">{f.usuario_nome}</td>
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
                          <td className="p-3.5">{getStatusBadge(f.status)}</td>
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

          {/* Faltas e Atestados */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Faltas & Atestados Médicos ({faltasList.length})
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
                          <td className="p-3.5 font-bold text-white">{item.usuario_nome}</td>
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
                          <td className="p-3.5">{getStatusBadge(item.status)}</td>
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
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
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

            {(() => {
              const conflitoQ1 = checkConflitoPeriodo(q1Inicio, q1Fim, 1)
              const conflitoQ2 = q2Inicio && q2Fim ? checkConflitoPeriodo(q2Inicio, q2Fim, 2) : null
              const temConflito = !!conflitoQ1 || !!conflitoQ2
              const conflitoAtivo = conflitoQ1 || conflitoQ2

              const outrasFeriasEquipe = todasFeriasEquipe.filter(f => 
                f.status !== 'Reprovado' && 
                f.usuario_id !== user?.id && 
                (!user?.nome || f.usuario_nome?.toLowerCase() !== user?.nome?.toLowerCase())
              )

              return (
                <form onSubmit={handleSalvarFerias} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* Banner de Bloqueio em caso de conflito de datas */}
                  {temConflito && conflitoAtivo && (
                    <div className="p-4 rounded-2xl bg-red-500/15 border-2 border-red-500/40 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-150">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-200 space-y-1">
                        <p className="font-bold text-red-300 text-sm flex items-center gap-1.5">
                          <span>⛔ Período Bloqueado para Férias</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-900/60 text-red-300 border border-red-700">
                            {conflitoAtivo.quinzena}ª Quinzena
                          </span>
                        </p>
                        <p>
                          O colaborador <strong className="text-white underline">{conflitoAtivo.funcionarioNome}</strong> já estará em período de férias de <strong className="text-white font-mono">{formatDateDisplay(conflitoAtivo.periodoInicio)}</strong> até <strong className="text-white font-mono">{formatDateDisplay(conflitoAtivo.periodoFim)}</strong>.
                        </p>
                        <p className="text-[11px] text-red-300/90 font-medium">
                          Não é permitido retirar férias simultaneamente com outro colega. Por favor escolha um intervalo livre.
                        </p>
                      </div>
                    </div>
                  )}

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
                  <div className={clsx(
                    "p-4 rounded-xl bg-slate-900/60 border transition-all space-y-3",
                    conflitoQ1 
                      ? "border-red-500/60 bg-red-950/20" 
                      : "border-brand-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                        conflitoQ1 ? "text-red-400" : "text-brand-400"
                      )}>
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
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg bg-slate-900 border text-white text-xs font-medium focus:outline-none",
                            conflitoQ1 
                              ? "border-red-500 focus:border-red-400" 
                              : "border-slate-700 focus:border-brand-500"
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Fim (15º dia)</label>
                        <input
                          type="date"
                          value={q1Fim}
                          onChange={e => setQ1Fim(e.target.value)}
                          required
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg bg-slate-900 border text-white text-xs font-medium focus:outline-none",
                            conflitoQ1 
                              ? "border-red-500 focus:border-red-400" 
                              : "border-slate-700 focus:border-brand-500"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2ª Quinzena (Opcional) */}
                  <div className={clsx(
                    "p-4 rounded-xl bg-slate-900/60 border transition-all space-y-3",
                    conflitoQ2 
                      ? "border-red-500/60 bg-red-950/20" 
                      : "border-teal-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                        conflitoQ2 ? "text-red-400" : "text-teal-400"
                      )}>
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
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg bg-slate-900 border text-white text-xs font-medium focus:outline-none",
                            conflitoQ2 
                              ? "border-red-500 focus:border-red-400" 
                              : "border-slate-700 focus:border-teal-500"
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Fim (15º dia)</label>
                        <input
                          type="date"
                          value={q2Fim}
                          onChange={e => setQ2Fim(e.target.value)}
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg bg-slate-900 border text-white text-xs font-medium focus:outline-none",
                            conflitoQ2 
                              ? "border-red-500 focus:border-red-400" 
                              : "border-slate-700 focus:border-teal-500"
                          )}
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
                      placeholder="Ex: Alinhado previamente com a equipe..."
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-brand-500"
                    />
                  </div>

                  {/* Períodos já agendados por outros colaboradores */}
                  {outrasFeriasEquipe.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        Períodos de Férias Ocupados pela Equipe ({anoVigencia}):
                      </span>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto">
                        {outrasFeriasEquipe.map(of => (
                          <div key={of.id} className="text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
                            <span className="font-bold text-slate-200">
                              👤 {of.usuario_nome}
                            </span>
                            <span className="font-mono text-slate-400">
                              {formatDateDisplay(of.quinzena_1_inicio)} a {formatDateDisplay(of.quinzena_1_fim)}
                              {of.quinzena_2_inicio && ` • ${formatDateDisplay(of.quinzena_2_inicio)} a ${formatDateDisplay(of.quinzena_2_fim)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      disabled={salvandoFerias || temConflito}
                      className={clsx(
                        "flex-1 py-2.5 flex items-center justify-center gap-2 font-bold cursor-pointer transition-all",
                        temConflito
                          ? "bg-red-500/20 text-red-300 border border-red-500/30 opacity-70 cursor-not-allowed"
                          : "btn-primary"
                      )}
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {salvandoFerias 
                          ? 'Enviando...' 
                          : temConflito 
                          ? 'Período Indisponível' 
                          : 'Enviar Solicitação'}
                      </span>
                    </button>
                  </div>
                </form>
              )
            })()}
          </div>
        </div>
      )}

      {/* ================= MODAL EDITAR ESCALA DE HOME OFFICE ================= */}
      {isHomeOfficeModalOpen && editingHomeOffice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Escala de Home Office</h2>
                  <p className="text-xs text-slate-400">{editingHomeOffice.usuario_nome}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHomeOfficeModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarHomeOffice} className="p-6 space-y-4">
              {/* Modalidade */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Regime / Modalidade de Trabalho
                </label>
                <select
                  value={editingHomeOffice.modalidade}
                  onChange={e => setEditingHomeOffice({ ...editingHomeOffice, modalidade: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500"
                >
                  <option value="Híbrido">Híbrido (Dias Específicos)</option>
                  <option value="100% Remoto">100% Remoto (Home Office Integral)</option>
                  <option value="100% Presencial">100% Presencial (Escritório Mantran)</option>
                </select>
              </div>

              {/* Seleção de Dias de Home Office (se Híbrido) */}
              {editingHomeOffice.modalidade === 'Híbrido' && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Dias da Semana em Home Office
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Marque abaixo quais dias da semana este colaborador trabalhará de casa:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {[
                      { key: 'segunda', label: 'Segunda-feira' },
                      { key: 'terca', label: 'Terça-feira' },
                      { key: 'quarta', label: 'Quarta-feira' },
                      { key: 'quinta', label: 'Quinta-feira' },
                      { key: 'sexta', label: 'Sexta-feira' },
                      { key: 'sabado', label: 'Sábado' },
                    ].map(dia => (
                      <label 
                        key={dia.key} 
                        className={clsx(
                          "p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all select-none text-xs font-semibold",
                          (editingHomeOffice as any)[dia.key]
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!(editingHomeOffice as any)[dia.key]}
                          onChange={e => setEditingHomeOffice({ ...editingHomeOffice, [dia.key]: e.target.checked })}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-0 focus:outline-none"
                        />
                        <span>{dia.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observações / Detalhes de Alocação
                </label>
                <textarea
                  value={editingHomeOffice.observacoes}
                  onChange={e => setEditingHomeOffice({ ...editingHomeOffice, observacoes: e.target.value })}
                  placeholder="Ex: Escala de plantão de suporte ou flexibilidade acordada..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsHomeOfficeModalOpen(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoHomeOffice}
                  className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs flex-1 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvandoHomeOffice ? 'Salvando...' : 'Salvar Escala'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL COMUNICAR FALTA / ATESTADO ================= */}
      {isFaltaModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
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
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
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
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
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
