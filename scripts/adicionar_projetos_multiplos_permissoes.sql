-- =========================================================================
-- TABELA E PERMISSÕES: perfil_permissoes
-- Suporte a permissões por perfil, rotas e múltiplos projetos
-- =========================================================================

-- ============================================================
-- 1. POSTGRESQL (SUPABASE)
-- ============================================================
-- Criação da coluna de múltiplos projetos se não existir
ALTER TABLE public.perfil_permissoes
  ADD COLUMN IF NOT EXISTS projetos_ids_permitidos JSONB NULL DEFAULT '[]'::jsonb;

-- Migração de dados existentes (backfill)
UPDATE public.perfil_permissoes
SET projetos_ids_permitidos = to_jsonb(ARRAY[projeto_id_permitido])
WHERE projeto_id_permitido IS NOT NULL
  AND (projetos_ids_permitidos IS NULL OR projetos_ids_permitidos = '[]'::jsonb);


-- =========================================================================
-- 2. SQL SERVER (T-SQL - dbSuporte)
-- =========================================================================

USE dbSuporte;
GO

-- 1. Cria a tabela perfil_permissoes se não existir
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'perfil_permissoes')
BEGIN
    CREATE TABLE [dbo].[perfil_permissoes] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [perfil] NVARCHAR(100) NOT NULL UNIQUE,
        [rotas_permitidas] NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        [projeto_id_permitido] NVARCHAR(100) NULL,
        [projetos_ids_permitidos] NVARCHAR(MAX) NULL DEFAULT '[]',
        [read_only] BIT NOT NULL DEFAULT 0,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 2. Garante que a coluna projetos_ids_permitidos exista caso a tabela já exista
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[perfil_permissoes]') AND name = 'projetos_ids_permitidos')
BEGIN
    ALTER TABLE [dbo].[perfil_permissoes] 
      ADD [projetos_ids_permitidos] NVARCHAR(MAX) NULL DEFAULT '[]';
END
GO

-- 3. Carga Inicial dos Perfis Padrão (caso não existam)
IF NOT EXISTS (SELECT 1 FROM [dbo].[perfil_permissoes] WHERE [perfil] = 'Administrador')
BEGIN
    INSERT INTO [dbo].[perfil_permissoes] ([id], [perfil], [rotas_permitidas], [read_only], [projetos_ids_permitidos])
    VALUES (NEWID(), 'Administrador', '["/","/clientes","/implantacoes","/bases","/leo-madeiras","/rh","/tickets","/comercial","/processamento-shopee"]', 0, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[perfil_permissoes] WHERE [perfil] = 'Suporte')
BEGIN
    INSERT INTO [dbo].[perfil_permissoes] ([id], [perfil], [rotas_permitidas], [read_only], [projetos_ids_permitidos])
    VALUES (NEWID(), 'Suporte', '["/","/clientes","/implantacoes","/bases","/leo-madeiras","/rh","/tickets"]', 0, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[perfil_permissoes] WHERE [perfil] = 'Tecnico')
BEGIN
    INSERT INTO [dbo].[perfil_permissoes] ([id], [perfil], [rotas_permitidas], [read_only], [projetos_ids_permitidos])
    VALUES (NEWID(), 'Tecnico', '["/","/clientes","/bases","/leo-madeiras","/rh","/tickets"]', 0, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[perfil_permissoes] WHERE [perfil] = 'Comercial')
BEGIN
    INSERT INTO [dbo].[perfil_permissoes] ([id], [perfil], [rotas_permitidas], [read_only], [projetos_ids_permitidos])
    VALUES (NEWID(), 'Comercial', '["/comercial","/implantacoes"]', 0, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[perfil_permissoes] WHERE [perfil] = 'Usuario')
BEGIN
    INSERT INTO [dbo].[perfil_permissoes] ([id], [perfil], [rotas_permitidas], [read_only], [projetos_ids_permitidos])
    VALUES (NEWID(), 'Usuario', '["/","/clientes","/implantacoes","/bases","/leo-madeiras"]', 1, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[perfil_permissoes] WHERE [perfil] = 'Cliente')
BEGIN
    INSERT INTO [dbo].[perfil_permissoes] ([id], [perfil], [rotas_permitidas], [read_only], [projetos_ids_permitidos])
    VALUES (NEWID(), 'Cliente', '["/implantacoes"]', 1, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[perfil_permissoes] WHERE [perfil] = 'Parceiro')
BEGIN
    INSERT INTO [dbo].[perfil_permissoes] ([id], [perfil], [rotas_permitidas], [read_only], [projetos_ids_permitidos])
    VALUES (NEWID(), 'Parceiro', '["/bases","/processamento-shopee"]', 0, '[]');
END
GO
