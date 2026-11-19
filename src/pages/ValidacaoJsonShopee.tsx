import { useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, AlertCircle, ArrowLeft, Upload,
  ClipboardPaste, FileText, Trash2, Sparkles, RefreshCw, Server,
  Building2, Hash, Layers, ShieldCheck, Check, X as XIcon, ChevronDown, ChevronRight,
  Code2
} from 'lucide-react'
import clsx from 'clsx'

const URL_API_PADRAO = 'http://18.231.33.156:35397'

// Extrai e separa o formato JWT decodificado: {"account":...}.{"data":...}
function extrairHeaderEPayload(str: string): { headerObj: any; payloadObj: any; headerStr: string; payloadStr: string } | null {
  const trimmed = str.trim()
  if (!trimmed.startsWith('{')) return null

  let depth = 0
  let inString = false
  let escape = false
  let headerEnd = -1

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        headerEnd = i
        break
      }
    }
  }

  if (headerEnd === -1) return null
  const resto = trimmed.slice(headerEnd + 1).trim()
  if (!resto.startsWith('.')) return null

  const aposPonto = resto.slice(1).trim()
  if (!aposPonto.startsWith('{')) return null

  depth = 0
  inString = false
  escape = false
  let payloadEnd = -1

  for (let j = 0; j < aposPonto.length; j++) {
    const ch = aposPonto[j]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        payloadEnd = j
        break
      }
    }
  }

  if (payloadEnd === -1) return null

  const headerStr = trimmed.slice(0, headerEnd + 1)
  const payloadStr = aposPonto.slice(0, payloadEnd + 1)

  try {
    const headerObj = JSON.parse(headerStr)
    const payloadObj = JSON.parse(payloadStr)
    return { headerObj, payloadObj, headerStr, payloadStr }
  } catch {
    return null
  }
}

function toBase64UrlBrowser(obj: any): string {
  const jsonStr = typeof obj === 'string' ? obj : JSON.stringify(obj)
  const b64 = window.btoa(unescape(encodeURIComponent(jsonStr)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

interface RespostaValidacao {
  baseEncontrada: boolean
  nomeBaseDados?: string | null
  mensagem?: string | null
  basesCandidatas?: string[]
  aviso?: string | null
  dados?: {
    dataType?: number
    numeroViagem?: string | number
    qtdPedidos?: number
    placa?: string
    motorista?: string
    nomeOrigem?: string
    nomeDestino?: string
    cnpjDestino?: string
    agencyId?: string | number
    account?: string
  }
  resultado?: {
    decidido: boolean
    cdFilial?: string | number
    regra?: 'CNPJ_DESTINO' | 'NOME_ORIGEM' | string
    cdEmpresa?: string | number
    tpOperacao?: string | number
    descricaoOperacao?: string
    motivo?: string
    avisoExplicacao?: string
    passos?: Array<{
      grupo: 'CNPJ' | 'TABELA' | 'ORIGEM'
      etapa: string
      quantidade?: number
      decisivo?: boolean
      detalhe?: string
      candidatas?: string[]
    }>
    operacoes?: Array<{
      descricao: string
      cdFilial: string
      confereTipo: boolean
      confereXpt: boolean
      confereUf: boolean
      confereCidade: boolean
      confereCnpj?: boolean
      escolhida?: boolean
    }>
  }
}

export function ValidacaoJsonShopee() {
  const [modoEntrada, setModoEntrada] = useState<'arquivo' | 'texto'>('arquivo')
  const [apiUrl, setApiUrl] = useState(URL_API_PADRAO)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [textoJson, setTextoJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<RespostaValidacao | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [tabelaExpandida, setTabelaExpandida] = useState(false)
  const [detalhesCandidatasAbertos, setDetalhesCandidatasAbertos] = useState<Record<string, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const limparTudo = () => {
    setArquivo(null)
    setTextoJson('')
    setErro(null)
    setResultado(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (file: File | null) => {
    if (!file) return
    if (!/\.(txt|json)$/i.test(file.name)) {
      setErro('Por favor, selecione um arquivo no formato .txt ou .json.')
      return
    }
    setArquivo(file)
    setErro(null)
    setResultado(null)
  }

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      if (clipText) {
        setTextoJson(clipText)
        setErro(null)
      }
    } catch {
      setErro('Não foi possível ler da área de transferência. Cole usando Ctrl+V.')
    }
  }

  const handleBeautifyJson = () => {
    if (!textoJson.trim()) return

    // Se estiver no formato {header}.{payload} (ex.: {"account":"..."}.{"data":...})
    const extraido = extrairHeaderEPayload(textoJson.trim())
    if (extraido) {
      const hStr = JSON.stringify(extraido.headerObj)
      const pStr = JSON.stringify(extraido.payloadObj, null, 2)
      setTextoJson(`${hStr}.\n${pStr}`)
      setErro(null)
      return
    }

    try {
      const parsed = JSON.parse(textoJson.trim())
      setTextoJson(JSON.stringify(parsed, null, 2))
      setErro(null)
    } catch {
      setErro('O texto não é um JSON válido para formatação.')
    }
  }

  const headerJwtDetectado = useMemo(() => {
    if (!textoJson.trim()) return null
    return extrairHeaderEPayload(textoJson.trim())
  }, [textoJson])

  const executarConsulta = async () => {
    setErro(null)
    setResultado(null)

    let corpoEnvio = ''
    if (modoEntrada === 'arquivo') {
      if (!arquivo) {
        setErro('Selecione um arquivo .txt ou .json para validar.')
        return
      }
      try {
        corpoEnvio = await arquivo.text()
      } catch {
        setErro('Não foi possível ler o arquivo selecionado.')
        return
      }
    } else {
      if (!textoJson.trim()) {
        setErro('Cole o texto ou JSON da requisição no campo abaixo.')
        return
      }
      corpoEnvio = textoJson.trim()
    }

    const urlAlvo = apiUrl.trim().replace(/\/+$/, '')
    if (!urlAlvo) {
      setErro('Informe a URL da API da Shopee.')
      return
    }

    // Normaliza caso venha com cabeçalho JWT decodificado no formato {header}.{payload}
    let envioProcessado = corpoEnvio.trim()
    const extraido = extrairHeaderEPayload(envioProcessado)
    if (extraido) {
      const jwt = `${toBase64UrlBrowser(extraido.headerObj)}.${toBase64UrlBrowser(extraido.payloadObj)}.sig`
      envioProcessado = JSON.stringify({ jwt })
    }

    setLoading(true)

    try {
      // 1ª tentativa: via rota serverless /api/validacao-shopee (elimina Mixed Content e CORS)
      let data: RespostaValidacao | null = null
      let proxyFalhou = false

      try {
        const proxyRes = await fetch('/api/validacao-shopee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiUrl: urlAlvo, payload: envioProcessado })
        })
        const proxyJson = await proxyRes.json().catch(() => null)
        if (proxyRes.ok && proxyJson) {
          data = proxyJson
        } else if (proxyRes.status === 404 || proxyRes.status === 502) {
          // Rota local do dev server pode não ter o /api montado
          proxyFalhou = true
        } else {
          throw new Error(proxyJson?.erro || `Erro na API (HTTP ${proxyRes.status})`)
        }
      } catch (proxyErr: any) {
        if (!proxyFalhou) throw proxyErr
      }

      // Fallback: se o proxy local não responder, tenta requisição direta
      if (!data) {
        const directRes = await fetch(`${urlAlvo}/ValidacaoJsonShopee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: envioProcessado
        })
        if (directRes.status === 404) {
          throw new Error('A API respondeu 404: o endpoint /ValidacaoJsonShopee ainda não foi publicado nesta API.')
        }
        if (directRes.status === 413) {
          throw new Error('O conteúdo é grande demais (limite de 2 MB).')
        }
        const directJson = await directRes.json().catch(() => null)
        if (!directRes.ok || !directJson) {
          throw new Error((directJson && (directJson.message || directJson.title)) || `Falha na consulta (HTTP ${directRes.status}).`)
        }
        data = directJson
      }

      setResultado(data)
    } catch (err: any) {
      console.error('Erro na validação Shopee:', err)
      setErro(
        err.message ||
        `Não consegui comunicar com a API em ${urlAlvo}. Verifique se o endereço está correto e se o serviço está ativo.`
      )
    } finally {
      setLoading(false)
    }
  }

  const toggleDetalheCandidatas = (id: string) => {
    setDetalhesCandidatasAbertos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Helpers para apresentação do resultado
  const d = resultado?.dados
  const res = resultado?.resultado
  const passos = res?.passos || []
  const passoCnpj = passos.find(p => p.grupo === 'CNPJ')
  const passoTabela = passos.find(p => p.grupo === 'TABELA')
  const passosOrigem = passos.filter(p => p.grupo === 'ORIGEM')
  const leituraOrigem = passosOrigem.find(p => p.quantidade == null)
  const filtrosOrigem = passosOrigem.filter(p => p.quantidade != null)
  const origemNecessaria = !(passoCnpj && passoCnpj.decisivo)
  const sucessoFilial = !!res?.decidido

  const formatTipo = (type?: number) => {
    if (type === 2) return '2 - Line Haul'
    if (type === 3) return '3 - Last Mile'
    return type ? `${type} - Não suportado` : '—'
  }

  const qtdTexto = (qtd?: number) => {
    const q = qtd || 0
    if (q === 0) return 'ignorado'
    if (q === 1) return '1 operação'
    return `${q} operações`
  }

  return (
    <div className="max-w-none w-full min-w-0 bg-slate-50 rounded-2xl p-4 sm:p-6 min-h-full text-slate-800">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            to="/utilitarios"
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 shadow-xs transition-colors shrink-0"
            title="Voltar para Utilitários"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Validação API Shopee
              </h1>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Suporte
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Simulação de importação da Shopee: identifica em tempo real a base e a filial/operação sem gravar nenhum dado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={limparTudo}
            className="py-2 px-3.5 flex items-center gap-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            Limpar
          </button>
        </div>
      </div>

      {/* Alerta de erro */}
      {erro && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{erro}</div>
          <button
            type="button"
            onClick={() => setErro(null)}
            className="text-red-400 hover:text-red-600 p-0.5 rounded"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Card principal de Entrada */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
        {/* Seletor de Modo: Arquivo ou Colar Texto */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit mb-5 border border-slate-200/80">
          <button
            type="button"
            onClick={() => { setModoEntrada('arquivo'); setErro(null) }}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              modoEntrada === 'arquivo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Upload className="w-3.5 h-3.5 text-brand-600" />
            Selecionar Arquivo (.txt / .json)
          </button>
          <button
            type="button"
            onClick={() => { setModoEntrada('texto'); setErro(null) }}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              modoEntrada === 'texto'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <FileText className="w-3.5 h-3.5 text-brand-600" />
            Colar Texto / JSON
          </button>
        </div>

        {/* Conteúdo do modo Arquivo */}
        {modoEntrada === 'arquivo' && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Arquivo da requisição (.txt ou .json)
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0])
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2',
                dragOver
                  ? 'border-brand-500 bg-brand-50/50'
                  : arquivo
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-brand-400 bg-slate-50/60'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,text/plain,application/json"
                className="hidden"
                onChange={e => handleFileChange(e.target.files?.[0] || null)}
              />
              {arquivo ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{arquivo.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatarTamanho(arquivo.size)} • Clique para trocar de arquivo</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Clique para selecionar ou arraste o arquivo aqui</p>
                    <p className="text-xs text-slate-500 mt-0.5">Formatos aceitos: arquivos .txt ou .json (corpo da requisição Shopee, JWT ou viagem)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo do modo Colar Texto */}
        {modoEntrada === 'texto' && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Conteúdo do JSON ou texto da requisição
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" /> Colar
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleBeautifyJson}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  title="Formata o JSON mantendo a estrutura"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Formatar JSON
                </button>
              </div>
            </div>

            {/* Aviso quando detecta prefixo de cabeçalho JWT no texto */}
            {headerJwtDetectado && (
              <div className="mb-2.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold flex items-center gap-1 text-purple-700">
                    <Code2 className="w-3.5 h-3.5" /> Cabeçalho JWT detectado:
                  </span>
                  <code className="bg-white px-2 py-0.5 rounded border border-purple-200 font-mono text-[11px] font-bold text-purple-800">
                    account: "{headerJwtDetectado.headerObj.account || '—'}"
                  </code>
                  <span className="text-[11px] text-purple-600 hidden md:inline">
                    (tratado automaticamente, não quebra a validação)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTextoJson(JSON.stringify(headerJwtDetectado.payloadObj, null, 2))
                    setErro(null)
                  }}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  title="Remove o prefixo do cabeçalho e mantém apenas o objeto da viagem formatado"
                >
                  Remover cabeçalho e deixar só a viagem
                </button>
              </div>
            )}

            <textarea
              value={textoJson}
              onChange={e => setTextoJson(e.target.value)}
              placeholder='Cole aqui o JSON da requisição (ex.: {"account":"..."}.{"data":...} ou {"data": { ... }})'
              rows={8}
              className="w-full font-mono text-xs p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 scrollbar-clean resize-y"
            />
            {textoJson && (
              <p className="text-[11px] text-slate-400 mt-1">
                Tamanho aproximado: {formatarTamanho(new Blob([textoJson]).size)} ({textoJson.length} caracteres)
              </p>
            )}
          </div>
        )}

        {/* URL da API e Botão de Ação */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end pt-2 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-500" /> URL da API da Shopee
              </label>
              {apiUrl !== URL_API_PADRAO && (
                <button
                  type="button"
                  onClick={() => setApiUrl(URL_API_PADRAO)}
                  className="text-[11px] text-brand-600 hover:underline cursor-pointer"
                >
                  Restaurar padrão
                </button>
              )}
            </div>
            <input
              type="url"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 font-mono"
            />
          </div>

          <button
            type="button"
            onClick={executarConsulta}
            disabled={loading || (modoEntrada === 'arquivo' && !arquivo) || (modoEntrada === 'texto' && !textoJson.trim())}
            className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer h-10"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Consultando API…</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Validar JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Seção 1: Dados lidos do JSON */}
      {d && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600" /> Dados Extraídos do JSON
            </h2>
            <span className="text-xs text-slate-400">Leitura direta do corpo enviado</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Tipo (data_type)</span>
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                {formatTipo(d.dataType)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Viagem</span>
              <span className="text-sm font-semibold text-slate-800">{d.numeroViagem || '—'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Qtd. de Pedidos</span>
              <span className="text-sm font-semibold text-slate-800">{d.qtdPedidos ?? '—'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Placa</span>
              <span className="text-sm font-semibold text-slate-800">{d.placa || '—'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Origem</span>
              <span className="text-sm font-semibold text-slate-800 truncate block" title={d.nomeOrigem || ''}>
                {d.nomeOrigem || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Destino</span>
              <span className="text-sm font-semibold text-slate-800 truncate block" title={d.nomeDestino || ''}>
                {d.nomeDestino || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">CNPJ do Destino</span>
              <span className="text-sm font-mono text-slate-800">{d.cnpjDestino || '—'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">agency_id</span>
              <span className="text-sm font-mono text-slate-800">{d.agencyId || '—'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="block text-[11px] font-bold text-slate-500 mb-0.5">account (header do token)</span>
              <span className="text-sm font-mono text-slate-800 truncate block" title={d.account || ''}>
                {d.account || '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Seção 2: Resultado da Validação */}
      {resultado && (
        <div className="space-y-4">
          {/* Banner da Base */}
          <div
            className={clsx(
              'border rounded-2xl p-5 shadow-sm transition-all',
              resultado.baseEncontrada
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            )}
          >
            <div className="flex items-center gap-3 mb-1">
              <div
                className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  resultado.baseEncontrada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                )}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {resultado.baseEncontrada
                    ? `Base Identificada: ${resultado.nomeBaseDados}`
                    : 'Base Não Encontrada'}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">{resultado.mensagem}</p>
              </div>
            </div>

            {!resultado.baseEncontrada && resultado.basesCandidatas && resultado.basesCandidatas.length > 1 && (
              <div className="mt-3 pt-3 border-t border-amber-200 text-xs">
                <span className="font-bold">Bases possíveis cadastradas: </span>
                <span>{resultado.basesCandidatas.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Aviso opcional retornado pela API */}
          {resultado.aviso && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{resultado.aviso}</span>
            </div>
          )}

          {/* Banner de Operação / Filial */}
          {res && (
            <div
              className={clsx(
                'border rounded-2xl p-5 sm:p-6 shadow-sm transition-all',
                sucessoFilial
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              )}
            >
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <h3 className="text-xl font-black tracking-tight">
                  {sucessoFilial ? `Filial ${res.cdFilial}` : 'Operação não identificada'}
                </h3>
                {sucessoFilial && (
                  <>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-800 shadow-2xs">
                      {res.regra === 'CNPJ_DESTINO' ? 'Decidido pelo CNPJ do destino' : 'Decidido pelo nome da origem'}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-800 shadow-2xs">
                      Empresa {res.cdEmpresa} • Operação {res.tpOperacao}
                    </span>
                  </>
                )}
              </div>

              {sucessoFilial && res.descricaoOperacao && (
                <p className="text-sm font-semibold mb-1 text-emerald-900">{res.descricaoOperacao}</p>
              )}
              {res.motivo && <p className="text-xs opacity-90 leading-relaxed">{res.motivo}</p>}

              {/* Breadcrumb visual do funil de decisão */}
              {(() => {
                const itensCaminho: Array<{ rotulo: string; valor: string; decisivo: boolean; ignorado: boolean }> = []
                if (passoCnpj) {
                  const q = passoCnpj.quantidade || 0
                  itensCaminho.push({
                    rotulo: passoCnpj.etapa,
                    valor: passoCnpj.decisivo ? 'achou 1' : q === 0 ? 'não achou' : `${q} achadas, não decide`,
                    decisivo: !!passoCnpj.decisivo,
                    ignorado: false
                  })
                }
                if (origemNecessaria) {
                  filtrosOrigem.forEach(f => {
                    const q = f.quantidade || 0
                    itensCaminho.push({
                      rotulo: f.etapa,
                      valor: qtdTexto(f.quantidade),
                      decisivo: !!f.decisivo,
                      ignorado: q === 0
                    })
                  })
                }

                if (!itensCaminho.length) return null

                return (
                  <div className="mt-4 pt-4 border-t border-emerald-200/60 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-600 mr-1">Caminho da decisão:</span>
                    {itensCaminho.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        {idx > 0 && <span className="text-slate-400 font-bold">→</span>}
                        <span
                          className={clsx(
                            'px-2.5 py-1 rounded-lg border text-xs font-medium',
                            it.decisivo
                              ? 'bg-emerald-200/70 border-emerald-300 text-emerald-950 font-bold'
                              : it.ignorado
                                ? 'bg-slate-100 border-slate-300 text-slate-400 line-through'
                                : 'bg-white border-slate-200 text-slate-700'
                          )}
                        >
                          {it.rotulo}: {it.valor}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Aviso de explicação adicional se houver */}
          {res?.avisoExplicacao && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{res.avisoExplicacao}</span>
            </div>
          )}

          {/* Card: Como chegamos nesse resultado */}
          {res && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-600" /> Como Chegamos Nesse Resultado
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                O sistema tenta primeiro pelo CNPJ do destino. Se ele não decidir de forma única, utiliza o nome da origem para filtrar e descartar operações até sobrar uma.
              </p>

              <div className="space-y-4">
                {/* Etapa 1: CNPJ do destino */}
                {passoCnpj && (
                  <div
                    className={clsx(
                      'p-4 rounded-xl border transition-all',
                      passoCnpj.decisivo
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center">
                          1
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">CNPJ do destino</h4>
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-bold px-2 py-0.5 rounded border',
                          passoCnpj.decisivo
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        )}
                      >
                        {passoCnpj.decisivo ? 'Decidiu' : 'Não decidiu'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{passoCnpj.detalhe}</p>

                    {passoCnpj.candidatas && passoCnpj.candidatas.length > 0 && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => toggleDetalheCandidatas('cnpj')}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                        >
                          {detalhesCandidatasAbertos['cnpj'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {detalhesCandidatasAbertos['cnpj'] ? 'Recolher operações' : `Ver as ${passoCnpj.candidatas.length} operações`}
                        </button>
                        {detalhesCandidatasAbertos['cnpj'] && (
                          <ul className="mt-2 pl-4 list-disc text-xs text-slate-600 space-y-0.5">
                            {passoCnpj.candidatas.map((cand, i) => (
                              <li key={i}>{cand}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Etapa 2: Nome da origem */}
                <div
                  className={clsx(
                    'p-4 rounded-xl border transition-all',
                    !origemNecessaria
                      ? 'bg-slate-50 border-slate-200 opacity-75'
                      : sucessoFilial
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-amber-50/60 border-amber-200'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center">
                        {passoCnpj ? 2 : 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">Nome da origem</h4>
                    </div>
                    <span
                      className={clsx(
                        'text-[10px] font-bold px-2 py-0.5 rounded border',
                        !origemNecessaria
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : sucessoFilial
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                      )}
                    >
                      {!origemNecessaria ? 'Não foi necessária' : sucessoFilial ? 'Decidiu' : 'Não decidiu'}
                    </span>
                  </div>

                  {!origemNecessaria ? (
                    <p className="text-xs text-slate-500">
                      O CNPJ do destino já decidiu a filial de forma única, portanto o nome da origem não precisou ser utilizado.
                    </p>
                  ) : (
                    <div>
                      {leituraOrigem && (
                        <p className="text-xs text-slate-700 mb-2 leading-relaxed">{leituraOrigem.detalhe}</p>
                      )}

                      {filtrosOrigem.length > 0 && (
                        <div className="mt-3 pl-3 border-l-2 border-slate-200 space-y-2.5">
                          {filtrosOrigem.map((f, i) => (
                            <div
                              key={i}
                              className={clsx(
                                'p-2.5 rounded-lg border text-xs',
                                f.decisivo
                                  ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700'
                              )}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold">{f.etapa}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                  {qtdTexto(f.quantidade)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">{f.detalhe}</p>

                              {f.candidatas && f.candidatas.length > 0 && (
                                <div className="mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleDetalheCandidatas(`filtro-${i}`)}
                                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    {detalhesCandidatasAbertos[`filtro-${i}`] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    {detalhesCandidatasAbertos[`filtro-${i}`] ? 'Recolher' : `Ver ${f.candidatas.length} candidatas`}
                                  </button>
                                  {detalhesCandidatasAbertos[`filtro-${i}`] && (
                                    <ul className="mt-1.5 pl-3 list-disc text-[11px] text-slate-600 space-y-0.5">
                                      {f.candidatas.map((c, idx) => (
                                        <li key={idx}>{c}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Operações Cadastradas (recolhível) */}
          {res?.operacoes && res.operacoes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <button
                type="button"
                onClick={() => setTabelaExpandida(v => !v)}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-brand-600" /> Operações Cadastradas ({res.operacoes.length}) e Testes Isolados
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Os testes mostram o atendimento individual de cada regra; a rotina oficial da Shopee pondera as prioridades.
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0">
                  {tabelaExpandida ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              {tabelaExpandida && (
                <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3 font-bold">Operação</th>
                        <th className="py-2.5 px-3 font-bold text-center">Filial</th>
                        <th className="py-2.5 px-3 font-bold text-center">Tipo</th>
                        <th className="py-2.5 px-3 font-bold text-center">XPT = Origem</th>
                        <th className="py-2.5 px-3 font-bold text-center">Cita Estado</th>
                        <th className="py-2.5 px-3 font-bold text-center">Cita Cidade</th>
                        <th className="py-2.5 px-3 font-bold text-center">CNPJ Destino</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {res.operacoes.map((o, idx) => (
                        <tr
                          key={idx}
                          className={clsx(
                            'transition-colors',
                            o.escolhida
                              ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-l-emerald-500'
                              : 'hover:bg-slate-50/70 text-slate-700'
                          )}
                        >
                          <td className="py-2.5 px-3 font-medium">
                            {o.descricao}
                            {o.escolhida && (
                              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                                ← Escolhida
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold">{o.cdFilial}</td>
                          <td className="py-2.5 px-3 text-center">
                            {o.confereTipo ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {o.confereXpt ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {o.confereUf ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {o.confereCidade ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {o.confereCnpj ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Caso não haja operações detalhadas, mas haja contagem de tabela */}
          {!res?.operacoes?.length && passoTabela && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 text-xs text-slate-600">
              <span className="font-bold">Total de operações cadastradas avaliadas: </span>
              <span>{passoTabela.quantidade}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

