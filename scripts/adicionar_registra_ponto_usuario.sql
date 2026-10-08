-- ============================================================
-- Controle de registro de ponto por funcionário
--
--   registra_ponto -> true  = funcionário bate ponto
--                      false = funcionário NÃO bate ponto
--
-- Regra de negócio sugerida: CNPJ (PJ) normalmente NÃO bate ponto,
-- mas este campo é independente para permitir exceções
-- (ex.: estagiário CLT que não bate, ou PJ que vocês querem
-- que registre). Quem decide é o RH na tela de edição.
--
-- Default true (bate ponto) para não alterar o comportamento
-- atual dos funcionários CLT já cadastrados.
-- ============================================================


-- ============================================================
-- 1. PostgreSQL (Supabase)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS registra_ponto BOOLEAN NOT NULL DEFAULT true;

-- (Opcional) alinhar os CNPJ já cadastrados para não baterem ponto.
-- Descomente se quiser aplicar essa regra retroativamente:
-- UPDATE public.usuario SET registra_ponto = false WHERE tipo_vinculo = 'CNPJ';


-- ============================================================
-- 2. SQL Server (dbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'registra_ponto'
)
BEGIN
  ALTER TABLE [dbo].[usuario]
    ADD [registra_ponto] BIT NOT NULL
    CONSTRAINT df_usuario_registra_ponto DEFAULT 1;
END
GO

-- (Opcional) alinhar os CNPJ já cadastrados para não baterem ponto:
-- UPDATE [dbo].[usuario] SET [registra_ponto] = 0 WHERE [tipo_vinculo] = 'CNPJ';
-- GO
