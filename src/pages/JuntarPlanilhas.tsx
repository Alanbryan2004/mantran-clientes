import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  FileStack,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Trash2,
  Info,
  Check,
  ShieldAlert,
  X,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  RefreshCw,
  Loader2
} from 'lucide-react'
import clsx from 'clsx'

export type TipoOperacao = 'lh' | 'lm' | 'fm' | ''

export const OPERACOES: Record<string, { nome: string; peso: number; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  lh: { nome: 'Line Haul', peso: 1, badgeBg: 'bg-blue-50', badgeText: 'text-blue-700', badgeBorder: 'border-blue-200' },
  lm: { nome: 'Last Mile', peso: 1, badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700', badgeBorder: 'border-indigo-200' },
  fm: { nome: 'First Mile', peso: 2, badgeBg: 'bg-purple-50', badgeText: 'text-purple-700', badgeBorder: 'border-purple-200' }
}

const intFmt = new Intl.NumberFormat('pt-BR')

export interface ItemPlanilha {
  id: number
  nomeArquivo: string
  tamanho?: number
  op: TipoOperacao
  auto: boolean
  linhas: number
  colunas: number
  nomeAba: string
  ws?: any
  range?: any
  cab?: number
  dados?: number[]
  aviso?: string
  erro?: string
}

export interface ProgressState {
  currentFile: string
  percent: number
  stageText: string
  stageIndex: number
}

// Helpers de formatação e detecção
const formatBytes = (bytes?: number) => {
  if (bytes == null) return ''
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'
  return Math.max(1, Math.round(bytes / 1024)) + ' KB'
}

const semAcento = (s: any) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

function detectarNoTexto(t: string): TipoOperacao {
  t = semAcento(t).replace(/[_\-.]+/g, ' ')
  if (/line\s*haul|linehaul/.test(t)) return 'lh'
  if (/last\s*mile|lastmile/.test(t)) return 'lm'
  if (/first\s*mile|firstmile/.test(t)) return 'fm'
  if (/(^|\s)lh(\s|$)/.test(t)) return 'lh'
  if (/(^|\s)lm(\s|$)/.test(t)) return 'lm'
  if (/(^|\s)fm(\s|$)/.test(t)) return 'fm'
  return ''
}

function detectarNoConteudo(ws: any, r0: number, r1: number, c1: number): TipoOperacao {
  const cont = { lh: 0, lm: 0, fm: 0 }
  for (let r = r0; r <= Math.min(r1, r0 + 300); r++) {
    for (let c = 0; c <= Math.min(c1, 80); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell && cell.t === 's') {
        const op = detectarNoTexto(cell.v)
        if (op) cont[op]++
      }
    }
  }
  const melhor = Object.entries(cont).sort((a, b) => b[1] - a[1])[0]
  return (melhor && melhor[1] > 0 ? melhor[0] : '') as TipoOperacao
}

function linhaVazia(ws: any, r: number, c0: number, c1: number): boolean {
  for (let c = c0; c <= c1; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })]
    if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
      return false
    }
  }
  return true
}

function copiarCelula(cell: any) {
  const n: any = { t: cell.t, v: cell.v }
  if (cell.z) n.z = cell.z
  if ((cell.v === undefined || cell.v === null) && cell.f) {
    n.f = cell.f
    delete n.v
  }
  if (cell.t === 's' && cell.v === undefined && !n.f) n.v = ''
  return n
}

function rangeReal(ws: any) {
  let r0 = Infinity,
    c0 = Infinity,
    r1 = -1,
    c1 = -1
  for (const k of Object.keys(ws)) {
    if (k[0] === '!') continue
    const { r, c } = XLSX.utils.decode_cell(k)
    if (r < r0) r0 = r
    if (r > r1) r1 = r
    if (c < c0) c0 = c
    if (c > c1) c1 = c
  }
  if (r1 < 0) return null
  return { s: { r: r0, c: c0 }, e: { r: r1, c: c1 } }
}

let seqId = 0

function lerPlanilha(nomeArquivo: string, buffer: ArrayBuffer, fileSize: number): ItemPlanilha {
  const wb = XLSX.read(buffer, { type: 'array', cellNF: true, cellDates: false, cellStyles: false })
  let nomeAba = ''
  let ws: any = null
  let range: any = null

  for (const n of wb.SheetNames) {
    const w = wb.Sheets[n]
    const rg = w ? rangeReal(w) : null
    if (rg) {
      nomeAba = n
      ws = w
      range = rg
      break
    }
  }

  const item: ItemPlanilha = {
    id: ++seqId,
    nomeArquivo,
    tamanho: fileSize,
    op: '',
    auto: false,
    linhas: 0,
    colunas: 0,
    nomeAba: nomeAba || 'Planilha1',
    aviso: '',
    erro: ''
  }

  if (!ws) {
    item.erro = 'Planilha vazia ou sem dados válidos'
    return item
  }

  // Cabeçalho = primeira linha não vazia
  let cab = range.s.r
  while (cab <= range.e.r && linhaVazia(ws, cab, range.s.c, range.e.c)) cab++
  if (cab > range.e.r) {
    item.erro = 'Planilha vazia (não contém cabeçalho)'
    return item
  }

  const dados: number[] = []
  for (let r = cab + 1; r <= range.e.r; r++) {
    if (!linhaVazia(ws, r, range.s.c, range.e.c)) dados.push(r)
  }

  item.ws = ws
  item.range = range
  item.cab = cab
  item.dados = dados
  item.linhas = dados.length
  item.colunas = range.e.c - range.s.c + 1

  if (wb.SheetNames.length > 1) {
    item.aviso = `Usada a aba "${nomeAba}" (o arquivo possui ${wb.SheetNames.length} abas)`
  }

  item.op = detectarNoTexto(nomeArquivo) || detectarNoConteudo(ws, cab, range.e.r, range.e.c)
  item.auto = !!item.op

  return item
}

function ordenarItens(lista: ItemPlanilha[]): ItemPlanilha[] {
  const peso = (it: ItemPlanilha) => (it.erro ? 9 : it.op ? OPERACOES[it.op]?.peso || 3 : 3)
  return [...lista]
    .map((it, i) => ({ it, i }))
    .sort((a, b) => peso(a.it) - peso(b.it) || a.i - b.i)
    .map(x => x.it)
}

function conferir(dados: any, esperado: [string, any][], linhasEsperadas: number, linhasMontadas: number) {
  const wb = XLSX.read(dados, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rg = rangeReal(ws)
  const linhasArquivo = rg ? rg.e.r + 1 : 0
  const problemas: string[] = []

  if (linhasMontadas !== linhasEsperadas || linhasArquivo !== linhasEsperadas) {
    problemas.push(`linhas: esperadas ${linhasEsperadas}, no arquivo ${linhasArquivo}`)
  }

  let diferentes = 0
  let primeira = ''
  for (const [addr, v] of esperado) {
    const c = ws[addr]
    if (!c || c.v !== v) {
      diferentes++
      if (!primeira) primeira = addr
    }
  }

  if (diferentes) {
    problemas.push(`${diferentes} célula(s) divergentes, a primeira em ${primeira}`)
  }

  return {
    ok: problemas.length === 0,
    problemas,
    celulas: esperado.length,
    linhas: linhasEsperadas
  }
}

export function JuntarPlanilhas() {
  const [itens, setItens] = useState<ItemPlanilha[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showTermoModal, setShowTermoModal] = useState(false)
  const [termoChecked, setTermoChecked] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [conferenciaResultado, setConferenciaResultado] = useState<{ ok: boolean; msg: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return
    setIsProcessing(true)
    setConferenciaResultado(null)

    const novosItens: ItemPlanilha[] = []
    const total = files.length

    for (let i = 0; i < total; i++) {
      const f = files[i]
      const frac = (step: number) => ((i + step) / total) * 100

      // Etapa 1
      setProgress({
        currentFile: f.name,
        percent: Math.max(5, Math.round(frac(0.1))),
        stageText: 'Carregando arquivo na memória...',
        stageIndex: 0
      })
      await new Promise(r => setTimeout(r, 40))

      try {
        const buf = await f.arrayBuffer()
        setProgress({
          currentFile: f.name,
          percent: Math.round(frac(0.4)),
          stageText: 'Lendo e descompactando planilha...',
          stageIndex: 0
        })
        await new Promise(r => setTimeout(r, 40))

        const item = lerPlanilha(f.name, buf, f.size)

        setProgress({
          currentFile: f.name,
          percent: Math.round(frac(0.8)),
          stageText: 'Identificando a operação do arquivo...',
          stageIndex: 1
        })
        await new Promise(r => setTimeout(r, 40))

        novosItens.push(item)
      } catch (err: any) {
        novosItens.push({
          id: ++seqId,
          nomeArquivo: f.name,
          tamanho: f.size,
          op: '',
          auto: false,
          linhas: 0,
          colunas: 0,
          nomeAba: '',
          erro: 'Não foi possível ler o arquivo (verifique se é uma planilha válida e sem senha)'
        })
      }
    }

    setProgress({
      currentFile: files[total - 1].name,
      percent: 100,
      stageText: 'Organizando a ordem de montagem...',
      stageIndex: 2
    })
    await new Promise(r => setTimeout(r, 300))

    setItens(prev => ordenarItens([...prev, ...novosItens]))
    setIsProcessing(false)
    setProgress(null)
    showToast(`${files.length} planilha(s) analisada(s).`)
  }

  const validos = itens.filter(i => !i.erro)
  const erros = itens.filter(i => i.erro)
  const pendentes = validos.filter(i => !i.op)
  const temInicio = validos.some(i => i.op === 'lh' || i.op === 'lm')
  const fonteCab = validos.find(i => i.op === 'lh' || i.op === 'lm') || validos[0]
  const totalLinhas = validos.reduce((s, i) => s + i.linhas, 0)
  const pronto = validos.length > 0 && pendentes.length === 0

  const handleMover = (id: number, dir: -1 | 1) => {
    setItens(prev => {
      const idx = prev.findIndex(x => x.id === id)
      const targetIdx = idx + dir
      if (idx < 0 || targetIdx < 0 || targetIdx >= prev.length) return prev
      const copia = [...prev]
      const temp = copia[idx]
      copia[idx] = copia[targetIdx]
      copia[targetIdx] = temp
      return copia
    })
  }

  const handleRemover = (id: number) => {
    setItens(prev => prev.filter(x => x.id !== id))
    showToast('Arquivo removido da lista.')
  }

  const handleMudarOperacao = (id: number, novaOp: TipoOperacao) => {
    setItens(prev =>
      ordenarItens(
        prev.map(it => (it.id === id ? { ...it, op: novaOp, auto: false } : it))
      )
    )
  }

  const handleClearAll = () => {
    if (confirm('Deseja limpar todas as planilhas da lista?')) {
      setItens([])
      setConferenciaResultado(null)
    }
  }

  const nomeArquivoSaida = () => {
    const ops = [...new Set(validos.map(i => i.op).filter(Boolean))].map(
      o => OPERACOES[o]?.nome || o
    )
    return `Planilha unificada - ${ops.join(' + ') || 'Shopee'}.xlsx`
  }

  const executarMontagemEDownload = async () => {
    if (!pronto || !fonteCab) return
    setIsGenerating(true)
    setConferenciaResultado(null)

    await new Promise(r => setTimeout(r, 60))

    try {
      const lista = validos
      const out: Record<string, any> = {}
      let outR = 0
      let maxC = 0
      const esperado: [string, any][] = []

      const copiarLinha = (it: ItemPlanilha, r: number) => {
        const { ws, range } = it
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })]
          const oc = c - range.s.c
          if (cell) {
            const addr = XLSX.utils.encode_cell({ r: outR, c: oc })
            out[addr] = copiarCelula(cell)
            if (cell.v !== undefined && cell.v !== null && cell.v !== '') {
              esperado.push([addr, cell.v])
            }
            if (oc > maxC) maxC = oc
          }
        }
        outR++
      }

      // 1. Cabeçalho da fonte escolhida na linha 0
      copiarLinha(fonteCab, fonteCab.cab!)
      maxC = Math.max(maxC, fonteCab.colunas - 1)

      // 2. Dados de cada planilha na sequência
      lista.forEach(it => {
        if (it.dados) {
          it.dados.forEach(r => copiarLinha(it, r))
        }
      })

      const ref = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(outR - 1, 0), c: maxC }
      })
      out['!ref'] = ref
      if (fonteCab.ws['!cols']) {
        out['!cols'] = fonteCab.ws['!cols'].slice(fonteCab.range.s.c)
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, out, (fonteCab.nomeAba || 'Planilha1').slice(0, 31))
      const dados = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true })
      const linhasEsperadas = 1 + lista.reduce((s, i) => s + (i.dados?.length || 0), 0)

      const conf = conferir(dados, esperado, linhasEsperadas, outR)

      if (!conf.ok) {
        setConferenciaResultado({
          ok: false,
          msg: `Download bloqueado pela conferência automática: ${conf.problemas.join('; ')}. Por favor, confira os arquivos ou entre em contato com o suporte.`
        })
        return
      }

      setConferenciaResultado({
        ok: true,
        msg: `Conferência automática concluída: ${intFmt.format(conf.linhas)} linhas e ${intFmt.format(conf.celulas)} células preenchidas conferidas com sucesso, sem nenhuma perda de dados!`
      })

      const blob = new Blob([dados], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeArquivoSaida()
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      showToast(`Planilha unificada baixada com sucesso!`)
    } catch (err: any) {
      console.error(err)
      setConferenciaResultado({
        ok: false,
        msg: 'Não foi possível gerar a planilha unificada: ' + (err?.message || 'Falha no processamento')
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirmarTermoEBaixar = async () => {
    setShowTermoModal(false)
    await executarMontagemEDownload()
  }

  return (
    <div className="max-w-none w-full min-w-0 bg-slate-50 rounded-2xl p-4 sm:p-6 min-h-full space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho Oficial Mantran */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="h-10 sm:h-11 px-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
            <img src="/Logo_Mantran.png" alt="Mantran" className="h-6 sm:h-7 w-auto object-contain select-none" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Juntar Planilhas
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 flex items-center gap-1">
                Shopee 4PL
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Une as planilhas exportadas por operação num único arquivo para importação no Mantran com conferência célula a célula.
            </p>
          </div>
        </div>

        {/* Badges de Segurança e Ações */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Processamento Seguro <strong className="text-slate-900 font-bold">100% Local</strong>
            </span>
          </div>
          {itens.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Lista
            </button>
          )}
        </div>
      </div>

      {/* Cards de Etapas / Guia Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
            1
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Envie as Planilhas</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Arraste os arquivos de Line Haul, Last Mile e First Mile (.xlsx)
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
            2
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Ordem Automática</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cabeçalho de Line Haul ou Last Mile na 1ª linha e First Mile por último
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
            3
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Download Unificado</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Baixe uma única planilha unificada, conferida célula por célula
            </p>
          </div>
        </div>
      </div>

      {/* Área de Dropzone / Upload */}
      <div
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={e => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const files = Array.from(e.dataTransfer.files)
          handleFiles(files)
        }}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white relative shadow-2xs',
          dragOver ? 'border-orange-500 bg-orange-50/40' : 'border-slate-300 hover:border-orange-400',
          isProcessing && 'pointer-events-none opacity-60'
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".xlsx,.xlsm,.xls,.csv"
          onChange={e => {
            if (e.target.files) handleFiles(Array.from(e.target.files))
            e.target.value = ''
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shadow-xs">
            {isProcessing ? <RefreshCw className="w-8 h-8 animate-spin" /> : <FileStack className="w-8 h-8" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {isProcessing ? 'Processando e analisando planilhas...' : 'Arraste as planilhas exportadas aqui'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              ou selecione no computador (pode enviar múltiplos arquivos de Line Haul, Last Mile e First Mile de uma só vez)
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="mt-2 px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>Escolher Arquivos (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Barra de Progresso Real-time */}
      {progress && (
        <div className="bg-white border-2 border-orange-500 rounded-2xl p-5 shadow-lg shadow-orange-500/10 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  Lendo Planilha:{' '}
                  <span className="font-mono text-orange-600 font-semibold">{progress.currentFile}</span>
                </h4>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span>{progress.stageText}</span>
                </p>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-orange-600 shrink-0">
              {progress.percent}%
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3.5 border border-slate-200 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-semibold text-slate-600 pt-1">
            <div
              className={clsx(
                'flex items-center gap-1.5',
                progress.stageIndex >= 0 ? 'text-orange-600 font-bold' : 'text-slate-400'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 1. Leitura do arquivo
            </div>
            <div
              className={clsx(
                'flex items-center gap-1.5',
                progress.stageIndex >= 1 ? 'text-orange-600 font-bold' : 'text-slate-400'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 2. Identificação da operação
            </div>
            <div
              className={clsx(
                'flex items-center gap-1.5',
                progress.stageIndex >= 2 ? 'text-orange-600 font-bold' : 'text-slate-400'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 3. Ordem de montagem
            </div>
          </div>
        </div>
      )}

      {/* Resultados e Gestão da Montagem */}
      {itens.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              <span>Resultados da Análise ({itens.length} arquivos)</span>
            </h2>

            <button
              type="button"
              onClick={() => setShowTermoModal(true)}
              className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Ver Termo de Responsabilidade</span>
            </button>
          </div>

          {/* Banner de Aviso de Conferência */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-amber-950">Conferência Obrigatória dos Dados</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-wide">
                    Atenção
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Antes de disponibilizar a planilha unificada, confira a quantidade de linhas e as operações apuradas.{' '}
                  <strong>É de inteira responsabilidade do Usuário validar os dados da planilha antes de disponibilizá-la.</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTermoModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <Info className="w-4 h-4 text-amber-600" />
              <span>Conferir Detalhes</span>
            </button>
          </div>

          {/* Card Principal da Planilha Unificada */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            {/* Header do Card */}
            <div
              className={clsx(
                'flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-200',
                pronto ? 'bg-emerald-50/50' : 'bg-rose-50/50'
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    pronto
                      ? 'bg-emerald-100 border border-emerald-200 text-emerald-600'
                      : 'bg-rose-100 border border-rose-200 text-rose-600'
                  )}
                >
                  {pronto ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">Planilha Unificada</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {!validos.length
                      ? 'Nenhum arquivo válido para juntar'
                      : pendentes.length
                      ? `Defina a operação de ${pendentes.length} arquivo(s) pendente(s) para liberar o download`
                      : 'Pronta para download'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                      <strong>{intFmt.format(validos.length)}</strong> {validos.length === 1 ? 'arquivo' : 'arquivos'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                      <strong>{intFmt.format(totalLinhas)}</strong> linhas de dados
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                      <strong>{intFmt.format(totalLinhas + (validos.length ? 1 : 0))}</strong> linhas totais
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearAll}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Limpar tudo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Alertas */}
            {(erros.length > 0 || pendentes.length > 0 || (validos.length > 0 && !temInicio)) && (
              <div className="p-5 space-y-2.5 border-b border-slate-200 bg-slate-50/50">
                {erros.map(e => (
                  <div
                    key={e.id}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5"
                  >
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Erro ao ler o arquivo {e.nomeArquivo}:</strong> {e.erro}. Este arquivo será ignorado na montagem.
                    </div>
                  </div>
                ))}

                {pendentes.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Operação não identificada:</strong> Escolha a operação de {pendentes.length} arquivo(s) na tabela abaixo para liberar o download.
                    </div>
                  </div>
                )}

                {validos.length > 0 && !temInicio && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Sem Line Haul ou Last Mile:</strong> O cabeçalho da planilha será copiado de "{fonteCab?.nomeArquivo}".
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabela de Ordem de Montagem */}
            {validos.length > 0 && (
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Ordem de Montagem</h4>
                  <span className="text-xs text-slate-400">
                    Cabeçalho da 1ª linha vem de: <strong>{fonteCab?.nomeArquivo}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Arquivo</th>
                        <th className="py-2.5 px-4 w-44">Operação</th>
                        <th className="py-2.5 px-4 text-right w-28">Linhas</th>
                        <th className="py-2.5 px-4 text-center w-28">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validos.map((it, idx) => {
                        const bloco = (x: ItemPlanilha) => (x.op === 'fm' ? 'fm' : x.op ? 'ini' : 'pend')
                        const ant = validos[idx - 1]
                        const prox = validos[idx + 1]
                        const podeSubir = ant && !ant.erro && bloco(ant) === bloco(it)
                        const podeDescer = prox && !prox.erro && bloco(prox) === bloco(it)

                        return (
                          <tr
                            key={it.id}
                            className={clsx(
                              'hover:bg-slate-50 transition-colors',
                              it.op === 'fm' ? 'bg-purple-50/30' : ''
                            )}
                          >
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900">{it.nomeArquivo}</span>
                                {it === fonteCab && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                    cabeçalho
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                                {it.tamanho && (
                                  <span className="font-mono">{formatBytes(it.tamanho)}</span>
                                )}
                                {it.auto && <span>• operação identificada automaticamente</span>}
                                {it.aviso && <span>• {it.aviso}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={it.op}
                                onChange={e => handleMudarOperacao(it.id, e.target.value as TipoOperacao)}
                                className={clsx(
                                  'w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none transition-all',
                                  !it.op
                                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                                    : 'border-slate-300 bg-white text-slate-800'
                                )}
                              >
                                <option value="">Escolha...</option>
                                <option value="lh">Line Haul</option>
                                <option value="lm">Last Mile</option>
                                <option value="fm">First Mile</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                              {intFmt.format(it.linhas)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMover(it.id, -1)}
                                  disabled={!podeSubir}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                  title="Subir na ordem"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMover(it.id, 1)}
                                  disabled={!podeDescer}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                  title="Descer na ordem"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemover(it.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Remover arquivo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                        <td colSpan={3} className="py-2.5 px-4 text-right">
                          Total de linhas de dados:
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {intFmt.format(totalLinhas)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O cabeçalho do arquivo marcado vai para a primeira linha. Os cabeçalhos dos demais arquivos são descartados e as linhas de dados são anexadas na ordem acima. First Mile fica sempre no final da planilha.
                </p>

                {/* Mensagem de resultado da conferência */}
                {conferenciaResultado && (
                  <div
                    className={clsx(
                      'p-4 rounded-xl border text-xs flex items-start gap-3',
                      conferenciaResultado.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    )}
                  >
                    {conferenciaResultado.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div className="leading-relaxed">{conferenciaResultado.msg}</div>
                  </div>
                )}

                {/* Botão de Ação: Baixar Planilha Unificada */}
                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!pronto) return
                      setShowTermoModal(true)
                    }}
                    disabled={!pronto || isGenerating}
                    className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Montando e conferindo...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Baixar Planilha Unificada</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rodapé Informativo */}
      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2 pt-2 pb-4">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>
          Os arquivos são processados com total segurança diretamente no seu navegador e não são transmitidos para nenhum servidor externo.
        </span>
      </div>

      {/* MODAL: Termo de Responsabilidade & Conferência Obrigatória */}
      {showTermoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header com Gradiente Laranja */}
            <div className="p-6 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 tracking-wider">
                    Conferência Obrigatória
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold mt-1">Validação da Planilha Unificada</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermoModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Termo */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed space-y-1">
                <h4 className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Valide os dados antes de disponibilizar a planilha!
                </h4>
                <p>
                  A leitura e a junção das planilhas foram concluídas. Para garantir a precisão operacional e financeira do processo, confira atentamente as informações antes de baixar a planilha e importá-la no Mantran.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Pontos fundamentais para você conferir:
                </h5>
                <ol className="space-y-2 list-decimal list-inside bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <li>
                    <strong>Total de Linhas / Registros:</strong> Confira se a quantidade total de linhas da planilha unificada bate exatamente com a soma dos arquivos enviados.
                  </li>
                  <li>
                    <strong>Ordem e Operações:</strong> Confirme se as operações identificadas (Line Haul, Last Mile e First Mile) correspondem às filiais corretas, com o cabeçalho apenas na primeira linha e First Mile por último.
                  </li>
                  <li>
                    <strong>Valores Financeiros:</strong> Certifique-se de que a soma do campo <em>"valor final à receber"</em> coincide com o fechamento acordado.
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <h5 className="font-bold flex items-center gap-1.5 text-rose-950">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Declaração de Responsabilidade
                </h5>
                <p className="text-[11px] leading-relaxed">
                  É de <strong>inteira responsabilidade do Usuário</strong> conferir e validar os dados da planilha antes de disponibilizá-la. O Juntar Planilhas é uma ferramenta de apoio à unificação de arquivos, cabendo ao usuário a verificação e a aprovação dos dados antes de seu uso ou importação.
                </p>
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-300 hover:border-orange-400 bg-slate-50/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={termoChecked}
                  onChange={e => setTermoChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 leading-snug">
                  Estou ciente de que é de minha inteira responsabilidade validar os dados da planilha antes de disponibilizá-la.
                </span>
              </label>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowTermoModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarTermoEBaixar}
                disabled={!termoChecked || isGenerating}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Dados validados, disponibilizar planilha</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
