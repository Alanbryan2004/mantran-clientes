import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Carregar variáveis de ambiente
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

let supabaseUrl = ''
let supabaseKey = ''

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim()
})

const supabase = createClient(supabaseUrl, supabaseKey)

const empresasStr = `001	ELITE LOG TRANSPORTE
002	JMA MARQUES TRANSPOR
003	EDENILTON
004	LUMA EXPRESS
005	W.C. CARVALHO TRANSP
006	NOVA LESTE
007	MARIA LUIZA
008	BM NATIVIDADE
009	ARSX TRANSPORTES
010	D SANTANA
011	GERSON
012	LS ALMEIDA
013	E. B. DA S. FELIX
014	SYG
015	MARCRIS
016	FAGUNDES & GALDINO
017	JL SARAIVA
018	EDENILTON MOREIRA BA
019	MTRANS 3
020	MTRANS 2
021	SALVADOR TRANSPORTES
022	AUTO CLEAN
023	MARCRIS MEM
024	MARCRIS MC
025	N. J. MAGALHAES
026	RUBENS QUINTILIANO
027	ZANARELLI
028	FERNANDO CARLOS BARBUIO
029	MRL TRANSPORTE
031	TRANSPORTADORA 6M
032	RODORUMO
033	GST4
034	BM NATIVIDADE TRANSP
035	RA LOC E LOGISTICA
036	PIRARARA TRANSPORTES
037	LML TRANSPORTES
038	T CARGO TRANSPORTES
039	JL SARAIVA
040	TRANSCORTE TRANSPORT
041	XDS LOGISTICA
042	G.S.T. LOG TRANSPORT
043	BM TRANSPORTES
044	TRANSPORTES FIRE
045	IENOCRAM TRANSPORTES E DISTRIBUICAO LTDA
046	RODO AGD TRANSPORTES
047	CIA CARGAS TRANSP
048	TRANSPORTADORA TOP DAS GALAXIAS
049	LUVIANE TRANSPORTES RODOVIARIOS DE CARGAS
050	CLB TRANSPORTES
051	MWTRANS MS TRANSPORTADORA E LOGISTICA
052	TRANSPORTADORA TOP DAS GALAXIAS LTDA
053	FASI TRANSPORTES LTDA
054	AVOD BARUCH SOLUCOES
055	RXJ SOLUCOES LTDA
056	J.A TRANSPORTES E LOGISTICA`

async function run() {
  console.log('Iniciando importação Léo Madeiras...')
  
  const linhas = empresasStr.split('\n').filter(l => l.trim() !== '')
  
  for (const linha of linhas) {
    const parts = linha.split('\t')
    if (parts.length < 2) continue
    
    const cd = parts[0].trim()
    const nome = parts[1].trim()
    
    // Inserir Empresa
    const { data: empData, error: empErr } = await supabase
      .from('leo_empresas')
      .insert([{ cd_empresa: cd, nome_empresa: nome }])
      .select()
      .single()
      
    if (empErr) {
      console.error(`Erro ao inserir empresa ${cd}:`, empErr.message)
      continue
    }
    
    // Criar Usuário Padrão
    const defaultLogin = nome.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'admin'
    const { error: usrErr } = await supabase
      .from('leo_usuarios')
      .insert([{ 
        leo_empresa_id: empData.id, 
        login: defaultLogin, 
        senha: `${cd}@Mantran` 
      }])
      
    if (usrErr) {
      console.error(`Erro ao inserir usuário para ${cd}:`, usrErr.message)
    } else {
      console.log(`Sucesso: ${cd} - ${nome}`)
    }
  }
  
  console.log('Finalizado!')
}

run()
