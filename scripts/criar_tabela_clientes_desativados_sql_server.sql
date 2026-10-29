-- =============================================================================
-- CRIAÇÃO DA TABELA DE CLIENTES DESATIVADOS (HISTÓRICO & AUDITORIA)
-- Banco de Dados: SQL Server (dbSuporte)
-- Objetivo: Rastrear e preservar todos os dados de clientes excluídos da base,
--           incluindo base utilizada, credenciais, módulos, aditivos e checkpoints.
-- Execute no SQL Server Management Studio (SSMS) conectado ao dbSuporte
-- =============================================================================

USE dbSuporte;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'clientes_desativados')
BEGIN
    CREATE TABLE dbo.clientes_desativados (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        cliente_id_original UNIQUEIDENTIFIER NOT NULL,
        nome_empresa NVARCHAR(255) NOT NULL,
        tipo NVARCHAR(50) NOT NULL, -- 'NORMAL', 'SHOPEE', 'COMMERSYS', 'LEO', etc.
        ativo BIT NOT NULL DEFAULT 0,
        
        -- Informações da Base que utilizava
        base_id UNIQUEIDENTIFIER NULL,
        base_nome NVARCHAR(100) NOT NULL, -- ex: 'dbMantran002'
        base_status_anterior NVARCHAR(50) DEFAULT 'Ocupada',
        
        -- Credenciais e Usuários vinculados
        senha_padrao NVARCHAR(255) NULL,
        usuarios_gpo_json NVARCHAR(MAX) NULL, -- Array JSON com logins/senhas
        
        -- Módulos contratados
        modulos_json NVARCHAR(MAX) NULL, -- Array JSON com módulos
        
        -- Aditivo Contratual
        possui_aditivo BIT DEFAULT 0,
        arquivo_aditivo_nome NVARCHAR(255) NULL,
        arquivo_aditivo_base64 NVARCHAR(MAX) NULL,
        arquivo_aditivo_tamanho BIGINT NULL,
        
        -- Implantação e Checkpoints (se houver)
        implantacao_id UNIQUEIDENTIFIER NULL,
        implantacao_dados_json NVARCHAR(MAX) NULL,
        
        -- Auditoria e Rastreamento
        data_cadastro_original DATETIME NULL,
        desativado_em DATETIME NOT NULL DEFAULT GETDATE(),
        desativado_por NVARCHAR(255) NULL, -- Usuário do sistema que realizou a exclusão
        motivo NVARCHAR(MAX) NULL,
        
        -- Snapshot completo de todos os dados em formato JSON
        dados_completos_json NVARCHAR(MAX) NOT NULL DEFAULT '{}'
    );

    CREATE NONCLUSTERED INDEX idx_clientes_desativados_empresa 
        ON dbo.clientes_desativados(nome_empresa);

    CREATE NONCLUSTERED INDEX idx_clientes_desativados_base 
        ON dbo.clientes_desativados(base_nome);

    CREATE NONCLUSTERED INDEX idx_clientes_desativados_data 
        ON dbo.clientes_desativados(desativado_em);

    CREATE NONCLUSTERED INDEX idx_clientes_desativados_orig_id 
        ON dbo.clientes_desativados(cliente_id_original);

    PRINT '✅ Tabela clientes_desativados criada com sucesso no SQL Server (dbSuporte)!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela clientes_desativados já existe no SQL Server (dbSuporte).';
END
GO
