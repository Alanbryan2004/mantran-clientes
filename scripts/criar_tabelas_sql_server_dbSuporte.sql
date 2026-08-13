-- =========================================================================
-- SCRIPT DE CRIAÇÃO E ATUALIZAÇÃO NO FORMATO SQL SERVER (T-SQL)
-- Banco de Dados Destino: dbSuporte
-- Execute estes comandos no SQL Server Management Studio (SSMS)
-- =========================================================================

USE dbSuporte;
GO

-- 1. Tabela IMPLANTACOES (se ainda não existir)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacoes')
BEGIN
    CREATE TABLE implantacoes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        cliente_id UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES clientes(id) ON DELETE SET NULL,
        nome_cliente NVARCHAR(255) NOT NULL,
        base_nome NVARCHAR(100) NULL,
        tipo_cliente NVARCHAR(50) DEFAULT 'NORMAL',
        status NVARCHAR(50) DEFAULT 'Em Andamento',
        data_inicio DATETIME DEFAULT GETDATE(),
        data_previsao DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ Tabela implantacoes criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela implantacoes já existe no SQL Server.';
END
GO

-- 2. Tabela IMPLANTACAO_ETAPAS (Etapas do onboarding)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacao_etapas')
BEGIN
    CREATE TABLE implantacao_etapas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        implantacao_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES implantacoes(id) ON DELETE CASCADE,
        nome_etapa NVARCHAR(255) NOT NULL,
        valor NVARCHAR(50) DEFAULT 'EM BRANCO', -- 'OK', 'EM BRANCO', 'PENDENTE'
        ordem INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ Tabela implantacao_etapas criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela implantacao_etapas já existe no SQL Server.';
END
GO

-- 3. Tabela IMPLANTACAO_HISTORICO (Histórico/Timeline com Data, Hora e Timezone)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacao_historico')
BEGIN
    CREATE TABLE implantacao_historico (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        implantacao_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES implantacoes(id) ON DELETE CASCADE,
        data_hora DATETIME DEFAULT GETDATE(),
        texto NVARCHAR(MAX) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ Tabela implantacao_historico criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela implantacao_historico já existe no SQL Server.';
END
GO

-- 4. Adicionar Coluna ATIVO na Tabela LEO_EMPRESAS
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'leo_empresas')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('leo_empresas') AND name = 'ativo')
    BEGIN
        ALTER TABLE leo_empresas ADD ativo BIT DEFAULT 1;
        PRINT '✅ Coluna ativo adicionada na tabela leo_empresas com sucesso!';
    END
    
    -- Atualiza os registros existentes para ficarem ativos por padrão (1 = SIM)
    EXEC('UPDATE leo_empresas SET ativo = 1 WHERE ativo IS NULL;');
END
GO

-- 5. Índices para Performance no SQL Server
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_implantacao_etapas_implantacao_id')
BEGIN
    CREATE INDEX IX_implantacao_etapas_implantacao_id ON implantacao_etapas(implantacao_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_implantacao_historico_implantacao_id')
BEGIN
    CREATE INDEX IX_implantacao_historico_implantacao_id ON implantacao_historico(implantacao_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_implantacoes_cliente_id')
BEGIN
    CREATE INDEX IX_implantacoes_cliente_id ON implantacoes(cliente_id);
END
GO

PRINT '🎉 Script SQL Server executado com sucesso!';
GO
