// Inspeção 3: tenta extrair os bytes de uma imagem real de uma página,
// convertendo o bitmap RGBA do pdf.js para PNG com a lib 'sharp' se existir,
// senão só reporta dimensões/canais para validar que os pixels chegam.
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync } from 'node:fs'

const file = process.argv[2]
const pageNum = parseInt(process.argv[3] || '2', 10)
const data = new Uint8Array(readFileSync(file))
const doc = await getDocument({ data, disableWorker: true }).promise
const page = await doc.getPage(pageNum)
const ops = await page.getOperatorList()

const names = []
for (let i = 0; i < ops.fnArray.length; i++) {
  if (ops.fnArray[i] === OPS.paintImageXObject) names.push(ops.argsArray[i][0])
}
console.log('XObjects de imagem na página', pageNum, ':', names)

for (const name of names) {
  await new Promise((resolve) => {
    const tryGet = () => {
      const has = page.objs.has(name)
      if (!has) { page.objs.get(name, () => resolve()); return }
      const img = page.objs.get(name)
      console.log(`  ${name}: ${img?.width}x${img?.height} | kind=${img?.kind} | dataLen=${img?.data?.length}`)
      resolve()
    }
    tryGet()
  })
}
