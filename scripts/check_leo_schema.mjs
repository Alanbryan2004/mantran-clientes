import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from('leo_empresas')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching leo_empresas:', error)
  } else {
    console.log('Leo empresas sample row:', data)
  }
}

test()
