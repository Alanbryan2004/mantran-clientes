import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase.from('notificacoes').select('*').limit(5)
  if (error) {
    console.log('Tabela notificacoes no Supabase:', error.message)
  } else {
    console.log('Tabela notificacoes existe! Registros:', data)
  }
}

test()
