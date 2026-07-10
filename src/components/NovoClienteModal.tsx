import React, { useState, useEffect } from 'react'
import type { BaseMantran } from '../data/mockBases'
import { X } from 'lucide-react'

interface NovoClienteModalProps {
  isOpen: boolean
  onClose: () => void
  availableBases: BaseMantran[]
  onSave: (baseId: string, data: Partial<BaseMantran>) => void
}

export function NovoClienteModal({ isOpen, onClose, availableBases, onSave }: NovoClienteModalProps) {
  const [selectedBase, setSelectedBase] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [tipo, setTipo] = useState<'SHOPEE' | 'NORMAL' | ''>('NORMAL')
  const [senha, setSenha] = useState('')
  const [possuiAditivo, setPossuiAditivo] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setSelectedBase(availableBases.length > 0 ? availableBases[0].id : '')
      setEmpresa('')
      setTipo('NORMAL')
      setSenha('')
      setPossuiAditivo(false)
    }
  }, [isOpen, availableBases])

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBase || !empresa) {
      alert('Por favor, selecione uma base e preencha a empresa.')
      return
    }
    
    onSave(selectedBase, {
      empresa: empresa.toUpperCase(),
      tipo,
      senha,
      possui_aditivo: possuiAditivo
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Novo Cliente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors focus:outline-none">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Base Disponível</label>
              <select 
                value={selectedBase} 
                onChange={(e) => setSelectedBase(e.target.value)}
                className="input-field cursor-pointer"
                required
              >
                <option value="" disabled>Selecione uma base...</option>
                {availableBases.map(b => (
                  <option key={b.id} value={b.id}>{b.id}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Nome da Empresa</label>
              <input 
                type="text" 
                value={empresa} 
                onChange={(e) => setEmpresa(e.target.value)}
                className="input-field"
                placeholder="Ex: NOVA EMPRESA LTDA"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="input-field">
                <option value="NORMAL">NORMAL</option>
                <option value="SHOPEE">SHOPEE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
              <input 
                type="text" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)}
                className="input-field"
                placeholder="Ex: @@senha##"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Possui Aditivo?</label>
              <select 
                value={possuiAditivo ? 'SIM' : 'NAO'} 
                onChange={(e) => setPossuiAditivo(e.target.value === 'SIM')} 
                className="input-field"
              >
                <option value="NAO">NÃO</option>
                <option value="SIM">SIM</option>
              </select>
            </div>



          </div>
          
          <div className="mt-8 flex justify-end space-x-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary"
            >
              Salvar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
