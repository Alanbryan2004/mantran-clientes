-- =============================================
-- IMPLANTAÇÃO HISTÓRICO - Tabela de eventos
-- Execute no SQL Editor do Supabase
-- =============================================

CREATE TABLE IF NOT EXISTS implantacao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  implantacao_id UUID REFERENCES implantacoes(id) ON DELETE CASCADE,
  data_hora TIMESTAMPTZ DEFAULT now(),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por implantação
CREATE INDEX IF NOT EXISTS idx_implantacao_historico_implantacao_id 
  ON implantacao_historico(implantacao_id);

-- RLS
ALTER TABLE implantacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on implantacao_historico" 
  ON implantacao_historico FOR ALL USING (true) WITH CHECK (true);
