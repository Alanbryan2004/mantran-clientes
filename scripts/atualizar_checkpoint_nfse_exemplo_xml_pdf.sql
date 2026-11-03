-- =========================================================================
-- ATUALIZAÇÃO: CHECKPOINT NFSE — ARQUIVOS DE EXEMPLO (XML E PDF)
-- Finalidade: Permitir conferência de alíquotas, tributações e CNAE através
-- de 1 XML e 1 PDF de NFSe já emitida na Prefeitura.
-- =========================================================================

-- -------------------------------------------------------------------------
-- PARTE 1: SUPABASE (POSTGRESQL)
-- -------------------------------------------------------------------------
-- NOTA TÉCNICA:
-- No Supabase, os dados do Checkpoint são armazenados dinamicamente na
-- coluna JSONB "dados" da tabela "implantacao_checkpoint".
--
-- A estrutura salva em "dados" -> "nfse" -> "parametros" agora inclui:
--   "exemplo_xml": { "arquivo_nome": "...", "arquivo_base64": "...", "arquivo_tamanho": 12345 }
--   "exemplo_pdf": { "arquivo_nome": "...", "arquivo_base64": "...", "arquivo_tamanho": 12345 }
--
-- Portanto, NENHUM comando "ALTER TABLE" é obrigatório no Supabase; os novos
-- campos já são gravados e lidos normalmente pela aplicação.
--
-- (Opcional) Consulta para verificar quais checkpoints já contêm XML/PDF anexados:
/*
SELECT 
    c.id,
    c.implantacao_id,
    i.nome_empresa,
    c.dados->'nfse'->'parametros' AS nfse_parametros,
    c.updated_at
FROM implantacao_checkpoint c
LEFT JOIN implantacoes i ON i.id = c.implantacao_id
WHERE c.dados->'nfse' IS NOT NULL;
*/


-- -------------------------------------------------------------------------
-- PARTE 2: SQL SERVER (dbSuporte)
-- Execute no SQL Server Management Studio (SSMS) se utilizar a réplica local
-- -------------------------------------------------------------------------

USE dbSuporte;
GO

-- 1. Garante a tabela implantacao_checkpoint no SQL Server caso ainda não exista
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacao_checkpoint')
BEGIN
    CREATE TABLE dbo.implantacao_checkpoint (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        implantacao_id UNIQUEIDENTIFIER NOT NULL,
        dados NVARCHAR(MAX) NOT NULL,
        concluido BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX IX_implantacao_checkpoint_implantacao_id 
        ON dbo.implantacao_checkpoint(implantacao_id);
    PRINT '✅ Tabela implantacao_checkpoint criada com sucesso no SQL Server!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela implantacao_checkpoint já existe no SQL Server.';
END
GO

-- 2. (Opcional) Tabela relacional dedicada para extração/consulta direta de anexos de NFSe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacao_nfse_exemplos')
BEGIN
    CREATE TABLE dbo.implantacao_nfse_exemplos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        implantacao_id UNIQUEIDENTIFIER NOT NULL,
        cnpj_emissao NVARCHAR(20) NULL,
        municipio NVARCHAR(150) NULL,
        tipo_arquivo NVARCHAR(10) NOT NULL, -- 'XML' ou 'PDF'
        arquivo_nome NVARCHAR(255) NOT NULL,
        arquivo_base64 NVARCHAR(MAX) NULL,
        arquivo_tamanho INT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX IX_implantacao_nfse_exemplos_imp 
        ON dbo.implantacao_nfse_exemplos(implantacao_id);
    PRINT '✅ Tabela opcional implantacao_nfse_exemplos criada com sucesso no SQL Server!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela implantacao_nfse_exemplos já existe no SQL Server.';
END
GO
