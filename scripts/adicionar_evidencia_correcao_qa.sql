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


-- ============================================================
-- SQL Server (dbSuporte) — SSMS
-- NVARCHAR(MAX) por causa do base64 das imagens (equivale ao TEXT do Postgres).
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[qa_cenarios]') AND name = 'evidencia_correcao'
)
BEGIN
  ALTER TABLE [dbo].[qa_cenarios] ADD [evidencia_correcao] NVARCHAR(MAX) NULL;
END
GO
