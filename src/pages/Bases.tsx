import { useState, useEffect } from 'react'
import { Plus, LayoutTemplate, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NovoProjetoModal } from '../components/NovoProjetoModal'
import { useNavigate } from 'react-router-dom'

interface Projeto {
  id: string
  nome: string
  status: string
  created_at: string
}

export function Bases() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjetos()
  }, [])

  const fetchProjetos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setProjetos(data || [])
    } catch (err) {
      console.error('Erro ao buscar projetos:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Projetos Executados</h2>
          <p className="text-slate-400 mt-1">Gerenciamento dinâmico de implantações e atualizações</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Projeto</span>
        </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projetos.map(proj => (
            <div 
              key={proj.id} 
              className="bg-dark-card border border-slate-800 rounded-xl p-6 hover:border-brand-500/50 transition-all duration-300 group cursor-pointer shadow-lg relative overflow-hidden"
              onClick={() => navigate(`/bases/${proj.id}`)}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 rounded-l-xl"></div>
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-2">
                  {proj.nome}
                </h3>
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${
                  proj.status === 'Concluído' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                }`}>
                  {proj.status}
                </span>
                <span className="text-xs text-slate-500">
                  Criado em {new Date(proj.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center text-sm text-slate-400 group-hover:text-slate-300">
                <span>Ver detalhes</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
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
