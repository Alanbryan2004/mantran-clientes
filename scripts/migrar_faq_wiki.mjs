// ============================================================
// Migração ÚNICA: importa a Wiki (HTML do time) para as tabelas faq_*.
//
// Lê public/Wiki Mantran · Módulo Shopee.html, extrai CATS/ARTS/IMG,
// envia as imagens (base64) para o Supabase Storage (bucket "faq")
// e insere categorias, procedimentos e passos no banco.
//
// Uso:  node scripts/migrar_faq_wiki.mjs
// Requer: .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY,
//         e as tabelas faq_* + bucket "faq" já criados (criar_tabelas_faq.sql).
// ============================================================
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env ou .env.local).')
  process.exit(1)
}
const supabase = createClient(SUPA_URL, SUPA_KEY)

const __dirname = dirname(fileURLToPath(import.meta.url))
const HTML_PATH = join(__dirname, '..', 'public', 'Wiki Mantran · Módulo Shopee.html')

// Extrai o literal de um `const NOME = <json>;` do HTML.
function extrairConst(html, nome) {
  const marcador = `const ${nome} = `
  const inicio = html.indexOf(marcador)
  if (inicio < 0) throw new Error(`Não achei const ${nome}`)
  const jsonStart = inicio + marcador.length
  // Varre balanceando colchetes/chaves até o fechamento, respeitando strings.
  let depth = 0, i = jsonStart, inStr = false, strCh = '', started = false
  for (; i < html.length; i++) {
    const ch = html[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === strCh) inStr = false
      continue
    }
    if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue }
    if (ch === '[' || ch === '{') { depth++; started = true }
    else if (ch === ']' || ch === '}') { depth--; if (started && depth === 0) { i++; break } }
  }
  const literal = html.slice(jsonStart, i)
  return JSON.parse(literal)
}

// data:image/webp;base64,XXXX  ->  { buffer, contentType, ext }
function dataUrlParaBuffer(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(dataUrl)
  if (!m) return null
  const contentType = m[1]
  const ext = contentType.split('/')[1].replace('jpeg', 'jpg')
  return { buffer: Buffer.from(m[2], 'base64'), contentType, ext }
}

async function main() {
  const html = readFileSync(HTML_PATH, 'utf8')
  const CATS = extrairConst(html, 'CATS')     // ["Cadastros", ...]
  const ARTS = extrairConst(html, 'ARTS')     // [{id,title,resumo,cat,path:[],steps:[{t,nota?,im?:[key]}]}]
  const IMG = extrairConst(html, 'IMG')       // { key: [dataUrl, w, h] }

  console.log(`Categorias: ${CATS.length} | Procedimentos: ${ARTS.length} | Imagens: ${Object.keys(IMG).length}`)

  // 1) Upload das imagens -> mapa key -> URL pública (faz cache, sobe uma vez)
  const urlPorImg = {}
  const chavesUsadas = new Set()
  // Cada passo referencia a imagem em `img` (string) — formato do HTML do time.
  // Também aceitamos `im` (array) por segurança.
  const chavesDoPasso = (s) => {
    const out = []
    if (typeof s.img === 'string' && s.img) out.push(s.img)
    if (Array.isArray(s.im)) s.im.forEach(k => k && out.push(k))
    return out
  }
  ARTS.forEach(a => (a.steps || []).forEach(s => chavesDoPasso(s).forEach(k => chavesUsadas.add(k))))
  console.log(`Imagens realmente usadas nos passos: ${chavesUsadas.size}`)

  let up = 0
  for (const key of chavesUsadas) {
    const entry = IMG[key]
    if (!entry) { console.warn(`  (aviso) imagem ${key} não encontrada em IMG`); continue }
    const dataUrl = Array.isArray(entry) ? entry[0] : entry
    const parsed = dataUrlParaBuffer(dataUrl)
    if (!parsed) { console.warn(`  (aviso) imagem ${key} não é data URL válida`); continue }
    const path = `wiki/${key}.${parsed.ext}`
    const { error } = await supabase.storage.from('faq').upload(path, parsed.buffer, {
      contentType: parsed.contentType, upsert: true
    })
    if (error) { console.warn(`  (erro upload ${key}): ${error.message}`); continue }
    const { data } = supabase.storage.from('faq').getPublicUrl(path)
    urlPorImg[key] = data.publicUrl
    up++
    if (up % 10 === 0) console.log(`  ...${up}/${chavesUsadas.size} imagens enviadas`)
  }
  console.log(`Imagens enviadas: ${up}`)

  // 2) Categorias (na ordem de CATS) -> mapa nome -> id
  const idPorCat = {}
  for (let idx = 0; idx < CATS.length; idx++) {
    const nome = CATS[idx]
    const { data, error } = await supabase
      .from('faq_categorias')
      .insert({ nome, ordem: idx + 1 })
      .select()
      .single()
    if (error) { console.warn(`  (erro categoria ${nome}): ${error.message}`); continue }
    idPorCat[nome] = data.id
  }
  console.log(`Categorias inseridas: ${Object.keys(idPorCat).length}`)

  // 3) Procedimentos + passos
  let procCount = 0, passoCount = 0
  for (let a = 0; a < ARTS.length; a++) {
    const art = ARTS[a]
    const categoriaId = idPorCat[art.cat]
    if (!categoriaId) { console.warn(`  (aviso) procedimento "${art.title}" sem categoria (${art.cat})`); continue }

    const caminho = Array.isArray(art.path) ? art.path.join(' › ') : (art.path || '')
    const { data: proc, error: errProc } = await supabase
      .from('faq_procedimentos')
      .insert({
        categoria_id: categoriaId,
        titulo: art.title,
        descricao: art.resumo || null,
        caminho_menu: caminho || null,
        ordem: a + 1
      })
      .select()
      .single()
    if (errProc) { console.warn(`  (erro proc ${art.title}): ${errProc.message}`); continue }
    procCount++

    const passos = (art.steps || []).map((s, i) => {
      let texto = s.t || ''
      if (s.nota) texto += `\n\n<b>Obs.:</b> ${s.nota}`
      const imgKey = chavesDoPasso(s)[0] || null
      const imagem_url = imgKey ? (urlPorImg[imgKey] || null) : null
      return { procedimento_id: proc.id, ordem: i + 1, texto, imagem_url }
    })
    if (passos.length) {
      const { error: errPassos } = await supabase.from('faq_passos').insert(passos)
      if (errPassos) console.warn(`  (erro passos ${art.title}): ${errPassos.message}`)
      else passoCount += passos.length
    }
  }

  console.log(`\n✅ Migração concluída: ${procCount} procedimentos, ${passoCount} passos.`)
}

main().catch(err => { console.error('Falha na migração:', err); process.exit(1) })
