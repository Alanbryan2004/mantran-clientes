-- =====================================================================
-- SCRIPT DE MIGRAÇÃO: Suporte à Flag MantranWeb (C# -> Plataforma Web)
-- =====================================================================
-- Contexto:
-- A Mantran está migrando os clientes da plataforma legada desktop em C#
-- para a nova plataforma 100% Web (MantranWeb).
-- Este script adiciona a flag tanto no Supabase quanto no SQL Server
-- (opcional, já que a tabela modulos com nome_modulo = 'MantranWeb'
--  já funciona automaticamente sem necessidade obrigatória de alteração de schema).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SUPABASE (PostgreSQL)
-- ---------------------------------------------------------------------
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS mantran_web BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN clientes.mantran_web IS 'Indica se o cliente já foi migrado da plataforma C# (Desktop) para o MantranWeb';

-- Índice para acelerar contagens e filtros no Dashboard e tela de Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_mantran_web ON clientes(mantran_web);

-- Sincronizar clientes que já tenham o registro na tabela de módulos:
UPDATE clientes c
SET mantran_web = TRUE
WHERE EXISTS (
    SELECT 1 FROM modulos m 
    WHERE m.cliente_id = c.id 
      AND m.nome_modulo = 'MantranWeb' 
      AND m.ativo = TRUE
);

-- ---------------------------------------------------------------------
-- 2. SQL SERVER (dbSuporte / Produção)
-- ---------------------------------------------------------------------
/*
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[clientes]') 
      AND name = 'mantran_web'
)
BEGIN
    ALTER TABLE [dbo].[clientes]
    ADD [mantran_web] BIT NOT NULL CONSTRAINT DF_clientes_mantran_web DEFAULT (0);
    
    EXEC sys.sp_addextendedproperty 
        @name=N'MS_Description', 
        @value=N'Indica se o cliente já migrou do C# para o MantranWeb', 
        @level0type=N'SCHEMA', @level0name=N'dbo', 
        @level1type=N'TABLE',  @level1name=N'clientes', 
        @level2type=N'COLUMN', @level2name=N'mantran_web';
END
GO
*/
