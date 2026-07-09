import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

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
  console.log('Buscando clientes para converter para maiúsculas...')
  const { data, error } = await supabase.from('clientes').select('id, nome_empresa')
  
  if (error) {
    console.error('Erro:', error)
    return
  }

  let count = 0
  for (const c of data) {
    const uppercased = c.nome_empresa.toUpperCase()
    if (c.nome_empresa !== uppercased) {
      await supabase.from('clientes').update({ nome_empresa: uppercased }).eq('id', c.id)
      console.log(`Atualizado: ${c.nome_empresa} -> ${uppercased}`)
      count++
    }
  }
  console.log(`Concluído! ${count} empresas foram atualizadas para letras maiúsculas.`)
}

run()
