import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
  console.log('=== Verificando Perfil Comercial no Supabase ===')
  
  // 1. Verificar tabela perfil_permissoes
  const { data: perms, error: permErr } = await supabase
    .from('perfil_permissoes')
    .select('*')

  if (permErr) {
    console.log('Tabela perfil_permissoes:', permErr.message)
  } else {
    console.log('Permissões existentes:', perms)
  }

  // 2. Inserir ou atualizar Comercial em perfil_permissoes
  const { data: upsertData, error: upsertErr } = await supabase
    .from('perfil_permissoes')
    .upsert({
      perfil: 'Comercial',
      rotas_permitidas: ['/implantacoes'],
      projeto_id_permitido: null,
      read_only: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'perfil' })
    .select()

  if (upsertErr) {
    console.log('Erro ao upsert perfil_permissoes:', upsertErr.message)
  } else {
    console.log('✅ Perfil Comercial configurado em perfil_permissoes no Supabase!', upsertData)
  }

  // 3. Verificar se existe constraint de perfil na tabela usuario
  const { data: users, error: userErr } = await supabase
    .from('usuario')
    .select('id, nome, login, perfil')
    .limit(5)

  console.log('Exemplo de usuários existentes:', users)
}

test()
