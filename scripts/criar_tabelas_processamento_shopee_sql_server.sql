-- =========================================================================
-- PROCESSAMENTO SHOPEE - SQL SERVER (T-SQL)
-- Tabelas para o status de fechamento quinzenal (Last Mile / First Mile /
-- Line Haul) das transportadoras 4PL / Hubs.
--
-- Banco de Dados Destino: dbSuporte
-- Execute no SQL Server Management Studio (SSMS).
--
-- Observação de relacionamento:
--  - nome_base: nome da base do cliente no SQL Server (ex.: dbMantran...).
--  - cnpj:      CNPJ da transportadora, usado como chave de relação com o
--               banco operacional da Shopee.
-- =========================================================================

USE dbSuporte;
GO

-- 1. Tabela SHOPEE_TRANSPORTADORAS (catálogo 4PL / Hubs)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'shopee_transportadoras')
BEGIN
    CREATE TABLE shopee_transportadoras (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        cliente_id UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES clientes(id) ON DELETE SET NULL,
        base_id UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES bases(id),
        nome_empresa NVARCHAR(255) NOT NULL,
        nome_base NVARCHAR(100) NULL,       -- nome da base do cliente (dbMantran...)
        cnpj NVARCHAR(18) NULL,             -- CNPJ para fazer a relação
        ativo BIT NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ Tabela shopee_transportadoras criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela shopee_transportadoras já existe no SQL Server.';
END
GO

-- 2. Tabela SHOPEE_PROCESSAMENTOS (um registro por transportadora + processo + competência)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'shopee_processamentos')
BEGIN
    CREATE TABLE shopee_processamentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        transportadora_id UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES shopee_transportadoras(id) ON DELETE CASCADE,

        -- Redundância útil para consultas/relatórios e relação externa:
        nome_empresa NVARCHAR(255) NOT NULL,
        nome_base NVARCHAR(100) NULL,       -- nome da base do cliente (dbMantran...)
        cnpj NVARCHAR(18) NULL,             -- CNPJ para fazer a relação

        -- Competência do fechamento:
        quinzena TINYINT NOT NULL,          -- 1 ou 2
        mes TINYINT NOT NULL,               -- 1 a 12
        ano SMALLINT NOT NULL,

        -- Tipo de processo e status:
        processo NVARCHAR(20) NOT NULL,     -- 'Last Mile' | 'First Mile' | 'Line Haul'
        status NVARCHAR(20) NOT NULL DEFAULT 'NAO_INICIADO', -- 'FINALIZADO' | 'PROCESSANDO' | 'NAO_INICIADO'

        -- Métricas de execução:
        segundos_processamento INT NOT NULL DEFAULT 0,
        registros_processados INT NOT NULL DEFAULT 0,
        data_inicio DATETIME NULL,
        data_fim DATETIME NULL,

        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),

        CONSTRAINT chk_shopee_quinzena CHECK (quinzena IN (1, 2)),
        CONSTRAINT chk_shopee_mes CHECK (mes BETWEEN 1 AND 12),
        CONSTRAINT chk_shopee_processo CHECK (processo IN ('Last Mile', 'First Mile', 'Line Haul')),
        CONSTRAINT chk_shopee_status CHECK (status IN ('FINALIZADO', 'PROCESSANDO', 'NAO_INICIADO')),
        CONSTRAINT uq_shopee_proc UNIQUE (transportadora_id, quinzena, mes, ano, processo)
    );
    PRINT '✅ Tabela shopee_processamentos criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Tabela shopee_processamentos já existe no SQL Server.';
END
GO

-- 3. Índices para Performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_shopee_transp_cliente_id')
BEGIN
    CREATE INDEX IX_shopee_transp_cliente_id ON shopee_transportadoras(cliente_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_shopee_transp_cnpj')
BEGIN
    CREATE INDEX IX_shopee_transp_cnpj ON shopee_transportadoras(cnpj);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_shopee_proc_transportadora_id')
BEGIN
    CREATE INDEX IX_shopee_proc_transportadora_id ON shopee_processamentos(transportadora_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_shopee_proc_competencia')
BEGIN
    CREATE INDEX IX_shopee_proc_competencia ON shopee_processamentos(ano, mes, quinzena);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_shopee_proc_status')
BEGIN
    CREATE INDEX IX_shopee_proc_status ON shopee_processamentos(status);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_shopee_proc_cnpj')
BEGIN
    CREATE INDEX IX_shopee_proc_cnpj ON shopee_processamentos(cnpj);
END
GO

PRINT '🎉 Script Processamento Shopee (SQL Server) executado com sucesso!';
GO
