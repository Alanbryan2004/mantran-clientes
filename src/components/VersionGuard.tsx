import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

declare const __APP_BUILD_VERSION__: string | undefined

// Intervalo de verificação periódica: 5 minutos (300.000 ms)
const CHECK_INTERVAL_MS = 5 * 60 * 1000
// Throttle mínimo para eventos de foco / visibilidade: 3 minutos (180.000 ms)
const THROTTLE_FOCUS_MS = 3 * 60 * 1000

export function VersionGuard() {
  const localBuildVersion = typeof __APP_BUILD_VERSION__ === 'string' && __APP_BUILD_VERSION__ !== 'dev'
    ? __APP_BUILD_VERSION__
    : null
  const currentVersion = useRef<string | null>(localBuildVersion)
  const [showBanner, setShowBanner] = useState(false)
  const isReloading = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCheckTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // Limpa o parâmetro _v da barra de endereço silenciosamente se veio de um reload anterior
    if (typeof window !== 'undefined' && window.location.search.includes('_v=')) {
      try {
        const clean = new URL(window.location.href)
        clean.searchParams.delete('_v')
        window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash)
      } catch {}
    }

    // 1. Busca a versão remota exclusivamente pelo arquivo estático /version.json servido pela CDN da Vercel.
    // NÃO executa funções serverless, reduzindo a zero o custo de computação e invocação de APIs.
    async function fetchVersion(): Promise<string | null> {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.version) return String(data.version)
        }
      } catch {}

      return null
    }

    // 2. Checagem de versão
    const checkVersion = async () => {
      if (isReloading.current) return

      // Se a aba estiver em segundo plano ou minimizada, não desperdiça requisições
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      lastCheckTimeRef.current = Date.now()
      const latest = await fetchVersion()
      if (!latest) return

      // Se não tínhamos versão inicial gravada (ex.: ambiente dev local sem build), grava a primeira
      if (!currentVersion.current) {
        currentVersion.current = latest
        return
      }

      // Se a versão do servidor for diferente da que está em execução no bundle
      if (latest !== currentVersion.current) {
        isReloading.current = true
        console.log(`[VersionGuard] Nova versão detectada: ${currentVersion.current} → ${latest}. Recarregando...`)
        setShowBanner(true)

        // Limpa caches locais e força reload limpo do documento
        setTimeout(async () => {
          if ('caches' in window) {
            try {
              const keys = await caches.keys()
              await Promise.all(keys.map((k) => caches.delete(k)))
            } catch {}
          }

          // Redireciona com parâmetro de versão único para anular o cache de disco do navegador do index.html
          try {
            const target = new URL(window.location.href)
            target.searchParams.set('_v', latest)
            window.location.replace(target.toString())
          } catch {
            window.location.reload()
          }
        }, 1800)
      }
    }

    // Checagem com throttle para foco e visibilidade (evita rajadas ao alternar abas)
    const checkVersionThrottled = () => {
      const now = Date.now()
      if (now - lastCheckTimeRef.current < THROTTLE_FOCUS_MS) {
        return
      }
      checkVersion()
    }

    // Checagem imediata ao montar
    checkVersion()

    // Gatilho A: Polling a cada 5 minutos (espaçado para economizar requisições)
    intervalRef.current = setInterval(checkVersion, CHECK_INTERVAL_MS)

    // Gatilho B: Usuário volta para a aba ou desbloqueia o dispositivo (com throttle de 3 minutos)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersionThrottled()
      }
    }
    window.addEventListener('visibilitychange', handleVisibilityChange)

    // Gatilho C: Janela recebe foco (com throttle de 3 minutos)
    window.addEventListener('focus', checkVersionThrottled)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkVersionThrottled)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-2xl transition-all duration-300 border-b border-blue-400/30">
      <RefreshCw size={18} className="animate-spin shrink-0 text-white" />
      <span className="text-xs sm:text-sm font-bold tracking-wide drop-shadow-sm">
        🚀 Nova versão disponível! Atualizando em instantes...
      </span>
    </div>
  )
}

export default VersionGuard
