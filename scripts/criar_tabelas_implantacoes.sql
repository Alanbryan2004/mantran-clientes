-- =============================================
-- IMPLANTAÇÕES - Tabelas para acompanhamento
-- de novos clientes Mantran
-- Execute no painel SQL do Supabase
-- =============================================

-- 1. Tabela principal de implantações
CREATE TABLE IF NOT EXISTS implantacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  base_id UUID REFERENCES bases(id),
  nome_empresa TEXT NOT NULL,
  tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('NORMAL', 'SHOPEE')),
  operacoes_shopee TEXT[] DEFAULT '{}',
  modulos_normal TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'Em Andamento',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Etapas/checklist de cada implantação
CREATE TABLE IF NOT EXISTS implantacao_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  implantacao_id UUID REFERENCES implantacoes(id) ON DELETE CASCADE,
  nome_etapa TEXT NOT NULL,
  valor TEXT DEFAULT 'EM BRANCO' CHECK (valor IN ('OK', 'EM BRANCO', 'PENDENTE')),
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_implantacao_etapas_implantacao_id ON implantacao_etapas(implantacao_id);
CREATE INDEX IF NOT EXISTS idx_implantacoes_cliente_id ON implantacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_implantacoes_status ON implantacoes(status);

-- 4. RLS (Row Level Security) - desabilitar para uso interno
ALTER TABLE implantacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE implantacao_etapas ENABLE ROW LEVEL SECURITY;

-- Policies para permitir acesso total (mesmo padrão das outras tabelas)
CREATE POLICY "Allow all on implantacoes" ON implantacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on implantacao_etapas" ON implantacao_etapas FOR ALL USING (true) WITH CHECK (true);
