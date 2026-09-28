import { useState, useEffect } from 'react'
import { X, Database, Save, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface AlterarBaseModalProps {
  isOpen: boolean
  onClose: () => void
  implantacaoId: string
  clienteId: string
  currentBaseId?: string | null
  currentBaseNome?: string | null
  onSuccess: () => void
}

export function AlterarBaseModal({
  isOpen,
  onClose,
  implantacaoId,
  clienteId,
  currentBaseId,
  currentBaseNome,
  onSuccess
}: AlterarBaseModalProps) {
  const [basesDisponiveis, setBasesDisponiveis] = useState<any[]>([])
  const [selectedBaseId, setSelectedBaseId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedBaseId('')
      fetchBasesDisponiveis()
    }
  }, [isOpen])

  const fetchBasesDisponiveis = async () => {
    setLoading(true)
    try {
      const data = await api.getBasesWithClienteInfo()
      // Somente bases sem cliente vinculado (disponíveis)
      const livres = (data || [])
        .filter((b: any) => !b.clientes)
        .sort((a: any, b: any) => a.nome_base.localeCompare(b.nome_base))
      setBasesDisponiveis(livres)
    } catch (err) {
      console.error('Erro ao buscar bases disponíveis:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const baseSelecionada = basesDisponiveis.find(b => b.id === selectedBaseId)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBaseId || !baseSelecionada) {
      alert('Selecione a nova base de destino.')
      return
    }
    if (selectedBaseId === currentBaseId) {
      alert('A base selecionada é a mesma base atual.')
      return
    }

    const confirmar = window.confirm(
      `Confirmar a troca da base?\n\nDe: ${currentBaseNome || '—'}\nPara: ${baseSelecionada.nome_base}\n\nA base atual será liberada e ficará disponível para outros clientes.`
    )
    if (!confirmar) return

    setSaving(true)
    try {
      // 1. Liberar a base antiga (se houver)
      if (currentBaseId) {
        await api.updateBase(currentBaseId, { cliente_id: null, status: 'Disponível' })
      }

      // 2. Alocar a nova base ao cliente
      await api.updateBase(selectedBaseId, { cliente_id: clienteId, status: 'Em Uso' })

      // 3. Atualizar a referência da implantação (é o que o card exibe)
      await api.updateImplantacao(implantacaoId, { base_id: selectedBaseId })

      // 4. Registrar no histórico
      try {
        let loggedUser: any = null
        try {
          const stored = localStorage.getItem('@Mantran:user')
          if (stored) loggedUser = JSON.parse(stored)
        } catch (_) {}

        await api.insertImplantacaoHistorico({
          implantacao_id: implantacaoId,
          data_hora: new Date().toISOString(),
          texto: `Base alterada de "${currentBaseNome || '—'}" para "${baseSelecionada.nome_base}".`,
          usuario_id: loggedUser?.id || null,
          usuario_nome: loggedUser ? (loggedUser.nome || loggedUser.login) : null
        })
      } catch (_) {}

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao alterar base:', err)
      alert('Erro ao alterar a base: ' + (err.message || 'Desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Alterar Base Alocada</h2>
              <p className="text-xs text-slate-400">Migre o cliente para outra base disponível</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Base atual */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Base Atual</span>
            <p className="text-lg font-black font-mono text-white mt-0.5">{currentBaseNome || '—'}</p>
          </div>

          {/* Aviso */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Ao trocar, a base atual será liberada (ficará disponível) e a nova base passará a ser usada por este cliente.
            </span>
          </div>

          {/* Seleção da nova base */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
              Nova Base de Destino
            </label>
            {loading ? (
              <div className="text-center py-4 text-slate-400 text-sm">Carregando bases disponíveis...</div>
            ) : basesDisponiveis.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-center text-xs text-slate-400">
                Nenhuma base disponível no momento.
              </div>
            ) : (
              <select
                value={selectedBaseId}
                onChange={(e) => setSelectedBaseId(e.target.value)}
                className="input-field w-full text-sm font-medium font-mono"
              >
                <option value="">-- Selecione a base --</option>
                {basesDisponiveis.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.nome_base}</option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-3 flex space-x-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !selectedBaseId}
              className={clsx(
                "btn-primary flex-1 flex items-center justify-center gap-2",
                (!selectedBaseId || saving) && "opacity-60 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Migrando...' : 'Confirmar Troca'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
