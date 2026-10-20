-- ============================================================
-- QA — Correção de cenários pelo técnico
--
-- Adiciona a coluna evidencia_correcao em qa_cenarios para guardar
-- o(s) print(s) da correção feita pelo técnico (mesmo formato de
-- evidencia_imagem: string única OU JSON array de data URLs).
--
-- Também documenta o novo status 'CORRIGIDO' usado no fluxo:
--   PENDENTE -> OK | ERRO (pelo QA)
--   ERRO -> CORRIGIDO (pelo técnico, ao corrigir o cenário)
--   CORRIGIDO -> OK | ERRO (pelo QA, na revalidação)
-- (A coluna status é TEXT livre; nenhum CHECK precisa ser alterado.)
-- ============================================================

-- PostgreSQL (Supabase) — SQL Editor do Dashboard
ALTER TABLE public.qa_cenarios
  ADD COLUMN IF NOT EXISTS evidencia_correcao TEXT NULL;
