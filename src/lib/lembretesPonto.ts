// Lembretes de ponto (pessoais, client-side).
//
// Compara a jornada de trabalho do funcionário com os registros de ponto do dia
// e determina quais lembretes devem estar ativos AGORA:
//  - entrada:  passou do horário de entrada e não iniciou o expediente
//  - almoco:   passou do horário de início do almoço e não pausou
//  - retorno:  pausou o almoço e já passou +1h desde a pausa sem retornar
//  - saida:    passou do horário de saída e não encerrou o expediente
//
// Cada lembrete tem um id estável (usuario+data+tipo) para dedupe diário.

import type { RegistroPonto, JornadaTrabalho, TipoPonto } from './api'
import { isDiaUtil } from './feriados'

export type TipoLembrete = 'entrada' | 'almoco' | 'retorno' | 'saida'

export interface LembretePonto {
  id: string // `${usuarioId}_${data}_${tipo}`
  tipo: TipoLembrete
  titulo: string
  mensagem: string
}

// Tolerância (min) após o horário previsto antes de lembrar da entrada/almoço/saída
const TOLERANCIA_LEMBRETE_MIN = 5
// Tempo de almoço (min) após o qual lembra de voltar
const LIMITE_ALMOCO_MIN = 60

function hhmmParaMin(hhmm?: string | null): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

// True se a jornada prevê trabalho no dia da semana informado (0=domingo..6=sábado)
function jornadaTrabalhaNoDia(jornada: JornadaTrabalho, diaSemana: number): boolean {
  switch (diaSemana) {
    case 0: return !!jornada.domingo
    case 1: return !!jornada.segunda
    case 2: return !!jornada.terca
    case 3: return !!jornada.quarta
    case 4: return !!jornada.quinta
    case 5: return !!jornada.sexta
    case 6: return !!jornada.sabado
    default: return false
  }
}

// Avalia os lembretes ativos para AGORA (agora = new Date() por padrão).
export function avaliarLembretesPonto(
  usuarioId: string,
  registrosDoDia: RegistroPonto[],
  jornada: JornadaTrabalho | null,
  agora: Date = new Date()
): LembretePonto[] {
  if (!jornada) return []

  // Só faz sentido em dia útil e em dia que o funcionário trabalha
  if (!isDiaUtil(agora)) return []
  if (!jornadaTrabalhaNoDia(jornada, agora.getDay())) return []

  const dataISO = agora.toISOString().slice(0, 10)
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()

  const tem = (t: TipoPonto) => registrosDoDia.some(r => r.tipo === t)
  const marco = (t: TipoPonto) => registrosDoDia.find(r => r.tipo === t)?.data_hora

  const lembretes: LembretePonto[] = []
  const mk = (tipo: TipoLembrete, titulo: string, mensagem: string) =>
    lembretes.push({ id: `${usuarioId}_${dataISO}_${tipo}`, tipo, titulo, mensagem })

  const entradaMin = hhmmParaMin(jornada.hora_entrada)
  const almocoIniMin = hhmmParaMin(jornada.almoco_inicio)
  const saidaMin = hhmmParaMin(jornada.hora_saida)

  // 1) Não iniciou o expediente após o horário de entrada (+ tolerância)
  if (entradaMin !== null && !tem('inicio_expediente')) {
    if (minutosAgora >= entradaMin + TOLERANCIA_LEMBRETE_MIN) {
      mk('entrada',
        'Você ainda não iniciou o expediente',
        `Seu horário de entrada era ${(jornada.hora_entrada || '').slice(0, 5)}. Não esqueça de bater o ponto de início.`)
    }
  }

  // 2) Iniciou, tem horário de almoço, passou do início do almoço e não pausou
  if (almocoIniMin !== null && tem('inicio_expediente') && !tem('pausa_almoco')) {
    if (minutosAgora >= almocoIniMin + TOLERANCIA_LEMBRETE_MIN) {
      mk('almoco',
        'Hora do almoço',
        `Seu horário de almoço começa às ${(jornada.almoco_inicio || '').slice(0, 5)}. Lembre-se de registrar a pausa.`)
    }
  }

  // 3) Pausou para almoço e já passou +1h sem retornar
  if (tem('pausa_almoco') && !tem('retorno_almoco')) {
    const pausa = marco('pausa_almoco')
    if (pausa) {
      const minutosDesdePausa = (agora.getTime() - new Date(pausa).getTime()) / 60000
      if (minutosDesdePausa >= LIMITE_ALMOCO_MIN) {
        mk('retorno',
          'Retorno do almoço',
          'Já se passou mais de 1 hora desde sua pausa. Não esqueça de registrar o retorno do almoço.')
      }
    }
  }

  // 4) Passou do horário de saída e não encerrou (só depois de ter iniciado)
  if (saidaMin !== null && tem('inicio_expediente') && !tem('fim_expediente')) {
    if (minutosAgora >= saidaMin + TOLERANCIA_LEMBRETE_MIN) {
      mk('saida',
        'Não esqueça de encerrar o ponto',
        `Seu horário de saída era ${(jornada.hora_saida || '').slice(0, 5)}. Lembre-se de registrar o encerramento do expediente.`)
    }
  }

  return lembretes
}
