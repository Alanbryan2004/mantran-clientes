import { useState, useEffect } from 'react'
import { Plus, LayoutTemplate, ArrowRight, Settings, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { isReadOnlyUser } from '../lib/auth'
import { NovoProjetoModal } from '../components/NovoProjetoModal'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

interface Projeto {
  id: string
  nome: string
  status: string
  created_at: string
  progress: number
}

const getProgressColor = (progress: number) => {
  if (progress <= 33) return 'bg-red-500'
  if (progress <= 66) return 'bg-amber-400'
  return 'bg-green-500'
}

const getProgressTextColor = (progress: number) => {
  if (progress <= 33) return 'text-red-400'
  if (progress <= 66) return 'text-amber-400'
  return 'text-green-400'
}

export function Bases() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjetos()
  }, [])

  const fetchProjetos = async () => {
    setLoading(true)
    try {
      const { data: projs, error } = await supabase
        .from('projetos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error

      if (projs && projs.length > 0) {
        const pCols = await api.getProjetoColunas()
        const pBases = await api.getProjetoBases()
        const pDados = await api.getProjetoDados()

        const computedProjs: Projeto[] = projs.map((p: any) => {
          const colsProj = pCols?.filter((c: any) => c.projeto_id === p.id && c.indicador_conclusao === true) || []
          const basesProj = pBases?.filter((b: any) => b.projeto_id === p.id) || []
          const dadosProj = pDados?.filter((d: any) => d.projeto_id === p.id) || []

          if (basesProj.length === 0 || colsProj.length === 0) {
            return { ...p, progress: 0, status: p.status || 'Em Andamento' }
          }

          let concluidos = 0
          basesProj.forEach((b: any) => {
            let isDone = true
            colsProj.forEach((c: any) => {
              const d = dadosProj.find((data: any) => data.base_id === b.base_id && data.coluna_id === c.id)
              const val = d?.valor
              if (c.tipo === 'STATUS' && val !== 'OK') isDone = false
              if (c.tipo !== 'STATUS' && (!val || val.trim() === '')) isDone = false
            })
            if (isDone) concluidos++
          })

          const progress = Math.round((concluidos / basesProj.length) * 100)
          const status = progress === 100 ? 'Concluído' : (p.status || 'Em Andamento')

          return { ...p, progress, status }
        })

        setProjetos(computedProjs)
      } else {
        setProjetos([])
      }
    } catch (err) {
      console.error('Erro ao buscar projetos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProjeto = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR o projeto "${nome}"?\n\nIsso apagará todas as colunas, células e dados deste projeto permanentemente.`)) {
      try {
        const { error } = await supabase.from('projetos').delete().eq('id', id)
        if (error) throw error
        fetchProjetos()
      } catch (err: any) {
        alert('Erro ao excluir projeto: ' + err.message)
      }
    }
  }

  const projetosEmAndamento = projetos.filter(p => p.progress < 100 && p.status !== 'Concluído')
  const projetosConcluidos = projetos.filter(p => p.progress === 100 || p.status === 'Concluído')

  const renderProjectCard = (proj: Projeto) => {
    const isDone = proj.progress === 100 || proj.status === 'Concluído'

    return (
      <div 
        key={proj.id} 
        className="bg-dark-card border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all duration-300 group cursor-pointer shadow-lg relative overflow-visible flex flex-col justify-between"
        onClick={() => navigate(`/bases/${proj.id}`)}
      >
        <div className={clsx("absolute top-0 left-0 w-1 h-full rounded-l-xl", isDone ? "bg-green-500" : "bg-brand-500")}></div>
        
        <div>
          <div className="flex justify-between items-start mb-3 relative">
            <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-2 pr-8">
              {proj.nome}
            </h3>
            
            {!isReadOnlyUser() && (
              <div className="absolute -top-2 -right-2">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setOpenMenuId(openMenuId === proj.id ? null : proj.id) 
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {openMenuId === proj.id && (
                  <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); alert('Em breve: tela de configurações do projeto.') }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Editar Projeto
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDeleteProjeto(proj.id, proj.nome) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors border-t border-slate-700/50"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir Projeto
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <span className={clsx("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border", 
              isDone 
                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
            )}>
              {isDone ? '✓ Concluído' : 'Em Andamento'}
            </span>
            <span className="text-xs text-slate-500">
              Criado em {new Date(proj.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="mt-2 pt-3 border-t border-slate-800/60">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs font-semibold text-slate-400">Progresso</span>
            <span className={clsx("text-lg font-black", isDone ? "text-green-400" : getProgressTextColor(proj.progress))}>
              {proj.progress}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
            <div 
              className={clsx("h-2 rounded-full transition-all duration-1000", isDone ? "bg-green-500" : getProgressColor(proj.progress))}
              style={{ width: `${proj.progress}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 group-hover:text-slate-200">
            <span>Ver detalhes</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" onClick={() => setOpenMenuId(null)}>
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Projetos & Bases</h2>
          <p className="text-slate-400 mt-1">Acompanhe o status e implantação de novas funcionalidades em todas as bases</p>
        </div>
        {!isReadOnlyUser() && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center space-x-2 shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Projeto</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">
          Carregando projetos...
        </div>
      ) : projetos.length === 0 ? (
        <div className="card text-center p-16">
          <LayoutTemplate className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Nenhum Projeto Criado</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Crie seu primeiro projeto dinâmico para acompanhar implantações em diversas bases ao mesmo tempo.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeiro Projeto</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Section 1: Projetos em Andamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-500" />
              <span>Projetos em Andamento</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full">
                {projetosEmAndamento.length}
              </span>
            </h3>

            {projetosEmAndamento.length === 0 ? (
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-500 text-xs italic">
                Nenhum projeto em andamento no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetosEmAndamento.map(renderProjectCard)}
              </div>
            )}
          </div>

          {/* Section 2: Projetos Concluídos */}
          {projetosConcluidos.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>Projetos Concluídos</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                  {projetosConcluidos.length}
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetosConcluidos.map(renderProjectCard)}
              </div>
            </div>
          )}

        </div>
      )}

      <NovoProjetoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProjetos}
      />
    </div>
  )
}
