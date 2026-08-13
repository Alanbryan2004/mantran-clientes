-- SCRIPT DE CORREÇÃO ADICIONAL (Rodar no dbSuporte)

-- 1. Corrige a tabela leo_empresas (tinha uma coluna cd_empresa no Supabase)
ALTER TABLE leo_empresas ADD cd_empresa NVARCHAR(50);

-- 2. Corrige a tabela leo_usuarios (nome da coluna de relacionamento)
EXEC sp_rename 'leo_usuarios.empresa_id', 'leo_empresa_id', 'COLUMN';
