-- =========================================================================
-- SCRIPT DE ADIÇÃO DOS CAMPOS DE ANEXO DO ADITIVO EM CLIENTES
-- (SUPABASE / POSTGRESQL E SQL SERVER / DBSUPORTE)
-- =========================================================================

-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS possui_aditivo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS arquivo_aditivo_nome VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS arquivo_aditivo_base64 TEXT NULL,
ADD COLUMN IF NOT EXISTS arquivo_aditivo_tamanho BIGINT NULL;


-- =========================================================================
-- 2. SCRIPT PARA O SQL SERVER (T-SQL - DbSuporte)
-- Execute no SQL Server Management Studio (SSMS)
-- =========================================================================

USE dbSuporte;
GO

-- 2.1 Adicionar Coluna possui_aditivo
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[clientes]') AND name = 'possui_aditivo'
)
BEGIN
  ALTER TABLE [dbo].[clientes] ADD [possui_aditivo] BIT DEFAULT 0;
END
GO

-- 2.2 Adicionar Coluna arquivo_aditivo_nome
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[clientes]') AND name = 'arquivo_aditivo_nome'
)
BEGIN
  ALTER TABLE [dbo].[clientes] ADD [arquivo_aditivo_nome] VARCHAR(255) NULL;
END
GO

-- 2.3 Adicionar Coluna arquivo_aditivo_base64
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[clientes]') AND name = 'arquivo_aditivo_base64'
)
BEGIN
  ALTER TABLE [dbo].[clientes] ADD [arquivo_aditivo_base64] VARCHAR(MAX) NULL;
END
GO

-- 2.4 Adicionar Coluna arquivo_aditivo_tamanho
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[clientes]') AND name = 'arquivo_aditivo_tamanho'
)
BEGIN
  ALTER TABLE [dbo].[clientes] ADD [arquivo_aditivo_tamanho] BIGINT NULL;
END
GO
