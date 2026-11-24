-- =============================================================================
-- Migración V4: Reemplazo integral de menciones "Sin TACC" -> "Sin Gluten"
-- Sin Culpa Ni Gluten
-- Tablas cubiertas (según supabase/schema.sql y migration_v2_ops.sql):
--   - public.business_settings (brand_name, slogan, city, delivery_highlight, pause_message)
--   - public.products (name, short_description, cooking_tip, freezer_duration, badge, flavor_options, variants)
--   - public.combos (name, subtitle, items_included, badge)
-- Idempotente: seguro para ejecutar múltiples veces en Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- Función auxiliar temporal para normalizar todas las variantes de TACC / T.A.C.C.
-- respetando mayúsculas/minúsculas de cada contexto. Se elimina al finalizar la transacción.
CREATE OR REPLACE FUNCTION public._mig_v4_tacc_to_gluten(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN txt IS NULL THEN NULL
    ELSE
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                txt,
                '\ySIN\s+(?:T\.A\.C\.C\.?(?!\w)|[Tt][Aa][Cc][Cc]\y)',
                'SIN GLUTEN',
                'g'
              ),
              '\ySin\s+(?:[Tt]\.[Aa]\.[Cc]\.[Cc]\.?(?!\w)|[Tt][Aa][Cc][Cc]\y)',
              'Sin Gluten',
              'g'
            ),
            '\ysin\s+(?:[Tt]\.[Aa]\.[Cc]\.[Cc]\.?(?!\w)|[Tt][Aa][Cc][Cc]\y)',
            'sin gluten',
            'g'
          ),
          '\y(DE|NI|CON)\s+(?:T\.A\.C\.C\.?(?!\w)|TACC\y)',
          '\1 GLUTEN',
          'g'
        ),
        '\y(?:[Tt]\.[Aa]\.[Cc]\.[Cc]\.?(?!\w)|[Tt][Aa][Cc][Cc]\y)',
        'gluten',
        'g'
      )
  END;
$$;

-- 1. TABLA: public.business_settings
UPDATE public.business_settings
SET
  brand_name         = public._mig_v4_tacc_to_gluten(brand_name),
  slogan             = public._mig_v4_tacc_to_gluten(slogan),
  city               = public._mig_v4_tacc_to_gluten(city),
  delivery_highlight = public._mig_v4_tacc_to_gluten(delivery_highlight)
WHERE brand_name ~* '(tacc|t\.a\.c\.c)'
   OR slogan ~* '(tacc|t\.a\.c\.c)'
   OR city ~* '(tacc|t\.a\.c\.c)'
   OR delivery_highlight ~* '(tacc|t\.a\.c\.c)';

-- Columna pause_message agregada en migration_v2_ops.sql (validación segura)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_settings'
      AND column_name = 'pause_message'
  ) THEN
    UPDATE public.business_settings
    SET pause_message = public._mig_v4_tacc_to_gluten(pause_message)
    WHERE pause_message ~* '(tacc|t\.a\.c\.c)';
  END IF;
END $$;

-- 2. TABLA: public.products
UPDATE public.products
SET
  name              = public._mig_v4_tacc_to_gluten(name),
  short_description = public._mig_v4_tacc_to_gluten(short_description),
  cooking_tip       = public._mig_v4_tacc_to_gluten(cooking_tip),
  freezer_duration  = public._mig_v4_tacc_to_gluten(freezer_duration),
  badge             = public._mig_v4_tacc_to_gluten(badge),
  flavor_options    = CASE
    WHEN flavor_options IS NULL THEN NULL
    ELSE ARRAY(
      SELECT public._mig_v4_tacc_to_gluten(f)
      FROM unnest(flavor_options) WITH ORDINALITY AS t(f, ord)
      ORDER BY t.ord
    )
  END,
  variants          = COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN elem ? 'label' AND jsonb_typeof(elem->'label') = 'string'
            THEN jsonb_set(elem, '{label}', to_jsonb(public._mig_v4_tacc_to_gluten(elem->>'label')))
          ELSE elem
        END
        ORDER BY t.ord
      )
      FROM jsonb_array_elements(variants) WITH ORDINALITY AS t(elem, ord)
    ),
    variants
  )
WHERE name ~* '(tacc|t\.a\.c\.c)'
   OR short_description ~* '(tacc|t\.a\.c\.c)'
   OR cooking_tip ~* '(tacc|t\.a\.c\.c)'
   OR freezer_duration ~* '(tacc|t\.a\.c\.c)'
   OR COALESCE(badge, '') ~* '(tacc|t\.a\.c\.c)'
   OR COALESCE(array_to_string(flavor_options, ' '), '') ~* '(tacc|t\.a\.c\.c)'
   OR variants::text ~* '(tacc|t\.a\.c\.c)';

-- 3. TABLA: public.combos
UPDATE public.combos
SET
  name           = public._mig_v4_tacc_to_gluten(name),
  subtitle       = public._mig_v4_tacc_to_gluten(subtitle),
  badge          = public._mig_v4_tacc_to_gluten(badge),
  items_included = ARRAY(
    SELECT public._mig_v4_tacc_to_gluten(item)
    FROM unnest(items_included) WITH ORDINALITY AS t(item, ord)
    ORDER BY t.ord
  )
WHERE name ~* '(tacc|t\.a\.c\.c)'
   OR subtitle ~* '(tacc|t\.a\.c\.c)'
   OR COALESCE(badge, '') ~* '(tacc|t\.a\.c\.c)'
   OR array_to_string(items_included, ' ') ~* '(tacc|t\.a\.c\.c)';

-- Limpiar función auxiliar temporal
DROP FUNCTION IF EXISTS public._mig_v4_tacc_to_gluten(text);

COMMIT;
