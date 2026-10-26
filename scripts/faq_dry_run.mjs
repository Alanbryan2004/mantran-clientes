// Dry-run: roda o parser em todos os PDFs e grava um JSON de pré-visualização
// (sem bytes de imagem) para revisão da qualidade antes de gravar no banco.
// Uso: node scripts/faq_dry_run.mjs
import { readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePdfManual } from './faq_pdf_parser.mjs'
import { categoriaDe } from './faq_mapa_manuais.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(__dirname, '..', 'public', 'MANUAIS_MANTRAN_ATE_26_10')

const arquivos = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.pdf')).sort()
console.log(`Encontrados ${arquivos.length} PDFs.\n`)

const preview = []
for (const arq of arquivos) {
  try {
    const r = await parsePdfManual(join(DIR, arq))
    const { modulo, categoria } = categoriaDe(arq)
    const comImg = r.passos.filter(p => p.imagem).length
    preview.push({
      arquivo: arq,
      modulo, categoria,
      titulo: r.titulo,
      paginas: r.numPaginas,
      qtdPassos: r.passos.length,
      passosComImagem: comImg,
      descricao: r.descricao.slice(0, 180),
      passos: r.passos.map(p => ({
        temImagem: !!p.imagem,
        dim: p.imagem ? `${p.imagem.width}x${p.imagem.height}` : null,
        texto: p.texto.replace(/\n/g, ' ⏎ ').slice(0, 160)
      }))
    })
    console.log(`✅ ${arq.padEnd(52)} | ${modulo} > ${categoria} | passos=${String(r.passos.length).padStart(2)} (img=${comImg})`)
  } catch (e) {
    console.log(`❌ ${arq.padEnd(52)} | ERRO: ${e.message}`)
    preview.push({ arquivo: arq, erro: e.message })
  }
}

const out = resolve(__dirname, '..', 'docs', 'faq_dry_run.json')
writeFileSync(out, JSON.stringify(preview, null, 2), 'utf8')
console.log(`\nPré-visualização salva em: ${out}`)
