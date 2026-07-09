import React, { useState, useEffect } from 'react'
import { X, Database, Plus } from 'lucide-react'

interface NovaBaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveLote: (quantidade: number, baseInicial: number) => void
  onSaveManual: (nomeBase: string) => void
  basesAtuais: string[]
}

export function NovaBaseModal({ isOpen, onClose, onSaveLote, onSaveManual, basesAtuais }: NovaBaseModalProps) {
  const [modo, setModo] = useState<'LOTE' | 'MANUAL'>('LOTE')
  const [quantidade, setQuantidade] = useState(10)
  const [nomeManual, setNomeManual] = useState('dbMantran')
  const [proximaBaseNum, setProximaBaseNum] = useState(1)

  useEffect(() => {
    if (isOpen) {
      let maxNum = 0
      basesAtuais.forEach(b => {
        const match = b.match(/dbMantran(\d+)/i)
        if (match && match[1]) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      })
      setProximaBaseNum(maxNum + 1)
      setQuantidade(10)
      setNomeManual('dbMantran')
    }
  }, [isOpen, basesAtuais])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (modo === 'LOTE') {
      if (quantidade > 0 && quantidade <= 100) {
        onSaveLote(quantidade, proximaBaseNum)
      } else {
        alert('A quantidade deve ser entre 1 e 100.')
        return
      }
    } else {
      if (nomeManual.trim().length < 3) {
        alert('O nome da base deve ter pelo menos 3 caracteres.')
        return
      }
      if (basesAtuais.includes(nomeManual.trim())) {
        alert('Esta base já existe no sistema.')
        return
      }
      onSaveManual(nomeManual.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-500" />
              Criar Novas Bases
            </h2>
            <p className="text-sm text-slate-400">Adicione mais bases ao sistema</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              modo === 'LOTE' 
                ? 'text-brand-400 border-b-2 border-brand-500 bg-slate-800/30' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
            onClick={() => setModo('LOTE')}
          >
            Sequencial (Lote)
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              modo === 'MANUAL' 
                ? 'text-brand-400 border-b-2 border-brand-500 bg-slate-800/30' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
            onClick={() => setModo('MANUAL')}
          >
            Nome Específico
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {modo === 'LOTE' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <p className="text-sm text-slate-300 mb-2">
                  A última base encontrada foi a <span className="font-bold text-white">dbMantran{String(proximaBaseNum - 1).padStart(3, '0')}</span>.
                </p>
                <p className="text-sm text-slate-400">
                  As novas bases começarão a partir de: <strong className="text-brand-400">dbMantran{String(proximaBaseNum).padStart(3, '0')}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Quantidade de bases para criar:
                </label>
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  value={quantidade}
                  onChange={e => setQuantidade(parseInt(e.target.value) || 0)}
                  className="input-field"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <p className="text-sm text-slate-300">
                  Digite o nome exato da base. Ideal para bases de teste, homologação ou migrações avulsas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nome da Base:
                </label>
                <input 
                  type="text" 
                  value={nomeManual}
                  onChange={e => setNomeManual(e.target.value)}
                  className="input-field font-mono"
                  placeholder="Ex: dbMantran916"
                  required
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Criar {modo === 'LOTE' ? 'Bases' : 'Base'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
