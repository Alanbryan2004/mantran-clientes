-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e cole no SQL Editor do Supabase Dashboard
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'checkpoint',
  lida BOOLEAN DEFAULT FALSE,
  implantacao_id UUID NULL,
  cliente_id UUID NULL,
  dados_extras JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para alta performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_implantacao_id ON public.notificacoes(implantacao_id);

-- Habilitar Row Level Security (RLS) e Políticas
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura geral notificacoes" ON public.notificacoes;
CREATE POLICY "Permitir leitura geral notificacoes" ON public.notificacoes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao notificacoes" ON public.notificacoes;
CREATE POLICY "Permitir insercao notificacoes" ON public.notificacoes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update notificacoes" ON public.notificacoes;
CREATE POLICY "Permitir update notificacoes" ON public.notificacoes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete notificacoes" ON public.notificacoes;
CREATE POLICY "Permitir delete notificacoes" ON public.notificacoes
  FOR DELETE USING (true);

-- Habilitar Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Caso a publicação não esteja disponível no tier
  NULL;
END $$;


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notificacoes]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[notificacoes] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [titulo] NVARCHAR(255) NOT NULL,
    [mensagem] NVARCHAR(MAX) NOT NULL,
    [tipo] NVARCHAR(50) DEFAULT 'checkpoint',
    [lida] BIT DEFAULT 0,
    [implantacao_id] UNIQUEIDENTIFIER NULL,
    [cliente_id] UNIQUEIDENTIFIER NULL,
    [dados_extras] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  CREATE NONCLUSTERED INDEX [idx_notificacoes_lida] ON [dbo].[notificacoes] ([lida]);
  CREATE NONCLUSTERED INDEX [idx_notificacoes_created_at] ON [dbo].[notificacoes] ([created_at] DESC);
  CREATE NONCLUSTERED INDEX [idx_notificacoes_implantacao_id] ON [dbo].[notificacoes] ([implantacao_id]);
END
GO
