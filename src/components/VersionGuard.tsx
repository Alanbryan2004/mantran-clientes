import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

declare const __APP_BUILD_VERSION__: string | undefined

export function VersionGuard() {
  const localBuildVersion = typeof __APP_BUILD_VERSION__ === 'string' && __APP_BUILD_VERSION__ !== 'dev'
    ? __APP_BUILD_VERSION__
    : null
  const currentVersion = useRef<string | null>(localBuildVersion)
  const [showBanner, setShowBanner] = useState(false)
  const isReloading = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // 1. Função para buscar a versão no servidor sem risco de cache
    async function fetchVersion(): Promise<string | null> {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.version || null
      } catch {
        return null
      }
    }

    // 2. Checagem de mudança
    const checkVersion = async () => {
      if (isReloading.current) return
      const latest = await fetchVersion()
      if (!latest) return

      // Se não tínhamos versão inicial gravada (ex.: ambiente dev), grava a primeira
      if (!currentVersion.current) {
        currentVersion.current = latest
        return
      }

      // Se a versão do servidor for diferente da que está em execução no bundle
      if (latest !== currentVersion.current) {
        isReloading.current = true
        console.log(`[VersionGuard] Nova versão detectada: ${currentVersion.current} → ${latest}. Recarregando...`)
        setShowBanner(true)

        // Limpa caches do navegador e recarrega após 2s
        setTimeout(() => {
          if ('caches' in window) {
            caches.keys().then((keys) => {
              keys.forEach((k) => caches.delete(k))
            }).catch(() => {})
          }
          window.location.reload()
        }, 2000)
      }
    }

    // Checagem imediata ao montar (se o bundle carregado era de versão antiga em cache, já detecta e recarrega na hora)
    checkVersion()

    // Gatilho A: Polling a cada 15 segundos
    intervalRef.current = setInterval(checkVersion, 15 * 1000)

    // Gatilho B: Usuário volta para a aba ou desbloqueia o dispositivo
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    window.addEventListener('visibilitychange', handleVisibilityChange)

    // Gatilho C: Janela recebe foco
    window.addEventListener('focus', checkVersion)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkVersion)
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
