import { useState, useEffect } from 'react'
import { Plus, Rocket, Trash2, Settings, ShoppingBag, Building, CheckCircle2, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { NovaImplantacaoModal } from '../components/NovaImplantacaoModal'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

const SHOPEE_ETAPAS_ORDER: Record<string, number> = {
  'checkpoint': 1,
  'configurar base': 2,
  'ativo 4pl': 3,
  'ativo 4pi': 3,
  'testes': 4,
  'treinamento last mile': 5,
  'treinamento de first mile': 6,
  'treinamento first mile': 6,
  'treinamento de cadastros': 7,
  'treinamento de cadastro': 7,
  'treinamento cadastros': 7,
  'treinamento cadastro': 7,
  'treinamento de line haul': 8,
  'treinamento line haul': 8,
  'treinamento mobile hub': 8.5,
  'treinamento de mobile hub': 8.5,
  'treinamento fatura': 9,
  'feedback': 10,
}

const normalizeEtapaNome = (nome: string): string => {
  const lower = (nome || '').trim().toLowerCase()
  if (lower === 'ativo 4pl' || lower === 'ativo 4pi') return 'Ativo 4PL'
  if (lower === 'treinamento first mile' || lower === 'treinamento de first mile') return 'Treinamento de First Mile'
  if (lower === 'treinamento de cadastro' || lower === 'treinamento de cadastros' || lower === 'treinamento cadastro' || lower === 'treinamento cadastros') return 'Treinamento de Cadastros'
  if (lower === 'treinamento line haul' || lower === 'treinamento de line haul') return 'Treinamento de Line Haul'
  return nome
}

const getProximaEtapa = (etapas: any[], isShopee: boolean = false) => {
  if (!etapas || etapas.length === 0) return null
  const sorted = [...etapas].sort((a, b) => {
    const keyA = (a.nome_etapa || '').trim().toLowerCase()
    const keyB = (b.nome_etapa || '').trim().toLowerCase()

    if (isShopee || (keyA in SHOPEE_ETAPAS_ORDER && keyB in SHOPEE_ETAPAS_ORDER)) {
      const orderA = SHOPEE_ETAPAS_ORDER[keyA] ?? (keyA === 'feedback' ? 999 : (a.ordem || 50))
      const orderB = SHOPEE_ETAPAS_ORDER[keyB] ?? (keyB === 'feedback' ? 999 : (b.ordem || 50))
      if (orderA !== orderB) return orderA - orderB
    }

    if (keyA === 'feedback') return 1
    if (keyB === 'feedback') return -1
    return (a.ordem || 0) - (b.ordem || 0)
  })

  return sorted.find(e => e.valor !== 'OK') || null
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

export function Implantacoes() {
  const [implantacoes, setImplantacoes] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'EM_ANDAMENTO' | 'CONCLUIDOS'>('EM_ANDAMENTO')
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
      <div className="flex justify-between items-center mb-6">
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

      {/* Submenu / Abas de Navegação */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('EM_ANDAMENTO')}
          className={clsx(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border",
            activeTab === 'EM_ANDAMENTO'
              ? "bg-brand-500/15 text-brand-400 border-brand-500/30 shadow-lg shadow-brand-500/10"
              : "bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
          )}
        >
          <Clock className="w-4 h-4 text-brand-400" />
          <span>Em Andamento</span>
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-mono font-bold transition-colors",
            activeTab === 'EM_ANDAMENTO' ? "bg-brand-500/20 text-brand-300" : "bg-slate-800 text-slate-400"
          )}>
            {emAndamento.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CONCLUIDOS')}
          className={clsx(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border",
            activeTab === 'CONCLUIDOS'
              ? "bg-green-500/15 text-green-400 border-green-500/30 shadow-lg shadow-green-500/10"
              : "bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
          )}
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>Concluídos</span>
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-mono font-bold transition-colors",
            activeTab === 'CONCLUIDOS' ? "bg-green-500/20 text-green-300" : "bg-slate-800 text-slate-400"
          )}>
            {concluidos.length}
          </span>
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
        <div>
          {/* Aba: Em Andamento */}
          {activeTab === 'EM_ANDAMENTO' && (
            <div>
              {emAndamento.length === 0 ? (
                <div className="card text-center p-12 text-slate-400">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-base font-bold text-white mb-1">Nenhuma implantação em andamento</p>
                  <p className="text-xs text-slate-400">Todas as implantações atuais foram finalizadas ou nenhuma foi criada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {emAndamento.map(impl => {
                    const progress = calcProgress(impl.implantacao_etapas)
                    const isShopee = impl.tipo_cliente === 'SHOPEE'
                    const proximaEtapa = getProximaEtapa(impl.implantacao_etapas, isShopee)
                    const progressColor = getProgressColor(progress)
                    const progressTextColor = getProgressTextColor(progress)

                    return (
                      <div 
                        key={impl.id} 
                        className="bg-dark-card border border-slate-800 rounded-xl p-4 hover:border-brand-500/50 transition-all duration-300 group cursor-pointer shadow-lg relative overflow-visible flex flex-col justify-between"
                        onClick={() => navigate(`/implantacoes/${impl.id}`)}
                      >
                        <div className={`absolute top-0 left-0 w-1 h-full ${progressColor} rounded-l-xl`}></div>
                        
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

                          <div className="flex items-center gap-2 mb-2.5">
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

                          {/* Próxima etapa a ser concluída */}
                          <div className="my-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Próxima Etapa:</span>
                              {proximaEtapa ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  proximaEtapa.valor === 'PENDENTE'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {proximaEtapa.valor === 'PENDENTE' ? 'Pendente' : 'Em Branco'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-green-500/10 text-green-400 border-green-500/20">
                                  Concluído
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                !proximaEtapa 
                                  ? 'bg-green-500' 
                                  : proximaEtapa.valor === 'PENDENTE' 
                                  ? 'bg-amber-400' 
                                  : 'bg-slate-500'
                              }`}></span>
                              <span className="truncate">
                                {proximaEtapa ? normalizeEtapaNome(proximaEtapa.nome_etapa) : 'Todas as etapas concluídas'}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] text-slate-400">Progresso</span>
                              <span className={`text-xs font-bold ${progressTextColor}`}>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
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
              )}
            </div>
          )}

          {/* Aba: Concluídos */}
          {activeTab === 'CONCLUIDOS' && (
            <div>
              {concluidos.length === 0 ? (
                <div className="card text-center p-12 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-base font-bold text-white mb-1">Nenhuma implantação concluída ainda</p>
                  <p className="text-xs text-slate-400">Quando todas as etapas de um cliente forem marcadas como OK, ele aparecerá aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {concluidos.map(impl => (
                    <div 
                      key={impl.id} 
                      className="bg-dark-card border border-slate-800 rounded-xl p-4 hover:border-green-500/40 transition-all duration-300 group cursor-pointer shadow-lg relative flex flex-col justify-between"
                      onClick={() => navigate(`/implantacoes/${impl.id}`)}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-xl"></div>
                      
                      <div>
                        <div className="flex justify-between items-start mb-2 relative">
                          <div className="flex-1 min-w-0 pr-6">
                            <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors truncate">
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
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </span>
                        </div>

                        {/* 100% Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] text-slate-400">Progresso</span>
                            <span className="text-xs font-bold text-green-400">100%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full bg-green-500 w-full"></div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {impl.implantacao_etapas?.length || 0} / {impl.implantacao_etapas?.length || 0} etapas concluídas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
