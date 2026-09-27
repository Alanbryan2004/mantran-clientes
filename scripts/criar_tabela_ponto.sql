-- ============================================================
-- CONTROLE DE PONTO (Registro de Expediente)
--
-- Registra os marcos do dia de trabalho de cada funcionário:
--   inicio_expediente | pausa_almoco | retorno_almoco | fim_expediente
--
-- ⚠️ NOTA: assim como as demais tabelas rh_*, é de uso EXCLUSIVO
-- para os Funcionários da Mantran (Administrador, Tecnico, Suporte,
-- Comercial, Financeiro, RH). Perfis "Cliente", "Parceiro" e
-- "Usuário (Consulta)" NÃO são funcionários e não registram ponto.
-- ============================================================


-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e execute no SQL Editor do Supabase Dashboard
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rh_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  usuario_nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(30) NOT NULL, -- 'inicio_expediente' | 'pausa_almoco' | 'retorno_almoco' | 'fim_expediente'
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- momento exato do registro
  data DATE NOT NULL DEFAULT CURRENT_DATE,      -- facilita o filtro por dia
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_rh_ponto_usuario_id ON public.rh_ponto(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rh_ponto_data ON public.rh_ponto(data DESC);
CREATE INDEX IF NOT EXISTS idx_rh_ponto_usuario_data ON public.rh_ponto(usuario_id, data);
CREATE INDEX IF NOT EXISTS idx_rh_ponto_tipo ON public.rh_ponto(tipo);

-- Evita duplicidade do mesmo marco no mesmo dia para o mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS uq_rh_ponto_usuario_data_tipo
  ON public.rh_ponto(usuario_id, data, tipo);

-- RLS
ALTER TABLE public.rh_ponto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura rh_ponto" ON public.rh_ponto;
CREATE POLICY "Permitir leitura rh_ponto" ON public.rh_ponto FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao rh_ponto" ON public.rh_ponto;
CREATE POLICY "Permitir insercao rh_ponto" ON public.rh_ponto FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update rh_ponto" ON public.rh_ponto;
CREATE POLICY "Permitir update rh_ponto" ON public.rh_ponto FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete rh_ponto" ON public.rh_ponto;
CREATE POLICY "Permitir delete rh_ponto" ON public.rh_ponto FOR DELETE USING (true);


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rh_ponto]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[rh_ponto] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [usuario_id] UNIQUEIDENTIFIER NOT NULL,
    [usuario_nome] NVARCHAR(255) NOT NULL,
    [tipo] NVARCHAR(30) NOT NULL, -- 'inicio_expediente' | 'pausa_almoco' | 'retorno_almoco' | 'fim_expediente'
    [data_hora] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), -- momento exato do registro
    [data] DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),    -- facilita o filtro por dia
    [observacoes] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  -- Índices para consultas rápidas
  CREATE NONCLUSTERED INDEX [idx_rh_ponto_usuario_id] ON [dbo].[rh_ponto] ([usuario_id]);
  CREATE NONCLUSTERED INDEX [idx_rh_ponto_data] ON [dbo].[rh_ponto] ([data] DESC);
  CREATE NONCLUSTERED INDEX [idx_rh_ponto_usuario_data] ON [dbo].[rh_ponto] ([usuario_id], [data]);
  CREATE NONCLUSTERED INDEX [idx_rh_ponto_tipo] ON [dbo].[rh_ponto] ([tipo]);

  -- Evita duplicidade do mesmo marco no mesmo dia para o mesmo usuário
  CREATE UNIQUE NONCLUSTERED INDEX [uq_rh_ponto_usuario_data_tipo]
    ON [dbo].[rh_ponto] ([usuario_id], [data], [tipo]);
END
GO
