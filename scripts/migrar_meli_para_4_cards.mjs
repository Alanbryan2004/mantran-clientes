// ============================================================
// Migra implantações MELI "legadas" (que têm apenas a etapa única
// "Mercado Livre") para o padrão de 4 cards, espelhando a NFSe:
//   1. Checkpoint   2. Configurar Base   3. Testes   4. Treinamento MELI
//
// A etapa "Mercado Livre" existente é convertida em "Checkpoint" (preserva o id
// e o vínculo do checkpoint MELI já salvo). O status do Checkpoint vira 'OK'
// quando o checkpoint MELI (client_id + client_secret) já está preenchido.
//
// Uso:
//   node scripts/migrar_meli_para_4_cards.mjs           (dry-run)
//   node scripts/migrar_meli_para_4_cards.mjs --aplicar  (grava)
// ============================================================
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' }); dotenv.config({ path: '.env' })
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const APLICAR = process.argv.includes('--aplicar')

const low = (v) => (v || '').trim().toLowerCase()

const { data: impls, error } = await s
  .from('implantacoes')
  .select('id, nome_empresa, implantacao_etapas ( id, nome_etapa, valor, ordem )')
if (error) { console.error(error.message); process.exit(1) }

// Legado = tem "Mercado Livre" e NÃO tem "Treinamento MELI"
const legados = (impls || []).filter(i => {
  const nomes = (i.implantacao_etapas || []).map(e => low(e.nome_etapa))
  return nomes.includes('mercado livre') && !nomes.includes('treinamento meli')
})

console.log(`Implantações MELI legadas encontradas: ${legados.length}`)
legados.forEach(i => console.log(`  - ${i.nome_empresa} [${i.id.slice(0, 8)}] etapas: ${(i.implantacao_etapas || []).map(e => e.nome_etapa).join(', ')}`))

if (!APLICAR) { console.log('\n(dry-run) Rode com --aplicar para migrar.'); process.exit(0) }

for (const impl of legados) {
  const etapaMeli = (impl.implantacao_etapas || []).find(e => low(e.nome_etapa) === 'mercado livre')
  if (!etapaMeli) continue

  // MELI preenchido? -> Checkpoint OK
  const { data: cp } = await s.from('implantacao_checkpoint').select('dados').eq('implantacao_id', impl.id).maybeSingle()
  const meli = cp?.dados?.meli
  const meliCompleto = !!(meli && (meli.client_id || '').trim() && (meli.client_secret || '').trim())

  // 1) Converte "Mercado Livre" -> "Checkpoint" (ordem 1)
  const { error: e1 } = await s.from('implantacao_etapas')
    .update({ nome_etapa: 'Checkpoint', ordem: 1, valor: meliCompleto ? 'OK' : (etapaMeli.valor || 'EM BRANCO') })
    .eq('id', etapaMeli.id)
  if (e1) { console.log(`  ❌ ${impl.nome_empresa}: ${e1.message}`); continue }

  // 2) Insere os demais cards
  const novos = [
    { implantacao_id: impl.id, nome_etapa: 'Configurar Base', valor: 'EM BRANCO', ordem: 2 },
    { implantacao_id: impl.id, nome_etapa: 'Testes', valor: 'EM BRANCO', ordem: 3 },
    { implantacao_id: impl.id, nome_etapa: 'Treinamento MELI', valor: 'EM BRANCO', ordem: 4 }
  ]
  const { error: e2 } = await s.from('implantacao_etapas').insert(novos)
  if (e2) { console.log(`  ❌ ${impl.nome_empresa} (inserir cards): ${e2.message}`); continue }

  console.log(`  ✅ ${impl.nome_empresa} migrada (Checkpoint ${meliCompleto ? 'OK' : 'pendente'} + 3 cards).`)
}
console.log('\nConcluído.')
