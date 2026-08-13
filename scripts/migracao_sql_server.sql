-- --------------------------------------------------------
-- SCRIPT DE MIGRAÇÃO: Supabase (PostgreSQL) -> SQL Server
-- Banco Destino: dbSuporte
-- --------------------------------------------------------

-- 1. Autenticação Geral do Sistema
CREATE TABLE usuario (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255),
    senha NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

-- 2. Módulo de Clientes (Mantran)
CREATE TABLE clientes (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nome_empresa NVARCHAR(255) NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    possui_aditivo BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE bases (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nome_base NVARCHAR(255) NOT NULL,
    cliente_id UNIQUEIDENTIFIER REFERENCES clientes(id) ON DELETE SET NULL,
    status NVARCHAR(50) DEFAULT 'Disponível',
    migrada BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE usuarios_gpo (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    cliente_id UNIQUEIDENTIFIER REFERENCES clientes(id) ON DELETE CASCADE,
    login NVARCHAR(255) NOT NULL,
    senha NVARCHAR(255) NOT NULL,
    acesso_validado BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE modulos (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    cliente_id UNIQUEIDENTIFIER REFERENCES clientes(id) ON DELETE CASCADE,
    nome_modulo NVARCHAR(255) NOT NULL,
    ativo BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE modulos_mantran (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nome_modulo NVARCHAR(255) NOT NULL,
    ativo BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

-- 3. Módulo de Projetos
CREATE TABLE projetos (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nome NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Em Andamento',
    concluido_em DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE projeto_colunas (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    projeto_id UNIQUEIDENTIFIER REFERENCES projetos(id) ON DELETE CASCADE,
    nome NVARCHAR(255) NOT NULL,
    tipo NVARCHAR(50) NOT NULL, -- 'DATA', 'TEXTO', 'STATUS'
    ordem INT DEFAULT 0,
    indicador_conclusao BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE projeto_bases (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    projeto_id UNIQUEIDENTIFIER REFERENCES projetos(id) ON DELETE CASCADE,
    base_id UNIQUEIDENTIFIER REFERENCES bases(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(projeto_id, base_id)
);

CREATE TABLE projeto_dados (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    projeto_id UNIQUEIDENTIFIER REFERENCES projetos(id) ON DELETE CASCADE,
    base_id UNIQUEIDENTIFIER REFERENCES bases(id) ON DELETE CASCADE,
    coluna_id UNIQUEIDENTIFIER REFERENCES projeto_colunas(id) ON DELETE CASCADE,
    valor NVARCHAR(MAX),
    updated_at DATETIME DEFAULT GETDATE(),
    UNIQUE(projeto_id, base_id, coluna_id)
);

-- 4. Módulo Específico (Leo Madeiras)
CREATE TABLE leo_empresas (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nome_empresa NVARCHAR(255) NOT NULL,
    cnpj NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE leo_usuarios (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    empresa_id UNIQUEIDENTIFIER REFERENCES leo_empresas(id) ON DELETE CASCADE,
    nome NVARCHAR(255) NOT NULL,
    email NVARCHAR(255),
    senha NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE leo_modulos (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    empresa_id UNIQUEIDENTIFIER REFERENCES leo_empresas(id) ON DELETE CASCADE,
    nome_modulo NVARCHAR(255) NOT NULL,
    ativo BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
