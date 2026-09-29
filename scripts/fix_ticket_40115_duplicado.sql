-- ============================================================
-- Correção: remove a mensagem duplicada do ticket #40115
-- O conteúdo já está na "descricao" (primeiro card). Removemos a
-- mensagem da thread que ficou idêntica (segundo card repetido).
--
-- Rode no Supabase (SQL Editor).
-- ============================================================

DELETE FROM public.ticket_mensagens
WHERE ticket_id = (SELECT id FROM public.tickets WHERE numero = 40115)
  AND autor_tipo = 'cliente';
