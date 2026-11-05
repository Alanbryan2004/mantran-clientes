import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim()
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim()

if (!supabaseUrl || !supabaseKey) {
  console.error('Credenciais Supabase não encontradas no .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const jsonPath = path.resolve(__dirname, '..', 'scratch', 'shopee_dados_completos.json')
  if (!fs.existsSync(jsonPath)) {
    console.error('Arquivo não encontrado:', jsonPath)
    process.exit(1)
  }

  let raw = fs.readFileSync(jsonPath, 'utf8')
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1)
  }
  const { transportadoras, processamentos } = JSON.parse(raw)

  console.log(`Carregados do JSON: ${transportadoras.length} transportadoras e ${processamentos.length} processamentos.`)

  // Buscar clientes existentes para validar integridade da FK
  const { data: clientesExistentes } = await supabase.from('clientes').select('id')
  const setClientes = new Set((clientesExistentes || []).map(c => c.id))

  // 1. Inserir transportadoras
  console.log('\n--- Inserindo shopee_transportadoras no Supabase ---')
  const BATCH_SIZE = 50

  let transpInseridas = 0
  for (let i = 0; i < transportadoras.length; i += BATCH_SIZE) {
    const batch = transportadoras.slice(i, i + BATCH_SIZE).map(t => ({
      id: t.id,
      cliente_id: (t.cliente_id && setClientes.has(t.cliente_id)) ? t.cliente_id : null,
      base_id: t.base_id || null,
      nome_empresa: t.nome_empresa,
      nome_base: t.nome_base || null,
      cnpj: t.cnpj || null,
      ativo: t.ativo !== false,
      created_at: t.created_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString()
    }))

    const { error } = await supabase
      .from('shopee_transportadoras')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`Erro no lote de transportadoras ${i}-${i + batch.length}:`, error)
      process.exit(1)
    }
    transpInseridas += batch.length
    console.log(`Lote ${transpInseridas}/${transportadoras.length} transportadoras processado.`)
  }

  // 2. Inserir processamentos
  console.log('\n--- Inserindo shopee_processamentos no Supabase ---')
  let procInseridos = 0
  for (let i = 0; i < processamentos.length; i += BATCH_SIZE) {
    const batch = processamentos.slice(i, i + BATCH_SIZE).map(p => ({
      id: p.id,
      transportadora_id: p.transportadora_id || null,
      nome_empresa: p.nome_empresa,
      nome_base: p.nome_base || null,
      cnpj: p.cnpj || null,
      quinzena: p.quinzena,
      mes: p.mes,
      ano: p.ano,
      processo: p.processo,
      status: p.status || 'NAO_INICIADO',
      segundos_processamento: p.segundos_processamento || 0,
      registros_processados: p.registros_processados || 0,
      data_inicio: p.data_inicio || null,
      data_fim: p.data_fim || null,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString()
    }))

    const { error } = await supabase
      .from('shopee_processamentos')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`Erro no lote de processamentos ${i}-${i + batch.length}:`, error)
      process.exit(1)
    }
    procInseridos += batch.length
    console.log(`Lote ${procInseridos}/${processamentos.length} processamentos processado.`)
  }

  // 3. Validação final
  const { count: countTransp } = await supabase.from('shopee_transportadoras').select('*', { count: 'exact', head: true })
  const { count: countProc } = await supabase.from('shopee_processamentos').select('*', { count: 'exact', head: true })

  console.log('\n=============================================')
  console.log(' MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
  console.log(` - shopee_transportadoras no Supabase: ${countTransp}`)
  console.log(` - shopee_processamentos no Supabase:  ${countProc}`)
  console.log('=============================================')
}

run().catch(err => {
  console.error('Erro na execução:', err)
  process.exit(1)
})
