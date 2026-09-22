import { useState } from 'react'
import { Star, MessageSquare, Send, CheckCircle2, X, Sparkles, ThumbsUp } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface EnviarFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  implantacao: any
  onSuccess: () => void
}

const RATING_LABELS: Record<number, string> = {
  1: 'Muito Insatisfeito',
  2: 'Insatisfeito',
  3: 'Neutro / Regular',
  4: 'Satisfeito',
  5: 'Excelente / Muito Satisfeito'
}

export function EnviarFeedbackModal({ isOpen, onClose, implantacao, onSuccess }: EnviarFeedbackModalProps) {
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [aspectos, setAspectos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen || !implantacao) return null

  const opcoesAspectos = [
    'Atendimento da Equipe',
    'Rapidez na Implantação',
    'Clareza nas Orientações',
    'Facilidade do Sistema',
    'Treinamento Realizado',
    'Suporte Técnico'
  ]

  const toggleAspecto = (asp: string) => {
    if (aspectos.includes(asp)) {
      setAspects(aspectos.filter(a => a !== asp))
    } else {
      setAspects([...aspectos, asp])
    }
  }

  const setAspects = (arr: string[]) => setAspectos(arr)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comentario.trim()) {
      alert('Por favor, digite sua mensagem de feedback.')
      return
    }

    setSubmitting(true)
    try {
      const activeRating = rating || 5
      const starsDisplay = '⭐'.repeat(activeRating)
      const aspectosTexto = aspectos.length > 0 ? ` | Pontos destacados: ${aspectos.join(', ')}` : ''
      
      const historicoTexto = `[FEEDBACK DO CLIENTE] Avaliação: ${starsDisplay} (${activeRating}/5 - ${RATING_LABELS[activeRating]})${aspectosTexto} • Mensagem: "${comentario.trim()}"`

      // 1. Inserir no Histórico de Implantação
      await api.insertImplantacaoHistorico({
        implantacao_id: implantacao.id,
        texto: historicoTexto,
        usuario_nome: 'Cliente (Feedback)'
      })

      // 2. Atualizar etapa Feedback para OK
      const etapas = implantacao.implantacao_etapas || []
      const feedbackEtapa = etapas.find(
        (e: any) => (e.nome_etapa || '').trim().toLowerCase() === 'feedback'
      )
      if (feedbackEtapa) {
        await api.updateImplantacaoEtapa(feedbackEtapa.id, 'OK')
      }

      // 3. Atualizar status geral da Implantação se todas as outras etapas estiverem OK
      const otherEtapas = etapas.filter(
        (e: any) => (e.nome_etapa || '').trim().toLowerCase() !== 'feedback'
      )
      const allOthersOk = otherEtapas.length > 0 && otherEtapas.every((e: any) => e.valor === 'OK')
      if (allOthersOk) {
        await api.updateImplantacaoStatus(implantacao.id, 'Concluído')
      }

      // 4. Gerar notificação para a equipe do sistema
      try {
        const nomeEmpresa = implantacao.nome_empresa || 'Cliente'
        await api.createNotificacao({
          titulo: `⭐ Feedback Recebido: ${nomeEmpresa}`,
          mensagem: `O cliente "${nomeEmpresa}" enviou o Feedback final da implantação. Nota: ${activeRating}/5 (${RATING_LABELS[activeRating]}).`,
          tipo: 'feedback',
          implantacao_id: implantacao.id,
          cliente_id: implantacao.cliente_id || null,
          dados_extras: {
            rating: activeRating,
            aspectos,
            comentario: comentario.trim()
          }
        })
      } catch (notifErr) {
        console.warn('Aviso ao gerar notificação de feedback:', notifErr)
      }

      setSubmitted(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1800)

    } catch (err: any) {
      console.error('Erro ao enviar feedback:', err)
      alert('Erro ao enviar feedback: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131622] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Feedback da Implantação</h2>
              <p className="text-xs text-slate-400">{implantacao.nome_empresa || 'Cliente'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Muito Obrigado pelo seu Feedback! 🎉</h3>
            <p className="text-sm text-slate-300 max-w-sm">
              Sua avaliação foi registrada no histórico da implantação com sucesso. A equipe Mantran agradece pela parceria!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Star Rating Selection */}
            <div className="space-y-2 text-center">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Como você avalia o processo de implantação?
              </label>
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentEffective = hoverRating ?? rating
                  const isFilled = star <= currentEffective

                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1.5 focus:outline-none transform transition-transform hover:scale-125 cursor-pointer"
                    >
                      <Star
                        className={clsx(
                          "w-8 h-8 transition-colors",
                          isFilled
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                            : "text-slate-600 hover:text-slate-400"
                        )}
                      />
                    </button>
                  )
                })}
              </div>
              <div className="text-xs font-bold text-amber-400">
                {RATING_LABELS[hoverRating ?? rating]}
              </div>
            </div>

            {/* Highlights / Tags */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                O que você mais gostou ou quer destacar? (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                {opcoesAspectos.map((asp) => {
                  const isSelected = aspectos.includes(asp)
                  return (
                    <button
                      key={asp}
                      type="button"
                      onClick={() => toggleAspecto(asp)}
                      className={clsx(
                        "text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5",
                        isSelected
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold"
                          : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800"
                      )}
                    >
                      {isSelected && <ThumbsUp className="w-3 h-3 text-amber-400" />}
                      <span>{asp}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Detailed Message Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Sua Mensagem / Comentários <span className="text-rose-400">*</span></span>
              </label>
              <textarea
                required
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Conte-nos como foi sua experiência, o que achou dos treinamentos, do suporte e do sistema..."
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !comentario.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Feedback Final</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  )
}
