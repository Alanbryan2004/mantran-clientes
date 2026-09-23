import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  // Testar se a coluna criado_por já existe ou se podemos testar update nela
  const { data, error } = await supabase
    .from('implantacoes')
    .select('criado_por')
    .limit(1)

  if (error) {
    console.log('Coluna criado_por ainda não existe:', error.message)
  } else {
    console.log('Coluna criado_por já existe!', data)
  }
}

main()
