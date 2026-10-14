import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function VersionGuard() {
  const currentVersion = useRef<string | null>(null)
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

    // 2. Grava a versão inicial na montagem do app
    fetchVersion().then((v) => {
      if (v) currentVersion.current = v
    })

    // 3. Checagem de mudança
    const checkVersion = async () => {
      if (isReloading.current) return
      const latest = await fetchVersion()
      if (!latest || !currentVersion.current) return

      // Se a versão do servidor for diferente da que está em execução
      if (latest !== currentVersion.current) {
        isReloading.current = true
        console.log(`[VersionGuard] Nova versão detectada: ${currentVersion.current} → ${latest}. Recarregando...`)
        setShowBanner(true)

        // Aguarda 2.5s para o usuário visualizar o aviso e recarrega a página
        setTimeout(() => {
          window.location.reload()
        }, 2500)
      }
    }

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
