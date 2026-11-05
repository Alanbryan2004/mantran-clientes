-- =========================================================================
-- ACADEMIA MANTRAN - Módulos (vários) e Seção dos vídeos (SQL SERVER / T-SQL)
-- Banco de Dados Destino: dbSuporte  —  executar no SSMS. Pode rodar mais de uma vez.
--
-- modulos: lista JSON (texto) com os nomes de modulos_mantran. Ex.: ["Financeiro","Operação"]
-- secao  : seção/tela (Cadastros, Importação, Exportação...)
-- Se existir a coluna antiga "modulo" (texto único), migra o valor e remove a coluna.
-- =========================================================================

USE dbSuporte;
GO

IF COL_LENGTH('dbo.academia_videos', 'modulos') IS NULL
    ALTER TABLE [dbo].[academia_videos] ADD [modulos] NVARCHAR(MAX) NOT NULL CONSTRAINT [df_academia_videos_modulos] DEFAULT '[]';
GO

IF COL_LENGTH('dbo.academia_videos', 'secao') IS NULL
    ALTER TABLE [dbo].[academia_videos] ADD [secao] NVARCHAR(100) NULL;
GO

IF COL_LENGTH('dbo.academia_videos', 'modulo') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_academia_videos_modulo' AND object_id = OBJECT_ID('dbo.academia_videos'))
        DROP INDEX [idx_academia_videos_modulo] ON [dbo].[academia_videos];

    EXEC('UPDATE [dbo].[academia_videos]
             SET [modulos] = ''["'' + STRING_ESCAPE([modulo], ''json'') + ''"]''
           WHERE [modulo] IS NOT NULL AND LTRIM(RTRIM([modulo])) <> '''' AND [modulos] = ''[]''');
    ALTER TABLE [dbo].[academia_videos] DROP COLUMN [modulo];
END
GO
