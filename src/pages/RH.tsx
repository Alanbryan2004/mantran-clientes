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
  Shield, 
  Sparkles, 
  Send, 
  Paperclip, 
  Check, 
  X, 
  Laptop, 
  Users2, 
  Home, 
  Activity, 
  ArrowRight, 
  MapPin, 
  Settings, 
  PhoneCall, 
  DollarSign,
  Edit3,
  Trash2,
  Timer,
  Camera,
  Loader2,
  Gift,
  Cake,
  PartyPopper,
  Mail,
  Building2,
  UserCheck
} from 'lucide-react'
import { 
  api, 
  type SolicitacaoFerias, 
  type FaltaAtestado, 
  type EscalaHomeOffice,
  type PlantaoTecnico,
  type UsuarioSistema,
  type RegistroPonto,
  type TipoPonto,
  type JornadaTrabalho,
  type SolicitacaoDayOff
} from '../lib/api'
import { getLoggedUser, isAdminUser, updateLoggedUserFoto, updateLoggedUserDataNascimento, updateLoggedUserEmails } from '../lib/auth'
import { ControlePontoModal } from '../components/ControlePontoModal'
import { calcularBancoHoras, formatSaldo } from '../lib/bancoHoras'
import clsx from 'clsx'

export function RH() {
  const user = getLoggedUser()
  const isAdmin = isAdminUser()
  const isGestorRh = isAdmin || user?.perfil?.trim().toLowerCase() === 'rh'
  const isTecnico = user?.perfil?.trim().toLowerCase() === 'tecnico' || user?.perfil?.trim().toLowerCase() === 'administrador'

  // Abas de navegação:
  // Se for Gestor/Admin: 'dashboard' | 'plantoes_equipe' | 'ferias_equipe' | 'dayoff_equipe' | 'home_office_equipe' | 'faltas_equipe' | 'ponto_equipe' | 'jornada_equipe' | 'equipe_dossie' | 'gestao_aprovacoes'
  // Se for Colaborador: 'minhas_ferias' | 'meu_day_off' | 'meus_plantoes' | 'meu_home_office' | 'minhas_faltas'
  const [tab, setTab] = useState<string>(isGestorRh ? 'dashboard' : 'minhas_ferias')
  const [loading, setLoading] = useState(true)

  // Listas de dados
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [todasFeriasEquipe, setTodasFeriasEquipe] = useState<SolicitacaoFerias[]>([])
  const [todasDayOffEquipe, setTodasDayOffEquipe] = useState<SolicitacaoDayOff[]>([])
  const [todasFaltasEquipe, setTodasFaltasEquipe] = useState<FaltaAtestado[]>([])
  const [todasEscalasEquipe, setTodasEscalasEquipe] = useState<EscalaHomeOffice[]>([])
  const [todosPlantoesEquipe, setTodosPlantoesEquipe] = useState<PlantaoTecnico[]>([])
  const [todosPontosEquipe, setTodosPontosEquipe] = useState<RegistroPonto[]>([])
  const [todasJornadasEquipe, setTodasJornadasEquipe] = useState<JornadaTrabalho[]>([])

  // Data selecionada na aba de Ponto (padrão: hoje)
  const [pontoDataSelecionada, setPontoDataSelecionada] = useState(() => new Date().toISOString().slice(0, 10))

  // Filtros & Buscas
  const [anoVigencia, setAnoVigencia] = useState(new Date().getFullYear())

  // Modal Solicitar / Editar Férias
  const [isFeriasModalOpen, setIsFeriasModalOpen] = useState(false)
  const [editingFeriasId, setEditingFeriasId] = useState<string | null>(null)
  const [feriasUsuarioId, setFeriasUsuarioId] = useState('')
  const [feriasUsuarioNome, setFeriasUsuarioNome] = useState('')
  const [q1Inicio, setQ1Inicio] = useState('')
  const [q1Fim, setQ1Fim] = useState('')
  const [q2Inicio, setQ2Inicio] = useState('')
  const [q2Fim, setQ2Fim] = useState('')
  const [feriasObs, setFeriasObs] = useState('')
  const [salvandoFerias, setSalvandoFerias] = useState(false)

  // Modal Solicitar / Editar Day Off (Folga de Aniversário)
  const [isDayOffModalOpen, setIsDayOffModalOpen] = useState(false)
  const [editingDayOffId, setEditingDayOffId] = useState<string | null>(null)
  const [dayOffUsuarioId, setDayOffUsuarioId] = useState('')
  const [dayOffUsuarioNome, setDayOffUsuarioNome] = useState('')
  const [dayOffDataNascimento, setDayOffDataNascimento] = useState('')
  const [dayOffDataSolicitada, setDayOffDataSolicitada] = useState('')
  const [dayOffObs, setDayOffObs] = useState('')
  const [salvandoDayOff, setSalvandoDayOff] = useState(false)
  const [salvandoDataNascModal, setSalvandoDataNascModal] = useState(false)

  // Modal Comunicar Falta / Enviar Atestado
  const [isFaltaModalOpen, setIsFaltaModalOpen] = useState(false)
  const [editingFaltaId, setEditingFaltaId] = useState<string | null>(null)
  const [faltaUsuarioId, setFaltaUsuarioId] = useState('')
  const [faltaUsuarioNome, setFaltaUsuarioNome] = useState('')
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

  // Modal Informar / Cadastrar Plantão de Final de Semana
  const [isPlantaoModalOpen, setIsPlantaoModalOpen] = useState(false)
  const [plantaoTecnicoId, setPlantaoTecnicoId] = useState('')
  const [plantaoTecnicoNome, setPlantaoTecnicoNome] = useState('')
  const [plantaoDataInicio, setPlantaoDataInicio] = useState('')
  const [plantaoDataFim, setPlantaoDataFim] = useState('')
  const [plantaoValor, setPlantaoValor] = useState<number | ''>('')
  const [plantaoObs, setPlantaoObs] = useState('')
  const [salvandoPlantao, setSalvandoPlantao] = useState(false)

  // Modal Pagamento / Avaliação de Plantão pelo RH
  const [plantaoPagamentoItem, setPlantaoPagamentoItem] = useState<PlantaoTecnico | null>(null)
  const [pagamentoStatus, setPagamentoStatus] = useState<'Pendente' | 'Aprovado' | 'Pago'>('Pago')
  const [pagamentoValor, setPagamentoValor] = useState<number | ''>('')
  const [pagamentoObs, setPagamentoObs] = useState('')
  const [salvandoPagamentoPlantao, setSalvandoPagamentoPlantao] = useState(false)

  // Modal Avaliação Férias/Day Off/Faltas RH (Admin)
  const [itemAvaliacao, setItemAvaliacao] = useState<{ type: 'ferias' | 'falta' | 'dayoff'; item: any } | null>(null)
  const [statusAvaliacao, setStatusAvaliacao] = useState<string>('Aprovado')
  const [respostaRh, setRespostaRh] = useState('')
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false)

  // Visualizador de Atestado
  const [previewAtestado, setPreviewAtestado] = useState<FaltaAtestado | null>(null)

  // Foto (avatar) do usuário logado
  const [minhaFoto, setMinhaFoto] = useState<string | null>(user?.foto_url || null)
  const [salvandoFoto, setSalvandoFoto] = useState(false)

  // Modal de Controle de Ponto
  const [isPontoModalOpen, setIsPontoModalOpen] = useState(false)

  // Modal de Funcionários (lista) e resumo de um funcionário
  const [isFuncionariosModalOpen, setIsFuncionariosModalOpen] = useState(false)
  const [funcionarioResumo, setFuncionarioResumo] = useState<UsuarioSistema | null>(null)
  const [isEditandoFuncionario, setIsEditandoFuncionario] = useState(false)
  const [editFuncDataNasc, setEditFuncDataNasc] = useState('')
  const [editFuncEmailCorp, setEditFuncEmailCorp] = useState('')
  const [editFuncEmailPessoal, setEditFuncEmailPessoal] = useState('')
  const [salvandoFuncionarioDados, setSalvandoFuncionarioDados] = useState(false)

  // Modal de Jornada de Trabalho (edição pelo RH)
  const [editingJornada, setEditingJornada] = useState<{
    usuario_id: string
    usuario_nome: string
    segunda: boolean
    terca: boolean
    quarta: boolean
    quinta: boolean
    sexta: boolean
    sabado: boolean
    domingo: boolean
    hora_entrada: string
    hora_saida: string
    almoco_inicio: string
    almoco_fim: string
    observacoes: string
  } | null>(null)
  const [salvandoJornada, setSalvandoJornada] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  // Pedido externo (via notificação de aniversário) para abrir o modal de Day Off
  const [pedidoAbrirDayOff, setPedidoAbrirDayOff] = useState(false)
  useEffect(() => {
    const abrir = () => setPedidoAbrirDayOff(true)
    window.addEventListener('mantran:abrir-dayoff', abrir)
    return () => window.removeEventListener('mantran:abrir-dayoff', abrir)
  }, [])

  // Quando solicitado e os dados já carregaram, abre o modal de Day Off do usuário logado
  useEffect(() => {
    if (pedidoAbrirDayOff && !loading && usuarios.length > 0) {
      handleAbrirModalDayOff()
      setPedidoAbrirDayOff(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoAbrirDayOff, loading, usuarios])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [allUsers, todasFerias, faltas, escalas, plantoes, pontos, jornadas, dayOffs] = await Promise.all([
        api.getUsuariosSistema().catch(() => []),
        api.getSolicitacoesFerias().catch(() => []),
        api.getFaltasEAtestados().catch(() => []),
        api.getEscalasHomeOffice().catch(() => []),
        api.getPlantoes().catch(() => []),
        api.getRegistrosPonto().catch(() => []),
        api.getJornadas().catch(() => []),
        api.getDayOff().catch(() => [])
      ])

      // Filtra apenas funcionários da Mantran
      const isFuncionarioMantran = (perfil?: string) => {
        if (!perfil) return false
        const p = perfil.trim().toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        return p !== 'cliente' && p !== 'parceiro' && p !== 'usuario' && !p.includes('consulta')
      }

      const funcionariosMantran = allUsers.filter(u => isFuncionarioMantran(u.perfil) && u.ativo !== false)
      const funcionariosIds = new Set(funcionariosMantran.map(f => f.id))
      const funcionariosNomes = new Set(funcionariosMantran.map(f => f.nome.toLowerCase()))

      const isRecordDeFuncionario = (item: { usuario_id?: string; usuario_nome?: string; tecnico_id?: string; tecnico_nome?: string }) => {
        const uid = item.usuario_id || item.tecnico_id
        const unome = (item.usuario_nome || item.tecnico_nome || '').toLowerCase()
        if (uid && funcionariosIds.has(uid)) return true
        if (unome && funcionariosNomes.has(unome)) return true
        return false
      }

      // Sincroniza foto e data de nascimento do usuário atual se encontrada no banco
      const currentUserInDb = allUsers.find(u => 
        (user?.id && u.id === user.id) || 
        (user?.login && u.login?.toLowerCase() === user.login.toLowerCase()) ||
        (user?.nome && u.nome?.toLowerCase() === user.nome.toLowerCase())
      )
      if (currentUserInDb?.foto_url) {
        setMinhaFoto(currentUserInDb.foto_url)
        updateLoggedUserFoto(currentUserInDb.foto_url)
      }
      if (currentUserInDb?.data_nascimento) {
        updateLoggedUserDataNascimento(currentUserInDb.data_nascimento)
      }

      setUsuarios(funcionariosMantran)
      setTodasFeriasEquipe((todasFerias || []).filter(isRecordDeFuncionario))
      setTodasDayOffEquipe((dayOffs || []).filter(isRecordDeFuncionario))
      setTodasFaltasEquipe((faltas || []).filter(isRecordDeFuncionario))
      setTodasEscalasEquipe((escalas || []).filter(isRecordDeFuncionario))
      setTodosPlantoesEquipe(plantoes || [])
      setTodosPontosEquipe((pontos || []).filter(isRecordDeFuncionario))
      setTodasJornadasEquipe((jornadas || []).filter(isRecordDeFuncionario))
    } catch (err) {
      console.error('Erro ao carregar dados do portal de RH:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper de cálculo do Day Off (Janela de 30 dias dentro do prazo do mês de aniversário)
  const getCalculoDayOff = (dataNascStr?: string | null, anoVig: number = new Date().getFullYear()) => {
    if (!dataNascStr) return null
    const partes = dataNascStr.split('-')
    if (partes.length < 3) return null

    const mesNasc = parseInt(partes[1], 10) // 1 a 12
    const diaNasc = parseInt(partes[2], 10) // 1 a 31
    if (isNaN(mesNasc) || isNaN(diaNasc) || mesNasc < 1 || mesNasc > 12) return null

    const anoStr = String(anoVig)
    const mesStr = String(mesNasc).padStart(2, '0')
    const diaStr = String(diaNasc).padStart(2, '0')
    const dataAniversarioAno = `${anoStr}-${mesStr}-${diaStr}`

    // Início da janela: 1º dia do mês de aniversário
    const janelaInicio = `${anoStr}-${mesStr}-01`

    // Fim da janela: 30 dias a contar do aniversário (ou final do mês estendido)
    const dtAniv = new Date(`${anoStr}-${mesStr}-${diaStr}T00:00:00`)
    const dtJanelaFim = new Date(dtAniv.getTime() + 30 * 24 * 60 * 60 * 1000)
    const janelaFim = dtJanelaFim.toISOString().split('T')[0]

    const nomesMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    const mesNome = nomesMeses[mesNasc - 1]

    return {
      dataNascimentoOriginal: dataNascStr,
      diaNasc,
      mesNasc,
      mesNome,
      dataAniversarioAno,
      janelaInicio,
      janelaFim,
      anoVigencia: anoVig
    }
  }

  // Filtragem dos dados do próprio usuário logado
  const meuUsuarioDb = useMemo(() => {
    return usuarios.find(u => 
      u.id === user?.id || 
      (user?.login && u.login?.toLowerCase() === user.login.toLowerCase()) ||
      (user?.nome && u.nome?.toLowerCase() === user.nome.toLowerCase())
    )
  }, [usuarios, user])

  const minhaDataNascimento = meuUsuarioDb?.data_nascimento || user?.data_nascimento || null

  const meusDayOff = useMemo(() => {
    return todasDayOffEquipe.filter(d =>
      d.usuario_id === user?.id ||
      (user?.nome && d.usuario_nome?.toLowerCase() === user?.nome?.toLowerCase())
    )
  }, [todasDayOffEquipe, user])

  const meuDayOffAnoAtual = useMemo(() => {
    return meusDayOff.find(d => d.ano_vigencia === anoVigencia)
  }, [meusDayOff, anoVigencia])

  const meuCalculoDayOff = useMemo(() => {
    return getCalculoDayOff(minhaDataNascimento, anoVigencia)
  }, [minhaDataNascimento, anoVigencia])

  // Lista de aniversariantes da equipe
  const aniversariantesEquipe = useMemo(() => {
    const mesAtual = new Date().getMonth() + 1
    return usuarios
      .filter(u => u.data_nascimento)
      .map(u => {
        const calc = getCalculoDayOff(u.data_nascimento, new Date().getFullYear())
        const dayOff = todasDayOffEquipe.find(d => 
          (d.usuario_id === u.id || d.usuario_nome.toLowerCase() === u.nome.toLowerCase()) && 
          d.ano_vigencia === new Date().getFullYear()
        )
        return {
          usuario: u,
          calc,
          dayOff,
          isMesAtual: calc?.mesNasc === mesAtual
        }
      })
      .filter(item => item.calc !== null)
      .sort((a, b) => {
        if (a.calc!.mesNasc !== b.calc!.mesNasc) return a.calc!.mesNasc - b.calc!.mesNasc
        return a.calc!.diaNasc - b.calc!.diaNasc
      })
  }, [usuarios, todasDayOffEquipe])

  const minhasFerias = useMemo(() => {
    return todasFeriasEquipe.filter(f => 
      f.usuario_id === user?.id || 
      (user?.nome && f.usuario_nome?.toLowerCase() === user?.nome?.toLowerCase())
    )
  }, [todasFeriasEquipe, user])

  // Ordenação de férias cronológica por data de início
  const feriasEquipeOrdenadas = useMemo(() => {
    return [...todasFeriasEquipe].sort((a, b) => {
      const dataA = a.quinzena_1_inicio || a.quinzena_2_inicio || ''
      const dataB = b.quinzena_1_inicio || b.quinzena_2_inicio || ''
      return dataA.localeCompare(dataB)
    })
  }, [todasFeriasEquipe])

  const minhasFeriasOrdenadas = useMemo(() => {
    return [...minhasFerias].sort((a, b) => {
      const dataA = a.quinzena_1_inicio || a.quinzena_2_inicio || ''
      const dataB = b.quinzena_1_inicio || b.quinzena_2_inicio || ''
      return dataA.localeCompare(dataB)
    })
  }, [minhasFerias])

  const minhasFaltas = useMemo(() => {
    return todasFaltasEquipe.filter(f => 
      f.usuario_id === user?.id || 
      (user?.nome && f.usuario_nome?.toLowerCase() === user?.nome?.toLowerCase())
    )
  }, [todasFaltasEquipe, user])

  const meuHomeOffice = useMemo(() => {
    return todasEscalasEquipe.find(h => 
      h.usuario_id === user?.id || 
      (user?.nome && h.usuario_nome?.toLowerCase() === user?.nome?.toLowerCase())
    )
  }, [todasEscalasEquipe, user])

  const minhaJornada = useMemo(() => {
    return todasJornadasEquipe.find(j =>
      j.usuario_id === user?.id ||
      (user?.nome && j.usuario_nome?.toLowerCase() === user?.nome?.toLowerCase())
    )
  }, [todasJornadasEquipe, user])

  // Banco de horas acumulado do próprio colaborador
  const meuBancoHoras = useMemo(() => {
    const meusPontos = todosPontosEquipe.filter(p =>
      p.usuario_id === user?.id ||
      (user?.nome && p.usuario_nome?.toLowerCase() === user?.nome?.toLowerCase())
    )
    return calcularBancoHoras(meusPontos, minhaJornada || null)
  }, [todosPontosEquipe, minhaJornada, user])

  const meusPlantoes = useMemo(() => {
    return todosPlantoesEquipe.filter(p => 
      p.tecnico_id === user?.id || 
      (user?.nome && p.tecnico_nome?.toLowerCase() === user?.nome?.toLowerCase())
    )
  }, [todosPlantoesEquipe, user])

  // Apenas colaboradores com perfil de Técnico para o Plantão
  const usuariosTecnicos = useMemo(() => {
    return usuarios.filter(u => {
      const p = (u.perfil || '').trim().toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      return p === 'tecnico' || p === 'tecnica'
    })
  }, [usuarios])

  // Data atual
  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]
  const diaSemanaHojeIndex = hoje.getDay()

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

  // Próximo plantão de fim de semana
  const proximoPlantao = useMemo(() => {
    // Procura o plantão que está ativo hoje ou no próximo sábado/domingo
    const ativos = todosPlantoesEquipe.filter(p => p.data_fim >= hojeStr)
    ativos.sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
    return ativos[0] || null
  }, [todosPlantoesEquipe, hojeStr])

  // Indicadores Executivos para Gestão/Admin
  const kpis = useMemo(() => {
    const emFeriasHoje = todasFeriasEquipe.filter(f => {
      if (f.status === 'Reprovado') return false
      const q1Ativa = f.quinzena_1_inicio && f.quinzena_1_fim && (hojeStr >= f.quinzena_1_inicio && hojeStr <= f.quinzena_1_fim)
      const q2Ativa = f.quinzena_2_inicio && f.quinzena_2_fim && (hojeStr >= f.quinzena_2_inicio && hojeStr <= f.quinzena_2_fim)
      return q1Ativa || q2Ativa
    })

    const emDayOffHoje = todasDayOffEquipe.filter(d => {
      if (d.status !== 'Aprovado') return false
      return d.data_solicitada === hojeStr
    })

    const emAtestadoHoje = todasFaltasEquipe.filter(fa => {
      if (fa.status === 'Recusado') return false
      const dataFim = fa.data_falta_fim || fa.data_falta_inicio
      return hojeStr >= fa.data_falta_inicio && hojeStr <= dataFim
    })

    const emHomeOfficeHoje = todasEscalasEquipe.filter(ho => {
      if (ho.modalidade === '100% Remoto') return true
      if (ho.modalidade === '100% Presencial') return false
      if (diaAtualProp && ho[diaAtualProp]) return true
      return false
    })

    const plantoesPendentesPagamento = todosPlantoesEquipe.filter(p => p.status_pagamento === 'Pendente')
    const totalValorPendente = plantoesPendentesPagamento.reduce((acc, p) => acc + (Number(p.valor_plantao) || 0), 0)

    const feriasPendentes = todasFeriasEquipe.filter(f => f.status === 'Pendente')
    const dayOffPendentes = todasDayOffEquipe.filter(d => d.status === 'Pendente')
    const faltasPendentes = todasFaltasEquipe.filter(f => f.status === 'Pendente' || f.status === 'Em Análise')

    // Próxima férias a começar (data de início futura mais próxima)
    const candidatasFerias: { nome: string; inicio: string }[] = []
    todasFeriasEquipe.forEach(f => {
      if (f.status === 'Reprovado') return
      if (f.quinzena_1_inicio && f.quinzena_1_inicio > hojeStr) {
        candidatasFerias.push({ nome: f.usuario_nome, inicio: f.quinzena_1_inicio })
      }
      if (f.quinzena_2_inicio && f.quinzena_2_inicio > hojeStr) {
        candidatasFerias.push({ nome: f.usuario_nome, inicio: f.quinzena_2_inicio })
      }
    })
    candidatasFerias.sort((a, b) => a.inicio.localeCompare(b.inicio))
    const proximaFeria = candidatasFerias[0] || null

    return {
      totalColaboradores: usuarios.length || 8,
      emFeriasHoje,
      emDayOffHoje,
      emAtestadoHoje,
      emHomeOfficeHoje,
      proximoPlantao,
      proximaFeria,
      plantoesPendentesPagamento,
      totalValorPendente,
      feriasPendentes,
      dayOffPendentes,
      faltasPendentes
    }
  }, [todasFeriasEquipe, todasDayOffEquipe, todasFaltasEquipe, todasEscalasEquipe, todosPlantoesEquipe, usuarios, hojeStr, diaAtualProp, proximoPlantao])

  // Verificação estrita de conflito de férias entre colaboradores
  const checkConflitoPeriodo = (inicio: string, fim: string, quinzenaNum: 1 | 2, currentUserId?: string, currentUserName?: string) => {
    if (!inicio || !fim) return null

    const targetId = currentUserId || user?.id
    const targetNome = (currentUserName || user?.nome || '').toLowerCase()

    for (const f of todasFeriasEquipe) {
      if (f.status === 'Reprovado') continue
      if (editingFeriasId && f.id === editingFeriasId) continue
      if (f.usuario_id === targetId || (targetNome && f.usuario_nome?.toLowerCase() === targetNome)) continue

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

  const handleQ1InicioChange = (dataStr: string) => {
    setQ1Inicio(dataStr)
    if (dataStr) {
      const d = new Date(dataStr + 'T00:00:00')
      d.setDate(d.getDate() + 14)
      setQ1Fim(d.toISOString().split('T')[0])
    }
  }

  const handleQ2InicioChange = (dataStr: string) => {
    setQ2Inicio(dataStr)
    if (dataStr) {
      const d = new Date(dataStr + 'T00:00:00')
      d.setDate(d.getDate() + 14)
      setQ2Fim(d.toISOString().split('T')[0])
    }
  }

  const handleFaltaInicioChange = (dataStr: string) => {
    setFaltaInicio(dataStr)
    if (!faltaFim || faltaFim < dataStr) {
      setFaltaFim(dataStr)
    }
  }

  // Preenchimento de data do plantão (auto-calcula domingo quando seleciona sábado)
  const handlePlantaoDataInicioChange = (dataStr: string) => {
    setPlantaoDataInicio(dataStr)
    if (dataStr) {
      const d = new Date(dataStr + 'T00:00:00')
      // Se for sábado, dia seguinte é domingo
      d.setDate(d.getDate() + 1)
      setPlantaoDataFim(d.toISOString().split('T')[0])
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

  const handleAbrirModalFerias = (colaboradorPre?: { id: string; nome: string }, feriasExistente?: SolicitacaoFerias) => {
    if (feriasExistente) {
      setEditingFeriasId(feriasExistente.id)
      setFeriasUsuarioId(feriasExistente.usuario_id)
      setFeriasUsuarioNome(feriasExistente.usuario_nome)
      setAnoVigencia(feriasExistente.ano_vigencia || new Date().getFullYear())
      setQ1Inicio(feriasExistente.quinzena_1_inicio || '')
      setQ1Fim(feriasExistente.quinzena_1_fim || '')
      setQ2Inicio(feriasExistente.quinzena_2_inicio || '')
      setQ2Fim(feriasExistente.quinzena_2_fim || '')
      setFeriasObs(feriasExistente.observacoes || '')
    } else {
      setEditingFeriasId(null)
      setFeriasUsuarioId(colaboradorPre?.id || user?.id || (usuarios[0]?.id || ''))
      setFeriasUsuarioNome(colaboradorPre?.nome || user?.nome || user?.login || (usuarios[0]?.nome || 'Colaborador'))
      setQ1Inicio('')
      setQ1Fim('')
      setQ2Inicio('')
      setQ2Fim('')
      setFeriasObs('')
    }
    setIsFeriasModalOpen(true)
  }

  const handleSalvarFerias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!q1Inicio || !q1Fim) {
      alert('Por favor, selecione as datas da 1ª Quinzena.')
      return
    }

    const targetUserId = feriasUsuarioId || user?.id || 'temp'
    const targetUserNome = feriasUsuarioNome || user?.nome || user?.login || 'Colaborador'

    const conflitoQ1 = checkConflitoPeriodo(q1Inicio, q1Fim, 1, targetUserId, targetUserNome)
    if (conflitoQ1) {
      alert(`⚠️ Bloqueio de Férias: O funcionário "${conflitoQ1.funcionarioNome}" já possui férias agendadas neste período (${formatDateDisplay(conflitoQ1.periodoInicio)} até ${formatDateDisplay(conflitoQ1.periodoFim)}).\n\nNão é permitido que dois funcionários retirem férias simultâneas.`)
      return
    }

    if (q2Inicio && q2Fim) {
      const conflitoQ2 = checkConflitoPeriodo(q2Inicio, q2Fim, 2, targetUserId, targetUserNome)
      if (conflitoQ2) {
        alert(`⚠️ Bloqueio de Férias na 2ª Quinzena: O funcionário "${conflitoQ2.funcionarioNome}" já possui férias agendadas neste período (${formatDateDisplay(conflitoQ2.periodoInicio)} até ${formatDateDisplay(conflitoQ2.periodoFim)}).`)
        return
      }

      if (q1Inicio <= q2Fim && q1Fim >= q2Inicio) {
        alert('A 2ª Quinzena não pode sobrepor a 1ª Quinzena.')
        return
      }
    }

    setSalvandoFerias(true)
    try {
      if (editingFeriasId) {
        await api.updateSolicitacaoFerias(editingFeriasId, {
          usuario_id: targetUserId,
          usuario_nome: targetUserNome,
          ano_vigencia: anoVigencia,
          quinzena_1_inicio: q1Inicio,
          quinzena_1_fim: q1Fim,
          quinzena_1_dias: 15,
          quinzena_2_inicio: q2Inicio || null,
          quinzena_2_fim: q2Fim || null,
          quinzena_2_dias: q2Inicio ? 15 : null,
          observacoes: feriasObs.trim() || null
        })
        alert('Datas de férias atualizadas com sucesso!')
      } else {
        await api.insertSolicitacaoFerias({
          usuario_id: targetUserId,
          usuario_nome: targetUserNome,
          ano_vigencia: anoVigencia,
          quinzena_1_inicio: q1Inicio,
          quinzena_1_fim: q1Fim,
          quinzena_1_dias: 15,
          quinzena_2_inicio: q2Inicio || null,
          quinzena_2_fim: q2Fim || null,
          quinzena_2_dias: q2Inicio ? 15 : null,
          observacoes: feriasObs.trim() || null
        })

        // Disparar Notificação para os Administradores / RH
        await api.createNotificacao({
          titulo: `🌴 Solicitação de Férias: ${targetUserNome}`,
          mensagem: `${targetUserNome} solicitou período de férias para o exercício ${anoVigencia} (1ª Quinzena: ${formatDateDisplay(q1Inicio)} a ${formatDateDisplay(q1Fim)}${q2Inicio ? `, 2ª Quinzena: ${formatDateDisplay(q2Inicio)} a ${formatDateDisplay(q2Fim)}` : ''}).`,
          tipo: 'rh_ferias',
          dados_extras: {
            onlyAdmin: true,
            usuario_id: targetUserId,
            usuario_nome: targetUserNome,
            modulo: 'rh'
          }
        }).catch(err => console.warn('Erro ao disparar notificação de férias:', err))

        alert('Solicitação de férias registrada com sucesso!')
      }

      setIsFeriasModalOpen(false)
      setEditingFeriasId(null)
      setQ1Inicio('')
      setQ1Fim('')
      setQ2Inicio('')
      setQ2Fim('')
      setFeriasObs('')
      await fetchData()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar férias: ' + err.message)
    } finally {
      setSalvandoFerias(false)
    }
  }

  const handleExcluirFerias = async (id: string, nomeColaborador: string) => {
    if (!window.confirm(`Deseja realmente remover o registro de férias de "${nomeColaborador}"?`)) {
      return
    }
    try {
      await api.deleteSolicitacaoFerias(id)
      await fetchData()
      alert('Registro de férias removido com sucesso!')
    } catch (err: any) {
      alert('Erro ao excluir férias: ' + err.message)
    }
  }

  // ===== Handlers de Day Off (Folga de Aniversário) =====
  const handleAbrirModalDayOff = (colaboradorPre?: { id: string; nome: string; data_nascimento?: string | null }, dayOffExistente?: SolicitacaoDayOff) => {
    if (dayOffExistente) {
      setEditingDayOffId(dayOffExistente.id)
      setDayOffUsuarioId(dayOffExistente.usuario_id)
      setDayOffUsuarioNome(dayOffExistente.usuario_nome)
      setAnoVigencia(dayOffExistente.ano_vigencia || new Date().getFullYear())
      setDayOffDataNascimento(dayOffExistente.data_nascimento || '')
      setDayOffDataSolicitada(dayOffExistente.data_solicitada || '')
      setDayOffObs(dayOffExistente.observacoes || '')
    } else {
      const targetId = colaboradorPre?.id || user?.id || (usuarios[0]?.id || '')
      const targetNome = colaboradorPre?.nome || user?.nome || user?.login || (usuarios[0]?.nome || 'Colaborador')
      const targetUser = usuarios.find(u => u.id === targetId || u.nome.toLowerCase() === targetNome.toLowerCase())
      const dataNasc = colaboradorPre?.data_nascimento || targetUser?.data_nascimento || (targetId === user?.id ? (minhaDataNascimento || '') : '') || ''

      setEditingDayOffId(null)
      setDayOffUsuarioId(targetId)
      setDayOffUsuarioNome(targetNome)
      setDayOffDataNascimento(dataNasc)
      setDayOffDataSolicitada('')
      setDayOffObs('')
    }
    setIsDayOffModalOpen(true)
  }

  const handleSalvarDataNascimentoUsuario = async (userId: string, dataNasc: string) => {
    if (!dataNasc) {
      alert('Por favor, informe a Data de Nascimento.')
      return
    }
    setSalvandoDataNascModal(true)
    try {
      await api.updateUsuarioSistema(userId, { data_nascimento: dataNasc })
      if (userId === user?.id) {
        updateLoggedUserDataNascimento(dataNasc)
      }
      setDayOffDataNascimento(dataNasc)
      await fetchData()
      alert('Data de nascimento salva com sucesso! Agora você já pode selecionar o dia do seu Day Off.')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar data de nascimento: ' + err.message)
    } finally {
      setSalvandoDataNascModal(false)
    }
  }

  const handleSalvarDayOff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dayOffDataNascimento) {
      alert('Por favor, informe e salve a sua Data de Nascimento primeiro.')
      return
    }
    if (!dayOffDataSolicitada) {
      alert('Por favor, selecione a data em que deseja usufruir do seu Day Off.')
      return
    }

    const calc = getCalculoDayOff(dayOffDataNascimento, anoVigencia)
    if (!calc) {
      alert('Data de nascimento inválida.')
      return
    }

    // Alerta caso a data esteja fora da janela de 30 dias do aniversário
    if (dayOffDataSolicitada < calc.janelaInicio || dayOffDataSolicitada > calc.janelaFim) {
      const resp = window.confirm(
        `Atenção: A data solicitada (${formatDateDisplay(dayOffDataSolicitada)}) está fora da janela recomendada de 30 dias do seu aniversário (${formatDateDisplay(calc.janelaInicio)} a ${formatDateDisplay(calc.janelaFim)}).\n\nDeseja enviar a solicitação mesmo assim para avaliação excepcional do RH?`
      )
      if (!resp) return
    }

    setSalvandoDayOff(true)
    try {
      const targetUserId = dayOffUsuarioId || user?.id || 'temp'
      const targetUserNome = dayOffUsuarioNome || user?.nome || user?.login || 'Colaborador'

      if (editingDayOffId) {
        await api.updateDayOff(editingDayOffId, {
          data_nascimento: dayOffDataNascimento,
          data_solicitada: dayOffDataSolicitada,
          ano_vigencia: anoVigencia,
          observacoes: dayOffObs.trim() || null
        })
        alert('Solicitação de Day Off atualizada com sucesso!')
      } else {
        await api.insertDayOff({
          usuario_id: targetUserId,
          usuario_nome: targetUserNome,
          ano_vigencia: anoVigencia,
          data_nascimento: dayOffDataNascimento,
          data_solicitada: dayOffDataSolicitada,
          status: 'Pendente',
          observacoes: dayOffObs.trim() || null
        })

        // Disparar Notificação para os Administradores / RH
        await api.createNotificacao({
          titulo: `🎂 Solicitação de Day Off: ${targetUserNome}`,
          mensagem: `${targetUserNome} solicitou Day Off (folga de aniversário) para o dia ${formatDateDisplay(dayOffDataSolicitada)} (Aniversário: ${formatDateDisplay(calc.dataAniversarioAno)}).`,
          tipo: 'rh_ferias',
          dados_extras: {
            onlyAdmin: true,
            usuario_id: targetUserId,
            usuario_nome: targetUserNome,
            modulo: 'rh'
          }
        }).catch(err => console.warn('Erro ao disparar notificação de Day Off:', err))

        alert('Solicitação de Day Off enviada com sucesso ao RH!')
      }

      setIsDayOffModalOpen(false)
      setEditingDayOffId(null)
      setDayOffDataSolicitada('')
      setDayOffObs('')
      await fetchData()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar Day Off: ' + err.message)
    } finally {
      setSalvandoDayOff(false)
    }
  }

  const handleExcluirDayOff = async (id: string, nomeColaborador: string) => {
    if (!window.confirm(`Deseja realmente remover/cancelar a solicitação de Day Off de "${nomeColaborador}"?`)) {
      return
    }
    try {
      await api.deleteDayOff(id)
      await fetchData()
      alert('Solicitação de Day Off removida com sucesso!')
    } catch (err: any) {
      alert('Erro ao excluir Day Off: ' + err.message)
    }
  }

  const handleAbrirModalFalta = (colaboradorPre?: { id: string; nome: string }) => {
    setEditingFaltaId(null)
    setFaltaUsuarioId(colaboradorPre?.id || user?.id || (usuarios[0]?.id || ''))
    setFaltaUsuarioNome(colaboradorPre?.nome || user?.nome || user?.login || (usuarios[0]?.nome || 'Colaborador'))
    setFaltaInicio('')
    setFaltaFim('')
    setMotivoFalta('Doença / Atestado Médico')
    setDescricaoFalta('')
    setArquivoNome('')
    setArquivoUrl('')
    setArquivoTipo('')
    setIsFaltaModalOpen(true)
  }

  const handleAbrirEdicaoFalta = (item: FaltaAtestado) => {
    setEditingFaltaId(item.id)
    setFaltaUsuarioId(item.usuario_id)
    setFaltaUsuarioNome(item.usuario_nome)
    setFaltaInicio(item.data_falta_inicio || '')
    setFaltaFim(item.data_falta_fim || item.data_falta_inicio || '')
    setMotivoFalta(item.motivo || 'Doença / Atestado Médico')
    setDescricaoFalta(item.descricao || '')
    setArquivoNome(item.arquivo_atestado_nome || '')
    setArquivoUrl(item.arquivo_atestado_url || '')
    setArquivoTipo(item.arquivo_atestado_tipo || '')
    setIsFaltaModalOpen(true)
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
      if (editingFaltaId) {
        // Edição de falta existente (ex: correção de datas)
        await api.updateFaltaAtestado(editingFaltaId, {
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
        setEditingFaltaId(null)
        await fetchData()
        alert('Falta / Atestado atualizado com sucesso!')
        return
      }

      await api.insertFaltaAtestado({
        usuario_id: faltaUsuarioId || user?.id || 'temp',
        usuario_nome: faltaUsuarioNome || user?.nome || user?.login || 'Colaborador',
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

      // Disparar Notificação para os Administradores / RH
      const targetUserNome = faltaUsuarioNome || user?.nome || user?.login || 'Colaborador'
      await api.createNotificacao({
        titulo: `🩺 Comunicado de Falta / Atestado: ${targetUserNome}`,
        mensagem: `${targetUserNome} comunicou ausência por "${motivoFalta}" de ${formatDateDisplay(faltaInicio)}${faltaFim && faltaFim !== faltaInicio ? ` a ${formatDateDisplay(faltaFim)}` : ''} (${dias} dia${dias > 1 ? 's' : ''})${arquivoUrl ? ' com comprovante/atestado em anexo' : ''}.`,
        tipo: 'rh_falta',
        dados_extras: {
          onlyAdmin: true,
          usuario_id: faltaUsuarioId,
          usuario_nome: targetUserNome,
          modulo: 'rh'
        }
      }).catch(err => console.warn('Erro ao disparar notificação de falta:', err))

      setIsFaltaModalOpen(false)
      setFaltaInicio('')
      setFaltaFim('')
      setDescricaoFalta('')
      setArquivoNome('')
      setArquivoUrl('')
      setArquivoTipo('')
      await fetchData()
      alert('Falta / Atestado comunicado com sucesso ao RH!')
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
    const escalaExistente = todasEscalasEquipe.find(h => h.usuario_id === targetId || h.usuario_nome.toLowerCase() === targetNome.toLowerCase())

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
      alert('Escala de Home Office atualizada com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar escala: ' + err.message)
    } finally {
      setSalvandoHomeOffice(false)
    }
  }

  const handleAbrirModalPlantao = (tecnicoPre?: { id: string; nome: string }) => {
    const isUserTecnico = (user?.perfil || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'tecnico'
    const defaultTecnico = tecnicoPre?.id 
      ? tecnicoPre 
      : (isUserTecnico ? user : (usuariosTecnicos[0] || null))

    setPlantaoTecnicoId(defaultTecnico?.id || '')
    setPlantaoTecnicoNome(defaultTecnico?.nome || (defaultTecnico as any)?.login || '')
    setPlantaoDataInicio('')
    setPlantaoDataFim('')
    setPlantaoValor('')
    setPlantaoObs('')
    setIsPlantaoModalOpen(true)
  }

  const handleSalvarPlantao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plantaoDataInicio || !plantaoDataFim) {
      alert('Por favor, informe a data de início e fim do plantão de final de semana.')
      return
    }

    setSalvandoPlantao(true)
    try {
      const tecnicoNomeFinal = plantaoTecnicoNome || user?.nome || 'Técnico'
      await api.insertPlantao({
        tecnico_id: plantaoTecnicoId || user?.id || 'temp',
        tecnico_nome: tecnicoNomeFinal,
        data_inicio: plantaoDataInicio,
        data_fim: plantaoDataFim,
        status_pagamento: 'Pendente',
        valor_plantao: plantaoValor !== '' ? Number(plantaoValor) : null,
        observacoes: plantaoObs.trim() || null,
        registrado_por: user?.nome || user?.login || 'Colaborador'
      })

      // Disparar Notificação para os Administradores / RH
      await api.createNotificacao({
        titulo: `📞 Plantão de Final de Semana: ${tecnicoNomeFinal}`,
        mensagem: `${tecnicoNomeFinal} registrou plantão no final de semana (${formatDateDisplay(plantaoDataInicio)} a ${formatDateDisplay(plantaoDataFim)}). Aguardando lançamento/pagamento do RH.`,
        tipo: 'rh_plantao',
        dados_extras: {
          onlyAdmin: true,
          usuario_id: plantaoTecnicoId,
          usuario_nome: tecnicoNomeFinal,
          modulo: 'rh'
        }
      }).catch(err => console.warn('Erro ao disparar notificação de plantão:', err))

      setIsPlantaoModalOpen(false)
      setPlantaoDataInicio('')
      setPlantaoDataFim('')
      setPlantaoObs('')
      await fetchData()
      alert('Plantão de Final de Semana registrado com sucesso! O RH foi notificado para inclusão na folha de pagamento.')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao registrar plantão: ' + err.message)
    } finally {
      setSalvandoPlantao(false)
    }
  }

  const handleSalvarPagamentoPlantao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plantaoPagamentoItem) return

    setSalvandoPagamentoPlantao(true)
    try {
      await api.updateStatusPagamentoPlantao(
        plantaoPagamentoItem.id,
        pagamentoStatus,
        pagamentoValor !== '' ? Number(pagamentoValor) : null,
        pagamentoObs.trim() || undefined
      )

      setPlantaoPagamentoItem(null)
      await fetchData()
      alert('Status de pagamento do plantão atualizado com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao atualizar pagamento: ' + err.message)
    } finally {
      setSalvandoPagamentoPlantao(false)
    }
  }

  const handleSalvarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemAvaliacao) return

    setSalvandoAvaliacao(true)
    try {
      const aprovador = user?.nome || user?.login || 'Gestor RH'

      if (itemAvaliacao.type === 'dayoff') {
        await api.updateStatusDayOff(
          itemAvaliacao.item.id,
          statusAvaliacao as any,
          respostaRh.trim(),
          aprovador
        )
      } else if (itemAvaliacao.type === 'ferias') {
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
      alert('Avaliação de RH confirmada com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar avaliação: ' + err.message)
    } finally {
      setSalvandoAvaliacao(false)
    }
  }

  // ===== Foto / Avatar do usuário =====
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reenviar o mesmo arquivo
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem (JPG, PNG, etc).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. Tamanho máximo: 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setSalvandoFoto(true)
      try {
        if (user?.id) {
          await api.updateFotoUsuario(user.id, dataUrl)
          updateLoggedUserFoto(dataUrl)
        }
        setMinhaFoto(dataUrl)
      } catch (err: any) {
        console.error('Erro ao salvar foto:', err)
        alert('Não foi possível salvar a foto. Tente novamente.')
      } finally {
        setSalvandoFoto(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // ===== Jornada de Trabalho (Gestão RH) =====
  const handleAbrirEdicaoJornada = (colaborador: { id: string; nome: string }) => {
    const existente = todasJornadasEquipe.find(j => j.usuario_id === colaborador.id)
    if (existente) {
      setEditingJornada({
        usuario_id: colaborador.id,
        usuario_nome: colaborador.nome,
        segunda: existente.segunda,
        terca: existente.terca,
        quarta: existente.quarta,
        quinta: existente.quinta,
        sexta: existente.sexta,
        sabado: existente.sabado,
        domingo: existente.domingo,
        hora_entrada: (existente.hora_entrada || '08:00').slice(0, 5),
        hora_saida: (existente.hora_saida || '17:00').slice(0, 5),
        almoco_inicio: (existente.almoco_inicio || '12:00').slice(0, 5),
        almoco_fim: (existente.almoco_fim || '13:00').slice(0, 5),
        observacoes: existente.observacoes || ''
      })
    } else {
      setEditingJornada({
        usuario_id: colaborador.id,
        usuario_nome: colaborador.nome,
        segunda: true,
        terca: true,
        quarta: true,
        quinta: true,
        sexta: true,
        sabado: false,
        domingo: false,
        hora_entrada: '08:00',
        hora_saida: '17:00',
        almoco_inicio: '12:00',
        almoco_fim: '13:00',
        observacoes: ''
      })
    }
  }

  const handleSalvarJornada = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingJornada) return

    if (editingJornada.hora_saida <= editingJornada.hora_entrada) {
      alert('O horário de saída deve ser maior que o horário de entrada.')
      return
    }

    setSalvandoJornada(true)
    try {
      await api.upsertJornada({
        usuario_id: editingJornada.usuario_id,
        usuario_nome: editingJornada.usuario_nome,
        segunda: editingJornada.segunda,
        terca: editingJornada.terca,
        quarta: editingJornada.quarta,
        quinta: editingJornada.quinta,
        sexta: editingJornada.sexta,
        sabado: editingJornada.sabado,
        domingo: editingJornada.domingo,
        hora_entrada: editingJornada.hora_entrada,
        hora_saida: editingJornada.hora_saida,
        almoco_inicio: editingJornada.almoco_inicio || null,
        almoco_fim: editingJornada.almoco_fim || null,
        observacoes: editingJornada.observacoes.trim() || null
      })
      setEditingJornada(null)
      await fetchData()
      alert('Jornada de trabalho salva com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar jornada: ' + err.message)
    } finally {
      setSalvandoJornada(false)
    }
  }

  const handleIniciarEdicaoFuncionario = () => {
    if (!funcionarioResumo) return
    setEditFuncDataNasc(funcionarioResumo.data_nascimento || '')
    setEditFuncEmailCorp(funcionarioResumo.email_corporativo || '')
    setEditFuncEmailPessoal(funcionarioResumo.email_pessoal || '')
    setIsEditandoFuncionario(true)
  }

  const handleSalvarDadosFuncionario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!funcionarioResumo) return

    setSalvandoFuncionarioDados(true)
    try {
      const updated = await api.updateUsuarioSistema(funcionarioResumo.id, {
        data_nascimento: editFuncDataNasc || null,
        email_corporativo: editFuncEmailCorp.trim() || null,
        email_pessoal: editFuncEmailPessoal.trim() || null
      })

      // Se for o próprio usuário logado, atualiza o storage da sessão
      if (user && user.id === funcionarioResumo.id) {
        updateLoggedUserDataNascimento(editFuncDataNasc || null)
        updateLoggedUserEmails(editFuncEmailCorp.trim() || null, editFuncEmailPessoal.trim() || null)
      }

      setUsuarios(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
      setFuncionarioResumo(prev => prev ? { ...prev, ...updated } : updated)
      setIsEditandoFuncionario(false)
      alert('Dados cadastrais do funcionário atualizados com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar dados do funcionário: ' + err.message)
    } finally {
      setSalvandoFuncionarioDados(false)
    }
  }

  // ===== Controle de Ponto (Gestão RH) =====
  const PONTO_LABELS: Record<TipoPonto, string> = {
    inicio_expediente: 'Entrada',
    pausa_almoco: 'Saída Almoço',
    retorno_almoco: 'Retorno Almoço',
    fim_expediente: 'Saída'
  }

  const formatHoraPonto = (iso?: string | null) => {
    if (!iso) return '--:--'
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '--:--'
    }
  }

  const formatDuracaoPonto = (ms: number) => {
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
  }

  // Registros de ponto do dia selecionado, agrupados por colaborador
  const pontosPorColaborador = useMemo(() => {
    const doDia = todosPontosEquipe.filter(p => p.data === pontoDataSelecionada)

    // Base: todos os funcionários (mesmo sem registro) para dar visibilidade das ausências
    const mapa = new Map<string, {
      usuario_id: string
      usuario_nome: string
      foto_url?: string | null
      registros: Partial<Record<TipoPonto, RegistroPonto>>
    }>()

    // Inicializa com a lista de funcionários conhecidos
    usuarios.forEach(u => {
      mapa.set(u.id, { usuario_id: u.id, usuario_nome: u.nome, foto_url: u.foto_url, registros: {} })
    })

    doDia.forEach(reg => {
      let entry = mapa.get(reg.usuario_id)
      if (!entry) {
        const uInfo = usuarios.find(u => u.id === reg.usuario_id || u.nome.toLowerCase() === reg.usuario_nome.toLowerCase())
        entry = { usuario_id: reg.usuario_id, usuario_nome: reg.usuario_nome, foto_url: uInfo?.foto_url, registros: {} }
        mapa.set(reg.usuario_id, entry)
      }
      entry.registros[reg.tipo] = reg
    })

    const nowMs = Date.now()
    const hojeStrLocal = new Date().toISOString().slice(0, 10)
    const ehHoje = pontoDataSelecionada === hojeStrLocal

    return Array.from(mapa.values())
      .map(entry => {
        const r = entry.registros
        const inicio = r.inicio_expediente?.data_hora
        const fim = r.fim_expediente?.data_hora
        const pausa = r.pausa_almoco?.data_hora
        const retorno = r.retorno_almoco?.data_hora

        let trabalhadoMs = 0
        if (inicio) {
          const tInicio = new Date(inicio).getTime()
          const tFim = fim ? new Date(fim).getTime() : (ehHoje ? nowMs : tInicio)
          trabalhadoMs = tFim - tInicio
          if (pausa) {
            const tPausa = new Date(pausa).getTime()
            const tRetorno = retorno ? new Date(retorno).getTime() : (ehHoje ? nowMs : tPausa)
            trabalhadoMs -= Math.max(0, tRetorno - tPausa)
          }
          trabalhadoMs = Math.max(0, trabalhadoMs)
        }

        const temRegistro = !!(inicio || pausa || retorno || fim)
        const emAndamento = !!inicio && !fim

        return {
          ...entry,
          trabalhadoMs,
          temRegistro,
          emAndamento
        }
      })
      // Colaboradores com registro primeiro; depois por nome
      .sort((a, b) => {
        if (a.temRegistro !== b.temRegistro) return a.temRegistro ? -1 : 1
        return a.usuario_nome.localeCompare(b.usuario_nome)
      })
  }, [todosPontosEquipe, pontoDataSelecionada, usuarios])

  const totalPresentesNoDia = useMemo(
    () => pontosPorColaborador.filter(p => p.temRegistro).length,
    [pontosPorColaborador]
  )

  // Banco de horas acumulado por colaborador (usuario_id -> saldo em minutos)
  const bancoHorasPorColaborador = useMemo(() => {
    const mapa = new Map<string, number>()
    usuarios.forEach(u => {
      const jornadaU = todasJornadasEquipe.find(j => j.usuario_id === u.id) || null
      const pontosU = todosPontosEquipe.filter(p => p.usuario_id === u.id)
      const resumo = calcularBancoHoras(pontosU, jornadaU)
      mapa.set(u.id, resumo.saldoAcumuladoMin)
    })
    return mapa
  }, [usuarios, todasJornadasEquipe, todosPontosEquipe])

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      if (dateStr.includes('T')) {
        const d = new Date(dateStr)
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR')
      }
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return new Date(dateStr).toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const calcularIdade = (dateStr?: string | null): number | null => {
    if (!dateStr) return null
    try {
      const parts = dateStr.split('-').map(Number)
      if (parts.length < 3) return null
      const [ano, mes, dia] = parts
      const hoje = new Date()
      let idade = hoje.getFullYear() - ano
      const m = (hoje.getMonth() + 1) - mes
      if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
        idade--
      }
      return idade >= 0 ? idade : null
    } catch {
      return null
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'Aprovado' || status === 'Abonado / Aprovado' || status === 'Pago') {
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
    <div className="max-w-7xl mx-auto w-full min-w-0 space-y-4 sm:space-y-6">
      
      {/* ================= TOP HEADER BANNER ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/50 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-brand-500/5 to-transparent pointer-events-none" />

        <div className="space-y-1.5 z-10 min-w-0">
          <div className="flex items-center gap-3">
            {/* Avatar com upload de foto (mesmo cabeçalho para todos os perfis) */}
            <label
              title="Alterar minha foto"
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 cursor-pointer group border border-brand-500/30 shadow-lg shadow-brand-500/10"
            >
              {minhaFoto ? (
                <img src={minhaFoto} alt={user?.nome || 'Foto'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-teal-500/20 text-brand-300 flex items-center justify-center text-xl sm:text-2xl font-black uppercase">
                  {(user?.nome || user?.login || 'U').charAt(0)}
                </div>
              )}
              {/* Overlay de edição */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {salvandoFoto ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                disabled={salvandoFoto}
                className="hidden"
              />
            </label>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                {user?.nome || user?.login || 'Colaborador'}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {user?.perfil || 'Colaborador'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 z-10">
          <button
            type="button"
            onClick={() => handleAbrirModalFerias()}
            className="btn-primary py-2 px-2.5 sm:py-2.5 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold shadow-lg shadow-brand-500/20 cursor-pointer"
          >
            <Palmtree className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Solicitar Férias</span>
          </button>

          <button
            type="button"
            onClick={() => handleAbrirModalDayOff()}
            className="py-2 px-2.5 sm:py-2.5 sm:px-4 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 hover:text-pink-200 border border-pink-500/40 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md"
          >
            <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400 shrink-0" />
            <span>Solicitar Day Off</span>
          </button>

          {/* Botão de Plantão para Técnicos e RH */}
          {(isTecnico || isGestorRh) && (
            <button
              type="button"
              onClick={() => handleAbrirModalPlantao()}
              className="py-2 px-2.5 sm:py-2.5 sm:px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md"
            >
              <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span>Informar Plantão</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAbrirEdicaoHomeOffice()}
            className="py-2 px-2.5 sm:py-2.5 sm:px-4 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
            <span>{isGestorRh ? 'Escala Home Office' : 'Meu Home Office'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAbrirModalFalta()}
            className="py-2 px-2.5 sm:py-2.5 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span>Atestado / Falta</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPontoModalOpen(true)}
            className="py-2 px-2.5 sm:py-2.5 sm:px-4 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md"
          >
            <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span>Controle de Ponto</span>
          </button>

          {/* Botão Funcionários (abre lista com resumo por colaborador) */}
          {isGestorRh && (
            <button
              type="button"
              onClick={() => setIsFuncionariosModalOpen(true)}
              className="py-2 px-2.5 sm:py-2.5 sm:px-4 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Users2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
              <span>Funcionários</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= NAVIGATION TABS ================= */}
      {isGestorRh ? (
        /* --- ABAS PARA GESTOR / ADMIN --- */
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto sm:flex-wrap [&>button]:shrink-0 [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-[11px] sm:[&>button]:px-3.5 sm:[&>button]:py-2 sm:[&>button]:text-xs">
          <button
            type="button"
            onClick={() => setTab('dashboard')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'dashboard'
                ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Activity className="w-4 h-4 text-brand-400" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('plantoes_equipe')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'plantoes_equipe'
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <span>Plantões</span>
            {todosPlantoesEquipe.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {todosPlantoesEquipe.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('ferias_equipe')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'ferias_equipe'
                ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Palmtree className="w-4 h-4 text-amber-400" />
            <span>Férias</span>
            {todasFeriasEquipe.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-300 font-mono">
                {todasFeriasEquipe.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('dayoff_equipe')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'dayoff_equipe'
                ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Gift className="w-4 h-4 text-pink-400" />
            <span>Day Off</span>
            {todasDayOffEquipe.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                {todasDayOffEquipe.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('home_office_equipe')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'home_office_equipe'
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span>Escala</span>
            {todasEscalasEquipe.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                {todasEscalasEquipe.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('faltas_equipe')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'faltas_equipe'
                ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Faltas</span>
            {todasFaltasEquipe.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {todasFaltasEquipe.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('ponto_equipe')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'ponto_equipe'
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Timer className="w-4 h-4 text-emerald-400" />
            <span>Ponto</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('jornada_equipe')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'jornada_equipe'
                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Jornada</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('equipe_dossie')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'equipe_dossie'
                ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Users2 className="w-4 h-4 text-blue-400" />
            <span>Dossiê</span>
            {usuarios.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                {usuarios.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('gestao_aprovacoes')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer sm:ml-auto",
              tab === 'gestao_aprovacoes'
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/30 border border-purple-500/20"
            )}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Aprovações</span>
            {kpis.feriasPendentes.length + kpis.faltasPendentes.length + kpis.dayOffPendentes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 font-mono font-bold">
                {kpis.feriasPendentes.length + kpis.faltasPendentes.length + kpis.dayOffPendentes.length}
              </span>
            )}
          </button>
        </div>
      ) : (
        /* --- ABAS PARA COLABORADOR COMUM (NÃO-ADMIN) --- */
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto sm:flex-wrap [&>button]:shrink-0 [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-[11px] sm:[&>button]:px-3.5 sm:[&>button]:py-2 sm:[&>button]:text-xs">
          <button
            type="button"
            onClick={() => setTab('minhas_ferias')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'minhas_ferias'
                ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Palmtree className="w-4 h-4 text-amber-400" />
            <span>Férias</span>
            {minhasFerias.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-300 font-mono">
                {minhasFerias.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('meu_day_off')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'meu_day_off'
                ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Gift className="w-4 h-4 text-pink-400" />
            <span>Day Off</span>
            {meuDayOffAnoAtual && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                {meuDayOffAnoAtual.status === 'Aprovado' ? '✓' : meuDayOffAnoAtual.status === 'Pendente' ? '⏳' : '!'}
              </span>
            )}
          </button>

          {/* Aba Meus Plantões (Para Técnicos ou quem tem plantões) */}
          {(isTecnico || meusPlantoes.length > 0) && (
            <button
              type="button"
              onClick={() => setTab('meus_plantoes')}
              className={clsx(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                tab === 'meus_plantoes'
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              )}
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>Plantões</span>
              {meusPlantoes.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {meusPlantoes.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setTab('meu_home_office')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'meu_home_office'
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span>Escala</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('minhas_faltas')}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              tab === 'minhas_faltas'
                ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            )}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Faltas</span>
            {minhasFaltas.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {minhasFaltas.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm animate-pulse">
          Carregando informações de RH...
        </div>
      ) : !isGestorRh ? (
        /* ================= VISTA DO COLABORADOR (NÃO-ADMIN) ================= */
        <div className="space-y-6">
          
          {tab === 'minhas_ferias' && (
            <div className="space-y-5">
              <div className="p-3 sm:p-4 rounded-2xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-2.5 sm:gap-3">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400 shrink-0 mt-0.5" />
                <div className="text-[11px] sm:text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">Regra de Férias Mantran (2 Quinzenas):</p>
                  <p className="text-slate-400">
                    Você tem direito a <strong>2 quinzenas separadas (15 dias cada)</strong>. 
                    Nenhum colaborador pode tirar férias no mesmo período que outro colega. 
                    Clique em <strong>"Solicitar Férias"</strong> acima para agendar seu período.
                  </p>
                </div>
              </div>

              {minhasFerias.length === 0 ? (
                <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 sm:p-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 mx-auto flex items-center justify-center text-slate-500">
                    <Palmtree className="w-6 h-6 sm:w-7 sm:h-7 opacity-60" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Nenhuma solicitação de férias cadastrada</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Planeje suas 2 quinzenas de descanso clicando no botão "Solicitar Férias" no topo.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {minhasFeriasOrdenadas.map((f) => (
                    <div 
                      key={f.id} 
                      className="bg-dark-card border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Vigência: <strong className="text-white">{f.ano_vigencia}</strong>
                        </span>
                        {getStatusBadge(f.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
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

                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
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
                        <p className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
                          <strong className="text-slate-400 block text-[11px]">Minhas Observações:</strong>
                          {f.observacoes}
                        </p>
                      )}

                      {f.resposta_rh && (
                        <p className="text-xs text-amber-200 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                          <strong className="text-amber-400 block text-[11px]">Retorno do RH:</strong>
                          {f.resposta_rh}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Solicitado em {formatDateDisplay(f.created_at)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAbrirModalFerias(undefined, f)}
                            title="Editar / Corrigir Datas"
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-brand-400" />
                            Editar
                          </button>
                          {f.aprovado_por && (
                            <span>Avaliado por: <strong className="text-slate-300">{f.aprovado_por}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: MEU DAY OFF (COLABORADOR) */}
          {tab === 'meu_day_off' && (
            <div className="space-y-5">
              {/* Banner Informativo / Regra do Day Off */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0 shadow-lg shadow-pink-500/10">
                    <Cake className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Day Off de Aniversário</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-extrabold uppercase border border-pink-500/30">
                        Benefício Mantran
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Você tem direito a <strong>1 dia de folga comemorativa</strong> no mês do seu aniversário (utilizável em até <strong>30 dias</strong> dentro do período de aniversário). O agendamento é sujeito à aprovação prévia do RH.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAbrirModalDayOff()}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-500/25"
                  >
                    <PartyPopper className="w-4 h-4" />
                    <span>{meuDayOffAnoAtual ? 'Alterar / Novo Pedido' : 'Solicitar Meu Day Off'}</span>
                  </button>
                </div>
              </div>

              {/* Se o usuário ainda não cadastrou a Data de Nascimento */}
              {!minhaDataNascimento ? (
                <div className="bg-dark-card border-2 border-dashed border-pink-500/40 rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-xl">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/30 mx-auto flex items-center justify-center text-pink-400">
                    <Gift className="w-7 h-7 animate-bounce" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h4 className="text-base font-bold text-white">Informe sua Data de Nascimento</h4>
                    <p className="text-xs text-slate-400">
                      Para calcular a janela de 30 dias liberada para o seu Day Off, precisamos que você confirme a sua data de nascimento.
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto flex flex-col sm:flex-row gap-2.5 pt-2">
                    <input
                      type="date"
                      value={dayOffDataNascimento}
                      onChange={e => setDayOffDataNascimento(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:border-pink-500 flex-1"
                    />
                    <button
                      type="button"
                      disabled={salvandoDataNascModal || !dayOffDataNascimento}
                      onClick={() => handleSalvarDataNascimentoUsuario(user?.id || '', dayOffDataNascimento)}
                      className="py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{salvandoDataNascModal ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Detalhes do Day Off do Colaborador com Data de Nascimento cadastrada */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card: Meu Período de Aniversário & Janela de Validade */}
                  <div className="p-5 rounded-3xl bg-dark-card border border-slate-800 shadow-xl space-y-4 md:col-span-1">
                    <div className="flex items-center gap-2.5 text-pink-400 text-xs font-bold uppercase tracking-wider">
                      <Cake className="w-4 h-4" />
                      <span>Meus Dados de Aniversário</span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data de Nascimento</span>
                        <p className="text-base font-black text-white flex items-center justify-between">
                          <span>{formatDateDisplay(minhaDataNascimento)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 font-bold">
                            {meuCalculoDayOff?.mesNome}
                          </span>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">Janela de 30 Dias ({anoVigencia})</span>
                        <p className="text-xs font-bold text-slate-200">
                          {formatDateDisplay(meuCalculoDayOff?.janelaInicio)} até {formatDateDisplay(meuCalculoDayOff?.janelaFim)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Prazo máximo para usufruir da folga no exercício {anoVigencia}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAbrirModalDayOff()}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                        <span>Atualizar Data de Nascimento</span>
                      </button>
                    </div>
                  </div>

                  {/* Card: Status do Day Off no Ano Vigente */}
                  <div className="p-5 rounded-3xl bg-dark-card border border-slate-800 shadow-xl space-y-4 md:col-span-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Vigência: <strong className="text-white font-mono">{anoVigencia}</strong>
                        </span>
                        {meuDayOffAnoAtual ? getStatusBadge(meuDayOffAnoAtual.status) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            Disponível para Solicitar
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        {meuDayOffAnoAtual ? (
                          <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Escolhida para o Day Off</span>
                              <p className="text-xl sm:text-2xl font-black text-pink-300 font-mono flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-pink-400" />
                                {formatDateDisplay(meuDayOffAnoAtual.data_solicitada)}
                              </p>
                            </div>

                            {meuDayOffAnoAtual.observacoes && (
                              <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                <strong className="text-slate-400 block text-[11px]">Minhas Observações:</strong>
                                {meuDayOffAnoAtual.observacoes}
                              </p>
                            )}

                            {meuDayOffAnoAtual.resposta_rh && (
                              <p className="text-xs text-amber-200 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                                <strong className="text-amber-400 block text-[11px]">Retorno da Gestão de RH:</strong>
                                {meuDayOffAnoAtual.resposta_rh}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 mx-auto flex items-center justify-center">
                              <PartyPopper className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-white">Você ainda não solicitou seu Day Off de {anoVigencia}</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                              Aproveite seu benefício e escolha o dia ideal dentro da janela de aniversário para descansar e comemorar.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleAbrirModalDayOff()}
                              className="btn-primary py-2 px-5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                            >
                              <Gift className="w-4 h-4" />
                              <span>Escolher Data da Folga</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {meuDayOffAnoAtual && (
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Solicitado em {formatDateDisplay(meuDayOffAnoAtual.created_at)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAbrirModalDayOff(undefined, meuDayOffAnoAtual)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                            Editar
                          </button>
                          {meuDayOffAnoAtual.aprovado_por && (
                            <span>Avaliado por: <strong className="text-slate-300">{meuDayOffAnoAtual.aprovado_por}</strong></span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: MEUS PLANTÕES (TÉCNICOS) */}
          {tab === 'meus_plantoes' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-card border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-amber-400" />
                    Meus Plantões de Final de Semana
                  </h3>
                  <p className="text-xs text-slate-400">
                    Histórico dos finais de semana em que você esteve de plantão de suporte e status de pagamento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAbrirModalPlantao()}
                  className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Informar Plantão</span>
                </button>
              </div>

              {meusPlantoes.length === 0 ? (
                <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 sm:p-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                    <PhoneCall className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Nenhum plantão registrado ainda</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Esteve de plantão no final de semana? Clique em "Informar Plantão" acima para registrar as datas e garantir o pagamento pelo RH.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {meusPlantoes.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-dark-card border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          Final de Semana
                        </span>
                        {getStatusBadge(item.status_pagamento)}
                      </div>

                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[11px] block">Período de Plantão:</span>
                        <p className="text-sm font-bold text-white font-mono">
                          {formatDateDisplay(item.data_inicio)} a {formatDateDisplay(item.data_fim)}
                        </p>
                      </div>

                      {item.valor_plantao !== null && item.valor_plantao !== undefined && (
                        <div className="flex items-center justify-between text-xs bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                          <span className="text-emerald-400 font-bold">Valor do Plantão:</span>
                          <span className="text-emerald-300 font-bold font-mono">
                            R$ {Number(item.valor_plantao).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}

                      {item.observacoes && (
                        <p className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                          <strong className="text-slate-400 block text-[10px] mb-0.5">Observações:</strong>
                          {item.observacoes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                        Registrado em {formatDateDisplay(item.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'meu_home_office' && (
            <div className="space-y-5">
            {/* Card: Minha Jornada de Trabalho (somente leitura) */}
            <div className="bg-dark-card border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Minha Jornada de Trabalho</h3>
                  <p className="text-xs text-slate-400">Horário definido pelo RH.</p>
                </div>
              </div>

              {minhaJornada ? (
                <div className="space-y-3">
                  {/* Dias */}
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: 'segunda', label: 'Seg' },
                      { key: 'terca', label: 'Ter' },
                      { key: 'quarta', label: 'Qua' },
                      { key: 'quinta', label: 'Qui' },
                      { key: 'sexta', label: 'Sex' },
                      { key: 'sabado', label: 'Sáb' },
                      { key: 'domingo', label: 'Dom' },
                    ] as { key: keyof JornadaTrabalho; label: string }[]).map(d => (
                      <span
                        key={d.key}
                        className={clsx(
                          'px-2.5 py-1 rounded-lg text-[11px] font-bold border',
                          minhaJornada[d.key]
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-900 text-slate-600 border-slate-800'
                        )}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                  {/* Horários */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expediente</span>
                      <p className="text-lg font-bold text-white tabular-nums mt-0.5">
                        {(minhaJornada.hora_entrada || '').slice(0, 5)} às {(minhaJornada.hora_saida || '').slice(0, 5)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Almoço</span>
                      <p className="text-lg font-bold text-white tabular-nums mt-0.5">
                        {minhaJornada.almoco_inicio
                          ? `${(minhaJornada.almoco_inicio || '').slice(0, 5)} às ${(minhaJornada.almoco_fim || '').slice(0, 5)}`
                          : 'Sem intervalo'}
                      </p>
                    </div>
                  </div>
                  {minhaJornada.observacoes && (
                    <p className="text-xs text-slate-400 italic">"{minhaJornada.observacoes}"</p>
                  )}

                  {/* Banco de horas acumulado */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Banco de Horas
                    </span>
                    <span className={clsx(
                      'text-lg font-black tabular-nums',
                      meuBancoHoras.saldoAcumuladoMin > 0 ? 'text-emerald-400'
                      : meuBancoHoras.saldoAcumuladoMin < 0 ? 'text-rose-400'
                      : 'text-slate-300'
                    )}>
                      {meuBancoHoras.diasComputados > 0 ? formatSaldo(meuBancoHoras.saldoAcumuladoMin) : '0h00'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  Sua jornada de trabalho ainda não foi definida pelo RH.
                </p>
              )}
            </div>

            {/* Card: Home Office */}
            <div className="bg-dark-card border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-cyan-400" />
                    Minha Escala de Trabalho Semanal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Veja sua escala atual e clique no botão para alterar seus dias de Home Office.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAbrirEdicaoHomeOffice()}
                  className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Settings className="w-4 h-4" />
                  <span>Ajustar Meus Dias</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regime Atual</span>
                  <p className="text-lg font-bold text-white">
                    {meuHomeOffice?.modalidade || 'Híbrido / Presencial'}
                  </p>
                  {meuHomeOffice?.observacoes && (
                    <p className="text-xs text-slate-400 italic">"{meuHomeOffice.observacoes}"</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Dias em Home Office</span>
                  {(() => {
                    const isRemotoTotal = meuHomeOffice?.modalidade === '100% Remoto'
                    const diasSemana = [
                      { key: 'segunda', label: 'Segunda' },
                      { key: 'terca', label: 'Terça' },
                      { key: 'quarta', label: 'Quarta' },
                      { key: 'quinta', label: 'Quinta' },
                      { key: 'sexta', label: 'Sexta' },
                      { key: 'sabado', label: 'Sábado' },
                    ]
                    // Se for 100% Remoto, todos os dias úteis são home office
                    const diasHomeOffice = isRemotoTotal
                      ? diasSemana
                      : diasSemana.filter(d => (meuHomeOffice as any)?.[d.key])

                    if (diasHomeOffice.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 pt-1">
                          🏢 Você não possui dias de Home Office. Atuação 100% presencial.
                        </p>
                      )
                    }

                    return (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {diasHomeOffice.map(d => (
                          <span
                            key={d.key}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          >
                            🏠 {d.label}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
            </div>
          )}

          {tab === 'minhas_faltas' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-dark-card border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Meus Comunicados de Falta e Atestados
                  </h3>
                  <p className="text-xs text-slate-400">Histórico de ausências justificadas enviadas ao RH.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFaltaModalOpen(true)}
                  className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Atestado / Falta</span>
                </button>
              </div>

              {minhasFaltas.length === 0 ? (
                <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 sm:p-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 mx-auto flex items-center justify-center text-slate-500">
                    <FileText className="w-6 h-6 sm:w-7 sm:h-7 opacity-60" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Nenhum atestado ou falta registrada</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Precisa justificar um dia de ausência médica? Clique em "Novo Atestado / Falta" acima.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {minhasFaltas.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-dark-card border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.motivo}</span>
                          {getStatusBadge(item.status)}
                        </div>

                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Período:</span>
                            <span className="font-semibold text-white">
                              {formatDateDisplay(item.data_falta_inicio)}
                              {item.data_falta_fim && item.data_falta_fim !== item.data_falta_inicio && (
                                ` até ${formatDateDisplay(item.data_falta_fim)}`
                              )}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-bold border border-brand-500/20">
                            {item.dias_afastamento}d
                          </span>
                        </div>

                        {item.descricao && (
                          <p className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                            {item.descricao}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800/60">
                        {item.arquivo_atestado_url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewAtestado(item)}
                            className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">Ver Comprovante Anexado</span>
                          </button>
                        ) : (
                          <div className="text-center py-1.5 text-[11px] text-slate-500 italic">
                            Sem documento anexado
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{formatDateDisplay(item.created_at)}</span>
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
          )}

        </div>
      ) : (
        /* ================= VISTA DA GESTÃO DE RH / ADMIN ================= */
        <div className="space-y-6">

          {/* TAB: DASHBOARD */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Plantonista do Fim de Semana */}
                <div className="bg-dark-card border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plantão Fim de Semana</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    {proximoPlantao ? (
                      <div>
                        <p className="text-lg font-black text-white truncate">{proximoPlantao.tecnico_nome}</p>
                        <span className="text-[11px] text-amber-400 font-mono">
                          {formatDateDisplay(proximoPlantao.data_inicio)} a {formatDateDisplay(proximoPlantao.data_fim)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-2xl font-black text-slate-500">-</span>
                        <p className="text-[11px] text-slate-500">Nenhum plantão agendado</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{kpis.plantoesPendentesPagamento.length} a pagar</span>
                    <button
                      type="button"
                      onClick={() => setTab('plantoes_equipe')}
                      className="text-amber-400 font-bold hover:underline"
                    >
                      Ver todos
                    </button>
                  </div>
                </div>

                {/* 2. Em Férias Hoje */}
                <div className="bg-dark-card border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Férias Hoje</span>
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                      <Palmtree className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{kpis.emFeriasHoje.length}</span>
                    <span className="text-xs text-slate-400">colaboradores</span>
                  </div>
                  {kpis.emFeriasHoje.length > 0 ? (
                    <p className="mt-2 text-[11px] text-teal-300/80 truncate">
                      {kpis.emFeriasHoje.map(f => f.usuario_nome).join(', ')}
                    </p>
                  ) : kpis.proximaFeria ? (
                    <p className="mt-2 text-[11px] text-teal-300/80 truncate">
                      Próximo: <strong className="text-teal-200">{kpis.proximaFeria.nome}</strong> em {formatDateDisplay(kpis.proximaFeria.inicio)}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-teal-300/80 truncate">
                      Nenhuma férias agendada
                    </p>
                  )}
                </div>

                {/* 3. Home Office Hoje */}
                <div className="bg-dark-card border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden">
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
                  <p className="mt-2 text-[11px] text-cyan-300/80 truncate">
                    {kpis.emHomeOfficeHoje.length > 0
                      ? kpis.emHomeOfficeHoje.map(h => h.usuario_nome).join(', ')
                      : 'Toda equipe em presencial hoje'}
                  </p>
                </div>

                {/* 4. Quadro Mantran */}
                <div className="bg-dark-card border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quadro Mantran</span>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Users2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{kpis.totalColaboradores}</span>
                    <span className="text-xs text-slate-400">funcionários</span>
                  </div>
                  <p className="mt-2 text-[11px] text-purple-300/80">
                    {kpis.feriasPendentes.length + kpis.faltasPendentes.length > 0
                      ? `${kpis.feriasPendentes.length + kpis.faltasPendentes.length} pendência(s) de aprovação`
                      : 'Tudo em dia com o RH'}
                  </p>
                </div>

              </div>

              {/* PRESENÇA HOJE */}
              <div className="bg-dark-card border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 leading-tight">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400 shrink-0" />
                      <span>Presença & Alocação da Equipe Hoje ({new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })})</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Visão em tempo real de quem está no escritório presencial, em home office, férias ou atestado.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTab('home_office_equipe')}
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

                    const faAtiva = todasFaltasEquipe.find(fa => {
                      if (fa.status === 'Recusado') return false
                      const matchUser = fa.usuario_id === u.id || fa.usuario_nome.toLowerCase() === u.nome.toLowerCase()
                      if (!matchUser) return false
                      const fim = fa.data_falta_fim || fa.data_falta_inicio
                      return hojeStr >= fa.data_falta_inicio && hojeStr <= fim
                    })

                    const hoEscala = todasEscalasEquipe.find(h => h.usuario_id === u.id || h.usuario_nome.toLowerCase() === u.nome.toLowerCase())
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
                          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 font-bold flex items-center justify-center text-xs text-white uppercase shrink-0 overflow-hidden">
                            {u.foto_url ? (
                              <img src={u.foto_url} alt={u.nome} className="w-full h-full object-cover" />
                            ) : (
                              u.nome.charAt(0)
                            )}
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
            </div>
          )}

          {/* TAB: PLANTÕES DE FIM DE SEMANA (GESTAO RH) */}
          {tab === 'plantoes_equipe' && (
            <div className="space-y-5">
              
              <div className="bg-dark-card border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <PhoneCall className="w-5 h-5 text-amber-400" />
                    Gestão de Plantões de Final de Semana (Técnicos)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Controle dos plantões informados pelos técnicos, aprovação e registro para pagamento.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAbrirModalPlantao()}
                    className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Plantão</span>
                  </button>
                </div>
              </div>

              {/* Cards de Resumo de Pagamentos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Plantões</span>
                  <p className="text-2xl font-black text-white">{todosPlantoesEquipe.length}</p>
                  <p className="text-[11px] text-slate-400">registrados no histórico</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pendentes de Pagamento</span>
                  <p className="text-2xl font-black text-amber-300">
                    {kpis.plantoesPendentesPagamento.length} plantões
                  </p>
                  <p className="text-[11px] text-amber-400/80">
                    Aguardando lançamento/pagamento pelo RH
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Plantões Pagos</span>
                  <p className="text-2xl font-black text-emerald-300">
                    {todosPlantoesEquipe.filter(p => p.status_pagamento === 'Pago').length} plantões
                  </p>
                  <p className="text-[11px] text-emerald-400/80">
                    Quitados na folha de pagamento
                  </p>
                </div>
              </div>

              {/* Tabela de Plantões */}
              <div className="bg-dark-card border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-4">Técnico Plantonista</th>
                        <th className="p-4">Período (Fim de Semana)</th>
                        <th className="p-4">Valor (R$)</th>
                        <th className="p-4">Status Pagamento</th>
                        <th className="p-4">Observações</th>
                        <th className="p-4 text-right">Ações do RH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {todosPlantoesEquipe.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            Nenhum plantão de final de semana registrado no momento.
                          </td>
                        </tr>
                      ) : (
                        todosPlantoesEquipe.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                            <td className="p-4 font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold flex items-center justify-center text-xs">
                                  {p.tecnico_nome.charAt(0)}
                                </div>
                                <span>{p.tecnico_nome}</span>
                              </div>
                            </td>

                            <td className="p-4 font-mono font-bold text-white">
                              {formatDateDisplay(p.data_inicio)} a {formatDateDisplay(p.data_fim)}
                            </td>

                            <td className="p-4 font-mono font-bold text-emerald-400">
                              {p.valor_plantao !== null && p.valor_plantao !== undefined 
                                ? `R$ ${Number(p.valor_plantao).toFixed(2).replace('.', ',')}` 
                                : <span className="text-slate-500 font-normal">A definir</span>}
                            </td>

                            <td className="p-4">
                              {getStatusBadge(p.status_pagamento)}
                            </td>

                            <td className="p-4 text-slate-400 max-w-xs truncate">
                              {p.observacoes || '-'}
                            </td>

                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setPlantaoPagamentoItem(p)
                                  setPagamentoStatus(p.status_pagamento || 'Pago')
                                  setPagamentoValor(p.valor_plantao !== null && p.valor_plantao !== undefined ? p.valor_plantao : '')
                                  setPagamentoObs(p.observacoes || '')
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                              >
                                {p.status_pagamento === 'Pago' ? 'Editar' : 'Pagar / Avaliar'}
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
          )}

          {/* TAB: FÉRIAS EQUIPE */}
          {tab === 'ferias_equipe' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-dark-card border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palmtree className="w-4 h-4 text-amber-400" />
                    Solicitações de Férias de Todos os Colaboradores ({todasFeriasEquipe.length})
                  </h3>
                  <p className="text-xs text-slate-400">Avalie e aprove períodos de descanso das 2 quinzenas.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feriasEquipeOrdenadas.map((f) => (
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                        <span className="text-xs font-bold text-brand-400 block">1ª Quinzena</span>
                        <p className="text-xs font-semibold text-white">
                          {formatDateDisplay(f.quinzena_1_inicio)} a {formatDateDisplay(f.quinzena_1_fim)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                        <span className="text-xs font-bold text-teal-400 block">2ª Quinzena</span>
                        <p className="text-xs font-semibold text-white">
                          {f.quinzena_2_inicio ? `${formatDateDisplay(f.quinzena_2_inicio)} a ${formatDateDisplay(f.quinzena_2_fim)}` : 'A definir'}
                        </p>
                      </div>
                    </div>

                    {f.observacoes && (
                      <p className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
                        <strong className="text-slate-400 block text-[11px]">Obs do Colaborador:</strong>
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
                      <span>{formatDateDisplay(f.created_at)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirModalFerias(undefined, f)}
                          title="Editar / Corrigir Datas"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-brand-400" />
                          Editar
                        </button>
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
                        <button
                          type="button"
                          onClick={() => handleExcluirFerias(f.id, f.usuario_nome)}
                          title="Excluir Registro de Férias"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DAY OFF EQUIPE (GESTOR / ADMIN) */}
          {tab === 'dayoff_equipe' && (
            <div className="space-y-5">
              {/* Header do Day Off da Equipe */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-card border border-slate-800 p-4 sm:p-5 rounded-3xl">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-400" />
                    Gestão de Day Off & Aniversariantes ({todasDayOffEquipe.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Acompanhe os aniversariantes, janela de 30 dias liberada e aprove os pedidos de folga comemorativa.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAbrirModalDayOff()}
                    className="py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Day Off</span>
                  </button>
                </div>
              </div>

              {/* Painel: Aniversariantes do Mês e Próximos */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cake className="w-4 h-4" /> Aniversariantes da Equipe
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {aniversariantesEquipe.length} colaboradores com aniversário cadastrado
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {aniversariantesEquipe.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-slate-500 text-xs italic">
                      Nenhum colaborador com data de nascimento cadastrada ainda. Ao abrir o Day Off ou editar o colaborador, informe a data.
                    </div>
                  ) : (
                    aniversariantesEquipe.map(item => (
                      <div
                        key={item.usuario.id}
                        className={clsx(
                          "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5",
                          item.isMesAtual
                            ? "bg-pink-950/20 border-pink-500/40 shadow-sm shadow-pink-500/10"
                            : "bg-slate-900/80 border-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {item.usuario.nome.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                              <span>{item.usuario.nome}</span>
                              {item.isMesAtual && <span title="Aniversariante deste mês!">🎂</span>}
                            </p>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {item.calc?.diaNasc}/{item.calc?.mesNasc} ({item.calc?.mesNome})
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {item.dayOff ? (
                            getStatusBadge(item.dayOff.status)
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAbrirModalDayOff(item.usuario)}
                              className="text-[10px] px-2 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold transition-all cursor-pointer"
                            >
                              Lançar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tabela de Solicitações de Day Off */}
              <div className="bg-dark-card border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-4">Colaborador</th>
                        <th className="p-4">Nascimento / Aniversário</th>
                        <th className="p-4">Data Solicitada (Folga)</th>
                        <th className="p-4">Janela Permitida (30 Dias)</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Observações</th>
                        <th className="p-4 text-right">Ações do RH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {todasDayOffEquipe.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            Nenhuma solicitação de Day Off registrada até o momento.
                          </td>
                        </tr>
                      ) : (
                        todasDayOffEquipe.map(d => {
                          const calc = getCalculoDayOff(d.data_nascimento, d.ano_vigencia)
                          return (
                            <tr key={d.id} className="hover:bg-slate-850/50 transition-colors">
                              <td className="p-4 font-bold text-white">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 font-bold flex items-center justify-center text-xs">
                                    {d.usuario_nome.charAt(0)}
                                  </div>
                                  <div>
                                    <span>{d.usuario_nome}</span>
                                    <span className="text-[10px] text-slate-500 block">Exercício: {d.ano_vigencia}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-4 text-slate-300">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-semibold">{formatDateDisplay(d.data_nascimento)}</span>
                                    {calcularIdade(d.data_nascimento) !== null && (
                                      <span className="px-1.5 py-0.2 text-[10px] rounded bg-pink-500/15 text-pink-300 border border-pink-500/30 font-bold">
                                        {calcularIdade(d.data_nascimento)}a
                                      </span>
                                    )}
                                  </div>
                                  {calc && (
                                    <span className="text-[10px] text-pink-400 block">
                                      {calc.mesNome}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-4 font-mono font-bold text-pink-300 text-sm">
                                {formatDateDisplay(d.data_solicitada)}
                              </td>

                              <td className="p-4 text-slate-400 text-[11px] font-mono">
                                {calc ? `${formatDateDisplay(calc.janelaInicio)} a ${formatDateDisplay(calc.janelaFim)}` : '-'}
                              </td>

                              <td className="p-4">
                                {getStatusBadge(d.status)}
                              </td>

                              <td className="p-4 text-slate-400 max-w-xs truncate">
                                {d.observacoes || d.resposta_rh || '-'}
                              </td>

                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirModalDayOff(undefined, d)}
                                    title="Editar Dados"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setItemAvaliacao({ type: 'dayoff', item: d })
                                      setStatusAvaliacao(d.status || 'Aprovado')
                                      setRespostaRh(d.resposta_rh || '')
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Avaliar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExcluirDayOff(d.id, d.usuario_nome)}
                                    title="Excluir Solicitação"
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
          )}

          {/* TAB: ESCALA HOME OFFICE EQUIPE */}
          {tab === 'home_office_equipe' && (
            <div className="space-y-4">
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
                        <th className="p-4 text-center font-black text-red-500">Hoje</th>
                        <th className="p-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {todasEscalasEquipe.map((item) => {
                        const isHojeRemoto = item.modalidade === '100% Remoto' || (diaAtualProp && item[diaAtualProp])
                        return (
                          <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                            <td className="p-4 font-bold text-white">{item.usuario_nome}</td>
                            <td className="p-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                {item.modalidade}
                              </span>
                            </td>
                            {['segunda', 'terca', 'quarta', 'quinta', 'sexta'].map((diaKey) => {
                              const isRemoto = item.modalidade === '100% Remoto' || (item as any)[diaKey]
                              return (
                                <td key={diaKey} className="p-4 text-center">
                                  {isRemoto ? '🏠' : '🏢'}
                                </td>
                              )
                            })}
                            <td className="p-4 text-center font-bold text-[11px]">
                              {isHojeRemoto ? <span className="text-cyan-400">🏠 Remoto</span> : <span className="text-slate-400">🏢 Presencial</span>}
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FALTAS & ATESTADOS EQUIPE */}
          {tab === 'faltas_equipe' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todasFaltasEquipe.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-dark-card border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">👤 {item.usuario_nome}</span>
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
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      {item.arquivo_atestado_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewAtestado(item)}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Ver Atestado Anexado</span>
                        </button>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{formatDateDisplay(item.created_at)}</span>
                        <div className="flex items-center gap-3">
                          {isGestorRh && (
                            <button
                              type="button"
                              onClick={() => handleAbrirEdicaoFalta(item)}
                              className="text-xs font-bold text-slate-300 hover:text-white underline cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-brand-400" />
                              Corrigir
                            </button>
                          )}
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
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CONTROLE DE PONTO EQUIPE */}
          {tab === 'ponto_equipe' && (
            <div className="space-y-5">
              {/* Cabeçalho com seletor de data */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-card border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Registros de Ponto</h3>
                    <p className="text-xs text-slate-400">
                      {totalPresentesNoDia} colaborador(es) com registro em {formatDateDisplay(pontoDataSelecionada)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
                  <input
                    type="date"
                    value={pontoDataSelecionada}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => setPontoDataSelecionada(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Grid de colaboradores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pontosPorColaborador.map(col => (
                  <div
                    key={col.usuario_id}
                    className={clsx(
                      'bg-dark-card border rounded-2xl p-5 shadow-lg space-y-3.5 transition-all',
                      col.temRegistro ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'
                    )}
                  >
                    {/* Cabeçalho do card */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 font-bold flex items-center justify-center text-xs text-white uppercase overflow-hidden shrink-0">
                          {col.foto_url ? (
                            <img src={col.foto_url} alt={col.usuario_nome} className="w-full h-full object-cover" />
                          ) : (
                            col.usuario_nome.charAt(0)
                          )}
                        </div>
                        <span className="text-xs font-bold text-white">{col.usuario_nome}</span>
                      </div>
                      {col.temRegistro ? (
                        col.emAndamento ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Em andamento
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300 font-bold border border-slate-600/40">
                            Encerrado
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-500 font-bold border border-slate-700/40">
                          Sem registro
                        </span>
                      )}
                    </div>

                    {/* Marcos do dia */}
                    <div className="grid grid-cols-2 gap-2">
                      {(['inicio_expediente', 'pausa_almoco', 'retorno_almoco', 'fim_expediente'] as TipoPonto[]).map(tipo => {
                        const reg = col.registros[tipo]
                        return (
                          <div
                            key={tipo}
                            className={clsx(
                              'p-2.5 rounded-lg border text-center',
                              reg ? 'bg-slate-900/80 border-slate-800' : 'bg-transparent border-slate-800/50'
                            )}
                          >
                            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                              {PONTO_LABELS[tipo]}
                            </p>
                            <p className={clsx('text-sm font-bold tabular-nums mt-0.5', reg ? 'text-white' : 'text-slate-600')}>
                              {formatHoraPonto(reg?.data_hora)}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Total trabalhado */}
                    {col.temRegistro && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Horas trabalhadas
                        </span>
                        <span className="font-bold text-emerald-400 tabular-nums">
                          {col.registros.inicio_expediente ? formatDuracaoPonto(col.trabalhadoMs) : '--'}
                          {col.emAndamento && <span className="text-[10px] text-slate-500 ml-1">(parcial)</span>}
                        </span>
                      </div>
                    )}

                    {/* Banco de horas acumulado */}
                    {(() => {
                      const saldo = bancoHorasPorColaborador.get(col.usuario_id) ?? 0
                      return (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Timer className="w-3.5 h-3.5" />
                            Banco de horas
                          </span>
                          <span className={clsx(
                            'font-bold tabular-nums',
                            saldo > 0 ? 'text-emerald-400' : saldo < 0 ? 'text-rose-400' : 'text-slate-400'
                          )}>
                            {formatSaldo(saldo)}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>

              {pontosPorColaborador.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Nenhum colaborador encontrado.
                </div>
              )}
            </div>
          )}

          {/* TAB: JORNADA DE TRABALHO EQUIPE */}
          {tab === 'jornada_equipe' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 bg-dark-card border border-slate-800 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Jornada de Trabalho</h3>
                  <p className="text-xs text-slate-400">Defina o horário e os dias de trabalho de cada colaborador.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usuarios.map(u => {
                  const j = todasJornadasEquipe.find(x => x.usuario_id === u.id)
                  const diasLabels: { key: keyof JornadaTrabalho; label: string }[] = [
                    { key: 'segunda', label: 'Seg' },
                    { key: 'terca', label: 'Ter' },
                    { key: 'quarta', label: 'Qua' },
                    { key: 'quinta', label: 'Qui' },
                    { key: 'sexta', label: 'Sex' },
                    { key: 'sabado', label: 'Sáb' },
                    { key: 'domingo', label: 'Dom' },
                  ]
                  return (
                    <div key={u.id} className="bg-dark-card border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 font-bold flex items-center justify-center text-xs text-white uppercase shrink-0">
                            {u.nome.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{u.nome}</p>
                            <span className="text-[10px] text-slate-400 capitalize">{u.perfil}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAbrirEdicaoJornada({ id: u.id, nome: u.nome })}
                          title="Editar jornada"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{j ? 'Editar' : 'Definir'}</span>
                        </button>
                      </div>

                      {j ? (
                        <>
                          {/* Dias da semana */}
                          <div className="flex flex-wrap gap-1.5">
                            {diasLabels.map(d => (
                              <span
                                key={d.key}
                                className={clsx(
                                  'px-2 py-1 rounded-lg text-[10px] font-bold border',
                                  j[d.key]
                                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                    : 'bg-slate-900 text-slate-600 border-slate-800'
                                )}
                              >
                                {d.label}
                              </span>
                            ))}
                          </div>

                          {/* Horários */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Expediente</p>
                              <p className="text-sm font-bold text-white tabular-nums mt-0.5">
                                {(j.hora_entrada || '').slice(0, 5)} às {(j.hora_saida || '').slice(0, 5)}
                              </p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Almoço</p>
                              <p className="text-sm font-bold text-white tabular-nums mt-0.5">
                                {j.almoco_inicio
                                  ? `${(j.almoco_inicio || '').slice(0, 5)} às ${(j.almoco_fim || '').slice(0, 5)}`
                                  : 'Sem intervalo'}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-2">
                          Jornada ainda não definida. Clique em "Definir" para cadastrar.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB: DOSSIÊ EQUIPE */}
          {tab === 'equipe_dossie' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usuarios.map(u => {
                const fUsuario = todasFeriasEquipe.filter(f => f.usuario_id === u.id || f.usuario_nome.toLowerCase() === u.nome.toLowerCase())
                const hoUsuario = todasEscalasEquipe.find(h => h.usuario_id === u.id || h.usuario_nome.toLowerCase() === u.nome.toLowerCase())
                const plantoesUsuario = todosPlantoesEquipe.filter(p => p.tecnico_id === u.id || p.tecnico_nome.toLowerCase() === u.nome.toLowerCase())

                return (
                  <div key={u.id} className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 font-bold flex items-center justify-center text-xs text-white">
                        {u.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{u.nome}</p>
                        <span className="text-[10px] text-slate-400 capitalize">{u.perfil}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Regime:</span>
                        <span className="font-bold text-cyan-400">{hoUsuario?.modalidade || 'Presencial'}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Férias no Ano:</span>
                        <span className="font-bold text-teal-400">{fUsuario.length} período(s)</span>
                      </div>
                      {plantoesUsuario.length > 0 && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Plantões Realizados:</span>
                          <span className="font-bold text-amber-400">{plantoesUsuario.length} fins de semana</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB: APROVAÇÕES RH */}
          {tab === 'gestao_aprovacoes' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Fila de Pendências de RH ({kpis.feriasPendentes.length + kpis.faltasPendentes.length + kpis.dayOffPendentes.length})
              </h3>
              
              <div className="space-y-3">
                {/* Day Off Pendentes */}
                {kpis.dayOffPendentes.map(d => (
                  <div key={d.id} className="p-4 bg-dark-card border border-pink-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-pink-400" />
                        🎂 Day Off (Aniversário): {d.usuario_nome} ({d.ano_vigencia})
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Folga Solicitada: <strong className="text-pink-300 font-mono">{formatDateDisplay(d.data_solicitada)}</strong> | Nascimento: {formatDateDisplay(d.data_nascimento)} {calcularIdade(d.data_nascimento) !== null ? `(${calcularIdade(d.data_nascimento)} anos)` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setItemAvaliacao({ type: 'dayoff', item: d })
                        setStatusAvaliacao('Aprovado')
                        setRespostaRh('')
                      }}
                      className="py-1.5 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Avaliar
                    </button>
                  </div>
                ))}

                {kpis.feriasPendentes.map(f => (
                  <div key={f.id} className="p-4 bg-dark-card border border-amber-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">🌴 Férias: {f.usuario_nome} ({f.ano_vigencia})</span>
                      <span className="text-xs text-slate-400">
                        1ª Quinzena: {formatDateDisplay(f.quinzena_1_inicio)} a {formatDateDisplay(f.quinzena_1_fim)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setItemAvaliacao({ type: 'ferias', item: f })
                        setStatusAvaliacao('Aprovado')
                        setRespostaRh('')
                      }}
                      className="btn-primary py-1.5 px-3 text-xs font-bold"
                    >
                      Avaliar
                    </button>
                  </div>
                ))}

                {kpis.faltasPendentes.map(item => (
                  <div key={item.id} className="p-4 bg-dark-card border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">📄 Atestado: {item.usuario_nome} ({item.motivo})</span>
                      <span className="text-xs text-slate-400">
                        Período: {formatDateDisplay(item.data_falta_inicio)} ({item.dias_afastamento} dias)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setItemAvaliacao({ type: 'falta', item })
                        setStatusAvaliacao('Abonado / Aprovado')
                        setRespostaRh('')
                      }}
                      className="btn-primary py-1.5 px-3 text-xs font-bold"
                    >
                      Avaliar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= MODAL INFORMAR / CADASTRAR PLANTÃO ================= */}
      {isPlantaoModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Plantão de Final de Semana</h2>
                  <p className="text-xs text-slate-400">Registro de escala e adicional de plantão</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPlantaoModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarPlantao} className="p-6 space-y-4">
              {/* Seleção do Técnico (se Gestor/Admin) ou fixo no usuário */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Técnico Plantonista
                </label>
                {isGestorRh ? (
                  <select
                    value={plantaoTecnicoId}
                    onChange={e => {
                      const selId = e.target.value
                      setPlantaoTecnicoId(selId)
                      const found = usuariosTecnicos.find(u => u.id === selId)
                      if (found) setPlantaoTecnicoNome(found.nome)
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-amber-500"
                  >
                    <option value="">Selecione o técnico...</option>
                    {usuariosTecnicos.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={user?.nome || user?.login || 'Técnico'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs font-bold"
                  />
                )}
              </div>

              {/* Datas do Final de Semana */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Data Início (Sábado)
                  </label>
                  <input
                    type="date"
                    value={plantaoDataInicio}
                    onChange={e => handlePlantaoDataInicioChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Data Fim (Domingo)
                  </label>
                  <input
                    type="date"
                    value={plantaoDataFim}
                    onChange={e => setPlantaoDataFim(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Valor do Plantão (opcional / RH) */}
              {isGestorRh && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Valor a Pagar pelo Plantão (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 250,00"
                    value={plantaoValor}
                    onChange={e => setPlantaoValor(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold focus:border-amber-500"
                  />
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observações / Ocorrências no Plantão
                </label>
                <textarea
                  value={plantaoObs}
                  onChange={e => setPlantaoObs(e.target.value)}
                  placeholder="Ex: Plantão tranquilo, 3 chamados de clientes atendidos..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPlantaoModalOpen(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPlantao}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex-1 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvandoPlantao ? 'Salvando...' : 'Confirmar Plantão'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL GERENCIAR PAGAMENTO DE PLANTÃO (RH) ================= */}
      {plantaoPagamentoItem && isGestorRh && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-base font-bold text-white">Pagamento de Plantão</h2>
                  <p className="text-xs text-slate-400">{plantaoPagamentoItem.tecnico_nome}</p>
                </div>
              </div>
              <button 
                onClick={() => setPlantaoPagamentoItem(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarPagamentoPlantao} className="p-6 space-y-4">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 block">Fim de Semana:</span>
                <span className="font-mono font-bold text-white">
                  {formatDateDisplay(plantaoPagamentoItem.data_inicio)} a {formatDateDisplay(plantaoPagamentoItem.data_fim)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Status do Pagamento
                </label>
                <select
                  value={pagamentoStatus}
                  onChange={e => setPagamentoStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-emerald-500"
                >
                  <option value="Pago">Pago (Quitado na Folha)</option>
                  <option value="Aprovado">Aprovado (Aguardando Pagamento)</option>
                  <option value="Pendente">Pendente de Avaliação</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Valor Pago pelo Plantão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={pagamentoValor}
                  onChange={e => setPagamentoValor(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observações do RH / Folha
                </label>
                <textarea
                  value={pagamentoObs}
                  onChange={e => setPagamentoObs(e.target.value)}
                  placeholder="Ex: Pago via PIX / Adicionado no holerite de Setembro..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setPlantaoPagamentoItem(null)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPagamentoPlantao}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvandoPagamentoPlantao ? 'Salvando...' : 'Confirmar Pagamento'}</span>
                </button>
              </div>
            </form>
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
                  <h2 className="text-base font-bold text-white">
                    {editingFeriasId ? '✏️ Editar / Corrigir Período de Férias' : 'Solicitar Período de Férias'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingFeriasId 
                      ? 'Corrija as datas das quinzenas ou observações do colaborador.' 
                      : 'Direito a 2 Quinzenas separadas (15 dias cada)'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsFeriasModalOpen(false)
                  setEditingFeriasId(null)
                }} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const targetUserId = feriasUsuarioId || user?.id || 'temp'
              const targetUserNome = feriasUsuarioNome || user?.nome || user?.login || 'Colaborador'
              const conflitoQ1 = checkConflitoPeriodo(q1Inicio, q1Fim, 1, targetUserId, targetUserNome)
              const conflitoQ2 = q2Inicio && q2Fim ? checkConflitoPeriodo(q2Inicio, q2Fim, 2, targetUserId, targetUserNome) : null
              const temConflito = !!conflitoQ1 || !!conflitoQ2
              const conflitoAtivo = conflitoQ1 || conflitoQ2

              return (
                <form onSubmit={handleSalvarFerias} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

                  {/* Seleção do Colaborador (se Gestor/Admin) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Colaborador
                    </label>
                    {isGestorRh ? (
                      <select
                        value={feriasUsuarioId}
                        onChange={e => {
                          const selId = e.target.value
                          setFeriasUsuarioId(selId)
                          const found = usuarios.find(u => u.id === selId)
                          if (found) setFeriasUsuarioNome(found.nome)
                        }}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-brand-500"
                      >
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value={user?.nome || user?.login || 'Colaborador'}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs font-bold"
                      />
                    )}
                  </div>

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
                    conflitoQ1 ? "border-red-500/60 bg-red-950/20" : "border-brand-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                        conflitoQ1 ? "text-red-400" : "text-brand-400"
                      )}>
                        <Calendar className="w-4 h-4" /> 1ª Quinzena (15 dias corridos)
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
                            conflitoQ1 ? "border-red-500 focus:border-red-400" : "border-slate-700 focus:border-brand-500"
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
                            conflitoQ1 ? "border-red-500 focus:border-red-400" : "border-slate-700 focus:border-brand-500"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2ª Quinzena (Opcional) */}
                  <div className={clsx(
                    "p-4 rounded-xl bg-slate-900/60 border transition-all space-y-3",
                    conflitoQ2 ? "border-red-500/60 bg-red-950/20" : "border-teal-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                        conflitoQ2 ? "text-red-400" : "text-teal-400"
                      )}>
                        <Calendar className="w-4 h-4" /> 2ª Quinzena (Opcional)
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
                            conflitoQ2 ? "border-red-500 focus:border-red-400" : "border-slate-700 focus:border-teal-500"
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
                            conflitoQ2 ? "border-red-500 focus:border-red-400" : "border-slate-700 focus:border-teal-500"
                          )}
                        />
                      </div>
                    </div>
                  </div>

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

                  <div className="pt-2 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFeriasModalOpen(false)
                        setEditingFeriasId(null)
                      }}
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
                      {editingFeriasId ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      <span>
                        {salvandoFerias 
                          ? (editingFeriasId ? 'Salvando...' : 'Enviando...') 
                          : temConflito 
                          ? 'Período Bloqueado' 
                          : (editingFeriasId ? 'Salvar Alterações' : 'Enviar Solicitação')}
                      </span>
                    </button>
                  </div>
                </form>
              )
            })()}
          </div>
        </div>
      )}

      {/* ================= MODAL SOLICITAR / EDITAR DAY OFF ================= */}
      {isDayOffModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingDayOffId ? '✏️ Editar Day Off' : '🎉 Solicitar Day Off (Folga de Aniversário)'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Direito a 1 dia de folga no prazo de 30 dias do seu aniversário
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDayOffModalOpen(false)
                  setEditingDayOffId(null)
                }} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const targetUserId = dayOffUsuarioId || user?.id || 'temp'
              const calc = getCalculoDayOff(dayOffDataNascimento, anoVigencia)
              const foraDaJanela = calc && dayOffDataSolicitada && (dayOffDataSolicitada < calc.janelaInicio || dayOffDataSolicitada > calc.janelaFim)
              // Data de nascimento já salva no perfil do colaborador alvo
              const dataNascSalva = (usuarios.find(u => u.id === targetUserId)?.data_nascimento) || (targetUserId === user?.id ? minhaDataNascimento : null) || ''
              // Só mostra "Salvar no Perfil" se ainda não há data salva ou se o valor foi alterado
              const precisaSalvarDataNasc = !!dayOffDataNascimento && dayOffDataNascimento !== dataNascSalva

              return (
                <form onSubmit={handleSalvarDayOff} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* Seleção do Colaborador (se Gestor/Admin) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Colaborador
                    </label>
                    {isGestorRh ? (
                      <select
                        value={dayOffUsuarioId}
                        onChange={e => {
                          const selId = e.target.value
                          setDayOffUsuarioId(selId)
                          const found = usuarios.find(u => u.id === selId)
                          if (found) {
                            setDayOffUsuarioNome(found.nome)
                            setDayOffDataNascimento(found.data_nascimento || '')
                          }
                        }}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-pink-500"
                      >
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value={user?.nome || user?.login || 'Colaborador'}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs font-bold"
                      />
                    )}
                  </div>

                  {/* ETAPA 1: Se ainda não tiver Data de Nascimento cadastrada ou quiser alterar */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <label className="block text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Cake className="w-3.5 h-3.5" /> Data de Nascimento
                      </span>
                      {calc && (
                        <div className="flex items-center gap-1.5">
                          {calcularIdade(dayOffDataNascimento) !== null && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/15 text-pink-300 border border-pink-500/30 font-bold">
                              {calcularIdade(dayOffDataNascimento)} anos
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">
                            Mês: {calc.mesNome}
                          </span>
                        </div>
                      )}
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dayOffDataNascimento}
                        onChange={e => setDayOffDataNascimento(e.target.value)}
                        required
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:border-pink-500"
                      />
                      {precisaSalvarDataNasc ? (
                        <button
                          type="button"
                          disabled={salvandoDataNascModal || !dayOffDataNascimento}
                          onClick={() => handleSalvarDataNascimentoUsuario(targetUserId, dayOffDataNascimento)}
                          className="py-2 px-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                          title="Salvar no perfil do colaborador"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{salvandoDataNascModal ? '...' : 'Salvar no Perfil'}</span>
                        </button>
                      ) : (
                        <span className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1 shrink-0" title="Data de nascimento já salva no perfil">
                          <Check className="w-3.5 h-3.5" />
                          <span>Salva</span>
                        </span>
                      )}
                    </div>

                    {!calc && (
                      <p className="text-[11px] text-amber-400 flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Informe e salve a data de nascimento para desbloquear a seleção de data do Day Off.
                      </p>
                    )}
                  </div>

                  {/* ETAPA 2: Painel de Janela e Seleção da Data do Day Off */}
                  {calc && (
                    <div className="space-y-4">
                      {/* Box informativo da janela permitida */}
                      <div className="p-3.5 rounded-2xl bg-pink-950/20 border border-pink-500/30 text-xs text-pink-200 space-y-1">
                        <div className="flex items-center justify-between font-bold text-pink-300">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" /> Janela Liberada para Folga:
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/30 text-white font-mono">
                            30 Dias
                          </span>
                        </div>
                        <p className="font-mono text-white text-xs pt-0.5">
                          <strong>{formatDateDisplay(calc.janelaInicio)}</strong> até <strong>{formatDateDisplay(calc.janelaFim)}</strong>
                        </p>
                        <p className="text-[11px] text-pink-300/80">
                          Você pode escolher qualquer dia útil dentro desta janela de comemoração de aniversário no ano de {anoVigencia}.
                        </p>
                      </div>

                      {/* Seleção do Ano e da Data Desejada */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Ano de Exercício
                          </label>
                          <input
                            type="number"
                            min={2024}
                            max={2030}
                            value={anoVigencia}
                            onChange={e => setAnoVigencia(Number(e.target.value))}
                            required
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Data Desejada para Folga
                          </label>
                          <input
                            type="date"
                            value={dayOffDataSolicitada}
                            min={calc.janelaInicio}
                            max={calc.janelaFim}
                            onChange={e => setDayOffDataSolicitada(e.target.value)}
                            required
                            className={clsx(
                              "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-white text-xs font-bold focus:outline-none",
                              foraDaJanela ? "border-amber-500 text-amber-300 focus:border-amber-400" : "border-slate-700 focus:border-pink-500"
                            )}
                          />
                        </div>
                      </div>

                      {foraDaJanela && (
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-300">Aviso sobre o Prazo</p>
                            <p className="text-[11px] text-amber-200/90">
                              A data selecionada não está dentro da janela de 30 dias do mês de aniversário ({formatDateDisplay(calc.janelaInicio)} a {formatDateDisplay(calc.janelaFim)}). O pedido passará por aprovação especial do RH.
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Observações (Opcional)
                        </label>
                        <textarea
                          value={dayOffObs}
                          onChange={e => setDayOffObs(e.target.value)}
                          placeholder="Ex: Gostaria de folgar na sexta-feira seguinte ao meu aniversário..."
                          rows={2}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-pink-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDayOffModalOpen(false)
                        setEditingDayOffId(null)
                      }}
                      className="btn-secondary flex-1 py-2.5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoDayOff || !calc}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-500/20"
                    >
                      {editingDayOffId ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      <span>
                        {salvandoDayOff 
                          ? (editingDayOffId ? 'Salvando...' : 'Enviando...') 
                          : (editingDayOffId ? 'Salvar Alterações' : 'Enviar Solicitação')}
                      </span>
                    </button>
                  </div>
                </form>
              )
            })()}
          </div>
        </div>
      )}

      {/* ================= MODAL EDITAR ESCALA HOME OFFICE ================= */}
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
              {/* Seleção do Colaborador (se Gestor/Admin) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Colaborador
                </label>
                {isGestorRh ? (
                  <select
                    value={editingHomeOffice.usuario_id}
                    onChange={e => {
                      const selId = e.target.value
                      const targetUser = usuarios.find(u => u.id === selId)
                      if (targetUser) {
                        handleAbrirEdicaoHomeOffice(targetUser)
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500"
                  >
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={editingHomeOffice.usuario_nome}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs font-bold"
                  />
                )}
              </div>

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

              {editingHomeOffice.modalidade === 'Híbrido' && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Dias da Semana em Home Office
                  </label>
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

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observações / Detalhes de Alocação
                </label>
                <textarea
                  value={editingHomeOffice.observacoes}
                  onChange={e => setEditingHomeOffice({ ...editingHomeOffice, observacoes: e.target.value })}
                  placeholder="Ex: Escala de plantão ou flexibilidade acordada..."
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
                  <h2 className="text-base font-bold text-white">{editingFaltaId ? 'Corrigir Falta / Atestado' : 'Comunicar Falta / Enviar Atestado'}</h2>
                  <p className="text-xs text-slate-400">{editingFaltaId ? 'Ajuste as datas e informações do registro' : 'Envio de justificativa e comprovante médico'}</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsFaltaModalOpen(false); setEditingFaltaId(null) }} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarFalta} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Seleção do Colaborador (se Gestor/Admin) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Colaborador
                </label>
                {isGestorRh ? (
                  <select
                    value={faltaUsuarioId}
                    onChange={e => {
                      const selId = e.target.value
                      setFaltaUsuarioId(selId)
                      const found = usuarios.find(u => u.id === selId)
                      if (found) setFaltaUsuarioNome(found.nome)
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-emerald-500"
                  >
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={user?.nome || user?.login || 'Colaborador'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs font-bold"
                  />
                )}
              </div>

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

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Detalhes / Justificativa
                </label>
                <textarea
                  value={descricaoFalta}
                  onChange={e => setDescricaoFalta(e.target.value)}
                  placeholder="Informações adicionais para o RH..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsFaltaModalOpen(false); setEditingFaltaId(null) }}
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
                  <span>{salvandoFalta ? 'Salvando...' : editingFaltaId ? 'Salvar Correção' : 'Registrar Falta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL AVALIAÇÃO RH (ADMIN) ================= */}
      {itemAvaliacao && isGestorRh && (
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
              {itemAvaliacao.type === 'ferias' && (
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Período Selecionado:</span>
                    <strong className="text-white">
                      1ª Q: {formatDateDisplay(itemAvaliacao.item.quinzena_1_inicio)} a {formatDateDisplay(itemAvaliacao.item.quinzena_1_fim)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const itemToEdit = itemAvaliacao.item
                      setItemAvaliacao(null)
                      handleAbrirModalFerias(undefined, itemToEdit)
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 border border-brand-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Corrigir Datas
                  </button>
                </div>
              )}

              {itemAvaliacao.type === 'dayoff' && (
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Data Solicitada (Day Off):</span>
                    <strong className="text-pink-400 text-sm">
                      🎂 {formatDateDisplay(itemAvaliacao.item.data_solicitada)}
                    </strong>
                    {itemAvaliacao.item.data_nascimento && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Nascimento: {formatDateDisplay(itemAvaliacao.item.data_nascimento)} {calcularIdade(itemAvaliacao.item.data_nascimento) !== null ? `(${calcularIdade(itemAvaliacao.item.data_nascimento)} anos)` : ''}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const itemToEdit = itemAvaliacao.item
                      setItemAvaliacao(null)
                      handleAbrirModalDayOff(undefined, itemToEdit)
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-pink-500/15 text-pink-300 hover:bg-pink-500/25 border border-pink-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Alterar Data
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Decisão do RH
                </label>
                <select
                  value={statusAvaliacao}
                  onChange={e => setStatusAvaliacao(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-brand-500"
                >
                  {itemAvaliacao.type === 'ferias' || itemAvaliacao.type === 'dayoff' ? (
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

      {/* ================= MODAL CONTROLE DE PONTO ================= */}
      <ControlePontoModal
        isOpen={isPontoModalOpen}
        onClose={() => setIsPontoModalOpen(false)}
      />

      {/* ================= MODAL LISTA DE FUNCIONÁRIOS ================= */}
      {isFuncionariosModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60 rounded-t-2xl sm:rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Funcionários</h2>
                  <p className="text-xs text-slate-400">{usuarios.length} colaboradores • clique para ver o resumo</p>
                </div>
              </div>
              <button
                onClick={() => setIsFuncionariosModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto">
              {[...usuarios].sort((a, b) => a.nome.localeCompare(b.nome)).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setFuncionarioResumo(u); setIsFuncionariosModalOpen(false) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-700">
                    {u.foto_url ? (
                      <img src={u.foto_url} alt={u.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 text-slate-300 flex items-center justify-center text-sm font-bold uppercase">
                        {u.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{u.nome}</p>
                    <span className="text-[11px] text-slate-400 capitalize">{u.perfil}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL RESUMO DO FUNCIONÁRIO ================= */}
      {funcionarioResumo && (() => {
        const u = funcionarioResumo
        const jornadaU = todasJornadasEquipe.find(j => j.usuario_id === u.id)
        const feriasU = todasFeriasEquipe.filter(f => f.usuario_id === u.id || f.usuario_nome.toLowerCase() === u.nome.toLowerCase())
        const faltasU = todasFaltasEquipe.filter(f => f.usuario_id === u.id || f.usuario_nome.toLowerCase() === u.nome.toLowerCase())
        const hoU = todasEscalasEquipe.find(h => h.usuario_id === u.id || h.usuario_nome.toLowerCase() === u.nome.toLowerCase())
        const plantoesU = todosPlantoesEquipe.filter(p => p.tecnico_id === u.id || p.tecnico_nome.toLowerCase() === u.nome.toLowerCase())
        const saldoBanco = bancoHorasPorColaborador.get(u.id) ?? 0

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-dark-card border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl sm:max-w-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-hidden">
              
              {/* Seção Superior: Foto em Destaque (Esquerda) + Perfil & Contatos (Direita) */}
              <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 relative overflow-hidden shrink-0">
                {/* Glow decorativo de fundo */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row gap-5 items-start relative z-10">
                  {/* Foto Grande em Destaque (Esquerda) */}
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <div className="w-36 h-44 sm:w-44 sm:h-52 rounded-3xl overflow-hidden border-2 border-rose-500/40 ring-4 ring-rose-500/20 shadow-2xl shadow-rose-950/40 bg-slate-950 flex items-center justify-center group transition-transform hover:scale-[1.02]">
                      {u.foto_url ? (
                        <img src={u.foto_url} alt={u.nome} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-900/60 via-purple-900/60 to-slate-950 text-rose-200 flex flex-col items-center justify-center text-4xl font-black uppercase shadow-inner">
                          <span>{u.nome.charAt(0)}</span>
                          <span className="text-[10px] tracking-widest text-slate-400 font-semibold mt-1">SEM FOTO</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lado Direito: Nome + Perfil + Botões + Dados Cadastrais */}
                  <div className="flex-1 min-w-0 w-full flex flex-col gap-3">
                    {/* Linha de Nome e Ações */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">{u.nome}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold capitalize">
                            {u.perfil}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            @{u.login}
                          </span>
                        </div>
                      </div>

                      {/* Botão Editar & Fechar */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEditandoFuncionario && (
                          <button
                            type="button"
                            onClick={handleIniciarEdicaoFuncionario}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            title="Editar e-mails e data de nascimento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        )}
                        <button
                          onClick={() => { setFuncionarioResumo(null); setIsEditandoFuncionario(false) }}
                          className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Card: Dados Cadastrais & Contatos */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/85 border border-slate-800 space-y-2.5 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                        Dados Cadastrais & Contatos
                      </p>

                      {isEditandoFuncionario ? (
                        <form onSubmit={handleSalvarDadosFuncionario} className="space-y-2.5 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-0.5 flex items-center gap-1">
                              <Cake className="w-3 h-3 text-pink-400" />
                              Data de Nascimento
                            </label>
                            <input
                              type="date"
                              value={editFuncDataNasc}
                              onChange={e => setEditFuncDataNasc(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-cyan-400" />
                              E-mail Empresa
                            </label>
                            <input
                              type="email"
                              placeholder="ex: nome@mantran.com.br"
                              value={editFuncEmailCorp}
                              onChange={e => setEditFuncEmailCorp(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-0.5 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-amber-400" />
                              E-mail Particular
                            </label>
                            <input
                              type="email"
                              placeholder="ex: particular@gmail.com"
                              value={editFuncEmailPessoal}
                              onChange={e => setEditFuncEmailPessoal(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500"
                            />
                          </div>

                          <div className="pt-1 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditandoFuncionario(false)}
                              className="btn-secondary flex-1 py-1 text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={salvandoFuncionarioDados}
                              className="btn-primary flex-1 py-1 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>{salvandoFuncionarioDados ? 'Salvando...' : 'Salvar'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between py-0.5 border-b border-slate-800/60">
                            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                              <Cake className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                              Data de Nascimento
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={clsx("font-bold text-xs", u.data_nascimento ? "text-pink-400" : "text-slate-500 italic")}>
                                {u.data_nascimento ? formatDateDisplay(u.data_nascimento) : 'Não informada'}
                              </span>
                              {u.data_nascimento && calcularIdade(u.data_nascimento) !== null && (
                                <span className="px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[10px] font-bold">
                                  {calcularIdade(u.data_nascimento)} anos
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-0.5 border-b border-slate-800/60">
                            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                              <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              E-mail Empresa
                            </span>
                            <span className={clsx("font-medium truncate max-w-[180px] text-[11px]", u.email_corporativo ? "text-cyan-300 font-mono" : "text-slate-500 italic")} title={u.email_corporativo || ''}>
                              {u.email_corporativo ? (
                                <a href={`mailto:${u.email_corporativo}`} className="hover:underline">
                                  {u.email_corporativo}
                                </a>
                              ) : 'Não informado'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-0.5">
                            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                              <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              E-mail Particular
                            </span>
                            <span className={clsx("font-medium truncate max-w-[180px] text-[11px]", u.email_pessoal ? "text-amber-300 font-mono" : "text-slate-500 italic")} title={u.email_pessoal || ''}>
                              {u.email_pessoal ? (
                                <a href={`mailto:${u.email_pessoal}`} className="hover:underline">
                                  {u.email_pessoal}
                                </a>
                              ) : 'Não informado'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Inferior: Indicadores e Jornada */}
              <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto">
                {/* Jornada */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Jornada</p>
                  {jornadaU ? (
                    <p className="text-sm sm:text-base font-bold text-white tabular-nums">
                      {(jornadaU.hora_entrada || '').slice(0, 5)} às {(jornadaU.hora_saida || '').slice(0, 5)}
                      {jornadaU.almoco_inicio && (
                        <span className="text-xs text-slate-400 font-normal"> • almoço {(jornadaU.almoco_inicio || '').slice(0, 5)}–{(jornadaU.almoco_fim || '').slice(0, 5)}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Não definida</p>
                  )}
                </div>

                {/* Grid de indicadores */}
                <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Banco de Horas</p>
                    <p className={clsx(
                      'text-xl font-black tabular-nums mt-1',
                      saldoBanco > 0 ? 'text-emerald-400' : saldoBanco < 0 ? 'text-rose-400' : 'text-slate-300'
                    )}>
                      {formatSaldo(saldoBanco)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Regime</p>
                    <p className="text-base font-bold text-cyan-400 mt-1">{hoU?.modalidade || 'Presencial'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Férias no Ano</p>
                    <p className="text-base font-bold text-teal-400 mt-1">{feriasU.length} período(s)</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Faltas / Atestados</p>
                    <p className="text-base font-bold text-amber-400 mt-1">{faltasU.length} registro(s)</p>
                  </div>
                </div>

                {plantoesU.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Plantões realizados</span>
                    <span className="text-sm font-bold text-amber-400">{plantoesU.length} fim(ns) de semana</span>
                  </div>
                )}
              </div>

              {/* Botão Fechar no rodapé */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/40 shrink-0">
                <button
                  type="button"
                  onClick={() => { setFuncionarioResumo(null); setIsEditandoFuncionario(false) }}
                  className="btn-secondary w-full py-2.5 font-bold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ================= MODAL JORNADA DE TRABALHO ================= */}
      {editingJornada && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">

            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60 rounded-t-2xl sm:rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Jornada de Trabalho</h2>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">{editingJornada.usuario_nome}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingJornada(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarJornada} className="p-6 space-y-5 overflow-y-auto">
              {/* Dias da semana */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Dias de Trabalho
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {([
                    { key: 'segunda', label: 'Seg' },
                    { key: 'terca', label: 'Ter' },
                    { key: 'quarta', label: 'Qua' },
                    { key: 'quinta', label: 'Qui' },
                    { key: 'sexta', label: 'Sex' },
                    { key: 'sabado', label: 'Sáb' },
                    { key: 'domingo', label: 'Dom' },
                  ] as { key: keyof typeof editingJornada; label: string }[]).map(d => {
                    const ativo = editingJornada[d.key] as boolean
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setEditingJornada({ ...editingJornada, [d.key]: !ativo })}
                        className={clsx(
                          'py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                          ativo
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                        )}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Horário de expediente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Entrada
                  </label>
                  <input
                    type="time"
                    value={editingJornada.hora_entrada}
                    onChange={e => setEditingJornada({ ...editingJornada, hora_entrada: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-bold focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Saída
                  </label>
                  <input
                    type="time"
                    value={editingJornada.hora_saida}
                    onChange={e => setEditingJornada({ ...editingJornada, hora_saida: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-bold focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Horário de almoço */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Almoço - Início
                  </label>
                  <input
                    type="time"
                    value={editingJornada.almoco_inicio}
                    onChange={e => setEditingJornada({ ...editingJornada, almoco_inicio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-bold focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Almoço - Fim
                  </label>
                  <input
                    type="time"
                    value={editingJornada.almoco_fim}
                    onChange={e => setEditingJornada({ ...editingJornada, almoco_fim: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-bold focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observações
                </label>
                <textarea
                  value={editingJornada.observacoes}
                  onChange={e => setEditingJornada({ ...editingJornada, observacoes: e.target.value })}
                  placeholder="Ex: Escala especial, banco de horas, etc."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="pt-1 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingJornada(null)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoJornada}
                  className="py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs flex-1 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvandoJornada ? 'Salvando...' : 'Salvar Jornada'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
