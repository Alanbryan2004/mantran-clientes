// ============================================================
// Corrige o status persistido de implantações cujas etapas estão TODAS
// concluídas (OK ou ERRO documentado) mas o status ficou 'Em Andamento'.
// Alinha o banco à regra de encerramento usada nas telas.
//
// Uso:
//   node scripts/corrigir_status_implantacoes.mjs          (dry-run: só lista)
//   node scripts/corrigir_status_implantacoes.mjs --aplicar (grava status='Concluído')
// ============================================================
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' }); dotenv.config({ path: '.env' })

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const APLICAR = process.argv.includes('--aplicar')

const concl = (v) => { const u = (v || '').trim().toUpperCase(); return u === 'OK' || u === 'ERRO' }

const { data: impls, error: e1 } = await s.from('implantacoes').select('id, nome_empresa, status')
if (e1) { console.error(e1.message); process.exit(1) }
const { data: etapas, error: e2 } = await s.from('implantacao_etapas').select('implantacao_id, valor')
if (e2) { console.error(e2.message); process.exit(1) }

const porImpl = {}
etapas.forEach(e => { (porImpl[e.implantacao_id] = porImpl[e.implantacao_id] || []).push(e.valor) })

const alvos = impls.filter(i => {
  const es = porImpl[i.id] || []
  const todas = es.length > 0 && es.every(concl)
  return todas && i.status !== 'Concluído'
})

console.log(`Implantações divergentes (todas etapas OK/ERRO mas status != 'Concluído'): ${alvos.length}`)
alvos.forEach(a => console.log(`  - ${a.nome_empresa} (status atual: ${a.status})`))

if (!APLICAR) {
  console.log('\n(dry-run) Nenhuma alteração gravada. Rode com --aplicar para corrigir.')
  process.exit(0)
}

let ok = 0
for (const a of alvos) {
  const { error } = await s.from('implantacoes')
    .update({ status: 'Concluído', updated_at: new Date().toISOString() })
    .eq('id', a.id)
  if (error) console.log(`  ❌ ${a.nome_empresa}: ${error.message}`)
  else { ok++; console.log(`  ✅ ${a.nome_empresa} -> Concluído`) }
}
console.log(`\nAtualizadas: ${ok}/${alvos.length}`)
