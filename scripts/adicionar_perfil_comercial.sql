-- ============================================================
-- 1. SCRIPT PARA O SUPABASE (PostgreSQL)
-- Copie e cole no SQL Editor do Supabase Dashboard
-- ============================================================

-- Atualizar constraint da tabela usuario para aceitar o perfil 'Comercial'
ALTER TABLE public.usuario DROP CONSTRAINT IF EXISTS usuario_perfil_check;
ALTER TABLE public.usuario ADD CONSTRAINT usuario_perfil_check 
  CHECK (perfil IN ('Administrador', 'Tecnico', 'Suporte', 'Usuario', 'Parceiro', 'Cliente', 'Comercial'));

-- Garantir registro na tabela perfil_permissoes (caso ainda não exista)
INSERT INTO public.perfil_permissoes (perfil, rotas_permitidas, projeto_id_permitido, read_only, updated_at)
VALUES ('Comercial', '["/implantacoes"]'::jsonb, NULL, false, NOW())
ON CONFLICT (perfil) DO UPDATE 
SET rotas_permitidas = '["/implantacoes"]'::jsonb, updated_at = NOW();


-- ============================================================
-- 2. SCRIPT PARA O SQL SERVER (DbSuporte)
-- Copie e execute no SQL Server Management Studio (SSMS)
-- ============================================================

IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'usuario_perfil_check')
BEGIN
  ALTER TABLE [dbo].[usuario] DROP CONSTRAINT [usuario_perfil_check];
END
GO

ALTER TABLE [dbo].[usuario] ADD CONSTRAINT [usuario_perfil_check] 
  CHECK ([perfil] IN ('Administrador', 'Tecnico', 'Suporte', 'Usuario', 'Parceiro', 'Cliente', 'Comercial'));
GO
