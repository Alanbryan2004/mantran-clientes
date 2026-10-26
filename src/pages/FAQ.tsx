import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpen, Search, Plus, Pencil, Trash2, X, Save, ChevronRight,
  Image as ImageIcon, GripVertical, Bold, FolderPlus, ArrowLeft,
  FileCode, Upload, CheckCircle2, AlertCircle, Loader2, Sparkles, FileText,
  Share2, Check, Link2
} from 'lucide-react'
import { api, type FaqCategoria, type FaqProcedimento, type FaqPasso } from '../lib/api'
import { getLoggedUser, canEditFaq } from '../lib/auth'
import clsx from 'clsx'

// Renderiza texto do passo permitindo apenas <b>/<strong> (resto escapado).
// Aceita apenas URLs seguras para links (http, https, mailto). Evita javascript:, data:, etc.
function urlSeguraFaq(url: string): string | null {
  const u = (url || '').trim()
  if (!u) return null
  if (/^(https?:\/\/|mailto:)/i.test(u)) return u
  // permite domínio "cru" (ex.: www.mantran.com.br) assumindo https
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(u)) return 'https://' + u
  return null
}

function renderTextoPasso(texto: string): { __html: string } {
  let safe = (texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>')
    .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>')

  // Links: reconverte apenas <a href="URL">texto</a> quando a URL for segura.
  // Após o escape acima, o HTML salvo aparece como &lt;a href="URL"&gt;texto&lt;/a&gt;
  // e as aspas podem estar como &quot; dependendo de como foi digitado.
  safe = safe.replace(
    /&lt;a\s+href=(?:"|&quot;|')(.*?)(?:"|&quot;|')&gt;(.*?)&lt;\/a&gt;/gi,
    (_match, href, label) => {
      const url = urlSeguraFaq(String(href).replace(/&amp;/g, '&'))
      if (!url) return label // URL inválida: mostra só o texto, sem link
      const safeUrl = url.replace(/"/g, '&quot;')
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`
    }
  )

  safe = safe.replace(/\n/g, '<br>')
  return { __html: safe }
}

// Converte data URI (Base64) em Blob para envio ao Supabase Storage
function dataUriToBlob(dataUri: string): { blob: Blob; ext: string } {
  const parts = dataUri.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const ext = mime.split('/')[1] || 'png'
  const byteString = atob(parts[1])
  const ia = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return { blob: new Blob([ia], { type: mime }), ext }
}

// Extrai texto limpo preservando tags <b> / <strong>
function extrairTextoFormatado(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('img, .num, svg, button').forEach(n => n.remove())
  let html = clone.innerHTML || ''
  html = html.replace(/<\/(p|div)>/gi, '<br>')
  html = html.replace(/<strong[^>]*>/gi, '<b>').replace(/<\/strong>/gi, '</b>')
  html = html.replace(/<(?!\/?(?:b|br)\b)[^>]*>/gi, '')
  html = html.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>').trim()
  return html
}

interface StepParsed {
  texto: string
  imagem_url: string | null
  isBase64: boolean
}

interface FaqHtmlParsed {
  titulo: string
  descricao: string
  caminhoMenu: string
  modulo: string
  categoria: string
  passos: StepParsed[]
}

// Analisa HTML (gerado por Claude ou conversores) e extrai metadados e passos
function parseFaqHtml(htmlStr: string): FaqHtmlParsed {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlStr, 'text/html')

  // 1. Título
  let titulo = ''
  const h1 = doc.querySelector('h1')
  if (h1) titulo = h1.textContent?.trim() || ''
  if (!titulo) {
    const titleEl = doc.querySelector('title')
    if (titleEl) titulo = titleEl.textContent?.split('|')[0].trim() || ''
  }

  // 2. Descrição / Subtítulo
  let descricao = ''
  const subEl = doc.querySelector('.subtitle, .meta, .descricao, p.subtitulo')
  if (subEl) descricao = subEl.textContent?.trim() || ''

  // 3. Caminho / Breadcrumb / Módulo / Categoria
  let caminhoMenu = ''
  let modulo = ''
  let categoria = ''
  const crumbs = Array.from(doc.querySelectorAll('.crumbs .crumb, nav.breadcrumb a, nav.breadcrumb span, .breadcrumb-item'))
  if (crumbs.length > 0) {
    const texts = crumbs.map(c => c.textContent?.trim() || '').filter(Boolean)
    caminhoMenu = texts.join(' › ')
    if (texts[0]?.toLowerCase().startsWith('módulo ') || texts[0]?.toLowerCase().startsWith('modulo ')) {
      modulo = texts[0].replace(/^m[oó]dulo\s+/i, '').trim()
      if (texts.length > 1) categoria = texts[1].trim()
    } else {
      categoria = texts[0] || ''
    }
  }

  // 4. Passos
  const passos: StepParsed[] = []
  const stepSections = doc.querySelectorAll('section.step, .step-item')
  if (stepSections.length > 0) {
    stepSections.forEach(section => {
      const instructionEl = section.querySelector('.instruction') || section
      const img = instructionEl.querySelector('img')
      let imgUrl: string | null = null
      let isBase64 = false
      if (img && img.getAttribute('src')) {
        imgUrl = img.getAttribute('src')
        isBase64 = !!imgUrl?.startsWith('data:image/')
        img.remove()
      }
      const numEl = section.querySelector('.num')
      if (numEl) numEl.remove()

      const cleanText = extrairTextoFormatado(instructionEl)
      passos.push({ texto: cleanText, imagem_url: imgUrl, isBase64 })
    })
  } else {
    const lis = doc.querySelectorAll('ol.steps > li, ol > li')
    if (lis.length > 0) {
      lis.forEach(li => {
        const img = li.querySelector('img')
        let imgUrl: string | null = null
        let isBase64 = false
        if (img && img.getAttribute('src')) {
          imgUrl = img.getAttribute('src')
          isBase64 = !!imgUrl?.startsWith('data:image/')
          img.remove()
        }
        const cleanText = extrairTextoFormatado(li)
        passos.push({ texto: cleanText, imagem_url: imgUrl, isBase64 })
      })
    }
  }

  return { titulo, descricao, caminhoMenu, modulo, categoria, passos }
}

function normalizarBusca(txt: string): string {
  return (txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extrairObjetivoDescricao(desc: string | null | undefined): string {
  if (!desc) return ''
  // Descarta seções de checklist de campos (ex: 'Antes de começar' que cita campos aleatórios como endereço, cidade, CEP)
  const partes = desc.split(/antes de come[cç]ar|onde se aplica/i)
  return partes[0] || desc
}

function atendeBusca(p: FaqProcedimento, cat: FaqCategoria, buscaStr: string): boolean {
  const qNorm = normalizarBusca(buscaStr).trim()
  if (!qNorm) return true
  const termos = qNorm.split(/\s+/).filter(Boolean)

  const tNorm = normalizarBusca(p.titulo)
  const mNorm = normalizarBusca(p.caminho_menu || '')
  const cNorm = normalizarBusca(cat.nome)
  const modNorm = normalizarBusca(cat.modulo || '')
  const objNorm = normalizarBusca(extrairObjetivoDescricao(p.descricao))

  return termos.every(termo => {
    // Permite singular/plural simples (ex: 'cidades' -> 'cidade')
    const base = termo.length > 3 && termo.endsWith('s') ? termo.slice(0, -1) : termo
    // Garante casamento no início da palavra (evita 'cidade' casar dentro de 'duplicidade')
    const regex = new RegExp('(^|[^a-z0-9])' + base, 'i')
    return regex.test(tNorm) || regex.test(mNorm) || regex.test(cNorm) || regex.test(modNorm) || regex.test(objNorm)
  })
}

export function FAQ() {
  const user = getLoggedUser()
  const podeEditar = canEditFaq()
  const [searchParams, setSearchParams] = useSearchParams()

  const [categorias, setCategorias] = useState<FaqCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [procSelecionadoId, setProcSelecionadoId] = useState<string | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  const [imgZoom, setImgZoom] = useState<string | null>(null)
  const [modalCategoria, setModalCategoria] = useState<FaqCategoria | 'novo' | null>(null)
  const [modalProc, setModalProc] = useState<FaqProcedimento | { novo: true; categoria_id: string; dadosImportados?: any } | null>(null)
  const [modalImportar, setModalImportar] = useState(false)

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

  // Sincroniza o procedimento selecionado a partir da URL (?p=ID ou ?manual=slug/titulo)
  useEffect(() => {
    const param = searchParams.get('p') || searchParams.get('id') || searchParams.get('manual')
    if (param && todosProcs.length > 0) {
      const pNorm = normalizarBusca(param)
      const encontrado = todosProcs.find(p => 
        p.id === param || 
        normalizarBusca(p.titulo) === pNorm ||
        normalizarBusca(p.titulo).replace(/[^a-z0-9]+/g, '-') === pNorm
      )
      if (encontrado && procSelecionadoId !== encontrado.id) {
        setProcSelecionadoId(encontrado.id)
      }
    }
  }, [todosProcs, searchParams])

  const selecionarProcedimento = (id: string | null) => {
    setProcSelecionadoId(id)
    if (id) {
      setSearchParams({ p: id }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const handleCopiarLink = async () => {
    if (!procSelecionado) return
    const url = `${window.location.origin}/faq?p=${encodeURIComponent(procSelecionado.id)}`
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2500)
    } catch (err) {
      console.error('Falha ao copiar link:', err)
    }
  }

  const modulosExistentes = useMemo(() => {
    const set = new Set<string>()
    categorias.forEach(c => { if (c.modulo && c.modulo.trim()) set.add(c.modulo.trim()) })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categorias])

  const categoriasFiltradas = useMemo(() => {
    if (!busca.trim()) return categorias
    return categorias
      .map(c => ({
        ...c,
        procedimentos: (c.procedimentos || []).filter(p => atendeBusca(p, c, busca))
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
      if (procSelecionadoId === p.id) selecionarProcedimento(null)
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalImportar(true)}
              className="shrink-0 py-2 px-3 sm:px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 hover:border-brand-300 shadow-sm transition-colors cursor-pointer"
              title="Importar manual ou tutorial em HTML com imagens"
            >
              <FileCode className="w-4 h-4 text-brand-600" /> <span className="hidden sm:inline">Importar HTML</span>
            </button>
            <button
              onClick={() => setModalCategoria('novo')}
              className="shrink-0 py-2 px-3 sm:px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 shadow-sm transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" /> <span className="hidden sm:inline">Nova Seção</span>
            </button>
          </div>
        )}
      </div>

      {erro && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{erro}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* SIDEBAR */}
        <aside className={clsx(
          "bg-white border border-slate-200 rounded-2xl shadow-sm p-3 h-fit lg:sticky lg:top-4",
          procSelecionado && "hidden lg:block"
        )}>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar procedimento…"
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
                              onClick={() => selecionarProcedimento(proc.id)}
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
        <main className={clsx(
          "bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-7 min-h-[60vh] relative overflow-hidden flex flex-col justify-between",
          !procSelecionado && "hidden lg:flex"
        )}>
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
                <button onClick={() => selecionarProcedimento(null)} className="lg:hidden flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3">
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopiarLink}
                      className={clsx(
                        "py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs",
                        linkCopiado
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                          : "bg-white border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 hover:bg-slate-50"
                      )}
                      title="Copiar link direto para este manual"
                    >
                      {linkCopiado ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Link copiado!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copiar link</span>
                        </>
                      )}
                    </button>
                    {podeEditar && (
                      <>
                        <button onClick={() => setModalProc(procSelecionado)} className="py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 shadow-sm transition-colors cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button onClick={() => handleExcluirProc(procSelecionado)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Excluir procedimento">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
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
                            <div className="text-sm text-slate-700 leading-relaxed [&_b]:text-slate-900 [&_b]:font-bold [&_a]:text-brand-600 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-700" dangerouslySetInnerHTML={renderTextoPasso(passo.texto)} />
                          )}
                          {passo.imagem_url && (
                            <img src={passo.imagem_url} alt={`Passo ${idx + 1}`} onClick={() => setImgZoom(passo.imagem_url!)} className="mt-3 block w-auto h-auto max-w-full sm:max-w-xl max-h-80 object-contain object-left rounded-lg border border-slate-200 cursor-zoom-in hover:border-brand-400 transition-colors shadow-sm" />
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
          dadosImportados={'dadosImportados' in modalProc ? (modalProc as any).dadosImportados : undefined}
          onClose={() => setModalProc(null)}
          onSaved={async (procId) => { setModalProc(null); await carregar(); if (procId) selecionarProcedimento(procId) }}
        />
      )}

      {modalImportar && (
        <ImportarHtmlModal
          categorias={categorias}
          modulosExistentes={modulosExistentes}
          usuario={user}
          onClose={() => setModalImportar(false)}
          onCarregarNoEditor={(dados) => {
            setModalImportar(false)
            const catExiste = categorias.find(c =>
              c.nome.toLowerCase() === (dados.categoria || '').toLowerCase() &&
              (!dados.modulo || (c.modulo || '').toLowerCase() === dados.modulo.toLowerCase())
            )
            setModalProc({
              novo: true,
              categoria_id: catExiste ? catExiste.id : '',
              dadosImportados: dados
            })
          }}
          onSalvoDireto={async (novoProcId) => {
            setModalImportar(false)
            await carregar()
            if (novoProcId) selecionarProcedimento(novoProcId)
          }}
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

function ProcedimentoModal({ proc, categoriaIdInicial, categorias, usuario, dadosImportados, onClose, onSaved }: {
  proc: FaqProcedimento | null
  categoriaIdInicial: string
  categorias: FaqCategoria[]
  usuario: any
  dadosImportados?: any
  onClose: () => void
  onSaved: (procId?: string) => void
}) {
  const [categoriaId, setCategoriaId] = useState(() => {
    if (proc) return proc.categoria_id
    if (dadosImportados?.categoria) {
      const encontrada = categorias.find(c =>
        c.nome.toLowerCase() === dadosImportados.categoria.toLowerCase() &&
        (!dadosImportados.modulo || (c.modulo || '').toLowerCase() === dadosImportados.modulo.toLowerCase())
      )
      if (encontrada) return encontrada.id
    }
    return categoriaIdInicial
  })
  // Criação de seção inline (quando escolhe "+ Nova seção" no dropdown)
  const [criandoSecao, setCriandoSecao] = useState(() => {
    if (proc) return false
    if (dadosImportados?.categoria) {
      const encontrada = categorias.find(c =>
        c.nome.toLowerCase() === dadosImportados.categoria.toLowerCase() &&
        (!dadosImportados.modulo || (c.modulo || '').toLowerCase() === dadosImportados.modulo.toLowerCase())
      )
      return !encontrada
    }
    return false
  })
  const [novaSecaoNome, setNovaSecaoNome] = useState(dadosImportados?.categoria || '')
  const [novaSecaoModulo, setNovaSecaoModulo] = useState(dadosImportados?.modulo || '')
  const [titulo, setTitulo] = useState(dadosImportados?.titulo || proc?.titulo || '')
  const [descricao, setDescricao] = useState(dadosImportados?.descricao || proc?.descricao || '')
  const [caminhoMenu, setCaminhoMenu] = useState(dadosImportados?.caminhoMenu || proc?.caminho_menu || '')
  const [passos, setPassos] = useState<PassoEdit[]>(() => {
    if (dadosImportados?.passos?.length) {
      return dadosImportados.passos.map((p: any) => ({
        texto: p.texto || '',
        imagem_url: p.imagem_url || null,
        _localId: Math.random().toString(36).slice(2)
      }))
    }
    return (proc?.passos || []).map((p: FaqPasso) => ({
      texto: p.texto || '',
      imagem_url: p.imagem_url || null,
      _localId: Math.random().toString(36).slice(2)
    }))
  })
  const [salvando, setSalvando] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [modalImportarInterno, setModalImportarInterno] = useState(false)

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
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-slate-800">{proc ? 'Editar Procedimento' : 'Novo Procedimento'}</h3>
            <button
              type="button"
              onClick={() => setModalImportarInterno(true)}
              className="py-1 px-2.5 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 transition-colors"
              title="Preencher campos a partir de um arquivo HTML"
            >
              <FileCode className="w-3.5 h-3.5 text-brand-600" /> Importar HTML
            </button>
          </div>
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

      {modalImportarInterno && (
        <ImportarHtmlModal
          categorias={categorias}
          modulosExistentes={modulosExistentes}
          usuario={usuario}
          onClose={() => setModalImportarInterno(false)}
          onCarregarNoEditor={(dados) => {
            setModalImportarInterno(false)
            if (dados.titulo) setTitulo(dados.titulo)
            if (dados.descricao) setDescricao(dados.descricao)
            if (dados.caminhoMenu) setCaminhoMenu(dados.caminhoMenu)
            if (dados.categoria) {
              const encontrada = categorias.find(c =>
                c.nome.toLowerCase() === dados.categoria.toLowerCase() &&
                (!dados.modulo || (c.modulo || '').toLowerCase() === dados.modulo.toLowerCase())
              )
              if (encontrada) {
                setCategoriaId(encontrada.id)
                setCriandoSecao(false)
              } else {
                setCriandoSecao(true)
                setNovaSecaoNome(dados.categoria)
                setNovaSecaoModulo(dados.modulo || '')
              }
            }
            if (dados.passos?.length) {
              setPassos(dados.passos.map((p: any) => ({
                texto: p.texto || '',
                imagem_url: p.imagem_url || null,
                _localId: Math.random().toString(36).slice(2)
              })))
            }
          }}
          onSalvoDireto={(novoProcId) => {
            setModalImportarInterno(false)
            onSaved(novoProcId)
          }}
        />
      )}
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

  // Popover de inserção de link
  const [linkAberto, setLinkAberto] = useState(false)
  const [linkTexto, setLinkTexto] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const selRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 })

  const aplicarNegrito = () => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const val = passo.texto || ''
    const sel = val.slice(start, end) || 'texto'
    onTexto(val.slice(0, start) + `<b>${sel}</b>` + val.slice(end))
  }

  const abrirLink = () => {
    const ta = taRef.current
    const start = ta ? ta.selectionStart : (passo.texto || '').length
    const end = ta ? ta.selectionEnd : start
    selRef.current = { start, end }
    const sel = (passo.texto || '').slice(start, end)
    setLinkTexto(sel) // usa a seleção atual como texto do link, se houver
    setLinkUrl('')
    setLinkAberto(true)
  }

  const confirmarLink = () => {
    const texto = (linkTexto || '').trim() || (linkUrl || '').trim()
    const urlRaw = (linkUrl || '').trim()
    if (!urlRaw || !texto) return
    // normaliza: adiciona https:// se vier só o domínio
    const url = /^(https?:\/\/|mailto:)/i.test(urlRaw) ? urlRaw : `https://${urlRaw}`
    const { start, end } = selRef.current
    const val = passo.texto || ''
    const tag = `<a href="${url}">${texto}</a>`
    onTexto(val.slice(0, start) + tag + val.slice(end))
    setLinkAberto(false)
    setLinkTexto(''); setLinkUrl('')
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
          <button onClick={abrirLink} className="p-1 text-slate-500 hover:text-brand-600" title="Inserir link"><Link2 className="w-3.5 h-3.5" /></button>
          <button onClick={onRemover} className="p-1 text-slate-500 hover:text-red-500" title="Remover passo"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {linkAberto && (
        <div className="mb-2 p-3 rounded-lg bg-white border border-brand-200 shadow-sm space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700">
            <Link2 className="w-3.5 h-3.5" /> Inserir link
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Texto que aparecerá</label>
            <input
              value={linkTexto}
              onChange={e => setLinkTexto(e.target.value)}
              placeholder="Ex: portal da SEFAZ"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmarLink() } }}
              className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Endereço (URL)</label>
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="Ex: www.sefaz.gov.br ou https://..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmarLink() } }}
              className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-0.5">
            <button onClick={() => { setLinkAberto(false); setLinkTexto(''); setLinkUrl('') }} className="py-1 px-2.5 text-[11px] font-bold rounded-md bg-white border border-slate-300 text-slate-600 hover:border-slate-400">Cancelar</button>
            <button onClick={confirmarLink} disabled={!linkUrl.trim() || !(linkTexto.trim() || linkUrl.trim())} className="py-1 px-2.5 text-[11px] font-bold rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40">Inserir</button>
          </div>
        </div>
      )}

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

// ============================================================
// MODAL: Importador Inteligente de HTML
// ============================================================
function ImportarHtmlModal({ categorias, modulosExistentes, usuario, onClose, onCarregarNoEditor, onSalvoDireto }: {
  categorias: FaqCategoria[]
  modulosExistentes: string[]
  usuario: any
  onClose: () => void
  onCarregarNoEditor: (dados: FaqHtmlParsed) => void
  onSalvoDireto: (novoProcId?: string) => void
}) {
  const [aba, setAba] = useState<'arquivo' | 'colar'>('arquivo')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [htmlTexto, setHtmlTexto] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dados, setDados] = useState<FaqHtmlParsed | null>(null)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const [statusProgresso, setStatusProgresso] = useState<string | null>(null)
  const [progressoPorcentagem, setProgressoPorcentagem] = useState(0)

  // Faz o parse do HTML
  const processarTexto = (raw: string) => {
    setErro('')
    if (!raw.trim()) {
      setDados(null)
      return
    }
    try {
      const parsed = parseFaqHtml(raw)
      if (!parsed.titulo && parsed.passos.length === 0) {
        setErro('Não foi possível identificar o título nem os passos no HTML fornecido. Verifique o formato.')
        setDados(null)
      } else {
        setDados(parsed)
      }
    } catch (e: any) {
      setErro('Erro ao processar HTML: ' + (e?.message || e))
      setDados(null)
    }
  }

  const handleFile = async (f: File) => {
    if (!f.name.match(/\.(html|htm)$/i)) {
      setErro('Por favor selecione um arquivo .html ou .htm')
      return
    }
    setArquivo(f)
    try {
      const t = await f.text()
      setHtmlTexto(t)
      processarTexto(t)
    } catch (e: any) {
      setErro('Erro ao ler arquivo: ' + (e?.message || e))
    }
  }

  // Faz upload das imagens em Base64 para o Supabase Storage
  const uploadImagensBase64 = async (passosList: StepParsed[]): Promise<{ texto: string; imagem_url: string | null }[]> => {
    const totalImgs = passosList.filter(p => p.isBase64 && p.imagem_url).length
    if (totalImgs === 0) {
      return passosList.map(p => ({ texto: p.texto, imagem_url: p.imagem_url }))
    }

    let cont = 0
    const resultados: { texto: string; imagem_url: string | null }[] = []

    for (let i = 0; i < passosList.length; i++) {
      const p = passosList[i]
      if (p.isBase64 && p.imagem_url) {
        cont++
        setStatusProgresso(`Enviando print ${cont} de ${totalImgs} para o Supabase Storage…`)
        setProgressoPorcentagem(Math.round((cont / totalImgs) * 100))
        try {
          const { blob, ext } = dataUriToBlob(p.imagem_url)
          const url = await api.uploadFaqImagem(blob, `passo_${i + 1}.${ext}`)
          resultados.push({ texto: p.texto, imagem_url: url })
        } catch (e: any) {
          console.error('Erro no upload de imagem:', e)
          resultados.push({ texto: p.texto, imagem_url: null })
        }
      } else {
        resultados.push({ texto: p.texto, imagem_url: p.imagem_url })
      }
    }
    return resultados
  }

  // 1. Carregar no Editor
  const handleCarregarNoEditor = async () => {
    if (!dados || !dados.titulo) {
      alert('Informe o título do procedimento.')
      return
    }
    setProcessando(true)
    try {
      const passosComUrls = await uploadImagensBase64(dados.passos)
      onCarregarNoEditor({
        ...dados,
        passos: passosComUrls.map(p => ({ texto: p.texto, imagem_url: p.imagem_url, isBase64: false }))
      })
    } catch (e: any) {
      alert('Erro ao processar imagens: ' + (e?.message || e))
    } finally {
      setProcessando(false)
      setStatusProgresso(null)
    }
  }

  // 2. Importar e Salvar Direto
  const handleSalvarDireto = async () => {
    if (!dados || !dados.titulo) {
      alert('Informe o título do procedimento.')
      return
    }
    setProcessando(true)
    try {
      // 1. Upload de imagens
      const passosComUrls = await uploadImagensBase64(dados.passos)

      // 2. Resolver ou criar categoria
      setStatusProgresso('Verificando seção no banco…')
      let catId = ''
      const existente = categorias.find(c =>
        c.nome.toLowerCase() === (dados.categoria || '').trim().toLowerCase() &&
        (!dados.modulo || (c.modulo || '').toLowerCase() === dados.modulo.trim().toLowerCase())
      )

      if (existente) {
        catId = existente.id
      } else {
        const novaCat = await api.createFaqCategoria({
          nome: dados.categoria.trim() || 'Geral',
          modulo: dados.modulo.trim() || null,
          ordem: categorias.length + 1
        })
        catId = novaCat.id
      }

      // 3. Criar procedimento
      setStatusProgresso('Criando procedimento…')
      const novoProc = await api.createFaqProcedimento({
        categoria_id: catId,
        titulo: dados.titulo.trim(),
        descricao: dados.descricao || null,
        caminho_menu: dados.caminhoMenu || null,
        criado_por_id: usuario?.id || null,
        criado_por_nome: usuario?.nome || usuario?.login || null
      })

      // 4. Salvar passos
      setStatusProgresso('Gravando os passos…')
      await api.salvarFaqPassos(novoProc.id, passosComUrls)

      onSalvoDireto(novoProc.id)
    } catch (e: any) {
      alert('Erro ao salvar direto: ' + (e?.message || e))
    } finally {
      setProcessando(false)
      setStatusProgresso(null)
    }
  }

  const base64Count = useMemo(
    () => (dados?.passos || []).filter(p => p.isBase64).length,
    [dados]
  )

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-gradient-to-r from-brand-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Importar Procedimento via HTML</h3>
              <p className="text-xs text-slate-500">Importe arquivos HTML prontos (com prints em Base64) diretamente para a biblioteca do FAQ.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={processando} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-clean">
          {/* Seletor de modo: Arquivo ou Colar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setAba('arquivo')}
              className={clsx(
                'py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                aba === 'arquivo'
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Upload className="w-3.5 h-3.5" /> Enviar Arquivo .HTML
            </button>
            <button
              type="button"
              onClick={() => setAba('colar')}
              className={clsx(
                'py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                aba === 'colar'
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <FileText className="w-3.5 h-3.5" /> Colar Código HTML
            </button>
          </div>

          {/* Área de Entrada */}
          {aba === 'arquivo' ? (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setIsDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) handleFile(f)
              }}
              className={clsx(
                'border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer',
                isDragging
                  ? 'border-brand-500 bg-brand-50/70 scale-[0.99]'
                  : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-brand-400'
              )}
              onClick={() => {
                const el = document.getElementById('faq-file-input')
                el?.click()
              }}
            >
              <input
                id="faq-file-input"
                type="file"
                accept=".html,.htm"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-brand-600 shadow-sm">
                <FileCode className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {arquivo ? arquivo.name : 'Arraste o arquivo .html aqui ou clique para selecionar'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {arquivo ? `${(arquivo.size / (1024 * 1024)).toFixed(2)} MB — Arquivo carregado` : 'Exemplo: Alteracao_Devedor_Fatura_MANTRAN.html'}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Cole o código HTML completo aqui:</label>
              <textarea
                value={htmlTexto}
                onChange={e => {
                  setHtmlTexto(e.target.value)
                  processarTexto(e.target.value)
                }}
                rows={5}
                placeholder="Cole o <html> completo gerado pelo Claude ou exportado…"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono focus:border-brand-500 focus:outline-none resize-y"
              />
            </div>
          )}

          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Barra de Progresso quando estiver enviando imagens */}
          {processando && statusProgresso && (
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-brand-800">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  {statusProgresso}
                </span>
                <span>{progressoPorcentagem}%</span>
              </div>
              <div className="w-full bg-brand-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressoPorcentagem}%` }}
                />
              </div>
            </div>
          )}

          {/* Pré-visualização dos dados extraídos */}
          {dados && (
            <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">Estrutura Reconhecida com Sucesso</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold border border-slate-200">
                    {dados.passos.length} passos
                  </span>
                  {base64Count > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {base64Count} prints embutidos
                    </span>
                  )}
                </div>
              </div>

              {/* Campos ajustáveis antes de importar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Título detectado</label>
                  <input
                    value={dados.titulo}
                    onChange={e => setDados(prev => prev ? { ...prev, titulo: e.target.value } : null)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Descrição</label>
                  <input
                    value={dados.descricao}
                    onChange={e => setDados(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                    placeholder="Descrição do procedimento"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Módulo</label>
                  <input
                    value={dados.modulo}
                    onChange={e => setDados(prev => prev ? { ...prev, modulo: e.target.value } : null)}
                    list="faq-modulos-import-list"
                    placeholder="Ex: Shopee, Operação"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                  <datalist id="faq-modulos-import-list">
                    {modulosExistentes.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Seção (Categoria)</label>
                  <input
                    value={dados.categoria}
                    onChange={e => setDados(prev => prev ? { ...prev, categoria: e.target.value } : null)}
                    placeholder="Ex: Faturamento, Cadastros"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Caminho (Menu Breadcrumb)</label>
                  <input
                    value={dados.caminhoMenu}
                    onChange={e => setDados(prev => prev ? { ...prev, caminhoMenu: e.target.value } : null)}
                    placeholder="Ex: Módulo Shopee › Faturamento"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Lista dos passos detectados */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">Passos detectados ({dados.passos.length}):</label>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-clean">
                  {dados.passos.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-slate-700 [&_b]:text-slate-900 [&_b]:font-bold leading-relaxed line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: p.texto }}
                        />
                      </div>
                      {p.imagem_url && (
                        <div className="shrink-0">
                          <img
                            src={p.imagem_url}
                            alt=""
                            className="h-10 w-16 object-cover rounded-md border border-slate-300 shadow-2xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botões de ação */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={processando}
            className="w-full sm:w-auto py-2 px-4 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 disabled:opacity-40"
          >
            Cancelar
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleCarregarNoEditor}
              disabled={!dados || processando}
              className="flex-1 sm:flex-initial py-2 px-4 text-xs font-bold rounded-lg bg-white border border-brand-300 text-brand-700 hover:bg-brand-50 shadow-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Revisar no Editor
            </button>

            <button
              type="button"
              onClick={handleSalvarDireto}
              disabled={!dados || processando}
              className="flex-1 sm:flex-initial py-2 px-4 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {processando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Importar e Salvar Direto
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
