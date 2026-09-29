-- =========================================================================
-- SCRIPT DE ADIÇÃO DOS CAMPOS DE E-MAILS (EMPRESA E PARTICULAR)
-- NA TABELA USUARIO (SUPABASE E SQL SERVER)
-- =========================================================================

-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

ALTER TABLE public.usuario 
ADD COLUMN IF NOT EXISTS email_corporativo VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS email_pessoal VARCHAR(255) NULL;


-- =========================================================================
-- 2. SCRIPT PARA O SQL SERVER (T-SQL - DbSuporte)
-- Execute no SQL Server Management Studio (SSMS)
-- =========================================================================

USE dbSuporte;
GO

-- 2.1 Adicionar Coluna email_corporativo
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'email_corporativo'
)
BEGIN
  ALTER TABLE [dbo].[usuario] ADD [email_corporativo] NVARCHAR(255) NULL;
  PRINT '✅ Coluna email_corporativo adicionada na tabela usuario!';
END
ELSE
BEGIN
  PRINT 'ℹ️ Coluna email_corporativo já existe na tabela usuario.';
END
GO

-- 2.2 Adicionar Coluna email_pessoal
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'email_pessoal'
)
BEGIN
  ALTER TABLE [dbo].[usuario] ADD [email_pessoal] NVARCHAR(255) NULL;
  PRINT '✅ Coluna email_pessoal adicionada na tabela usuario!';
END
ELSE
BEGIN
  PRINT 'ℹ️ Coluna email_pessoal já existe na tabela usuario.';
END
GO
