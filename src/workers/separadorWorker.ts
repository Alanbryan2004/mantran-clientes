import * as XLSX from 'xlsx'

// 53 colunas oficiais esperadas na planilha de Pré-Fatura da Shopee
const CABECALHO_ESPERADO = [
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

const COL_LETTERS: string[] = []
for (let i = 0; i <= 150; i++) {
  COL_LETTERS.push(XLSX.utils.encode_col(i))
}
const colName = (i: number) => COL_LETTERS[i] || XLSX.utils.encode_col(i)

const LINHAS_BUSCA = 15
const MIN_RECONHECIDAS = Math.ceil(N / 3)

const limparNome = (s: any) => String(s).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim()

function validarCabecalho(ws: any) {
  if (!ws || !ws["!ref"]) return { ok: false, motivo: "Aba vazia ou sem dados" }
  const range = XLSX.utils.decode_range(ws["!ref"])
  const data = ws["!data"]
  const ultimaCol = Math.max(range.e.c, N - 1)

  const lerLinha = (r: number) => {
    const v: string[] = []
    if (data && data[r]) {
      const row = data[r]
      for (let c = 0; c <= ultimaCol; c++) {
        const cell = row[c]
        v.push(cell ? norm(cell.v) : "")
      }
    } else {
      const rowNumStr = String(r + 1)
      for (let c = 0; c <= ultimaCol; c++) {
        const col = COL_LETTERS[c] || XLSX.utils.encode_col(c)
        const cell = ws[col + rowNumStr]
        v.push(cell ? norm(cell.v) : "")
      }
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

  const faltando: any[] = []
  const extras: any[] = []
  const repetidas: any[] = []
  const foraPosicao: any[] = []

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

function copiarCelula(cell: any) {
  const n: any = { t: cell.t, v: cell.v }
  if (cell.z) n.z = cell.z
  if (cell.t === 's' && cell.v === undefined) n.v = ''
  return n
}

function montarArquivo(ws: any, nomeAba: string, linhaCab: number, linhas: number[]): Uint8Array {
  const out: any = {}
  const lastC = N - 1
  const data = ws["!data"]
  let outR = 0

  const copiarLinha = (r: number) => {
    const outRowNumStr = String(outR + 1)
    if (data && data[r]) {
      const row = data[r]
      for (let c = 0; c <= lastC; c++) {
        const cell = row[c]
        if (cell) out[COL_LETTERS[c] + outRowNumStr] = copiarCelula(cell)
      }
    } else {
      const rowNumStr = String(r + 1)
      for (let c = 0; c <= lastC; c++) {
        const col = COL_LETTERS[c] || XLSX.utils.encode_col(c)
        const cell = ws[col + rowNumStr]
        if (cell) out[col + outRowNumStr] = copiarCelula(cell)
      }
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
  const u8 = XLSX.write(wb, { bookType: "xlsx", type: "array", compression: true })
  return new Uint8Array(u8)
}

self.onmessage = async (e: MessageEvent) => {
  const { id, fileBuffer, fileName } = e.data

  try {
    self.postMessage({ type: 'PROGRESS', id, percent: 15, stageText: 'Lendo e descompactando planilha no processador em segundo plano...' })

    // Lê usando dense: true para máxima performance e baixo uso de memória
    const wb = XLSX.read(fileBuffer, {
      type: "array",
      dense: true,
      cellNF: true,
      cellDates: false,
      cellStyles: false,
      cellFormula: false,
      cellHTML: false
    })

    self.postMessage({ type: 'PROGRESS', id, percent: 45, stageText: 'Conferindo estrutura das abas e 53 colunas da Shopee...' })

    const abas = wb.SheetNames.map(nome => ({
      nome,
      ...validarCabecalho(wb.Sheets[nome])
    }))
    const validas = abas.filter(a => a.ok)

    const res: any = {
      id,
      nomeArquivo: fileName,
      abas,
      avisos: [],
      grupos: [],
      totalLinhas: 0,
      erro: null
    }

    if (!validas.length) {
      res.erro = "Nenhuma aba tem o cabeçalho Shopee correto. Confira os erros diagnosticados em cada aba abaixo."
      self.postMessage({ type: 'DONE', id, result: res })
      return
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
      self.postMessage({ type: 'DONE', id, result: res })
      return
    }

    const data = ws["!data"]
    const mapa = new Map<string, { op: string; linhas: number[]; total: number }>()
    let semOp = 0
    const totalRows = Math.max(1, range.e.r - linhaCab)

    for (let r = linhaCab + 1; r <= range.e.r; r++) {
      if ((r - linhaCab) % 2500 === 0) {
        const pct = Math.min(85, Math.round(50 + ((r - linhaCab) / totalRows) * 35))
        self.postMessage({ 
          type: 'PROGRESS', 
          id, 
          percent: pct, 
          stageText: `Analisando registros: ${(r - linhaCab).toLocaleString('pt-BR')} de ${totalRows.toLocaleString('pt-BR')}...` 
        })
      }

      let cOp: any = null
      let cValor: any = null
      let hasData = false

      if (data && data[r]) {
        const row = data[r]
        cOp = row[IDX_OP]
        cValor = row[IDX_VALOR]
        const c0 = row[0]

        hasData = (cOp && cOp.v !== undefined && cOp.v !== null && String(cOp.v).trim() !== "") ||
                  (c0 && c0.v !== undefined && c0.v !== null && String(c0.v).trim() !== "") ||
                  (cValor && cValor.v !== undefined && cValor.v !== null && String(cValor.v).trim() !== "")

        if (!hasData) {
          for (let c = 0; c < row.length; c++) {
            const cell = row[c]
            if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== "") {
              hasData = true
              break
            }
          }
        }
      } else {
        const rowNumStr = String(r + 1)
        cOp = ws[COL_LETTERS[IDX_OP] + rowNumStr]
        cValor = ws[COL_LETTERS[IDX_VALOR] + rowNumStr]
        const c0 = ws[COL_LETTERS[0] + rowNumStr]

        hasData = (cOp && cOp.v !== undefined && cOp.v !== null && String(cOp.v).trim() !== "") ||
                  (c0 && c0.v !== undefined && c0.v !== null && String(c0.v).trim() !== "") ||
                  (cValor && cValor.v !== undefined && cValor.v !== null && String(cValor.v).trim() !== "")
      }

      if (!hasData) continue

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

      if (cValor && typeof cValor.v === "number") {
        g.total += cValor.v
      } else if (cValor && typeof cValor.v === "string") {
        const numParsed = parseFloat(cValor.v.replace(/\./g, '').replace(',', '.'))
        if (!isNaN(numParsed)) g.total += numParsed
      }
    }

    if (semOp > 0) {
      res.avisos.push(`${semOp.toLocaleString('pt-BR')} linha(s) sem valor preenchido na coluna "operação" foram agrupadas em "Sem operação".`)
    }

    if (!mapa.size) {
      res.erro = "A aba com cabeçalho correto foi encontrada, mas não contém nenhuma linha de dados abaixo do cabeçalho."
      self.postMessage({ type: 'DONE', id, result: res })
      return
    }

    self.postMessage({ type: 'PROGRESS', id, percent: 88, stageText: 'Gerando planilhas separadas por operação...' })

    const base = limparNome(fileName.replace(/\.[^.]+$/, ""))

    res.grupos = [...mapa.values()]
      .sort((a, b) => a.op.localeCompare(b.op, "pt-BR"))
      .map(g => {
        const fileBytes = montarArquivo(ws, alvo.nome, linhaCab, g.linhas)
        return {
          op: g.op,
          linhas: g.linhas,
          total: g.total,
          filename: `${base} - ${limparNome(g.op)}.xlsx`,
          fileBytes: fileBytes
        }
      })

    res.totalLinhas = [...mapa.values()].reduce((s: number, g: any) => s + g.linhas.length, 0)

    self.postMessage({ type: 'PROGRESS', id, percent: 100, stageText: 'Processamento concluído com sucesso!' })
    self.postMessage({ type: 'DONE', id, result: res })

  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      id,
      error: err?.message || "Erro ao processar planilha no worker"
    })
  }
}
