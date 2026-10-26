// ============================================================
// Parser dos manuais POP (PDF) da Mantran -> estrutura do FAQ.
//
// Extrai, de cada PDF:
//   - titulo:    primeira linha em caixa alta (antes de "1. Objetivo")
//   - descricao: seções "1. Objetivo", "2. Onde se aplica", "3. Antes de começar"
//   - passos:    cada bloco "N.N ..." dentro de "4. Procedimento",
//                com texto (HTML simples) e as imagens que o acompanham.
//
// Imagens: cada imagem é associada ao passo imediatamente acima dela (maior Y).
// O cabeçalho do topo (logo/rodapé repetido) e a página final de metadados
// são descartados.
//
// Exporta: parsePdfManual(caminhoPdf) -> { titulo, descricao, passos: [{texto, imagem}] }
//   imagem = { buffer(Buffer PNG), width, height } | null
// ============================================================
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'

// ---- util: converte bitmap do pdf.js (RGB/RGBA/Gray) em PNG (Buffer) ----
function bitmapParaPngBuffer(img) {
  const { width, height, kind } = img
  const src = img.data
  if (!src || !width || !height) return null

  const png = new PNG({ width, height })
  const dst = png.data // RGBA

  // kind: 1 = GRAYSCALE_1BPP (tratado como bytes já expandidos em alguns casos),
  //       2 = RGB_24BPP, 3 = RGBA_32BPP
  if (kind === 3) {
    src.copy ? src.copy(dst) : dst.set(src)
  } else if (kind === 2) {
    for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
      dst[j] = src[i]; dst[j + 1] = src[i + 1]; dst[j + 2] = src[i + 2]; dst[j + 3] = 255
    }
  } else {
    // grayscale (1 canal)
    const px = width * height
    if (src.length >= px) {
      for (let i = 0, j = 0; i < px; i++, j += 4) {
        const v = src[i]
        dst[j] = v; dst[j + 1] = v; dst[j + 2] = v; dst[j + 3] = 255
      }
    } else {
      return null
    }
  }
  return PNG.sync.write(png)
}

const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
]

function getObj(page, name) {
  return new Promise((resolve) => {
    let done = false
    const finish = (o) => { if (!done) { done = true; resolve(o) } }
    try {
      if (page.objs.has(name)) return finish(page.objs.get(name))
      page.objs.get(name, (o) => finish(o))
    } catch {
      return finish(null)
    }
    // fallback: se o objeto nunca resolver (sem canvas/worker), não trava o parser
    setTimeout(() => finish(null), 400)
  })
}

// Reconstrói linhas de texto de uma página com posição Y média.
function linhasDaPagina(content) {
  const linhas = []
  let cur = ''
  let yAccum = 0, yCount = 0
  let lastY = null
  const flush = () => {
    const t = cur.trim()
    if (t) linhas.push({ texto: t, y: yCount ? yAccum / yCount : lastY })
    cur = ''; yAccum = 0; yCount = 0
  }
  for (const it of content.items) {
    const y = it.transform[5]
    if (lastY !== null && Math.abs(y - lastY) > 3) flush()
    cur += it.str
    yAccum += y; yCount++
    if (it.hasEOL) { lastY = y; flush(); lastY = y; continue }
    lastY = y
  }
  flush()
  return linhas
}

// Regex de início de passo: "4.1", "4.10" (seção 4) — e genérico "N.N".
const RE_PASSO = /^(\d+)\.(\d+)\b\s*(.*)$/
const RE_SECAO = /^(\d+)\.\s+(.+)$/            // "1. Objetivo", "4. Procedimento"
const RE_PARTE = /^(Parte\s+[A-Z0-9][^\n]*)$/i // subgrupo "Parte A · ..."

export async function parsePdfManual(caminhoPdf) {
  const data = new Uint8Array(readFileSync(caminhoPdf))
  const doc = await getDocument({ data, disableWorker: true, isEvalSupported: false }).promise

  // 1) Coleta eventos (linhas de texto + imagens) de todas as páginas, em ordem global.
  //    A ordem global é página asc, e dentro da página Y desc (topo -> base).
  const eventos = [] // { tipo:'texto'|'imagem', texto?, img?, pagina, y }

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const ops = await page.getOperatorList()

    const doPagina = []

    for (const l of linhasDaPagina(content)) {
      doPagina.push({ tipo: 'texto', texto: l.texto, pagina: p, y: l.y })
    }

    // imagens, rastreando a matriz corrente p/ obter Y e tamanho
    let ctm = [1, 0, 0, 1, 0, 0]
    const stack = []
    const pendentes = []
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i]
      const args = ops.argsArray[i]
      if (fn === OPS.save) stack.push(ctm.slice())
      else if (fn === OPS.restore) ctm = stack.pop() || ctm
      else if (fn === OPS.transform) ctm = mul(ctm, args)
      else if (fn === OPS.paintImageXObject) {
        pendentes.push({ name: args[0], y: ctm[5], w: Math.abs(ctm[0]), h: Math.abs(ctm[3]) })
      }
    }
    // resolve todas as imagens da página em paralelo (bem mais rápido que serial)
    const resolvidas = await Promise.all(pendentes.map(async (pend) => {
      const obj = await getObj(page, pend.name)
      return obj ? { tipo: 'imagem', img: obj, pagina: p, y: pend.y, w: pend.w, h: pend.h } : null
    }))
    for (const r of resolvidas) if (r) doPagina.push(r)

    doPagina.sort((a, b) => b.y - a.y) // topo -> base
    eventos.push(...doPagina)
  }

  // 2) Descobre título e marca início da seção "4. Procedimento".
  let titulo = null
  const descricaoLinhas = []
  let idxProcedimento = -1

  // título = linha(s) "gritada(s)" (>=60% maiúsculas) antes da seção "1." .
  // O título pode quebrar em 2 linhas (ex.: "ENVIO MANUAL ... PARA A" + "SEFAZ"),
  // então concatenamos linhas maiúsculas consecutivas até achar a seção 1.
  const ehGritada = (t) => {
    const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, '')
    const maiusc = t.replace(/[^A-ZÀ-Þ]/g, '')
    return letras.length >= 2 && maiusc.length / Math.max(letras.length, 1) >= 0.6
  }
  for (let i = 0; i < eventos.length; i++) {
    const e = eventos[i]
    if (e.tipo !== 'texto') continue
    const t = e.texto
    if (/^MANTRAN \| Procedimento/i.test(t)) continue // rodapé
    if (RE_SECAO.test(t)) break                         // chegou em "1. Objetivo"
    if (ehGritada(t) && t.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4) {
      titulo = titulo ? `${titulo} ${t.trim()}` : t.replace(/\s+/g, ' ').trim()
    } else if (titulo) {
      // linha não-gritada após o título: continuação curta (ex.: "SHOPEE") já tratada acima; para aqui
      break
    }
  }
  if (titulo) titulo = titulo.replace(/\s+/g, ' ').trim()

  // 3) Varre eventos montando descrição (seções 1-3) e passos (seção 4+).
  const passos = [] // { texto, imagens: [Buffer] , linhasTexto: [] }
  let emProcedimento = false
  let parteAtual = null
  let passoAtual = null

  const novoPasso = (cabecalho) => {
    if (passoAtual) passos.push(passoAtual)
    passoAtual = { titulo: cabecalho || '', linhas: [], imagens: [] }
    if (parteAtual) passoAtual.parte = parteAtual
  }

  for (const e of eventos) {
    if (e.tipo === 'imagem') {
      // ignora o header do topo (y alto) e imagens muito pequenas/decorativas de rodapé
      const ehHeader = e.y > 770
      const muitoBaixa = (e.h || 0) < 8
      if (ehHeader || muitoBaixa) continue
      if (emProcedimento && passoAtual) {
        const buf = bitmapParaPngBuffer(e.img)
        if (buf) passoAtual.imagens.push({ buffer: buf, width: e.img.width, height: e.img.height })
      }
      continue
    }

    const t = e.texto
    if (/^MANTRAN \| Procedimento/i.test(t)) continue // rodapé repetido
    // pula linhas que compõem o título (inteiro ou em pedaços de quebra de linha)
    if (titulo && (t === titulo || (t.length >= 3 && titulo.includes(t.trim()) && ehGritada(t)))) continue

    // Detecta seção "N. Nome"
    const secao = RE_SECAO.exec(t)
    if (secao && !RE_PASSO.test(t)) {
      const nomeSecao = secao[2].toLowerCase()
      if (/procedimento/.test(nomeSecao)) {
        emProcedimento = true
        continue
      }
      if (!emProcedimento) {
        // seções 1,2,3 -> descrição
        descricaoLinhas.push(`<b>${secao[2].trim()}</b>`)
        continue
      }
      // Uma nova seção numerada depois do procedimento (ex.: "5. ...") encerra os passos.
      emProcedimento = false
      continue
    }

    if (!emProcedimento) {
      // acumula corpo da descrição
      if (titulo) descricaoLinhas.push(t)
      continue
    }

    // Dentro do procedimento:
    const parte = RE_PARTE.exec(t)
    if (parte) { parteAtual = parte[1].trim(); continue }

    const passo = RE_PASSO.exec(t)
    if (passo) {
      novoPasso(t.trim())
      continue
    }

    // linha de corpo do passo atual
    if (passoAtual) passoAtual.linhas.push(t)
  }
  if (passoAtual) passos.push(passoAtual)

  // 4) Monta HTML dos passos. Cada passo pode ter N imagens -> gera N "passos"
  //    no FAQ quando houver mais de uma imagem, mantendo o texto só no primeiro.
  const passosFaq = []
  // Marcadores que indicam o fim do passo-a-passo útil (fecho do POP).
  const RE_FIM = /\b(Conclu[ií]do!|N[ãa]o conseguiu concluir|Abra um chamado enviando|C[óo]digo\s+\d+\s+Vers[ãa]o)\b/i

  for (const ps of passos) {
    const cabecalho = ps.titulo.replace(RE_PASSO, (_, a, b, resto) => resto).trim() || ps.titulo
    let corpo = ps.linhas.join(' ').replace(/\s+/g, ' ').trim()
    // corta o fecho ("Concluído!", seção de ajuda, metadados) do último passo
    const mFim = RE_FIM.exec(corpo)
    if (mFim) corpo = corpo.slice(0, mFim.index).trim()
    let texto = ''
    if (ps.parte) texto += `<b>${ps.parte}</b>\n`
    texto += `<b>${cabecalho}</b>`
    if (corpo) texto += `\n${corpo}`

    if (ps.imagens.length <= 1) {
      passosFaq.push({ texto, imagem: ps.imagens[0] || null })
    } else {
      // primeira imagem junto do texto; demais como passos só-imagem
      passosFaq.push({ texto, imagem: ps.imagens[0] })
      for (let k = 1; k < ps.imagens.length; k++) {
        passosFaq.push({ texto: '', imagem: ps.imagens[k] })
      }
    }
  }

  const descricao = descricaoLinhas.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return {
    titulo: titulo || 'Procedimento',
    descricao,
    numPaginas: doc.numPages,
    passos: passosFaq,
  }
}
