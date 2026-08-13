-- SCRIPT DE CORREÇÃO NULL (Rodar no dbSuporte)
-- Remove as restrições "NOT NULL" de colunas que no Supabase possuem valores vazios (null)

ALTER TABLE modulos_mantran ALTER COLUMN nome_modulo NVARCHAR(255) NULL;
ALTER TABLE leo_usuarios ALTER COLUMN nome NVARCHAR(255) NULL;
ALTER TABLE leo_empresas ALTER COLUMN nome_empresa NVARCHAR(255) NULL;
