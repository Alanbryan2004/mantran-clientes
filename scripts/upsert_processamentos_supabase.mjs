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
  console.error('Credenciais do Supabase não encontradas no .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const jsonPath = path.resolve(__dirname, '..', 'scratch', 'shopee_processamentos_sql_server.json')
  if (!fs.existsSync(jsonPath)) {
    console.error('Arquivo JSON não encontrado:', jsonPath)
    process.exit(1)
  }

  let raw = fs.readFileSync(jsonPath, 'utf8')
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1)
  }
  const processamentos = JSON.parse(raw)

  console.log(`Carregados do SQL Server: ${processamentos.length} registros de shopee_processamentos.`)

  // Contagem antes no Supabase
  const { count: countAntes } = await supabase
    .from('shopee_processamentos')
    .select('*', { count: 'exact', head: true })
  console.log(`Contagem atual no Supabase (antes da sincronização): ${countAntes}`)

  const BATCH_SIZE = 50
  let totalProcessado = 0

  console.log('\n--- Realizando UPSERT (Insert & Update) no Supabase ---')

  for (let i = 0; i < processamentos.length; i += BATCH_SIZE) {
    const chunk = processamentos.slice(i, i + BATCH_SIZE).map(p => ({
      id: p.id,
      transportadora_id: p.transportadora_id || null,
      nome_empresa: p.nome_empresa,
      nome_base: p.nome_base || null,
      cnpj: p.cnpj || null,
      quinzena: Number(p.quinzena),
      mes: Number(p.mes),
      ano: Number(p.ano),
      processo: p.processo,
      status: p.status || 'NAO_INICIADO',
      segundos_processamento: Number(p.segundos_processamento) || 0,
      registros_processados: Number(p.registros_processados) || 0,
      data_inicio: p.data_inicio || null,
      data_fim: p.data_fim || null,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString()
    }))

    const { error } = await supabase
      .from('shopee_processamentos')
      .upsert(chunk, { onConflict: 'id' })

    if (error) {
      console.error(`Erro no lote ${i} - ${i + chunk.length}:`, error)
      process.exit(1)
    }

    totalProcessado += chunk.length
    process.stdout.write(`Progresso: ${totalProcessado}/${processamentos.length} registros sincronizados...\r`)
  }

  console.log(`\nTodos os ${totalProcessado} registros foram sincronizados com sucesso no Supabase!`)

  // Contagem depois no Supabase
  const { count: countDepois } = await supabase
    .from('shopee_processamentos')
    .select('*', { count: 'exact', head: true })

  // Amostra de status recentes
  const { data: ultimos } = await supabase
    .from('shopee_processamentos')
    .select('nome_empresa, processo, status, quinzena, mes, ano, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)

  console.log('\n=============================================')
  console.log(' SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!')
  console.log(` - Registros antes:  ${countAntes}`)
  console.log(` - Registros depois: ${countDepois}`)
  console.log(' - Últimos registros atualizados/inseridos:')
  console.table(ultimos)
  console.log('=============================================')
}

run().catch(err => {
  console.error('Falha geral na execução:', err)
  process.exit(1)
})
