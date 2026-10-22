-- ============================================================
-- FAQ / Wiki de Procedimentos (passo a passo) — Mantran
--
-- Estrutura (espelha a wiki do time):
--   faq_categorias   -> seções da barra lateral (ex.: Cadastros, Importação de planilhas)
--   faq_procedimentos-> um procedimento (ex.: "Cadastro de veículo") com breadcrumb/caminho
--   faq_passos       -> os passos numerados, com texto (HTML simples) e imagem (URL)
--
-- Imagens: guardamos apenas a URL (hospedadas no Supabase Storage, bucket "faq").
-- ============================================================


-- ============================================================
-- 1. PostgreSQL (Supabase) — SQL Editor do Dashboard
-- ============================================================

-- Seções/categorias da sidebar
CREATE TABLE IF NOT EXISTS public.faq_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Procedimentos (um "como fazer")
CREATE TABLE IF NOT EXISTS public.faq_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.faq_categorias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NULL,               -- subtítulo cinza
  caminho_menu TEXT NULL,            -- breadcrumb: "Módulo Shopee › Cadastros › Veículo"
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por_id UUID NULL,
  criado_por_nome TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Passos numerados de cada procedimento
CREATE TABLE IF NOT EXISTS public.faq_passos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimento_id UUID REFERENCES public.faq_procedimentos(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  texto TEXT NULL,                   -- permite <b> para destacar campos
  imagem_url TEXT NULL,              -- URL no Supabase Storage (bucket faq)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_faq_proc_categoria ON public.faq_procedimentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_faq_passos_proc ON public.faq_passos(procedimento_id);

-- RLS (mesmo padrão das demais tabelas internas: acesso liberado)
ALTER TABLE public.faq_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_passos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all faq_categorias" ON public.faq_categorias;
CREATE POLICY "Allow all faq_categorias" ON public.faq_categorias FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all faq_procedimentos" ON public.faq_procedimentos;
CREATE POLICY "Allow all faq_procedimentos" ON public.faq_procedimentos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all faq_passos" ON public.faq_passos;
CREATE POLICY "Allow all faq_passos" ON public.faq_passos FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- STORAGE (Supabase): bucket público "faq" para as imagens dos passos.
-- Execute também no SQL Editor (ou crie o bucket pelo painel Storage).
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('faq', 'faq', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket (leitura pública; escrita liberada p/ anon — uso interno)
DROP POLICY IF EXISTS "faq_read" ON storage.objects;
CREATE POLICY "faq_read" ON storage.objects FOR SELECT USING (bucket_id = 'faq');
DROP POLICY IF EXISTS "faq_insert" ON storage.objects;
CREATE POLICY "faq_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'faq');
DROP POLICY IF EXISTS "faq_update" ON storage.objects;
CREATE POLICY "faq_update" ON storage.objects FOR UPDATE USING (bucket_id = 'faq');
DROP POLICY IF EXISTS "faq_delete" ON storage.objects;
CREATE POLICY "faq_delete" ON storage.objects FOR DELETE USING (bucket_id = 'faq');


-- ============================================================
-- 2. SQL Server (dbSuporte) — SSMS
-- (As imagens continuam no Supabase Storage; aqui guardamos só a URL.)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'faq_categorias' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE [dbo].[faq_categorias] (
    [id]         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [nome]       NVARCHAR(255) NOT NULL,
    [ordem]      INT NOT NULL DEFAULT 0,
    [ativo]      BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'faq_procedimentos' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE [dbo].[faq_procedimentos] (
    [id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [categoria_id]    UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES [dbo].[faq_categorias]([id]) ON DELETE CASCADE,
    [titulo]          NVARCHAR(500) NOT NULL,
    [descricao]       NVARCHAR(MAX) NULL,
    [caminho_menu]    NVARCHAR(500) NULL,
    [ordem]           INT NOT NULL DEFAULT 0,
    [ativo]           BIT NOT NULL DEFAULT 1,
    [criado_por_id]   UNIQUEIDENTIFIER NULL,
    [criado_por_nome] NVARCHAR(255) NULL,
    [created_at]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [updated_at]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE NONCLUSTERED INDEX [idx_faq_proc_categoria] ON [dbo].[faq_procedimentos] ([categoria_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'faq_passos' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE [dbo].[faq_passos] (
    [id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [procedimento_id] UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES [dbo].[faq_procedimentos]([id]) ON DELETE CASCADE,
    [ordem]           INT NOT NULL DEFAULT 0,
    [texto]           NVARCHAR(MAX) NULL,
    [imagem_url]      NVARCHAR(MAX) NULL,
    [created_at]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE NONCLUSTERED INDEX [idx_faq_passos_proc] ON [dbo].[faq_passos] ([procedimento_id]);
END
GO

-- ============================================================
-- 3. ATUALIZAÇÃO: Módulo da seção
--    Cada seção (categoria) passa a pertencer a um "Módulo" (ex.: Shopee,
--    Operação, Faturamento). Usado para agrupar as seções na barra lateral.
-- ============================================================

-- PostgreSQL (Supabase)
ALTER TABLE public.faq_categorias ADD COLUMN IF NOT EXISTS modulo TEXT NULL;

-- SQL Server (dbSuporte)
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.faq_categorias') AND name = 'modulo'
)
BEGIN
  ALTER TABLE [dbo].[faq_categorias] ADD [modulo] NVARCHAR(255) NULL;
END
GO
