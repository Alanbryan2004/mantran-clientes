-- =========================================================================
-- SCRIPT DE ATUALIZAÇÃO DO MÓDULO "WMS Coletor" PARA "NFSE"
-- (SUPABASE / POSTGRESQL E SQL SERVER / DBSUPORTE)
-- =========================================================================

-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- (Já executado automaticamente no banco Supabase)
-- ============================================================

UPDATE public.modulos_mantran 
SET nome = 'NFSE' 
WHERE nome = 'WMS Coletor';

UPDATE public.modulos 
SET nome_modulo = 'NFSE' 
WHERE nome_modulo = 'WMS Coletor';


-- =========================================================================
-- 2. SCRIPT PARA O SQL SERVER (T-SQL - DbSuporte)
-- Execute no SQL Server Management Studio (SSMS) se utilizar banco local
-- =========================================================================

USE dbSuporte;
GO

UPDATE modulos_mantran 
SET nome = 'NFSE' 
WHERE nome = 'WMS Coletor';

UPDATE modulos 
SET nome_modulo = 'NFSE' 
WHERE nome_modulo = 'WMS Coletor';
GO
