import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  // 1. Recriar as duas notificações da R&B para teste imediato
  const { data: imps } = await supabase
    .from('implantacoes')
    .select('id, nome_empresa, tipo_cliente, cliente_id, analista_responsavel, bases(nome_base)')
    .ilike('nome_empresa', '%R&B%')

  const imp = imps && imps.length > 0 ? imps[0] : null
  const impId = imp ? imp.id : null
  const clienteId = imp ? imp.cliente_id : null
  const nomeEmpresa = imp ? imp.nome_empresa : 'R&B'
  const analista = imp ? imp.analista_responsavel : 'Junior'
  const baseName = (imp && imp.bases && imp.bases.nome_base) ? imp.bases.nome_base : 'dbMantran133'

  // Notificação 1: Nova Implantação
  await supabase.from('notificacoes').insert({
    titulo: `🚀 Nova Implantação: ${nomeEmpresa}`,
    mensagem: `A implantação da empresa "${nomeEmpresa}" (Shopee) foi iniciada com sucesso. • Base: ${baseName} • Analista: ${analista}`,
    tipo: 'nova_implantacao',
    lida: false,
    implantacao_id: impId,
    cliente_id: clienteId,
    dados_extras: {
      base: baseName,
      analista: analista,
      nome_empresa: nomeEmpresa,
      tipo_cliente: 'SHOPEE'
    }
  })

  // Notificação 2: Checkpoint Preenchido
  await supabase.from('notificacoes').insert({
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
  })

  console.log('✅ Notificações recriadas com sucesso no banco de dados!')
}

main()
