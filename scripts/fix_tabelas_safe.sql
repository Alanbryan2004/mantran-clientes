-- SCRIPT DE CORREÇÃO À PROVA DE FALHAS (Rodar no dbSuporte)
-- Este script verifica se a coluna já existe antes de tentar criar ou apagar

-- 1. Tabela usuario
IF COL_LENGTH('dbo.usuario', 'email') IS NOT NULL 
    ALTER TABLE usuario DROP COLUMN email;

IF COL_LENGTH('dbo.usuario', 'login') IS NULL 
    ALTER TABLE usuario ADD login NVARCHAR(255);

IF COL_LENGTH('dbo.usuario', 'ativo') IS NULL 
    ALTER TABLE usuario ADD ativo BIT DEFAULT 1;

-- 2. Tabela leo_empresas
IF COL_LENGTH('dbo.leo_empresas', 'cd_empresa') IS NULL 
    ALTER TABLE leo_empresas ADD cd_empresa NVARCHAR(50);

IF COL_LENGTH('dbo.leo_empresas', 'tipo') IS NULL 
    ALTER TABLE leo_empresas ADD tipo NVARCHAR(50);

-- 3. Tabela leo_usuarios
IF COL_LENGTH('dbo.leo_usuarios', 'email') IS NOT NULL 
    ALTER TABLE leo_usuarios DROP COLUMN email;

IF COL_LENGTH('dbo.leo_usuarios', 'login') IS NULL 
    ALTER TABLE leo_usuarios ADD login NVARCHAR(255);

IF COL_LENGTH('dbo.leo_usuarios', 'empresa_id') IS NOT NULL 
    EXEC sp_rename 'leo_usuarios.empresa_id', 'leo_empresa_id', 'COLUMN';
