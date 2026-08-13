import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Search, Database, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface Base {
  id: string
  nome_base: string
  empresa?: string
  tipo?: string
}

interface GerenciarBasesModalProps {
  isOpen: boolean
  onClose: () => void
  projetoId: string
  projetoNome: string
  basesAtuais: { id: string; nome_base: string; empresa?: string }[]
}

export function GerenciarBasesModal({ isOpen, onClose, projetoId, projetoNome, basesAtuais }: GerenciarBasesModalProps) {
  const [todasBases, setTodasBases] = useState<Base[]>([])
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [searchBase, setSearchBase] = useState('')
  const [filterTipo, setFilterTipo] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const basesAtuaisIds = new Set(basesAtuais.map(b => b.id))

  useEffect(() => {
    if (isOpen) {
      fetchTodasBases()
      setSelectedToAdd([])
      setSearchBase('')
      setFilterTipo('ALL')
    }
  }, [isOpen])

  const fetchTodasBases = async () => {
    const data = await api.getBasesWithClienteInfo()

    if (data) {
      setTodasBases(data.map((d: any) => ({
        id: d.id,
        nome_base: d.nome_base,
        empresa: d.clientes?.nome_empresa,
        tipo: d.clientes?.tipo || ''
      })))
    }
  }

  const handleRemoveBase = async (baseId: string, nomeBase: string) => {
    if (!confirm(`Remover "${nomeBase}" do projeto?\n\nTodos os dados preenchidos para esta base serão apagados permanentemente.`)) return

    setRemoving(baseId)
    try {
      // 1. Delete dados associated with this base in this project
      await api.deleteProjetoDadosByBase(projetoId, baseId)

      // 2. Delete the base from the project
      await api.removeBaseFromProjeto(projetoId, baseId)

      // Close and refresh (parent will refetch)
      onClose()
    } catch (err: any) {
      console.error('Erro ao remover base:', err)
      alert('Erro ao remover base: ' + err.message)
    } finally {
      setRemoving(null)
    }
  }

  const handleAddBases = async () => {
    if (selectedToAdd.length === 0) return

    setLoading(true)
    try {
      const toInsert = selectedToAdd.map(base_id => ({
        projeto_id: projetoId,
        base_id
      }))

      await api.addBasesToProjeto(toInsert)

      setSelectedToAdd([])
      onClose()
    } catch (err: any) {
      console.error('Erro ao adicionar bases:', err)
      alert('Erro ao adicionar bases: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleBase = (id: string) => {
    if (selectedToAdd.includes(id)) {
      setSelectedToAdd(selectedToAdd.filter(b => b !== id))
    } else {
      setSelectedToAdd([...selectedToAdd, id])
    }
  }

  const selectAllFiltered = () => {
    const newSelected = [...selectedToAdd]
    filteredAvailable.forEach(b => {
      if (!newSelected.includes(b.id)) newSelected.push(b.id)
    })
    setSelectedToAdd(newSelected)
  }

  const deselectAll = () => {
    setSelectedToAdd([])
  }

  if (!isOpen) return null

  // Bases available to add = all bases - bases already in project
  const basesDisponiveis = todasBases.filter(b => !basesAtuaisIds.has(b.id))

  const filteredAvailable = basesDisponiveis.filter(b => {
    const matchSearch = b.nome_base.toLowerCase().includes(searchBase.toLowerCase()) ||
      (b.empresa && b.empresa.toLowerCase().includes(searchBase.toLowerCase()))
    const matchTipo = filterTipo === 'ALL' || b.tipo === filterTipo
    return matchSearch && matchTipo
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-500" />
              Gerenciar Bases
            </h2>
            <p className="text-sm text-slate-400">{projetoNome} • {basesAtuais.length} bases no projeto</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">

          {/* Section 1: Current Bases */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500"></span>
              Bases no Projeto ({basesAtuais.length})
            </h3>
            
            {basesAtuais.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nenhuma base no projeto.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {basesAtuais.map(base => (
                  <div 
                    key={base.id} 
                    className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5 group hover:border-red-500/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-slate-200 truncate">{base.nome_base}</p>
                      <p className="text-xs text-slate-500 truncate">{base.empresa || 'Sem cliente'}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveBase(base.id, base.nome_base)}
                      disabled={removing === base.id}
                      className="ml-2 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                      title={`Remover ${base.nome_base}`}
                    >
                      {removing === base.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {basesAtuais.length > 0 && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-500/80">Ao remover uma base, todos os dados preenchidos para ela neste projeto serão apagados.</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800"></div>

          {/* Section 2: Add Bases */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Adicionar Bases
                {selectedToAdd.length > 0 && (
                  <span className="text-brand-500 normal-case font-bold">({selectedToAdd.length} selecionadas)</span>
                )}
              </h3>
              <div className="flex gap-3">
                {selectedToAdd.length > 0 && (
                  <button onClick={deselectAll} className="text-xs text-slate-500 hover:text-slate-300 underline">
                    Limpar
                  </button>
                )}
                <button onClick={selectAllFiltered} className="text-xs text-brand-400 hover:text-brand-300 underline">
                  Selecionar Todas Abaixo
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchBase}
                  onChange={e => setSearchBase(e.target.value)}
                  className="input-field w-full pl-9"
                  placeholder="Pesquisar base ou empresa..."
                />
              </div>
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className="input-field w-36 shrink-0"
              >
                <option value="ALL">Todos Tipos</option>
                <option value="NORMAL">Normal</option>
                <option value="SHOPEE">Shopee</option>
              </select>
            </div>

            {/* Base grid */}
            <div className="border border-slate-700/50 rounded-lg max-h-52 overflow-y-auto p-2 bg-slate-900/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 custom-scrollbar">
              {filteredAvailable.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4 col-span-3">
                  {searchBase || filterTipo !== 'ALL' ? 'Nenhuma base encontrada com os filtros atuais.' : 'Todas as bases já estão no projeto.'}
                </p>
              ) : (
                filteredAvailable.map(b => (
                  <label
                    key={b.id}
                    className={clsx(
                      "flex flex-col p-2 rounded cursor-pointer border transition-colors",
                      selectedToAdd.includes(b.id)
                        ? "bg-emerald-500/10 border-emerald-500/50"
                        : "bg-slate-800/30 border-transparent hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="accent-emerald-500"
                        checked={selectedToAdd.includes(b.id)}
                        onChange={() => toggleBase(b.id)}
                      />
                      <span className="font-mono text-sm text-slate-200">{b.nome_base}</span>
                    </div>
                    <span className="text-xs text-slate-500 ml-5 truncate">
                      {b.empresa || 'Sem cliente alocado'}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-between shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          {selectedToAdd.length > 0 && (
            <button
              type="button"
              onClick={handleAddBases}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Adicionando...' : `Adicionar ${selectedToAdd.length} Base${selectedToAdd.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
