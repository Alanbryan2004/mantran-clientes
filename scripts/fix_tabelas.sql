-- SCRIPT DE CORREÇÃO FINAL (Rodar no dbSuporte)
-- Ajusta as colunas que estavam com nomes diferentes na migração

-- 1. Corrige a tabela usuario (autenticação admin)
ALTER TABLE usuario DROP COLUMN email;
ALTER TABLE usuario ADD login NVARCHAR(255);
ALTER TABLE usuario ADD ativo BIT DEFAULT 1;

-- 2. Corrige a tabela leo_empresas
ALTER TABLE leo_empresas ADD tipo NVARCHAR(50);

-- 3. Corrige a tabela leo_usuarios
ALTER TABLE leo_usuarios DROP COLUMN email;
ALTER TABLE leo_usuarios ADD login NVARCHAR(255);
