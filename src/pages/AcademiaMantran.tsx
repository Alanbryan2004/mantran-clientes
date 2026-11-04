import { useState, useEffect, useMemo } from 'react'
import {
  GraduationCap, Search, Play, Plus, Pencil, Trash2, X, Save,
  Loader2, AlertCircle, Video, ExternalLink
} from 'lucide-react'
import clsx from 'clsx'
import { api, type AcademiaVideo } from '../lib/api'
import { getLoggedUser, canEditFaq } from '../lib/auth'
import { extrairYoutubeId, youtubeThumb, youtubeEmbedUrl } from '../lib/youtube'

// ============================================================
// Academia Mantran — vídeos de treinamento (YouTube "Não listado")
// Consulta liberada para clientes e equipe; cadastro só para Admin e Suporte.
// ============================================================
export function AcademiaMantran() {
  const podeEditar = canEditFaq()

  const [videos, setVideos] = useState<AcademiaVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [assistindo, setAssistindo] = useState<AcademiaVideo | null>(null)
  const [editando, setEditando] = useState<AcademiaVideo | 'novo' | null>(null)

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

  // Fecha o player com a tecla Esc
  useEffect(() => {
    if (!assistindo) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAssistindo(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assistindo])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return videos
    return videos.filter(v =>
      (v.titulo || '').toLowerCase().includes(t) ||
      (v.descricao || '').toLowerCase().includes(t)
    )
  }, [videos, busca])

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
              Vídeos de treinamento para você aprender no seu ritmo{videos.length > 0 ? ` • ${videos.length} vídeo(s)` : ''}
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

      {/* Conteúdo */}
      {loading ? (
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
            {busca ? 'Tente outro termo de busca.' : 'Em breve teremos novos vídeos por aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map(v => (
            <article
              key={v.id}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col"
            >
              <button
                type="button"
                onClick={() => setAssistindo(v)}
                aria-label={`Assistir: ${v.titulo}`}
                className="relative block w-full aspect-video bg-slate-200 overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <img
                  src={youtubeThumb(v.youtube_id)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-colors">
                  <span className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-white" />
                  </span>
                </span>
              </button>

              <div className="p-4 flex flex-col flex-1">
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
          ))}
        </div>
      )}

      {/* Player */}
      {assistindo && (
        <div
          className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAssistindo(null)}
          role="dialog"
          aria-modal="true"
          aria-label={assistindo.titulo}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-slate-200">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">{assistindo.titulo}</h2>
                {assistindo.descricao && <p className="text-xs text-slate-500 mt-0.5">{assistindo.descricao}</p>}
              </div>
              <button
                type="button"
                onClick={() => setAssistindo(null)}
                aria-label="Fechar vídeo"
                className="shrink-0 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe
                key={assistindo.id}
                title={assistindo.titulo}
                src={youtubeEmbedUrl(assistindo.youtube_id, true)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <div className="px-5 py-2.5 border-t border-slate-200 flex justify-end">
              <a
                href={assistindo.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Não carregou? Abrir no YouTube
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Cadastro / edição */}
      {editando && (
        <VideoFormModal
          video={editando === 'novo' ? null : editando}
          proximaOrdem={proximaOrdem}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); carregar() }}
        />
      )}
    </div>
  )
}

// ============================================================
// Modal: cadastrar / editar vídeo
// ============================================================
function VideoFormModal({ video, proximaOrdem, onClose, onSaved }: {
  video: AcademiaVideo | null
  proximaOrdem: number
  onClose: () => void
  onSaved: () => void
}) {
  const [titulo, setTitulo] = useState(video?.titulo || '')
  const [url, setUrl] = useState(video?.youtube_url || '')
  const [descricao, setDescricao] = useState(video?.descricao || '')
  const [ordem, setOrdem] = useState(String(video?.ordem ?? proximaOrdem))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const videoId = extrairYoutubeId(url)

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500'
  const labelCls = 'block text-xs font-bold text-slate-600 mb-1'

  const salvar = async () => {
    if (!titulo.trim()) { setErro('Informe o título do treinamento.'); return }
    if (!videoId) { setErro('Link do YouTube inválido. Cole o link do vídeo (ex.: https://youtu.be/...).'); return }
    const ordemNum = Number.parseInt(ordem, 10)

    setErro('')
    setSalvando(true)
    try {
      const dados = {
        titulo,
        descricao,
        youtube_url: url,
        youtube_id: videoId,
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
            className={clsx('px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer', salvando && 'opacity-60')}
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
