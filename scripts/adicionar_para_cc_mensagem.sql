-- ============================================================
-- Guarda os destinatários (Para / Cc) de cada mensagem de resposta,
-- para exibir no histórico do ticket quem recebeu aquela resposta.
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
ALTER TABLE public.ticket_mensagens
  ADD COLUMN IF NOT EXISTS para TEXT NULL,
  ADD COLUMN IF NOT EXISTS cc TEXT NULL;

-- ---------- SQL Server (dbSuporte) ----------
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ticket_mensagens]') AND name = 'para')
--   ALTER TABLE [dbo].[ticket_mensagens] ADD [para] NVARCHAR(MAX) NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ticket_mensagens]') AND name = 'cc')
--   ALTER TABLE [dbo].[ticket_mensagens] ADD [cc] NVARCHAR(MAX) NULL;
