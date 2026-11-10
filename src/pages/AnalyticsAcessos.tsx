import { useState, useEffect, useMemo } from 'react'
import {
  BarChart3, Users, UserPlus, BookOpen, Video, Eye, RefreshCw, Monitor, Trophy, ExternalLink, Lock
} from 'lucide-react'
import { getAnalyticsMetricas, type AnalyticsResumo } from '../lib/analytics'
import { permissionsApi } from '../lib/permissions'
import { Link } from 'react-router-dom'
import { gerarSlugFaq } from './FAQ'
import clsx from 'clsx'

export function AnalyticsAcessos() {
  const canAccess = permissionsApi.canAccessRoute('/analytics')
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'tudo'>('30dias')
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'faq' | 'academia' | 'telas' | 'clientes'>('geral')
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState<AnalyticsResumo | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>(() => new Date().toLocaleTimeString('pt-BR'))

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

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Acessos */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total de Acessos</span>
            <div className="text-2xl font-black text-white mt-0.5">
              {loading ? '…' : (metricas?.totalAcessos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">Navegações de tela registradas</span>
          </div>
        </div>

        {/* Manuais FAQ Lidos */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Manuais FAQ Lidos</span>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">
              {loading ? '…' : (metricas?.totalFaqLidos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-emerald-400/70 block truncate">Consultas aos procedimentos</span>
          </div>
        </div>

        {/* Vídeos Assistidos */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">Academia Mantran</span>
            <div className="text-2xl font-black text-purple-300 mt-0.5">
              {loading ? '…' : (metricas?.totalVideosAssistidos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-purple-400/70 block truncate">Treinamentos reproduzidos</span>
          </div>
        </div>

        {/* Usuários Ativos */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Usuários Ativos</span>
            <div className="text-2xl font-black text-amber-300 mt-0.5">
              {loading ? '…' : (metricas?.totalUsuariosAtivos || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-amber-400/70 block truncate">Clientes e equipe no período</span>
          </div>
        </div>

        {/* Novos Usuários Cadastrados */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">Novos Usuários</span>
            <div className="text-2xl font-black text-cyan-300 mt-0.5">
              {loading ? '…' : (metricas?.totalNovosUsuarios || 0).toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-cyan-400/70 block truncate">Cadastrados no período</span>
          </div>
        </div>
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
                    <p className="text-xs text-slate-400">Procedimentos passo a passo com mais cliques e leituras</p>
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
                    return (
                      <div
                        key={item.id || idx}
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
                              <Link
                                to={`/faq/${slug}`}
                                className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate block"
                                title={item.titulo}
                              >
                                {item.titulo}
                              </Link>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Seção: {item.categoria}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                              {item.acessos}
                            </span>
                            <span className="text-[10px] text-slate-500 block">acesso{item.acessos > 1 ? 's' : ''}</span>
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

      {/* Footer informativo */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
        <span>Dados consolidados em tempo real com base no Supabase e SQL Server.</span>
        <span>Última sincronização: {ultimaAtualizacao}</span>
      </div>
    </div>
  )
}
export default AnalyticsAcessos
