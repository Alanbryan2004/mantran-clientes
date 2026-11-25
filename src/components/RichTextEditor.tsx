import React, { useRef, useEffect, useState, useCallback } from 'react'
import clsx from 'clsx'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Heading1,
  Heading2,
  Quote,
  Code,
  RemoveFormatting,
  Undo2,
  Redo2,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  CornerDownLeft
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  onPaste?: (e: React.ClipboardEvent) => void
}

interface ToolButton {
  cmd: string
  arg?: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  block?: boolean
}

const TOOLS: (ToolButton | 'sep')[] = [
  { cmd: 'bold', icon: Bold, title: 'Negrito (Ctrl+B)' },
  { cmd: 'italic', icon: Italic, title: 'Itálico (Ctrl+I)' },
  { cmd: 'underline', icon: Underline, title: 'Sublinhado (Ctrl+U)' },
  { cmd: 'strikeThrough', icon: Strikethrough, title: 'Tachado' },
  'sep',
  { cmd: 'formatBlock', arg: 'H1', icon: Heading1, title: 'Título 1', block: true },
  { cmd: 'formatBlock', arg: 'H2', icon: Heading2, title: 'Título 2', block: true },
  { cmd: 'formatBlock', arg: 'BLOCKQUOTE', icon: Quote, title: 'Citação', block: true },
  { cmd: 'formatBlock', arg: 'PRE', icon: Code, title: 'Código', block: true },
  'sep',
  { cmd: 'insertUnorderedList', icon: List, title: 'Lista com marcadores' },
  { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Lista numerada' },
  'sep',
  { cmd: 'createLink', icon: Link2, title: 'Inserir link' },
  { cmd: 'removeFormat', icon: RemoveFormatting, title: 'Limpar formatação' },
  'sep',
  { cmd: 'undo', icon: Undo2, title: 'Desfazer' },
  { cmd: 'redo', icon: Redo2, title: 'Refazer' }
]

/** Redimensiona e otimiza imagens para e-mail (leve e nítido) */
function otimizarImagem(file: File, maxDim = 1000, qualidade = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result || ''))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(mime, qualidade))
      }
      img.onerror = () => resolve(String(reader.result || ''))
      img.src = String(reader.result || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160, onPaste }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const [empty, setEmpty] = useState(!value)
  const [dragOver, setDragOver] = useState(false)

  // Modal de imagem
  const [modalImagemAberto, setModalImagemAberto] = useState(false)
  const [modalTab, setModalTab] = useState<'upload' | 'url'>('upload')
  const [imagemSrc, setImagemSrc] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [imagemAlinhamento, setImagemAlinhamento] = useState<'esquerda' | 'centro' | 'direita' | 'full'>('esquerda')
  const [imagemLargura, setImagemLargura] = useState<'160' | '240' | '360' | '100%' | 'custom'>('240')
  const [larguraCustomizada, setLarguraCustomizada] = useState('250')
  const [bordaArredondada, setBordaArredondada] = useState(true)
  const [carregandoImagem, setCarregandoImagem] = useState(false)

  const savedRangeRef = useRef<Range | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sincroniza o value externo com o conteúdo do editor
  useEffect(() => {
    const el = editorRef.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || ''
      setEmpty(!el.textContent?.trim() && !el.querySelector('img'))
    }
  }, [value])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    setEmpty(!el.textContent?.trim() && !el.querySelector('img'))
    onChange(html === '<br>' ? '' : html)
  }, [onChange])

  // Salva a seleção atual antes de focar em botões/inputs do modal
  const salvarSelecao = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
        return
      }
    }
    savedRangeRef.current = null
  }

  const exec = (tool: ToolButton) => {
    editorRef.current?.focus()
    if (tool.cmd === 'createLink') {
      const url = window.prompt('Informe a URL do link:', 'https://')
      if (url) document.execCommand('createLink', false, url)
    } else if (tool.block) {
      document.execCommand('formatBlock', false, tool.arg)
    } else {
      document.execCommand(tool.cmd, false, tool.arg)
    }
    emit()
  }

  // Inserir quebra limpa (clear: both) para pular para baixo de imagens flutuantes
  const inserirQuebraLimpa = () => {
    salvarSelecao()
    inserirHtmlNoCursor('<p style="clear: both; margin: 12px 0;"><br></p>')
  }

  const abrirModalImagem = () => {
    salvarSelecao()
    setModalImagemAberto(true)
    setImagemSrc('')
    setUrlInput('')
  }

  const fecharModalImagem = () => {
    setModalImagemAberto(false)
    setImagemSrc('')
    setUrlInput('')
    setCarregandoImagem(false)
  }

  const processarArquivoImagem = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setCarregandoImagem(true)
    try {
      const dataUrl = await otimizarImagem(file, 1100, 0.88)
      setImagemSrc(dataUrl)
    } catch (err) {
      console.error('Erro ao processar imagem:', err)
      alert('Não foi possível processar a imagem selecionada.')
    } finally {
      setCarregandoImagem(false)
    }
  }

  const inserirHtmlNoCursor = (htmlParaInserir: string) => {
    const el = editorRef.current
    if (!el) return
    el.focus()

    const sel = window.getSelection()
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }

    let inserido = false
    try {
      inserido = document.execCommand('insertHTML', false, htmlParaInserir)
    } catch {
      inserido = false
    }

    if (!inserido) {
      // Fallback manual no cursor ou no final
      const div = document.createElement('div')
      div.innerHTML = htmlParaInserir
      const frag = document.createDocumentFragment()
      while (div.firstChild) {
        frag.appendChild(div.firstChild)
      }

      if (savedRangeRef.current) {
        savedRangeRef.current.deleteContents()
        savedRangeRef.current.insertNode(frag)
      } else {
        el.appendChild(frag)
      }
    }
    emit()
  }

  const confirmarInserirImagem = () => {
    const src = modalTab === 'upload' ? imagemSrc : urlInput.trim()
    if (!src) {
      alert('Por favor, selecione ou informe a URL de uma imagem.')
      return
    }

    // Calcula largura e raio de borda
    const largura = imagemLargura === 'custom' ? `${larguraCustomizada || '250'}px` : imagemLargura === '100%' ? '100%' : `${imagemLargura}px`
    const borderRadius = bordaArredondada ? '8px' : '0px'

    let htmlImg = ''
    if (imagemAlinhamento === 'esquerda') {
      // Float esquerdo com texto contornando à direita (estilo MaIA / Imagem 2)
      htmlImg = `<img src="${src}" alt="" style="float: left; margin: 4px 20px 14px 0; max-width: ${largura}; width: 100%; height: auto; border-radius: ${borderRadius}; display: inline-block;" />`
    } else if (imagemAlinhamento === 'direita') {
      // Float direito com texto contornando à esquerda
      htmlImg = `<img src="${src}" alt="" style="float: right; margin: 4px 0 14px 20px; max-width: ${largura}; width: 100%; height: auto; border-radius: ${borderRadius}; display: inline-block;" />`
    } else if (imagemAlinhamento === 'centro') {
      // Imagem centralizada em bloco
      htmlImg = `<div style="text-align: center; margin: 16px 0;"><img src="${src}" alt="" style="display: inline-block; max-width: ${largura}; width: auto; height: auto; border-radius: ${borderRadius}; margin: 0 auto;" /></div><p><br></p>`
    } else {
      // Largura total (banner)
      htmlImg = `<div style="text-align: center; margin: 16px 0;"><img src="${src}" alt="" style="display: block; width: 100%; max-width: 100%; height: auto; border-radius: ${borderRadius}; margin: 0 auto;" /></div><p><br></p>`
    }

    inserirHtmlNoCursor(htmlImg)
    fecharModalImagem()
  }

  // Intercepta Paste no editor para colar imagens direto da área de transferência
  const handleInternalPaste = async (e: React.ClipboardEvent) => {
    if (onPaste) {
      onPaste(e)
      if (e.defaultPrevented) return
    }

    const items = Array.from(e.clipboardData?.items || [])
    const imageItem = items.find(it => it.type.startsWith('image/'))
    if (imageItem) {
      const file = imageItem.getAsFile()
      if (file) {
        e.preventDefault()
        salvarSelecao()
        const dataUrl = await otimizarImagem(file, 900, 0.88)
        const html = `<img src="${dataUrl}" alt="" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: inline-block;" />`
        inserirHtmlNoCursor(html)
      }
    }
  }

  // Intercepta Drop no editor
  const handleInternalDrop = async (e: React.DragEvent) => {
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files || [])
    const imgFile = files.find(f => f.type.startsWith('image/'))
    if (imgFile) {
      e.preventDefault()
      salvarSelecao()
      const dataUrl = await otimizarImagem(imgFile, 900, 0.88)
      const html = `<img src="${dataUrl}" alt="" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: inline-block;" />`
      inserirHtmlNoCursor(html)
    }
  }

  const imagemPreviewAtual = modalTab === 'upload' ? imagemSrc : urlInput.trim()

  return (
    <div
      className={clsx(
        'rounded-lg border bg-white transition-colors relative',
        focused ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-slate-300',
        dragOver && 'ring-2 ring-brand-500 bg-brand-50/20'
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50/80 rounded-t-lg">
        {TOOLS.map((tool, i) =>
          tool === 'sep' ? (
            <span key={`sep-${i}`} className="w-px h-5 bg-slate-200 mx-1" />
          ) : (
            <button
              key={tool.cmd + (tool.arg || '')}
              type="button"
              title={tool.title}
              onMouseDown={e => e.preventDefault()}
              onClick={() => exec(tool)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-brand-600 hover:shadow-xs transition-all"
            >
              <tool.icon className="w-4 h-4" />
            </button>
          )
        )}

        <span className="w-px h-5 bg-slate-200 mx-1" />

        {/* Botão de Inserir Imagem */}
        <button
          type="button"
          title="Inserir imagem no corpo (Upload ou Link)"
          onMouseDown={e => {
            e.preventDefault()
            salvarSelecao()
          }}
          onClick={abrirModalImagem}
          className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border border-amber-200 text-xs font-semibold transition-all shadow-xs"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Imagem</span>
        </button>

        {/* Botão de Quebra de Imagem (Clear Floats) */}
        <button
          type="button"
          title="Inserir linha abaixo de imagem com texto ao lado"
          onMouseDown={e => {
            e.preventDefault()
            salvarSelecao()
          }}
          onClick={inserirQuebraLimpa}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-brand-600 transition-colors"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Área editável */}
      <div className="relative">
        {empty && !focused && (
          <div className="absolute top-3 left-3 text-sm text-slate-400 pointer-events-none select-none">
            {placeholder || 'Escreva aqui... Você também pode colar prints ou imagens com Ctrl+V'}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => {
            setFocused(false)
            salvarSelecao()
          }}
          onFocus={() => setFocused(true)}
          onPaste={handleInternalPaste}
          onDragOver={e => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleInternalDrop}
          className="rte-content px-3 py-3 text-sm text-slate-700 focus:outline-none overflow-y-auto scrollbar-clean"
          style={{ minHeight }}
        />
      </div>

      {/* Modal de Inserção de Imagem */}
      {modalImagemAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Inserir Imagem no E-mail</h3>
                  <p className="text-[11px] text-slate-500">Adicione fotos, logos ou mascotes no corpo da mensagem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharModalImagem}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="p-5 space-y-4 overflow-y-auto scrollbar-clean flex-1">
              {/* Abas */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setModalTab('upload')}
                  className={clsx(
                    'flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
                    modalTab === 'upload' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Upload className="w-3.5 h-3.5" /> Enviar do Computador
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('url')}
                  className={clsx(
                    'flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
                    modalTab === 'url' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Link da Web (URL)
                </button>
              </div>

              {/* Aba Upload */}
              {modalTab === 'upload' && (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      if (e.dataTransfer.files?.[0]) processarArquivoImagem(e.dataTransfer.files[0])
                    }}
                    className={clsx(
                      'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2',
                      imagemSrc ? 'border-brand-400 bg-brand-50/20' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) processarArquivoImagem(e.target.files[0])
                      }}
                    />
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">
                        {imagemSrc ? 'Trocar imagem selecionada' : 'Clique ou arraste uma imagem aqui'}
                      </span>
                      <span className="text-[11px] text-slate-400">PNG, JPG, GIF ou WebP (otimizada automaticamente)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Aba URL */}
              {modalTab === 'url' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Endereço da Imagem (URL)</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/imagem.png ou /Logo_Mantran.png"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-brand-500 text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Caminhos locais como /Logo_Mantran.png são transformados no link público completo automaticamente.</p>
                </div>
              )}

              {/* Pré-visualização da Imagem */}
              {imagemPreviewAtual && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Pré-visualização
                  </span>
                  <div className="max-h-48 overflow-auto flex items-center justify-center bg-white rounded-lg p-2 border border-slate-200">
                    <img
                      src={imagemPreviewAtual}
                      alt="Prévia"
                      className="max-h-44 object-contain rounded-md"
                      onError={() => {
                        if (modalTab === 'url') alert('Não foi possível carregar a imagem da URL fornecida.')
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Alinhamento da Imagem */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Posição no E-mail</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setImagemAlinhamento('esquerda')}
                    className={clsx(
                      'p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all',
                      imagemAlinhamento === 'esquerda'
                        ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-semibold ring-1 ring-brand-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <AlignLeft className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">À esquerda</div>
                      <div className="text-[11px] text-slate-500">Texto contorna ao lado direito (igual exemplo MaIA)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImagemAlinhamento('centro')}
                    className={clsx(
                      'p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all',
                      imagemAlinhamento === 'centro'
                        ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-semibold ring-1 ring-brand-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <AlignCenter className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Centralizada</div>
                      <div className="text-[11px] text-slate-500">Em linha própria, no centro do e-mail</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImagemAlinhamento('direita')}
                    className={clsx(
                      'p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all',
                      imagemAlinhamento === 'direita'
                        ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-semibold ring-1 ring-brand-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <AlignRight className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">À direita</div>
                      <div className="text-[11px] text-slate-500">Texto contorna ao lado esquerdo</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImagemAlinhamento('full')}
                    className={clsx(
                      'p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all',
                      imagemAlinhamento === 'full'
                        ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-semibold ring-1 ring-brand-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <Maximize2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Largura total</div>
                      <div className="text-[11px] text-slate-500">Banner esticado ocupando toda a largura</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tamanho da Imagem */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tamanho da Imagem</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: '160', label: 'Pequena (160px)' },
                    { id: '240', label: 'Média (240px) ★' },
                    { id: '360', label: 'Grande (360px)' },
                    { id: '100%', label: '100%' },
                    { id: 'custom', label: 'Customizada' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setImagemLargura(opt.id as any)}
                      className={clsx(
                        'px-2.5 py-1 rounded-md text-xs font-semibold border transition-all',
                        imagemLargura === opt.id
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {imagemLargura === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      value={larguraCustomizada}
                      onChange={e => setLarguraCustomizada(e.target.value)}
                      min="50"
                      max="600"
                      className="w-24 px-2 py-1 border border-slate-300 rounded-md text-xs text-slate-800"
                    />
                    <span className="text-xs text-slate-500">pixels de largura</span>
                  </div>
                )}
              </div>

              {/* Borda arredondada */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={bordaArredondada}
                  onChange={e => setBordaArredondada(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-700">Cantos suaves arredondados (design moderno)</span>
              </label>
            </div>

            {/* Rodapé com botões */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={fecharModalImagem}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!imagemPreviewAtual || carregandoImagem}
                onClick={confirmarInserirImagem}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs',
                  !imagemPreviewAtual || carregandoImagem
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-700'
                )}
              >
                {carregandoImagem ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Inserir Imagem</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
