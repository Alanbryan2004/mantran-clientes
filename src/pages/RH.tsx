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
  DollarSign 
} from 'lucide-react'
import { 
  api, 
  type SolicitacaoFerias, 
  type FaltaAtestado, 
  type EscalaHomeOffice,
  type PlantaoTecnico,
  type UsuarioSistema 
} from '../lib/api'
import { getLoggedUser, isAdminUser } from '../lib/auth'
import clsx from 'clsx'

export function RH() {
  const user = getLoggedUser()
  const isAdmin = isAdminUser()
  const isGestorRh = isAdmin || user?.perfil?.trim().toLowerCase() === 'rh'
  const isTecnico = user?.perfil?.trim().toLowerCase() === 'tecnico' || user?.perfil?.trim().toLowerCase() === 'administrador'

  // Abas de navegação:
  // Se for Gestor/Admin: 'dashboard' | 'ferias_equipe' | 'plantoes_equipe' | 'home_office_equipe' | 'faltas_equipe' | 'equipe_dossie' | 'gestao_aprovacoes'
  // Se for Colaborador: 'minhas_ferias' | 'meus_plantoes' | 'meu_home_office' | 'minhas_faltas'
  const [tab, setTab] = useState<string>(isGestorRh ? 'dashboard' : 'minhas_ferias')
  const [loading, setLoading] = useState(true)

  // Listas de dados
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [todasFeriasEquipe, setTodasFeriasEquipe] = useState<SolicitacaoFerias[]>([])
  const [todasFaltasEquipe, setTodasFaltasEquipe] = useState<FaltaAtestado[]>([])
  const [todasEscalasEquipe, setTodasEscalasEquipe] = useState<EscalaHomeOffice[]>([])
  const [todosPlantoesEquipe, setTodosPlantoesEquipe] = useState<PlantaoTecnico[]>([])

  // Filtros & Buscas
      const [anoVigencia, setAnoVigencia] = useState(new Date().getFullYear())

  // Modal Solicitar Férias
  const [isFeriasModalOpen, setIsFeriasModalOpen] = useState(false)
  const [feriasUsuarioId, setFeriasUsuarioId] = useState('')
  const [feriasUsuarioNome, setFeriasUsuarioNome] = useState('')
  const [q1Inicio, setQ1Inicio] = useState('')
  const [q1Fim, setQ1Fim] = useState('')
  const [q2Inicio, setQ2Inicio] = useState('')
  const [q2Fim, setQ2Fim] = useState('')
  const [feriasObs, setFeriasObs] = useState('')
  const [salvandoFerias, setSalvandoFerias] = useState(false)

  // Modal Comunicar Falta / Enviar Atestado
  const [isFaltaModalOpen, setIsFaltaModalOpen] = useState(false)
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

  // Modal Avaliação Férias/Faltas RH (Admin)
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
      const [allUsers, todasFerias, faltas, escalas, plantoes] = await Promise.all([
        api.getUsuariosSistema().catch(() => []),
        api.getSolicitacoesFerias().catch(() => []),
        api.getFaltasEAtestados().catch(() => []),
        api.getEscalasHomeOffice().catch(() => []),
        api.getPlantoes().catch(() => [])
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

      setUsuarios(funcionariosMantran)
      setTodasFeriasEquipe((todasFerias || []).filter(isRecordDeFuncionario))
      setTodasFaltasEquipe((faltas || []).filter(isRecordDeFuncionario))
      setTodasEscalasEquipe((escalas || []).filter(isRecordDeFuncionario))
      setTodosPlantoesEquipe(plantoes || [])
    } catch (err) {
      console.error('Erro ao carregar dados do portal de RH:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtragem dos dados do próprio usuário logado
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
    const faltasPendentes = todasFaltasEquipe.filter(f => f.status === 'Pendente' || f.status === 'Em Análise')

    return {
      totalColaboradores: usuarios.length || 8,
      emFeriasHoje,
      emAtestadoHoje,
      emHomeOfficeHoje,
      proximoPlantao,
      plantoesPendentesPagamento,
      totalValorPendente,
      feriasPendentes,
      faltasPendentes
    }
  }, [todasFeriasEquipe, todasFaltasEquipe, todasEscalasEquipe, todosPlantoesEquipe, usuarios, hojeStr, diaAtualProp, proximoPlantao])

  // Verificação estrita de conflito de férias entre colaboradores
  const checkConflitoPeriodo = (inicio: string, fim: string, quinzenaNum: 1 | 2, currentUserId?: string, currentUserName?: string) => {
    if (!inicio || !fim) return null

    const targetId = currentUserId || user?.id
    const targetNome = (currentUserName || user?.nome || '').toLowerCase()

    for (const f of todasFeriasEquipe) {
      if (f.status === 'Reprovado') continue
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

  const handleAbrirModalFerias = (colaboradorPre?: { id: string; nome: string }) => {
    setFeriasUsuarioId(colaboradorPre?.id || user?.id || (usuarios[0]?.id || ''))
    setFeriasUsuarioNome(colaboradorPre?.nome || user?.nome || user?.login || (usuarios[0]?.nome || 'Colaborador'))
    setQ1Inicio('')
    setQ1Fim('')
    setQ2Inicio('')
    setQ2Fim('')
    setFeriasObs('')
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

      setIsFeriasModalOpen(false)
      setQ1Inicio('')
      setQ1Fim('')
      setQ2Inicio('')
      setQ2Fim('')
      setFeriasObs('')
      await fetchData()
      alert('Solicitação de férias registrada com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao enviar solicitação: ' + err.message)
    } finally {
      setSalvandoFerias(false)
    }
  }

  const handleAbrirModalFalta = (colaboradorPre?: { id: string; nome: string }) => {
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
      alert('Avaliação de RH confirmada com sucesso!')
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* ================= TOP HEADER BANNER ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/50 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-brand-500/5 to-transparent pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-teal-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/10">
              {isGestorRh ? <Users2 className="w-6 h-6" /> : <Palmtree className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {isGestorRh ? 'Recursos Humanos & Gestão de Pessoas' : 'Portal do Colaborador - RH'}
              </h1>
              <p className="text-xs text-slate-400">
                {isGestorRh 
                  ? 'Gestão de Férias, Plantões de Fim de Semana (Técnicos), Escala de Home Office, Faltas/Atestados e Folha'
                  : 'Minhas férias em 2 quinzenas, informar plantão de final de semana, home office e atestados'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            type="button"
            onClick={() => handleAbrirModalFerias()}
            className="btn-primary py-2.5 px-4 flex items-center gap-2 text-xs font-bold shadow-lg shadow-brand-500/20 cursor-pointer"
          >
            <Palmtree className="w-4 h-4" />
            <span>Solicitar Férias</span>
          </button>

          {/* Botão de Plantão para Técnicos e RH */}
          {(isTecnico || isGestorRh) && (
            <button
              type="button"
              onClick={() => handleAbrirModalPlantao()}
              className="py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>Informar Plantão</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAbrirEdicaoHomeOffice()}
            className="py-2.5 px-4 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span>{isGestorRh ? 'Escala Home Office' : 'Meu Home Office'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAbrirModalFalta()}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Atestado / Falta</span>
          </button>

          {/* Botão / Badge Gestão & RH posicionado depois do Atestado / Falta */}
          {isGestorRh && (
            <div className="py-2.5 px-3.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 shadow-sm select-none">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Gestão & RH</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= NAVIGATION TABS ================= */}
      {isGestorRh ? (
        /* --- ABAS PARA GESTOR / ADMIN --- */
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 flex-wrap">
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
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto",
              tab === 'gestao_aprovacoes'
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/30 border border-purple-500/20"
            )}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Aprovações</span>
            {kpis.feriasPendentes.length + kpis.faltasPendentes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 font-mono font-bold">
                {kpis.feriasPendentes.length + kpis.faltasPendentes.length}
              </span>
            )}
          </button>
        </div>
      ) : (
        /* --- ABAS PARA COLABORADOR COMUM (NÃO-ADMIN) --- */
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
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
              <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">Regra de Férias Mantran (2 Quinzenas):</p>
                  <p className="text-slate-400">
                    Você tem direito a <strong>2 quinzenas separadas (15 dias cada)</strong>. 
                    Nenhum colaborador pode tirar férias no mesmo período que outro colega. 
                    Clique em <strong>"Solicitar Férias"</strong> acima para agendar seu período.
                  </p>
                </div>
              </div>

              {minhasFerias.length === 0 ? (
                <div className="bg-dark-card border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 mx-auto flex items-center justify-center text-slate-500">
                    <Palmtree className="w-7 h-7 opacity-60" />
                  </div>
                  <h3 className="text-base font-bold text-white">Nenhuma solicitação de férias cadastrada</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Planeje suas 2 quinzenas de descanso clicando no botão "Solicitar Férias" no topo.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {minhasFeriasOrdenadas.map((f) => (
                    <div 
                      key={f.id} 
                      className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all"
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
                        {f.aprovado_por && (
                          <span>Avaliado por: <strong className="text-slate-300">{f.aprovado_por}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
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
                <div className="bg-dark-card border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                    <PhoneCall className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white">Nenhum plantão registrado ainda</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Esteve de plantão no final de semana? Clique em "Informar Plantão" acima para registrar as datas e garantir o pagamento pelo RH.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {meusPlantoes.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 hover:border-slate-700 transition-all"
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
            <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { key: 'segunda', label: 'Segunda' },
                      { key: 'terca', label: 'Terça' },
                      { key: 'quarta', label: 'Quarta' },
                      { key: 'quinta', label: 'Quinta' },
                      { key: 'sexta', label: 'Sexta' },
                      { key: 'sabado', label: 'Sábado' },
                    ].map(d => {
                      const isRemoto = meuHomeOffice?.modalidade === '100% Remoto' || (meuHomeOffice as any)?.[d.key]
                      return (
                        <span 
                          key={d.key}
                          className={clsx(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border",
                            isRemoto 
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" 
                              : "bg-slate-950 text-slate-600 border-slate-800"
                          )}
                        >
                          {d.label}: {isRemoto ? '🏠 Casa' : '🏢 Escritório'}
                        </span>
                      )
                    })}
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
                <div className="bg-dark-card border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 mx-auto flex items-center justify-center text-slate-500">
                    <FileText className="w-7 h-7 opacity-60" />
                  </div>
                  <h3 className="text-base font-bold text-white">Nenhum atestado ou falta registrada</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Precisa justificar um dia de ausência médica? Clique em "Novo Atestado / Falta" acima.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {minhasFaltas.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
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
                <div className="bg-dark-card border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
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
                <div className="bg-dark-card border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
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
                  <p className="mt-2 text-[11px] text-teal-300/80 truncate">
                    {kpis.emFeriasHoje.length > 0 
                      ? kpis.emFeriasHoje.map(f => f.usuario_nome).join(', ')
                      : 'Nenhum colaborador em férias hoje'}
                  </p>
                </div>

                {/* 3. Home Office Hoje */}
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
                  <p className="mt-2 text-[11px] text-cyan-300/80 truncate">
                    {kpis.emHomeOfficeHoje.length > 0
                      ? kpis.emHomeOfficeHoje.map(h => h.usuario_nome).join(', ')
                      : 'Toda equipe em presencial hoje'}
                  </p>
                </div>

                {/* 4. Quadro Mantran */}
                <div className="bg-dark-card border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
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
              <div className="bg-dark-card border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-brand-400" />
                      Presença & Alocação da Equipe Hoje ({new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })})
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
                    </div>
                  </div>
                ))}
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
                        <th className="p-4 text-center">Hoje</th>
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
                    className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
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
                ))}
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
                Fila de Pendências de RH ({kpis.feriasPendentes.length + kpis.faltasPendentes.length})
              </h3>
              
              <div className="space-y-3">
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
                        {salvandoFerias ? 'Enviando...' : temConflito ? 'Período Bloqueado' : 'Enviar Solicitação'}
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
