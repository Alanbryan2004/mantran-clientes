import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function check() {
    // All tables that exist in DAB/SQL Server
    const tables = [
      'usuario',
      'clientes',
      'bases',
      'usuarios_gpo',
      'modulos',
      'modulos_mantran',
      'projetos',
      'projeto_colunas',
      'projeto_bases',
      'projeto_dados',
      'leo_empresas',
      'leo_usuarios',
      'leo_modulos',
    ]
    
    console.log('=== Status das Tabelas no Supabase ===\n')
    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
        if (error) {
            console.log(`❌ ${t.padEnd(20)} -> ERRO: ${error.message}`)
        } else {
            console.log(`✅ ${t.padEnd(20)} -> ${count} registros`)
        }
    }
    console.log('\n=== Fim ===')
}
check()
