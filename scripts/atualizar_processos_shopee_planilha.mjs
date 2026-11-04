import { createClient } from '@supabase/supabase-js'
import xlsx from 'xlsx'
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

async function main() {
  console.log('🚀 Iniciando atualização dos Processos Shopee a partir da planilha...\n')

  // 1. Ler planilha
  const planilhaPath = path.resolve(__dirname, '..', 'public', 'Processos_Shopee.xlsx')
  if (!fs.existsSync(planilhaPath)) {
    console.error('Planilha não encontrada:', planilhaPath)
    process.exit(1)
  }

  const fileBuffer = fs.readFileSync(planilhaPath)
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(sheet)
  console.log(`📄 Planilha carregada: ${rows.length} registros encontrados na aba "${workbook.SheetNames[0]}".`)

  // 2. Buscar bases e clientes no Supabase
  const { data: bases, error: errB } = await supabase.from('bases').select('id, nome_base, cliente_id')
  if (errB) throw errB

  const { data: clientes, error: errC } = await supabase.from('clientes').select('id, nome_empresa, tipo, processos_shopee')
  if (errC) throw errC

  const { data: implantacoes, error: errI } = await supabase.from('implantacoes').select('id, cliente_id, nome_empresa, tipo_cliente, operacoes_shopee')
  if (errI) throw errI

  const clientesMap = new Map()
  clientes.forEach(c => clientesMap.set(c.id, c))

  const basesMap = new Map()
  bases.forEach(b => basesMap.set((b.nome_base || '').trim().toLowerCase(), b))

  let atualizadosSupabaseClientes = 0
  let atualizadosSupabaseImplantacoes = 0
  let semCliente = 0
  const dadosParaSqlServer = []

  console.log('🔄 Processando registros e atualizando Supabase...')

  for (const r of rows) {
    const nomeBase = String(r['Nome da Base'] || '').trim()
    const fm = String(r['First Mile'] || '').trim().toUpperCase()
    const lh = String(r['Line Haul'] || '').trim().toUpperCase()
    const lm = String(r['Last Mile'] || '').trim().toUpperCase()
    const mh = String(r['Mobile Hub'] || '').trim().toUpperCase()

    const processos = []
    if (fm === 'S' || fm === 'SIM') processos.push('First Mile')
    if (lh === 'S' || lh === 'SIM') processos.push('Line Haul')
    if (lm === 'S' || lm === 'SIM') processos.push('Last Mile')
    if (mh === 'S' || mh === 'SIM') processos.push('Mobile Hub')

    const base = basesMap.get(nomeBase.toLowerCase())
    if (!base || !base.cliente_id) {
      semCliente++
      continue
    }

    const cliente = clientesMap.get(base.cliente_id)
    if (!cliente) {
      semCliente++
      continue
    }

    // Atualiza cliente no Supabase se for Shopee ou se tiver processos
    const isShopee = cliente.tipo === 'SHOPEE' || processos.length > 0
    if (isShopee) {
      const { error: errUpd } = await supabase
        .from('clientes')
        .update({ processos_shopee: processos })
        .eq('id', cliente.id)

      if (errUpd) {
        console.error(`❌ Erro ao atualizar cliente ${cliente.nome_empresa} (${nomeBase}):`, errUpd.message)
      } else {
        atualizadosSupabaseClientes++
      }

      // Sincronizar em implantacoes se houver
      const imp = implantacoes.find(i => 
        i.cliente_id === cliente.id || 
        (i.nome_empresa && cliente.nome_empresa && i.nome_empresa.trim().toLowerCase() === cliente.nome_empresa.trim().toLowerCase())
      )

      if (imp) {
        const { error: errImp } = await supabase
          .from('implantacoes')
          .update({ operacoes_shopee: processos })
          .eq('id', imp.id)

        if (!errImp) {
          atualizadosSupabaseImplantacoes++
        }
      }

      dadosParaSqlServer.push({
        clienteId: cliente.id,
        nomeBase,
        nomeEmpresa: cliente.nome_empresa,
        tipo: cliente.tipo,
        processos,
        processosJson: JSON.stringify(processos),
        implantacaoId: imp ? imp.id : null
      })
    }
  }

  console.log(`\n✅ Supabase atualizado com sucesso!`)
  console.log(`   - Clientes atualizados: ${atualizadosSupabaseClientes}`)
  console.log(`   - Implantações sincronizadas: ${atualizadosSupabaseImplantacoes}`)
  console.log(`   - Bases sem cliente alocado: ${semCliente}`)

  // Salvar dados em arquivo temporário para sincronizar com SQL Server via PowerShell
  const tmpJsonPath = path.resolve(__dirname, '..', 'scratch', 'processos_para_sql_server.json')
  fs.mkdirSync(path.dirname(tmpJsonPath), { recursive: true })
  fs.writeFileSync(tmpJsonPath, JSON.stringify(dadosParaSqlServer, null, 2), 'utf8')
  console.log(`📁 Dados preparados para SQL Server salvos em: ${tmpJsonPath}`)
}

main().catch(err => {
  console.error('Erro na execução:', err)
  process.exit(1)
})
