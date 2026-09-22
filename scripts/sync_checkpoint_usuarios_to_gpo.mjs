import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function syncUsers() {
  console.log('=== Sincronizando Usuários do Checkpoint para usuarios_gpo ===\n')

  // 1. Buscar todos os checkpoints
  const { data: checkpoints, error: cpErr } = await supabase
    .from('implantacao_checkpoint')
    .select('id, implantacao_id, dados')

  if (cpErr) {
    console.error('Erro ao buscar checkpoints:', cpErr)
    return
  }

  console.log(`Encontrados ${checkpoints.length} checkpoints.`)

  for (const cp of checkpoints) {
    const implantacaoId = cp.implantacao_id
    const dados = cp.dados
    const usuarios = dados?.usuarios || []

    if (usuarios.length === 0) continue

    // Buscar dados da implantacao
    const { data: imp, error: impErr } = await supabase
      .from('implantacoes')
      .select(`
        id, 
        nome_empresa, 
        cliente_id, 
        base_id,
        bases ( id, nome_base )
      `)
      .eq('id', implantacaoId)
      .single()

    if (impErr || !imp) {
      console.warn(`Implantação ${implantacaoId} não encontrada.`)
      continue
    }

    // Identificar o cliente_id
    let clienteId = imp.cliente_id
    if (!clienteId && imp.nome_empresa) {
      const { data: clis } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nome_empresa', imp.nome_empresa)
        .limit(1)
      if (clis && clis.length > 0) {
        clienteId = clis[0].id
      }
    }

    if (!clienteId) {
      console.warn(`Cliente não encontrado para empresa: ${imp.nome_empresa}`)
      continue
    }

    // Determinar a senha padrão baseada na base alocada
    const nomeBase = imp.bases?.nome_base || imp.base_id || ''
    const baseDigits = nomeBase.replace(/\D/g, '')
    const senhaPadrao = baseDigits ? `${baseDigits}@Mantran` : `${imp.nome_empresa.replace(/\s+/g, '')}@Mantran`

    console.log(`\nEmpresa: ${imp.nome_empresa} | ClienteId: ${clienteId} | Base: ${nomeBase} | Senha Padrão: ${senhaPadrao}`)

    // Buscar usuarios_gpo existentes
    const { data: existingUsers } = await supabase
      .from('usuarios_gpo')
      .select('*')
      .eq('cliente_id', clienteId)

    const existingLogins = (existingUsers || []).map(u => (u.login || '').trim().toLowerCase())

    for (const u of usuarios) {
      const login = (u.nome || '').trim()
      if (!login) continue

      if (existingLogins.includes(login.toLowerCase())) {
        console.log(`  - Usuário "${login}" já existe em usuarios_gpo.`)
      } else {
        const { error: insErr } = await supabase
          .from('usuarios_gpo')
          .insert({
            cliente_id: clienteId,
            login: login,
            senha: senhaPadrao
          })

        if (insErr) {
          console.error(`  ❌ Erro ao inserir usuário "${login}":`, insErr.message)
        } else {
          console.log(`  ✅ Usuário "${login}" inserido com sucesso com senha "${senhaPadrao}"!`)
        }
      }
    }
  }

  console.log('\n=== Sincronização Finalizada ===')
}

syncUsers()
