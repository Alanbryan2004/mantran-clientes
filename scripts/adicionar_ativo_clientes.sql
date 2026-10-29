-- =============================================================================
-- Coluna "ativo" na tabela clientes (Cadastro de Clientes).
-- Usada na aba "Empresas" da tela de Tickets para ativar/desativar a empresa.
-- A tabela leo_empresas já possui a coluna "ativo".
-- =============================================================================

-- PostgreSQL (Supabase)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- SQL Server (dbSuporte)
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.clientes') AND name = 'ativo')
-- BEGIN
--   ALTER TABLE [dbo].[clientes] ADD [ativo] BIT NOT NULL DEFAULT 1;
-- END
-- GO
