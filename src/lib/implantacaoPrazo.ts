export const PRAZO_TOTAL_DIAS = 40
export const DIAS_INICIO_ALERTA = 30

export interface PrazoImplantacaoInfo {
  dataCriacaoStr: string
  dataLimiteStr: string
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
 * Calcula o prazo de uma implantação (limite de 40 dias a partir da criação).
 * - Até 30 dias: Verde / Normal
 * - Passou de 30 dias: Fica Amarelo e vai avermelhando progressivamente conforme se aproxima dos 40 dias
 * - Ao atingir ou passar de 40 dias: Fica Vermelho intenso (Prazo Estourado)
 */
export function calcularPrazoImplantacao(
  createdAt: string | Date | null | undefined,
  isConcluido: boolean = false
): PrazoImplantacaoInfo {
  if (!createdAt) {
    return {
      dataCriacaoStr: '-',
      dataLimiteStr: '-',
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

  // Data Limite (+40 dias)
  const dataLimite = new Date(dataCriacaoMid)
  dataLimite.setDate(dataLimite.getDate() + PRAZO_TOTAL_DIAS)

  const diffMs = hojeMid.getTime() - dataCriacaoMid.getTime()
  const diasCorridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const diasRestantes = Math.max(0, PRAZO_TOTAL_DIAS - diasCorridos)
  const estourou = !isConcluido && diasCorridos >= PRAZO_TOTAL_DIAS
  const diasAtraso = Math.max(0, diasCorridos - PRAZO_TOTAL_DIAS)

  const dataCriacaoStr = rawCriacao.toLocaleDateString('pt-BR')
  const dataLimiteStr = dataLimite.toLocaleDateString('pt-BR')

  // Se concluído, visual verde de sucesso e neutro
  if (isConcluido) {
    return {
      dataCriacaoStr,
      dataLimiteStr,
      diasCorridos,
      diasRestantes,
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

  // Prazo Estourado (>= 40 dias) -> Vermelho total
  if (estourou) {
    const labelStatus = diasAtraso === 0 
      ? 'Prazo estourou hoje!' 
      : `Estourado (+${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'})`

    return {
      dataCriacaoStr,
      dataLimiteStr,
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

  // Passou de 30 dias e se aproximando de 40 dias (31 a 39 dias)
  // Começa Amarelo (dia 31) e vai avermelhando progressivamente a cada dia
  if (diasCorridos > DIAS_INICIO_ALERTA) {
    // t vai de 0.1 (dia 31) até 0.9 (dia 39)
    const t = Math.min(1, Math.max(0, (diasCorridos - DIAS_INICIO_ALERTA) / (PRAZO_TOTAL_DIAS - DIAS_INICIO_ALERTA)))
    
    // Matiz vai de 48 (amarelo) descendo até 4 (vermelho)
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
