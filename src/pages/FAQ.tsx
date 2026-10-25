import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BookOpen, Search, Plus, Pencil, Trash2, X, Save, ChevronRight,
  Image as ImageIcon, GripVertical, Bold, FolderPlus, ArrowLeft
} from 'lucide-react'
import { api, type FaqCategoria, type FaqProcedimento, type FaqPasso } from '../lib/api'
import { getLoggedUser, canEditFaq } from '../lib/auth'
import clsx from 'clsx'

// Renderiza texto do passo permitindo apenas <b>/<strong> (resto escapado).
function renderTextoPasso(texto: string): { __html: string } {
  const safe = (texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>')
    .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>')
    .replace(/\n/g, '<br>')
  return { __html: safe }
}

export function FAQ() {
  const user = getLoggedUser()
  const podeEditar = canEditFaq()

  const [categorias, setCategorias] = useState<FaqCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [procSelecionadoId, setProcSelecionadoId] = useState<string | null>(null)

  const [imgZoom, setImgZoom] = useState<string | null>(null)
  const [modalCategoria, setModalCategoria] = useState<FaqCategoria | 'novo' | null>(null)
  const [modalProc, setModalProc] = useState<FaqProcedimento | { novo: true; categoria_id: string } | null>(null)

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const data = await api.getFaqCompleto()
      setCategorias(data)
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar o FAQ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const todosProcs = useMemo(
    () => categorias.flatMap(c => (c.procedimentos || []).map(p => ({ ...p, _categoria: c.nome }))),
    [categorias]
  )
  const procSelecionado = useMemo(
    () => todosProcs.find(p => p.id === procSelecionadoId) || null,
    [todosProcs, procSelecionadoId]
  )

  const modulosExistentes = useMemo(() => {
    const set = new Set<string>()
    categorias.forEach(c => { if (c.modulo && c.modulo.trim()) set.add(c.modulo.trim()) })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categorias])

  const categoriasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return categorias
    return categorias
      .map(c => ({
        ...c,
        procedimentos: (c.procedimentos || []).filter(p =>
          (p.titulo || '').toLowerCase().includes(q) ||
          (p.descricao || '').toLowerCase().includes(q) ||
          (p.caminho_menu || '').toLowerCase().includes(q)
        )
      }))
      .filter(c => (c.procedimentos || []).length > 0)
  }, [categorias, busca])

  // Agrupa as seções por Módulo para a barra lateral.
  const gruposPorModulo = useMemo(() => {
    const map = new Map<string, FaqCategoria[]>()
    categoriasFiltradas.forEach(c => {
      const chave = (c.modulo && c.modulo.trim()) ? c.modulo.trim() : ''
      const arr = map.get(chave) || []
      arr.push(c)
      map.set(chave, arr)
    })
    // Módulos nomeados em ordem alfabética; seções "sem módulo" por último.
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === '') return 1
        if (b === '') return -1
        return a.localeCompare(b)
      })
  }, [categoriasFiltradas])

  const handleExcluirProc = async (p: FaqProcedimento) => {
    if (!window.confirm(`Excluir o procedimento "${p.titulo}"? Esta ação remove também os passos.`)) return
    try {
      await api.deleteFaqProcedimento(p.id)
      if (procSelecionadoId === p.id) setProcSelecionadoId(null)
      await carregar()
    } catch (e: any) { alert('Erro ao excluir: ' + (e?.message || e)) }
  }

  const handleExcluirCategoria = async (c: FaqCategoria) => {
    if (!window.confirm(`Excluir a seção "${c.nome}"? Todos os procedimentos dentro dela serão removidos.`)) return
    try {
      await api.deleteFaqCategoria(c.id)
      await carregar()
    } catch (e: any) { alert('Erro ao excluir: ' + (e?.message || e)) }
  }

  return (
    <div className="max-w-none w-full min-w-0 bg-slate-50 rounded-2xl p-4 sm:p-6 min-h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="h-10 sm:h-11 px-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
            <img 
              src="/Logo_Mantran.png" 
              alt="Mantran" 
              className="h-6 sm:h-7 w-auto object-contain select-none"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">FAQ — Como fazer no Mantran</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Procedimentos passo a passo. Busque ou escolha um item ao lado.</p>
          </div>
        </div>
        {podeEditar && (
          <button
            onClick={() => setModalCategoria('novo')}
            className="shrink-0 py-2 px-3 sm:px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 shadow-sm transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> <span className="hidden sm:inline">Nova Seção</span>
          </button>
        )}
      </div>

      {erro && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{erro}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* SIDEBAR */}
        <aside className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 h-fit lg:sticky lg:top-4">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar procedimento…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          {loading ? (
            <div className="text-xs text-slate-400 py-6 text-center animate-pulse">Carregando…</div>
          ) : categoriasFiltradas.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">Nenhum procedimento encontrado.</div>
          ) : (
            <nav className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-clean">
              {gruposPorModulo.map(([modulo, cats]) => (
                <div key={modulo || '__sem_modulo__'}>
                  {modulo && (
                    <div className="flex items-center gap-1.5 px-1 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                      <span className="text-[11px] font-black text-slate-700">{modulo}</span>
                    </div>
                  )}
                  <div className={clsx('space-y-3', modulo && 'pl-2 border-l border-slate-200 ml-1')}>
                    {cats.map(cat => (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between group px-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{cat.nome}</span>
                          {podeEditar && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setModalProc({ novo: true, categoria_id: cat.id })} title="Novo procedimento nesta seção" className="p-1 text-slate-400 hover:text-brand-600"><Plus className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setModalCategoria(cat)} title="Editar seção" className="p-1 text-slate-400 hover:text-brand-600"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => handleExcluirCategoria(cat)} title="Excluir seção" className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {(cat.procedimentos || []).map(proc => (
                            <button
                              key={proc.id}
                              onClick={() => setProcSelecionadoId(proc.id)}
                              className={clsx(
                                'w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors border',
                                procSelecionadoId === proc.id
                                  ? 'bg-brand-50 text-brand-700 font-semibold border-brand-200'
                                  : 'text-slate-600 hover:bg-slate-50 border-transparent'
                              )}
                            >
                              {proc.titulo}
                            </button>
                          ))}
                          {(cat.procedimentos || []).length === 0 && (
                            <div className="text-[11px] text-slate-400 italic px-2.5 py-1">Sem procedimentos.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          )}
        </aside>

        {/* CONTEÚDO */}
        <main className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-7 min-h-[60vh] relative overflow-hidden flex flex-col justify-between">
          {/* Marca d'água do Logo da Mantran */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
            <img 
              src="/Logo_Mantran.png" 
              alt="" 
              aria-hidden="true"
              className={clsx(
                "w-[420px] max-w-[75%] object-contain select-none transition-all duration-300 pointer-events-none",
                !procSelecionado 
                  ? "opacity-[0.10] scale-100" 
                  : "opacity-[0.035] scale-95"
              )}
            />
          </div>

          {!procSelecionado ? (
            <div className="h-full flex-1 flex flex-col items-center justify-center text-center py-20 relative z-10 select-none">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4 shadow-sm">
                <BookOpen className="w-8 h-8 opacity-80" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-700">Selecione um procedimento ao lado</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-sm">
                Escolha um item no menu à esquerda para visualizar o passo a passo com telas e instruções.
              </p>
              
              <div className="mt-8 flex items-center gap-2 text-[11px] text-slate-400 font-medium bg-slate-50/80 px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-2xs">
                <img src="/Logo_Mantran.png" alt="Mantran" className="h-3.5 w-auto object-contain opacity-60" />
                <span>Base de Conhecimento Mantran</span>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col justify-between flex-1">
              <div>
                <button onClick={() => setProcSelecionadoId(null)} className="lg:hidden flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>

                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-slate-900">{procSelecionado.titulo}</h2>
                    {procSelecionado.descricao && <p className="text-sm text-slate-500 mt-1">{procSelecionado.descricao}</p>}
                    {procSelecionado.caminho_menu && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px]">
                        {procSelecionado.caminho_menu.split(/›|>/).map((parte, i, arr) => (
                          <span key={i} className="flex items-center gap-1.5">
                            <span className={clsx(
                              'px-2 py-0.5 rounded-md border',
                              i === arr.length - 1
                                ? 'bg-brand-50 text-brand-700 border-brand-200 font-bold'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            )}>
                              {parte.trim()}
                            </span>
                            {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {podeEditar && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setModalProc(procSelecionado)} className="py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 shadow-sm transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button onClick={() => handleExcluirProc(procSelecionado)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" title="Excluir procedimento">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {(procSelecionado.passos || []).length === 0 ? (
                  <div className="text-sm text-slate-400 italic py-8 text-center">Este procedimento ainda não tem passos cadastrados.</div>
                ) : (
                  <ol className="space-y-6">
                    {(procSelecionado.passos || []).map((passo, idx) => (
                      <li key={passo.id || idx} className="flex gap-4">
                        <span className="shrink-0 w-7 h-7 rounded-full border-2 border-brand-500 text-brand-600 font-black text-xs flex items-center justify-center mt-0.5">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          {passo.texto && (
                            <div className="text-sm text-slate-700 leading-relaxed [&_b]:text-slate-900 [&_b]:font-bold" dangerouslySetInnerHTML={renderTextoPasso(passo.texto)} />
                          )}
                          {passo.imagem_url && (
                            <img src={passo.imagem_url} alt={`Passo ${idx + 1}`} onClick={() => setImgZoom(passo.imagem_url!)} className="mt-3 rounded-lg border border-slate-200 max-w-full cursor-zoom-in hover:border-brand-400 transition-colors shadow-sm" />
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Rodapé institucional com marca d'água sutil */}
              <div className="mt-12 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 select-none">
                <div className="flex items-center gap-2">
                  <img src="/Logo_Mantran.png" alt="Mantran" className="h-3.5 w-auto object-contain opacity-50 grayscale" />
                  <span>Documentação e Procedimentos Mantran</span>
                </div>
                <span>Dúvidas ou suporte? Entre em contato com a equipe Mantran</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* LIGHTBOX */}
      {imgZoom && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImgZoom(null)}>
          <button className="absolute top-4 right-4 text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg p-2" onClick={() => setImgZoom(null)}><X className="w-5 h-5" /></button>
          <img src={imgZoom} alt="" className="max-w-full max-h-[90vh] rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {modalCategoria && (
        <CategoriaModal
          categoria={modalCategoria === 'novo' ? null : modalCategoria}
          proximaOrdem={categorias.length + 1}
          modulosExistentes={modulosExistentes}
          onClose={() => setModalCategoria(null)}
          onSaved={async () => { setModalCategoria(null); await carregar() }}
        />
      )}

      {modalProc && (
        <ProcedimentoModal
          proc={'novo' in modalProc ? null : modalProc}
          categoriaIdInicial={'novo' in modalProc ? modalProc.categoria_id : (modalProc as FaqProcedimento).categoria_id}
          categorias={categorias}
          usuario={user}
          onClose={() => setModalProc(null)}
          onSaved={async (procId) => { setModalProc(null); await carregar(); if (procId) setProcSelecionadoId(procId) }}
        />
      )}
    </div>
  )
}

// ============================================================
// MODAL: Criar/Editar Seção
// ============================================================
function CategoriaModal({ categoria, proximaOrdem, modulosExistentes, onClose, onSaved }: {
  categoria: FaqCategoria | null
  proximaOrdem: number
  modulosExistentes: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(categoria?.nome || '')
  const [modulo, setModulo] = useState(categoria?.modulo || '')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!nome.trim()) { alert('Informe o nome da seção.'); return }
    setSalvando(true)
    try {
      if (categoria) await api.updateFaqCategoria(categoria.id, { nome, modulo: modulo || null })
      else await api.createFaqCategoria({ nome, modulo: modulo || null, ordem: proximaOrdem })
      onSaved()
    } catch (e: any) { alert('Erro ao salvar: ' + (e?.message || e)) }
    finally { setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-base font-black text-slate-800">{categoria ? 'Editar Seção' : 'Nova Seção'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Módulo</label>
            <input
              value={modulo}
              onChange={e => setModulo(e.target.value)}
              list="faq-modulos-list"
              placeholder="Ex: Shopee, Operação, Faturamento…"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none"
            />
            <datalist id="faq-modulos-list">
              {modulosExistentes.map(m => <option key={m} value={m} />)}
            </datalist>
            <p className="text-[11px] text-slate-400 mt-1">Agrupa esta seção na barra lateral. Escolha um existente ou digite um novo.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome da seção</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cadastros, Importação de planilhas…" autoFocus className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="py-2 px-4 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="py-2 px-4 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-1.5 disabled:opacity-50"><Save className="w-3.5 h-3.5" /> {salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MODAL: Criar/Editar Procedimento + Editor de Passos
// ============================================================
interface PassoEdit { texto: string; imagem_url: string | null; _localId: string }

function ProcedimentoModal({ proc, categoriaIdInicial, categorias, usuario, onClose, onSaved }: {
  proc: FaqProcedimento | null
  categoriaIdInicial: string
  categorias: FaqCategoria[]
  usuario: any
  onClose: () => void
  onSaved: (procId?: string) => void
}) {
  const [categoriaId, setCategoriaId] = useState(categoriaIdInicial)
  // Criação de seção inline (quando escolhe "+ Nova seção" no dropdown)
  const [criandoSecao, setCriandoSecao] = useState(false)
  const [novaSecaoNome, setNovaSecaoNome] = useState('')
  const [novaSecaoModulo, setNovaSecaoModulo] = useState('')
  const [titulo, setTitulo] = useState(proc?.titulo || '')
  const [descricao, setDescricao] = useState(proc?.descricao || '')
  const [caminhoMenu, setCaminhoMenu] = useState(proc?.caminho_menu || '')
  const [passos, setPassos] = useState<PassoEdit[]>(
    (proc?.passos || []).map((p: FaqPasso) => ({ texto: p.texto || '', imagem_url: p.imagem_url || null, _localId: Math.random().toString(36).slice(2) }))
  )
  const [salvando, setSalvando] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  const modulosExistentes = useMemo(() => {
    const set = new Set<string>()
    categorias.forEach(c => { if (c.modulo && c.modulo.trim()) set.add(c.modulo.trim()) })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categorias])

  // Seções agrupadas por módulo (para os optgroups do select).
  const categoriasAgrupadas = useMemo(() => {
    const map = new Map<string, FaqCategoria[]>()
    categorias.forEach(c => {
      const chave = (c.modulo && c.modulo.trim()) ? c.modulo.trim() : ''
      const arr = map.get(chave) || []
      arr.push(c)
      map.set(chave, arr)
    })
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === '') return 1
      if (b === '') return -1
      return a.localeCompare(b)
    })
  }, [categorias])

  const onChangeSecao = (v: string) => {
    if (v === '__nova__') {
      setCriandoSecao(true)
      setCategoriaId('')
    } else {
      setCriandoSecao(false)
      setCategoriaId(v)
    }
  }

  const addPasso = () => setPassos(prev => [...prev, { texto: '', imagem_url: null, _localId: Math.random().toString(36).slice(2) }])
  const removePasso = (i: number) => setPassos(prev => prev.filter((_, idx) => idx !== i))
  const moverPasso = (i: number, dir: -1 | 1) => setPassos(prev => {
    const j = i + dir
    if (j < 0 || j >= prev.length) return prev
    const copia = [...prev]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    return copia
  })
  const setTextoPasso = (i: number, v: string) => setPassos(prev => prev.map((p, idx) => idx === i ? { ...p, texto: v } : p))

  const uploadImagem = async (i: number, file: File) => {
    setUploadingIdx(i)
    try {
      const url = await api.uploadFaqImagem(file, file.name)
      setPassos(prev => prev.map((p, idx) => idx === i ? { ...p, imagem_url: url } : p))
    } catch (e: any) { alert('Erro ao enviar imagem: ' + (e?.message || e)) }
    finally { setUploadingIdx(null) }
  }

  const salvar = async () => {
    if (!titulo.trim()) { alert('Informe o título do procedimento.'); return }
    if (criandoSecao && !novaSecaoNome.trim()) { alert('Informe o nome da nova seção.'); return }
    if (!criandoSecao && !categoriaId) { alert('Selecione a seção.'); return }
    setSalvando(true)
    try {
      // Cria a seção nova (com módulo), se o usuário escolheu "+ Nova seção".
      let catId = categoriaId
      if (criandoSecao) {
        const novaCat = await api.createFaqCategoria({
          nome: novaSecaoNome.trim(),
          modulo: novaSecaoModulo.trim() || null,
          ordem: categorias.length + 1
        })
        catId = novaCat.id
      }
      let procId = proc?.id
      if (proc) {
        await api.updateFaqProcedimento(proc.id, { categoria_id: catId, titulo, descricao: descricao || null, caminho_menu: caminhoMenu || null })
      } else {
        const novo = await api.createFaqProcedimento({
          categoria_id: catId, titulo, descricao: descricao || null, caminho_menu: caminhoMenu || null,
          criado_por_id: usuario?.id || null, criado_por_nome: usuario?.nome || usuario?.login || null
        })
        procId = novo.id
      }
      await api.salvarFaqPassos(procId!, passos.map(p => ({ texto: p.texto, imagem_url: p.imagem_url })))
      onSaved(procId)
    } catch (e: any) { alert('Erro ao salvar: ' + (e?.message || e)) }
    finally { setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-black text-slate-800">{proc ? 'Editar Procedimento' : 'Novo Procedimento'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-clean">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Seção</label>
              <select value={criandoSecao ? '__nova__' : categoriaId} onChange={e => onChangeSecao(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none">
                {!criandoSecao && !categoriaId && <option value="" disabled>Selecione…</option>}
                {categoriasAgrupadas.map(([modulo, cats]) =>
                  modulo ? (
                    <optgroup key={modulo} label={modulo}>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </optgroup>
                  ) : (
                    cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)
                  )
                )}
                <option value="__nova__">➕ Nova seção…</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Título</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Cadastro de veículo" className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
          </div>

          {criandoSecao && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-brand-50/60 border border-brand-200">
              <div>
                <label className="block text-xs font-bold text-brand-700 mb-1.5">Módulo da nova seção</label>
                <input
                  value={novaSecaoModulo}
                  onChange={e => setNovaSecaoModulo(e.target.value)}
                  list="faq-modulos-list-proc"
                  placeholder="Ex: Shopee, Operação…"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-brand-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none"
                />
                <datalist id="faq-modulos-list-proc">
                  {modulosExistentes.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-700 mb-1.5">Nome da nova seção</label>
                <input
                  value={novaSecaoNome}
                  onChange={e => setNovaSecaoNome(e.target.value)}
                  placeholder="Ex: Cadastros"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-brand-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Descrição (subtítulo)</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição do procedimento" className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Caminho no menu (breadcrumb)</label>
            <input value={caminhoMenu} onChange={e => setCaminhoMenu(e.target.value)} placeholder="Ex: Módulo Shopee › Cadastros › Veículo" className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none" />
            <p className="text-[11px] text-slate-400 mt-1">Separe os níveis com › (ou &gt;). Ex.: Módulo Operação › Cadastros › Motorista</p>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-black text-slate-800">Passos ({passos.length})</h4>
              <button onClick={addPasso} className="py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600"><Plus className="w-3.5 h-3.5" /> Adicionar Passo</button>
            </div>

            {passos.length === 0 && (
              <div className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-300 rounded-lg">Nenhum passo. Clique em "Adicionar Passo".</div>
            )}

            <div className="space-y-3">
              {passos.map((p, i) => (
                <PassoEditor
                  key={p._localId}
                  index={i} total={passos.length} passo={p} uploading={uploadingIdx === i}
                  onTexto={(v) => setTextoPasso(i, v)}
                  onUpload={(file) => uploadImagem(i, file)}
                  onRemoveImg={() => setPassos(prev => prev.map((pp, idx) => idx === i ? { ...pp, imagem_url: null } : pp))}
                  onMover={(dir) => moverPasso(i, dir)}
                  onRemover={() => removePasso(i)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="py-2 px-4 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="py-2 px-4 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-1.5 disabled:opacity-50"><Save className="w-3.5 h-3.5" /> {salvando ? 'Salvando…' : 'Salvar Procedimento'}</button>
        </div>
      </div>
    </div>
  )
}

function PassoEditor({ index, total, passo, uploading, onTexto, onUpload, onRemoveImg, onMover, onRemover }: {
  index: number
  total: number
  passo: PassoEdit
  uploading: boolean
  onTexto: (v: string) => void
  onUpload: (file: File) => void
  onRemoveImg: () => void
  onMover: (dir: -1 | 1) => void
  onRemover: () => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  const aplicarNegrito = () => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const val = passo.texto || ''
    const sel = val.slice(start, end) || 'texto'
    onTexto(val.slice(0, start) + `<b>${sel}</b>` + val.slice(end))
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile()
        if (file) { e.preventDefault(); onUpload(file) }
        break
      }
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-500">
          <GripVertical className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold">Passo {index + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMover(-1)} disabled={index === 0} className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30" title="Subir">↑</button>
          <button onClick={() => onMover(1)} disabled={index === total - 1} className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30" title="Descer">↓</button>
          <button onClick={aplicarNegrito} className="p-1 text-slate-500 hover:text-brand-600" title="Negrito na seleção"><Bold className="w-3.5 h-3.5" /></button>
          <button onClick={onRemover} className="p-1 text-slate-500 hover:text-red-500" title="Remover passo"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <textarea
        ref={taRef}
        value={passo.texto}
        onChange={e => onTexto(e.target.value)}
        onPaste={onPaste}
        rows={2}
        placeholder="Descreva o passo. Use o botão de negrito para destacar nomes de campos. Cole (Ctrl+V) um print aqui."
        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm focus:border-brand-500 focus:outline-none resize-y"
      />

      <div className="mt-2 flex items-center gap-3">
        {passo.imagem_url ? (
          <div className="relative">
            <img src={passo.imagem_url} alt="" className="h-20 rounded-lg border border-slate-200" />
            <button onClick={onRemoveImg} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center" title="Remover imagem">✕</button>
          </div>
        ) : (
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600 cursor-pointer bg-white">
            <ImageIcon className="w-3.5 h-3.5" />
            {uploading ? 'Enviando…' : 'Adicionar imagem (ou Ctrl+V)'}
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
          </label>
        )}
      </div>
    </div>
  )
}
