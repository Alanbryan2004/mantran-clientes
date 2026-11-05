-- =========================================================================
-- ACADEMIA MANTRAN - Módulos (vários) e Seção dos vídeos (SUPABASE / PostgreSQL)
-- Executar no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
-- modulos: lista JSON com os nomes de modulos_mantran (um vídeo pode ter 2+ módulos)
-- secao  : seção/tela (Cadastros, Importação, Exportação...)
-- Se existir a coluna antiga "modulo" (texto único), migra o valor e remove a coluna.
-- =========================================================================

ALTER TABLE public.academia_videos ADD COLUMN IF NOT EXISTS modulos JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.academia_videos ADD COLUMN IF NOT EXISTS secao   TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'academia_videos' AND column_name = 'modulo') THEN
    UPDATE public.academia_videos
       SET modulos = jsonb_build_array(modulo)
     WHERE modulo IS NOT NULL AND btrim(modulo) <> '' AND modulos = '[]'::jsonb;
    DROP INDEX IF EXISTS public.idx_academia_videos_modulo;
    ALTER TABLE public.academia_videos DROP COLUMN modulo;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_academia_videos_modulos ON public.academia_videos USING GIN (modulos);

NOTIFY pgrst, 'reload schema';
