-- =============================================================================
-- ACADEMIA MANTRAN - Vídeos de treinamento (YouTube "Não listado")
--
-- Guardamos apenas o LINK do vídeo (o arquivo fica no YouTube), então não pesa
-- no Supabase nem na Vercel.
--
-- Banco: Supabase (PostgreSQL) — executar no SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.academia_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NULL,
  youtube_url TEXT NOT NULL,              -- link original informado
  youtube_id TEXT NOT NULL,               -- ID de 11 caracteres extraído do link
  ordem INT NOT NULL DEFAULT 0,           -- menor aparece primeiro
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por_nome TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academia_videos_ordem ON public.academia_videos(ordem, titulo);
CREATE INDEX IF NOT EXISTS idx_academia_videos_ativo ON public.academia_videos(ativo);

-- RLS (mesmo padrão das demais tabelas internas: acesso liberado)
ALTER TABLE public.academia_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all academia_videos" ON public.academia_videos;
CREATE POLICY "Allow all academia_videos" ON public.academia_videos FOR ALL USING (true) WITH CHECK (true);

-- Primeiro vídeo (só insere se ainda não existir)
INSERT INTO public.academia_videos (titulo, descricao, youtube_url, youtube_id, ordem, criado_por_nome)
SELECT
  'Cadastro de Veículo Frota',
  'Passo a passo para cadastrar um veículo de frota no Mantran.',
  'https://youtu.be/sQP4rkWNROo',
  'sQP4rkWNROo',
  1,
  'Carga inicial'
WHERE NOT EXISTS (SELECT 1 FROM public.academia_videos WHERE youtube_id = 'sQP4rkWNROo');
