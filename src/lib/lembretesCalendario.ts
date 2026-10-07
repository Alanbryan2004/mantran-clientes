// ============================================================
// Lembretes de eventos do Calendário (in-app, calculados no cliente)
//
// Para cada evento futuro em que o usuário participa (criador ou convidado),
// verifica se já entrou na "janela de lembrete": a partir de
//   (inicio_do_evento - antecedencia_min)  até  o início do evento.
//
// Enquanto estiver dentro dessa janela e o evento ainda não começou,
// gera uma notificação local com id estável para dedupe (usuario+evento).
//
// Segue o mesmo padrão de lembretesPonto.ts / aniversarios.ts: sem persistência
// global — a notificação some sozinha quando o evento começa, ou pode ser
// dispensada pelo usuário (dedupe via localStorage no NotificationsPopover).
// ============================================================

import type { EventoCalendario } from './api'

export interface LembreteCalendario {
  id: string            // `cal_${eventoId}_${usuarioId}`
  tipo: 'calendario_lembrete'
  titulo: string
  mensagem: string
  eventoId: string
}

function formatarInicio(inicio: string, diaInteiro: boolean): string {
  const d = new Date(inicio)
  if (diaInteiro) {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Texto amigável para a antecedência (ex: "em 30 min", "em 2h", "em 1 dia")
function textoAntecedencia(minutosRestantes: number): string {
  const min = Math.max(0, Math.round(minutosRestantes))
  if (min <= 0) return 'agora'
  if (min < 60) return `em ${min} min`
  const horas = Math.round(min / 60)
  if (min < 60 * 24) return `em ${horas}h`
  const dias = Math.round(min / (60 * 24))
  return `em ${dias} dia${dias > 1 ? 's' : ''}`
}

/**
 * Avalia os lembretes de calendário ativos AGORA para o usuário logado.
 * @param usuarioId id do usuário logado
 * @param eventos eventos futuros do usuário (com convidados aninhados)
 * @param agora data de referência (default: agora)
 */
export function avaliarLembretesCalendario(
  usuarioId: string,
  eventos: EventoCalendario[],
  agora: Date = new Date()
): LembreteCalendario[] {
  if (!usuarioId || !eventos || eventos.length === 0) return []

  const agoraMs = agora.getTime()
  const itens: LembreteCalendario[] = []

  for (const ev of eventos) {
    const inicioMs = new Date(ev.inicio).getTime()
    if (isNaN(inicioMs)) continue

    // Já começou? então não é mais "lembrete" (deixa o evento acontecer)
    if (inicioMs <= agoraMs) continue

    // Antecedência deste usuário (convidado) — default 30 min; criador sem registro usa 30
    const convidado = (ev.convidados || []).find(c => c.usuario_id === usuarioId)
    const souOrganizador = ev.criado_por_id === usuarioId
    if (!convidado && !souOrganizador) continue

    // Convidado que recusou não recebe lembrete
    if (convidado && convidado.status === 'recusado') continue

    const antecedenciaMin = convidado ? (convidado.antecedencia_min ?? 30) : 30
    const janelaInicioMs = inicioMs - antecedenciaMin * 60000

    // Dentro da janela de lembrete?
    if (agoraMs >= janelaInicioMs && agoraMs < inicioMs) {
      const minutosRestantes = (inicioMs - agoraMs) / 60000
      itens.push({
        id: `cal_${ev.id}_${usuarioId}`,
        tipo: 'calendario_lembrete',
        titulo: `⏰ ${ev.titulo}`,
        mensagem: `${souOrganizador ? 'Seu evento' : 'Lembrete'}: "${ev.titulo}" começa ${textoAntecedencia(minutosRestantes)} (${formatarInicio(ev.inicio, ev.dia_inteiro)})${ev.local ? ` • ${ev.local}` : ''}.`,
        eventoId: ev.id
      })
    }
  }

  return itens
}
