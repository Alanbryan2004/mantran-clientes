import { useState, useEffect } from 'react'

/**
 * Detecta se o dispositivo atual é móvel (tela < 768px ou user-agent mobile)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const isSmallScreen = window.innerWidth < 768 || (window.matchMedia && window.matchMedia('(max-width: 767px)').matches)
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  )
  return isSmallScreen || isMobileUA
}

/**
 * Hook reativo para detectar mobile com listener de resize e orientationchange
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileDevice())

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice())
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return isMobile
}

