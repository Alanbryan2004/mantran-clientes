import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  FileArchive, 
  FileText,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Info,
  Check
} from 'lucide-react'
import clsx from 'clsx'

// 53 colunas oficiais esperadas na planilha de Pré-Fatura da Shopee
export const CABECALHO_ESPERADO = [
  "tipo do serviço", "operação", "soc", "hub", "rota", "período(ano_mês_quinzena)",
  "3pl tracking number / número etiqueta / ordem (shopee)",
  "3pl tracking number (enviado por api pela transportadora)",
  "data da prestação do serviço", "nome tomador do serviço", "cnpj tomador",
  "nome transportadora (3pl)", "cnpj emitente (3pl)", "cep origem", "cidade origem",
  "uf origem", "cep entrega", "cidade entrega", "uf entrega", "dados do seller",
  "data da entrega", "quantidade volume", "peso real", "peso cubado",
  "peso calculado/cobrado", "km rodado", "tipo do veículo",
  "fator agrupador (p/ cobrança por veiculo)", "placa", "valor nota fiscal mercadoria",
  "tarifa aplicada", "frete/tarifa base (peso/km/veículo)", "frete calculado", "adv",
  "gris", "aliquota icms/iss", "base calc icms/iss", "valor icms/iss", "icms subst",
  "outros valores", "descontos", "valor final à receber", "data emissão cte/nf",
  "fatura", "número cte", "número nf", "serie cte/ nf", "chave de acesso cte",
  "motivo rejeição cte", "prefeitura nfse", "comentários", "payment orders", "nome motorista"
]

const COLUNA_OPERACAO = "operação"
const COLUNA_VALOR = "valor final à receber"

const norm = (v: any) => String(v ?? "").replace(/\u00a0/g, " ").normalize("NFC").trim().toLowerCase()
const ESPERADO_NORM = CABECALHO_ESPERADO.map(norm)
const IDX_OP = ESPERADO_NORM.indexOf(norm(COLUNA_OPERACAO))
const IDX_VALOR = ESPERADO_NORM.indexOf(norm(COLUNA_VALOR))
const N = ESPERADO_NORM.length

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const intFmt = new Intl.NumberFormat("pt-BR")
const colName = (i: number) => XLSX.utils.encode_col(i)

const LINHAS_BUSCA = 15
const MIN_RECONHECIDAS = Math.ceil(N / 3)

export interface DiagItem {
  col: string
  nome: string
  esperado?: string
}

export interface DiagResult {
  faltando: DiagItem[]
  extras: DiagItem[]
  repetidas: DiagItem[]
  foraPosicao: DiagItem[]
}

export interface AbaValidacao {
  nome: string
  ok: boolean
  motivo?: string
  linhaCab?: number
  linhaTxt?: string
  range?: any
  diag?: DiagResult
}

export interface GrupoOperacao {
  op: string
  linhas: number[]
  total: number
  filename: string
  build: () => Uint8Array | ArrayBuffer
}

export interface ResultadoProcessamento {
  id: string
  nomeArquivo: string
  tamanhoFormatado: string
  abas: AbaValidacao[]
  abaUsada?: string
  avisos: string[]
  grupos: GrupoOperacao[]
  totalLinhas: number
  erro: string | null
}

function validarCabecalho(ws: any): { ok: boolean; motivo?: string; linhaCab?: number; linhaTxt?: string; range?: any; diag?: DiagResult } {
  if (!ws || !ws["!ref"]) return { ok: false, motivo: "Aba vazia ou sem dados" }
  const range = XLSX.utils.decode_range(ws["!ref"])
  const ultimaCol = Math.max(range.e.c, N - 1)

  const lerLinha = (r: number) => {
    const v: string[] = []
    for (let c = 0; c <= ultimaCol; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      v.push(cell ? norm(cell.v) : "")
    }
    return v
  }

  const esperadoSet = new Set(ESPERADO_NORM)

  let melhor: { r: number; lido: string[]; score: number } | null = null
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + LINHAS_BUSCA - 1); r++) {
    const lido = lerLinha(r)
    const score = new Set(lido.filter(x => esperadoSet.has(x))).size
    if (!melhor || score > melhor.score) melhor = { r, lido, score }
    if (score === N) break
  }

  if (!melhor || melhor.score === 0) {
    return { ok: false, motivo: "Nenhuma coluna do cabeçalho Shopee foi encontrada nesta aba" }
  }
  if (melhor.score < MIN_RECONHECIDAS) {
    return { ok: false, motivo: `Não parece ser a planilha Shopee: apenas ${melhor.score} de ${N} colunas reconhecidas` }
  }

  const { r, lido } = melhor
  const linhaTxt = `linha ${r + 1}`
  const posicoes = new Map<string, number[]>()
  lido.forEach((v, i) => {
    if (v) {
      if (!posicoes.has(v)) posicoes.set(v, [])
      posicoes.get(v)!.push(i)
    }
  })

  const faltando: DiagItem[] = []
  const extras: DiagItem[] = []
  const repetidas: DiagItem[] = []
  const foraPosicao: DiagItem[] = []

  ESPERADO_NORM.forEach((nome, i) => {
    const pos = posicoes.get(nome)
    if (!pos) faltando.push({ col: colName(i), nome: CABECALHO_ESPERADO[i] })
    else if (pos.length > 1) repetidas.push({ col: pos.map(colName).join(", "), nome: CABECALHO_ESPERADO[i] })
  })

  lido.forEach((v, i) => {
    if (v && !esperadoSet.has(v)) extras.push({ col: colName(i), nome: v })
  })

  if (!faltando.length && !extras.length && !repetidas.length) {
    ESPERADO_NORM.forEach((nome, i) => {
      const p = posicoes.get(nome)![0]
      if (p !== i) foraPosicao.push({ col: colName(p), nome: CABECALHO_ESPERADO[i], esperado: colName(i) })
    })
  }

  const totalDiffs = faltando.length + extras.length + repetidas.length + foraPosicao.length
  if (!totalDiffs) return { ok: true, linhaCab: r, range, linhaTxt }

  const partes: string[] = []
  if (faltando.length) partes.push(`${faltando.length} ${faltando.length === 1 ? 'coluna faltando' : 'colunas faltando'}`)
  if (extras.length) partes.push(`${extras.length} ${extras.length === 1 ? 'coluna a mais' : 'colunas a mais'}`)
  if (repetidas.length) partes.push(`${repetidas.length} ${repetidas.length === 1 ? 'coluna repetida' : 'colunas repetidas'}`)
  if (foraPosicao.length) partes.push(`${foraPosicao.length} ${foraPosicao.length === 1 ? 'coluna fora de posição' : 'colunas fora de posição'}`)

  return {
    ok: false,
    motivo: `Cabeçalho encontrado na ${linhaTxt}, mas com ${partes.join(', ')}`,
    diag: { faltando, extras, repetidas, foraPosicao }
  }
}

function linhaVazia(ws: any, r: number, c0: number, c1: number): boolean {
  for (let c = c0; c <= c1; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })]
    if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== "") return false
  }
  return true
}

function copiarCelula(cell: any) {
  const n: any = { t: cell.t, v: cell.v }
  if (cell.z) n.z = cell.z
  if (cell.t === 's' && cell.v === undefined) n.v = ''
  return n
}

function montarArquivo(ws: any, nomeAba: string, linhaCab: number, linhas: number[]) {
  const out: any = {}
  const lastC = N - 1
  let outR = 0
  const copiarLinha = (r: number) => {
    for (let c = 0; c <= lastC; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell) out[XLSX.utils.encode_cell({ r: outR, c })] = copiarCelula(cell)
    }
    outR++
  }

  copiarLinha(linhaCab)
  linhas.forEach(copiarLinha)

  const ref = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(outR - 1, 0), c: lastC } })
  out["!ref"] = ref
  out["!autofilter"] = { ref }
  if (ws["!cols"]) out["!cols"] = ws["!cols"].slice(0, N)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, out, (nomeAba || "Planilha1").slice(0, 31))
  return XLSX.write(wb, { bookType: "xlsx", type: "array", compression: true })
}

const limparNome = (s: any) => String(s).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim()

function salvarBlob(filename: string, data: any) {
  const blob = data instanceof Blob ? data : new Blob([data as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function SeparadorPlanilhas() {
  const [resultados, setResultados] = useState<ResultadoProcessamento[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [openAbasMap, setOpenAbasMap] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }

  const toggleAbas = (id: string) => {
    setOpenAbasMap(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const processarBuffer = (file: File, buffer: ArrayBuffer): ResultadoProcessamento => {
    const wb = XLSX.read(buffer, { type: "array", cellNF: true, cellDates: false, cellStyles: false })
    const abas: AbaValidacao[] = wb.SheetNames.map(nome => ({
      nome,
      ...validarCabecalho(wb.Sheets[nome])
    }))
    const validas = abas.filter(a => a.ok)
    const res: ResultadoProcessamento = {
      id: Math.random().toString(36).substring(2, 9),
      nomeArquivo: file.name,
      tamanhoFormatado: formatBytes(file.size),
      abas,
      avisos: [],
      grupos: [],
      totalLinhas: 0,
      erro: null
    }

    if (!validas.length) {
      res.erro = "Nenhuma aba tem o cabeçalho Shopee correto. Confira os erros diagnosticados em cada aba abaixo."
      return res
    }

    if (validas.length > 1) {
      res.avisos.push(`Mais de uma aba possui o cabeçalho correto (${validas.map(a => `"${a.nome}"`).join(", ")}). Foi utilizada a aba "${validas[0].nome}".`)
    }

    const alvo = validas[0]
    res.abaUsada = alvo.nome
    const ws = wb.Sheets[alvo.nome]
    const { linhaCab, range } = alvo

    if (linhaCab === undefined || !range) {
      res.erro = "Erro ao localizar dados da linha de cabeçalho."
      return res
    }

    const mapa = new Map<string, { op: string; linhas: number[]; total: number }>()
    let semOp = 0

    for (let r = linhaCab + 1; r <= range.e.r; r++) {
      if (linhaVazia(ws, r, 0, N - 1)) continue

      const cOp = ws[XLSX.utils.encode_cell({ r, c: IDX_OP })]
      let op = cOp ? String(cOp.v ?? "").replace(/\u00a0/g, " ").trim() : ""
      if (!op) {
        op = "Sem operação"
        semOp++
      }

      if (!mapa.has(op)) {
        mapa.set(op, { op, linhas: [], total: 0 })
      }
      const g = mapa.get(op)!
      g.linhas.push(r)

      const cV = ws[XLSX.utils.encode_cell({ r, c: IDX_VALOR })]
      if (cV && typeof cV.v === "number") {
        g.total += cV.v
      } else if (cV && typeof cV.v === "string") {
        const numParsed = parseFloat(cV.v.replace(/\./g, '').replace(',', '.'))
        if (!isNaN(numParsed)) g.total += numParsed
      }
    }

    if (semOp > 0) {
      res.avisos.push(`${intFmt.format(semOp)} linha(s) sem valor preenchido na coluna "operação" foram agrupadas em "Sem operação".`)
    }

    if (!mapa.size) {
      res.erro = "A aba com cabeçalho correto foi encontrada, mas não contém nenhuma linha de dados abaixo do cabeçalho."
      return res
    }

    const base = limparNome(file.name.replace(/\.[^.]+$/, ""))
    res.grupos = [...mapa.values()]
      .sort((a, b) => a.op.localeCompare(b.op, "pt-BR"))
      .map(g => ({
        ...g,
        filename: `${base} - ${limparNome(g.op)}.xlsx`,
        build: () => montarArquivo(ws, alvo.nome, linhaCab, g.linhas)
      }))

    res.totalLinhas = [...mapa.values()].reduce((s, g) => s + g.linhas.length, 0)
    return res
  }

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return
    setIsProcessing(true)

    const novosResultados: ResultadoProcessamento[] = []
    for (const f of files) {
      try {
        const buf = await f.arrayBuffer()
        const res = processarBuffer(f, buf)
        novosResultados.push(res)
      } catch (err: any) {
        novosResultados.push({
          id: Math.random().toString(36).substring(2, 9),
          nomeArquivo: f.name,
          tamanhoFormatado: formatBytes(f.size),
          abas: [],
          avisos: [],
          grupos: [],
          totalLinhas: 0,
          erro: "Não foi possível ler este arquivo. Verifique se é uma planilha Excel válida (.xlsx) e se não está corrompida ou protegida por senha."
        })
      }
    }

    setResultados(prev => [...novosResultados, ...prev])
    setIsProcessing(false)
    showToast(`${files.length} planilha(s) analisada(s) com sucesso.`)
  }

  const handleDownloadSingle = async (grupo: GrupoOperacao) => {
    try {
      const data = grupo.build()
      salvarBlob(grupo.filename, data)
      showToast(`Arquivo baixado: ${grupo.filename}`)
    } catch (err) {
      console.error(err)
      alert("Erro ao gerar arquivo da operação.")
    }
  }

  const handleDownloadAllZip = async (res: ResultadoProcessamento) => {
    try {
      const zip = new JSZip()
      res.grupos.forEach(g => {
        zip.file(g.filename, g.build())
      })
      const blob = await zip.generateAsync({ type: "blob" })
      const base = limparNome(res.nomeArquivo.replace(/\.[^.]+$/, ""))
      salvarBlob(`${base} - separado por operação.zip`, blob)
      showToast(`Pacote ZIP gerado com ${res.grupos.length} planilhas!`)
    } catch (err) {
      console.error(err)
      alert("Erro ao criar arquivo ZIP.")
    }
  }

  const handleRemoveResultado = (id: string) => {
    setResultados(prev => prev.filter(r => r.id !== id))
  }

  const handleClearAll = () => {
    if (confirm("Deseja limpar todos os resultados?")) {
      setResultados([])
    }
  }

  return (
    <div className="max-w-none w-full min-w-0 bg-slate-50 rounded-2xl p-4 sm:p-6 min-h-full space-y-6">
      
      {/* Cabeçalho Padrão FAQ / Cidades */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="h-10 sm:h-11 px-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
            <img 
              src="/Logo_Mantran.png" 
              alt="Mantran" 
              className="h-6 sm:h-7 w-auto object-contain select-none"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Separador de Planilhas
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 flex items-center gap-1">
                Shopee 4PL
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Valida o layout de pré-fatura (53 colunas) e divide automaticamente por operação para importação no Mantran.
            </p>
          </div>
        </div>

        {/* Badges de Destaque */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Processamento Seguro <strong className="text-slate-900 font-bold">100% Local</strong></span>
          </div>
          {resultados.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Resultados
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
            <h4 className="text-xs font-bold text-slate-900">Envie a Planilha</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Arraste ou selecione a planilha bruta da Shopee (.xlsx)</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
            2
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Diagnóstico Automático</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">O sistema confere as 53 colunas e aponta qualquer divergência</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
            3
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Download Separado</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Baixe cada operação individualmente ou em um arquivo .zip</p>
          </div>
        </div>
      </div>

      {/* Área de Dropzone / Upload */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const droppedFiles = Array.from(e.dataTransfer.files)
          handleFiles(droppedFiles)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          "border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 select-none",
          dragOver 
            ? "border-orange-500 bg-orange-50/70 scale-[0.99]" 
            : "border-slate-300 bg-white hover:border-orange-400 hover:bg-slate-50/60 shadow-2xs"
        )}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".xlsx,.xlsm,.xls" 
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFiles(Array.from(e.target.files))
            e.target.value = ''
          }}
        />

        <div className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform",
          dragOver ? "bg-orange-500 text-white scale-110" : "bg-orange-100 text-orange-600"
        )}>
          {isProcessing ? (
            <RefreshCw className="w-7 h-7 animate-spin" />
          ) : (
            <Upload className="w-7 h-7" />
          )}
        </div>

        <div>
          <strong className="text-base sm:text-lg font-bold text-slate-800 block">
            {isProcessing ? 'Processando e analisando planilha...' : 'Arraste as planilhas da Shopee aqui'}
          </strong>
          <span className="text-xs sm:text-sm text-slate-500 mt-1 block">
            ou clique para escolher no seu computador (pode enviar mais de uma de uma vez)
          </span>
        </div>

        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-sm hover:bg-orange-600 transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            Escolher Arquivos (.xlsx)
          </span>
        </div>
      </div>

      {/* Resultados do Processamento */}
      {resultados.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              Resultados da Análise ({resultados.length})
            </h2>
          </div>

          <div className="space-y-5">
            {resultados.map(res => {
              const hasError = !!res.erro
              const hasWarnings = res.avisos.length > 0
              const isAbasOpen = openAbasMap[res.id] || hasError
              const totalValor = res.grupos.reduce((sum, g) => sum + g.total, 0)

              return (
                <div 
                  key={res.id} 
                  className={clsx(
                    "bg-white border rounded-2xl overflow-hidden shadow-sm transition-all",
                    hasError ? "border-rose-200" : "border-slate-200"
                  )}
                >
                  {/* Top Bar do Card do Arquivo */}
                  <div className={clsx(
                    "p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b",
                    hasError ? "bg-rose-50/40 border-rose-100" : "bg-slate-50/50 border-slate-100"
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        hasError ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {hasError ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                            {res.nomeArquivo}
                          </h3>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-600">
                            {res.tamanhoFormatado}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {hasError ? 'Arquivo com erros no cabeçalho' : `Aba utilizada: "${res.abaUsada}"`}
                        </p>
                      </div>
                    </div>

                    {/* Estatísticas ou Botão Excluir */}
                    <div className="flex items-center gap-4 self-start md:self-auto shrink-0 flex-wrap">
                      {!hasError && (
                        <div className="flex items-center gap-3 text-xs">
                          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Linhas</span>
                            <span className="font-black text-slate-900">{intFmt.format(res.totalLinhas)}</span>
                          </div>
                          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Operações</span>
                            <span className="font-black text-slate-900">{res.grupos.length}</span>
                          </div>
                          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Valor Final</span>
                            <span className="font-black text-emerald-600">{brl.format(totalValor)}</span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleRemoveResultado(res.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Remover este resultado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Avisos e Mensagens de Erro */}
                  {(hasError || hasWarnings) && (
                    <div className="p-4 sm:p-5 border-b border-slate-100 space-y-2.5">
                      {hasError && (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold">Erro de Estrutura do Arquivo:</strong>
                            <span>{res.erro}</span>
                          </div>
                        </div>
                      )}

                      {res.avisos.map((aviso, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{aviso}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Abas Encontradas e Diagnóstico de Colunas */}
                  {res.abas.length > 0 && (
                    <div className="border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleAbas(res.id)}
                        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50/50 hover:bg-slate-100/60 transition-colors text-left"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          Verificação de Abas ({res.abas.length} {res.abas.length === 1 ? 'aba' : 'abas'})
                        </span>
                        <div className="flex items-center gap-1 text-slate-500">
                          <span>{isAbasOpen ? 'Ocultar detalhes' : 'Ver detalhes das colunas'}</span>
                          {isAbasOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isAbasOpen && (
                        <div className="p-4 sm:p-5 space-y-4 bg-white">
                          <ul className="divide-y divide-slate-100">
                            {res.abas.map((a, aIdx) => {
                              const isUsada = a.ok && a.nome === res.abaUsada
                              return (
                                <li key={aIdx} className="py-3 first:pt-0 last:pb-0 space-y-2.5">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className={clsx(
                                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                                      isUsada 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                        : a.ok 
                                        ? "bg-slate-100 text-slate-600 border-slate-200" 
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    )}>
                                      {isUsada ? 'Aba Utilizada' : a.ok ? 'Válida (Ignorada)' : 'Descartada'}
                                    </span>
                                    <strong className="text-xs sm:text-sm font-bold text-slate-800">
                                      "{a.nome}"
                                    </strong>
                                    {a.ok && isUsada && (
                                      <span className="text-xs text-slate-500">
                                        • Cabeçalho na {a.linhaTxt} confere com as 53 colunas exigidas
                                      </span>
                                    )}
                                  </div>

                                  {!a.ok && a.motivo && (
                                    <p className="text-xs text-rose-600 font-medium pl-1">
                                      {a.motivo}
                                    </p>
                                  )}

                                  {/* Diagnóstico Detalhado */}
                                  {a.diag && (
                                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                                      {a.diag.faltando.length > 0 && (
                                        <div>
                                          <h5 className="font-bold text-rose-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1">
                                            <XCircle className="w-3.5 h-3.5" /> Colunas Faltando ({a.diag.faltando.length})
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                            {a.diag.faltando.map((it, i) => (
                                              <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-white border border-rose-100">
                                                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                                  {it.col}
                                                </span>
                                                <span className="truncate text-slate-700" title={it.nome}>{it.nome}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <p className="text-[10px] text-slate-400 mt-1 italic">A letra indica a coluna onde o campo deveria estar.</p>
                                        </div>
                                      )}

                                      {a.diag.foraPosicao.length > 0 && (
                                        <div>
                                          <h5 className="font-bold text-amber-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Colunas Fora de Posição ({a.diag.foraPosicao.length})
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {a.diag.foraPosicao.map((it, i) => (
                                              <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-white border border-amber-100">
                                                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                                  {it.col}
                                                </span>
                                                <span className="truncate text-slate-700">
                                                  {it.nome} <strong className="text-amber-800 font-bold">(deveria ser {it.esperado})</strong>
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {a.diag.extras.length > 0 && (
                                        <div>
                                          <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                                            Colunas a mais não reconhecidas ({a.diag.extras.length})
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                            {a.diag.extras.map((it, i) => (
                                              <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-white border border-slate-200">
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                                  {it.col}
                                                </span>
                                                <span className="truncate text-slate-600" title={it.nome}>"{it.nome}"</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {a.diag.repetidas.length > 0 && (
                                        <div>
                                          <h5 className="font-bold text-purple-700 uppercase tracking-wider text-[11px] mb-1.5">
                                            Colunas Repetidas ({a.diag.repetidas.length})
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {a.diag.repetidas.map((it, i) => (
                                              <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-white border border-purple-100">
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                                  {it.col}
                                                </span>
                                                <span className="truncate text-purple-900 font-semibold">{it.nome}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tabela de Operações Separadas */}
                  {!hasError && res.grupos.length > 0 && (
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Planilhas Geradas por Operação ({res.grupos.length})
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Cada arquivo gerado possui o cabeçalho original com autofiltro pronto para ser importado no Mantran.
                          </p>
                        </div>

                        {/* Botão Baixar Todos em ZIP */}
                        <button
                          onClick={() => handleDownloadAllZip(res)}
                          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                        >
                          <FileArchive className="w-4 h-4" />
                          Baixar Todos em ZIP ({res.grupos.length})
                        </button>
                      </div>

                      {/* Tabela de Operações */}
                      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Operação</th>
                              <th className="py-2.5 px-3 text-right">Qtd. Linhas</th>
                              <th className="py-2.5 px-3 text-right">Valor Final a Receber</th>
                              <th className="py-2.5 px-3 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {res.grupos.map((g, gIdx) => (
                              <tr key={gIdx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                  <span className="truncate max-w-[280px]" title={g.op}>{g.op}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                  {intFmt.format(g.linhas.length)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  {brl.format(g.total)}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleDownloadSingle(g)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 font-bold text-[11px] border border-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                    title={`Baixar ${g.filename}`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Baixar .xlsx
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                              <td className="py-2.5 px-3 uppercase text-[11px]">Total Geral</td>
                              <td className="py-2.5 px-3 text-right font-mono">{intFmt.format(res.totalLinhas)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{brl.format(totalValor)}</td>
                              <td className="py-2.5 px-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Alerta de Verificação Final */}
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Atenção:</strong> Após exportar, confira as informações dos arquivos gerados (quantidade de linhas, operações e valores) antes de utilizá-los no módulo Shopee do Mantran.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Nota de rodapé sobre privacidade */}
      <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Os arquivos são processados com segurança diretamente no seu navegador e não são enviados para nenhum servidor externo.</span>
      </div>

    </div>
  )
}
