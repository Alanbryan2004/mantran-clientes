-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1.1 Tabela de Solicitações de Férias (Duas Quinzenas)
CREATE TABLE IF NOT EXISTS public.rh_ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  usuario_nome VARCHAR(255) NOT NULL,
  ano_vigencia INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  quinzena_1_inicio DATE NOT NULL,
  quinzena_1_fim DATE NOT NULL,
  quinzena_1_dias INT NOT NULL DEFAULT 15,
  quinzena_2_inicio DATE NULL,
  quinzena_2_fim DATE NULL,
  quinzena_2_dias INT NULL DEFAULT 15,
  status VARCHAR(50) NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Aprovado', 'Reprovado'
  observacoes TEXT NULL,
  resposta_rh TEXT NULL,
  aprovado_por VARCHAR(255) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_rh_ferias_usuario_id ON public.rh_ferias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rh_ferias_ano ON public.rh_ferias(ano_vigencia);
CREATE INDEX IF NOT EXISTS idx_rh_ferias_status ON public.rh_ferias(status);

-- RLS para Férias
ALTER TABLE public.rh_ferias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura rh_ferias" ON public.rh_ferias;
CREATE POLICY "Permitir leitura rh_ferias" ON public.rh_ferias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao rh_ferias" ON public.rh_ferias;
CREATE POLICY "Permitir insercao rh_ferias" ON public.rh_ferias FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update rh_ferias" ON public.rh_ferias;
CREATE POLICY "Permitir update rh_ferias" ON public.rh_ferias FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete rh_ferias" ON public.rh_ferias;
CREATE POLICY "Permitir delete rh_ferias" ON public.rh_ferias FOR DELETE USING (true);


-- 1.2 Tabela de Faltas e Atestados Médicos
CREATE TABLE IF NOT EXISTS public.rh_faltas_atestados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  usuario_nome VARCHAR(255) NOT NULL,
  data_falta_inicio DATE NOT NULL,
  data_falta_fim DATE NOT NULL,
  dias_afastamento INT NOT NULL DEFAULT 1,
  motivo VARCHAR(100) NOT NULL, -- 'Consulta Médica', 'Doença / Atestado Médico', 'Acompanhamento Familiar', 'Motivo Pessoal', 'Outros'
  descricao TEXT NULL,
  possui_atestado BOOLEAN DEFAULT TRUE,
  arquivo_atestado_nome VARCHAR(255) NULL,
  arquivo_atestado_url TEXT NULL,
  arquivo_atestado_tipo VARCHAR(100) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Abonado / Aprovado', 'Em Análise', 'Recusado'
  observacoes_rh TEXT NULL,
  aprovado_por VARCHAR(255) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rh_faltas_usuario_id ON public.rh_faltas_atestados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rh_faltas_data_inicio ON public.rh_faltas_atestados(data_falta_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_rh_faltas_status ON public.rh_faltas_atestados(status);

-- RLS para Faltas e Atestados
ALTER TABLE public.rh_faltas_atestados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura rh_faltas" ON public.rh_faltas_atestados;
CREATE POLICY "Permitir leitura rh_faltas" ON public.rh_faltas_atestados FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao rh_faltas" ON public.rh_faltas_atestados;
CREATE POLICY "Permitir insercao rh_faltas" ON public.rh_faltas_atestados FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update rh_faltas" ON public.rh_faltas_atestados;
CREATE POLICY "Permitir update rh_faltas" ON public.rh_faltas_atestados FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete rh_faltas" ON public.rh_faltas_atestados;
CREATE POLICY "Permitir delete rh_faltas" ON public.rh_faltas_atestados FOR DELETE USING (true);


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rh_ferias]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[rh_ferias] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [usuario_id] UNIQUEIDENTIFIER NOT NULL,
    [usuario_nome] NVARCHAR(255) NOT NULL,
    [ano_vigencia] INT NOT NULL DEFAULT YEAR(GETDATE()),
    [quinzena_1_inicio] DATE NOT NULL,
    [quinzena_1_fim] DATE NOT NULL,
    [quinzena_1_dias] INT NOT NULL DEFAULT 15,
    [quinzena_2_inicio] DATE NULL,
    [quinzena_2_fim] DATE NULL,
    [quinzena_2_dias] INT NULL DEFAULT 15,
    [status] NVARCHAR(50) NOT NULL DEFAULT 'Pendente',
    [observacoes] NVARCHAR(MAX) NULL,
    [resposta_rh] NVARCHAR(MAX) NULL,
    [aprovado_por] NVARCHAR(255) NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  CREATE NONCLUSTERED INDEX [idx_rh_ferias_usuario_id] ON [dbo].[rh_ferias] ([usuario_id]);
  CREATE NONCLUSTERED INDEX [idx_rh_ferias_ano] ON [dbo].[rh_ferias] ([ano_vigencia]);
  CREATE NONCLUSTERED INDEX [idx_rh_ferias_status] ON [dbo].[rh_ferias] ([status]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rh_faltas_atestados]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[rh_faltas_atestados] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [usuario_id] UNIQUEIDENTIFIER NOT NULL,
    [usuario_nome] NVARCHAR(255) NOT NULL,
    [data_falta_inicio] DATE NOT NULL,
    [data_falta_fim] DATE NOT NULL,
    [dias_afastamento] INT NOT NULL DEFAULT 1,
    [motivo] NVARCHAR(100) NOT NULL,
    [descricao] NVARCHAR(MAX) NULL,
    [possui_atestado] BIT DEFAULT 1,
    [arquivo_atestado_nome] NVARCHAR(255) NULL,
    [arquivo_atestado_url] NVARCHAR(MAX) NULL,
    [arquivo_atestado_tipo] NVARCHAR(100) NULL,
    [status] NVARCHAR(50) NOT NULL DEFAULT 'Pendente',
    [observacoes_rh] NVARCHAR(MAX) NULL,
    [aprovado_por] NVARCHAR(255) NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  CREATE NONCLUSTERED INDEX [idx_rh_faltas_usuario_id] ON [dbo].[rh_faltas_atestados] ([usuario_id]);
  CREATE NONCLUSTERED INDEX [idx_rh_faltas_data_inicio] ON [dbo].[rh_faltas_atestados] ([data_falta_inicio] DESC);
  CREATE NONCLUSTERED INDEX [idx_rh_faltas_status] ON [dbo].[rh_faltas_atestados] ([status]);
END
GO
