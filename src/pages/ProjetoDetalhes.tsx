import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Settings2, Settings } from 'lucide-react'
import { api } from '../lib/api'
import { isReadOnlyUser } from '../lib/auth'
import { GerenciarBasesModal } from '../components/GerenciarBasesModal'
import { EditarProjetoModal } from '../components/EditarProjetoModal'

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

export function ProjetoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [projeto, setProjeto] = useState<any>(null)
  const [colunas, setColunas] = useState<any[]>([])
  const [bases, setBases] = useState<any[]>([])
  const [dados, setDados] = useState<Record<string, string>>({}) // key: baseId_colunaId
  const [loading, setLoading] = useState(true)
  const [isGerenciarBasesOpen, setIsGerenciarBasesOpen] = useState(false)
  const [isEditarProjetoOpen, setIsEditarProjetoOpen] = useState(false)

  useEffect(() => {
    if (id) fetchProjetoCompleto()
  }, [id])

  const fetchProjetoCompleto = async () => {
    setLoading(true)
    try {
      // 1. Fetch projeto
      const projData = await api.getProjetoById(id!)
      setProjeto(projData)

      // 2. Fetch colunas
      const colData = await api.getProjetoColunasById(id!)
      setColunas(colData)

      // 3. Fetch bases
      const basesData = await api.getProjetoBasesWithDetails(id!)
      
      const formattedBases = basesData.map((b: any) => ({
        id: b.base_id,
        nome_base: b.bases.nome_base,
        empresa: b.bases.clientes?.nome_empresa
      }))
      setBases(formattedBases.sort((a: any, b: any) => a.nome_base.localeCompare(b.nome_base)))

      // 4. Fetch dados
      const dadosData = await api.getProjetoDadosByProjeto(id!)

      const dadosMap: Record<string, string> = {}
      dadosData.forEach((d: any) => {
        dadosMap[`${d.base_id}_${d.coluna_id}`] = d.valor
      })
      setDados(dadosMap)

    } catch (err) {
      console.error(err)
      alert('Erro ao carregar o projeto')
      navigate('/bases')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateDado = async (baseId: string, colunaId: string, valor: string) => {
    if (isReadOnlyUser()) return
    const key = `${baseId}_${colunaId}`
    const previousValue = dados[key]
    
    // Optimistic update
    setDados(prev => ({ ...prev, [key]: valor }))

    try {
      await api.upsertProjetoDado({
        projeto_id: id!,
        base_id: baseId,
        coluna_id: colunaId,
        valor: valor
      })
      
      // Se a coluna for indicador de conclusão, podemos checar se precisa atualizar o projeto pra Concluído
      // (Isso poderia ser feito no backend com triggers para ser mais seguro, mas aqui é um MVP)
    } catch (err) {
      console.error(err)
      // Rollback
      setDados(prev => ({ ...prev, [key]: previousValue }))
      alert('Erro ao salvar o dado.')
    }
  }

  const calculateProgress = () => {
    if (bases.length === 0 || colunas.length === 0) return 0
    
    const indicadores = colunas.filter(c => c.indicador_conclusao)
    if (indicadores.length === 0) return 0

    let concluidos = 0
    bases.forEach(base => {
      let isBaseDone = true
      indicadores.forEach(ind => {
        const val = dados[`${base.id}_${ind.id}`]
        // Regra de conclusão: se for STATUS, tem que ser 'OK'. Se for texto/data, só de não ser vazio já conta.
        const tipo = ind.tipo?.toUpperCase()
        if (tipo === 'STATUS' && val !== 'OK') isBaseDone = false
        if (tipo !== 'STATUS' && (!val || val.trim() === '')) isBaseDone = false
      })
      if (isBaseDone) concluidos++
    })

    return Math.round((concluidos / bases.length) * 100)
  }

  if (loading) return <div className="text-slate-400 p-8 text-center">Carregando detalhes do projeto...</div>
  if (!projeto) return <div className="text-slate-400 p-8 text-center">Projeto não encontrado.</div>

  const progress = calculateProgress()

  return (
    <div className="space-y-6 max-w-full overflow-hidden flex flex-col h-[calc(100vh-80px)]">
      
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/bases')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">{projeto.nome}</h2>
            <p className="text-sm text-slate-400">
              Criado em {new Date(projeto.created_at).toLocaleDateString('pt-BR')} • {bases.length} bases participantes
            </p>
          </div>
        </div>
        {!isReadOnlyUser() && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditarProjetoOpen(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4 text-brand-400" />
              Editar Projeto
            </button>
            <button
              onClick={() => setIsGerenciarBasesOpen(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Settings2 className="w-4 h-4" />
              Gerenciar Bases
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-dark-card border border-slate-800 rounded-xl p-5 shrink-0">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-slate-300">Progresso Geral</span>
          <span className={`text-2xl font-black ${getProgressTextColor(progress)}`}>{progress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div 
            className={`${getProgressColor(progress)} h-full transition-all duration-500`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          O progresso é calculado com base nas colunas marcadas como "Indicadores de Conclusão".
        </p>
      </div>

      {/* Dynamic Table */}
      <div className="bg-dark-card border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
            <thead className="bg-slate-900/80 text-slate-300 sticky top-0 z-10 border-b border-slate-800 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 font-bold border-r border-slate-800 bg-slate-900/90 left-0 sticky z-20">Base / Cliente</th>
                {colunas.map(col => (
                  <th key={col.id} className="px-6 py-4 font-semibold">
                    <div className="flex items-center space-x-2">
                      <span>{col.nome}</span>
                      {col.indicador_conclusao && (
                        <span title="Indicador de Conclusão">
                          <CheckCircle2 className="w-4 h-4 text-brand-500" />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {bases.map(base => (
                <tr key={base.id} className="hover:bg-slate-800/30 transition-colors">
                  
                  <td className="px-6 py-3 border-r border-slate-800/50 bg-dark-card/90 left-0 sticky z-10 font-mono text-white">
                    {base.nome_base} 
                    <span className="block text-xs font-sans text-slate-500 truncate max-w-[200px] mt-0.5">
                      {base.empresa || 'Sem cliente alocado'}
                    </span>
                  </td>

                  {colunas.map(col => {
                    const key = `${base.id}_${col.id}`
                    const valor = dados[key] || ''

                    return (
                      <td key={col.id} className="px-6 py-2">
                        {col.tipo?.toUpperCase() === 'STATUS' ? (
                          <select
                            value={valor}
                            disabled={isReadOnlyUser()}
                            onChange={(e) => handleUpdateDado(base.id, col.id, e.target.value)}
                            className={`input-field w-32 py-1.5 px-2 text-xs font-bold border-transparent focus:border-brand-500 ${
                              isReadOnlyUser() ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              valor === 'OK' ? 'bg-green-500/10 text-green-400' :
                              valor === 'PENDENTE' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <option value="">EM BRANCO</option>
                            <option value="OK">OK</option>
                            <option value="PENDENTE">PENDENTE</option>
                          </select>
                        ) : col.tipo?.toUpperCase() === 'DATA' ? (
                          <input
                            type="date"
                            value={valor}
                            disabled={isReadOnlyUser()}
                            onChange={(e) => handleUpdateDado(base.id, col.id, e.target.value)}
                            className={`input-field py-1.5 px-3 text-xs w-36 bg-slate-800 border-transparent focus:border-brand-500 ${
                              isReadOnlyUser() ? 'cursor-default opacity-80' : ''
                            }`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={valor}
                            disabled={isReadOnlyUser()}
                            onChange={(e) => handleUpdateDado(base.id, col.id, e.target.value)}
                            placeholder={isReadOnlyUser() ? '' : '...'}
                            className={`input-field py-1.5 px-3 text-sm w-48 bg-transparent border-transparent ${
                              isReadOnlyUser() ? 'cursor-default opacity-80' : 'hover:bg-slate-800 focus:bg-slate-800 focus:border-brand-500'
                            } transition-colors`}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <GerenciarBasesModal
        isOpen={isGerenciarBasesOpen}
        onClose={() => { setIsGerenciarBasesOpen(false); fetchProjetoCompleto(); }}
        projetoId={id!}
        projetoNome={projeto.nome}
        basesAtuais={bases}
      />

      <EditarProjetoModal
        isOpen={isEditarProjetoOpen}
        onClose={() => setIsEditarProjetoOpen(false)}
        projetoId={id!}
        onSuccess={fetchProjetoCompleto}
      />
    </div>
  )
}
