import React, { useState, useEffect } from 'react'
import type { BaseMantran } from '../data/mockBases'
import { X, Save } from 'lucide-react'

interface EditarClienteModalProps {
  isOpen: boolean
  onClose: () => void
  cliente: BaseMantran | null
  onSave: (clienteDbId: string, data: { empresa: string, tipo: string, senha: string }) => void
}

export function EditarClienteModal({ isOpen, onClose, cliente, onSave }: EditarClienteModalProps) {
  const [empresa, setEmpresa] = useState('')
  const [tipo, setTipo] = useState<'SHOPEE' | 'NORMAL' | ''>('NORMAL')
  const [senha, setSenha] = useState('')

  useEffect(() => {
    if (isOpen && cliente) {
      setEmpresa(cliente.empresa)
      setTipo(cliente.tipo as any || 'NORMAL')
      setSenha(cliente.senha || '')
    }
  }, [isOpen, cliente])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente || !cliente.clienteDbId || !empresa) return

    onSave(cliente.clienteDbId, {
      empresa: empresa.toUpperCase(),
      tipo,
      senha
    })
  }

  if (!isOpen || !cliente) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Editar Cliente</h2>
            <p className="text-sm text-slate-400">Base {cliente.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nome da Empresa
            </label>
            <input 
              type="text" 
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              className="input-field uppercase"
              placeholder="Ex: GRAN MILAN"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Tipo
            </label>
            <select 
              value={tipo} 
              onChange={e => setTipo(e.target.value as any)}
              className="input-field"
            >
              <option value="NORMAL">NORMAL</option>
              <option value="SHOPEE">SHOPEE</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Senha (GPO Padrão)
            </label>
            <input 
              type="text" 
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="input-field font-mono"
              placeholder="Ex: @@mtr002##"
            />
          </div>

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
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
