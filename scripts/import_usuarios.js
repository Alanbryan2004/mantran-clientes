import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Carregar variáveis de ambiente
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

let supabaseUrl = ''
let supabaseKey = ''

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim()
})

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Iniciando importação de usuários...')
  
  const txtPath = path.resolve(process.cwd(), 'usuariosClientes.txt')
  const txtContent = fs.readFileSync(txtPath, 'utf-8')
  
  const lines = txtContent.split('\n').filter(line => line.trim() !== '')
  
  // Pula a primeira linha (cabeçalho)
  const usersToProcess = lines.slice(1)
  
  console.log(`Encontrados ${usersToProcess.length} usuários no arquivo.`)

  // Fazer cache das bases para não fazer 1300 consultas iguais no Supabase
  const { data: basesData } = await supabase.from('bases').select('id, nome_base, cliente_id')
  
  // Criar um mapa rápido: '056' -> cliente_id
  const baseToClienteId = {}
  if (basesData) {
    for (const b of basesData) {
      if (b.cliente_id) {
        // Extrai o número da base, ex: dbMantran056 -> '056'
        const baseNum = b.nome_base.replace('dbMantran', '')
        baseToClienteId[baseNum] = b.cliente_id
      }
    }
  }

  let countSuccess = 0
  let countError = 0
  let countNotFound = 0

  const usersToInsert = []

  for (let i = 0; i < usersToProcess.length; i++) {
    const line = usersToProcess[i]
    // A divisão pode ser por tabulação (\t)
    const parts = line.split('\t')
    if (parts.length < 2) continue

    const login = parts[0].trim()
    const senha = parts[1].trim()
    
    // Extrai a base da senha (ex: 056@Mantran -> 056)
    const match = senha.match(/^(\d{3})@Mantran/i)
    
    if (match && match[1]) {
      const baseNum = match[1]
      const clienteId = baseToClienteId[baseNum]
      
      if (clienteId) {
        usersToInsert.push({
          cliente_id: clienteId,
          login: login,
          senha: senha
        })
      } else {
        countNotFound++
      }
    } else {
      // Se não tem padrão de base, ignora ou tenta achar? O usuário disse:
      // "se a senha for 056@Mantran entao ele pertence a base dbMantran056"
    }
  }

  console.log(`Preparando para inserir ${usersToInsert.length} usuários vinculados com sucesso...`)

  // Inserir em lotes de 100 para evitar timeout
  const batchSize = 100
  for (let i = 0; i < usersToInsert.length; i += batchSize) {
    const batch = usersToInsert.slice(i, i + batchSize)
    const { error } = await supabase.from('usuarios_gpo').insert(batch)
    if (error) {
      console.error('Erro ao inserir lote:', error)
      countError += batch.length
    } else {
      countSuccess += batch.length
      console.log(`Lote inserido: ${i + batch.length}/${usersToInsert.length}`)
    }
  }

  console.log('\n--- RESUMO ---')
  console.log(`✅ Sucesso: ${countSuccess}`)
  console.log(`❌ Erro: ${countError}`)
  console.log(`⚠️ Base não encontrada ou sem cliente: ${countNotFound}`)
}

run()
