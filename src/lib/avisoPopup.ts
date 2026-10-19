// ============================================================
// Avisos de lembrete (popup) — fase 1: navegador ABERTO.
//
//   - Aba do app VISÍVEL   -> toast in-app (evento 'mantran:toast').
//   - Aba em SEGUNDO PLANO -> notificação NATIVA do SO (Notification API).
//
// Dedupe EM MEMÓRIA (zera a cada reload) para evitar repetir o mesmo aviso a
// cada ciclo de 1 min. Dedupe é por CANAL (toast / nativo), então o mesmo
// aviso pode gerar toast quando visível e notificação nativa quando oculto.
// (Não cobre navegador fechado — exigiria Service Worker + Web Push.)
// ============================================================

export interface AvisoPopup {
  id: string
  titulo: string
  mensagem: string
  url?: string
}

// Dedupe em memória (não persiste entre reloads — evita lixo acumulado).
const disparados = new Set<string>()

/**
 * Solicita permissão de notificação do navegador (uma vez).
 */
export async function solicitarPermissaoNotificacao(): Promise<void> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  } catch (_) {
    // ambiente sem suporte
  }
}

function mostrarToast(aviso: AvisoPopup) {
  const chave = `toast:${aviso.id}`
  if (disparados.has(chave)) return
  disparados.add(chave)
  window.dispatchEvent(new CustomEvent('mantran:toast', { detail: aviso }))
}

function mostrarNativa(aviso: AvisoPopup) {
  const chave = `nativo:${aviso.id}`
  if (disparados.has(chave)) return
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      disparados.add(chave)
      const notif = new Notification(aviso.titulo, {
        body: aviso.mensagem,
        tag: aviso.id,
        icon: '/MantranClientes.png',   // logo quadrada (não distorce no balão do Windows)
        requireInteraction: true
      } as NotificationOptions)
      if (aviso.url) {
        notif.onclick = () => {
          try {
            window.focus()
            window.location.assign(aviso.url!)
          } catch (_) {}
          notif.close()
        }
      }
    }
  } catch (_) {
    // se falhar, não marca como disparado (pode tentar de novo no próximo ciclo)
  }
}

/**
 * Dispara um aviso conforme a visibilidade da aba.
 */
export function dispararAviso(aviso: AvisoPopup): void {
  if (!aviso?.id) return

  const abaVisivel = typeof document !== 'undefined' && document.visibilityState === 'visible'

  if (abaVisivel) {
    mostrarToast(aviso)
  } else {
    // Oculta: notificação nativa do SO + toast persistente (visível ao voltar).
    mostrarNativa(aviso)
    mostrarToast(aviso)
  }
}
