// Cálculo de Banco de Horas.
//
// Saldo do dia = tempo trabalhado real - jornada prevista do dia.
// Tolerâncias que NÃO viram banco de horas: 5 min (entrada) + 15 min (saída) = 20 min/dia.
// Se |saldo do dia| <= tolerância combinada, o dia zera (não gera crédito nem débito).
// Só entram no cálculo os dias com expediente iniciado E encerrado (dia completo).

import type { RegistroPonto, JornadaTrabalho } from './api'

export const TOLERANCIA_ENTRADA_MIN = 5
export const TOLERANCIA_SAIDA_MIN = 15
// Folga total do dia (entrada + saída) que não é contabilizada
export const TOLERANCIA_DIA_MIN = TOLERANCIA_ENTRADA_MIN + TOLERANCIA_SAIDA_MIN

// 'HH:MM[:SS]' -> minutos desde 00:00
function hhmmParaMinutos(hhmm?: string | null): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

// Minutos previstos de trabalho num dia, conforme a jornada (descontando almoço).
export function minutosPrevistosJornada(jornada: JornadaTrabalho): number {
  const entrada = hhmmParaMinutos(jornada.hora_entrada)
  const saida = hhmmParaMinutos(jornada.hora_saida)
  if (entrada === null || saida === null) return 0

  let total = saida - entrada
  const almocoIni = hhmmParaMinutos(jornada.almoco_inicio)
  const almocoFim = hhmmParaMinutos(jornada.almoco_fim)
  if (almocoIni !== null && almocoFim !== null) {
    total -= Math.max(0, almocoFim - almocoIni)
  }
  return Math.max(0, total)
}

// Minutos efetivamente trabalhados num conjunto de registros de UM dia.
function minutosTrabalhadosNoDia(registrosDoDia: RegistroPonto[]): number {
  const marco = (t: RegistroPonto['tipo']) =>
    registrosDoDia.find(r => r.tipo === t)?.data_hora

  const inicio = marco('inicio_expediente')
  const fim = marco('fim_expediente')
  if (!inicio || !fim) return 0 // dia incompleto não conta

  const tInicio = new Date(inicio).getTime()
  const tFim = new Date(fim).getTime()
  let total = tFim - tInicio

  const pausa = marco('pausa_almoco')
  const retorno = marco('retorno_almoco')
  if (pausa && retorno) {
    total -= Math.max(0, new Date(retorno).getTime() - new Date(pausa).getTime())
  }

  return Math.max(0, Math.round(total / 60000)) // em minutos
}

export interface SaldoDia {
  data: string // YYYY-MM-DD
  previstoMin: number
  trabalhadoMin: number
  saldoMin: number // já com tolerância aplicada (0 se dentro da folga)
}

export interface ResumoBancoHoras {
  saldoAcumuladoMin: number
  dias: SaldoDia[]
  diasComputados: number
}

// Calcula o banco de horas de um funcionário a partir dos registros de ponto e da jornada.
export function calcularBancoHoras(
  registros: RegistroPonto[],
  jornada: JornadaTrabalho | null
): ResumoBancoHoras {
  if (!jornada) {
    return { saldoAcumuladoMin: 0, dias: [], diasComputados: 0 }
  }

  const previstoMin = minutosPrevistosJornada(jornada)

  // Agrupa registros por dia
  const porDia = new Map<string, RegistroPonto[]>()
  for (const r of registros) {
    const dia = r.data
    if (!dia) continue
    if (!porDia.has(dia)) porDia.set(dia, [])
    porDia.get(dia)!.push(r)
  }

  const dias: SaldoDia[] = []
  let saldoAcumuladoMin = 0

  for (const [data, regs] of porDia) {
    const trabalhadoMin = minutosTrabalhadosNoDia(regs)
    if (trabalhadoMin === 0) continue // dia incompleto: ignora

    const bruto = trabalhadoMin - previstoMin
    // Aplica tolerância: dentro da folga combinada, zera
    const saldoMin = Math.abs(bruto) <= TOLERANCIA_DIA_MIN ? 0 : bruto

    dias.push({ data, previstoMin, trabalhadoMin, saldoMin })
    saldoAcumuladoMin += saldoMin
  }

  dias.sort((a, b) => a.data.localeCompare(b.data))

  return { saldoAcumuladoMin, dias, diasComputados: dias.length }
}

// Formata minutos de saldo como '+2h30' / '-0h45' / '0h00'
export function formatSaldo(min: number): string {
  const sinal = min > 0 ? '+' : min < 0 ? '-' : ''
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sinal}${h}h${String(m).padStart(2, '0')}`
}
