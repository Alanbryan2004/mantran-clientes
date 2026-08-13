import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from('implantacao_historico')
    .select('*')
    .limit(5)

  if (error) {
    console.log('Tabela ainda não criada no Supabase:', error.message)
  } else {
    console.log('Tabela existe! Registros:', data)
  }
}

test()
