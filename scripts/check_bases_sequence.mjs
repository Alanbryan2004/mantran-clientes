import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: bases, error } = await supabase
    .from('bases')
    .select('nome_base, cliente_id, clientes(nome_empresa, tipo)')
    .order('nome_base', { ascending: true })

  if (error) {
    console.error('Erro ao buscar bases:', error)
    return
  }

  const matches = []
  bases.forEach(b => {
    const match = b.nome_base.match(/^dbMantran(\d+)$/i)
    if (match) {
      const num = parseInt(match[1], 10)
      const clienteTipo = Array.isArray(b.clientes) ? b.clientes[0]?.tipo : b.clientes?.tipo
      const clienteNome = Array.isArray(b.clientes) ? b.clientes[0]?.nome_empresa : b.clientes?.nome_empresa
      matches.push({ nome: b.nome_base, num, clienteTipo, clienteNome })
    } else {
      console.log('Base com formato diferente:', b.nome_base)
    }
  })

  // Sort matches by num desc
  matches.sort((a, b) => b.num - a.num)
  console.log('\n--- Maiores 10 bases numericas ---')
  console.log(matches.slice(0, 10))
}

test()
