-- =====================================================================
-- SCRIPT DE MIGRAÇÃO: Processos Shopee vinculados aos Clientes (SQL Server / dbSuporte)
-- =====================================================================
-- Contexto:
-- Adiciona a coluna processos_shopee na tabela clientes para armazenar a lista
-- de processos (First Mile, Line Haul, Last Mile, Mobile Hub) no formato JSON array.
-- =====================================================================

IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'clientes' AND COLUMN_NAME = 'processos_shopee'
)
BEGIN
    ALTER TABLE clientes ADD processos_shopee NVARCHAR(500) NULL;
    PRINT 'Coluna processos_shopee criada com sucesso na tabela clientes.';
END
ELSE
BEGIN
    PRINT 'Coluna processos_shopee ja existe na tabela clientes.';
END
GO

-- Migração inicial: sincronizar operações das implantações já existentes para os clientes Shopee
UPDATE c
SET c.processos_shopee = i.operacoes_shopee
FROM clientes c
INNER JOIN implantacoes i 
   ON (i.cliente_id = c.id OR LOWER(LTRIM(RTRIM(i.nome_empresa))) = LOWER(LTRIM(RTRIM(c.nome_empresa))))
WHERE c.tipo = 'SHOPEE'
  AND i.operacoes_shopee IS NOT NULL
  AND LEN(LTRIM(RTRIM(i.operacoes_shopee))) > 0
  AND (c.processos_shopee IS NULL OR c.processos_shopee = '');
GO

PRINT 'Migracao inicial de dados concluida no SQL Server.';
GO
