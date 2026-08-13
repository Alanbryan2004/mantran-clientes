import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from('leo_empresas')
    .update({ ativo: true })
    .eq('cd_empresa', '002')
    .select()

  if (error) {
    console.log('Coluna ativo precisa ser criada no banco Supabase:', error.message)
  } else {
    console.log('Coluna ativo já existe e foi atualizada:', data)
  }
}

test()
