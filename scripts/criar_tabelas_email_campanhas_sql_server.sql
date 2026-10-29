-- =========================================================================
-- E-MAIL EM MASSA - Histórico (SQL SERVER / T-SQL)
-- Banco de Dados Destino: dbSuporte  —  executar no SSMS.
--
-- Reaproveita a configuração de SMTP já existente (config_email).
-- Tabelas: email_campanhas (lote), email_envios (por destinatário),
--          email_descadastros (opt-out).
-- =========================================================================

USE dbSuporte;
GO

-- 1. EMAIL_CAMPANHAS (lote de envio)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'email_campanhas' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[email_campanhas] (
        [id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [assunto]             NVARCHAR(500) NOT NULL,
        [corpo_html]          NVARCHAR(MAX) NULL,
        [filtro_tipo]         NVARCHAR(20) NULL,          -- TODOS | NORMAL | SHOPEE | LEO
        [somente_ativos]      BIT NOT NULL DEFAULT 1,
        [intervalo_ms]        INT NOT NULL DEFAULT 4000,
        [total_destinatarios] INT NOT NULL DEFAULT 0,
        [total_enviados]      INT NOT NULL DEFAULT 0,
        [total_falhas]        INT NOT NULL DEFAULT 0,
        [status]              NVARCHAR(20) NOT NULL DEFAULT 'EM_ANDAMENTO', -- EM_ANDAMENTO | CONCLUIDA | CANCELADA | PAUSADA
        [criado_por_id]       UNIQUEIDENTIFIER NULL,
        [criado_por_nome]     NVARCHAR(255) NULL,
        [created_at]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [updated_at]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [chk_email_campanhas_status] CHECK ([status] IN ('EM_ANDAMENTO','CONCLUIDA','CANCELADA','PAUSADA'))
    );
    PRINT '✅ Tabela email_campanhas criada.';
END
ELSE PRINT 'ℹ️ Tabela email_campanhas já existe.';
GO

-- 2. EMAIL_ENVIOS (um registro por destinatário)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'email_envios' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[email_envios] (
        [id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [campanha_id]  UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES [dbo].[email_campanhas]([id]) ON DELETE CASCADE,
        [contato_id]   UNIQUEIDENTIFIER NULL,
        [email]        NVARCHAR(320) NOT NULL,
        [nome]         NVARCHAR(255) NULL,
        [empresa_nome] NVARCHAR(255) NULL,
        [tipo_empresa] NVARCHAR(50) NULL,
        [status]       NVARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | ENVIADO | ERRO | IGNORADO
        [erro]         NVARCHAR(MAX) NULL,
        [enviado_em]   DATETIME2 NULL,
        [created_at]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [chk_email_envios_status] CHECK ([status] IN ('PENDENTE','ENVIADO','ERRO','IGNORADO'))
    );
    CREATE NONCLUSTERED INDEX [idx_email_envios_campanha] ON [dbo].[email_envios]([campanha_id]);
    CREATE NONCLUSTERED INDEX [idx_email_envios_email]    ON [dbo].[email_envios]([email]);
    CREATE NONCLUSTERED INDEX [idx_email_envios_status]   ON [dbo].[email_envios]([status]);
    PRINT '✅ Tabela email_envios criada.';
END
ELSE PRINT 'ℹ️ Tabela email_envios já existe.';
GO

-- 3. EMAIL_DESCADASTROS (opt-out)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'email_descadastros' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[email_descadastros] (
        [email]      NVARCHAR(320) NOT NULL PRIMARY KEY,   -- sempre em minúsculo
        [motivo]     NVARCHAR(500) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT '✅ Tabela email_descadastros criada.';
END
ELSE PRINT 'ℹ️ Tabela email_descadastros já existe.';
GO

PRINT '🎉 Script de histórico de e-mail em massa (SQL Server) executado.';
GO
