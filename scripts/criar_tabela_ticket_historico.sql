-- ============================================================
-- Histórico de alterações do Ticket
-- Registra eventos relevantes do chamado: troca de Agente Responsável,
-- troca de Responsável Técnico e mudanças de status (incl. fechamento).
-- Também guarda quem fechou o chamado (fechado_por_*) na própria tabela tickets.
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
CREATE TABLE IF NOT EXISTS public.ticket_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,              -- 'agente' | 'tecnico' | 'status' | 'fechamento'
  descricao TEXT NOT NULL,         -- texto legível do evento
  usuario_id TEXT NULL,            -- quem realizou a ação (id do usuário logado)
  usuario_nome TEXT NULL,          -- nome de quem realizou a ação
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_historico_ticket ON public.ticket_historico(ticket_id);

ALTER TABLE public.ticket_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura ticket_historico" ON public.ticket_historico;
CREATE POLICY "leitura ticket_historico" ON public.ticket_historico FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert ticket_historico" ON public.ticket_historico;
CREATE POLICY "insert ticket_historico" ON public.ticket_historico FOR INSERT WITH CHECK (true);

-- Quem fechou o chamado (registrado também direto no ticket, para consulta rápida)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS fechado_por_id TEXT NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS fechado_por_nome TEXT NULL;


-- ---------- SQL Server (dbSuporte) ----------
-- IF OBJECT_ID(N'[dbo].[ticket_historico]', N'U') IS NULL
-- BEGIN
--   CREATE TABLE [dbo].[ticket_historico] (
--     [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
--     [ticket_id] UNIQUEIDENTIFIER NOT NULL,
--     [tipo] NVARCHAR(30) NOT NULL,
--     [descricao] NVARCHAR(MAX) NOT NULL,
--     [usuario_id] NVARCHAR(100) NULL,
--     [usuario_nome] NVARCHAR(255) NULL,
--     [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
--   );
-- END
--
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[tickets]') AND name = 'fechado_por_id')
--   ALTER TABLE [dbo].[tickets] ADD [fechado_por_id] NVARCHAR(100) NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[tickets]') AND name = 'fechado_por_nome')
--   ALTER TABLE [dbo].[tickets] ADD [fechado_por_nome] NVARCHAR(255) NULL;
