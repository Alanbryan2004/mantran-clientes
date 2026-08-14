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

const SHOPEE_ORDER_MAP = {
  'checkpoint': { ordem: 1, nome: 'Checkpoint' },
  'configurar base': { ordem: 2, nome: 'Configurar Base' },
  'ativo 4pl': { ordem: 3, nome: 'Ativo 4PL' },
  'ativo 4pi': { ordem: 3, nome: 'Ativo 4PL' },
  'testes': { ordem: 4, nome: 'Testes' },
  'treinamento last mile': { ordem: 5, nome: 'Treinamento Last Mile' },
  'treinamento de first mile': { ordem: 6, nome: 'Treinamento de First Mile' },
  'treinamento first mile': { ordem: 6, nome: 'Treinamento de First Mile' },
  'treinamento de cadastros': { ordem: 7, nome: 'Treinamento de Cadastros' },
  'treinamento de cadastro': { ordem: 7, nome: 'Treinamento de Cadastros' },
  'treinamento cadastros': { ordem: 7, nome: 'Treinamento de Cadastros' },
  'treinamento cadastro': { ordem: 7, nome: 'Treinamento de Cadastros' },
  'treinamento de line haul': { ordem: 8, nome: 'Treinamento de Line Haul' },
  'treinamento line haul': { ordem: 8, nome: 'Treinamento de Line Haul' },
  'treinamento fatura': { ordem: 9, nome: 'Treinamento Fatura' },
  'feedback': { ordem: 10, nome: 'Feedback' },
}

async function updateAll() {
  console.log('Iniciando atualização de etapas Shopee...')
  const { data: etapas, error } = await supabase.from('implantacao_etapas').select('*')
  if (error) {
    console.error('Erro ao buscar etapas:', error)
    return
  }

  console.log(`Total de etapas encontradas: ${etapas.length}`)
  let updatedCount = 0

  for (const etapa of etapas) {
    const key = etapa.nome_etapa.trim().toLowerCase()
    const target = SHOPEE_ORDER_MAP[key]
    if (target) {
      if (etapa.nome_etapa !== target.nome || etapa.ordem !== target.ordem) {
        const { error: updateErr } = await supabase
          .from('implantacao_etapas')
          .update({
            nome_etapa: target.nome,
            ordem: target.ordem
          })
          .eq('id', etapa.id)

        if (updateErr) {
          console.error(`Erro ao atualizar etapa ${etapa.id}:`, updateErr)
        } else {
          updatedCount++
        }
      }
    }
  }

  console.log(`Sucesso! ${updatedCount} etapas foram atualizadas.`)
}

updateAll()
