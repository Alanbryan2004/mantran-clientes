// ============================================================
// Mapa de cada manual (arquivo PDF) -> Módulo + Categoria (seção da sidebar).
// Usado tanto no dry-run quanto no importador.
//
// Estrutura da sidebar do FAQ: Módulo > Categoria > Procedimento.
// ============================================================

// módulo: agrupador maior na sidebar | categoria: seção
export const MAPA_MANUAIS = {
  // ---- Operação / Cadastros ----
  'Cadastro_Cliente_MANTRAN.pdf':                         { modulo: 'Operação', categoria: 'Cadastros' },
  'Cadastro_Cliente_Tela_Faturamento_MANTRAN.pdf':        { modulo: 'Faturamento', categoria: 'Cadastros' },
  'Cadastro_de_Conta_e_Agencia_Bancaria_MANTRAN.pdf':     { modulo: 'Faturamento', categoria: 'Cadastros' },
  'Cadastro_Empresa_Agregado_MANTRAN.pdf':                { modulo: 'Operação', categoria: 'Cadastros' },
  'Cadastro_Motorista_MANTRAN.pdf':                       { modulo: 'Operação', categoria: 'Cadastros' },
  'Cadastro_Veiculo_MANTRAN.pdf':                         { modulo: 'Operação', categoria: 'Cadastros' },

  // ---- CT-e / Fiscal ----
  'Emissao_CTe_MANTRAN.pdf':                              { modulo: 'Operação', categoria: 'CT-e' },
  'CTe_Complementar_MANTRAN.pdf':                         { modulo: 'Operação', categoria: 'CT-e' },
  'CTe_Subcontratado_MANTRAN.pdf':                        { modulo: 'Operação', categoria: 'CT-e' },
  'Carta_de_Correcao_CCe_CTe_MANTRAN.pdf':                { modulo: 'Operação', categoria: 'CT-e' },
  'Correcao_Duplicidade_CTe_MANTRAN.pdf':                 { modulo: 'Operação', categoria: 'CT-e' },
  'Correcao_IE_Destinatario_CTe_MANTRAN.pdf':             { modulo: 'Operação', categoria: 'CT-e' },
  'Troca_Tomador_CTe_MANTRAN.pdf':                        { modulo: 'Operação', categoria: 'CT-e' },
  'Baixa_XML_CTe_MANTRAN.pdf':                            { modulo: 'Operação', categoria: 'CT-e' },
  'Download_CTe_XML_PDF_MANTRAN.pdf':                     { modulo: 'Operação', categoria: 'CT-e' },
  'Excluir_Conhecimento_Nao_Enviado_MANTRAN.pdf':         { modulo: 'Operação', categoria: 'CT-e' },
  'Exclusao_CTe_Importado_MANTRAN.pdf':                   { modulo: 'Operação', categoria: 'CT-e' },
  'Envio_Manual_Conhecimento_SEFAZ_MANTRAN.pdf':          { modulo: 'Operação', categoria: 'CT-e' },
  'Emitir_Conhecimento_Por_Outra_Filial.pdf':             { modulo: 'Operação', categoria: 'CT-e' },
  'Zerar_Contador_CTe_MANTRAN.pdf':                       { modulo: 'Operação', categoria: 'CT-e' },

  // ---- Manifesto / MDF-e ----
  'Manifesto_MDFe_MANTRAN.pdf':                           { modulo: 'Operação', categoria: 'Manifesto (MDF-e)' },
  'Manifesto_Agregado_MANTRAN.pdf':                       { modulo: 'Operação', categoria: 'Manifesto (MDF-e)' },
  'Inclusao_Alteracao_Veiculo_Manifesto.pdf':            { modulo: 'Operação', categoria: 'Manifesto (MDF-e)' },

  // ---- NFS-e / GNRE ----
  'Exportacao_XML_NFSe_MANTRAN.pdf':                      { modulo: 'Operação', categoria: 'NFS-e' },
  'Geracao_GNRE_MANTRAN.pdf':                             { modulo: 'Operação', categoria: 'NFS-e' },

  // ---- Faturamento ----
  'Inclusao_Fatura_MANTRAN.pdf':                          { modulo: 'Faturamento', categoria: 'Faturas' },
  'Exclusao de Fatura_MANTRAN.pdf':                       { modulo: 'Faturamento', categoria: 'Faturas' },
  'Alteracao_Devedor_Fatura_MANTRAN.pdf':                 { modulo: 'Faturamento', categoria: 'Faturas' },
  'Download_Faturas_ZIP_MANTRAN.pdf':                     { modulo: 'Faturamento', categoria: 'Faturas' },
  'Importacao_Planilha_Fatura_MANTRAN.pdf':               { modulo: 'Faturamento', categoria: 'Importação de planilhas' },
  'Importacao_Planilha_Nota_Servico_MANTRAN.pdf':         { modulo: 'Faturamento', categoria: 'Importação de planilhas' },
  'Impressao_Tabela_Frete_MANTRAN.pdf':                   { modulo: 'Faturamento', categoria: 'Tabela de Frete' },

  // ---- Relatórios ----
  'Relatorio_Conhecimentos_Emitidos_MANTRAN.pdf':         { modulo: 'Operação', categoria: 'Relatórios' },
  'Relatorio_Conhecimentos_Analitico_Excel_MANTRAN.pdf':  { modulo: 'Operação', categoria: 'Relatórios' },
  'Relatorio_Conhecimentos_Emitidos_Shopee_MANTRAN.pdf':  { modulo: 'Shopee', categoria: 'Relatórios' },

  // ---- Shopee ----
  'Line_Haul_Shopee_MANTRAN.pdf':                         { modulo: 'Shopee', categoria: 'Line Haul' },
  'Importacao_Planilha_Shopee_Pre_Fatura_MANTRAN.pdf':    { modulo: 'Shopee', categoria: 'Importação de planilhas' },
  'Exportacao_Pre_Fatura_Line_Haul_Shopee_MANTRAN.pdf':   { modulo: 'Shopee', categoria: 'Exportação' },
  'Exportacao_Nota_Fiscal_Servico_Shopee_MANTRAN.pdf':    { modulo: 'Shopee', categoria: 'Exportação' },

  // ---- Léo Madeiras ----
  'Ordem_de_Servico_Leo_Madeiras_MANTRAN.pdf':            { modulo: 'Léo Madeiras', categoria: 'Ordem de Serviço' },

  // ---- Utilitários ----
  'Compactacao_Arquivo_Excel_MANTRAN.pdf':                { modulo: 'Utilitários', categoria: 'Ferramentas' },
}

// fallback quando um arquivo não estiver no mapa
export function categoriaDe(arquivo) {
  return MAPA_MANUAIS[arquivo] || { modulo: 'Outros', categoria: 'Geral' }
}

// Títulos canônicos para os poucos manuais cujo título quebra em 2 linhas no PDF
// e a 2ª linha fica isolada do fluxo (o parser não consegue recompor com segurança).
export const TITULO_OVERRIDE = {
  'Envio_Manual_Conhecimento_SEFAZ_MANTRAN.pdf':         'ENVIO MANUAL DE CONHECIMENTO (CT-E) PARA A SEFAZ',
  'Relatorio_Conhecimentos_Analitico_Excel_MANTRAN.pdf': 'RELATÓRIO DE CONHECIMENTOS – ANALÍTICO EM EXCEL',
}
