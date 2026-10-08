-- ============================================================
-- Vínculo contratual do funcionário (CLT x CNPJ)
--
--   tipo_vinculo -> 'CLT' | 'CNPJ'
--
-- Regra de negócio: funcionários CNPJ (PJ) NÃO registram ponto.
-- O controle de ponto (rh_ponto) continua valendo apenas para CLT.
--
-- Default 'CLT' para não quebrar os registros já existentes
-- (basta ajustar manualmente quem for CNPJ depois).
-- ============================================================


-- ============================================================
-- 1. PostgreSQL (Supabase)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS tipo_vinculo VARCHAR(4) NOT NULL DEFAULT 'CLT';

-- Garante que só aceita CLT ou CNPJ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuario_tipo_vinculo'
  ) THEN
    ALTER TABLE public.usuario
      ADD CONSTRAINT chk_usuario_tipo_vinculo
      CHECK (tipo_vinculo IN ('CLT', 'CNPJ'));
  END IF;
END $$;


-- ============================================================
-- 2. SQL Server (dbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'tipo_vinculo'
)
BEGIN
  ALTER TABLE [dbo].[usuario]
    ADD [tipo_vinculo] NVARCHAR(4) NOT NULL
    CONSTRAINT df_usuario_tipo_vinculo DEFAULT 'CLT';
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints WHERE name = 'chk_usuario_tipo_vinculo'
)
BEGIN
  ALTER TABLE [dbo].[usuario]
    ADD CONSTRAINT chk_usuario_tipo_vinculo
    CHECK ([tipo_vinculo] IN ('CLT', 'CNPJ'));
END
GO
