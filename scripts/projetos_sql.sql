-- 1. Tabela de Projetos
CREATE TABLE projetos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Em Andamento', -- 'Em Andamento' ou 'Concluído'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    concluido_em TIMESTAMP WITH TIME ZONE
);

-- 2. Tabela de Definição de Colunas Dinâmicas
CREATE TABLE projeto_colunas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'DATA', 'TEXTO', 'STATUS'
    ordem INT DEFAULT 0,
    indicador_conclusao BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Bases Participantes do Projeto
CREATE TABLE projeto_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
    base_id UUID REFERENCES bases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(projeto_id, base_id)
);

-- 4. Tabela de Dados Dinâmicos (EAV)
CREATE TABLE projeto_dados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
    base_id UUID REFERENCES bases(id) ON DELETE CASCADE,
    coluna_id UUID REFERENCES projeto_colunas(id) ON DELETE CASCADE,
    valor TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(projeto_id, base_id, coluna_id)
);
