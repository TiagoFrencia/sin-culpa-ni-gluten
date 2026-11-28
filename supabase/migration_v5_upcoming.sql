-- =============================================================================
-- Migración V5: Sección administrable "Próximamente · Nuevos ingresos"
-- Sin Culpa Ni Gluten
-- Tabla: public.upcoming_items
-- Idempotente: seguro para ejecutar múltiples veces en Supabase SQL Editor
-- =============================================================================

-- 1. TABLA: public.upcoming_items
CREATE TABLE IF NOT EXISTS public.upcoming_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT 'Próximamente',
  image_url text NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para ordenamiento consistente en tienda y admin
CREATE INDEX IF NOT EXISTS idx_upcoming_items_sort
ON public.upcoming_items (sort_order ASC, created_at ASC);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.upcoming_items ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS
-- Lectura pública (tienda y admin)
DROP POLICY IF EXISTS "Permitir lectura publica en upcoming_items" ON public.upcoming_items;
CREATE POLICY "Permitir lectura publica en upcoming_items"
ON public.upcoming_items FOR SELECT
TO anon, authenticated
USING (true);

-- Escritura exclusiva para usuarios autenticados (Admin)
DROP POLICY IF EXISTS "Permitir insercion solo a autenticados en upcoming_items" ON public.upcoming_items;
CREATE POLICY "Permitir insercion solo a autenticados en upcoming_items"
ON public.upcoming_items FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion solo a autenticados en upcoming_items" ON public.upcoming_items;
CREATE POLICY "Permitir actualizacion solo a autenticados en upcoming_items"
ON public.upcoming_items FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir borrado solo a autenticados en upcoming_items" ON public.upcoming_items;
CREATE POLICY "Permitir borrado solo a autenticados en upcoming_items"
ON public.upcoming_items FOR DELETE
TO authenticated
USING (true);

-- 4. SEED IDEMPOTENTE (solo si la tabla está vacía)
INSERT INTO public.upcoming_items (title, description, badge, image_url, active, sort_order)
SELECT v.title, v.description, v.badge, NULL, true, v.sort_order
FROM (
  VALUES
    (
      'Tarta de Pollo',
      'Masa casera 100% Sin Gluten con relleno cremoso de pollo y vegetales.',
      'Muy pronto',
      1
    ),
    (
      'Tarta de Acelga',
      'Acelga fresca, queso y masa artesanal lista para hornear.',
      'Próximamente',
      2
    ),
    (
      'Ñoquis Caseros',
      'Ñoquis artesanales de papa 100% Sin Gluten, suaves y listos en minutos.',
      'En desarrollo',
      3
    )
) AS v(title, description, badge, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.upcoming_items);
