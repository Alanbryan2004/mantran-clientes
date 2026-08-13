import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../lib/api'

interface ModulosLeoModalProps {
  isOpen: boolean
  onClose: () => void
  empresaId: string | null
  empresaNome: string
}

type ModuloMantran = {
  id: string
  nome: string
  tipo: string
}

export function ModulosLeoModal({ isOpen, onClose, empresaId, empresaNome }: ModulosLeoModalProps) {
  const [modulosDisponiveis, setModulosDisponiveis] = useState<ModuloMantran[]>([])
  const [clienteModulos, setClienteModulos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchDados()
    } else {
      setClienteModulos([])
    }
  }, [isOpen, empresaId])

  const fetchDados = async () => {
    setLoading(true)
    try {
      // 1. Fetch all available modules
      const mantranData = await api.getModulosMantran()
      
      const sortedModulos = (mantranData || []).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
      setModulosDisponiveis(sortedModulos)

      // 2. Fetch current client's modules
      if (empresaId) {
        const clientData = await api.getLeoModulosByEmpresa(empresaId)
        setClienteModulos(clientData ? clientData.map((m: any) => m.nome_modulo) : [])
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (nomeModulo: string, isChecked: boolean) => {
    if (!empresaId) return

    try {
      if (isChecked) {
        // Add module
        await api.insertLeoModulo({
          empresa_id: empresaId,
          ativo: true,
          nome_modulo: nomeModulo
        } as any)
        
        setClienteModulos(prev => [...prev, nomeModulo])
      } else {
        // Remove module
        const clientData = await api.getLeoModulosByEmpresa(empresaId)
        const mod = clientData.find((m: any) => m.nome_modulo === nomeModulo)
        if (mod && mod.id) {
          await api.deleteLeoModulo(mod.id)
        }
        setClienteModulos(prev => prev.filter(m => m !== nomeModulo))
      }
    } catch (err: any) {
      console.error('Erro ao alternar módulo:', err)
      alert('Erro ao atualizar: ' + err.message)
    }
  }

  if (!isOpen) return null

  const modulosList = modulosDisponiveis.filter(m => m.tipo === 'MÓDULO')
  const integracoesList = modulosDisponiveis.filter(m => m.tipo === 'INTEGRAÇÃO')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Módulos (Léo Madeiras)</h2>
            <p className="text-sm text-slate-400">{empresaNome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Seção Módulos */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-slate-800">
                  Módulos Mantran
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modulosList.map(modulo => {
                    const isChecked = clienteModulos.includes(modulo.nome)
                    return (
                      <label 
                        key={modulo.id} 
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isChecked 
                            ? 'bg-brand-500/10 border-brand-500/50 text-brand-300' 
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${
                          isChecked ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-500 bg-slate-900/50'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => handleToggle(modulo.nome, e.target.checked)}
                        />
                        <span className="text-sm font-medium">{modulo.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Seção Integrações */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-slate-800">
                  Integrações
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {integracoesList.map(modulo => {
                    const isChecked = clienteModulos.includes(modulo.nome)
                    return (
                      <label 
                        key={modulo.id} 
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isChecked 
                            ? 'bg-purple-500/10 border-purple-500/50 text-purple-300' 
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${
                          isChecked ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-500 bg-slate-900/50'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => handleToggle(modulo.nome, e.target.checked)}
                        />
                        <span className="text-sm font-medium">{modulo.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
