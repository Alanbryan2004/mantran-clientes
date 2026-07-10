export interface BaseMantran {
  id: string; // e.g. "dbMantran001"
  clienteDbId?: string;
  empresa: string;
  tipo: 'SHOPEE' | 'NORMAL' | '';
  migradas: 'OK' | 'NOK' | '';
  ts: 'OK' | 'NOK' | '';
  servico: 'OK' | 'NOK' | '';
  lic: 'OK' | 'NOK' | '';
  dblogin: 'OK' | 'NOK' | '';
  senha: string;
  possui_aditivo?: boolean;
}

const initialBases: BaseMantran[] = [
  { id: 'dbMantran001', empresa: 'ENTREGATEX', tipo: 'SHOPEE', migradas: 'OK', ts: 'OK', servico: 'OK', lic: 'OK', dblogin: 'NOK', senha: '' },
  { id: 'dbMantran002', empresa: 'GRAN MILAN', tipo: 'NORMAL', migradas: '', ts: '', servico: '', lic: 'OK', dblogin: 'NOK', senha: '@@mtr002##' },
  { id: 'dbMantran003', empresa: 'EVOLOG / RAPIDO EXPRESS', tipo: 'SHOPEE', migradas: 'OK', ts: 'OK', servico: 'OK', lic: 'OK', dblogin: 'OK', senha: '@@mnt003##' },
  { id: 'dbMantran004', empresa: 'CVV', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'OK', senha: '@@cvvt004##' },
  { id: 'dbMantran005', empresa: 'DANDIER', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'NOK', senha: '' },
  { id: 'dbMantran006', empresa: 'WLS TRANSPORTE E LOCAÇÃO LTDA', tipo: 'SHOPEE', migradas: 'OK', ts: 'OK', servico: 'OK', lic: 'OK', dblogin: 'OK', senha: '@@wls006##' },
  { id: 'dbMantran007', empresa: 'PORTO GUIMARAES EXPRESS LTDA', tipo: 'SHOPEE', migradas: 'OK', ts: 'OK', servico: 'OK', lic: 'OK', dblogin: 'OK', senha: '@@tpg007##' },
  { id: 'dbMantran008', empresa: 'RODOMASTER', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'NOK', senha: '@@mtr008##' },
  { id: 'dbMantran009', empresa: 'PETY TRANSPORTES LTDA', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'OK', senha: '@@ptp009##' },
  { id: 'dbMantran010', empresa: 'A.F TRANSPORTES', tipo: 'SHOPEE', migradas: '', ts: '', servico: '', lic: 'OK', dblogin: 'OK', senha: '@@cdl010##' },
  { id: 'dbMantran011', empresa: 'VIA BRASIL', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'NOK', senha: '' },
  { id: 'dbMantran012', empresa: 'J & A', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'OK', senha: '@@mst035##' },
  { id: 'dbMantran013', empresa: 'MULTIPORTOS', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'NOK', senha: '' },
  { id: 'dbMantran014', empresa: '', tipo: 'SHOPEE', migradas: '', ts: '', servico: '', lic: 'OK', dblogin: 'OK', senha: '@@unt014##' },
  { id: 'dbMantran015', empresa: 'KM SERVIÇOS', tipo: 'SHOPEE', migradas: 'OK', ts: 'OK', servico: 'OK', lic: '', dblogin: '', senha: '' },
  { id: 'dbMantran016', empresa: 'DF CARGAS', tipo: 'SHOPEE', migradas: 'OK', ts: 'OK', servico: 'OK', lic: 'OK', dblogin: '', senha: '' },
  { id: 'dbMantran017', empresa: 'RODOMAGO', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'OK', senha: '@@mtr017##' },
  { id: 'dbMantran018', empresa: 'TRANS-SHIRLEY', tipo: 'NORMAL', migradas: 'OK', ts: 'OK', servico: '', lic: 'OK', dblogin: 'OK', senha: '@@tsh018##' },
  { id: 'dbMantran019', empresa: 'AST', tipo: 'SHOPEE', migradas: 'OK', ts: 'OK', servico: 'OK', lic: 'OK', dblogin: 'NOK', senha: '@@mn2019##' },
]

// Generate up to 120
for (let i = 20; i <= 120; i++) {
  const paddedId = String(i).padStart(3, '0')
  initialBases.push({
    id: `dbMantran${paddedId}`,
    empresa: '',
    tipo: '',
    migradas: '',
    ts: '',
    servico: '',
    lic: '',
    dblogin: '',
    senha: ''
  })
}

export const MOCK_BASES = initialBases;
