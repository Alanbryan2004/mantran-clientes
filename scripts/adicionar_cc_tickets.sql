-- ============================================================
-- Adiciona o campo de "Cópia" (Cc) ao ticket.
-- Guarda os e-mails que estavam em cópia no e-mail de abertura,
-- para o agente poder responder a todos.
-- Formato: lista de e-mails separados por vírgula.
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS cliente_cc TEXT NULL;

-- ---------- SQL Server (dbSuporte) ----------
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[tickets]') AND name = 'cliente_cc')
-- BEGIN
--   ALTER TABLE [dbo].[tickets] ADD [cliente_cc] NVARCHAR(MAX) NULL;
-- END
