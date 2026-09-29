-- =========================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DE DAY OFF (FOLGA DE ANIVERSÁRIO)
-- E CAMPO DE DATA DE NASCIMENTO NA TABELA USUARIO
-- =========================================================================

-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1.1 Adiciona a coluna data_nascimento na tabela usuario caso ainda não exista
ALTER TABLE public.usuario 
ADD COLUMN IF NOT EXISTS data_nascimento DATE NULL;

-- 1.2 Tabela de Solicitações de Day Off
CREATE TABLE IF NOT EXISTS public.rh_dayoff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  usuario_nome VARCHAR(255) NOT NULL,
  ano_vigencia INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  data_nascimento DATE NOT NULL,
  data_solicitada DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Aprovado', 'Reprovado'
  observacoes TEXT NULL,
  resposta_rh TEXT NULL,
  aprovado_por VARCHAR(255) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_rh_dayoff_usuario_id ON public.rh_dayoff(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rh_dayoff_ano ON public.rh_dayoff(ano_vigencia);
CREATE INDEX IF NOT EXISTS idx_rh_dayoff_status ON public.rh_dayoff(status);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.rh_dayoff ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Permitir leitura rh_dayoff" ON public.rh_dayoff;
CREATE POLICY "Permitir leitura rh_dayoff" ON public.rh_dayoff FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao rh_dayoff" ON public.rh_dayoff;
CREATE POLICY "Permitir insercao rh_dayoff" ON public.rh_dayoff FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update rh_dayoff" ON public.rh_dayoff;
CREATE POLICY "Permitir update rh_dayoff" ON public.rh_dayoff FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete rh_dayoff" ON public.rh_dayoff;
CREATE POLICY "Permitir delete rh_dayoff" ON public.rh_dayoff FOR DELETE USING (true);


-- =========================================================================
-- 2. SCRIPT PARA O SQL SERVER (T-SQL - DbSuporte)
-- Execute no SQL Server Management Studio (SSMS)
-- =========================================================================

USE dbSuporte;
GO

-- 2.1 Adicionar Coluna data_nascimento na Tabela usuario (se ainda não existir)
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'data_nascimento'
)
BEGIN
  ALTER TABLE [dbo].[usuario] ADD [data_nascimento] DATE NULL;
  PRINT '✅ Coluna data_nascimento adicionada na tabela usuario do SQL Server!';
END
ELSE
BEGIN
  PRINT 'ℹ️ Coluna data_nascimento já existe na tabela usuario do SQL Server.';
END
GO

-- 2.2 Tabela rh_dayoff no SQL Server
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rh_dayoff]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[rh_dayoff] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [usuario_id] UNIQUEIDENTIFIER NOT NULL,
    [usuario_nome] NVARCHAR(255) NOT NULL,
    [ano_vigencia] INT NOT NULL DEFAULT YEAR(GETDATE()),
    [data_nascimento] DATE NOT NULL,
    [data_solicitada] DATE NOT NULL,
    [status] NVARCHAR(50) NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Aprovado', 'Reprovado'
    [observacoes] NVARCHAR(MAX) NULL,
    [resposta_rh] NVARCHAR(MAX) NULL,
    [aprovado_por] NVARCHAR(255) NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  CREATE NONCLUSTERED INDEX [idx_rh_dayoff_usuario_id] ON [dbo].[rh_dayoff] ([usuario_id]);
  CREATE NONCLUSTERED INDEX [idx_rh_dayoff_ano] ON [dbo].[rh_dayoff] ([ano_vigencia]);
  CREATE NONCLUSTERED INDEX [idx_rh_dayoff_status] ON [dbo].[rh_dayoff] ([status]);
  
  PRINT '✅ Tabela rh_dayoff criada com sucesso no SQL Server!';
END
ELSE
BEGIN
  PRINT 'ℹ️ Tabela rh_dayoff já existe no SQL Server.';
END
GO
