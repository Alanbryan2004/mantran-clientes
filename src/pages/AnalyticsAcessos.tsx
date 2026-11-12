import { useState, useEffect, useMemo } from 'react'
import {
  BarChart3, Users, UserPlus, BookOpen, Video, Eye, RefreshCw, Monitor, Trophy, ExternalLink, Lock, X,
  ChevronDown, ChevronUp, Building2, Globe, ShieldCheck
} from 'lucide-react'
import { getAnalyticsMetricas, type AnalyticsResumo } from '../lib/analytics'
import { permissionsApi } from '../lib/permissions'
import { Link } from 'react-router-dom'
import { gerarSlugFaq } from './FAQ'
import clsx from 'clsx'

const ROTULO_PERIODO: Record<'hoje' | '7dias' | '30dias' | 'tudo', string> = {
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias',
  tudo: 'Todo o período'
}

export function AnalyticsAcessos() {
  const canAccess = permissionsApi.canAccessRoute('/analytics')
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'tudo'>('30dias')
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'faq' | 'academia' | 'telas' | 'clientes'>('geral')
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState<AnalyticsResumo | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>(() => new Date().toLocaleTimeString('pt-BR'))
  const [novosAberto, setNovosAberto] = useState(false) // lista do card "Novos Usuários"
  const [cardModalAberto, setCardModalAberto] = useState<'acessos' | 'faq' | 'academia' | 'usuarios_ativos' | null>(null)
  const [filtroModalTipo, setFiltroModalTipo] = useState<'todos' | 'cliente' | 'visitante' | 'equipe'>('todos')
  const [faqExpandido, setFaqExpandido] = useState<string | null>(null) // card do manual expandido
  const [filtroTipoFaq, setFiltroTipoFaq] = useState<'todos' | 'cliente' | 'visitante' | 'equipe'>('todos')

  // Fecha os modais dos cards com Esc
  useEffect(() => {
    if (!novosAberto && !cardModalAberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNovosAberto(false)
        setCardModalAberto(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [novosAberto, cardModalAberto])

  async function carregarDados(filtro = periodo) {
    setLoading(true)
    try {
      const data = await getAnalyticsMetricas(filtro)
      setMetricas(data)
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      console.error('Erro ao carregar métricas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canAccess) {
      carregarDados(periodo)
    }
  }, [periodo, canAccess])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await carregarDados(periodo)
    setIsRefreshing(false)
  }

  const maxFaqAcessos = useMemo(() => {
    if (!metricas?.topFaq || metricas.topFaq.length === 0) return 1
    return Math.max(...metricas.topFaq.map(f => f.acessos), 1)
  }, [metricas])

  const maxTelaAcessos = useMemo(() => {
    if (!metricas?.topTelas || metricas.topTelas.length === 0) return 1
    return Math.max(...metricas.topTelas.map(t => t.acessos), 1)
  }, [metricas])

  const maxVideoAcessos = useMemo(() => {
    if (!metricas?.topVideos || metricas.topVideos.length === 0) return 1
    return Math.max(...metricas.topVideos.map(v => v.visualizacoes), 1)
  }, [metricas])

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
        <p className="text-slate-400 max-w-md text-sm">
          Seu perfil de usuário não possui permissão para visualizar o painel de Métricas de Acesso. Solicite a liberação a um Administrador na gestão de permissões de perfis.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 shadow-inner">
            <BarChart3 className="w-6 h-6 text-brand-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                Métricas de Acesso & Engajamento
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Analytics Mantran
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">
              Acompanhe a frequência de uso dos clientes, manuais mais lidos, vídeos assistidos e telas populares.
            </p>
          </div>
        </div>

        {/* Filtros e Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
            <button
              onClick={() => setPeriodo('hoje')}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition-all",
                periodo === 'hoje' ? "bg-brand-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodo('7dias')}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition-all",
                periodo === '7dias' ? "bg-brand-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              7 dias
            </button>
            <button
              onClick={() => setPeriodo('30dias')}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition-all",
                periodo === '30dias' ? "bg-brand-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              30 dias
            </button>
            <button
              onClick={() => setPeriodo('tudo')}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition-all",
                periodo === 'tudo' ? "bg-brand-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              Geral
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 shrink-0"
            title="Atualizar métricas agora"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5 text-brand-400", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais (todos clicáveis para detalhar) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Acessos */}
        <button
          type="button"
          onClick={() => { setFiltroModalTipo('todos'); setCardModalAberto('acessos') }}
          disabled={loading}
          aria-haspopup="dialog"
          title="Ver detalhes das navegações de tela registradas no período"
          className="w-full text-left bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-blue-500/50 hover:bg-slate-800/40 transition-all flex items-center gap-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-wait"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total de Acessos</span>
            <div className="text-2xl font-black text-white mt-0.5">
              {loading ? '…' : (metricas?.totalAcessos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-slate-400 block truncate">Navegações de tela · clique para ver</span>
          </div>
        </button>

        {/* Manuais FAQ Lidos */}
        <button
          type="button"
          onClick={() => { setFiltroModalTipo('todos'); setCardModalAberto('faq') }}
          disabled={loading}
          aria-haspopup="dialog"
          title="Ver quais manuais do FAQ foram lidos e por quais empresas/usuários"
          className="w-full text-left bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-emerald-500/50 hover:bg-slate-800/40 transition-all flex items-center gap-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-wait"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Manuais FAQ Lidos</span>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">
              {loading ? '…' : (metricas?.totalFaqLidos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-emerald-400/70 block truncate">Consultas ao FAQ · clique para ver</span>
          </div>
        </button>

        {/* Vídeos Assistidos */}
        <button
          type="button"
          onClick={() => { setFiltroModalTipo('todos'); setCardModalAberto('academia') }}
          disabled={loading}
          aria-haspopup="dialog"
          title="Ver quais treinamentos da Academia foram assistidos e por quem"
          className="w-full text-left bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-purple-500/50 hover:bg-slate-800/40 transition-all flex items-center gap-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-wait"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">Academia Mantran</span>
            <div className="text-2xl font-black text-purple-300 mt-0.5">
              {loading ? '…' : (metricas?.totalVideosAssistidos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-purple-400/70 block truncate">Treinamentos · clique para ver</span>
          </div>
        </button>

        {/* Usuários Ativos */}
        <button
          type="button"
          onClick={() => { setFiltroModalTipo('todos'); setCardModalAberto('usuarios_ativos') }}
          disabled={loading}
          aria-haspopup="dialog"
          title="Ver quais clientes e colaboradores estiveram ativos no período"
          className="w-full text-left bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-amber-500/50 hover:bg-slate-800/40 transition-all flex items-center gap-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-wait"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Usuários Ativos</span>
            <div className="text-2xl font-black text-amber-300 mt-0.5">
              {loading ? '…' : (metricas?.totalUsuariosAtivos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-amber-400/70 block truncate">Clientes e equipe · clique para ver</span>
          </div>
        </button>

        {/* Novos Usuários Cadastrados (clique abre a lista de contatos e empresas) */}
        <button
          type="button"
          onClick={() => setNovosAberto(true)}
          disabled={loading}
          aria-haspopup="dialog"
          title="Ver quais contatos se cadastraram no período"
          className="w-full text-left bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-cyan-500/50 hover:bg-slate-800/40 transition-all flex items-center gap-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">Novos Usuários</span>
            <div className="text-2xl font-black text-cyan-300 mt-0.5">
              {loading ? '…' : (metricas?.totalNovosUsuarios || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-cyan-400/70 block truncate">Cadastrados no período · clique para ver</span>
          </div>
        </button>
      </div>

      {/* Navegação entre Abas de Rankings */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setAbaAtiva('geral')}
          className={clsx(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer",
            abaAtiva === 'geral'
              ? "border-brand-500 text-brand-400 bg-brand-500/5 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Trophy className="w-4 h-4" />
          <span>Visão Geral & Campeões</span>
        </button>

        <button
          onClick={() => setAbaAtiva('faq')}
          className={clsx(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer",
            abaAtiva === 'faq'
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>Manuais do FAQ ({metricas?.topFaq.length || 0})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('academia')}
          className={clsx(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer",
            abaAtiva === 'academia'
              ? "border-purple-500 text-purple-400 bg-purple-500/5 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Video className="w-4 h-4 text-purple-400" />
          <span>Vídeos da Academia ({metricas?.topVideos.length || 0})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('telas')}
          className={clsx(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer",
            abaAtiva === 'telas'
              ? "border-blue-500 text-blue-400 bg-blue-500/5 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Monitor className="w-4 h-4 text-blue-400" />
          <span>Telas do Sistema ({metricas?.topTelas.length || 0})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('clientes')}
          className={clsx(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer",
            abaAtiva === 'clientes'
              ? "border-amber-500 text-amber-400 bg-amber-500/5 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>Ranking de Clientes ({metricas?.topClientes.length || 0})</span>
        </button>
      </div>

      {/* Conteúdo da Aba */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-dark-card border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Carregando métricas e histórico de acessos...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* VISÃO GERAL */}
          {(abaAtiva === 'geral' || abaAtiva === 'faq') && (
            <div className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Top Manuais do FAQ Mais Acessados</h3>
                    <p className="text-xs text-slate-400">Clique em qualquer manual para expandir e ver quais empresas, clientes ou visitantes acessaram</p>
                  </div>
                </div>
                <Link
                  to="/faq"
                  className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  <span>Abrir FAQ</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {metricas?.topFaq.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center italic">
                  Nenhuma visualização de FAQ registrada no período selecionado.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metricas?.topFaq.map((item, idx) => {
                    const pct = Math.round((item.acessos / maxFaqAcessos) * 100)
                    const slug = gerarSlugFaq(item.titulo)
                    const cardKey = item.id || `${item.titulo}-${idx}`
                    const isExpanded = faqExpandido === cardKey
                    const detalhesFiltrados = (item.detalhes || []).filter(d =>
                      filtroTipoFaq === 'todos' ? true : d.tipo === filtroTipoFaq
                    )

                    return (
                      <div
                        key={cardKey}
                        className={clsx(
                          "bg-slate-900/60 border rounded-xl transition-all overflow-hidden",
                          isExpanded
                            ? "border-emerald-500/50 bg-slate-900/90 shadow-lg shadow-emerald-950/20"
                            : "border-slate-800/80 hover:border-slate-700"
                        )}
                      >
                        {/* Cabeçalho clicável do Card */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onClick={() => {
                            if (isExpanded) {
                              setFaqExpandido(null)
                            } else {
                              setFaqExpandido(cardKey)
                              setFiltroTipoFaq('todos')
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              if (isExpanded) {
                                setFaqExpandido(null)
                              } else {
                                setFaqExpandido(cardKey)
                                setFiltroTipoFaq('todos')
                              }
                            }
                          }}
                          className="p-3 cursor-pointer select-none group"
                        >
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={clsx(
                                "w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0",
                                idx === 0 ? "bg-amber-500 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                                idx === 1 ? "bg-slate-300 text-slate-900 font-bold" :
                                idx === 2 ? "bg-amber-700 text-white font-bold" :
                                "bg-slate-800 text-slate-400"
                              )}>
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate block"
                                    title={item.titulo}
                                  >
                                    {item.titulo}
                                  </span>
                                  <Link
                                    to={`/faq/${slug}`}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Abrir página deste manual no FAQ"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700/80 transition-colors shrink-0"
                                  >
                                    <span>Abrir</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                </div>
                                <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-0.5">
                                  <span className="text-[10px] text-slate-500 truncate">
                                    Seção: {item.categoria}
                                  </span>
                                  {item.acessosClientes > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400/90">
                                      <Building2 className="w-2.5 h-2.5" />
                                      {item.acessosClientes} cliente{item.acessosClientes > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {item.acessosVisitantes > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400/90">
                                      <Globe className="w-2.5 h-2.5" />
                                      {item.acessosVisitantes} visitante{item.acessosVisitantes > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {item.acessosEquipe > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-400/90">
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                      {item.acessosEquipe} equipe
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="text-right">
                                <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                                  {item.acessos}
                                </span>
                                <span className="text-[10px] text-slate-500 block">acesso{item.acessos > 1 ? 's' : ''}</span>
                              </div>
                              <div className={clsx(
                                "w-7 h-7 rounded-lg flex items-center justify-center border transition-colors",
                                isExpanded
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                  : "bg-slate-800/80 border-slate-700/70 text-slate-400 group-hover:text-white group-hover:border-slate-600"
                              )}>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Barra de popularidade */}
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(5, pct)}%` }}
                            />
                          </div>
                        </div>

                        {/* Painel Expandido: Detalhamento de Quem Acessou por Empresa / Usuário / Visitante */}
                        {isExpanded && (
                          <div className="border-t border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-3">
                            {/* Resumo / Filtros rápidos por Tipo de Acesso */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setFiltroTipoFaq('todos')}
                                  className={clsx(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                                    filtroTipoFaq === 'todos'
                                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                  )}
                                >
                                  <span>Todos</span>
                                  <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">{item.acessos}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFiltroTipoFaq('cliente')}
                                  className={clsx(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                                    filtroTipoFaq === 'cliente'
                                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300"
                                  )}
                                >
                                  <Building2 className="w-3 h-3 text-amber-400" />
                                  <span>Clientes</span>
                                  <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">{item.acessosClientes}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFiltroTipoFaq('visitante')}
                                  className={clsx(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                                    filtroTipoFaq === 'visitante'
                                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300"
                                  )}
                                >
                                  <Globe className="w-3 h-3 text-cyan-400" />
                                  <span>Visitantes (Sem Login)</span>
                                  <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">{item.acessosVisitantes}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFiltroTipoFaq('equipe')}
                                  className={clsx(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                                    filtroTipoFaq === 'equipe'
                                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-purple-300"
                                  )}
                                >
                                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                                  <span>Equipe Mantran</span>
                                  <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">{item.acessosEquipe}</span>
                                </button>
                              </div>

                              <span className="text-[11px] text-slate-500">
                                {detalhesFiltrados.length} origem(ns) identificada(s)
                              </span>
                            </div>

                            {/* Tabela de Empresas / Usuários que acessaram este manual */}
                            {detalhesFiltrados.length === 0 ? (
                              <div className="py-6 text-center text-xs text-slate-500 italic bg-slate-900/50 rounded-xl border border-slate-800/60">
                                Nenhum acesso encontrado para este filtro neste manual.
                              </div>
                            ) : (
                              <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-800/90 bg-slate-900/50">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                      <th className="py-2 px-3">Empresa / Origem</th>
                                      <th className="py-2 px-3">Usuário / Identificação</th>
                                      <th className="py-2 px-3 text-center">Perfil</th>
                                      <th className="py-2 px-3 text-center">Qtd. Acessos</th>
                                      <th className="py-2 px-3 text-right">Último Acesso</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {detalhesFiltrados.map((det) => {
                                      const pctItem = Math.round((det.acessos / Math.max(item.acessos, 1)) * 100)
                                      return (
                                        <tr key={det.chave} className="hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2">
                                              <div className={clsx(
                                                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border",
                                                det.tipo === 'cliente'
                                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                  : det.tipo === 'visitante'
                                                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                                  : "bg-purple-500/10 border-purple-500/30 text-purple-400"
                                              )}>
                                                {det.tipo === 'cliente' ? (
                                                  <Building2 className="w-3.5 h-3.5" />
                                                ) : det.tipo === 'visitante' ? (
                                                  <Globe className="w-3.5 h-3.5" />
                                                ) : (
                                                  <ShieldCheck className="w-3.5 h-3.5" />
                                                )}
                                              </div>
                                              <span className="font-bold text-white">
                                                {det.empresa}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <div className="font-semibold text-slate-200">{det.usuario_nome}</div>
                                            {det.usuario_detalhe && det.usuario_detalhe !== det.usuario_nome && (
                                              <div className="text-[10px] text-slate-400 font-mono">{det.usuario_detalhe}</div>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            {det.tipo === 'cliente' ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                                Cliente
                                              </span>
                                            ) : det.tipo === 'visitante' ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                                Visitante
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                                Equipe Mantran
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <div className="inline-flex items-center gap-1.5">
                                              <span className="font-mono font-black text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                                {det.acessos}x
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-mono">
                                                ({pctItem}%)
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                            {new Date(det.ultimo_acesso).toLocaleDateString('pt-BR')} às{' '}
                                            {new Date(det.ultimo_acesso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* VÍDEOS DA ACADEMIA */}
          {(abaAtiva === 'geral' || abaAtiva === 'academia') && (
            <div className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-black">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Top Vídeos da Academia Mantran</h3>
                    <p className="text-xs text-slate-400">Treinamentos e aulas gravadas mais assistidos</p>
                  </div>
                </div>
                <Link
                  to="/academia"
                  className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  <span>Abrir Academia</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {metricas?.topVideos.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center italic">
                  Nenhum treinamento assistido no período selecionado.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metricas?.topVideos.map((video, idx) => {
                    const pct = Math.round((video.visualizacoes / maxVideoAcessos) * 100)
                    return (
                      <div
                        key={video.id || idx}
                        className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={clsx(
                              "w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0",
                              idx === 0 ? "bg-amber-500 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                              idx === 1 ? "bg-slate-300 text-slate-900 font-bold" :
                              idx === 2 ? "bg-amber-700 text-white font-bold" :
                              "bg-slate-800 text-slate-400"
                            )}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">
                                {video.titulo}
                              </h4>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Instrutor: {video.instrutor} • {video.concluidos} conclusão(ões)
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm sm:text-base font-black text-purple-400 font-mono">
                              {video.visualizacoes}
                            </span>
                            <span className="text-[10px] text-slate-500 block">visualizaç{video.visualizacoes > 1 ? 'ões' : 'ão'}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TELAS DO SISTEMA */}
          {(abaAtiva === 'geral' || abaAtiva === 'telas') && (
            <div className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-black">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Telas Mais Acessadas</h3>
                    <p className="text-xs text-slate-400">Páginas e módulos com maior volume de tráfego</p>
                  </div>
                </div>
              </div>

              {metricas?.topTelas.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center italic">
                  Nenhum registro de acesso a telas no período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metricas?.topTelas.map((tela, idx) => {
                    const pct = Math.round((tela.acessos / maxTelaAcessos) * 100)
                    return (
                      <div
                        key={tela.rota || idx}
                        className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-white truncate block">
                              {tela.tela_nome}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono truncate block">
                              {tela.rota}
                            </span>
                          </div>
                          <span className="text-xs font-black text-blue-400 font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
                            {tela.acessos} acessos
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* RANKING DE CLIENTES / USUÁRIOS */}
          {(abaAtiva === 'geral' || abaAtiva === 'clientes') && (
            <div className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Clientes & Usuários Mais Frequentes</h3>
                    <p className="text-xs text-slate-400">Quem mais está acessando e utilizando a plataforma</p>
                  </div>
                </div>
              </div>

              {metricas?.topClientes.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center italic">
                  Nenhum acesso de cliente registrado no período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Posição</th>
                        <th className="py-2.5 px-3">Cliente / Usuário</th>
                        <th className="py-2.5 px-3 text-center">Total de Acessos</th>
                        <th className="py-2.5 px-3 text-right">Último Acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {metricas?.topClientes.map((cli, idx) => (
                        <tr key={cli.nome || idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <span className={clsx(
                              "w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black",
                              idx === 0 ? "bg-amber-500 text-slate-950" :
                              idx === 1 ? "bg-slate-300 text-slate-900" :
                              idx === 2 ? "bg-amber-700 text-white" :
                              "bg-slate-800 text-slate-400"
                            )}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-100">
                            {cli.nome}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs">
                              {cli.acessos}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400 font-mono text-[11px]">
                            {new Date(cli.ultimo_acesso).toLocaleDateString('pt-BR')} às {new Date(cli.ultimo_acesso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhamento dos Cards Principais (Total de Acessos, FAQ Lidos, Academia, Usuários Ativos) */}
      {cardModalAberto && (() => {
        const listaBaseUsuarios =
          cardModalAberto === 'acessos'
            ? (metricas?.usuariosAtivosLista || []).filter(u => u.acessosTelas > 0).sort((a, b) => b.acessosTelas - a.acessosTelas)
            : cardModalAberto === 'faq'
            ? (metricas?.usuariosAtivosLista || []).filter(u => u.acessosFaq > 0).sort((a, b) => b.acessosFaq - a.acessosFaq)
            : (metricas?.usuariosAtivosLista || []).filter(u => filtroModalTipo === 'visitante' ? true : u.tipo !== 'visitante')

        const listaUsuariosFiltrada = listaBaseUsuarios.filter(u =>
          filtroModalTipo === 'todos' ? true : u.tipo === filtroModalTipo
        )

        const listaVideosBase = metricas?.detalhesVideosAssistidos || []
        const listaVideosFiltrada = listaVideosBase.filter(v =>
          filtroModalTipo === 'todos' ? true : v.tipo === filtroModalTipo
        )

        const qtdClientes = cardModalAberto === 'academia'
          ? listaVideosBase.filter(v => v.tipo === 'cliente').length
          : listaBaseUsuarios.filter(u => u.tipo === 'cliente').length
        const qtdVisitantes = cardModalAberto === 'academia'
          ? listaVideosBase.filter(v => v.tipo === 'visitante').length
          : (metricas?.usuariosAtivosLista || []).filter(u =>
              u.tipo === 'visitante' &&
              (cardModalAberto === 'acessos' ? u.acessosTelas > 0 : cardModalAberto === 'faq' ? u.acessosFaq > 0 : true)
            ).length
        const qtdEquipe = cardModalAberto === 'academia'
          ? listaVideosBase.filter(v => v.tipo === 'equipe').length
          : listaBaseUsuarios.filter(u => u.tipo === 'equipe').length

        const configCard = {
          acessos: {
            titulo: 'Detalhamento — Total de Acessos às Telas',
            subtitulo: `${ROTULO_PERIODO[periodo]} · ${(metricas?.totalAcessos || 0).toLocaleString('pt-BR')} navegação(ões) de tela registrada(s)`,
            corIcone: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
            icone: <Eye className="w-5 h-5" />
          },
          faq: {
            titulo: 'Detalhamento — Manuais do FAQ Lidos',
            subtitulo: `${ROTULO_PERIODO[periodo]} · ${(metricas?.totalFaqLidos || 0).toLocaleString('pt-BR')} consulta(s) aos procedimentos`,
            corIcone: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            icone: <BookOpen className="w-5 h-5" />
          },
          academia: {
            titulo: 'Detalhamento — Academia Mantran',
            subtitulo: `${ROTULO_PERIODO[periodo]} · ${(metricas?.totalVideosAssistidos || 0).toLocaleString('pt-BR')} treinamento(s) reproduzido(s)`,
            corIcone: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
            icone: <Video className="w-5 h-5" />
          },
          usuarios_ativos: {
            titulo: 'Detalhamento — Usuários Ativos no Período',
            subtitulo: `${ROTULO_PERIODO[periodo]} · ${(metricas?.totalUsuariosAtivos || 0).toLocaleString('pt-BR')} usuário(s) autenticado(s) com atividade`,
            corIcone: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
            icone: <Users className="w-5 h-5" />
          }
        }[cardModalAberto]

        return (
          <div
            className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCardModalAberto(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="bg-dark-card border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Cabeçalho do Modal */}
              <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={clsx("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", configCard.corIcone)}>
                    {configCard.icone}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-white">{configCard.titulo}</h2>
                    <p className="text-xs text-slate-400">{configCard.subtitulo}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCardModalAberto(null)}
                  aria-label="Fechar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Filtros por Perfil (Todos / Clientes / Visitantes / Equipe Mantran) */}
              <div className="px-5 py-3 bg-slate-900/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiltroModalTipo('todos')}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                      filtroModalTipo === 'todos'
                        ? "bg-brand-500/20 border-brand-500/40 text-brand-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <span>Todos</span>
                    <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">
                      {cardModalAberto === 'academia' ? listaVideosBase.length : listaBaseUsuarios.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroModalTipo('cliente')}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                      filtroModalTipo === 'cliente'
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300"
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Clientes</span>
                    <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">{qtdClientes}</span>
                  </button>

                  {qtdVisitantes > 0 && (
                    <button
                      type="button"
                      onClick={() => setFiltroModalTipo('visitante')}
                      className={clsx(
                        "px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                        filtroModalTipo === 'visitante'
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300"
                      )}
                    >
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Visitantes (Sem Login)</span>
                      <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">{qtdVisitantes}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setFiltroModalTipo('equipe')}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                      filtroModalTipo === 'equipe'
                        ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-purple-300"
                    )}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Equipe Mantran</span>
                    <span className="font-mono px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">{qtdEquipe}</span>
                  </button>
                </div>
              </div>

              {/* Corpo do Modal */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                {cardModalAberto === 'academia' ? (
                  listaVideosFiltrada.length === 0 ? (
                    <div className="py-16 px-6 text-center text-slate-400 text-sm">
                      Nenhum treinamento reproduzido para este filtro no período selecionado.
                    </div>
                  ) : (
                    <table className="w-full text-sm min-w-[760px]">
                      <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
                        <tr>
                          <th scope="col" className="text-left font-bold px-5 py-3">Empresa / Origem</th>
                          <th scope="col" className="text-left font-bold px-4 py-3">Usuário</th>
                          <th scope="col" className="text-left font-bold px-4 py-3">Treinamento Assistido</th>
                          <th scope="col" className="text-center font-bold px-4 py-3">Progresso</th>
                          <th scope="col" className="text-right font-bold px-5 py-3">Última Visualização</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {listaVideosFiltrada.map(v => (
                          <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3 font-bold text-white">
                              <div className="flex items-center gap-2">
                                <Building2 className={clsx("w-4 h-4 shrink-0", v.tipo === 'cliente' ? "text-amber-400" : "text-purple-400")} />
                                <span>{v.empresa}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-200">{v.usuario_nome}</div>
                              {v.usuario_detalhe && v.usuario_detalhe !== v.usuario_nome && (
                                <div className="text-[11px] text-slate-400 font-mono">{v.usuario_detalhe}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-purple-300">{v.video_titulo}</div>
                              <div className="text-[11px] text-slate-500">Instrutor: {v.instrutor}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={clsx(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                v.concluido
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                  : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                              )}>
                                {v.concluido ? 'Concluído (100%)' : `${v.progresso_pct}%`}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-slate-300 font-mono text-xs whitespace-nowrap">
                              {new Date(v.ultima_vez).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(v.ultima_vez).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : listaUsuariosFiltrada.length === 0 ? (
                  <div className="py-16 px-6 text-center text-slate-400 text-sm">
                    Nenhum registro encontrado para este filtro no período selecionado.
                  </div>
                ) : (
                  <table className="w-full text-sm min-w-[780px]">
                    <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th scope="col" className="text-left font-bold px-5 py-3">Empresa / Origem</th>
                        <th scope="col" className="text-left font-bold px-4 py-3">Usuário / Identificação</th>
                        <th scope="col" className="text-center font-bold px-4 py-3">Perfil</th>
                        {cardModalAberto === 'acessos' && (
                          <>
                            <th scope="col" className="text-left font-bold px-4 py-3">Principais Telas Acessadas</th>
                            <th scope="col" className="text-center font-bold px-4 py-3">Navegações</th>
                          </>
                        )}
                        {cardModalAberto === 'faq' && (
                          <th scope="col" className="text-center font-bold px-4 py-3">Manuais Lidos</th>
                        )}
                        {cardModalAberto === 'usuarios_ativos' && (
                          <>
                            <th scope="col" className="text-center font-bold px-3 py-3">Telas</th>
                            <th scope="col" className="text-center font-bold px-3 py-3">Manuais FAQ</th>
                            <th scope="col" className="text-center font-bold px-3 py-3">Academia</th>
                          </>
                        )}
                        <th scope="col" className="text-right font-bold px-5 py-3">Último Acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {listaUsuariosFiltrada.map(u => (
                        <tr key={u.chave} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              {u.tipo === 'cliente' ? (
                                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : u.tipo === 'visitante' ? (
                                <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                              )}
                              <span>{u.empresa}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-200">{u.usuario_nome}</div>
                            {u.usuario_detalhe && u.usuario_detalhe !== u.usuario_nome && (
                              <div className="text-[11px] text-slate-400 font-mono">{u.usuario_detalhe}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {u.tipo === 'cliente' ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                Cliente
                              </span>
                            ) : u.tipo === 'visitante' ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                Visitante
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                Equipe Mantran
                              </span>
                            )}
                          </td>
                          {cardModalAberto === 'acessos' && (
                            <>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {u.principaisTelas.map((t, i) => (
                                    <span key={i} className="inline-flex px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] border border-slate-700/70">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="font-mono font-black text-blue-400 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs">
                                  {u.acessosTelas}x
                                </span>
                              </td>
                            </>
                          )}
                          {cardModalAberto === 'faq' && (
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono font-black text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                {u.acessosFaq}x
                              </span>
                            </td>
                          )}
                          {cardModalAberto === 'usuarios_ativos' && (
                            <>
                              <td className="px-3 py-3 text-center font-mono text-xs text-blue-300 font-bold">
                                {u.acessosTelas}
                              </td>
                              <td className="px-3 py-3 text-center font-mono text-xs text-emerald-300 font-bold">
                                {u.acessosFaq}
                              </td>
                              <td className="px-3 py-3 text-center font-mono text-xs text-purple-300 font-bold">
                                {u.videosAssistidos}
                              </td>
                            </>
                          )}
                          <td className="px-5 py-3 text-right text-slate-300 font-mono text-xs whitespace-nowrap">
                            {new Date(u.ultimo_acesso).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(u.ultimo_acesso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Lista dos novos usuários (card "Novos Usuários") */}
      {novosAberto && (
        <div
          className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNovosAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="novos-usuarios-titulo"
            className="bg-dark-card border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="novos-usuarios-titulo" className="text-base font-black text-white">Novos usuários</h2>
                  <p className="text-xs text-slate-400">
                    {ROTULO_PERIODO[periodo]} · {(metricas?.totalNovosUsuarios || 0).toLocaleString('pt-BR')} contato(s) com acesso ao portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNovosAberto(false)}
                aria-label="Fechar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {(metricas?.novosUsuarios || []).length === 0 ? (
                <div className="py-16 px-6 text-center text-slate-400 text-sm">
                  Nenhum contato novo com acesso ao portal neste período.
                </div>
              ) : (
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th scope="col" className="text-left font-bold px-5 py-3">Contato</th>
                      <th scope="col" className="text-left font-bold px-4 py-3">Empresa</th>
                      <th scope="col" className="text-left font-bold px-4 py-3">E-mail</th>
                      <th scope="col" className="text-left font-bold px-4 py-3">Como entrou</th>
                      <th scope="col" className="text-left font-bold px-4 py-3">Cadastro em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(metricas?.novosUsuarios || []).map(u => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-white">{u.nome}</td>
                        <td className="px-4 py-3 text-slate-200">{u.empresa || <span className="text-slate-500">Sem empresa</span>}</td>
                        <td className="px-4 py-3 text-slate-300 break-all">{u.email}</td>
                        <td className="px-4 py-3">
                          {u.origem === 'autocadastro' ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold">Cadastrou-se sozinho</span>
                          ) : u.origem === 'convite' ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-semibold">Liberado pelo Suporte</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {new Date(u.cadastroEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {permissionsApi.canAccessRoute('/tickets') && (
              <div className="p-4 border-t border-slate-800 flex justify-end shrink-0">
                <Link
                  to="/tickets?view=contatos&novos=1"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200"
                >
                  Abrir em Contatos <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer informativo */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
        <span>Dados consolidados em tempo real com base no Supabase e SQL Server.</span>
        <span>Última sincronização: {ultimaAtualizacao}</span>
      </div>
    </div>
  )
}
export default AnalyticsAcessos
