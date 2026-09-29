-- ============================================================
-- SISTEMA DE TICKETS (Chamados de Suporte)
--
-- Estrutura:
--   tickets           -> o chamado (número, título, cliente, agente, status, prioridade)
--   ticket_mensagens  -> thread do chamado (respostas ao cliente e anotações internas)
--   ticket_anexos     -> arquivos/imagens anexados às mensagens (base64 / Data URL)
--
-- Observações:
--   - "numero" é um identificador legível e sequencial (ex: 40122), além do id UUID.
--   - status: 'Novo' | 'Aberto' | 'Pendente' | 'Aguardando cliente' | 'Aguardando terceiros' | 'Resolvido' | 'Fechado'
--   - prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente'
--   - origem: 'email' | 'manual'
--   - "lido" controla o destaque "Novo" em negrito na lista (false = ainda não aberto).
-- ============================================================


-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- Sequência para o número legível do ticket (começa em 40000)
CREATE SEQUENCE IF NOT EXISTS public.ticket_numero_seq START WITH 40000 INCREMENT BY 1;

-- 1.1 Tabela de Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT NOT NULL DEFAULT nextval('public.ticket_numero_seq'),
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT NULL,                       -- conteúdo/corpo inicial do chamado

  -- Solicitante (cliente que abriu)
  cliente_id UUID NULL,                       -- referência opcional ao cliente do sistema
  cliente_nome VARCHAR(255) NULL,
  cliente_email VARCHAR(255) NULL,
  cliente_telefone VARCHAR(50) NULL,

  -- Atendimento
  agente_id UUID NULL,                        -- funcionário responsável
  agente_nome VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Novo',
  prioridade VARCHAR(20) NOT NULL DEFAULT 'Média',
  tipo VARCHAR(60) NULL,                       -- ex: 'Suporte/Treinamento', 'Orçamento', etc.
  origem VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'email' | 'manual'

  lido BOOLEAN NOT NULL DEFAULT FALSE,         -- false => aparece como "Novo" em negrito

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  primeira_resposta_at TIMESTAMPTZ NULL,       -- quando o 1º atendimento respondeu
  fechado_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridade ON public.tickets(prioridade);
CREATE INDEX IF NOT EXISTS idx_tickets_agente_id ON public.tickets(agente_id);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_id ON public.tickets(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_numero ON public.tickets(numero);

-- 1.2 Mensagens do Ticket (thread)
CREATE TABLE IF NOT EXISTS public.ticket_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'resposta', -- 'resposta' (visível ao cliente) | 'anotacao' (interna) | 'cliente' (mensagem do cliente)
  conteudo TEXT NOT NULL,
  autor_id UUID NULL,
  autor_nome VARCHAR(255) NULL,
  autor_tipo VARCHAR(20) NOT NULL DEFAULT 'agente', -- 'agente' | 'cliente'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_ticket_id ON public.ticket_mensagens(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_created_at ON public.ticket_mensagens(created_at);

-- 1.3 Anexos das Mensagens
CREATE TABLE IF NOT EXISTS public.ticket_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  mensagem_id UUID NULL REFERENCES public.ticket_mensagens(id) ON DELETE CASCADE,
  arquivo_nome VARCHAR(255) NOT NULL,
  arquivo_tipo VARCHAR(100) NULL,               -- MIME type (image/png, application/pdf, image/gif, ...)
  arquivo_url TEXT NOT NULL,                     -- Data URL (base64) ou URL externa
  tamanho_bytes BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_anexos_ticket_id ON public.ticket_anexos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_anexos_mensagem_id ON public.ticket_anexos(mensagem_id);

-- RLS (mesmo padrão permissivo das demais tabelas do sistema)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura tickets" ON public.tickets;
CREATE POLICY "Permitir leitura tickets" ON public.tickets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao tickets" ON public.tickets;
CREATE POLICY "Permitir insercao tickets" ON public.tickets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update tickets" ON public.tickets;
CREATE POLICY "Permitir update tickets" ON public.tickets FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir delete tickets" ON public.tickets;
CREATE POLICY "Permitir delete tickets" ON public.tickets FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura ticket_mensagens" ON public.ticket_mensagens;
CREATE POLICY "Permitir leitura ticket_mensagens" ON public.ticket_mensagens FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao ticket_mensagens" ON public.ticket_mensagens;
CREATE POLICY "Permitir insercao ticket_mensagens" ON public.ticket_mensagens FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update ticket_mensagens" ON public.ticket_mensagens;
CREATE POLICY "Permitir update ticket_mensagens" ON public.ticket_mensagens FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir delete ticket_mensagens" ON public.ticket_mensagens;
CREATE POLICY "Permitir delete ticket_mensagens" ON public.ticket_mensagens FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura ticket_anexos" ON public.ticket_anexos;
CREATE POLICY "Permitir leitura ticket_anexos" ON public.ticket_anexos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao ticket_anexos" ON public.ticket_anexos;
CREATE POLICY "Permitir insercao ticket_anexos" ON public.ticket_anexos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update ticket_anexos" ON public.ticket_anexos;
CREATE POLICY "Permitir update ticket_anexos" ON public.ticket_anexos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir delete ticket_anexos" ON public.ticket_anexos;
CREATE POLICY "Permitir delete ticket_anexos" ON public.ticket_anexos FOR DELETE USING (true);

-- Realtime (para a lista atualizar em tempo real, opcional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_mensagens') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ticket_mensagens;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tickets]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[tickets] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [numero] INT IDENTITY(40000,1) NOT NULL,
    [titulo] NVARCHAR(500) NOT NULL,
    [descricao] NVARCHAR(MAX) NULL,

    [cliente_id] UNIQUEIDENTIFIER NULL,
    [cliente_nome] NVARCHAR(255) NULL,
    [cliente_email] NVARCHAR(255) NULL,
    [cliente_telefone] NVARCHAR(50) NULL,

    [agente_id] UNIQUEIDENTIFIER NULL,
    [agente_nome] NVARCHAR(255) NULL,
    [status] NVARCHAR(40) NOT NULL DEFAULT 'Novo',
    [prioridade] NVARCHAR(20) NOT NULL DEFAULT 'Média',
    [tipo] NVARCHAR(60) NULL,
    [origem] NVARCHAR(20) NOT NULL DEFAULT 'manual',

    [lido] BIT NOT NULL DEFAULT 0,

    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [primeira_resposta_at] DATETIME2 NULL,
    [fechado_at] DATETIME2 NULL,

    CONSTRAINT [uq_tickets_numero] UNIQUE ([numero])
  );

  CREATE NONCLUSTERED INDEX [idx_tickets_status] ON [dbo].[tickets] ([status]);
  CREATE NONCLUSTERED INDEX [idx_tickets_prioridade] ON [dbo].[tickets] ([prioridade]);
  CREATE NONCLUSTERED INDEX [idx_tickets_agente_id] ON [dbo].[tickets] ([agente_id]);
  CREATE NONCLUSTERED INDEX [idx_tickets_cliente_id] ON [dbo].[tickets] ([cliente_id]);
  CREATE NONCLUSTERED INDEX [idx_tickets_created_at] ON [dbo].[tickets] ([created_at] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_mensagens]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[ticket_mensagens] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [ticket_id] UNIQUEIDENTIFIER NOT NULL,
    [tipo] NVARCHAR(20) NOT NULL DEFAULT 'resposta', -- 'resposta' | 'anotacao' | 'cliente'
    [conteudo] NVARCHAR(MAX) NOT NULL,
    [autor_id] UNIQUEIDENTIFIER NULL,
    [autor_nome] NVARCHAR(255) NULL,
    [autor_tipo] NVARCHAR(20) NOT NULL DEFAULT 'agente', -- 'agente' | 'cliente'
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [fk_ticket_mensagens_ticket] FOREIGN KEY ([ticket_id]) REFERENCES [dbo].[tickets]([id]) ON DELETE CASCADE
  );

  CREATE NONCLUSTERED INDEX [idx_ticket_mensagens_ticket_id] ON [dbo].[ticket_mensagens] ([ticket_id]);
  CREATE NONCLUSTERED INDEX [idx_ticket_mensagens_created_at] ON [dbo].[ticket_mensagens] ([created_at]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_anexos]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[ticket_anexos] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [ticket_id] UNIQUEIDENTIFIER NOT NULL,
    [mensagem_id] UNIQUEIDENTIFIER NULL,
    [arquivo_nome] NVARCHAR(255) NOT NULL,
    [arquivo_tipo] NVARCHAR(100) NULL,
    [arquivo_url] NVARCHAR(MAX) NOT NULL,
    [tamanho_bytes] BIGINT NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [fk_ticket_anexos_ticket] FOREIGN KEY ([ticket_id]) REFERENCES [dbo].[tickets]([id]) ON DELETE CASCADE
  );

  CREATE NONCLUSTERED INDEX [idx_ticket_anexos_ticket_id] ON [dbo].[ticket_anexos] ([ticket_id]);
  CREATE NONCLUSTERED INDEX [idx_ticket_anexos_mensagem_id] ON [dbo].[ticket_anexos] ([mensagem_id]);
END
GO
