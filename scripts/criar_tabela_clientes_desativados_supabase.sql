-- =============================================================================
-- CRIAÇÃO DA TABELA DE CLIENTES DESATIVADOS (HISTÓRICO & AUDITORIA)
-- Banco de Dados: Supabase (PostgreSQL)
-- Objetivo: Rastrear e preservar todos os dados de clientes excluídos da base,
--           incluindo base utilizada, credenciais, módulos, aditivos e checkpoints.
-- Execute este script no SQL Editor do seu projeto Supabase.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clientes_desativados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id_original UUID NOT NULL,
  nome_empresa TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'NORMAL', 'SHOPEE', 'COMMERSYS', 'LEO', etc.
  ativo BOOLEAN NOT NULL DEFAULT false,
  
  -- Informações da Base que utilizava
  base_id UUID NULL,
  base_nome TEXT NOT NULL, -- ex: 'dbMantran002'
  base_status_anterior TEXT DEFAULT 'Ocupada',
  
  -- Credenciais e Usuários vinculados
  senha_padrao TEXT NULL,
  usuarios_gpo_json JSONB DEFAULT '[]'::jsonb,
  
  -- Módulos contratados
  modulos_json JSONB DEFAULT '[]'::jsonb,
  
  -- Aditivo Contratual
  possui_aditivo BOOLEAN DEFAULT false,
  arquivo_aditivo_nome TEXT NULL,
  arquivo_aditivo_base64 TEXT NULL,
  arquivo_aditivo_tamanho BIGINT NULL,
  
  -- Implantação e Checkpoints (se houver)
  implantacao_id UUID NULL,
  implantacao_dados_json JSONB NULL,
  
  -- Auditoria e Rastreamento
  data_cadastro_original TIMESTAMPTZ NULL,
  desativado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  desativado_por TEXT NULL, -- Usuário do sistema que realizou a exclusão
  motivo TEXT NULL,
  
  -- Snapshot completo de todos os dados em formato JSON
  dados_completos_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Índices para pesquisa rápida e relatórios
CREATE INDEX IF NOT EXISTS idx_clientes_desativados_empresa ON public.clientes_desativados(nome_empresa);
CREATE INDEX IF NOT EXISTS idx_clientes_desativados_base ON public.clientes_desativados(base_nome);
CREATE INDEX IF NOT EXISTS idx_clientes_desativados_data ON public.clientes_desativados(desativado_em);
CREATE INDEX IF NOT EXISTS idx_clientes_desativados_orig_id ON public.clientes_desativados(cliente_id_original);

-- Habilitar RLS (Row Level Security) e permitir operações
ALTER TABLE public.clientes_desativados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura para usuarios autenticados" ON public.clientes_desativados;
CREATE POLICY "Permitir leitura para usuarios autenticados" 
ON public.clientes_desativados FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de historico de desativados" ON public.clientes_desativados;
CREATE POLICY "Permitir insercao de historico de desativados" 
ON public.clientes_desativados FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao para administradores" ON public.clientes_desativados;
CREATE POLICY "Permitir atualizacao para administradores" 
ON public.clientes_desativados FOR UPDATE 
USING (true) WITH CHECK (true);

COMMENT ON TABLE public.clientes_desativados IS 'Armazena o histórico completo de clientes desativados/excluídos para auditoria e rastreabilidade.';
