-- ============================================================
-- JORNADA DE TRABALHO (Horário do Funcionário)
--
-- Armazena a jornada de cada colaborador: dias trabalhados na
-- semana, horário de entrada/saída e o intervalo de almoço.
-- Exemplo: Segunda a Sexta, 08:00 às 17:00, almoço 12:00 às 13:00.
--
-- ⚠️ NOTA: assim como as demais tabelas rh_*, é de uso EXCLUSIVO
-- para os Funcionários da Mantran. Um registro por colaborador
-- (usuario_id UNIQUE).
-- ============================================================


-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rh_jornada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE,
  usuario_nome VARCHAR(255) NOT NULL,
  -- Dias trabalhados na semana
  segunda BOOLEAN NOT NULL DEFAULT TRUE,
  terca BOOLEAN NOT NULL DEFAULT TRUE,
  quarta BOOLEAN NOT NULL DEFAULT TRUE,
  quinta BOOLEAN NOT NULL DEFAULT TRUE,
  sexta BOOLEAN NOT NULL DEFAULT TRUE,
  sabado BOOLEAN NOT NULL DEFAULT FALSE,
  domingo BOOLEAN NOT NULL DEFAULT FALSE,
  -- Horários (formato HH:MM)
  hora_entrada TIME NOT NULL DEFAULT '08:00',
  hora_saida TIME NOT NULL DEFAULT '17:00',
  almoco_inicio TIME NULL DEFAULT '12:00',
  almoco_fim TIME NULL DEFAULT '13:00',
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_rh_jornada_usuario_id ON public.rh_jornada(usuario_id);

-- RLS
ALTER TABLE public.rh_jornada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura rh_jornada" ON public.rh_jornada;
CREATE POLICY "Permitir leitura rh_jornada" ON public.rh_jornada FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao rh_jornada" ON public.rh_jornada;
CREATE POLICY "Permitir insercao rh_jornada" ON public.rh_jornada FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update rh_jornada" ON public.rh_jornada;
CREATE POLICY "Permitir update rh_jornada" ON public.rh_jornada FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete rh_jornada" ON public.rh_jornada;
CREATE POLICY "Permitir delete rh_jornada" ON public.rh_jornada FOR DELETE USING (true);


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rh_jornada]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[rh_jornada] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [usuario_id] UNIQUEIDENTIFIER NOT NULL UNIQUE,
    [usuario_nome] NVARCHAR(255) NOT NULL,
    [segunda] BIT NOT NULL DEFAULT 1,
    [terca] BIT NOT NULL DEFAULT 1,
    [quarta] BIT NOT NULL DEFAULT 1,
    [quinta] BIT NOT NULL DEFAULT 1,
    [sexta] BIT NOT NULL DEFAULT 1,
    [sabado] BIT NOT NULL DEFAULT 0,
    [domingo] BIT NOT NULL DEFAULT 0,
    [hora_entrada] TIME NOT NULL DEFAULT '08:00',
    [hora_saida] TIME NOT NULL DEFAULT '17:00',
    [almoco_inicio] TIME NULL DEFAULT '12:00',
    [almoco_fim] TIME NULL DEFAULT '13:00',
    [observacoes] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  CREATE NONCLUSTERED INDEX [idx_rh_jornada_usuario_id] ON [dbo].[rh_jornada] ([usuario_id]);
END
GO
