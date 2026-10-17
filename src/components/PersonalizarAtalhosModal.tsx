import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Search, 
  Check, 
  Plus, 
  RotateCcw, 
  Sparkles, 
  Pin
} from 'lucide-react'
import { 
  ALL_SHORTCUT_OPTIONS, 
  type ShortcutDefinition, 
  isShortcutPermitted, 
  getDefaultShortcutIds, 
  saveUserShortcutIds 
} from '../lib/headerShortcuts'
import clsx from 'clsx'

interface PersonalizarAtalhosModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  currentShortcutIds: string[]
  onSaved: (newIds: string[]) => void
}

export function PersonalizarAtalhosModal({
  isOpen,
  onClose,
  user,
  currentShortcutIds,
  onSaved
}: PersonalizarAtalhosModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Sincroniza os IDs atuais quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(currentShortcutIds.slice(0, 4))
      setSearchQuery('')
    }
  }, [isOpen, currentShortcutIds])

  // Fecha no Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Filtra as opções permitidas para o usuário logado
  const permittedOptions = useMemo(() => {
    return ALL_SHORTCUT_OPTIONS.filter(opt => isShortcutPermitted(opt, user))
  }, [user])

  // Agrupa as opções permitidas por categoria filtradas pela busca
  const filteredByCategory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matches = permittedOptions.filter(opt => {
      if (!query) return true
      return (
        opt.name.toLowerCase().includes(query) ||
        opt.category.toLowerCase().includes(query)
      )
    })

    const groups: Record<string, ShortcutDefinition[]> = {
      'Geral': [],
      'Desenvolvimento & QA': [],
      'Administração': []
    }

    matches.forEach(opt => {
      if (!groups[opt.category]) groups[opt.category] = []
      groups[opt.category].push(opt)
    })

    return groups
  }, [permittedOptions, searchQuery])

  if (!isOpen) return null

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      // Remove
      setSelectedIds(prev => prev.filter(item => item !== id))
    } else {
      // Adiciona (máximo 4)
      if (selectedIds.length >= 4) return
      setSelectedIds(prev => [...prev, id])
    }
  }

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => prev.filter(item => item !== id))
  }

  const handleResetDefault = () => {
    const defaults = getDefaultShortcutIds(user)
    setSelectedIds(defaults.slice(0, 4))
  }

  const handleSave = () => {
    saveUserShortcutIds(user?.id, selectedIds)
    onSaved(selectedIds)
    onClose()
  }

  // Prepara os 4 slots para visualização no topo
  const slots = [0, 1, 2, 3].map(index => {
    const id = selectedIds[index]
    if (!id) return null
    return ALL_SHORTCUT_OPTIONS.find(opt => opt.id === id) || null
  })

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 select-none overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-[#111422] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
              <Pin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Personalizar Atalhos do Topo
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
                  {selectedIds.length}/4
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Selecione até 4 telas que você mais utiliza para acesso rápido no cabeçalho
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-fechar-modal-atalhos"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview dos 4 Slots Selecionados */}
        <div className="p-4 sm:p-5 bg-[#0d101c] border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Seus 4 Atalhos no Cabeçalho
            </span>
            <span className="text-xs text-slate-400">
              {selectedIds.length === 4 ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Máximo de 4 atalhos atingido
                </span>
              ) : (
                <span>Escolha mais {4 - selectedIds.length} {4 - selectedIds.length === 1 ? 'tela' : 'telas'} abaixo</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {slots.map((shortcut, idx) => {
              if (shortcut) {
                const Icon = shortcut.icon
                return (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-brand-500/30 shadow-sm relative group transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                        <Icon className={clsx("w-3.5 h-3.5", shortcut.color)} />
                      </div>
                      <span className="text-xs font-semibold text-white truncate" title={shortcut.name}>
                        {shortcut.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(shortcut.id, e)}
                      className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                      title="Remover este atalho"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              }

              return (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-500 text-xs"
                >
                  <span className="italic flex items-center gap-1">
                    <Plus className="w-3 h-3 text-slate-600" /> Espaço livre #{idx + 1}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Barra de Busca de Telas */}
        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-busca-atalhos"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar telas disponíveis..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Telas Selecionáveis (Rolável) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2 space-y-4">
          {Object.entries(filteredByCategory).map(([category, items]) => {
            if (items.length === 0) return null
            return (
              <div key={category} className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {category} ({items.length})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((opt) => {
                    const isSelected = selectedIds.includes(opt.id)
                    const isLimitReached = selectedIds.length >= 4 && !isSelected
                    const Icon = opt.icon

                    return (
                      <div
                        key={opt.id}
                        id={`btn-toggle-shortcut-${opt.id}`}
                        onClick={() => {
                          if (!isLimitReached) handleToggle(opt.id)
                        }}
                        className={clsx(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all select-none cursor-pointer",
                          isSelected
                            ? "bg-brand-500/15 border-brand-500/40 text-white shadow-sm"
                            : isLimitReached
                            ? "bg-slate-900/40 border-slate-800/50 text-slate-500 opacity-60 cursor-not-allowed"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                            isSelected 
                              ? "bg-brand-500/20 border-brand-500/30" 
                              : "bg-slate-800/60 border-slate-700/60"
                          )}>
                            <Icon className={clsx("w-4 h-4", opt.color)} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">
                              {opt.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                              {opt.path}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 pl-1">
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : isLimitReached ? (
                            <span className="w-6 h-6 rounded-lg border border-slate-800 text-slate-600 flex items-center justify-center text-xs">
                              -
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-lg border border-slate-700 hover:border-brand-400 hover:text-brand-400 text-slate-400 flex items-center justify-center text-xs transition-colors">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Rodapé de Ações */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <button
            type="button"
            id="btn-restaurar-padrao-atalhos"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Restaurar atalhos recomendados para seu perfil"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-cancelar-modal-atalhos"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              id="btn-salvar-modal-atalhos"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Salvar Atalhos
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
