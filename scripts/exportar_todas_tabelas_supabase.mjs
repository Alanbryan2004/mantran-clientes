import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim()
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim()

if (!supabaseUrl || !supabaseKey) {
  console.error('Credenciais Supabase não encontradas no .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const exportDir = path.resolve(__dirname, '..', 'scratch', 'supabase_export')
fs.mkdirSync(exportDir, { recursive: true })

// Tabelas ordenadas para sincronização
const tabelas = [
  'perfil_permissoes',
  'usuario',
  'clientes',
  'bases',
  'clientes_desativados',
  'empresa_vinculos',
  'modulos',
  'modulos_mantran',
  'usuarios_gpo',
  'config_email',
  'leo_empresas',
  'leo_usuarios',
  'leo_modulos',
  'implantacoes',
  'implantacao_etapas',
  'implantacao_checkpoint',
  'implantacao_historico',
  'implantacao_nfse_exemplos',
  'projetos',
  'projeto_bases',
  'projeto_colunas',
  'projeto_dados',
  'ranking',
  'notificacoes',
  'notificacao_status',
  'email_campanhas',
  'email_envios',
  'email_descadastros',
  'faq_categorias',
  'faq_procedimentos',
  'faq_passos',
  'calendario_eventos',
  'calendario_convidados',
  'calendario_lembretes',
  'comercial_metas',
  'comercial_oportunidades',
  'rh_jornada',
  'rh_ponto',
  'rh_faltas_atestados',
  'rh_ferias',
  'rh_home_office',
  'rh_plantoes',
  'rh_dayoff',
  'ticket_departamentos',
  'ticket_tipos',
  'ticket_classificacoes',
  'ticket_grupos',
  'ticket_contatos',
  'tickets',
  'ticket_mensagens',
  'ticket_anexos',
  'ticket_historico',
  'shopee_transportadoras',
  'shopee_processamentos'
]

async function exportarTabela(tabela) {
  const PAGE_SIZE = 1000
  let todos = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .range(from, to)

    if (error) {
      console.warn(`[AVISO] Tabela ${tabela} não encontrada ou erro: ${error.message}`)
      return { tabela, total: 0, erro: error.message }
    }

    if (!data || data.length === 0) break

    todos.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  const filePath = path.join(exportDir, `${tabela}.json`)
  fs.writeFileSync(filePath, JSON.stringify(todos, null, 2), 'utf8')
  console.log(`[OK] ${tabela.padEnd(28)} -> ${todos.length} registros exportados.`)
  return { tabela, total: todos.length }
}

async function main() {
  console.log('Iniciando exportação completa do Supabase para JSON...')
  const relatorio = []
  for (const t of tabelas) {
    const res = await exportarTabela(t)
    relatorio.push(res)
  }
  console.log('\n--- Exportação concluída! ---')
}

main().catch(err => {
  console.error('Erro na exportação:', err)
  process.exit(1)
})
