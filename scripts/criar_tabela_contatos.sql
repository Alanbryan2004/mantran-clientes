-- ============================================================
-- TICKETS — Contatos (solicitantes dos chamados)
--
-- Um "contato" é a pessoa que abre tickets (cliente final).
-- Campos: nome, e-mail(s), telefone comercial, celular, empresa (cliente),
-- grupo (reutiliza ticket_grupos), cargo, e flag "vê todos os tickets da empresa".
--
-- Vínculo: tickets.contato_id -> ticket_contatos.id
-- Empresa: ticket_contatos.empresa_id -> clientes.id (opcional; há também empresa_nome livre)
-- Grupo:   ticket_contatos.grupo_id  -> ticket_grupos.id (opcional)
-- ============================================================


-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  email_secundario VARCHAR(255) NULL,
  telefone_comercial VARCHAR(50) NULL,
  celular VARCHAR(50) NULL,
  cargo VARCHAR(120) NULL,
  empresa_id UUID NULL,          -- referência opcional a clientes.id
  empresa_nome VARCHAR(255) NULL, -- nome livre da empresa (fallback)
  grupo_id UUID NULL,            -- referência opcional a ticket_grupos.id
  ve_todos_empresa BOOLEAN NOT NULL DEFAULT FALSE, -- acessa todos os tickets da empresa
  foto_url TEXT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_contatos_email ON public.ticket_contatos(email);
CREATE INDEX IF NOT EXISTS idx_ticket_contatos_empresa_id ON public.ticket_contatos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ticket_contatos_nome ON public.ticket_contatos(nome);

-- Vínculo do ticket ao contato
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS contato_id UUID NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_contato_id ON public.tickets(contato_id);

-- RLS
ALTER TABLE public.ticket_contatos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_ticket_contatos" ON public.ticket_contatos;
CREATE POLICY "sel_ticket_contatos" ON public.ticket_contatos FOR SELECT USING (true);
DROP POLICY IF EXISTS "ins_ticket_contatos" ON public.ticket_contatos;
CREATE POLICY "ins_ticket_contatos" ON public.ticket_contatos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "upd_ticket_contatos" ON public.ticket_contatos;
CREATE POLICY "upd_ticket_contatos" ON public.ticket_contatos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "del_ticket_contatos" ON public.ticket_contatos;
CREATE POLICY "del_ticket_contatos" ON public.ticket_contatos FOR DELETE USING (true);


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_contatos]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[ticket_contatos] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [nome] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255) NULL,
    [email_secundario] NVARCHAR(255) NULL,
    [telefone_comercial] NVARCHAR(50) NULL,
    [celular] NVARCHAR(50) NULL,
    [cargo] NVARCHAR(120) NULL,
    [empresa_id] UNIQUEIDENTIFIER NULL,
    [empresa_nome] NVARCHAR(255) NULL,
    [grupo_id] UNIQUEIDENTIFIER NULL,
    [ve_todos_empresa] BIT NOT NULL DEFAULT 0,
    [foto_url] NVARCHAR(MAX) NULL,
    [ativo] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  CREATE NONCLUSTERED INDEX [idx_ticket_contatos_email] ON [dbo].[ticket_contatos] ([email]);
  CREATE NONCLUSTERED INDEX [idx_ticket_contatos_empresa_id] ON [dbo].[ticket_contatos] ([empresa_id]);
  CREATE NONCLUSTERED INDEX [idx_ticket_contatos_nome] ON [dbo].[ticket_contatos] ([nome]);
END
GO

-- Vínculo do ticket ao contato (SQL Server)
IF COL_LENGTH('dbo.tickets', 'contato_id') IS NULL
  ALTER TABLE [dbo].[tickets] ADD [contato_id] UNIQUEIDENTIFIER NULL;
GO
