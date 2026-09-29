import { useRef, useEffect, useState, useCallback } from 'react'
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
  Redo2
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

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160, onPaste }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const [empty, setEmpty] = useState(!value)

  // Sincroniza o value externo com o conteúdo do editor (sem sobrescrever enquanto digita)
  useEffect(() => {
    const el = editorRef.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || ''
      setEmpty(!el.textContent?.trim())
    }
  }, [value])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    setEmpty(!el.textContent?.trim())
    onChange(html === '<br>' ? '' : html)
  }, [onChange])

  const exec = (tool: ToolButton) => {
    editorRef.current?.focus()
    if (tool.cmd === 'createLink') {
      const url = window.prompt('Informe a URL do link:', 'https://')
      if (url) document.execCommand('createLink', false, url)
    } else if (tool.block) {
      // toggle: se já estiver no bloco, volta pra parágrafo
      document.execCommand('formatBlock', false, tool.arg)
    } else {
      document.execCommand(tool.cmd, false, tool.arg)
    }
    emit()
  }

  return (
    <div
      className={clsx(
        'rounded-lg border bg-white transition-colors',
        focused ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-slate-300'
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200">
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
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition-colors"
            >
              <tool.icon className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Área editável */}
      <div className="relative">
        {empty && !focused && (
          <div className="absolute top-3 left-3 text-sm text-slate-400 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          onPaste={onPaste}
          className="rte-content px-3 py-3 text-sm text-slate-700 focus:outline-none overflow-y-auto scrollbar-clean"
          style={{ minHeight }}
        />
      </div>
    </div>
  )
}
