-- ============================================================
-- QA — Cenários de Teste (qa_cenarios) — SQL Server (dbSuporte)
--
-- Espelha a tabela criada no Supabase (módulo de QA Testes), já
-- incluindo a coluna evidencia_correcao (prints da correção do técnico).
--
-- Colunas:
--   id                   UNIQUEIDENTIFIER (PK, default NEWID)
--   tela                 texto da tela testada
--   titulo               título/objetivo do cenário
--   descricao            regra de negócio / detalhes
--   status               'PENDENTE' | 'OK' | 'ERRO' | 'CORRIGIDO'
--   observacao_erro      descrição do erro apontado pelo QA
--   observacao_correcao  descrição da correção feita pelo técnico
--   evidencia_imagem     print(s) do erro (base64; string ou JSON array)
--   evidencia_correcao   print(s) da correção (base64; string ou JSON array)
--   tecnico_id/nome, qa_id/nome, created_at, updated_at
--
-- NVARCHAR(MAX) nos campos de imagem por causa do base64 (equivale ao TEXT do Postgres).
-- Idempotente: só cria se a tabela ainda não existir.
-- ============================================================

USE dbSuporte;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'qa_cenarios' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[qa_cenarios] (
        [id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [tela]                NVARCHAR(255) NOT NULL,
        [titulo]              NVARCHAR(500) NOT NULL,
        [descricao]           NVARCHAR(MAX) NULL,
        [status]              NVARCHAR(20) NOT NULL CONSTRAINT [df_qa_cenarios_status] DEFAULT ('PENDENTE'),
        [observacao_erro]     NVARCHAR(MAX) NULL,
        [observacao_correcao] NVARCHAR(MAX) NULL,
        [evidencia_imagem]    NVARCHAR(MAX) NULL,
        [evidencia_correcao]  NVARCHAR(MAX) NULL,
        [tecnico_id]          UNIQUEIDENTIFIER NULL,
        [tecnico_nome]        NVARCHAR(255) NULL,
        [qa_id]               UNIQUEIDENTIFIER NULL,
        [qa_nome]             NVARCHAR(255) NULL,
        [created_at]          DATETIME2 NOT NULL CONSTRAINT [df_qa_cenarios_created] DEFAULT (SYSUTCDATETIME()),
        [updated_at]          DATETIME2 NOT NULL CONSTRAINT [df_qa_cenarios_updated] DEFAULT (SYSUTCDATETIME())
    );

    CREATE NONCLUSTERED INDEX [idx_qa_cenarios_tela]       ON [dbo].[qa_cenarios] ([tela]);
    CREATE NONCLUSTERED INDEX [idx_qa_cenarios_tecnico_id] ON [dbo].[qa_cenarios] ([tecnico_id]);
    CREATE NONCLUSTERED INDEX [idx_qa_cenarios_status]     ON [dbo].[qa_cenarios] ([status]);

    PRINT 'Tabela dbo.qa_cenarios criada com sucesso.';
END
ELSE
BEGIN
    -- Tabela já existe: garante a coluna evidencia_correcao.
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'[dbo].[qa_cenarios]') AND name = 'evidencia_correcao'
    )
    BEGIN
        ALTER TABLE [dbo].[qa_cenarios] ADD [evidencia_correcao] NVARCHAR(MAX) NULL;
        PRINT 'Coluna evidencia_correcao adicionada em dbo.qa_cenarios.';
    END
    ELSE
        PRINT 'dbo.qa_cenarios já existe e já possui evidencia_correcao. Nada a fazer.';
END
GO
