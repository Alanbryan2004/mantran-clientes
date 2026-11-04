-- =====================================================================
-- SCRIPT DE MIGRAÇÃO: Processos Shopee vinculados aos Clientes (Supabase / PostgreSQL)
-- =====================================================================
-- Contexto:
-- Vincula os processos operacionais da Shopee (First Mile, Line Haul, Last Mile, Mobile Hub)
-- diretamente no cadastro do Cliente na tabela 'clientes', sincronizando com o que
-- já foi preenchido nas Implantações (campo operacoes_shopee).
-- =====================================================================

-- 1. Adicionar coluna processos_shopee na tabela clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS processos_shopee TEXT[] DEFAULT '{}';

COMMENT ON COLUMN clientes.processos_shopee IS 'Processos/Operações Shopee que o cliente executa (First Mile, Line Haul, Last Mile, Mobile Hub)';

-- 2. Índice GIN para acelerar consultas por processo (ex: WHERE 'Last Mile' = ANY(processos_shopee))
CREATE INDEX IF NOT EXISTS idx_clientes_processos_shopee ON clientes USING GIN (processos_shopee);

-- 3. Migração inicial: sincronizar dados dos clientes Shopee que já possuem implantação com operações
UPDATE clientes c
SET processos_shopee = i.operacoes_shopee
FROM implantacoes i
WHERE (i.cliente_id = c.id OR LOWER(TRIM(i.nome_empresa)) = LOWER(TRIM(c.nome_empresa)))
  AND c.tipo = 'SHOPEE'
  AND i.operacoes_shopee IS NOT NULL
  AND array_length(i.operacoes_shopee, 1) > 0
  AND (c.processos_shopee IS NULL OR array_length(c.processos_shopee, 1) IS NULL OR array_length(c.processos_shopee, 1) = 0);
