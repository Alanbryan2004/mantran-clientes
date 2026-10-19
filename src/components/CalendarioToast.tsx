import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, X } from 'lucide-react'
import type { AvisoPopup } from '../lib/avisoPopup'

interface ToastItem extends AvisoPopup {
  // chave única de render (permite o mesmo id reaparecer se reenviado)
  key: string
}

/**
 * Toasts in-app que sobem de baixo para cima, no canto inferior direito.
 * Escuta o evento global 'mantran:toast' (disparado por avisoPopup.ts).
 * Fica montado globalmente, então aparece em qualquer página do app.
 *
 * IMPORTANTE: o toast NÃO fecha sozinho. Permanece na tela até o usuário
 * clicar em Fechar (ou em "Abrir Calendário"), garantindo que mesmo quem
 * não estava em frente à tela veja o aviso ao retornar.
 */
export function CalendarioToast() {
  const navigate = useNavigate()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AvisoPopup>).detail
      if (!detail?.id) return
      const key = `${detail.id}_${Date.now()}`
      setToasts(prev => {
        // evita duplicar o mesmo aviso se já está visível
        if (prev.some(t => t.id === detail.id)) return prev
        return [...prev, { ...detail, key }]
      })
    }

    window.addEventListener('mantran:toast', handler as EventListener)
    return () => {
      window.removeEventListener('mantran:toast', handler as EventListener)
    }
  }, [])

  const remover = (key: string) => {
    setToasts(prev => prev.filter(t => t.key !== key))
  }

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[11000] flex flex-col gap-2.5 w-[92vw] max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.key}
          className="pointer-events-auto relative overflow-hidden bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 p-4 pl-5 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300"
          role="alert"
        >
          {/* Barra lateral vermelha (identidade Mantran) */}
          <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-600" />

          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight">{t.titulo}</p>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">{t.mensagem}</p>
            {t.url && (
              <button
                type="button"
                onClick={() => { navigate(t.url!); remover(t.key) }}
                className="mt-2 text-[11px] font-bold text-brand-300 hover:text-brand-200 underline cursor-pointer"
              >
                Abrir Calendário
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => remover(t.key)}
            className="text-slate-400 hover:text-white p-0.5 rounded shrink-0 cursor-pointer"
            title="Dispensar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
