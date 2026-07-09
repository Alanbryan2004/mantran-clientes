import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

// Read env
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

let supabaseUrl = ''
let supabaseKey = ''

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim()
})

const supabase = createClient(supabaseUrl, supabaseKey)

const data = [
  { base: '002', emp: 'GRAN MILAN', tipo: 'NORMAL', senha: '@@mtr002##' },
  { base: '003', emp: 'EVOLOG / RAPIDO EXPRESS', tipo: 'SHOPEE', senha: '@@mnt003##' },
  { base: '004', emp: 'CVV', tipo: 'NORMAL', senha: '@@cvv004##' },
  { base: '005', emp: 'DANDIER', tipo: 'NORMAL', senha: '' },
  { base: '006', emp: 'WLS TRANSPORTE E LOCAÇÃO LTDA', tipo: 'SHOPEE', senha: '@@wls006##' },
  { base: '007', emp: 'PORTO GUIMARAES EXPRESS LTDA', tipo: 'SHOPEE', senha: '@@tpg007##' },
  { base: '008', emp: 'RODOMASTER', tipo: 'NORMAL', senha: '@@mtr008##' },
  { base: '009', emp: 'PETY TRANSPORTES LTDA', tipo: 'NORMAL', senha: '@@ptp009##' },
  { base: '010', emp: 'A.F TRANSPORTES', tipo: 'SHOPEE', senha: '@@cdl010##' },
  { base: '011', emp: 'VIA BRASIL', tipo: 'NORMAL', senha: '' },
  { base: '012', emp: 'J & A', tipo: 'NORMAL', senha: '@@mst035##' },
  { base: '013', emp: 'MULTIPORTOS', tipo: 'NORMAL', senha: '' },
  { base: '015', emp: 'KM SERVIÇOS', tipo: 'SHOPEE', senha: '' },
  { base: '016', emp: 'DF CARGAS', tipo: 'SHOPEE', senha: '' },
  { base: '017', emp: 'RODOMAGO', tipo: 'NORMAL', senha: '@@mtr017##' },
  { base: '018', emp: 'TRANS-SHIRLEY', tipo: 'NORMAL', senha: '@@tsh018##' },
  { base: '019', emp: 'AST', tipo: 'SHOPEE', senha: '@@mn2019##' },
  { base: '020', emp: 'JMDR', tipo: 'NORMAL', senha: '@@cdl020##' },
  { base: '021', emp: 'PSP', tipo: 'SHOPEE', senha: '@@rimp021##' },
  { base: '022', emp: 'DIFALUX', tipo: 'NORMAL', senha: '@@mtr022##' },
  { base: '023', emp: 'VIADO', tipo: 'NORMAL', senha: '@@eli023##' },
  { base: '024', emp: 'SANTA ISABEL', tipo: 'NORMAL', senha: '@@mtr024##' },
  { base: '025', emp: 'RODOVIARIO CAMPINAS', tipo: 'NORMAL', senha: '@@rdc025##' },
  { base: '026', emp: 'RJT', tipo: 'NORMAL', senha: '@@tjd026##' },
  { base: '027', emp: 'LCB', tipo: 'SHOPEE', senha: '' },
  { base: '028', emp: 'ANALOG', tipo: 'NORMAL', senha: '@@tcc028##' },
  { base: '029', emp: 'MFT', tipo: 'NORMAL', senha: '' },
  { base: '030', emp: 'VTA', tipo: 'NORMAL', senha: '@@vta030##' },
  { base: '031', emp: 'NAVI', tipo: 'NORMAL', senha: '@@navi031##' },
  { base: '032', emp: 'ELEMAR', tipo: 'NORMAL', senha: '' },
  { base: '033', emp: 'TRANSDIS', tipo: 'NORMAL', senha: '' },
  { base: '034', emp: 'MOVELOG', tipo: 'SHOPEE', senha: '' },
  { base: '035', emp: 'LS Almeida', tipo: 'NORMAL', senha: '@@ls035##' },
  { base: '036', emp: 'LATAVHA', tipo: 'SHOPEE', senha: '@@tst036##' },
  { base: '037', emp: 'Facilog', tipo: 'SHOPEE', senha: '@@fcl037##' },
  { base: '038', emp: 'RENNER', tipo: 'SHOPEE', senha: '@@rnn038##' },
  { base: '040', emp: 'FARDIN', tipo: 'SHOPEE', senha: '@@frd040##' },
  { base: '041', emp: 'PRALOG', tipo: 'SHOPEE', senha: '@@plg041##' },
  { base: '042', emp: 'JUNIOR TRANSPORTES', tipo: 'SHOPEE', senha: '@@jnt042##' },
  { base: '043', emp: 'GUEDES', tipo: 'SHOPEE', senha: '@@gd043##' },
  { base: '044', emp: 'ANA CAROLINA DE FREITAS LTDA', tipo: 'SHOPEE', senha: '@@acf044##' },
  { base: '045', emp: 'TRANSPETRO', tipo: 'NORMAL', senha: '@@tpt045##' },
  { base: '046', emp: 'SIVI', tipo: 'NORMAL', senha: '@@svi046##' },
  { base: '047', emp: 'TRANSALTA', tipo: 'NORMAL', senha: '' },
  { base: '048', emp: 'ARTHI', tipo: 'NORMAL', senha: '@@ath048##' },
  { base: '049', emp: 'HAWK', tipo: 'SHOPEE', senha: '@@hwk049##' },
  { base: '050', emp: 'GAGOM', tipo: 'NORMAL', senha: '@@ggm050##' },
  { base: '051', emp: 'DELMAR', tipo: 'NORMAL', senha: '@@dlm051##' },
  { base: '052', emp: 'ANEOS', tipo: 'NORMAL', senha: '' },
  { base: '053', emp: 'DDC', tipo: 'SHOPEE', senha: '@@ddc053##' },
  { base: '054', emp: 'MOVEN', tipo: 'NORMAL', senha: '' },
  { base: '055', emp: 'MC TRANSPORTES', tipo: 'SHOPEE', senha: '@@mct055##' },
  { base: '056', emp: 'ADT', tipo: 'NORMAL', senha: '@@adt056##' },
  { base: '057', emp: 'PET TRANSPORTES', tipo: 'NORMAL', senha: '' },
  { base: '058', emp: 'HANI', tipo: 'NORMAL', senha: '@@han058##' },
  { base: '059', emp: 'WL Transportes', tipo: 'SHOPEE', senha: '@@wlt059##' },
  { base: '060', emp: 'MAURICIO', tipo: 'SHOPEE', senha: '@@mrc060##' },
  { base: '061', emp: 'LC TRANSPORTES', tipo: 'SHOPEE', senha: '@@lct061##' },
  { base: '062', emp: 'SHIRLEX', tipo: 'SHOPEE', senha: '@@slx062##' },
  { base: '063', emp: 'INSO LINK DOG', tipo: 'SHOPEE', senha: '@@il063##' },
  { base: '064', emp: 'ZIZI TRANSPORTES', tipo: 'SHOPEE', senha: '@@ztp064##' },
  { base: '065', emp: 'JMTDS', tipo: 'SHOPEE', senha: '' },
  { base: '066', emp: 'SHEIKLOC', tipo: 'SHOPEE', senha: '' },
  { base: '067', emp: 'AUGUSTO CESAR', tipo: 'SHOPEE', senha: '@@act067##' },
  { base: '068', emp: 'LORENZO', tipo: 'NORMAL', senha: '@@lrn068##' },
  { base: '069', emp: 'MORAS TRANSPORTES', tipo: 'SHOPEE', senha: '' },
  { base: '070', emp: 'VELOS/CONNE', tipo: 'SHOPEE', senha: '' },
  { base: '071', emp: 'ENTREGAS EXPRESS', tipo: 'SHOPEE', senha: '@@eep071##' },
  { base: '072', emp: 'BAUER', tipo: 'SHOPEE', senha: '@@bau072##' },
  { base: '073', emp: 'NEW BUSINESS', tipo: 'SHOPEE', senha: '@@nb073##' },
  { base: '074', emp: 'WP EXPRESS', tipo: 'SHOPEE', senha: '@@wpe074##' },
  { base: '075', emp: 'LGV', tipo: 'SHOPEE', senha: '@@lgv075##' },
  { base: '076', emp: 'NR2', tipo: 'SHOPEE', senha: '' },
  { base: '077', emp: 'ONZE SOLUCOES', tipo: 'SHOPEE', senha: '' },
  { base: '078', emp: 'ROTAMAR', tipo: 'NORMAL', senha: '' },
  { base: '079', emp: 'M LOG', tipo: 'SHOPEE', senha: '' },
  { base: '080', emp: 'PBX', tipo: 'SHOPEE', senha: '' },
  { base: '081', emp: 'TK TRANSPORTES', tipo: 'SHOPEE', senha: '@@tk081##' },
  { base: '082', emp: 'MODENSE', tipo: 'NORMAL', senha: '' },
  { base: '083', emp: 'Magalha', tipo: 'SHOPEE', senha: '' },
  { base: '085', emp: 'NADER', tipo: 'SHOPEE', senha: '@@ndr085##' },
  { base: '086', emp: 'D2C', tipo: 'SHOPEE', senha: '@@d2c086##' },
  { base: '087', emp: 'JB SANTOS', tipo: 'SHOPEE', senha: '' },
  { base: '088', emp: 'PAIVA', tipo: 'SHOPEE', senha: '' },
  { base: '089', emp: 'MIDIA', tipo: 'SHOPEE', senha: '@@md089##' },
  { base: '090', emp: 'LEO CLIENTES', tipo: 'NORMAL', senha: '@@leo090##' },
  { base: '091', emp: 'FLX', tipo: 'SHOPEE', senha: '@@flx091##' },
  { base: '092', emp: 'Yuri Araujo de Oliveira', tipo: 'SHOPEE', senha: '' },
  { base: '093', emp: 'MULTICART', tipo: 'SHOPEE', senha: '@@mlt093##' },
  { base: '094', emp: 'NADIR', tipo: 'NORMAL', senha: '' },
  { base: '095', emp: 'Elo Logistica', tipo: 'SHOPEE', senha: '@@elo095##' },
  { base: '096', emp: 'GB Express', tipo: 'SHOPEE', senha: '' },
  { base: '097', emp: 'NVS Transporte', tipo: 'NORMAL', senha: '' },
  { base: '098', emp: 'BRV Transportes', tipo: 'SHOPEE', senha: '@@brv098##' },
  { base: '099', emp: 'AN DISTRIBUIDORA', tipo: 'SHOPEE', senha: '@@and099##' },
  { base: '100', emp: 'APALOG', tipo: 'SHOPEE', senha: '@@apa100##' },
  { base: '101', emp: 'LUCAS PINTO', tipo: 'SHOPEE', senha: '@@lcp101##' },
  { base: '103', emp: 'DALEX', tipo: 'SHOPEE', senha: '@@dal103##' },
  { base: '104', emp: 'Envia Dale', tipo: 'SHOPEE', senha: '@@evd104##' },
  { base: '105', emp: 'PEREIRA SOLUÇÕES', tipo: 'SHOPEE', senha: '@@prs105##' },
  { base: '106', emp: 'MUNDO LOG', tipo: 'SHOPEE', senha: '@@mdl106##' },
  { base: '107', emp: 'CD Logistica', tipo: 'SHOPEE', senha: '@@cdl107##' },
  { base: '108', emp: 'Dutra', tipo: 'SHOPEE', senha: '@@dt108##' },
  { base: '109', emp: 'S7', tipo: 'SHOPEE', senha: '@@s7109##' },
  { base: '110', emp: 'Brasil Total', tipo: 'SHOPEE', senha: '@@bt110##' },
  { base: '111', emp: 'BCLog', tipo: 'SHOPEE', senha: '@@bcl111##' },
  { base: '112', emp: 'Amazonfleet', tipo: 'SHOPEE', senha: '@@amz112##' },
  { base: '113', emp: 'MG Express', tipo: 'SHOPEE', senha: '@@mge113##' },
  { base: '114', emp: 'TELES Transportes', tipo: 'SHOPEE', senha: '@@tel114##' },
  { base: '115', emp: 'LMC', tipo: 'SHOPEE', senha: '@@lmc115##' },
  { base: '116', emp: 'A.J. Berlezi Transportes', tipo: 'SHOPEE', senha: '' },
  { base: '117', emp: 'Velozes Courier', tipo: 'SHOPEE', senha: '@@vzc117##' },
  { base: '118', emp: 'IDEAL', tipo: 'NORMAL', senha: '@@idl118##' },
  { base: '119', emp: 'Robson Barbosa', tipo: 'SHOPEE', senha: '@@rzv119##' },
  { base: '120', emp: 'A.F Logistica', tipo: 'SHOPEE', senha: '@@afl120##' },
]

async function run() {
  console.log('Iniciando importação de ' + data.length + ' clientes...')
  
  for (const item of data) {
    const nomeBase = `dbMantran${item.base}`
    console.log(`-> Processando ${nomeBase} (${item.emp})...`)
    
    // 1. Get Base ID
    const { data: baseData, error: baseErr } = await supabase.from('bases').select('id').eq('nome_base', nomeBase).single()
    if (baseErr || !baseData) {
      console.log('   [!] Base não encontrada, pulando.')
      continue
    }

    // 2. Check if already has a client (skip to avoid duplicates if script runs twice)
    const { data: existingClientCheck } = await supabase.from('bases').select('cliente_id').eq('id', baseData.id).single()
    if (existingClientCheck && existingClientCheck.cliente_id) {
       console.log('   [-] Base já está em uso, pulando.')
       continue
    }

    // 3. Insert Cliente
    const { data: clienteData, error: clienteErr } = await supabase.from('clientes').insert([{
      nome_empresa: item.emp,
      tipo: item.tipo
    }]).select().single()

    if (clienteErr || !clienteData) {
      console.log('   [!] Erro ao inserir cliente:', clienteErr)
      continue
    }

    // 4. Update Base
    await supabase.from('bases').update({
      cliente_id: clienteData.id,
      status: 'Em Uso'
    }).eq('id', baseData.id)

    // 5. Insert Usuario if password exists
    if (item.senha) {
      const login = item.emp.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)
      await supabase.from('usuarios_gpo').insert([{
        cliente_id: clienteData.id,
        login: login || 'admin',
        senha: item.senha
      }])
    }
    console.log('   [✓] Cadastrado com sucesso.')
  }
  console.log('Finalizado!')
}

run()
