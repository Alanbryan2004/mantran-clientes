-- =============================================================================
-- TABELAS DE ANALYTICS & MÉTRICAS DE ACESSO (SQL SERVER - dbSuporte)
--
-- 1. acessos_log: Registra os acessos por tela, identificando o cliente e usuário
-- 2. faq_visualizacoes: Registra quais manuais do FAQ estão sendo mais lidos
--
-- Banco: SQL Server (dbSuporte)
-- =============================================================================

-- 1. TABELA DE ACESSOS POR TELA
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'acessos_log')
BEGIN
    CREATE TABLE dbo.acessos_log (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        usuario_id NVARCHAR(100) NULL,
        usuario_nome NVARCHAR(255) NULL,
        usuario_login NVARCHAR(100) NULL,
        cliente_nome NVARCHAR(255) NULL,
        rota NVARCHAR(255) NOT NULL,
        tela_nome NVARCHAR(255) NOT NULL,
        dispositivo NVARCHAR(50) NOT NULL DEFAULT 'Desktop',
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );

    CREATE NONCLUSTERED INDEX idx_acessos_log_created_at ON dbo.acessos_log(created_at DESC);
    CREATE NONCLUSTERED INDEX idx_acessos_log_rota ON dbo.acessos_log(rota);
    CREATE NONCLUSTERED INDEX idx_acessos_log_cliente_nome ON dbo.acessos_log(cliente_nome);
    CREATE NONCLUSTERED INDEX idx_acessos_log_usuario_id ON dbo.acessos_log(usuario_id);
    
    PRINT 'Tabela dbo.acessos_log criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela dbo.acessos_log já existe.';
END
GO

-- 2. TABELA DE VISUALIZAÇÕES DE MANUAIS DO FAQ
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'faq_visualizacoes')
BEGIN
    CREATE TABLE dbo.faq_visualizacoes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        procedimento_id UNIQUEIDENTIFIER NOT NULL,
        procedimento_titulo NVARCHAR(255) NOT NULL,
        categoria_nome NVARCHAR(255) NULL,
        usuario_id NVARCHAR(100) NULL,
        usuario_nome NVARCHAR(255) NULL,
        cliente_nome NVARCHAR(255) NULL,
        origem NVARCHAR(50) NOT NULL DEFAULT 'web',
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );

    CREATE NONCLUSTERED INDEX idx_faq_visualizacoes_proc_id ON dbo.faq_visualizacoes(procedimento_id);
    CREATE NONCLUSTERED INDEX idx_faq_visualizacoes_created_at ON dbo.faq_visualizacoes(created_at DESC);
    CREATE NONCLUSTERED INDEX idx_faq_visualizacoes_cliente_nome ON dbo.faq_visualizacoes(cliente_nome);
    
    PRINT 'Tabela dbo.faq_visualizacoes criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela dbo.faq_visualizacoes já existe.';
END
GO
