import { useState, useEffect, useMemo, useRef } from 'react'
import {
  GraduationCap, Search, Play, Plus, Pencil, Trash2, X, Save,
  Loader2, AlertCircle, Video, ExternalLink, Settings, CheckCircle2
} from 'lucide-react'
import clsx from 'clsx'
import { api, type AcademiaVideo } from '../lib/api'
import { getLoggedUser, canEditFaq, isClienteUser } from '../lib/auth'
import { extrairYoutubeId, youtubeThumb, youtubeEmbedUrl, carregarYoutubeApi } from '../lib/youtube'

type ProgressoVideo = { assistido: boolean; progresso_pct: number }

// Considera o vídeo "assistido" ao chegar a esta porcentagem (ou ao fim).
const PCT_ASSISTIDO = 90
// Salva o progresso parcial a cada avanço deste tamanho (em %).
const PASSO_SALVAR_PCT = 20

// Compara nomes de módulo ignorando acento e maiúsculas (ex.: "NFSE" = "NFSe")
const normalizarNome = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

// Valor interno do filtro "vídeos sem módulo"
const SEM_MODULO = '__sem_modulo__'
type OpcaoModulo = { nome: string; tipo: string }
// Usada só se a tabela modulos_mantran não puder ser lida
const MODULOS_FALLBACK: OpcaoModulo[] = [
  'Operação', 'Financeiro', 'EDI Proceda', 'Oficina', 'Indicadores', 'Gerador de Relatório', 'Comercial', 'CRM',
  'Segurança', 'WMS', 'Roteirizador', 'Baixa XML', 'Mantran Vendas', 'Localize Cargas', 'E-commerce', 'NFSE'
].map(nome => ({ nome, tipo: 'MÓDULO' }))
// Shopee tem tela própria no sistema, mas não está em modulos_mantran
const MODULOS_EXTRAS: OpcaoModulo[] = [{ nome: 'Shopee', tipo: 'MÓDULO' }]
// Sugestões de seção (o campo aceita qualquer texto novo)
const SECOES_SUGERIDAS = ['Cadastros', 'Importação', 'Exportação', 'Faturamento', 'Relatórios', 'Configurações']

// ============================================================
// Academia Mantran — vídeos de treinamento (YouTube "Não listado")
// Acesso controlado por permissão de perfil; cadastro só para Admin e Suporte.
// ============================================================
export function AcademiaMantran() {
  const podeEditar = canEditFaq()
  const usuario = getLoggedUser()
  const usuarioChave = usuario?.id ? String(usuario.id) : ''

  const [videos, setVideos] = useState<AcademiaVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [moduloFiltro, setModuloFiltro] = useState('')
  // Cliente só vê vídeos dos módulos que contratou. null = ainda carregando.
  const ehCliente = isClienteUser()
  const [contratados, setContratados] = useState<{ resolvido: boolean; modulos: string[] } | null>(null)
  const [assistindo, setAssistindo] = useState<AcademiaVideo | null>(null)
  const [editando, setEditando] = useState<AcademiaVideo | 'novo' | null>(null)
  const [progresso, setProgresso] = useState<Record<string, ProgressoVideo>>({})
  const progressoRef = useRef<Record<string, ProgressoVideo>>({})

  useEffect(() => { progressoRef.current = progresso }, [progresso])

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      setVideos(await api.getAcademiaVideos())
    } catch (e: any) {
      console.error('Erro ao carregar vídeos da Academia:', e)
      setErro(e?.message || 'Erro ao carregar os vídeos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (!ehCliente) return
    let ativo = true
    api.getModulosContratadosDoUsuario(usuario)
      .then(r => { if (ativo) setContratados(r) })
      .catch(() => { if (ativo) setContratados({ resolvido: false, modulos: [] }) })
    return () => { ativo = false }
  }, [ehCliente]) // eslint-disable-line react-hooks/exhaustive-deps

  // Progresso do usuário logado (quais vídeos já assistiu)
  useEffect(() => {
    if (!usuarioChave) return
    api.getAcademiaProgresso(usuarioChave).then(setProgresso)
  }, [usuarioChave])

  // Atualiza o selo na hora e grava no banco. Nunca "desfaz" um vídeo já assistido
  // e guarda sempre o maior percentual alcançado.
  const registrarProgresso = (v: AcademiaVideo, pct: number, concluido: boolean) => {
    if (!usuarioChave) return
    const atual = progressoRef.current[v.id]
    const jaAssistido = !!atual?.assistido
    const assistido = jaAssistido || concluido
    const novoPct = assistido
      ? 100
      : Math.max(atual?.progresso_pct ?? 0, Math.min(PCT_ASSISTIDO - 1, Math.round(pct)))
    if (atual && atual.assistido === assistido && atual.progresso_pct === novoPct) return

    const novo: ProgressoVideo = { assistido, progresso_pct: novoPct }
    progressoRef.current = { ...progressoRef.current, [v.id]: novo }
    setProgresso(prev => ({ ...prev, [v.id]: novo }))
    api.salvarAcademiaProgresso({
      usuario_chave: usuarioChave,
      usuario_nome: usuario?.nome || usuario?.login || null,
      video_id: v.id,
      progresso_pct: novoPct,
      assistido,
      concluidoAgora: assistido && !jaAssistido
    })
  }

  // Fecha o player com a tecla Esc
  useEffect(() => {
    if (!assistindo) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAssistindo(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assistindo])

  // Vídeos que o usuário pode ver. Equipe Mantran vê tudo. Cliente vê os vídeos sem módulo
  // (conteúdo geral) e os que têm ao menos um módulo contratado por ele.
  // Se o cliente não puder ser identificado, só os vídeos gerais (nunca libera tudo).
  const videosVisiveis = useMemo(() => {
    if (!ehCliente) return videos
    const contrat = new Set((contratados?.modulos || []).map(normalizarNome))
    return videos.filter(v => {
      const mods = v.modulos || []
      return mods.length === 0 || mods.some(m => contrat.has(normalizarNome(m)))
    })
  }, [videos, ehCliente, contratados])

  // Módulos existentes (para os filtros em chips)
  const modulos = useMemo(() => {
    const set = new Set<string>()
    videosVisiveis.forEach(v => (v.modulos || []).forEach(m => set.add(m)))
    // Cliente só enxerga chips dos módulos que contratou
    const contrat = new Set((contratados?.modulos || []).map(normalizarNome))
    return Array.from(set)
      .filter(m => !ehCliente || contrat.has(normalizarNome(m)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [videosVisiveis, ehCliente, contratados])
  const temSemModulo = useMemo(() => videosVisiveis.some(v => !v.modulos?.length), [videosVisiveis])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return videosVisiveis.filter(v => {
      const mods = v.modulos || []
      // Um vídeo de 2 módulos aparece no filtro de cada um deles
      if (moduloFiltro === SEM_MODULO) { if (mods.length) return false }
      else if (moduloFiltro && !mods.includes(moduloFiltro)) return false
      if (!t) return true
      return (
        (v.titulo || '').toLowerCase().includes(t) ||
        (v.descricao || '').toLowerCase().includes(t) ||
        mods.some(m => m.toLowerCase().includes(t)) ||
        (v.secao || '').toLowerCase().includes(t)
      )
    })
  }, [videosVisiveis, busca, moduloFiltro])

  // Separa por seção. Seções ordenadas pelo menor "ordem" dos vídeos; "Sem seção" por último.
  const secoes = useMemo(() => {
    const mapa = new Map<string, { chave: string; nome: string; videos: AcademiaVideo[] }>()
    filtrados.forEach(v => {
      const nome = v.secao?.trim() || ''
      const chave = nome ? nome.toLowerCase() : ''
      if (!mapa.has(chave)) mapa.set(chave, { chave, nome: nome || 'Outros treinamentos', videos: [] })
      mapa.get(chave)!.videos.push(v)
    })
    const menorOrdem = (vs: AcademiaVideo[]) => Math.min(...vs.map(x => x.ordem ?? 0))
    return Array.from(mapa.values()).sort((a, b) => {
      if (!a.chave) return 1
      if (!b.chave) return -1
      return menorOrdem(a.videos) - menorOrdem(b.videos) || a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [filtrados])

  const proximaOrdem = useMemo(
    () => (videos.reduce((max, v) => Math.max(max, v.ordem || 0), 0) + 1),
    [videos]
  )

  const excluir = async (v: AcademiaVideo) => {
    if (!window.confirm(`Excluir o vídeo "${v.titulo}"?`)) return
    try {
      await api.deleteAcademiaVideo(v.id)
      await carregar()
    } catch (e: any) {
      alert('Erro ao excluir: ' + (e?.message || 'desconhecido'))
    }
  }

  // Tabela ainda não criada no banco
  const tabelaAusente = /academia_videos|schema cache|does not exist/i.test(erro)

  return (
    <div className="w-full flex flex-col gap-5 text-slate-800">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Academia Mantran</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Vídeos de treinamento para você aprender no seu ritmo{videosVisiveis.length > 0 ? ` • ${videosVisiveis.length} vídeo(s)` : ''}
            </p>
          </div>
        </div>

        {podeEditar && (
          <button
            type="button"
            onClick={() => setEditando('novo')}
            className="shrink-0 py-2 px-3 sm:px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Novo vídeo</span>
          </button>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <label htmlFor="academia-busca" className="sr-only">Buscar treinamento</label>
        <input
          id="academia-busca"
          type="text"
          placeholder="Buscar treinamento..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 shadow-sm"
        />
      </div>

      {/* Filtro por módulo */}
      {modulos.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por módulo">
          {[
            { valor: '', rotulo: 'Todos' },
            ...modulos.map(m => ({ valor: m, rotulo: m })),
            ...(temSemModulo ? [{ valor: SEM_MODULO, rotulo: 'Sem módulo' }] : [])
          ].map(op => (
            <button
              key={op.valor || 'todos'}
              type="button"
              onClick={() => setModuloFiltro(op.valor)}
              aria-pressed={moduloFiltro === op.valor}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer',
                moduloFiltro === op.valor
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-600'
              )}
            >
              {op.rotulo}
            </button>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      {ehCliente && contratados && !contratados.resolvido && !loading && (
        <div role="status" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>Não foi possível identificar os módulos contratados da sua empresa. Mostrando só os treinamentos gerais. Fale com o suporte para liberar os demais.</span>
        </div>
      )}

      {loading || (ehCliente && !contratados) ? (
        <div className="py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando treinamentos…
        </div>
      ) : erro ? (
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
          <AlertCircle className="w-9 h-9 text-red-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Não foi possível carregar os treinamentos</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {podeEditar && tabelaAusente
              ? 'A tabela da Academia ainda não existe no banco. Execute o script scripts/criar_tabelas_academia.sql no Supabase e atualize a página.'
              : 'Tente novamente em instantes.'}
          </p>
          <button
            type="button"
            onClick={carregar}
            className="mt-2 px-4 py-2 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2 shadow-sm">
          <Video className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">
            {busca ? 'Nenhum treinamento encontrado' : 'Ainda não há treinamentos publicados'}
          </h3>
          <p className="text-xs text-slate-500">
            {busca || moduloFiltro ? 'Tente outro termo de busca ou filtro.' : 'Em breve teremos novos vídeos por aqui.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {secoes.map(sec => (
          <section key={sec.chave || 'sem-secao'} aria-label={sec.nome}>
            <h2 className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 text-base font-black text-slate-900">
              {sec.nome}
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">{sec.videos.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sec.videos.map(v => {
            const prog = progresso[v.id]
            const statusTexto = prog?.assistido
              ? ' (já assistido)'
              : prog ? ` (em andamento, ${prog.progresso_pct}%)` : ''
            return (
              <article
                key={v.id}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => setAssistindo(v)}
                  aria-label={`Assistir: ${v.titulo}${statusTexto}`}
                  className="relative block w-full aspect-video bg-slate-200 overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <img
                    src={youtubeThumb(v.youtube_id)}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Selo de progresso do usuário */}
                  {prog?.assistido ? (
                    <span className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Assistido
                    </span>
                  ) : prog ? (
                    <span className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow">
                      Em andamento • {prog.progresso_pct}%
                    </span>
                  ) : null}

                  <span className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-colors">
                    <span className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 ml-0.5 fill-white" />
                    </span>
                  </span>
                </button>

                <div className="p-4 flex flex-col flex-1">
                  {(v.modulos?.length || v.secao) && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(v.modulos || []).map(m => (
                        <span key={m} className="px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold uppercase tracking-wide">
                          {m}
                        </span>
                      ))}
                      {v.secao && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                          {v.secao}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setAssistindo(v)}
                    className="text-left text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors cursor-pointer line-clamp-2"
                  >
                    {v.titulo}
                  </button>
                  {v.descricao && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{v.descricao}</p>
                  )}

                  {podeEditar && (
                    <div className="flex items-center gap-1 mt-auto pt-3">
                      <button
                        type="button"
                        onClick={() => setEditando(v)}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => excluir(v)}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
            </div>
          </section>
          ))}
        </div>
      )}

      {/* Player */}
      {assistindo && (
        <PlayerModal
          key={assistindo.id}
          video={assistindo}
          onClose={() => setAssistindo(null)}
          onProgresso={(pct, concluido) => registrarProgresso(assistindo, pct, concluido)}
        />
      )}

      {/* Cadastro / edição */}
      {editando && (
        <VideoFormModal
          video={editando === 'novo' ? null : editando}
          proximaOrdem={proximaOrdem}
          videosExistentes={videos}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); carregar() }}
        />
      )}
    </div>
  )
}

// ============================================================
// Player do vídeo + registro de progresso
// Usa a IFrame Player API oficial só para saber quando toca, o tempo atual e o fim.
// Marca "assistido" ao chegar a 90% ou ao terminar. Se a API não carregar, cai num
// player simples (sem registrar conclusão, só que o vídeo foi aberto).
// ============================================================
function PlayerModal({ video, onClose, onProgresso }: {
  video: AcademiaVideo
  onClose: () => void
  onProgresso: (pct: number, concluido: boolean) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [semApi, setSemApi] = useState(false)

  // Mantém sempre a versão mais recente do callback sem recriar o player
  const onProgressoRef = useRef(onProgresso)
  useEffect(() => { onProgressoRef.current = onProgresso }, [onProgresso])

  useEffect(() => {
    let cancelado = false
    let player: any = null
    let timer: number | undefined
    let ultimoSalvo = 0
    let concluiu = false

    const pctAtual = (): number => {
      try {
        const duracao = player?.getDuration?.() || 0
        const atual = player?.getCurrentTime?.() || 0
        return duracao > 0 ? (atual / duracao) * 100 : 0
      } catch {
        return 0
      }
    }

    const verificar = () => {
      if (concluiu) return
      const pct = pctAtual()
      if (pct >= PCT_ASSISTIDO) {
        concluiu = true
        onProgressoRef.current(100, true)
      } else if (pct - ultimoSalvo >= PASSO_SALVAR_PCT) {
        ultimoSalvo = Math.floor(pct)
        onProgressoRef.current(pct, false)
      }
    }

    const pararTimer = () => {
      if (timer !== undefined) { window.clearInterval(timer); timer = undefined }
    }

    carregarYoutubeApi()
      .then(YT => {
        if (cancelado || !containerRef.current) return
        const alvo = document.createElement('div')
        containerRef.current.appendChild(alvo)
        player = new YT.Player(alvo, {
          videoId: video.youtube_id,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1, origin: window.location.origin },
          events: {
            onReady: (e: any) => {
              try { e.target.getIframe().title = video.titulo } catch { /* sem título no iframe */ }
            },
            onStateChange: (e: any) => {
              const estados = YT.PlayerState
              if (e.data === estados.PLAYING) {
                // registra que começou (1%) e acompanha o avanço
                onProgressoRef.current(Math.max(1, pctAtual()), false)
                pararTimer()
                timer = window.setInterval(verificar, 4000)
              } else if (e.data === estados.ENDED) {
                pararTimer()
                concluiu = true
                onProgressoRef.current(100, true)
              } else {
                pararTimer()
                verificar()
              }
            }
          }
        })
      })
      .catch(() => { if (!cancelado) setSemApi(true) })

    return () => {
      cancelado = true
      pararTimer()
      if (player) {
        verificar() // guarda o ponto alcançado ao fechar
        try { player.destroy() } catch { /* já destruído */ }
      }
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [video.id, video.youtube_id, video.titulo])

  // Sem a API não dá para medir; ao menos registra que o vídeo foi aberto
  useEffect(() => {
    if (semApi) onProgressoRef.current(1, false)
  }, [semApi])

  return (
    <div
      className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={video.titulo}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        // Player grande (até 1280px de largura), sem passar da altura da tela.
        // O YouTube escolhe a resolução também pelo tamanho do player.
        style={{ width: 'min(96vw, 1280px, calc((100vh - 10rem) * 16 / 9))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{video.titulo}</h2>
            {video.descricao && <p className="text-xs text-slate-500 mt-0.5">{video.descricao}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar vídeo"
            className="shrink-0 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {semApi ? (
          <div className="aspect-video bg-black">
            <iframe
              title={video.titulo}
              src={youtubeEmbedUrl(video.youtube_id, true)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <div ref={containerRef} className="aspect-video bg-black [&_iframe]:w-full [&_iframe]:h-full" />
        )}

        <div className="px-5 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <p className="text-xs text-slate-600 flex items-start gap-1.5">
            <Settings className="w-4 h-4 text-slate-400 shrink-0 mt-px" aria-hidden="true" />
            <span>
              <strong>A imagem está borrada?</strong> Toque na engrenagem do vídeo, abra <strong>Qualidade</strong> e selecione <strong>1080p (HD)</strong>.
            </span>
          </p>
          <a
            href={video.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Não carregou? Abrir no YouTube
          </a>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Modal: cadastrar / editar vídeo
// ============================================================
function VideoFormModal({ video, proximaOrdem, videosExistentes, onClose, onSaved }: {
  video: AcademiaVideo | null
  proximaOrdem: number
  videosExistentes: AcademiaVideo[]
  onClose: () => void
  onSaved: () => void
}) {
  // Trava síncrona contra clique duplo: o estado "salvando" só atualiza no próximo
  // render, então dois cliques rápidos ainda passariam. O ref bloqueia na hora.
  const enviandoRef = useRef(false)

  const [titulo, setTitulo] = useState(video?.titulo || '')
  const [url, setUrl] = useState(video?.youtube_url || '')
  const [descricao, setDescricao] = useState(video?.descricao || '')
  const [ordem, setOrdem] = useState(String(video?.ordem ?? proximaOrdem))
  const [modulosSel, setModulosSel] = useState<string[]>(video?.modulos || [])
  const [opcoesModulo, setOpcoesModulo] = useState<OpcaoModulo[]>([...MODULOS_FALLBACK, ...MODULOS_EXTRAS])
  const [secao, setSecao] = useState(video?.secao || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const videoId = extrairYoutubeId(url)

  // Módulos oficiais vêm da tabela modulos_mantran (a mesma do cadastro de clientes)
  useEffect(() => {
    let ativo = true
    api.getModulosMantran()
      .then((rows: any[]) => {
        if (!ativo || !rows?.length) return
        const lista: OpcaoModulo[] = rows
          .filter(r => r?.nome)
          .map(r => ({ nome: String(r.nome), tipo: String(r.tipo || 'MÓDULO') }))
        const nomes = new Set(lista.map(o => o.nome.toLowerCase()))
        MODULOS_EXTRAS.forEach(e => { if (!nomes.has(e.nome.toLowerCase())) lista.push(e) })
        setOpcoesModulo(lista)
      })
      .catch(() => { /* mantém a lista padrão */ })
    return () => { ativo = false }
  }, [])

  const ehIntegracao = (tipo: string) => /INTEGRA/i.test(tipo)
  const ordenar = (a: OpcaoModulo, b: OpcaoModulo) => a.nome.localeCompare(b.nome, 'pt-BR')
  const gruposModulo = [
    { titulo: 'Módulos', itens: opcoesModulo.filter(o => !ehIntegracao(o.tipo)).sort(ordenar) },
    { titulo: 'Integrações', itens: opcoesModulo.filter(o => ehIntegracao(o.tipo)).sort(ordenar) }
  ].filter(g => g.itens.length > 0)
  // Valores já gravados que não estão mais na lista oficial continuam visíveis para poder desmarcar
  const nomesOficiais = new Set(opcoesModulo.map(o => o.nome))
  const modulosAntigos = modulosSel.filter(m => !nomesOficiais.has(m))

  const alternarModulo = (nome: string) =>
    setModulosSel(prev => prev.includes(nome) ? prev.filter(m => m !== nome) : [...prev, nome])

  // Sugestões de seção = padrões + o que já foi usado em outros vídeos (evita "Cadastros" x "cadastros")
  const secoesOpcoes = (() => {
    const mapa = new Map<string, string>()
    ;[...SECOES_SUGERIDAS, ...videosExistentes.map(v => v.secao?.trim() || '')].forEach(x => {
      if (x && !mapa.has(x.toLowerCase())) mapa.set(x.toLowerCase(), x)
    })
    return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  })()

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500'
  const labelCls = 'block text-xs font-bold text-slate-600 mb-1'

  const salvar = async () => {
    if (enviandoRef.current) return
    if (!titulo.trim()) { setErro('Informe o título do treinamento.'); return }
    if (!videoId) { setErro('Link do YouTube inválido. Cole o link do vídeo (ex.: https://youtu.be/...).'); return }

    // Mesmo vídeo já cadastrado (ignora o próprio registro ao editar)
    const duplicado = videosExistentes.find(v => v.youtube_id === videoId && v.id !== video?.id)
    if (duplicado) {
      setErro(`Este vídeo já está cadastrado como "${duplicado.titulo}".`)
      return
    }
    const ordemNum = Number.parseInt(ordem, 10)

    setErro('')
    enviandoRef.current = true
    setSalvando(true)
    try {
      const dados = {
        titulo,
        descricao,
        youtube_url: url,
        youtube_id: videoId,
        modulos: modulosSel,
        secao,
        ordem: Number.isNaN(ordemNum) ? proximaOrdem : ordemNum
      }
      if (video) {
        await api.updateAcademiaVideo(video.id, dados)
      } else {
        const user = getLoggedUser()
        await api.createAcademiaVideo({ ...dados, criado_por_nome: user?.nome || user?.login || null })
      }
      onSaved()
    } catch (e: any) {
      setErro('Erro ao salvar: ' + (e?.message || 'desconhecido'))
    } finally {
      enviandoRef.current = false
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={video ? 'Editar vídeo' : 'Novo vídeo'}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600">
              <Video className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">{video ? 'Editar vídeo' : 'Novo vídeo'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scrollbar-clean">
          {erro && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
            </div>
          )}

          <div>
            <label htmlFor="av-titulo" className={labelCls}>Título <span className="text-red-500">*</span></label>
            <input id="av-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus placeholder="Ex: Cadastro de Veículo Frota" className={inputCls} />
          </div>

          <div>
            <label htmlFor="av-url" className={labelCls}>Link do YouTube <span className="text-red-500">*</span></label>
            <input id="av-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtu.be/..." className={inputCls} />
            {url.trim() && !videoId && (
              <p className="text-[11px] text-red-500 mt-1">Link não reconhecido. Use o link de compartilhar do vídeo.</p>
            )}
            {videoId && (
              <div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <img src={youtubeThumb(videoId)} alt="Miniatura do vídeo" className="w-24 aspect-video object-cover rounded-md bg-slate-200" />
                <span className="text-[11px] text-emerald-600 font-semibold">Vídeo reconhecido ✓</span>
              </div>
            )}
          </div>

          <fieldset>
            <legend className={labelCls}>
              Módulos <span className="font-normal text-slate-400">(marque todos a que a tela pertence)</span>
            </legend>
            <div className="border border-slate-200 rounded-lg p-3 space-y-3 max-h-52 overflow-y-auto scrollbar-clean">
              {gruposModulo.map(g => (
                <div key={g.titulo}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{g.titulo}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {g.itens.map(o => (
                      <label key={o.nome} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={modulosSel.includes(o.nome)}
                          onChange={() => alternarModulo(o.nome)}
                          className="w-4 h-4 rounded border-slate-300 accent-brand-600"
                        />
                        <span className="truncate">{o.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {modulosAntigos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Fora da lista oficial</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {modulosAntigos.map(nome => (
                      <label key={nome} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked onChange={() => alternarModulo(nome)} className="w-4 h-4 rounded border-slate-300 accent-brand-600" />
                        <span className="truncate">{nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <div>
            <label htmlFor="av-secao" className={labelCls}>Seção</label>
            <input id="av-secao" list="av-secoes" value={secao} onChange={e => setSecao(e.target.value)} placeholder="Ex: Cadastros" autoComplete="off" className={inputCls} />
            <datalist id="av-secoes">
              {secoesOpcoes.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div>
            <label htmlFor="av-desc" className={labelCls}>Descrição</label>
            <textarea id="av-desc" value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Resumo do que o treinamento ensina" className={inputCls + ' resize-y'} />
          </div>

          <div className="max-w-[10rem]">
            <label htmlFor="av-ordem" className={labelCls}>Ordem de exibição</label>
            <input id="av-ordem" type="number" min={0} value={ordem} onChange={e => setOrdem(e.target.value)} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">Menor número aparece primeiro.</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            aria-busy={salvando}
            className={clsx('px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center gap-2', salvando ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer')}
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
