-- SCRIPT DE CORREÇÃO (Rodar no dbSuporte)
-- Cria as tabelas que falharam devido a restrição de múltiplas exclusões em cascata

IF OBJECT_ID('dbo.projeto_dados', 'U') IS NULL
BEGIN
    CREATE TABLE projeto_dados (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        projeto_id UNIQUEIDENTIFIER REFERENCES projetos(id) ON DELETE CASCADE,
        base_id UNIQUEIDENTIFIER REFERENCES bases(id) ON DELETE NO ACTION,
        coluna_id UNIQUEIDENTIFIER REFERENCES projeto_colunas(id) ON DELETE NO ACTION,
        valor NVARCHAR(MAX),
        updated_at DATETIME DEFAULT GETDATE(),
        UNIQUE(projeto_id, base_id, coluna_id)
    );
END

IF OBJECT_ID('dbo.projeto_bases', 'U') IS NULL
BEGIN
    CREATE TABLE projeto_bases (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        projeto_id UNIQUEIDENTIFIER REFERENCES projetos(id) ON DELETE CASCADE,
        base_id UNIQUEIDENTIFIER REFERENCES bases(id) ON DELETE NO ACTION,
        created_at DATETIME DEFAULT GETDATE(),
        UNIQUE(projeto_id, base_id)
    );
END
