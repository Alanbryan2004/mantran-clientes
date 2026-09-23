import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const { data: users } = await supabase
    .from('usuario')
    .select('id, nome, login, perfil')

  console.log('Usuários do sistema:', users)

  // Verificar histórico da R&B
  const { data: imps } = await supabase
    .from('implantacoes')
    .select('id, nome_empresa, created_at')
    .ilike('nome_empresa', '%R&B%')

  if (imps && imps[0]) {
    const { data: hists } = await supabase
      .from('implantacao_historico')
      .select('*')
      .eq('implantacao_id', imps[0].id)
      .order('data_hora', { ascending: true })

    console.log('Histórico atual da R&B:', hists)
  }
}

main()
