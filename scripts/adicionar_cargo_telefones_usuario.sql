-- ============================================================
-- Campos adicionais do usuário para a ASSINATURA de e-mail dos chamados
--   cargo                 -> função exibida na assinatura (ex.: Gerente Técnico)
--   telefone_empresarial  -> telefone exibido na assinatura
--   telefone_particular   -> telefone pessoal (uso interno/RH)
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS cargo VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS telefone_empresarial VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS telefone_particular VARCHAR(40) NULL;

-- ---------- SQL Server (dbSuporte) ----------
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'cargo')
--   ALTER TABLE [dbo].[usuario] ADD [cargo] NVARCHAR(120) NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'telefone_empresarial')
--   ALTER TABLE [dbo].[usuario] ADD [telefone_empresarial] NVARCHAR(40) NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[usuario]') AND name = 'telefone_particular')
--   ALTER TABLE [dbo].[usuario] ADD [telefone_particular] NVARCHAR(40) NULL;
