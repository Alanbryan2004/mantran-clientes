import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const { data: imps } = await supabase
    .from('implantacoes')
    .select('id, nome_empresa, created_at, bases(nome_base), analista_responsavel')
    .ilike('nome_empresa', '%R&B%')

  if (imps && imps[0]) {
    const imp = imps[0]
    const baseName = imp.bases?.nome_base || 'dbMantran133'
    const analista = imp.analista_responsavel || 'Junior'

    // Verificar se já existe histórico de criação
    const { data: existing } = await supabase
      .from('implantacao_historico')
      .select('*')
      .eq('implantacao_id', imp.id)
      .ilike('texto', '%Implantação criada%')

    if (!existing || existing.length === 0) {
      await supabase.from('implantacao_historico').insert({
        implantacao_id: imp.id,
        data_hora: imp.created_at || new Date().toISOString(),
        texto: `Implantação criada no sistema na Base ${baseName} para o cliente "${imp.nome_empresa}" (Shopee) • Analista: ${analista}.`,
        usuario_nome: 'Lucas',
        usuario_id: '7c91eabc-58b8-46f1-bf13-e959bd03cdd5' // ID do Lucas
      })
      console.log('✅ Histórico de criação da R&B registrado com sucesso por Lucas!')
    } else {
      console.log('Histórico de criação já existia:', existing)
    }
  }
}

main()
