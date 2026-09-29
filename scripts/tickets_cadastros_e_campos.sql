-- ============================================================
-- TICKETS — Cadastros auxiliares + novos campos
--
-- Cadastros gerenciáveis pelo usuário:
--   ticket_tipos           (ex: Suporte/Treinamento, Adaptação, Orçamento)
--   ticket_classificacoes  (Classificação do Cliente)
--   ticket_grupos          (Grupos de atendimento)
--   ticket_departamentos   (Departamentos)
--
-- Novas colunas em tickets:
--   tipo_id, classificacao_id, grupo_id, departamento_id  -> FKs para os cadastros
--   tecnico_id, tecnico_nome                              -> Responsável Técnico (perfil Técnico)
--   tags                                                  -> texto (lista separada por vírgula)
--   resolvido_at                                          -> data de resolução
--
-- Observação: "Empresa" = tabela clientes existente (via tickets.cliente_id).
--             "Agente"  = usuário com perfil Suporte (tickets.agente_id/nome).
-- ============================================================


-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- ============================================================

-- 1.1 Tabelas de cadastro
CREATE TABLE IF NOT EXISTS public.ticket_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_classificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Novas colunas em tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS tipo_id UUID NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS classificacao_id UUID NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS grupo_id UUID NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS departamento_id UUID NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS tecnico_id UUID NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS tecnico_nome VARCHAR(255) NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS tags TEXT NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolvido_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_tipo_id ON public.tickets(tipo_id);
CREATE INDEX IF NOT EXISTS idx_tickets_grupo_id ON public.tickets(grupo_id);
CREATE INDEX IF NOT EXISTS idx_tickets_departamento_id ON public.tickets(departamento_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tecnico_id ON public.tickets(tecnico_id);

-- 1.3 RLS para os cadastros (padrão permissivo do sistema)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ticket_tipos','ticket_classificacoes','ticket_grupos','ticket_departamentos']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "sel_%1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "sel_%1$s" ON public.%1$s FOR SELECT USING (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS "ins_%1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "ins_%1$s" ON public.%1$s FOR INSERT WITH CHECK (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS "upd_%1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "upd_%1$s" ON public.%1$s FOR UPDATE USING (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS "del_%1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "del_%1$s" ON public.%1$s FOR DELETE USING (true);', t);
  END LOOP;
END $$;

-- 1.4 Valores iniciais sugeridos (opcional — pode remover se preferir cadastrar do zero)
INSERT INTO public.ticket_tipos (nome)
SELECT v FROM (VALUES ('Suporte/Treinamento'), ('Adaptação'), ('Orçamento'), ('Dúvida'), ('Bug')) AS s(v)
WHERE NOT EXISTS (SELECT 1 FROM public.ticket_tipos);

INSERT INTO public.ticket_classificacoes (nome)
SELECT v FROM (VALUES ('Padrão'), ('VIP'), ('Shopee'), ('Parceiro')) AS s(v)
WHERE NOT EXISTS (SELECT 1 FROM public.ticket_classificacoes);

INSERT INTO public.ticket_grupos (nome)
SELECT v FROM (VALUES ('Suporte N1'), ('Suporte N2'), ('Implantação'), ('Financeiro')) AS s(v)
WHERE NOT EXISTS (SELECT 1 FROM public.ticket_grupos);

INSERT INTO public.ticket_departamentos (nome)
SELECT v FROM (VALUES ('Suporte'), ('Comercial'), ('Financeiro'), ('Desenvolvimento')) AS s(v)
WHERE NOT EXISTS (SELECT 1 FROM public.ticket_departamentos);


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_tipos]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[ticket_tipos] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [nome] NVARCHAR(120) NOT NULL,
    [ativo] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_classificacoes]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[ticket_classificacoes] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [nome] NVARCHAR(120) NOT NULL,
    [ativo] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_grupos]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[ticket_grupos] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [nome] NVARCHAR(120) NOT NULL,
    [ativo] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_departamentos]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[ticket_departamentos] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [nome] NVARCHAR(120) NOT NULL,
    [ativo] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
GO

-- Novas colunas em tickets (SQL Server)
IF COL_LENGTH('dbo.tickets', 'tipo_id') IS NULL          ALTER TABLE [dbo].[tickets] ADD [tipo_id] UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.tickets', 'classificacao_id') IS NULL ALTER TABLE [dbo].[tickets] ADD [classificacao_id] UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.tickets', 'grupo_id') IS NULL         ALTER TABLE [dbo].[tickets] ADD [grupo_id] UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.tickets', 'departamento_id') IS NULL  ALTER TABLE [dbo].[tickets] ADD [departamento_id] UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.tickets', 'tecnico_id') IS NULL       ALTER TABLE [dbo].[tickets] ADD [tecnico_id] UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.tickets', 'tecnico_nome') IS NULL     ALTER TABLE [dbo].[tickets] ADD [tecnico_nome] NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.tickets', 'tags') IS NULL             ALTER TABLE [dbo].[tickets] ADD [tags] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.tickets', 'resolvido_at') IS NULL     ALTER TABLE [dbo].[tickets] ADD [resolvido_at] DATETIME2 NULL;
GO
