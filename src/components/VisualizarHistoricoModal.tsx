import { useState } from 'react'
import { History, X, Calendar, User, Copy, Check, Sparkles, CheckCircle2 } from 'lucide-react'

interface VisualizarHistoricoModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    id: string
    data_hora: string
    texto: string
    usuario_nome?: string | null
    created_at?: string
  } | null
  empresaNome?: string
}

export function VisualizarHistoricoModal({ isOpen, onClose, item, empresaNome }: VisualizarHistoricoModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !item) return null

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    try {
      const d = new Date(dateTimeStr)
      if (isNaN(d.getTime())) return dateTimeStr
      return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateTimeStr
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(item.texto)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse checkpoint bullet points if present
  const isCheckpointHistory = item.texto.includes('Checkpoint') || item.texto.includes('Perguntas respondidas:')
  
  let checkpointTitle = ''
  let checkpointPills: string[] = []

  if (isCheckpointHistory && item.texto.includes('Perguntas respondidas:')) {
    const parts = item.texto.split('Perguntas respondidas:')
    checkpointTitle = parts[0].trim().replace(/\.$/, '')
    const itemsPart = parts[1] ? parts[1].trim().replace(/\.$/, '') : ''
    checkpointPills = itemsPart.split('•').map(s => s.trim()).filter(Boolean)
  }

  const isCliente = (item.usuario_nome || '').toLowerCase().includes('cliente')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#111420] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden text-white animate-fadeIn">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Detalhes do Registro no Histórico
              </h3>
              {empresaNome && (
                <p className="text-xs text-slate-400 mt-0.5">{empresaNome}</p>
              )}
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2.5 pb-3 border-b border-slate-800">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              <span>{formatDateTime(item.data_hora)}</span>
            </span>

            {item.usuario_nome && (
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
                isCliente 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                  : 'bg-brand-500/15 text-brand-300 border-brand-500/30'
              }`}>
                <User className="w-3.5 h-3.5" />
                <span>Registrado por: <strong>{item.usuario_nome}</strong></span>
              </span>
            )}
          </div>

          {/* Special view for Checkpoint */}
          {isCheckpointHistory && checkpointPills.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    {checkpointTitle || 'Checkpoint da Implantação'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Resumo das perguntas e seções preenchidas pelo cliente no formulário:
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Perguntas Respondidas ({checkpointPills.length})
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {checkpointPills.map((pill, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 text-xs font-medium text-slate-200 flex items-start gap-2 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                      <span>{pill}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw message container */}
              <div className="mt-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Mensagem Completa no Histórico
                </span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {item.texto}
                </p>
              </div>
            </div>
          ) : (
            /* Standard text message */
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Descrição do Evento / Ocorrência
              </span>
              <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                {item.texto}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado para a área de transferência!' : 'Copiar Texto'}</span>
          </button>

          <button 
            type="button" 
            onClick={onClose} 
            className="btn-primary text-xs py-2 px-5 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}
