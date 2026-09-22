import { X, Star, Sparkles, Clock } from 'lucide-react'

interface VisualizarFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  implantacao: any
  historicoItem?: any
}

export function VisualizarFeedbackModal({ isOpen, onClose, implantacao, historicoItem }: VisualizarFeedbackModalProps) {
  if (!isOpen || !implantacao) return null

  const texto = historicoItem?.texto || ''

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return isoString
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131622] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Feedback do Cliente</h2>
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

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2.5">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Avaliação de Encerramento
              </span>
              {historicoItem?.data_hora && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(historicoItem.data_hora)}
                </span>
              )}
            </div>

            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {texto || 'Feedback registrado no histórico de implantação.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}
