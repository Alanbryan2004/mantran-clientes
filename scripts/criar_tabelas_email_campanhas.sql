-- =============================================================================
-- E-MAIL EM MASSA - Histórico de campanhas e envios individuais
--
-- Reaproveita a configuração de SMTP já existente (tabela config_email).
-- Aqui guardamos apenas o histórico dos disparos em massa feitos na
-- aba Empresas (envio 1 por vez para evitar bloqueio/SPAM).
--
-- Banco: Supabase (PostgreSQL) — executar no SQL Editor.
-- =============================================================================

-- 1. Campanha = um lote de envio (ex.: "Comunicado para clientes Shopee")
CREATE TABLE IF NOT EXISTS public.email_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assunto TEXT NOT NULL,
  corpo_html TEXT,                         -- template com variáveis {{nome}} / {{empresa}}
  filtro_tipo TEXT,                        -- 'TODOS' | 'NORMAL' | 'SHOPEE' | 'LEO'
  somente_ativos BOOLEAN NOT NULL DEFAULT true,
  intervalo_ms INT NOT NULL DEFAULT 4000,  -- pausa entre envios (anti-spam)
  total_destinatarios INT NOT NULL DEFAULT 0,
  total_enviados INT NOT NULL DEFAULT 0,
  total_falhas INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO'
    CHECK (status IN ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'PAUSADA')),
  criado_por_id UUID NULL,
  criado_por_nome TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Envio individual = um registro por destinatário
CREATE TABLE IF NOT EXISTS public.email_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID REFERENCES public.email_campanhas(id) ON DELETE CASCADE,
  contato_id UUID NULL,                    -- referência solta ao ticket_contatos (pode ser nula)
  email TEXT NOT NULL,
  nome TEXT NULL,
  empresa_nome TEXT NULL,
  tipo_empresa TEXT NULL,                  -- NORMAL | SHOPEE | LÉO MADEIRAS
  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'ENVIADO', 'ERRO', 'IGNORADO')),
  erro TEXT NULL,                          -- mensagem de falha, quando status = ERRO
  enviado_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Descadastro (opt-out): e-mails que pediram para não receber mais
CREATE TABLE IF NOT EXISTS public.email_descadastros (
  email TEXT PRIMARY KEY,                  -- sempre em minúsculo
  motivo TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_email_envios_campanha ON public.email_envios(campanha_id);
CREATE INDEX IF NOT EXISTS idx_email_envios_email ON public.email_envios(email);
CREATE INDEX IF NOT EXISTS idx_email_envios_status ON public.email_envios(status);
CREATE INDEX IF NOT EXISTS idx_email_campanhas_created ON public.email_campanhas(created_at DESC);

-- 5. RLS (mesmo padrão das demais tabelas internas: acesso liberado)
ALTER TABLE public.email_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_descadastros ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_campanhas' AND policyname = 'Allow all email_campanhas') THEN
    CREATE POLICY "Allow all email_campanhas" ON public.email_campanhas FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_envios' AND policyname = 'Allow all email_envios') THEN
    CREATE POLICY "Allow all email_envios" ON public.email_envios FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_descadastros' AND policyname = 'Allow all email_descadastros') THEN
    CREATE POLICY "Allow all email_descadastros" ON public.email_descadastros FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
