-- =========================================================================
-- ACADEMIA MANTRAN - Progresso de visualização por usuário (SQL SERVER / T-SQL)
-- Banco de Dados Destino: dbSuporte  —  executar no SSMS.
--
-- Pré-requisito: tabela academia_videos (criar_tabelas_academia_sql_server.sql).
-- =========================================================================

USE dbSuporte;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'academia_visualizacoes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[academia_visualizacoes] (
        [id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [usuario_chave] NVARCHAR(100) NOT NULL,       -- id do usuário logado
        [usuario_nome]  NVARCHAR(255) NULL,
        [video_id]      UNIQUEIDENTIFIER NOT NULL
                        FOREIGN KEY REFERENCES [dbo].[academia_videos]([id]) ON DELETE CASCADE,
        [assistido]     BIT NOT NULL DEFAULT 0,       -- 1 ao chegar a 90% ou ao fim
        [progresso_pct] INT NOT NULL DEFAULT 0,       -- maior percentual alcançado (0-100)
        [primeira_vez]  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [ultima_vez]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [concluido_em]  DATETIME2 NULL,
        CONSTRAINT [uq_academia_visualizacao] UNIQUE ([usuario_chave], [video_id])
    );
    CREATE NONCLUSTERED INDEX [idx_academia_visualizacoes_usuario] ON [dbo].[academia_visualizacoes]([usuario_chave]);
    CREATE NONCLUSTERED INDEX [idx_academia_visualizacoes_video]   ON [dbo].[academia_visualizacoes]([video_id]);
    PRINT '✅ Tabela academia_visualizacoes criada.';
END
ELSE PRINT 'ℹ️ Tabela academia_visualizacoes já existe.';
GO
