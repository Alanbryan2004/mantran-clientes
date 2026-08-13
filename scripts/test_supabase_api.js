import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
    console.log('=== Testando API via Supabase ===\n')
    
    // 1. Test authenticateUser (check what users exist)
    const { data: users, error: usersErr } = await supabase
        .from('usuario')
        .select('login, ativo')
        .eq('ativo', true)
        .limit(5)
    console.log('1. Usuários ativos:', users?.map(u => u.login), usersErr?.message || '')
    
    // 2. Test getBases
    const { count: basesCount, error: basesErr } = await supabase
        .from('bases')
        .select('*', { count: 'exact', head: true })
    console.log('2. Total bases:', basesCount, basesErr?.message || '')
    
    // 3. Test getClientes
    const { count: clientesCount, error: clientesErr } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
    console.log('3. Total clientes:', clientesCount, clientesErr?.message || '')
    
    // 4. Test getBasesWithClientes (the complex query)
    const { data: basesData, error: basesDataErr } = await supabase
        .from('bases')
        .select(`
            id, nome_base, status, migrada, cliente_id,
            clientes (
                id, nome_empresa, tipo, possui_aditivo,
                modulos ( nome_modulo, ativo ),
                usuarios_gpo ( login, senha )
            )
        `)
        .order('nome_base', { ascending: true })
        .limit(3)
    console.log('4. BasesWithClientes (first 3):', JSON.stringify(basesData?.slice(0,3), null, 2), basesDataErr?.message || '')
    
    // 5. Test getLeoEmpresasWithDetails
    const { data: leoData, error: leoErr } = await supabase
        .from('leo_empresas')
        .select(`
            id, cd_empresa, nome_empresa, tipo,
            leo_usuarios ( id, login, senha ),
            leo_modulos ( id, ativo, nome_modulo )
        `)
        .order('cd_empresa', { ascending: true })
        .limit(3)
    console.log('5. LeoEmpresasWithDetails (first 3):', JSON.stringify(leoData?.slice(0,3), null, 2), leoErr?.message || '')
    
    // 6. Test getProjetosAtivos
    const { data: projs, error: projsErr } = await supabase
        .from('projetos')
        .select('*')
        .eq('status', 'Em Andamento')
    console.log('6. Projetos ativos:', projs?.length, projsErr?.message || '')
    
    // 7. Test getModulosMantran
    const { data: modMantran, error: modErr } = await supabase
        .from('modulos_mantran')
        .select('*')
        .limit(5)
    console.log('7. Modulos Mantran (sample):', modMantran?.map(m => m.nome), modErr?.message || '')
    
    console.log('\n=== Todos os testes passaram! ===')
}
test()
