import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Testando tabelas rh_ferias e rh_faltas_atestados no Supabase...')
  
  const { data: fData, error: fErr } = await supabase
    .from('rh_ferias')
    .select('*')
    .limit(1)

  if (fErr) {
    console.log('Tabela rh_ferias ainda não existe no Supabase:', fErr.message)
  } else {
    console.log('✅ Tabela rh_ferias pronta no Supabase!')
  }

  const { data: aData, error: aErr } = await supabase
    .from('rh_faltas_atestados')
    .select('*')
    .limit(1)

  if (aErr) {
    console.log('Tabela rh_faltas_atestados ainda não existe no Supabase:', aErr.message)
  } else {
    console.log('✅ Tabela rh_faltas_atestados pronta no Supabase!')
  }
}

test()
