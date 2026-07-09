import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { LeoEmpresa } from './LeoMadeirasTable'

interface EditarEmpresaLeoModalProps {
  isOpen: boolean
  onClose: () => void
  empresa: LeoEmpresa | null
  onSave: (id: string, novoNome: string) => void
}

export function EditarEmpresaLeoModal({ isOpen, onClose, empresa, onSave }: EditarEmpresaLeoModalProps) {
  const [nome, setNome] = useState('')

  useEffect(() => {
    if (empresa) {
      setNome(empresa.nome_empresa)
    }
  }, [empresa])

  if (!isOpen || !empresa) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return alert('O Nome da Empresa não pode estar vazio.')
    onSave(empresa.id, nome.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Editar Empresa</h2>
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
              value={empresa.cd_empresa}
              disabled
              className="input-field w-full bg-slate-900/50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">O código da empresa não pode ser alterado.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nome da Empresa / Transportadora <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="input-field w-full"
              placeholder="Ex: Transportes Rápidos Léo"
              autoFocus
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex items-center justify-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
