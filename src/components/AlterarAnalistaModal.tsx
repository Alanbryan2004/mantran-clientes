import { useState, useEffect } from 'react'
import { X, UserCheck, Check, ShieldAlert, Save } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface AlterarAnalistaModalProps {
  isOpen: boolean
  onClose: () => void
  implantacaoId: string
  currentAnalistaId?: string | null
  currentAnalistaNome?: string | null
  onSuccess: (newId: string | null, newName: string | null) => void
}

export function AlterarAnalistaModal({
  isOpen,
  onClose,
  implantacaoId,
  currentAnalistaId,
  currentAnalistaNome,
  onSuccess
}: AlterarAnalistaModalProps) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedNome, setSelectedNome] = useState<string>('')
  const [analistas, setAnalistas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentAnalistaId || '')
      setSelectedNome(currentAnalistaNome || '')
      fetchAnalistas()
    }
  }, [isOpen, currentAnalistaId, currentAnalistaNome])

  const fetchAnalistas = async () => {
    setLoading(true)
    try {
      const data = await api.getUsuariosSuporte()
      setAnalistas(data || [])
    } catch (err) {
      console.error('Erro ao carregar analistas de suporte:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const handleSelect = (id: string, nome: string) => {
    setSelectedId(id)
    setSelectedNome(nome)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateImplantacao(implantacaoId, {
        analista_responsavel_id: selectedId || null,
        analista_responsavel: selectedNome || null
      })

      // Add entry to historico
      try {
        let loggedUser: any = null
        try {
          const stored = localStorage.getItem('@Mantran:user')
          if (stored) loggedUser = JSON.parse(stored)
        } catch (_) {}

        const msg = selectedNome 
          ? `Analista responsável definido como: ${selectedNome}`
          : `Analista responsável removido`
        
        await api.insertImplantacaoHistorico({
          implantacao_id: implantacaoId,
          texto: msg,
          usuario_id: loggedUser?.id || null,
          usuario_nome: loggedUser ? (loggedUser.nome || loggedUser.login) : null
        })
      } catch (_) {}

      onSuccess(selectedId || null, selectedNome || null)
      onClose()
    } catch (err: any) {
      console.error('Erro ao atualizar analista:', err)
      alert('Erro ao atualizar analista: ' + (err.message || 'Desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Analista Responsável</h2>
              <p className="text-xs text-slate-400">Selecione o analista com Perfil Suporte</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Carregando analistas de suporte...
            </div>
          ) : analistas.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-amber-300">Nenhum analista com Perfil Suporte encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Certifique-se de que os usuários foram atualizados para o perfil Suporte no banco de dados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Combobox de Analistas (Perfil Suporte)
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => {
                    const id = e.target.value
                    const user = analistas.find((u: any) => u.id === id)
                    handleSelect(id, user ? (user.nome || user.login) : '')
                  }}
                  className="input-field w-full text-sm font-medium"
                >
                  <option value="">-- Sem Analista Responsável --</option>
                  {analistas.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.nome || u.login} ({u.login})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Ou selecione diretamente:
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {/* Opção sem analista */}
                  <div
                    onClick={() => handleSelect('', '')}
                    className={clsx(
                      "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all",
                      selectedId === ''
                        ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                        : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    )}
                  >
                    <span className="text-sm font-medium italic">Sem Analista Responsável</span>
                    {selectedId === '' && <Check className="w-4 h-4 text-amber-400" />}
                  </div>

                  {analistas.map((u: any) => {
                    const isSelected = selectedId === u.id
                    const displayName = u.nome || u.login
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSelect(u.id, displayName)}
                        className={clsx(
                          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "border-brand-500 bg-brand-500/10 text-white shadow-sm"
                            : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={clsx(
                            "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 uppercase",
                            isSelected ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-400 border border-slate-700"
                          )}>
                            {displayName.charAt(0)}
                          </div>
                          <div className="truncate">
                            <span className="text-sm font-semibold truncate block">{displayName}</span>
                            <span className="text-[11px] text-slate-400 block">@{u.login} • Suporte</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-brand-400 shrink-0 ml-2" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 flex space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
