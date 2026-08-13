import { useState, useEffect } from 'react'
import { Plus, Rocket, Trash2, Settings, ShoppingBag, Building } from 'lucide-react'
import { api } from '../lib/api'
import { NovaImplantacaoModal } from '../components/NovaImplantacaoModal'
import { useNavigate } from 'react-router-dom'

export function Implantacoes() {
  const [implantacoes, setImplantacoes] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchImplantacoes()
  }, [])

  const fetchImplantacoes = async () => {
    setLoading(true)
    try {
      const data = await api.getImplantacoes()
      setImplantacoes(data)
    } catch (err) {
      console.error('Erro ao buscar implantações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR a implantação de "${nome}"?\n\nIsso apagará todas as etapas e dados desta implantação permanentemente.`)) return
    try {
      await api.deleteImplantacao(id)
      fetchImplantacoes()
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  const calcProgress = (etapas: any[]) => {
    if (!etapas || etapas.length === 0) return 0
    const ok = etapas.filter((e: any) => e.valor === 'OK').length
    return Math.round((ok / etapas.length) * 100)
  }

  const emAndamento = implantacoes
    .filter(i => i.status === 'Em Andamento')
    .sort((a, b) => (a.nome_empresa || '').localeCompare(b.nome_empresa || '', 'pt-BR', { sensitivity: 'base' }))

  const concluidos = implantacoes
    .filter(i => i.status === 'Concluído')
    .sort((a, b) => (a.nome_empresa || '').localeCompare(b.nome_empresa || '', 'pt-BR', { sensitivity: 'base' }))

  return (
    <div className="space-y-6" onClick={() => setOpenMenuId(null)}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Implantações</h2>
          <p className="text-slate-400 mt-1">Acompanhe o processo de onboarding de novos clientes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Implantação</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">
          Carregando implantações...
        </div>
      ) : implantacoes.length === 0 ? (
        <div className="card text-center p-16">
          <Rocket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Nenhuma Implantação</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Crie sua primeira implantação para acompanhar o onboarding de um novo cliente Mantran.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeira Implantação</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Em Andamento */}
          {emAndamento.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                Em Andamento ({emAndamento.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {emAndamento.map(impl => {
                  const progress = calcProgress(impl.implantacao_etapas)
                  return (
                    <div 
                      key={impl.id} 
                      className="bg-dark-card border border-slate-800 rounded-xl p-4 hover:border-brand-500/50 transition-all duration-300 group cursor-pointer shadow-lg relative overflow-visible flex flex-col justify-between"
                      onClick={() => navigate(`/implantacoes/${impl.id}`)}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 rounded-l-xl"></div>
                      
                      <div>
                        <div className="flex justify-between items-start mb-2 relative">
                          <div className="flex-1 min-w-0 pr-6">
                            <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors truncate">
                              {impl.nome_empresa}
                            </h3>
                          </div>
                          
                          <div className="absolute -top-1 -right-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === impl.id ? null : impl.id) }}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            
                            {openMenuId === impl.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDelete(impl.id, impl.nome_empresa) }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> Excluir Implantação
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            impl.tipo_cliente === 'SHOPEE' 
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {impl.tipo_cliente === 'SHOPEE' ? <ShoppingBag className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                            {impl.tipo_cliente}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(impl.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] text-slate-400">Progresso</span>
                            <span className="text-xs font-bold text-brand-400">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress === 100 ? 'bg-green-500' : 'bg-brand-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {impl.implantacao_etapas?.filter((e: any) => e.valor === 'OK').length || 0} / {impl.implantacao_etapas?.length || 0} etapas concluídas
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Concluídos */}
          {concluidos.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Concluídos ({concluidos.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {concluidos.map(impl => (
                  <div 
                    key={impl.id} 
                    className="bg-dark-card border border-slate-800 rounded-xl p-4 hover:border-green-500/30 transition-all duration-300 group cursor-pointer shadow-lg relative opacity-80 hover:opacity-100 flex flex-col justify-between"
                    onClick={() => navigate(`/implantacoes/${impl.id}`)}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-xl"></div>
                    
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors truncate flex-1">
                          {impl.nome_empresa}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          impl.tipo_cliente === 'SHOPEE' 
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {impl.tipo_cliente === 'SHOPEE' ? <ShoppingBag className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                          {impl.tipo_cliente}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          ✓ Concluído
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <NovaImplantacaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchImplantacoes}
      />
    </div>
  )
}
