import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Users, Database, Server, ShoppingBag, Briefcase, Building, Rocket, ArrowRight, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

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

const getBasesCapacityColor = (disponiveis: number) => {
  if (disponiveis <= 3) return 'bg-red-500'
  if (disponiveis <= 6) return 'bg-amber-400'
  return 'bg-green-500'
}

const getBasesCapacityTextColor = (disponiveis: number) => {
  if (disponiveis <= 3) return 'text-red-400'
  if (disponiveis <= 6) return 'text-amber-400'
  return 'text-green-400'
}

const getBasesCapacityBorderColor = (disponiveis: number) => {
  if (disponiveis <= 3) return 'border-red-500'
  if (disponiveis <= 6) return 'border-amber-500'
  return 'border-emerald-500'
}

export function Dashboard() {
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalBases: 0,
    basesDisponiveis: 0,
    basesEmUso: 0,
    clientesShopee: 0,
    clientesNormal: 0,
    clientesLeoAtivos: 0,
    clientesLeoTotal: 0,
  })

  const [implantacoesStats, setImplantacoesStats] = useState({
    totalImplantacoes: 0,
    concluidasCount: 0,
    emAndamentoCount: 0,
    overallProgress: 0,
  })

  const [activeProjects, setActiveProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Parallel fast fetching for smooth rendering
      const [basesRes, clientesRes, leoRes, impRes, projsRes, colsRes, pBasesRes, dadosRes] = await Promise.allSettled([
        api.getBases(),
        api.getClientes(),
        api.getLeoEmpresas(),
        api.getImplantacoes(),
        api.getProjetosAtivos(),
        api.getProjetoColunas(),
        api.getProjetoBases(),
        api.getProjetoDados()
      ])

      const bases = basesRes.status === 'fulfilled' ? basesRes.value : []
      const clientes = clientesRes.status === 'fulfilled' ? clientesRes.value : []
      const clientesLeo = leoRes.status === 'fulfilled' ? leoRes.value : []
      const implantacoes = impRes.status === 'fulfilled' ? impRes.value : []
      const projs = projsRes.status === 'fulfilled' ? projsRes.value : []
      const pCols = colsRes.status === 'fulfilled' ? colsRes.value : []
      const pBases = pBasesRes.status === 'fulfilled' ? pBasesRes.value : []
      const pDados = dadosRes.status === 'fulfilled' ? dadosRes.value : []
      
      if (bases && clientes) {
        const testClientIds = new Set(clientes.filter((c: any) => c.tipo === 'TESTE').map((c: any) => c.id))
        const totalBases = bases.length
        const basesEmUso = bases.filter((b: any) => b.cliente_id !== null && !testClientIds.has(b.cliente_id)).length
        const basesDisponiveis = totalBases - basesEmUso
        
        const clientesShopee = clientes.filter((c: any) => c.tipo === 'SHOPEE').length
        const clientesNormal = clientes.filter((c: any) => c.tipo === 'NORMAL').length
        const clientesLeoTotal = clientesLeo ? clientesLeo.length : 0
        const clientesLeoAtivos = clientesLeo ? clientesLeo.filter((e: any) => e.ativo !== false).length : 0
        
        setStats({
          totalBases,
          basesDisponiveis,
          basesEmUso,
          clientesShopee,
          clientesNormal,
          clientesLeoAtivos,
          clientesLeoTotal
        })
      }

      // Buscar Implantações
      if (implantacoes && implantacoes.length > 0) {
        const totalImplantacoes = implantacoes.length
        const concluidasCount = implantacoes.filter((i: any) => i.status === 'Concluído').length
        const emAndamentoCount = totalImplantacoes - concluidasCount
        
        let totalEtapasAll = 0
        let okEtapasAll = 0
        implantacoes.forEach((imp: any) => {
          const etapas = imp.implantacao_etapas || []
          totalEtapasAll += etapas.length
          okEtapasAll += etapas.filter((e: any) => e.valor === 'OK').length
        })

        const overallProgress = totalEtapasAll > 0 ? Math.round((okEtapasAll / totalEtapasAll) * 100) : 0

        setImplantacoesStats({
          totalImplantacoes,
          concluidasCount,
          emAndamentoCount,
          overallProgress
        })
      }

      // Buscar Projetos em Andamento
      if (projs && projs.length > 0) {
        const computedProjs = projs.map((p: any) => {
          const colsProj = pCols?.filter((c: any) => c.projeto_id === p.id && c.indicador_conclusao === true) || []
          const basesProj = pBases?.filter((b: any) => b.projeto_id === p.id) || []
          const dadosProj = pDados?.filter((d: any) => d.projeto_id === p.id) || []

          if (basesProj.length === 0 || colsProj.length === 0) return { ...p, progress: 0 }

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
          return { ...p, progress: Math.round((concluidos / basesProj.length) * 100) }
        })
        const inProgressProjs = computedProjs.filter((p: any) => p.progress < 100)
        setActiveProjects(inProgressProjs)
      } else {
        setActiveProjects([])
      }

    } catch (err: any) {
      console.error('Erro ao buscar stats do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const usoPercent = stats.totalBases > 0 ? Math.round((stats.basesEmUso / stats.totalBases) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto space-y-6 -m-8 p-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-100">Visão Geral</h2>
        <p className="text-slate-400 mt-1">Acompanhamento da infraestrutura e novos clientes Mantran</p>
      </div>

      {loading ? (
        <div className="text-slate-400 p-8 text-center animate-pulse">Carregando métricas...</div>
      ) : (
        <>
          {/* Top Row: 4 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Bases Disponíveis */}
            <div className={clsx("card flex items-center p-6 border-l-4 relative overflow-hidden", getBasesCapacityBorderColor(stats.basesDisponiveis))}>
              <div className={clsx(
                "p-4 rounded-lg mr-4 shrink-0 relative",
                stats.basesDisponiveis <= 3 ? "bg-red-500/10 text-red-400" :
                stats.basesDisponiveis <= 6 ? "bg-amber-500/10 text-amber-400" :
                "bg-emerald-500/10 text-emerald-500"
              )}>
                <Database className="w-8 h-8" />
                {stats.basesDisponiveis <= 3 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Bases Disponíveis</p>
                <div className="flex flex-wrap items-baseline gap-2 mt-1">
                  <p className={clsx(
                    "text-3xl font-bold",
                    getBasesCapacityTextColor(stats.basesDisponiveis)
                  )}>{stats.basesDisponiveis}</p>
                  {stats.basesDisponiveis <= 3 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 uppercase animate-pulse flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                      Solicitar Novas Bases
                    </span>
                  )}
                  {stats.basesDisponiveis > 3 && stats.basesDisponiveis <= 6 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                      Atenção
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Bases em Uso */}
            <div className="card flex items-center p-6 border-l-4 border-amber-500">
              <div className="p-4 bg-amber-500/10 rounded-lg text-amber-500 mr-4 shrink-0">
                <Server className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Bases em Uso</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.basesEmUso}</p>
              </div>
            </div>

            {/* Card 3: Total Clientes */}
            <div className="card flex items-center p-6 border-l-4 border-brand-500">
              <div className="p-4 bg-brand-500/10 rounded-lg text-brand-500 mr-4 shrink-0">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Clientes</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.clientesShopee + stats.clientesNormal}</p>
              </div>
            </div>

            {/* Card 4: Uso da Nuvem */}
            <div className={clsx("card flex flex-col justify-center p-6 border-l-4 relative overflow-hidden", getBasesCapacityBorderColor(stats.basesDisponiveis))}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Uso da Nuvem</p>
                {stats.basesDisponiveis <= 3 && (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                    Solicitar Novas Bases
                  </span>
                )}
              </div>
              <div className="flex justify-between items-end mb-2">
                <span className={`text-2xl font-bold ${getBasesCapacityTextColor(stats.basesDisponiveis)}`}>{usoPercent}%</span>
                <span className="text-xs text-slate-400">{stats.totalBases} bases totais</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={clsx("h-2.5 rounded-full transition-all duration-1000", getBasesCapacityColor(stats.basesDisponiveis))}
                  style={{ width: `${usoPercent}%` }}
                ></div>
              </div>
            </div>
            
          </div>

          {/* Second Row: Client categories + Implantações Stat Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            
            {/* Clientes Shopee */}
            <div 
              onClick={() => navigate('/clientes?tipo=SHOPEE')}
              className="card p-6 border border-slate-800/50 hover:border-green-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center group-hover:text-green-400 transition-colors">
                  <ShoppingBag className="w-5 h-5 mr-2 text-green-500 shrink-0" />
                  Clientes SHOPEE
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600">
                  {stats.clientesShopee}
                </div>
                <div className="text-sm text-slate-400 leading-tight">
                  empresas integradas <br/>com a Shopee
                </div>
              </div>
            </div>

            {/* Clientes Normais */}
            <div 
              onClick={() => navigate('/clientes?tipo=NORMAL')}
              className="card p-6 border border-slate-800/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center group-hover:text-blue-400 transition-colors">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-500 shrink-0" />
                  Clientes NORMAIS
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600">
                  {stats.clientesNormal}
                </div>
                <div className="text-sm text-slate-400 leading-tight">
                  empresas com <br/>operação logística padrão
                </div>
              </div>
            </div>

            {/* Léo Madeiras */}
            <div 
              onClick={() => navigate('/leo-madeiras')}
              className="card p-6 border border-slate-800/50 hover:border-orange-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center group-hover:text-orange-400 transition-colors">
                  <Building className="w-5 h-5 mr-2 text-orange-500 shrink-0" />
                  Léo Madeiras
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-600">
                  {stats.clientesLeoAtivos}
                </div>
                <div className="text-sm text-slate-400 leading-tight">
                  empresas ativas de {stats.clientesLeoTotal} <br/>na base dbMantranLeo012
                </div>
              </div>
            </div>

            {/* CARD: Implantações (Total + % Concluído) */}
            <div 
              onClick={() => navigate('/implantacoes')}
              className="card p-6 border border-slate-800/50 hover:border-brand-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-white flex items-center group-hover:text-brand-400 transition-colors">
                    <Rocket className="w-5 h-5 mr-2 text-brand-500 shrink-0" />
                    Implantações
                  </h3>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="flex items-baseline space-x-3 mb-2">
                  <span className="text-4xl font-extrabold text-white">
                    {implantacoesStats.totalImplantacoes}
                  </span>
                  <span className="text-xs text-slate-400">
                    {implantacoesStats.totalImplantacoes === 1 ? 'cliente em onboarding' : 'clientes em onboarding'}
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-semibold text-slate-400">Percentual Concluído</span>
                  <span className={`text-lg font-bold ${getProgressTextColor(implantacoesStats.overallProgress)}`}>
                    {implantacoesStats.overallProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor(implantacoesStats.overallProgress)}`}
                    style={{ width: `${implantacoesStats.overallProgress}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  {implantacoesStats.emAndamentoCount} em andamento • {implantacoesStats.concluidasCount} concluídas
                </p>
              </div>
            </div>

          </div>

          {/* Projetos em Execução */}
          {activeProjects.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">Projetos em Execução</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProjects.map(proj => (
                  <div 
                    key={proj.id} 
                    onClick={() => navigate(`/bases/${proj.id}`)}
                    className="card p-6 border border-slate-800/50 hover:border-brand-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-1">
                          {proj.nome}
                        </h4>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all shrink-0 ml-2 mt-1" />
                      </div>
                      <p className="text-xs text-slate-400 mb-4">Em andamento desde {new Date(proj.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-slate-300">Conclusão</span>
                        <span className={`text-2xl font-black ${getProgressTextColor(proj.progress)}`}>
                          {proj.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor(proj.progress)}`} 
                          style={{ width: `${proj.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
