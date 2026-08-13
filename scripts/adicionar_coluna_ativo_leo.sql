-- =============================================
-- SQL para adicionar a coluna 'ativo' na tabela leo_empresas
-- Execute este comando no SQL Editor do Supabase:
-- =============================================

ALTER TABLE leo_empresas 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Garante que todas as empresas existentes estejam marcadas como ativas (true)
UPDATE leo_empresas 
SET ativo = true 
WHERE ativo IS NULL;
