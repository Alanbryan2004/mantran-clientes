import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Settings, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import clsx from 'clsx'

export interface ColunaItem {
  id: string
  isNew?: boolean
  nome: string
  tipo: 'STATUS' | 'DATA' | 'TEXTO'
  indicador_conclusao: boolean
  ordem: number
}

interface EditarProjetoModalProps {
  isOpen: boolean
  onClose: () => void
  projetoId: string | null
  onSuccess: () => void
}

export function EditarProjetoModal({ isOpen, onClose, projetoId, onSuccess }: EditarProjetoModalProps) {
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [colunas, setColunas] = useState<ColunaItem[]>([])
  const [removedColumnIds, setRemovedColumnIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && projetoId) {
      loadProjetoData()
    }
  }, [isOpen, projetoId])

  const loadProjetoData = async () => {
    if (!projetoId) return
    setLoading(true)
    setRemovedColumnIds([])

    try {
      // 1. Fetch projeto info
      const { data: proj, error: projErr } = await supabase
        .from('projetos')
        .select('*')
        .eq('id', projetoId)
        .single()
      
      if (projErr) throw projErr
      setNomeProjeto(proj.nome || '')

      // 2. Fetch colunas
      const { data: cols, error: colsErr } = await supabase
        .from('projeto_colunas')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('ordem', { ascending: true })

      if (colsErr) throw colsErr

      const mapped: ColunaItem[] = (cols || []).map((c: any, idx: number) => ({
        id: c.id,
        isNew: false,
        nome: c.nome || '',
        tipo: (c.tipo?.toUpperCase() || 'STATUS') as any,
        indicador_conclusao: !!c.indicador_conclusao,
        ordem: c.ordem !== undefined ? c.ordem : idx
      }))

      setColunas(mapped)
    } catch (err: any) {
      console.error('Erro ao carregar projeto para edição:', err)
      alert('Erro ao carregar dados do projeto: ' + err.message)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleAddColuna = () => {
    const newId = `temp_${Date.now()}_${Math.random()}`
    setColunas(prev => [
      ...prev,
      {
        id: newId,
        isNew: true,
        nome: '',
        tipo: 'STATUS',
        indicador_conclusao: false,
        ordem: prev.length
      }
    ])
  }

  const handleRemoveColuna = (id: string, isNew?: boolean) => {
    if (!isNew && !id.startsWith('temp_')) {
      const confirmDelete = window.confirm(
        'Atenção: Ao remover esta coluna, todos os dados salvos nela para todas as bases serão excluídos permanentemente.\n\nDeseja continuar?'
      )
      if (!confirmDelete) return
      setRemovedColumnIds(prev => [...prev, id])
    }

    setColunas(prev => prev.filter(c => c.id !== id))
  }

  const handleChangeColuna = (id: string, field: keyof ColunaItem, value: any) => {
    setColunas(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setColunas(prev => {
      const next = [...prev]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      return next.map((item, idx) => ({ ...item, ordem: idx }))
    })
  }

  const handleMoveDown = (index: number) => {
    if (index >= colunas.length - 1) return
    setColunas(prev => {
      const next = [...prev]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      return next.map((item, idx) => ({ ...item, ordem: idx }))
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projetoId) return

    if (!nomeProjeto.trim()) {
      alert('Por favor, informe o nome do projeto.')
      return
    }

    if (colunas.length === 0) {
      alert('O projeto precisa ter pelo menos uma coluna.')
      return
    }

    if (colunas.some(c => !c.nome.trim())) {
      alert('Todas as colunas precisam ter um nome preenchido.')
      return
    }

    const hasIndicador = colunas.some(c => c.indicador_conclusao)
    if (!hasIndicador) {
      const proceedWithoutIndicator = window.confirm(
        'Nenhuma coluna foi marcada como Indicador de Conclusão. Com isso, o projeto nunca contabilizará 100% de conclusão.\n\nDeseja salvar assim mesmo?'
      )
      if (!proceedWithoutIndicator) return
    }

    setSaving(true)
    try {
      // 1. Atualizar nome do projeto
      await api.updateProjeto(projetoId, { nome: nomeProjeto.trim() })

      // 2. Atualizar / Inserir / Excluir colunas
      const reorderedCols = colunas.map((col, idx) => ({
        ...col,
        ordem: idx
      }))

      await api.updateProjetoColunas(projetoId, reorderedCols, removedColumnIds)

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar edições do projeto:', err)
      alert('Erro ao salvar alterações: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Editar Projeto</h2>
              <p className="text-xs text-slate-400">
                Altere o nome e gerencie as colunas e regras de conclusão do projeto
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Carregando dados do projeto...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              
              {/* Nome do Projeto */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Nome do Projeto <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nomeProjeto}
                  onChange={e => setNomeProjeto(e.target.value)}
                  placeholder="Ex: Shopee 4PL, Migração de Base, etc."
                  className="input-field w-full py-2.5 px-4 text-sm bg-slate-800 border-slate-700 text-white focus:border-brand-500"
                  required
                />
              </div>

              {/* Colunas do Projeto */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Colunas do Projeto</span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {colunas.length}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Defina os campos da planilha e quais fazem parte da contagem de conclusão
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddColuna}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 hover:bg-slate-700"
                  >
                    <Plus className="w-4 h-4 text-brand-400" />
                    <span>Adicionar Coluna</span>
                  </button>
                </div>

                {/* Lista de colunas */}
                <div className="space-y-2.5">
                  {colunas.map((col, idx) => (
                    <div 
                      key={col.id} 
                      className="p-3.5 bg-slate-900/60 hover:bg-slate-900/90 rounded-xl border border-slate-800/80 transition-all flex flex-col md:flex-row md:items-center gap-3"
                    >
                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1 shrink-0 text-slate-400">
                        <span className="w-5 text-center text-xs font-mono font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveUp(idx)}
                            className="p-1 hover:text-brand-400 hover:bg-slate-800 rounded disabled:opacity-20 disabled:hover:bg-transparent"
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === colunas.length - 1}
                            onClick={() => handleMoveDown(idx)}
                            className="p-1 hover:text-brand-400 hover:bg-slate-800 rounded disabled:opacity-20 disabled:hover:bg-transparent"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Nome da Coluna */}
                      <div className="flex-1 min-w-[180px]">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 md:hidden">
                          Nome da Coluna
                        </label>
                        <input
                          type="text"
                          value={col.nome}
                          onChange={e => handleChangeColuna(col.id, 'nome', e.target.value)}
                          placeholder="Nome da coluna (ex: MIGRADA, TS, DATA)"
                          className="input-field py-1.5 px-3 text-xs w-full bg-slate-800/80 border-slate-700 text-slate-100"
                          required
                        />
                      </div>

                      {/* Tipo */}
                      <div className="w-full md:w-36 shrink-0">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 md:hidden">
                          Tipo de Dado
                        </label>
                        <select
                          value={col.tipo}
                          onChange={e => handleChangeColuna(col.id, 'tipo', e.target.value)}
                          className="input-field py-1.5 px-2.5 text-xs w-full bg-slate-800/80 border-slate-700 text-slate-200 cursor-pointer"
                        >
                          <option value="STATUS">STATUS (OK/Pend.)</option>
                          <option value="DATA">DATA</option>
                          <option value="TEXTO">TEXTO</option>
                        </select>
                      </div>

                      {/* Indicador de Conclusão */}
                      <div className="w-full md:w-56 shrink-0">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 md:hidden">
                          Contagem de Conclusão
                        </label>
                        <label 
                          className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all select-none",
                            col.indicador_conclusao 
                              ? "bg-green-500/10 text-green-300 border-green-500/30" 
                              : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={col.indicador_conclusao}
                            onChange={e => handleChangeColuna(col.id, 'indicador_conclusao', e.target.checked)}
                            className="rounded border-slate-600 text-green-500 focus:ring-green-500/20 bg-slate-900"
                          />
                          <div className="flex items-center gap-1.5">
                            {col.indicador_conclusao && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                            <span className="font-semibold text-[11px]">
                              {col.indicador_conclusao ? 'Indicador de Conclusão' : 'Não contabiliza'}
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Remover Coluna */}
                      <div className="flex justify-end md:justify-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveColuna(col.id, col.isNew)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remover coluna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info Card */}
                <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-2.5 text-xs text-brand-300/90 mt-4">
                  <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Regra de Conclusão:</strong> Para as colunas marcadas como <em>Indicador de Conclusão</em>, o sistema calcula o progresso geral: se a coluna for do tipo <strong>STATUS</strong>, só contabilizará como concluída quando estiver marcada como <strong>OK</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-900/70 flex justify-end items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary py-2 px-5 text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
