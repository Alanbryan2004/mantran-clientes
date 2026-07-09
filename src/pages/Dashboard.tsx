import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Database, Server, ShoppingBag, Briefcase, Building } from 'lucide-react'
import clsx from 'clsx'

export function Dashboard() {
  const [stats, setStats] = useState({
    totalBases: 0,
    basesDisponiveis: 0,
    basesEmUso: 0,
    clientesShopee: 0,
    clientesNormal: 0,
    clientesLeo: 0,
  })
  const [activeProjects, setActiveProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const { data: bases } = await supabase.from('bases').select('cliente_id')
      const { data: clientes } = await supabase.from('clientes').select('tipo')
      
      if (bases && clientes) {
        const totalBases = bases.length
        const basesEmUso = bases.filter(b => b.cliente_id !== null).length
        const basesDisponiveis = totalBases - basesEmUso
        
        const clientesShopee = clientes.filter(c => c.tipo === 'SHOPEE').length
        const clientesNormal = clientes.filter(c => c.tipo === 'NORMAL').length
        const { count: clientesLeo } = await supabase.from('leo_empresas').select('*', { count: 'exact', head: true })
        
        setStats({
          totalBases,
          basesDisponiveis,
          basesEmUso,
          clientesShopee,
          clientesNormal,
          clientesLeo: clientesLeo || 0
        })
      }

      // Buscar Projetos em Andamento
      const { data: projs } = await supabase.from('projetos').select('*').eq('status', 'Em Andamento')
      if (projs && projs.length > 0) {
        const { data: pCols } = await supabase.from('projeto_colunas').select('*').in('projeto_id', projs.map(p => p.id)).eq('indicador_conclusao', true)
        const { data: pBases } = await supabase.from('projeto_bases').select('*').in('projeto_id', projs.map(p => p.id))
        const { data: pDados } = await supabase.from('projeto_dados').select('*').in('projeto_id', projs.map(p => p.id))

        const computedProjs = projs.map(p => {
          const colsProj = pCols?.filter(c => c.projeto_id === p.id) || []
          const basesProj = pBases?.filter(b => b.projeto_id === p.id) || []
          const dadosProj = pDados?.filter(d => d.projeto_id === p.id) || []

          if (basesProj.length === 0 || colsProj.length === 0) return { ...p, progress: 0 }

          let concluidos = 0
          basesProj.forEach(b => {
            let isDone = true
            colsProj.forEach(c => {
              const d = dadosProj.find(data => data.base_id === b.base_id && data.coluna_id === c.id)
              const val = d?.valor
              if (c.tipo === 'STATUS' && val !== 'OK') isDone = false
              if (c.tipo !== 'STATUS' && (!val || val.trim() === '')) isDone = false
            })
            if (isDone) concluidos++
          })
          return { ...p, progress: Math.round((concluidos / basesProj.length) * 100) }
        })
        setActiveProjects(computedProjs)
      } else {
        setActiveProjects([])
      }

    } catch (err) {
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
        <p className="text-slate-400 mt-1">Acompanhamento da infraestrutura Mantran</p>
      </div>

      {loading ? (
        <div className="text-slate-400 p-8 text-center">Carregando métricas...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <div className="card flex items-center p-6 border-l-4 border-emerald-500">
              <div className="p-4 bg-emerald-500/10 rounded-lg text-emerald-500 mr-4">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Bases Disponíveis</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.basesDisponiveis}</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card flex items-center p-6 border-l-4 border-amber-500">
              <div className="p-4 bg-amber-500/10 rounded-lg text-amber-500 mr-4">
                <Server className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Bases em Uso</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.basesEmUso}</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="card flex items-center p-6 border-l-4 border-brand-500">
              <div className="p-4 bg-brand-500/10 rounded-lg text-brand-500 mr-4">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Clientes</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.clientesShopee + stats.clientesNormal}</p>
              </div>
            </div>

            {/* Card 4 - Capacidade */}
            <div className="card flex flex-col justify-center p-6 border-l-4 border-blue-500">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Uso da Nuvem</p>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold text-white">{usoPercent}%</span>
                <span className="text-xs text-slate-400">{stats.totalBases} bases totais</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5">
                <div 
                  className={clsx("h-2.5 rounded-full transition-all duration-1000", usoPercent > 80 ? "bg-red-500" : "bg-blue-500")}
                  style={{ width: `${usoPercent}%` }}
                ></div>
              </div>
            </div>
            
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="card p-6 border border-slate-800/50">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2 text-green-500" />
                Clientes SHOPEE
              </h3>
              <div className="flex items-center space-x-4">
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600">
                  {stats.clientesShopee}
                </div>
                <div className="text-sm text-slate-400 leading-tight">
                  empresas integradas <br/>com o ecossistema Shopee
                </div>
              </div>
            </div>

            <div className="card p-6 border border-slate-800/50">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
                Clientes NORMAIS
              </h3>
              <div className="flex items-center space-x-4">
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600">
                  {stats.clientesNormal}
                </div>
                <div className="text-sm text-slate-400 leading-tight">
                  empresas com <br/>operação logística padrão
                </div>
              </div>
            </div>

            <div className="card p-6 border border-slate-800/50">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                <Building className="w-5 h-5 mr-2 text-orange-500" />
                Léo Madeiras
              </h3>
              <div className="flex items-center space-x-4">
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-600">
                  {stats.clientesLeo}
                </div>
                <div className="text-sm text-slate-400 leading-tight">
                  empresas exclusivas <br/>da base dbMantranLeo012
                </div>
              </div>
            </div>
          </div>

          {/* Projetos em Execução */}
          {activeProjects.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">Projetos em Execução</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProjects.map(proj => (
                  <div key={proj.id} className="card p-6 border border-slate-800/50 flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-white line-clamp-1 mb-1">{proj.nome}</h4>
                      <p className="text-xs text-slate-400 mb-4">Em andamento desde {new Date(proj.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-slate-300">Conclusão</span>
                        <span className="text-2xl font-black text-brand-500">{proj.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div 
                          className="bg-brand-500 h-2 rounded-full transition-all duration-1000" 
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
