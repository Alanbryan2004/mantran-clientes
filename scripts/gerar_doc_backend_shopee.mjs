// =============================================================================
// Gerador de documentação PDF do backend da tela "Processamento Shopee".
// Usa jsPDF + jspdf-autotable (já presentes no projeto).
//
// Uso:
//   node scripts/gerar_doc_backend_shopee.mjs
// Saída:
//   docs/Backend_Processamento_Shopee.pdf
// =============================================================================

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'docs')
const outPath = resolve(outDir, 'Backend_Processamento_Shopee.pdf')
mkdirSync(outDir, { recursive: true })

const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

const PAGE_W = doc.internal.pageSize.getWidth()
const PAGE_H = doc.internal.pageSize.getHeight()
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

// Paleta
const C_BRAND = [37, 99, 235]     // azul
const C_DARK = [15, 23, 42]       // slate-900
const C_GRAY = [100, 116, 139]    // slate-500
const C_ORANGE = [234, 88, 12]
const C_LIGHT = [248, 250, 252]

let y = MARGIN

function ensureSpace(h) {
  if (y + h > PAGE_H - MARGIN) {
    doc.addPage()
    y = MARGIN
  }
}

function h1(text) {
  ensureSpace(34)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...C_DARK)
  doc.text(text, MARGIN, y)
  y += 8
  doc.setDrawColor(...C_BRAND)
  doc.setLineWidth(2)
  doc.line(MARGIN, y, MARGIN + 60, y)
  y += 18
}

function h2(text) {
  ensureSpace(26)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...C_BRAND)
  doc.text(text, MARGIN, y)
  y += 16
}

function para(text) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 60, 75)
  const lines = doc.splitTextToSize(text, CONTENT_W)
  for (const line of lines) {
    ensureSpace(14)
    doc.text(line, MARGIN, y)
    y += 14
  }
  y += 4
}

function bullets(items) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 60, 75)
  for (const it of items) {
    const lines = doc.splitTextToSize(it, CONTENT_W - 16)
    lines.forEach((line, idx) => {
      ensureSpace(14)
      if (idx === 0) {
        doc.setTextColor(...C_BRAND)
        doc.text('•', MARGIN + 2, y)
        doc.setTextColor(50, 60, 75)
      }
      doc.text(line, MARGIN + 16, y)
      y += 14
    })
  }
  y += 4
}

function codeBlock(code) {
  doc.setFont('courier', 'normal')
  doc.setFontSize(8.5)
  const lines = code.split('\n')
  const lineH = 11
  const boxH = lines.length * lineH + 14
  ensureSpace(boxH)
  doc.setFillColor(...C_DARK)
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 4, 4, 'F')
  doc.setTextColor(226, 232, 240)
  let cy = y + 14
  for (const line of lines) {
    doc.text(line, MARGIN + 10, cy)
    cy += lineH
  }
  doc.setFont('helvetica', 'normal')
  y += boxH + 10
}

function table(head, body, colStyles) {
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [head],
    body,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4, valign: 'middle', textColor: [40, 50, 65] },
    headStyles: { fillColor: C_DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: C_LIGHT },
    columnStyles: colStyles || {},
    didDrawPage: () => {}
  })
  y = doc.lastAutoTable.finalY + 14
}

// ---------------------------------------------------------------------------
// CAPA / HEADER
// ---------------------------------------------------------------------------
doc.setFillColor(...C_DARK)
doc.rect(0, 0, PAGE_W, 120, 'F')
doc.setFillColor(...C_ORANGE)
doc.rect(0, 120, PAGE_W, 4, 'F')

doc.setFont('helvetica', 'bold')
doc.setFontSize(22)
doc.setTextColor(255, 255, 255)
doc.text('Processamento Shopee', MARGIN, 58)
doc.setFontSize(12)
doc.setTextColor(203, 213, 225)
doc.text('Documentação Técnica do Backend', MARGIN, 80)
doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(148, 163, 184)
const hoje = new Date().toLocaleDateString('pt-BR')
doc.text(`Mantran Clientes  •  Gerado em ${hoje}  •  Base para a API de serviço automático`, MARGIN, 100)

y = 150

// ---------------------------------------------------------------------------
// 1. VISÃO GERAL
// ---------------------------------------------------------------------------
h1('1. Visão Geral')
para(
  'A tela "Processamento Shopee" (rota /processamento-shopee) acompanha o status de fechamento quinzenal ' +
  'dos processos logísticos Last Mile, First Mile e Line Haul das transportadoras 4PL / Hubs. ' +
  'Hoje a tela consome o catálogo de transportadoras real do Supabase, mas os status e tempos de processamento ' +
  'ainda são gerados de forma MOCKADA no próprio front-end. O objetivo desta documentação é descrever o ' +
  'funcionamento atual e definir o contrato de dados para que uma API de serviço automático passe a alimentar ' +
  'as tabelas reais do banco.'
)
h2('Componentes envolvidos')
table(
  ['Camada', 'Arquivo / Recurso', 'Responsabilidade'],
  [
    ['Front-end', 'src/pages/ProcessamentoShopee.tsx', 'Renderização da tela, filtros, exportação Excel/PDF e geração do mock'],
    ['Cliente DB', 'src/lib/supabase.ts', 'Cliente Supabase (createClient) via VITE_SUPABASE_URL / ANON_KEY'],
    ['Banco (nuvem)', 'Supabase (PostgreSQL)', 'Leitura de clientes/bases; destino das novas tabelas Shopee'],
    ['Banco (on-prem)', 'SQL Server dbSuporte', 'Espelho das tabelas para o serviço automático'],
    ['Scripts DDL', 'scripts/criar_tabelas_processamento_shopee*.sql', 'Criação das tabelas em Supabase e SQL Server'],
  ],
  { 0: { cellWidth: 70 }, 1: { cellWidth: 190 } }
)

// ---------------------------------------------------------------------------
// 2. FLUXO ATUAL
// ---------------------------------------------------------------------------
h1('2. Como o backend funciona hoje')
h2('2.1. Carregamento das transportadoras (dado real)')
para(
  'Ao montar a tela, o hook useEffect dispara fetchTransportadorasShopee(). A consulta usa o cliente Supabase ' +
  'para ler os clientes do tipo SHOPEE, trazendo junto o nome da base relacionada na tabela bases.'
)
codeBlock(
`const { data, error } = await supabase
  .from('clientes')
  .select('id, nome_empresa, tipo, bases ( nome_base )')
  .eq('tipo', 'SHOPEE')
  .order('nome_empresa', { ascending: true })

// mapeamento -> { id, nome_empresa, tipo, nome_base }
// nome_base assume 'dbMantran' quando não há base vinculada`
)
h2('2.2. Geração dos status (MOCK - a ser substituído)')
para(
  'O bloco dadosProcessamento (useMemo) cruza cada transportadora com os 3 processos e gera status, tempo, ' +
  'registros e datas por meio de um hash pseudo-aleatório determinístico baseado nos filtros (quinzena, mês, ' +
  'ano e um refreshSeed). É exatamente essa parte que a API de serviço automático deve substituir, passando a ' +
  'ler valores reais persistidos no banco.'
)
bullets([
  'hash < 25  -> status NAO_INICIADO (tempo "-", 0 registros)',
  'hash < 48  -> status PROCESSANDO (tempo parcial, data_fim "Em andamento...")',
  'caso contrário -> status FINALIZADO (tempo total e registros processados)',
])
h2('2.3. Filtros, contadores e exportação')
bullets([
  'Filtros no front: quinzena (1/2), mês (01-12), ano, processo, transportadora, status e busca textual.',
  'Cards de métrica: Total, Não Iniciado, Processando, Finalizado (+ % concluído).',
  'Exportação: Excel (SheetJS/xlsx) e PDF (jsPDF + autotable) a partir dos itens filtrados.',
])

// ---------------------------------------------------------------------------
// 3. MODELO DE DADOS ALVO
// ---------------------------------------------------------------------------
h1('3. Modelo de dados alvo (tabelas reais)')
para(
  'Duas tabelas foram criadas para substituir o mock. A relação com o banco operacional da Shopee é feita por ' +
  'duas colunas-chave: nome_base (nome da base do cliente, ex.: dbMantran...) e cnpj (CNPJ da transportadora).'
)
h2('3.1. shopee_transportadoras')
table(
  ['Coluna', 'Tipo', 'Descrição'],
  [
    ['id', 'UUID / GUID', 'Chave primária'],
    ['cliente_id', 'UUID / GUID', 'FK para clientes(id)'],
    ['base_id', 'UUID / GUID', 'FK para bases(id)'],
    ['nome_empresa', 'TEXT', 'Nome da transportadora'],
    ['nome_base', 'TEXT', 'Nome da base do cliente (dbMantran...)'],
    ['cnpj', 'VARCHAR(18)', 'CNPJ - chave de relação externa'],
    ['ativo', 'BOOLEAN / BIT', 'Flag de ativo'],
    ['created_at / updated_at', 'TIMESTAMP', 'Auditoria'],
  ],
  { 0: { cellWidth: 120 }, 1: { cellWidth: 90 } }
)
h2('3.2. shopee_processamentos')
table(
  ['Coluna', 'Tipo', 'Descrição'],
  [
    ['id', 'UUID / GUID', 'Chave primária'],
    ['transportadora_id', 'UUID / GUID', 'FK para shopee_transportadoras(id)'],
    ['nome_empresa', 'TEXT', 'Nome da transportadora (redundância p/ relatório)'],
    ['nome_base', 'TEXT', 'Nome da base do cliente (dbMantran...)'],
    ['cnpj', 'VARCHAR(18)', 'CNPJ - chave de relação externa'],
    ['quinzena', 'SMALLINT', '1 ou 2'],
    ['mes', 'SMALLINT', '1 a 12'],
    ['ano', 'SMALLINT', 'Ano da competência'],
    ['processo', 'TEXT', "'Last Mile' | 'First Mile' | 'Line Haul'"],
    ['status', 'TEXT', "'FINALIZADO' | 'PROCESSANDO' | 'NAO_INICIADO'"],
    ['segundos_processamento', 'INT', 'Duração total em segundos'],
    ['registros_processados', 'INT', 'Qtde de registros processados'],
    ['data_inicio / data_fim', 'TIMESTAMP', 'Janela de execução'],
  ],
  { 0: { cellWidth: 130 }, 1: { cellWidth: 80 } }
)
para(
  'Restrição de unicidade: UNIQUE (transportadora_id, quinzena, mes, ano, processo) garante um único registro ' +
  'por processo em cada competência - o que viabiliza operações de UPSERT pelo serviço automático.'
)

// ---------------------------------------------------------------------------
// 4. CONTRATO PARA A API DE SERVIÇO AUTOMÁTICO
// ---------------------------------------------------------------------------
h1('4. API de serviço automático - contrato sugerido')
para(
  'O serviço automático deve coletar o status real de cada processo no banco operacional da Shopee e persistir ' +
  'em shopee_processamentos, fazendo a correspondência pela chave nome_base + cnpj. Recomenda-se UPSERT pela ' +
  'constraint de unicidade.'
)
h2('4.1. Payload de ingestão (por registro)')
codeBlock(
`{
  "cnpj": "12.345.678/0001-90",
  "nome_base": "dbMantran123",
  "nome_empresa": "AJ BERLEZI",
  "quinzena": 1,
  "mes": 9,
  "ano": 2026,
  "processo": "Last Mile",
  "status": "FINALIZADO",
  "segundos_processamento": 2745,
  "registros_processados": 18230,
  "data_inicio": "2026-09-05T08:30:00Z",
  "data_fim":    "2026-09-05T09:15:24Z"
}`
)
h2('4.2. Upsert no Supabase (exemplo)')
codeBlock(
`await supabase
  .from('shopee_processamentos')
  .upsert(payload, {
    onConflict: 'transportadora_id,quinzena,mes,ano,processo'
  })`
)
h2('4.3. Upsert no SQL Server (MERGE)')
codeBlock(
`MERGE shopee_processamentos AS alvo
USING (SELECT @transportadora_id AS transportadora_id,
              @quinzena AS quinzena, @mes AS mes,
              @ano AS ano, @processo AS processo) AS origem
ON  alvo.transportadora_id = origem.transportadora_id
AND alvo.quinzena = origem.quinzena AND alvo.mes = origem.mes
AND alvo.ano = origem.ano AND alvo.processo = origem.processo
WHEN MATCHED THEN UPDATE SET status = @status, ...
WHEN NOT MATCHED THEN INSERT (...) VALUES (...);`
)
h2('4.4. Recomendações operacionais')
bullets([
  'Agendamento: executar o serviço em intervalo curto (ex.: a cada 1-5 min) para refletir "Processando" em tempo real.',
  'Idempotência: sempre UPSERT pela constraint única; nunca duplicar competência/processo.',
  'Normalização do CNPJ: padronizar com ou sem máscara em ambos os lados antes de relacionar.',
  'Tempo: a tela formata a partir de segundos_processamento; o serviço envia o valor em segundos (inteiro).',
  'Status derivado: PROCESSANDO enquanto data_fim nula; FINALIZADO quando preenchida; NAO_INICIADO sem execução.',
  'Segurança: o serviço deve usar a service_role key do Supabase (nunca a anon key) ou conexão autenticada ao SQL Server.',
])

// ---------------------------------------------------------------------------
// 5. VARIÁVEIS DE AMBIENTE
// ---------------------------------------------------------------------------
h1('5. Variáveis de ambiente / conexão')
table(
  ['Variável', 'Uso'],
  [
    ['VITE_SUPABASE_URL', 'URL do projeto Supabase (front e serviço)'],
    ['VITE_SUPABASE_ANON_KEY', 'Chave pública usada pelo front-end (somente leitura RLS)'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'Chave privada recomendada para o serviço de ingestão'],
    ['SQLSERVER_* (host/user/pass/db)', 'Conexão ao dbSuporte via pacote mssql'],
  ],
  { 0: { cellWidth: 200 } }
)
para(
  'Observação: a tabela clientes atual não possui a coluna cnpj (o CNPJ aparece em transportadoras no script de ' +
  'migração). A origem do CNPJ para popular shopee_transportadoras precisa ser definida antes da carga inicial.'
)

// Rodapé com numeração
const total = doc.getNumberOfPages()
for (let i = 1; i <= total; i++) {
  doc.setPage(i)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C_GRAY)
  doc.text('Mantran Clientes - Documentação interna', MARGIN, PAGE_H - 24)
  doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, PAGE_H - 24, { align: 'right' })
}

doc.save(outPath)
console.log('PDF gerado em:', outPath)
