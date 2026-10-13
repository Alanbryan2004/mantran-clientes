-- ============================================================
-- Corrige o CHECK da coluna implantacao_etapas.valor para
-- aceitar o status 'ERRO'.
--
-- Contexto: ao registrar um ERRO em uma etapa (ex.: Ativo 4PL),
-- o sistema grava valor = 'ERRO'. O constraint original só
-- permitia ('OK', 'EM BRANCO', 'PENDENTE'), causando:
--   new row for relation "implantacao_etapas" violates
--   check constraint "implantacao_etapas_valor_check"
--
-- Este script dropa o constraint antigo e recria incluindo 'ERRO'.
-- É seguro rodar mais de uma vez.
-- ============================================================


-- ============================================================
-- 1. PostgreSQL (Supabase)  <-- É AQUI QUE O ERRO ACONTECE
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================
ALTER TABLE public.implantacao_etapas
  DROP CONSTRAINT IF EXISTS implantacao_etapas_valor_check;

ALTER TABLE public.implantacao_etapas
  ADD CONSTRAINT implantacao_etapas_valor_check
  CHECK (valor IN ('OK', 'EM BRANCO', 'PENDENTE', 'ERRO'));


-- ============================================================
-- 2. SQL Server (dbSuporte) — OPCIONAL
-- No SQL Server a coluna 'valor' é NVARCHAR(50) sem CHECK, então
-- o valor 'ERRO' já é aceito e NADA precisa ser feito.
-- Rode o bloco abaixo APENAS se quiser padronizar a validação
-- também no SQL Server.
-- ============================================================
-- IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'implantacao_etapas_valor_check')
--   ALTER TABLE dbo.implantacao_etapas DROP CONSTRAINT implantacao_etapas_valor_check;
-- GO
-- ALTER TABLE dbo.implantacao_etapas
--   ADD CONSTRAINT implantacao_etapas_valor_check
--   CHECK (valor IN ('OK', 'EM BRANCO', 'PENDENTE', 'ERRO'));
-- GO
