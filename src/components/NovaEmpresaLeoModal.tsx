import React, { useState } from 'react'
import { X } from 'lucide-react'

interface NovaEmpresaLeoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (cdEmpresa: string, nomeEmpresa: string) => void
}

export function NovaEmpresaLeoModal({ isOpen, onClose, onSave }: NovaEmpresaLeoModalProps) {
  const [cdEmpresa, setCdEmpresa] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeEmpresa.trim()) return alert('O Nome da Empresa é obrigatório.')
    
    // Auto-formatting cd_empresa if provided, e.g. '12' -> '012'
    let cdFormatted = cdEmpresa.trim()
    if (cdFormatted && !isNaN(Number(cdFormatted))) {
      cdFormatted = cdFormatted.padStart(3, '0')
    }

    onSave(cdFormatted, nomeEmpresa.trim())
    setCdEmpresa('')
    setNomeEmpresa('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Nova Empresa Léo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Código da Empresa (CD_Empresa)
            </label>
            <input
              type="text"
              value={cdEmpresa}
              onChange={e => setCdEmpresa(e.target.value)}
              className="input-field w-full"
              placeholder="Ex: 015 (Deixe em branco para auto-gerar)"
            />
            <p className="text-xs text-slate-500 mt-1">Se não preencher, o sistema criará o próximo número sequencial (001, 002...).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nome da Empresa / Transportadora <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nomeEmpresa}
              onChange={e => setNomeEmpresa(e.target.value)}
              className="input-field w-full"
              placeholder="Ex: Transportes Rápidos Léo"
              autoFocus
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Cadastrar Empresa
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
