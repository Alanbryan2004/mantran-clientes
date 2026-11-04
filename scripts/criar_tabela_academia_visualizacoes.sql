-- =============================================================================
-- ACADEMIA MANTRAN - Progresso de visualização por usuário
--
-- Um registro por (usuário, vídeo). Guarda se o vídeo foi iniciado, o maior
-- percentual assistido e quando foi concluído (>= 90% ou fim do vídeo).
-- Permite mostrar ao cliente quais treinamentos ele já assistiu.
--
-- Pré-requisito: tabela academia_videos (criar_tabelas_academia.sql).
-- Banco: Supabase (PostgreSQL) — executar no SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.academia_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_chave TEXT NOT NULL,               -- id do usuário logado (tabela usuario)
  usuario_nome TEXT NULL,
  video_id UUID NOT NULL REFERENCES public.academia_videos(id) ON DELETE CASCADE,
  assistido BOOLEAN NOT NULL DEFAULT false,  -- true ao chegar a 90% ou ao fim
  progresso_pct INT NOT NULL DEFAULT 0,      -- maior percentual alcançado (0-100)
  primeira_vez TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_vez TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ NULL,
  CONSTRAINT uq_academia_visualizacao UNIQUE (usuario_chave, video_id)
);

CREATE INDEX IF NOT EXISTS idx_academia_visualizacoes_usuario ON public.academia_visualizacoes(usuario_chave);
CREATE INDEX IF NOT EXISTS idx_academia_visualizacoes_video ON public.academia_visualizacoes(video_id);

-- RLS (mesmo padrão das demais tabelas internas: acesso liberado)
ALTER TABLE public.academia_visualizacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all academia_visualizacoes" ON public.academia_visualizacoes;
CREATE POLICY "Allow all academia_visualizacoes" ON public.academia_visualizacoes FOR ALL USING (true) WITH CHECK (true);
