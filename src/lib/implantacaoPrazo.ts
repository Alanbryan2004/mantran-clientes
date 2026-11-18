export const PRAZO_TOTAL_DIAS = 40
export const DIAS_INICIO_ALERTA = 30

export const SHOPEE_ETAPAS_ORDER: Record<string, number> = {
  'checkpoint': 1,
  'configurar base': 2,
  'testes': 3,
  'treinamento de cadastros': 4,
  'treinamento de cadastro': 4,
  'treinamento cadastros': 4,
  'treinamento cadastro': 4,
  'treinamento de line haul': 5,
  'treinamento line haul': 5,
  'envio da primeira prefatura': 6,
  'envio da primeira pré-fatura': 6,
  'envio da primeira fatura/nf': 7,
  'treinamento de last mile': 8,
  'treinamento last mile': 8,
  'treinamento de first mile': 9,
  'treinamento first mile': 9,
  'treinamento de mobile hub': 10,
  'treinamento mobile hub': 10,
  'treinamento de fatura': 11,
  'treinamento fatura': 11,
  'nfse': 12,
  'treinamento nfse': 12,
  'mercado livre': 12,
  'treinamento meli': 12,
  'feedback': 13,
  'ativo 4pl': 14,
  'ativo 4pi': 14,
}

export const sortEtapasWithOrder = (list: any[], isShopee: boolean = false) => {
  if (!list || list.length === 0) return []
  return [...list].sort((a, b) => {
    const keyA = (a.nome_etapa || '').trim().toLowerCase()
    const keyB = (b.nome_etapa || '').trim().toLowerCase()

    if (isShopee) {
      const orderA = SHOPEE_ETAPAS_ORDER[keyA] ?? (keyA === 'feedback' ? 999 : (a.ordem || 50))
      const orderB = SHOPEE_ETAPAS_ORDER[keyB] ?? (keyB === 'feedback' ? 999 : (b.ordem || 50))
      if (orderA !== orderB) return orderA - orderB
    }

    if (keyA === 'feedback') return 1
    if (keyB === 'feedback') return -1
    return (a.ordem || 0) - (b.ordem || 0)
  })
}

export interface PrazoImplantacaoInfo {
  dataCriacaoStr: string
  dataLimiteStr: string
  dataLimiteISO: string | null
  origemDataLimite: 'feedback' | 'padrao_40d'
  diasCorridos: number
  diasRestantes: number
  estourou: boolean
  diasAtraso: number
  status: 'ok' | 'alerta' | 'estourado' | 'concluido'
  // Estilização dinâmica
  hue: number
  accentColor: string
  borderColor: string
  borderHoverColor: string
  bgGradient: string
  boxShadow: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
  labelStatus: string
}

/**
 * Normaliza uma data para o início do dia (00:00:00) local para comparações seguras de dias corridos.
 */
function toMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Calcula o prazo de uma implantação.
 * Regra:
 * - Quando tiver data definida de Feedback, assume a Data do Feedback como Data Limite.
 * - Caso não tiver data no Feedback, assume o prazo padrão de 40 dias corridos a partir da criação.
 */
export function calcularPrazoImplantacao(
  createdAt: string | Date | null | undefined,
  isConcluido: boolean = false,
  dataFeedback?: string | Date | null
): PrazoImplantacaoInfo {
  if (!createdAt) {
    return {
      dataCriacaoStr: '-',
      dataLimiteStr: '-',
      dataLimiteISO: null,
      origemDataLimite: 'padrao_40d',
      diasCorridos: 0,
      diasRestantes: PRAZO_TOTAL_DIAS,
      estourou: false,
      diasAtraso: 0,
      status: 'ok',
      hue: 142,
      accentColor: '#10b981',
      borderColor: 'rgba(30, 41, 59, 1)',
      borderHoverColor: 'rgba(59, 130, 246, 0.4)',
      bgGradient: 'transparent',
      boxShadow: 'none',
      badgeBg: 'rgba(16, 185, 129, 0.1)',
      badgeBorder: 'rgba(16, 185, 129, 0.25)',
      badgeText: '#34d399',
      labelStatus: `Restam ${PRAZO_TOTAL_DIAS} dias`,
    }
  }

  const rawCriacao = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const dataCriacaoMid = toMidnight(rawCriacao)
  const hojeMid = toMidnight(new Date())

  const rawFeedback = dataFeedback ? (typeof dataFeedback === 'string' ? new Date(dataFeedback) : dataFeedback) : null
  const temDataFeedback = !!rawFeedback && !isNaN(rawFeedback.getTime())

  let dataLimite: Date
  let origemDataLimite: 'feedback' | 'padrao_40d' = 'padrao_40d'

  if (temDataFeedback) {
    dataLimite = toMidnight(rawFeedback!)
    origemDataLimite = 'feedback'
  } else {
    dataLimite = new Date(dataCriacaoMid)
    dataLimite.setDate(dataLimite.getDate() + PRAZO_TOTAL_DIAS)
    origemDataLimite = 'padrao_40d'
  }

  const diffMsCriacao = hojeMid.getTime() - dataCriacaoMid.getTime()
  const diasCorridos = Math.max(0, Math.floor(diffMsCriacao / (1000 * 60 * 60 * 24)))

  const dataCriacaoStr = rawCriacao.toLocaleDateString('pt-BR')
  const dataLimiteStr = dataLimite.toLocaleDateString('pt-BR')
  const dataLimiteISO = dataLimite.toISOString()

  // Se concluído, visual verde de sucesso e neutro
  if (isConcluido) {
    return {
      dataCriacaoStr,
      dataLimiteStr,
      dataLimiteISO,
      origemDataLimite,
      diasCorridos,
      diasRestantes: 0,
      estourou: false,
      diasAtraso: 0,
      status: 'concluido',
      hue: 142,
      accentColor: '#10b981',
      borderColor: 'rgba(30, 41, 59, 1)',
      borderHoverColor: 'rgba(16, 185, 129, 0.4)',
      bgGradient: 'transparent',
      boxShadow: 'none',
      badgeBg: 'rgba(16, 185, 129, 0.1)',
      badgeBorder: 'rgba(16, 185, 129, 0.25)',
      badgeText: '#34d399',
      labelStatus: 'Concluído',
    }
  }

  // Cálculo de dias restantes e atraso em relação à dataLimite
  const diffMsLimite = dataLimite.getTime() - hojeMid.getTime()
  const diasRestantes = Math.max(0, Math.ceil(diffMsLimite / (1000 * 60 * 60 * 24)))
  const estourou = hojeMid.getTime() > dataLimite.getTime()
  const diasAtraso = estourou
    ? Math.max(1, Math.floor((hojeMid.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  // Prazo Estourado (data limite já foi ultrapassada e não está concluído)
  if (estourou) {
    const labelStatus = diasAtraso === 0 
      ? 'Prazo estourou hoje!' 
      : `Estourado (+${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'})`

    return {
      dataCriacaoStr,
      dataLimiteStr,
      dataLimiteISO,
      origemDataLimite,
      diasCorridos,
      diasRestantes: 0,
      estourou: true,
      diasAtraso,
      status: 'estourado',
      hue: 0,
      accentColor: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.75)',
      borderHoverColor: 'rgba(239, 68, 68, 1)',
      bgGradient: 'linear-gradient(180deg, rgba(239, 68, 68, 0.14) 0%, rgba(15, 23, 42, 0.95) 100%)',
      boxShadow: '0 0 18px rgba(239, 68, 68, 0.22)',
      badgeBg: 'rgba(239, 68, 68, 0.22)',
      badgeBorder: 'rgba(239, 68, 68, 0.55)',
      badgeText: '#fca5a5',
      labelStatus,
    }
  }

  // Se a data limite veio do Feedback:
  // Alerta quando restarem 5 dias ou menos para a data do Feedback
  if (origemDataLimite === 'feedback') {
    if (diasRestantes <= 5) {
      return {
        dataCriacaoStr,
        dataLimiteStr,
        dataLimiteISO,
        origemDataLimite,
        diasCorridos,
        diasRestantes,
        estourou: false,
        diasAtraso: 0,
        status: 'alerta',
        hue: 40,
        accentColor: '#f59e0b',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        borderHoverColor: 'rgba(245, 158, 11, 0.8)',
        bgGradient: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
        boxShadow: '0 0 14px rgba(245, 158, 11, 0.15)',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeBorder: 'rgba(245, 158, 11, 0.4)',
        badgeText: '#fcd34d',
        labelStatus: `Restam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`,
      }
    }

    return {
      dataCriacaoStr,
      dataLimiteStr,
      dataLimiteISO,
      origemDataLimite,
      diasCorridos,
      diasRestantes,
      estourou: false,
      diasAtraso: 0,
      status: 'ok',
      hue: 142,
      accentColor: '#10b981',
      borderColor: 'rgba(30, 41, 59, 1)',
      borderHoverColor: 'rgba(59, 130, 246, 0.4)',
      bgGradient: 'transparent',
      boxShadow: 'none',
      badgeBg: 'rgba(16, 185, 129, 0.1)',
      badgeBorder: 'rgba(16, 185, 129, 0.25)',
      badgeText: '#34d399',
      labelStatus: `Restam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`,
    }
  }

  // Prazo padrão de 40 dias:
  // Passou de 30 dias e se aproximando de 40 dias (31 a 39 dias)
  // Começa Amarelo (dia 31) e vai avermelhando progressivamente a cada dia
  if (diasCorridos > DIAS_INICIO_ALERTA) {
    const t = Math.min(1, Math.max(0, (diasCorridos - DIAS_INICIO_ALERTA) / (PRAZO_TOTAL_DIAS - DIAS_INICIO_ALERTA)))
    const hue = Math.round(48 - t * 44)
    const accentColor = `hsl(${hue}, 96%, 50%)`
    const borderColor = `hsla(${hue}, 92%, 50%, ${0.4 + t * 0.3})`
    const borderHoverColor = `hsla(${hue}, 96%, 50%, 0.85)`
    const bgGradient = `linear-gradient(180deg, hsla(${hue}, 90%, 50%, ${0.06 + t * 0.05}) 0%, rgba(15, 23, 42, 0.95) 100%)`
    const boxShadow = `0 0 14px hsla(${hue}, 90%, 50%, ${0.12 + t * 0.1})`
    const badgeBg = `hsla(${hue}, 90%, 50%, 0.15)`
    const badgeBorder = `hsla(${hue}, 90%, 50%, 0.4)`
    const badgeText = `hsl(${hue}, 95%, 75%)`

    return {
      dataCriacaoStr,
      dataLimiteStr,
      dataLimiteISO,
      origemDataLimite,
      diasCorridos,
      diasRestantes,
      estourou: false,
      diasAtraso: 0,
      status: 'alerta',
      hue,
      accentColor,
      borderColor,
      borderHoverColor,
      bgGradient,
      boxShadow,
      badgeBg,
      badgeBorder,
      badgeText,
      labelStatus: `Restam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`,
    }
  }

  // Até 30 dias: Dentro do prazo / Verde seguro
  return {
    dataCriacaoStr,
    dataLimiteStr,
    dataLimiteISO,
    origemDataLimite,
    diasCorridos,
    diasRestantes,
    estourou: false,
    diasAtraso: 0,
    status: 'ok',
    hue: 142,
    accentColor: '#10b981',
    borderColor: 'rgba(30, 41, 59, 1)',
    borderHoverColor: 'rgba(59, 130, 246, 0.4)',
    bgGradient: 'transparent',
    boxShadow: 'none',
    badgeBg: 'rgba(16, 185, 129, 0.1)',
    badgeBorder: 'rgba(16, 185, 129, 0.25)',
    badgeText: '#34d399',
    labelStatus: `Restam ${diasRestantes} dias`,
  }
}

/**
 * Extrai a data definida de Feedback de uma implantação (se houver).
 * Se Feedback tiver data agendada ou se a etapa imediatamente anterior ao Feedback
 * na ordem das etapas tiver data definida (+15 dias), retorna essa data.
 * Caso o card anterior ao Feedback não tenha data definida, retorna null.
 */
export function extrairDataFeedback(implantacao: any): string | null {
  if (!implantacao) return null
  const cp = Array.isArray(implantacao.implantacao_checkpoint)
    ? implantacao.implantacao_checkpoint[0]
    : implantacao.implantacao_checkpoint
  const agendamentos = cp?.dados?.agendamentos_etapas || {}
  const etapas = implantacao.implantacao_etapas || []

  // 1. Se a etapa de Feedback já possui data agendada/gravada
  const fbEtapa = etapas.find((e: any) => (e.nome_etapa || '').trim().toLowerCase() === 'feedback')
  if (fbEtapa && agendamentos[fbEtapa.id]?.inicio) {
    return agendamentos[fbEtapa.id].inicio
  }

  // 2. Se a etapa imediatamente anterior ao Feedback possui data definida
  const isShopee = implantacao.tipo_cliente === 'SHOPEE'
  const etapasOrdenadas = sortEtapasWithOrder(etapas, isShopee)
  const idxFb = etapasOrdenadas.findIndex(
    (e: any) => (e.nome_etapa || '').trim().toLowerCase() === 'feedback'
  )
  if (idxFb > 0) {
    const etapaAnterior = etapasOrdenadas[idxFb - 1]
    const dataAnterior = agendamentos[etapaAnterior.id]?.inicio
    if (dataAnterior) {
      return new Date(new Date(dataAnterior).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  return null
}
