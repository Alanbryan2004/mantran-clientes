-- ============================================================
-- Threads automáticas de e-mail para tickets
-- Guarda os endereços de destino para os disparos automáticos:
--   - email_customizacao: para onde vão os chamados do tipo "Customização"
--   - email_suporte_estendido: para onde vão os chamados de "Suporte Estendido"
-- Reaproveita a tabela singleton config_email (linha 'default').
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
ALTER TABLE public.config_email
  ADD COLUMN IF NOT EXISTS email_customizacao TEXT NULL;

ALTER TABLE public.config_email
  ADD COLUMN IF NOT EXISTS email_suporte_estendido TEXT NULL;


-- ---------- SQL Server (dbSuporte) ----------
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[config_email]') AND name = 'email_customizacao')
--   ALTER TABLE [dbo].[config_email] ADD [email_customizacao] NVARCHAR(255) NULL;
--
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[config_email]') AND name = 'email_suporte_estendido')
--   ALTER TABLE [dbo].[config_email] ADD [email_suporte_estendido] NVARCHAR(255) NULL;
