import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const { data, error } = await supabase
    .from('implantacao_historico')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Erro ao ler implantacao_historico:', error)
  } else {
    console.log('Colunas de implantacao_historico:', data && data[0] ? Object.keys(data[0]) : 'Vazio')
    console.log('Exemplo:', data)
  }
}

main()
