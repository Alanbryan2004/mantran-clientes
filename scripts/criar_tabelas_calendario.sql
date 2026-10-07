-- ============================================================
-- MÓDULO DE CALENDÁRIO / AGENDA
--
-- Estrutura:
--   calendario_eventos     -> o evento (título, descrição, datas, local, tipo, cor, criador)
--   calendario_convidados  -> usuários convidados para o evento + status + antecedência do lembrete
--   calendario_lembretes   -> lembretes agendados (uma linha por convidado/antecedência) p/ disparo
--
-- Observações:
--   - "tipo" categoriza o evento: 'treinamento' | 'validacao' | 'reuniao' | 'tarefa' | 'outro'
--   - "dia_inteiro" indica evento sem horário específico (ocupa o dia todo).
--   - Convidados têm status: 'pendente' | 'aceito' | 'recusado' | 'talvez'.
--   - "antecedencia_min" (por convidado) define quantos minutos antes do início
--     o usuário quer ser notificado (ex: 10, 30, 60, 1440 = 1 dia).
--   - calendario_lembretes materializa o "quando notificar" para o worker de e-mail
--     (quem está offline). A notificação in-app é calculada no cliente em tempo real.
-- ============================================================


-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1.1 Eventos
CREATE TABLE IF NOT EXISTS public.calendario_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(300) NOT NULL,
  descricao TEXT NULL,
  local VARCHAR(300) NULL,                       -- local físico ou link (ex: Teams/Meet)
  tipo VARCHAR(30) NOT NULL DEFAULT 'outro',     -- 'treinamento' | 'validacao' | 'reuniao' | 'tarefa' | 'outro'
  cor VARCHAR(20) NULL,                           -- cor opcional p/ exibição (hex ou nome do tema)

  inicio TIMESTAMPTZ NOT NULL,                    -- data/hora de início
  fim TIMESTAMPTZ NULL,                           -- data/hora de término (opcional)
  dia_inteiro BOOLEAN NOT NULL DEFAULT FALSE,

  -- Criador / organizador
  criado_por_id TEXT NULL,
  criado_por_nome VARCHAR(255) NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_eventos_inicio ON public.calendario_eventos(inicio);
CREATE INDEX IF NOT EXISTS idx_cal_eventos_criador ON public.calendario_eventos(criado_por_id);
CREATE INDEX IF NOT EXISTS idx_cal_eventos_tipo ON public.calendario_eventos(tipo);

-- 1.2 Convidados do evento
CREATE TABLE IF NOT EXISTS public.calendario_convidados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.calendario_eventos(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL,                       -- id do usuário convidado
  usuario_nome VARCHAR(255) NULL,
  usuario_email VARCHAR(255) NULL,                -- e-mail para o lembrete offline
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- 'pendente' | 'aceito' | 'recusado' | 'talvez'
  organizador BOOLEAN NOT NULL DEFAULT FALSE,     -- true = criador do evento
  antecedencia_min INTEGER NOT NULL DEFAULT 30,   -- minutos antes do início para notificar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cal_convidado UNIQUE (evento_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_cal_convidados_evento ON public.calendario_convidados(evento_id);
CREATE INDEX IF NOT EXISTS idx_cal_convidados_usuario ON public.calendario_convidados(usuario_id);

-- 1.3 Lembretes materializados (para disparo de e-mail por um worker/cron)
CREATE TABLE IF NOT EXISTS public.calendario_lembretes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.calendario_eventos(id) ON DELETE CASCADE,
  convidado_id UUID NOT NULL REFERENCES public.calendario_convidados(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL,
  usuario_email VARCHAR(255) NULL,
  disparar_em TIMESTAMPTZ NOT NULL,               -- inicio_do_evento - antecedencia
  enviado BOOLEAN NOT NULL DEFAULT FALSE,         -- true após o e-mail ser enviado
  enviado_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_lembretes_disparo ON public.calendario_lembretes(disparar_em) WHERE enviado = FALSE;
CREATE INDEX IF NOT EXISTS idx_cal_lembretes_evento ON public.calendario_lembretes(evento_id);

-- RLS (mesmo padrão permissivo das demais tabelas do sistema)
ALTER TABLE public.calendario_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_convidados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_lembretes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura cal_eventos" ON public.calendario_eventos;
CREATE POLICY "Permitir leitura cal_eventos" ON public.calendario_eventos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao cal_eventos" ON public.calendario_eventos;
CREATE POLICY "Permitir insercao cal_eventos" ON public.calendario_eventos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update cal_eventos" ON public.calendario_eventos;
CREATE POLICY "Permitir update cal_eventos" ON public.calendario_eventos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir delete cal_eventos" ON public.calendario_eventos;
CREATE POLICY "Permitir delete cal_eventos" ON public.calendario_eventos FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura cal_convidados" ON public.calendario_convidados;
CREATE POLICY "Permitir leitura cal_convidados" ON public.calendario_convidados FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao cal_convidados" ON public.calendario_convidados;
CREATE POLICY "Permitir insercao cal_convidados" ON public.calendario_convidados FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update cal_convidados" ON public.calendario_convidados;
CREATE POLICY "Permitir update cal_convidados" ON public.calendario_convidados FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir delete cal_convidados" ON public.calendario_convidados;
CREATE POLICY "Permitir delete cal_convidados" ON public.calendario_convidados FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura cal_lembretes" ON public.calendario_lembretes;
CREATE POLICY "Permitir leitura cal_lembretes" ON public.calendario_lembretes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao cal_lembretes" ON public.calendario_lembretes;
CREATE POLICY "Permitir insercao cal_lembretes" ON public.calendario_lembretes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update cal_lembretes" ON public.calendario_lembretes;
CREATE POLICY "Permitir update cal_lembretes" ON public.calendario_lembretes FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir delete cal_lembretes" ON public.calendario_lembretes;
CREATE POLICY "Permitir delete cal_lembretes" ON public.calendario_lembretes FOR DELETE USING (true);

-- Realtime (para o calendário e o sininho atualizarem em tempo real)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'calendario_eventos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calendario_eventos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'calendario_convidados') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calendario_convidados;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte) -- opcional
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[calendario_eventos]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[calendario_eventos] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [titulo] NVARCHAR(300) NOT NULL,
    [descricao] NVARCHAR(MAX) NULL,
    [local] NVARCHAR(300) NULL,
    [tipo] NVARCHAR(30) NOT NULL DEFAULT 'outro',
    [cor] NVARCHAR(20) NULL,
    [inicio] DATETIME2 NOT NULL,
    [fim] DATETIME2 NULL,
    [dia_inteiro] BIT NOT NULL DEFAULT 0,
    [criado_por_id] NVARCHAR(100) NULL,
    [criado_por_nome] NVARCHAR(255) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE NONCLUSTERED INDEX [idx_cal_eventos_inicio] ON [dbo].[calendario_eventos] ([inicio]);
  CREATE NONCLUSTERED INDEX [idx_cal_eventos_criador] ON [dbo].[calendario_eventos] ([criado_por_id]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[calendario_convidados]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[calendario_convidados] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [evento_id] UNIQUEIDENTIFIER NOT NULL,
    [usuario_id] NVARCHAR(100) NOT NULL,
    [usuario_nome] NVARCHAR(255) NULL,
    [usuario_email] NVARCHAR(255) NULL,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'pendente',
    [organizador] BIT NOT NULL DEFAULT 0,
    [antecedencia_min] INT NOT NULL DEFAULT 30,
    [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [fk_cal_convidados_evento] FOREIGN KEY ([evento_id]) REFERENCES [dbo].[calendario_eventos]([id]) ON DELETE CASCADE,
    CONSTRAINT [uq_cal_convidado] UNIQUE ([evento_id], [usuario_id])
  );
  CREATE NONCLUSTERED INDEX [idx_cal_convidados_evento] ON [dbo].[calendario_convidados] ([evento_id]);
  CREATE NONCLUSTERED INDEX [idx_cal_convidados_usuario] ON [dbo].[calendario_convidados] ([usuario_id]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[calendario_lembretes]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[calendario_lembretes] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [evento_id] UNIQUEIDENTIFIER NOT NULL,
    [convidado_id] UNIQUEIDENTIFIER NOT NULL,
    [usuario_id] NVARCHAR(100) NOT NULL,
    [usuario_email] NVARCHAR(255) NULL,
    [disparar_em] DATETIME2 NOT NULL,
    [enviado] BIT NOT NULL DEFAULT 0,
    [enviado_em] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [fk_cal_lembretes_evento] FOREIGN KEY ([evento_id]) REFERENCES [dbo].[calendario_eventos]([id]) ON DELETE CASCADE
  );
  CREATE NONCLUSTERED INDEX [idx_cal_lembretes_disparo] ON [dbo].[calendario_lembretes] ([disparar_em]);
  CREATE NONCLUSTERED INDEX [idx_cal_lembretes_evento] ON [dbo].[calendario_lembretes] ([evento_id]);
END
GO

-- ============================================================
-- 3. NOTIFICAÇÕES DO CALENDÁRIO — como funcionam
-- ============================================================
-- a) IN-APP (sininho): calculada no navegador em tempo real (lembretesCalendario.ts).
--    Enquanto o usuário está com o sistema aberto, recebe o aviso quando faltar a
--    antecedência configurada (antecedencia_min) para o início do evento. Também
--    recebe uma notificação direcionada ao ser convidado (tipo 'calendario_convite').
--
-- b) E-MAIL (offline): a tabela calendario_lembretes materializa "quando avisar".
--    A função serverless /api/lembretes-calendario varre os lembretes vencidos
--    (disparar_em <= agora, enviado = false), envia e-mail usando o SMTP de config_email
--    e marca enviado = true.
--
--    ATIVAÇÃO DO DISPARO AGENDADO (Vercel Cron):
--      - Já configurado em vercel.json: executa /api/lembretes-calendario a cada 5 min.
--      - (Opcional) Defina a env CRON_SECRET na Vercel e o cron enviará o header
--        Authorization: Bearer <CRON_SECRET> para proteger o endpoint.
--      - Requer as envs SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou as VITE_*) na Vercel.
--      - Para que o e-mail saia, o SMTP precisa estar preenchido em Admin → E-mail (config_email)
--        e cada convidado precisa ter e-mail (email_corporativo/pessoal) cadastrado.
