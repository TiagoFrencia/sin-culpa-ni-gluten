-- =============================================================================
-- Migración V3: Analíticas de Negocio Livianas y Registro de Pedidos
-- Sin Culpa Ni Gluten
-- Tablas: order_intents, daily_metrics
-- Función RPC: increment_daily_metric
-- Idempotente: seguro para ejecutar múltiples veces en Supabase SQL Editor
-- =============================================================================

-- 1. TABLA: order_intents (Intenciones de pedido desde la web / WhatsApp)
CREATE TABLE IF NOT EXISTS public.order_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  items jsonb NOT NULL,
  items_count integer NOT NULL,
  total_ars integer NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'cancelado')),
  source text NOT NULL DEFAULT 'carrito' CHECK (source IN ('carrito', 'consulta_directa')),
  note text DEFAULT NULL,
  CONSTRAINT chk_order_intents_counts CHECK (total_ars >= 0 AND items_count >= 0)
);

-- Índices eficientes para consultas del dashboard contable
CREATE INDEX IF NOT EXISTS idx_order_intents_created_at ON public.order_intents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_intents_status ON public.order_intents (status);

-- 2. TABLA: daily_metrics (1 sola fila por día = cero bloat en plan gratuito)
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  metric_date date PRIMARY KEY DEFAULT current_date,
  visits integer NOT NULL DEFAULT 0,
  cart_adds integer NOT NULL DEFAULT 0,
  pricelist_opens integer NOT NULL DEFAULT 0,
  whatsapp_clicks integer NOT NULL DEFAULT 0
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.order_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS: order_intents
-- Inserción pública (anónimos y autenticados al tocar WhatsApp) con validación de montos
DROP POLICY IF EXISTS "Permitir insercion publica de intenciones" ON public.order_intents;
CREATE POLICY "Permitir insercion publica de intenciones"
ON public.order_intents FOR INSERT
TO anon, authenticated
WITH CHECK (total_ars >= 0 AND items_count >= 0);

-- Lectura, actualización y borrado exclusivos para el usuario autenticado (Admin / Socia)
DROP POLICY IF EXISTS "Permitir lectura de intenciones solo a autenticados" ON public.order_intents;
CREATE POLICY "Permitir lectura de intenciones solo a autenticados"
ON public.order_intents FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de intenciones solo a autenticados" ON public.order_intents;
CREATE POLICY "Permitir actualizacion de intenciones solo a autenticados"
ON public.order_intents FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir borrado de intenciones solo a autenticados" ON public.order_intents;
CREATE POLICY "Permitir borrado de intenciones solo a autenticados"
ON public.order_intents FOR DELETE
TO authenticated
USING (true);

-- 5. POLÍTICAS RLS: daily_metrics
-- Lectura restringida exclusivamente a autenticados (Admin / Socia)
DROP POLICY IF EXISTS "Permitir lectura de metricas solo a autenticados" ON public.daily_metrics;
CREATE POLICY "Permitir lectura de metricas solo a autenticados"
ON public.daily_metrics FOR SELECT
TO authenticated
USING (true);

-- 6. FUNCIÓN RPC: increment_daily_metric
-- Incrementa atómicamente el contador diario con whitelist estricta y SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.increment_daily_metric(p_metric text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Whitelist estricta de las 4 columnas métricas permitidas
  IF p_metric NOT IN ('visits', 'cart_adds', 'pricelist_opens', 'whatsapp_clicks') THEN
    RAISE EXCEPTION 'Métrica no permitida: %', p_metric;
  END IF;

  EXECUTE format(
    'INSERT INTO public.daily_metrics (metric_date, %I)
     VALUES (current_date, 1)
     ON CONFLICT (metric_date)
     DO UPDATE SET %I = public.daily_metrics.%I + 1',
    p_metric, p_metric, p_metric
  );
END;
$$;

-- Permisos de ejecución de la RPC para anónimos (tienda pública) y autenticados (admin)
REVOKE EXECUTE ON FUNCTION public.increment_daily_metric(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_daily_metric(text) TO anon, authenticated;
