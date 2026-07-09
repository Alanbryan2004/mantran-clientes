-- 1. Certificar que a base base dbMantranLeo012 existe
INSERT INTO bases (nome_base, status)
SELECT 'dbMantranLeo012', 'Disponível'
WHERE NOT EXISTS (SELECT 1 FROM bases WHERE nome_base = 'dbMantranLeo012');

-- 2. Tabela de Empresas da Léo Madeiras
CREATE TABLE leo_empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cd_empresa VARCHAR(10) NOT NULL UNIQUE,
    nome_empresa VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'LÉO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Usuários da Léo Madeiras
CREATE TABLE leo_usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leo_empresa_id UUID REFERENCES leo_empresas(id) ON DELETE CASCADE,
    login VARCHAR(100) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Módulos da Léo Madeiras
CREATE TABLE leo_modulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leo_empresa_id UUID REFERENCES leo_empresas(id) ON DELETE CASCADE,
    nome_modulo VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leo_empresa_id, nome_modulo)
);
