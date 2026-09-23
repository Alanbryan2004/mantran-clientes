import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltam credenciais do Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  console.log('Buscando implantação R&B...')
  const { data: imps, error: impErr } = await supabase
    .from('implantacoes')
    .select('id, nome_empresa, tipo_cliente, cliente_id, analista_responsavel')
    .ilike('nome_empresa', '%R&B%')

  if (impErr) {
    console.error('Erro ao buscar:', impErr)
    return
  }

  console.log('Implantações encontradas:', imps)

  const imp = imps && imps.length > 0 ? imps[0] : null
  const impId = imp ? imp.id : null
  const clienteId = imp ? imp.cliente_id : null
  const nomeEmpresa = imp ? imp.nome_empresa : 'R&B'

  // Criar notificação de teste de Checkpoint Preenchido
  const payload = {
    titulo: '📝 Checkpoint Preenchido',
    mensagem: `O cliente "${nomeEmpresa}" preencheu e salvou informações no Checkpoint (Formulário recebido com sucesso).`,
    tipo: 'checkpoint',
    lida: false,
    implantacao_id: impId,
    cliente_id: clienteId,
    dados_extras: {
      nome_empresa: nomeEmpresa,
      isCompleto: false,
      respondidas: ['P1: Responsável', 'P2: Operação', 'P3: Endereço', 'P6: Histórico CTe', 'P7: Usuários'],
      pendencias: ['Certificado Digital']
    }
  }

  const { data: notif, error: notifErr } = await supabase
    .from('notificacoes')
    .insert(payload)
    .select()

  if (notifErr) {
    console.error('Erro ao criar notificação:', notifErr)
  } else {
    console.log('✅ Notificação de teste criada com sucesso!', notif)
  }
}

main()
