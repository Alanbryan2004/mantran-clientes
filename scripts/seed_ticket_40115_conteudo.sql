-- ============================================================
-- Conteúdo de validação do ticket #40115 ("Liberar novos usuários")
-- Adiciona o corpo do e-mail do cliente para dar contexto na tela.
--
-- Rode no Supabase (SQL Editor).
-- ============================================================

-- 1) Preenche a descrição inicial (corpo do chamado) e o e-mail do solicitante
UPDATE public.tickets
SET
  descricao = 'Para: SAC <sac@mantran.eti.br>' || chr(10) || chr(10) ||
              'Boa tarde, por favor liberar novos usuários para o sistema:' || chr(10) || chr(10) ||
              'Karoline Mikaelly Alves Freitas' || chr(10) ||
              'Brenda Julia Lopes Alexandre' || chr(10) ||
              'Matheus Morais da Silva' || chr(10) ||
              'FELIPE JOAO DA COSTA',
  cliente_email = COALESCE(cliente_email, 'ddccelulalastmile@gmail.com'),
  updated_at = NOW()
WHERE numero = 40115;

-- 2) (Opcional) Também registra como a primeira mensagem da thread, vinda do cliente
INSERT INTO public.ticket_mensagens (ticket_id, tipo, conteudo, autor_nome, autor_tipo, created_at)
SELECT
  t.id,
  'cliente',
  'Para: SAC <sac@mantran.eti.br>' || chr(10) || chr(10) ||
  'Boa tarde, por favor liberar novos usuários para o sistema:' || chr(10) || chr(10) ||
  'Karoline Mikaelly Alves Freitas' || chr(10) ||
  'Brenda Julia Lopes Alexandre' || chr(10) ||
  'Matheus Morais da Silva' || chr(10) ||
  'FELIPE JOAO DA COSTA',
  t.cliente_nome,
  'cliente',
  t.created_at
FROM public.tickets t
WHERE t.numero = 40115
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_mensagens m
    WHERE m.ticket_id = t.id AND m.autor_tipo = 'cliente'
  );
