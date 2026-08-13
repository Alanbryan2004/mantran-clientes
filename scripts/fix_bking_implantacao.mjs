import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- Buscando Cliente Bking ---')
  const { data: clientes, error: errC } = await supabase
    .from('clientes')
    .select('*')
    .ilike('nome_empresa', '%Bking%')
  
  if (errC) {
    console.error('Erro ao buscar cliente:', errC)
    return
  }

  console.log('Clientes encontrados:', clientes)

  if (!clientes || clientes.length === 0) {
    console.log('Nenhum cliente Bking encontrado.')
    return
  }

  const cliente = clientes[0]

  // Find base
  const { data: bases } = await supabase
    .from('bases')
    .select('*')
    .eq('cliente_id', cliente.id)

  console.log('Bases vinculadas ao cliente Bking:', bases)

  const base = bases && bases.length > 0 ? bases[0] : null

  // Check if implantação already exists
  const { data: existingImpl } = await supabase
    .from('implantacoes')
    .select('*')
    .eq('cliente_id', cliente.id)

  console.log('Implantações existentes para Bking:', existingImpl)

  if (existingImpl && existingImpl.length > 0) {
    console.log('Implantação já existe para Bking!')
    return
  }

  console.log('Criando registro de Implantação para Bking...')
  
  const operacoes = ['Last Mile']
  const { data: implData, error: implErr } = await supabase
    .from('implantacoes')
    .insert([{
      cliente_id: cliente.id,
      base_id: base ? base.id : null,
      nome_empresa: cliente.nome_empresa,
      tipo_cliente: cliente.tipo || 'SHOPEE',
      operacoes_shopee: operacoes,
      modulos_normal: [],
      status: 'Em Andamento'
    }])
    .select()
    .single()

  if (implErr) {
    console.error('Erro ao criar implantação:', implErr)
    return
  }

  console.log('Implantação criada com sucesso! ID:', implData.id)

  // Etapas
  const etapasNomes = [
    'Checkpoint',
    'Configurar Base',
    'Testes',
    'Treinamento Fatura',
    'Feedback',
    'Ativo 4Pl',
    'Treinamento Last Mile'
  ]

  const etapasToInsert = etapasNomes.map((nome, i) => ({
    implantacao_id: implData.id,
    nome_etapa: nome,
    valor: 'EM BRANCO',
    ordem: i + 1
  }))

  const { error: etapasErr } = await supabase
    .from('implantacao_etapas')
    .insert(etapasToInsert)

  if (etapasErr) {
    console.error('Erro ao criar etapas:', etapasErr)
    return
  }

  console.log('Etapas criadas com sucesso!')
  console.log('✅ Correção concluída!')
}

run()
