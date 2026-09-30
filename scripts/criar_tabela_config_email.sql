-- ============================================================
-- Configuração de E-mail (SMTP) do sistema de Tickets
-- Guarda os dados da conta usada para ENVIAR respostas de chamados
-- e (futuramente) RECEBER e-mails que viram chamados.
--
-- ATENÇÃO SEGURANÇA: a senha aqui é sensível. O ENVIO de e-mail deve
-- ocorrer SEMPRE no backend (função servidor), nunca no navegador.
-- Usamos uma única linha de configuração (singleton via chave fixa).
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
CREATE TABLE IF NOT EXISTS public.config_email (
  id TEXT PRIMARY KEY DEFAULT 'default',      -- singleton: sempre 'default'
  -- Envio (SMTP)
  smtp_host TEXT NULL,
  smtp_porta INTEGER NULL DEFAULT 587,
  smtp_seguranca TEXT NULL DEFAULT 'STARTTLS', -- 'STARTTLS' | 'SSL' | 'NENHUMA'
  smtp_usuario TEXT NULL,
  smtp_senha TEXT NULL,
  remetente_nome TEXT NULL,
  remetente_email TEXT NULL,
  -- Recebimento (POP/IMAP) — para a fase de "e-mail vira chamado"
  entrada_protocolo TEXT NULL DEFAULT 'IMAP',  -- 'IMAP' | 'POP'
  entrada_host TEXT NULL,
  entrada_porta INTEGER NULL,
  entrada_ssl BOOLEAN NULL DEFAULT true,
  -- Liga/desliga o processamento de e-mails
  ativo BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT config_email_singleton CHECK (id = 'default')
);

ALTER TABLE public.config_email ENABLE ROW LEVEL SECURITY;

-- Observação: enquanto o app usa a anon key, mantemos o padrão do projeto.
-- Na migração de segurança, restringir estas políticas.
DROP POLICY IF EXISTS "leitura config_email" ON public.config_email;
CREATE POLICY "leitura config_email" ON public.config_email FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert config_email" ON public.config_email;
CREATE POLICY "insert config_email" ON public.config_email FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "update config_email" ON public.config_email;
CREATE POLICY "update config_email" ON public.config_email FOR UPDATE USING (true);

-- Linha inicial (vazia) para já existir o registro 'default'
INSERT INTO public.config_email (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;


-- ---------- SQL Server (dbSuporte) ----------
-- IF OBJECT_ID(N'[dbo].[config_email]', N'U') IS NULL
-- BEGIN
--   CREATE TABLE [dbo].[config_email] (
--     [id] NVARCHAR(20) NOT NULL DEFAULT 'default' PRIMARY KEY,
--     [smtp_host] NVARCHAR(255) NULL,
--     [smtp_porta] INT NULL,
--     [smtp_seguranca] NVARCHAR(20) NULL,
--     [smtp_usuario] NVARCHAR(255) NULL,
--     [smtp_senha] NVARCHAR(255) NULL,
--     [remetente_nome] NVARCHAR(255) NULL,
--     [remetente_email] NVARCHAR(255) NULL,
--     [entrada_protocolo] NVARCHAR(20) NULL,
--     [entrada_host] NVARCHAR(255) NULL,
--     [entrada_porta] INT NULL,
--     [entrada_ssl] BIT NULL,
--     [ativo] BIT NOT NULL DEFAULT 0,
--     [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
--   );
--   INSERT INTO [dbo].[config_email] ([id]) VALUES ('default');
-- END
