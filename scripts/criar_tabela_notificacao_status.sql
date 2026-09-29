-- ============================================================
-- Estado por-usuário das notificações (lida / excluída)
-- Resolve o bug de notificações reaparecerem após deslogar/logar
-- ou atualizar: hoje o estado só existe no localStorage do navegador.
--
-- notificacao_id é TEXTO porque cobre tanto notificações do banco
-- (UUID) quanto lembretes locais de ponto (ex.: "<uid>_2026-09-29_entrada").
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
CREATE TABLE IF NOT EXISTS public.notificacao_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  notificacao_id TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  excluida BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notificacao_status UNIQUE (usuario_id, notificacao_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_status_usuario ON public.notificacao_status(usuario_id);

ALTER TABLE public.notificacao_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura notif_status" ON public.notificacao_status;
CREATE POLICY "leitura notif_status" ON public.notificacao_status
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert notif_status" ON public.notificacao_status;
CREATE POLICY "insert notif_status" ON public.notificacao_status
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "update notif_status" ON public.notificacao_status;
CREATE POLICY "update notif_status" ON public.notificacao_status
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "delete notif_status" ON public.notificacao_status;
CREATE POLICY "delete notif_status" ON public.notificacao_status
  FOR DELETE USING (true);


-- ---------- SQL Server (dbSuporte) ----------
-- IF OBJECT_ID(N'[dbo].[notificacao_status]', N'U') IS NULL
-- BEGIN
--   CREATE TABLE [dbo].[notificacao_status] (
--     [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
--     [usuario_id] UNIQUEIDENTIFIER NOT NULL,
--     [notificacao_id] NVARCHAR(200) NOT NULL,
--     [lida] BIT NOT NULL DEFAULT 0,
--     [excluida] BIT NOT NULL DEFAULT 0,
--     [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
--     CONSTRAINT [uq_notificacao_status] UNIQUE ([usuario_id], [notificacao_id])
--   );
--   CREATE NONCLUSTERED INDEX [idx_notif_status_usuario] ON [dbo].[notificacao_status] ([usuario_id]);
-- END
