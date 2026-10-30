-- ============================================================
-- TABELA: empresa_vinculos
-- Permite vincular empresas do Mantran que pertencem ao mesmo cliente
-- (Vínculo direto e compartilhado entre empresas do mesmo grupo/cliente).
-- ============================================================

-- 1. POSTGRESQL (SUPABASE)
-- Execute no SQL Editor do Supabase (Dashboard -> SQL Editor):

CREATE TABLE IF NOT EXISTS public.empresa_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL,
  empresa_chave VARCHAR(255) NOT NULL,
  empresa_nome VARCHAR(255) NOT NULL,
  origem VARCHAR(20) NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_empresa_vinculos_chave UNIQUE(empresa_chave)
);

CREATE INDEX IF NOT EXISTS idx_empresa_vinculos_grupo_id ON public.empresa_vinculos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_empresa_vinculos_chave ON public.empresa_vinculos(empresa_chave);

-- Permissões RLS (padrão permissivo idêntico às demais tabelas de apoio)
ALTER TABLE public.empresa_vinculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura empresa_vinculos" ON public.empresa_vinculos;
CREATE POLICY "Permitir leitura empresa_vinculos" ON public.empresa_vinculos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao empresa_vinculos" ON public.empresa_vinculos;
CREATE POLICY "Permitir insercao empresa_vinculos" ON public.empresa_vinculos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao empresa_vinculos" ON public.empresa_vinculos;
CREATE POLICY "Permitir atualizacao empresa_vinculos" ON public.empresa_vinculos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao empresa_vinculos" ON public.empresa_vinculos;
CREATE POLICY "Permitir exclusao empresa_vinculos" ON public.empresa_vinculos FOR DELETE USING (true);


-- 2. SQL SERVER (dbSuporte) - Opcional caso utilize DAB / SQL Server
-- IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[empresa_vinculos]') AND type = N'U')
-- BEGIN
--   CREATE TABLE [dbo].[empresa_vinculos] (
--     [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
--     [grupo_id] UNIQUEIDENTIFIER NOT NULL,
--     [empresa_chave] NVARCHAR(255) NOT NULL,
--     [empresa_nome] NVARCHAR(255) NOT NULL,
--     [origem] NVARCHAR(20) NOT NULL DEFAULT 'cliente',
--     [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
--     CONSTRAINT [uq_empresa_vinculos_chave] UNIQUE([empresa_chave])
--   );
--   CREATE NONCLUSTERED INDEX [idx_empresa_vinculos_grupo_id] ON [dbo].[empresa_vinculos] ([grupo_id]);
-- END
-- GO
