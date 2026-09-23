import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const { data, error } = await supabase
    .from('implantacoes')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Erro ao ler implantacoes:', error)
  } else {
    console.log('Colunas de implantacoes:', data && data[0] ? Object.keys(data[0]) : 'Tabela vazia')
    console.log('Exemplo de linha:', data && data[0])
  }
}

main()
