-- ============================================================
-- ADICIONAR COLUNA foto_url NA TABELA usuario
--
-- Armazena a foto (avatar) do colaborador como Data URL (base64),
-- no mesmo padrão já usado para anexos de atestados (arquivo_atestado_url).
-- ============================================================


-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================

ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS foto_url TEXT NULL;


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'foto_url'
)
BEGIN
  ALTER TABLE [dbo].[usuario] ADD [foto_url] NVARCHAR(MAX) NULL;
END
GO
