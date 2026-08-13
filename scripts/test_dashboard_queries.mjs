import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDashboard() {
  console.log("Testing getProjetosAtivos...")
  const { data: projs, error: errProjs } = await supabase.from('projetos').select('*').eq('status', 'Em Andamento')
  if (errProjs) console.error("❌ errProjs:", errProjs.message)
  else console.log(`✅ getProjetosAtivos: ${projs.length}`)

  console.log("Testing getProjetoColunas...")
  const { data: cols, error: errCols } = await supabase.from('projeto_colunas').select('*')
  if (errCols) console.error("❌ errCols:", errCols.message)
  else console.log(`✅ getProjetoColunas: ${cols.length}`)

  console.log("Testing getProjetoBases...")
  const { data: pb, error: errPb } = await supabase.from('projeto_bases').select('*')
  if (errPb) console.error("❌ errPb:", errPb.message)
  else console.log(`✅ getProjetoBases: ${pb.length}`)

  console.log("Testing getProjetoDados...")
  const { data: pd, error: errPd } = await supabase.from('projeto_dados').select('*')
  if (errPd) console.error("❌ errPd:", errPd.message)
  else console.log(`✅ getProjetoDados: ${pd.length}`)
}

testDashboard()
