-- =========================================================================
-- ACADEMIA MANTRAN - Vídeos de treinamento (SQL SERVER / T-SQL)
-- Banco de Dados Destino: dbSuporte  —  executar no SSMS.
--
-- Guardamos apenas o LINK do vídeo (o arquivo fica no YouTube).
-- =========================================================================

USE dbSuporte;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'academia_videos' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[academia_videos] (
        [id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [titulo]          NVARCHAR(500) NOT NULL,
        [descricao]       NVARCHAR(MAX) NULL,
        [youtube_url]     NVARCHAR(1000) NOT NULL,   -- link original informado
        [youtube_id]      NVARCHAR(20) NOT NULL,     -- ID de 11 caracteres extraído do link
        [ordem]           INT NOT NULL DEFAULT 0,    -- menor aparece primeiro
        [ativo]           BIT NOT NULL DEFAULT 1,
        [criado_por_nome] NVARCHAR(255) NULL,
        [created_at]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [updated_at]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX [idx_academia_videos_ordem] ON [dbo].[academia_videos]([ordem], [titulo]);
    CREATE NONCLUSTERED INDEX [idx_academia_videos_ativo] ON [dbo].[academia_videos]([ativo]);
    PRINT '✅ Tabela academia_videos criada.';
END
ELSE PRINT 'ℹ️ Tabela academia_videos já existe.';
GO

-- Primeiro vídeo (só insere se ainda não existir)
IF NOT EXISTS (SELECT 1 FROM [dbo].[academia_videos] WHERE [youtube_id] = 'sQP4rkWNROo')
BEGIN
    INSERT INTO [dbo].[academia_videos] ([titulo], [descricao], [youtube_url], [youtube_id], [ordem], [criado_por_nome])
    VALUES (
        N'Cadastro de Veículo Frota',
        N'Passo a passo para cadastrar um veículo de frota no Mantran.',
        N'https://youtu.be/sQP4rkWNROo',
        N'sQP4rkWNROo',
        1,
        N'Carga inicial'
    );
END
GO

PRINT '🎉 Script da Academia Mantran (SQL Server) executado.';
GO
