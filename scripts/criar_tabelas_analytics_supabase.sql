-- =============================================================================
-- TABELAS DE ANALYTICS & MÉTRICAS DE ACESSO (SUPABASE)
-- 
-- 1. acessos_log: Registra os acessos por tela, identificando o cliente e usuário
-- 2. faq_visualizacoes: Registra quais manuais do FAQ estão sendo mais lidos
-- 
-- Banco: Supabase (PostgreSQL) — executar no SQL Editor
-- =============================================================================

-- 1. TABELA DE ACESSOS POR TELA
CREATE TABLE IF NOT EXISTS public.acessos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id TEXT NULL,
  usuario_nome TEXT NULL,
  usuario_login TEXT NULL,
  cliente_nome TEXT NULL,
  rota TEXT NOT NULL,
  tela_nome TEXT NOT NULL,
  dispositivo TEXT NOT NULL DEFAULT 'Desktop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acessos_log_created_at ON public.acessos_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acessos_log_rota ON public.acessos_log(rota);
CREATE INDEX IF NOT EXISTS idx_acessos_log_cliente_nome ON public.acessos_log(cliente_nome);
CREATE INDEX IF NOT EXISTS idx_acessos_log_usuario_id ON public.acessos_log(usuario_id);

-- RLS para acessos_log
ALTER TABLE public.acessos_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all acessos_log" ON public.acessos_log;
CREATE POLICY "Allow all acessos_log" ON public.acessos_log FOR ALL USING (true) WITH CHECK (true);


-- 2. TABELA DE VISUALIZAÇÕES DE MANUAIS DO FAQ
CREATE TABLE IF NOT EXISTS public.faq_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimento_id UUID NOT NULL REFERENCES public.faq_procedimentos(id) ON DELETE CASCADE,
  procedimento_titulo TEXT NOT NULL,
  categoria_nome TEXT NULL,
  usuario_id TEXT NULL,
  usuario_nome TEXT NULL,
  cliente_nome TEXT NULL,
  origem TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_visualizacoes_proc_id ON public.faq_visualizacoes(procedimento_id);
CREATE INDEX IF NOT EXISTS idx_faq_visualizacoes_created_at ON public.faq_visualizacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_visualizacoes_cliente_nome ON public.faq_visualizacoes(cliente_nome);

-- RLS para faq_visualizacoes
ALTER TABLE public.faq_visualizacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all faq_visualizacoes" ON public.faq_visualizacoes;
CREATE POLICY "Allow all faq_visualizacoes" ON public.faq_visualizacoes FOR ALL USING (true) WITH CHECK (true);
