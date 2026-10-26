// ============================================================
// Importa os manuais PDF (public/MANUAIS_MANTRAN_ATE_26_10) para o FAQ.
//
// Para cada PDF:
//   - cria/reutiliza a categoria (com módulo) na sidebar;
//   - cria o procedimento (titulo, descricao, caminho_menu "Módulo › Categoria");
//   - sobe as imagens dos passos para o Storage (bucket "faq", pasta "manuais/");
//   - insere os passos (texto HTML + imagem_url).
//
// Idempotência: um procedimento já existente (mesmo título na mesma categoria)
//   é PULADO por padrão. Use --forcar para apagar os passos e reinserir.
//
// Uso:
//   node scripts/importar_manuais_faq.mjs            (importa o que falta)
//   node scripts/importar_manuais_faq.mjs --forcar   (reimporta tudo)
//   node scripts/importar_manuais_faq.mjs --somente "Cadastro_Motorista"
//
// Requer: .env.local / .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY,
//   tabelas faq_* e bucket "faq" já criados (criar_tabelas_faq.sql).
// ============================================================
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePdfManual } from './faq_pdf_parser.mjs'
import { categoriaDe, TITULO_OVERRIDE } from './faq_mapa_manuais.mjs'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Faltam VITE_SUPABASE_URL / chave do Supabase (.env ou .env.local).')
  process.exit(1)
}
const supabase = createClient(SUPA_URL, SUPA_KEY)

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(__dirname, '..', 'public', 'MANUAIS_MANTRAN_ATE_26_10')

const args = process.argv.slice(2)
const FORCAR = args.includes('--forcar')
const somenteIdx = args.indexOf('--somente')
const SOMENTE = somenteIdx >= 0 ? (args[somenteIdx + 1] || '').toLowerCase() : null

// ---- cache de categorias (nome|modulo -> id) ----
const cacheCategoria = new Map()

async function obterCategoriaId(nome, modulo, ordem) {
  const chave = `${modulo}||${nome}`
  if (cacheCategoria.has(chave)) return cacheCategoria.get(chave)

  // tenta achar categoria existente (mesmo nome + módulo)
  const { data: existentes, error: errSel } = await supabase
    .from('faq_categorias')
    .select('id, nome, modulo')
    .eq('nome', nome)
  if (errSel) throw errSel

  let id = (existentes || []).find(c => (c.modulo || '') === (modulo || ''))?.id
  if (!id) {
    const { data, error } = await supabase
      .from('faq_categorias')
      .insert({ nome, modulo, ordem })
      .select()
      .single()
    if (error) throw error
    id = data.id
    console.log(`  + categoria criada: ${modulo} › ${nome}`)
  }
  cacheCategoria.set(chave, id)
  return id
}

// sobe um PNG (Buffer) e devolve a URL pública
async function subirImagem(buffer, nomeBase, idx) {
  const path = `manuais/${nomeBase}_${String(idx).padStart(2, '0')}.png`
  const { error } = await supabase.storage.from('faq').upload(path, buffer, {
    contentType: 'image/png', upsert: true
  })
  if (error) throw error
  const { data } = supabase.storage.from('faq').getPublicUrl(path)
  return data.publicUrl
}

async function procedimentoExistente(categoriaId, titulo) {
  const { data, error } = await supabase
    .from('faq_procedimentos')
    .select('id')
    .eq('categoria_id', categoriaId)
    .eq('titulo', titulo)
    .limit(1)
  if (error) throw error
  return data && data[0] ? data[0].id : null
}

async function main() {
  let arquivos = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.pdf')).sort()
  if (SOMENTE) arquivos = arquivos.filter(f => f.toLowerCase().includes(SOMENTE))

  console.log(`Importando ${arquivos.length} manual(is).  forcar=${FORCAR}\n`)

  let okProc = 0, okPasso = 0, okImg = 0, pulados = 0, falhas = 0

  for (let i = 0; i < arquivos.length; i++) {
    const arq = arquivos[i]
    const nomeBase = arq.replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9_-]/g, '_')
    try {
      const parsed = await parsePdfManual(join(DIR, arq))
      const titulo = (TITULO_OVERRIDE[arq] || parsed.titulo).replace(/\s+/g, ' ').trim()
      const { modulo, categoria } = categoriaDe(arq)
      const caminho = `${modulo} › ${categoria}`

      const categoriaId = await obterCategoriaId(categoria, modulo, i + 1)

      // idempotência
      const existenteId = await procedimentoExistente(categoriaId, titulo)
      let procId = existenteId
      if (existenteId && !FORCAR) {
        pulados++
        console.log(`• pulado (já existe): ${titulo}`)
        continue
      }

      if (existenteId && FORCAR) {
        // limpa passos antigos e atualiza o procedimento
        await supabase.from('faq_passos').delete().eq('procedimento_id', existenteId)
        await supabase.from('faq_procedimentos').update({
          descricao: parsed.descricao || null,
          caminho_menu: caminho,
          updated_at: new Date().toISOString()
        }).eq('id', existenteId)
      } else {
        const { data: proc, error: errProc } = await supabase
          .from('faq_procedimentos')
          .insert({
            categoria_id: categoriaId,
            titulo,
            descricao: parsed.descricao || null,
            caminho_menu: caminho,
            ordem: i + 1,
            criado_por_nome: 'Importação de manuais'
          })
          .select()
          .single()
        if (errProc) throw errProc
        procId = proc.id
      }
      okProc++

      // passos + imagens
      const linhasPasso = []
      let ordem = 1
      for (let k = 0; k < parsed.passos.length; k++) {
        const ps = parsed.passos[k]
        let imagem_url = null
        if (ps.imagem?.buffer) {
          imagem_url = await subirImagem(ps.imagem.buffer, nomeBase, ordem)
          okImg++
        }
        linhasPasso.push({ procedimento_id: procId, ordem, texto: ps.texto || '', imagem_url })
        ordem++
      }
      if (linhasPasso.length) {
        const { error: errPassos } = await supabase.from('faq_passos').insert(linhasPasso)
        if (errPassos) throw errPassos
        okPasso += linhasPasso.length
      }

      console.log(`✅ ${arq.padEnd(50)} | ${caminho} | passos=${linhasPasso.length}`)
    } catch (e) {
      falhas++
      console.log(`❌ ${arq.padEnd(50)} | ERRO: ${e.message}`)
    }
  }

  console.log(`\n==== RESUMO ====`)
  console.log(`Procedimentos gravados: ${okProc}`)
  console.log(`Passos inseridos:       ${okPasso}`)
  console.log(`Imagens enviadas:       ${okImg}`)
  console.log(`Pulados (já existiam):  ${pulados}`)
  console.log(`Falhas:                 ${falhas}`)
}

main().catch(err => { console.error('Falha geral:', err); process.exit(1) })
