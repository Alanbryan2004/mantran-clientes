-- =========================================================================
-- FAQ - Botões de download configuráveis por procedimento (SQL SERVER / T-SQL)
-- Banco de Dados Destino: dbSuporte  —  executar no SSMS. Pode rodar mais de uma vez.
--
-- botoes: lista JSON (texto) de { "label": "...", "url": "...", "filename": "..." }
-- O arquivo fica no Supabase Storage (bucket "faq"); aqui guardamos só a URL.
-- =========================================================================

USE dbSuporte;
GO

IF COL_LENGTH('dbo.faq_procedimentos', 'botoes') IS NULL
    ALTER TABLE [dbo].[faq_procedimentos]
        ADD [botoes] NVARCHAR(MAX) NOT NULL CONSTRAINT [df_faq_proc_botoes] DEFAULT '[]';
GO
