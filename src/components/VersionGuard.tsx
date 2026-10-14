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
    // Limpa o parâmetro _v da barra de endereço silenciosamente se veio de um reload anterior
    if (typeof window !== 'undefined' && window.location.search.includes('_v=')) {
      try {
        const clean = new URL(window.location.href)
        clean.searchParams.delete('_v')
        window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash)
      } catch {}
    }

    // 1. Busca a versão remota no servidor.
    // Tenta primeiro /api/version (serverless function Vercel — SEMPRE ignora cache de edge).
    // Se falhar ou estiver em dev local, usa /version.json como fallback.
    async function fetchVersion(): Promise<string | null> {
      // Tentativa 1: API Serverless da Vercel (bypassa 100% o Edge CDN Cache)
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.version) return String(data.version)
        }
      } catch {}

      // Tentativa 2: Fallback estático
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

    // Checagem imediata ao montar (se o bundle carregado era de versão antiga em cache, já detecta e recarrega na hora)
    checkVersion()

    // Gatilho A: Polling contínuo a cada 10 segundos
    intervalRef.current = setInterval(checkVersion, 10 * 1000)

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
