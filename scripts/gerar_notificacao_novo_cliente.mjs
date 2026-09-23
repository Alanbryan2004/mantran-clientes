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
    .select('id, nome_empresa, tipo_cliente, cliente_id, analista_responsavel, bases(nome_base)')
    .ilike('nome_empresa', '%R&B%')

  if (impErr) {
    console.error('Erro ao buscar:', impErr)
    return
  }

  const imp = imps && imps.length > 0 ? imps[0] : null
  const impId = imp ? imp.id : null
  const clienteId = imp ? imp.cliente_id : null
  const nomeEmpresa = imp ? imp.nome_empresa : 'R&B'
  const analista = imp ? imp.analista_responsavel : 'Junior'
  const baseName = (imp && imp.bases && imp.bases.nome_base) ? imp.bases.nome_base : 'dbMantran133'

  // Criar notificação de Novo Cliente / Nova Implantação
  const payload = {
    titulo: `🚀 Nova Implantação: ${nomeEmpresa}`,
    mensagem: `A implantação da empresa "${nomeEmpresa}" (Shopee) foi iniciada com sucesso. • Base: ${baseName} • Analista: ${analista}`,
    tipo: 'nova_implantacao',
    lida: false,
    implantacao_id: impId,
    cliente_id: clienteId,
    dados_extras: {
      nome_empresa: nomeEmpresa,
      tipo_cliente: 'SHOPEE',
      base: baseName,
      analista: analista
    }
  }

  const { data: notif, error: notifErr } = await supabase
    .from('notificacoes')
    .insert(payload)
    .select()

  if (notifErr) {
    console.error('Erro ao criar notificação:', notifErr)
  } else {
    console.log('✅ Notificação de Nova Implantação criada com sucesso!', notif)
  }
}

main()
