-- ============================================================
-- Seed dos Grupos de tickets/contatos (tabela ticket_grupos)
-- Opções: Grupo A, Grupo B, DBaaS, Mantran
-- ("Nenhum" é a opção vazia padrão no formulário — não precisa cadastrar)
-- Idempotente: só insere o grupo se ainda não existir (por nome).
-- ============================================================

-- ---------- PostgreSQL (Supabase) ----------
INSERT INTO public.ticket_grupos (nome)
SELECT v FROM (VALUES ('Grupo A'), ('Grupo B'), ('DBaaS'), ('Mantran')) AS s(v)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ticket_grupos g WHERE g.nome = s.v
);

-- Remove os grupos antigos (Suporte N1, Suporte N2, Implantação, Financeiro).
-- Antes de deletar, desvincula qualquer contato que ainda aponte para eles
-- (evita grupo_id órfão em ticket_contatos).
UPDATE public.ticket_contatos
SET grupo_id = NULL
WHERE grupo_id IN (
  SELECT id FROM public.ticket_grupos
  WHERE nome IN ('Suporte N1', 'Suporte N2', 'Implantação', 'Financeiro')
);

DELETE FROM public.ticket_grupos
WHERE nome IN ('Suporte N1', 'Suporte N2', 'Implantação', 'Financeiro');

-- ---------- SQL Server (dbSuporte) ----------
-- IF OBJECT_ID(N'[dbo].[ticket_grupos]', N'U') IS NOT NULL
-- BEGIN
--   INSERT INTO [dbo].[ticket_grupos] ([nome])
--   SELECT v FROM (VALUES ('Grupo A'), ('Grupo B'), ('DBaaS'), ('Mantran')) AS s(v)
--   WHERE NOT EXISTS (
--     SELECT 1 FROM [dbo].[ticket_grupos] g WHERE g.[nome] = s.v
--   );
--
--   UPDATE [dbo].[ticket_contatos]
--   SET [grupo_id] = NULL
--   WHERE [grupo_id] IN (
--     SELECT [id] FROM [dbo].[ticket_grupos]
--     WHERE [nome] IN ('Suporte N1', 'Suporte N2', 'Implantação', 'Financeiro')
--   );
--
--   DELETE FROM [dbo].[ticket_grupos]
--   WHERE [nome] IN ('Suporte N1', 'Suporte N2', 'Implantação', 'Financeiro');
-- END
