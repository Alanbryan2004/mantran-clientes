-- =========================================================================
-- FAQ - Botões de download configuráveis por procedimento
-- Executar no SQL Editor do Supabase (PostgreSQL) e no SSMS (SQL Server).
-- Pode rodar mais de uma vez.
--
-- botoes: lista JSON de { "label": "...", "url": "...", "filename": "..." }
-- O arquivo em si fica no Storage (bucket "faq", prefixo botoes/); aqui só a URL.
-- =========================================================================

-- ---------- PostgreSQL (Supabase) ----------
ALTER TABLE public.faq_procedimentos
  ADD COLUMN IF NOT EXISTS botoes JSONB NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';


-- ---------- SQL Server (dbSuporte) ----------
-- Rode o bloco abaixo no SSMS (remova o comentário se executar separadamente).
--
-- USE dbSuporte;
-- GO
-- IF COL_LENGTH('dbo.faq_procedimentos', 'botoes') IS NULL
--     ALTER TABLE [dbo].[faq_procedimentos]
--         ADD [botoes] NVARCHAR(MAX) NOT NULL CONSTRAINT [df_faq_proc_botoes] DEFAULT '[]';
-- GO
