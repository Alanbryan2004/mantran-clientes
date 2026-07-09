import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Database, LayoutTemplate } from 'lucide-react'
import { supabase } from '../lib/supabase'
import clsx from 'clsx'

interface Base {
  id: string
  nome_base: string
  empresa?: string
}

interface ColunaDef {
  id: string // temporary internal id
  nome: string
  tipo: 'DATA' | 'TEXTO' | 'STATUS'
  indicador_conclusao: boolean
}

interface NovoProjetoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NovoProjetoModal({ isOpen, onClose, onSuccess }: NovoProjetoModalProps) {
  const [step, setStep] = useState(1) // 1: Info, 2: Colunas
  
  // Form State
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [bases, setBases] = useState<Base[]>([])
  const [selectedBases, setSelectedBases] = useState<string[]>([])
  
  const [colunas, setColunas] = useState<ColunaDef[]>([
    { id: '1', nome: 'Status Geral', tipo: 'STATUS', indicador_conclusao: true },
    { id: '2', nome: 'Data Entrega', tipo: 'DATA', indicador_conclusao: false }
  ])

  const [loading, setLoading] = useState(false)
  const [searchBase, setSearchBase] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchBases()
      // reset form
      setStep(1)
      setNomeProjeto('')
      setSelectedBases([])
      setColunas([
        { id: '1', nome: 'Status Geral', tipo: 'STATUS', indicador_conclusao: true },
        { id: '2', nome: 'Data Entrega', tipo: 'DATA', indicador_conclusao: false }
      ])
    }
  }, [isOpen])

  const fetchBases = async () => {
    const { data } = await supabase
      .from('bases')
      .select(`id, nome_base, clientes ( nome_empresa )`)
      .order('nome_base', { ascending: true })

    if (data) {
      const formatted = data.map((d: any) => ({
        id: d.id,
        nome_base: d.nome_base,
        empresa: d.clientes?.nome_empresa
      }))
      setBases(formatted)
    }
  }

  const handleAddColuna = () => {
    setColunas([...colunas, { 
      id: Math.random().toString(), 
      nome: '', 
      tipo: 'TEXTO', 
      indicador_conclusao: false 
    }])
  }

  const handleRemoveColuna = (id: string) => {
    setColunas(colunas.filter(c => c.id !== id))
  }

  const handleChangeColuna = (id: string, field: keyof ColunaDef, value: any) => {
    setColunas(colunas.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const toggleBase = (id: string) => {
    if (selectedBases.includes(id)) {
      setSelectedBases(selectedBases.filter(b => b !== id))
    } else {
      setSelectedBases([...selectedBases, id])
    }
  }

  const selectAllFiltered = () => {
    const filtered = bases.filter(b => 
      b.nome_base.toLowerCase().includes(searchBase.toLowerCase()) || 
      (b.empresa && b.empresa.toLowerCase().includes(searchBase.toLowerCase()))
    )
    const newSelected = [...selectedBases]
    filtered.forEach(f => {
      if (!newSelected.includes(f.id)) newSelected.push(f.id)
    })
    setSelectedBases(newSelected)
  }

  const handleSubmit = async () => {
    if (!nomeProjeto.trim()) return alert('Informe o nome do projeto')
    if (selectedBases.length === 0) return alert('Selecione pelo menos uma base')
    if (colunas.some(c => !c.nome.trim())) return alert('Todas as colunas devem ter um nome')
    if (!colunas.some(c => c.indicador_conclusao)) {
      const confirmNoIndicator = confirm('Você não marcou nenhuma coluna como Indicador de Conclusão. O projeto nunca atingirá 100%. Deseja continuar?')
      if (!confirmNoIndicator) return
    }

    setLoading(true)
    try {
      // 1. Criar Projeto
      const { data: projData, error: projErr } = await supabase
        .from('projetos')
        .insert([{ nome: nomeProjeto }])
        .select()
        .single()
      
      if (projErr) throw projErr
      const projetoId = projData.id

      // 2. Inserir Colunas
      const colsToInsert = colunas.map((c, index) => ({
        projeto_id: projetoId,
        nome: c.nome,
        tipo: c.tipo,
        ordem: index,
        indicador_conclusao: c.indicador_conclusao
      }))
      const { error: colErr } = await supabase.from('projeto_colunas').insert(colsToInsert)
      if (colErr) throw colErr

      // 3. Inserir Bases
      const basesToInsert = selectedBases.map(base_id => ({
        projeto_id: projetoId,
        base_id
      }))
      const { error: baseErr } = await supabase.from('projeto_bases').insert(basesToInsert)
      if (baseErr) throw baseErr

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar projeto: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const filteredBases = bases.filter(b => 
    b.nome_base.toLowerCase().includes(searchBase.toLowerCase()) || 
    (b.empresa && b.empresa.toLowerCase().includes(searchBase.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-brand-500" />
              Criar Novo Projeto
            </h2>
            <p className="text-sm text-slate-400">
              {step === 1 ? 'Passo 1 de 2: Defina o nome e os participantes' : 'Passo 2 de 2: Defina as colunas do seu projeto'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome do Projeto
                </label>
                <input
                  type="text"
                  value={nomeProjeto}
                  onChange={e => setNomeProjeto(e.target.value)}
                  className="input-field w-full text-lg py-3"
                  placeholder="Ex: Implantação WMS Q3"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Bases Participantes <span className="text-brand-500 font-bold">({selectedBases.length} selecionadas)</span>
                  </label>
                  <button onClick={selectAllFiltered} className="text-xs text-brand-400 hover:text-brand-300 underline">
                    Selecionar Todas Abaixo
                  </button>
                </div>
                
                <input
                  type="text"
                  value={searchBase}
                  onChange={e => setSearchBase(e.target.value)}
                  className="input-field w-full mb-3"
                  placeholder="Pesquisar base ou empresa..."
                />

                <div className="border border-slate-700/50 rounded-lg max-h-64 overflow-y-auto p-2 bg-slate-900/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredBases.map(b => (
                    <label 
                      key={b.id} 
                      className={clsx(
                        "flex flex-col p-2 rounded cursor-pointer border transition-colors",
                        selectedBases.includes(b.id) 
                          ? "bg-brand-500/10 border-brand-500/50" 
                          : "bg-slate-800/30 border-transparent hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="accent-brand-500"
                          checked={selectedBases.includes(b.id)}
                          onChange={() => toggleBase(b.id)}
                        />
                        <span className="font-mono text-sm text-slate-200">{b.nome_base}</span>
                      </div>
                      <span className="text-xs text-slate-500 ml-5 truncate">
                        {b.empresa || 'Sem cliente alocado'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
              
              <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-lg flex items-start space-x-3">
                <Database className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-brand-300">Como funcionam as colunas?</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Você está criando uma tabela customizada. Para cada base selecionada, você precisará preencher os dados dessas colunas. 
                    <strong>Importante:</strong> Marque pelo menos uma coluna como "Indicador de Conclusão" para que o sistema saiba quando o projeto daquela base chegou ao fim e possa calcular a porcentagem geral de sucesso.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {colunas.map((col, idx) => (
                  <div key={col.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-800/40 p-3 rounded-lg border border-slate-700">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Nome da Coluna</label>
                      <input
                        type="text"
                        value={col.nome}
                        onChange={e => handleChangeColuna(col.id, 'nome', e.target.value)}
                        className="input-field w-full h-9 text-sm"
                        placeholder="Ex: Treinamento Realizado"
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Tipo de Dado</label>
                      <select
                        value={col.tipo}
                        onChange={e => handleChangeColuna(col.id, 'tipo', e.target.value)}
                        className="input-field w-full h-9 text-sm py-0"
                      >
                        <option value="STATUS">Status (OK/Pendente)</option>
                        <option value="DATA">Data</option>
                        <option value="TEXTO">Texto Livre</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start pt-4 sm:pt-0 gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer group mt-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-brand-500"
                          checked={col.indicador_conclusao}
                          onChange={e => handleChangeColuna(col.id, 'indicador_conclusao', e.target.checked)}
                        />
                        <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300">
                          Indicador de Conclusão?
                        </span>
                      </label>
                      <button 
                        onClick={() => handleRemoveColuna(col.id)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded mt-4"
                        title="Remover Coluna"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleAddColuna}
                className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-brand-500/50 hover:bg-brand-500/5 text-slate-400 hover:text-brand-400 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Adicionar Nova Coluna</span>
              </button>

            </div>
          )}

        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-between shrink-0">
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                className="btn-primary"
                disabled={!nomeProjeto || selectedBases.length === 0}
              >
                Próximo Passo
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">Voltar</button>
              <button 
                type="button" 
                onClick={handleSubmit} 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Finalizar Criação'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
