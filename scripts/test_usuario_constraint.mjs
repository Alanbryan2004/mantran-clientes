import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function testUserConstraint() {
  const { data, error } = await supabase
    .from('usuario')
    .insert({
      nome: 'Teste Comercial',
      login: 'teste_comercial_temp',
      senha: '123',
      perfil: 'Comercial',
      ativo: false,
      e_tecnico: false,
      meta_semanal: 0
    })
    .select()

  if (error) {
    console.log('Erro ao inserir com perfil Comercial:', error.message)
  } else {
    console.log('✅ Inserido com sucesso! Removendo registro de teste...')
    await supabase.from('usuario').delete().eq('login', 'teste_comercial_temp')
    console.log('✅ Removido!')
  }
}

testUserConstraint()
