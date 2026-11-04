// Utilitários para vídeos do YouTube (Academia Mantran).
// Guardamos só o link; daqui saem o ID, a miniatura e a URL de incorporação.

const ID_REGEX = /^[A-Za-z0-9_-]{11}$/

// Extrai o ID de 11 caracteres de vários formatos de link:
//   https://youtu.be/ID            https://www.youtube.com/watch?v=ID
//   https://www.youtube.com/embed/ID   /shorts/ID   /live/ID   /v/ID
// Também aceita o próprio ID puro. Retorna null se não for reconhecido.
export function extrairYoutubeId(entrada: string | null | undefined): string | null {
  const texto = (entrada ?? '').trim()
  if (!texto) return null
  if (ID_REGEX.test(texto)) return texto

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./i, '').replace(/^m\./i, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] || ''
    return ID_REGEX.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const v = url.searchParams.get('v')
    if (v && ID_REGEX.test(v)) return v
    const partes = url.pathname.split('/').filter(Boolean)
    if (partes.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(partes[0])) {
      return ID_REGEX.test(partes[1]) ? partes[1] : null
    }
  }

  return null
}

// Miniatura pública do vídeo (não precisa de chave de API).
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

// URL de incorporação sem cookies de rastreamento e sem "vídeos relacionados" de outros canais.
export function youtubeEmbedUrl(id: string, autoplay = false): string {
  // ATENÇÃO sobre qualidade: a documentação oficial do YouTube informa que as funções
  // de definir qualidade (setPlaybackQuality etc.) são no-op desde 2019 e que o player
  // ajusta a resolução pelas condições de quem assiste (rede e tamanho do player).
  // Por isso a tela orienta o usuário a escolher a qualidade na engrenagem do player.
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
  if (autoplay) params.set('autoplay', '1')
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

// ---------------------------------------------------------------------------
// IFrame Player API oficial: permite saber quando o vídeo toca, o tempo atual e
// quando termina (usado para marcar "assistido" na Academia). As funções de
// qualidade foram removidas pelo YouTube, mas os eventos e o tempo seguem válidos.
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<any> | null = null

// Carrega o script da API uma única vez e resolve com o objeto global YT.
export function carregarYoutubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Ambiente sem janela'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof anterior === 'function') anterior()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      youtubeApiPromise = null // permite tentar de novo depois
      reject(new Error('Não foi possível carregar a API do YouTube'))
    }
    document.head.appendChild(script)
  })
  return youtubeApiPromise
}
