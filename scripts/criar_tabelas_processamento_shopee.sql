-- =============================================================================
-- PROCESSAMENTO SHOPEE - Tabelas para o status de fechamento quinzenal
-- (Last Mile / First Mile / Line Haul) das transportadoras 4PL / Hubs.
--
-- Banco: Supabase (PostgreSQL)
-- Execute no painel SQL do Supabase (SQL Editor).
--
-- Observação de relacionamento:
--  - nome_base: nome da base do cliente no SQL Server (ex.: dbMantran...).
--  - cnpj:      CNPJ da transportadora, usado como chave de relação com o
--               banco operacional da Shopee.
-- =============================================================================

-- 1. Catálogo de transportadoras Shopee (4PL / Hubs)
--    Espelha a transportadora e amarra base + CNPJ para a relação externa.
CREATE TABLE IF NOT EXISTS shopee_transportadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  base_id UUID REFERENCES bases(id) ON DELETE SET NULL,
  nome_empresa TEXT NOT NULL,
  nome_base TEXT,                     -- nome da base do cliente (dbMantran...)
  cnpj VARCHAR(18),                   -- CNPJ para fazer a relação
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Processamentos (um registro por transportadora + processo + quinzena/mês/ano)
CREATE TABLE IF NOT EXISTS shopee_processamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transportadora_id UUID REFERENCES shopee_transportadoras(id) ON DELETE CASCADE,

  -- Redundância útil para consultas/relatórios e relação externa:
  nome_empresa TEXT NOT NULL,
  nome_base TEXT,                     -- nome da base do cliente (dbMantran...)
  cnpj VARCHAR(18),                   -- CNPJ para fazer a relação

  -- Competência do fechamento:
  quinzena SMALLINT NOT NULL CHECK (quinzena IN (1, 2)),
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano SMALLINT NOT NULL,

  -- Tipo de processo e status:
  processo TEXT NOT NULL CHECK (processo IN ('Last Mile', 'First Mile', 'Line Haul')),
  status TEXT NOT NULL DEFAULT 'NAO_INICIADO'
    CHECK (status IN ('FINALIZADO', 'PROCESSANDO', 'NAO_INICIADO')),

  -- Métricas de execução:
  segundos_processamento INT NOT NULL DEFAULT 0,
  registros_processados INT NOT NULL DEFAULT 0,
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Evita duplicidade do mesmo processo na mesma competência:
  CONSTRAINT uq_shopee_proc UNIQUE (transportadora_id, quinzena, mes, ano, processo)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_shopee_transp_cliente_id ON shopee_transportadoras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_shopee_transp_cnpj ON shopee_transportadoras(cnpj);
CREATE INDEX IF NOT EXISTS idx_shopee_proc_transportadora_id ON shopee_processamentos(transportadora_id);
CREATE INDEX IF NOT EXISTS idx_shopee_proc_competencia ON shopee_processamentos(ano, mes, quinzena);
CREATE INDEX IF NOT EXISTS idx_shopee_proc_status ON shopee_processamentos(status);
CREATE INDEX IF NOT EXISTS idx_shopee_proc_cnpj ON shopee_processamentos(cnpj);

-- 4. RLS (Row Level Security) - mesmo padrão das demais tabelas internas
ALTER TABLE shopee_transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_processamentos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopee_transportadoras' AND policyname = 'Allow all on shopee_transportadoras') THEN
    CREATE POLICY "Allow all on shopee_transportadoras" ON shopee_transportadoras FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopee_processamentos' AND policyname = 'Allow all on shopee_processamentos') THEN
    CREATE POLICY "Allow all on shopee_processamentos" ON shopee_processamentos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
