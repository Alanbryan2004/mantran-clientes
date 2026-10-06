-- ============================================================
-- Restrição de MÚLTIPLOS projetos por perfil
-- Antes: perfil_permissoes.projeto_id_permitido (um único projeto)
-- Agora: perfil_permissoes.projetos_ids_permitidos (lista de projetos)
-- O campo singular é mantido para compatibilidade/retrocompatibilidade.
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
-- Lista de IDs de projetos liberados para o perfil (JSONB array de UUIDs em texto)
ALTER TABLE public.perfil_permissoes
  ADD COLUMN IF NOT EXISTS projetos_ids_permitidos JSONB NULL DEFAULT '[]'::jsonb;

-- Backfill: migra o projeto único existente para a nova lista (quando houver)
UPDATE public.perfil_permissoes
SET projetos_ids_permitidos = to_jsonb(ARRAY[projeto_id_permitido])
WHERE projeto_id_permitido IS NOT NULL
  AND (projetos_ids_permitidos IS NULL OR projetos_ids_permitidos = '[]'::jsonb);


-- ---------- SQL Server (dbSuporte) ----------
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[perfil_permissoes]') AND name = 'projetos_ids_permitidos')
--   ALTER TABLE [dbo].[perfil_permissoes] ADD [projetos_ids_permitidos] NVARCHAR(MAX) NULL; -- JSON array de UUIDs
