-- =============================================================================
-- Migración V6: Inteligencia de Mercado, Control Contable de Márgenes y Costos
-- Sin Culpa Ni Gluten
-- Tablas modificadas: public.order_intents
-- Tablas nuevas: public.product_costs, public.daily_channel_metrics,
--                public.daily_product_signals, public.daily_hourly_metrics
-- Funciones RPC: track_channel_and_slot, track_product_signal
-- Idempotente: seguro para ejecutar múltiples veces en Supabase SQL Editor
-- =============================================================================

-- 1. NUEVAS COLUMNAS OPCIONALES EN public.order_intents
ALTER TABLE public.order_intents
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'directo'
    CHECK (channel IN ('instagram', 'whatsapp', 'google', 'directo', 'otro')),
  ADD COLUMN IF NOT EXISTS payment_method text NULL
    CHECK (payment_method IS NULL OR payment_method IN ('transferencia', 'efectivo', 'mercadopago', 'tarjeta')),
  ADD COLUMN IF NOT EXISTS neighborhood text NULL,
  ADD COLUMN IF NOT EXISTS customer_type text NULL
    CHECK (customer_type IS NULL OR customer_type IN ('nuevo', 'recurrente')),
  ADD COLUMN IF NOT EXISTS time_slot text NULL
    CHECK (time_slot IS NULL OR time_slot IN ('manana', 'mediodia', 'tarde', 'noche'));

CREATE INDEX IF NOT EXISTS idx_order_intents_channel ON public.order_intents (channel);

-- 2. TABLA PRIVADA: public.product_costs (CMV y Margen Bruto)
CREATE TABLE IF NOT EXISTS public.product_costs (
  item_key text PRIMARY KEY,
  item_type text NOT NULL CHECK (item_type IN ('product', 'combo')),
  item_name text NOT NULL,
  unit_cost_ars integer NOT NULL DEFAULT 0 CHECK (unit_cost_ars >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

-- Blindaje estricto: anon NO tiene ningún permiso sobre costos privados
REVOKE ALL ON TABLE public.product_costs FROM anon;
REVOKE ALL ON TABLE public.product_costs FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_costs TO authenticated;

DROP POLICY IF EXISTS "Permitir lectura de costos solo a autenticados" ON public.product_costs;
CREATE POLICY "Permitir lectura de costos solo a autenticados"
ON public.product_costs FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercion de costos solo a autenticados" ON public.product_costs;
CREATE POLICY "Permitir insercion de costos solo a autenticados"
ON public.product_costs FOR INSERT
TO authenticated
WITH CHECK (unit_cost_ars >= 0);

DROP POLICY IF EXISTS "Permitir actualizacion de costos solo a autenticados" ON public.product_costs;
CREATE POLICY "Permitir actualizacion de costos solo a autenticados"
ON public.product_costs FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (unit_cost_ars >= 0);

DROP POLICY IF EXISTS "Permitir borrado de costos solo a autenticados" ON public.product_costs;
CREATE POLICY "Permitir borrado de costos solo a autenticados"
ON public.product_costs FOR DELETE
TO authenticated
USING (true);

-- 3. TABLAS AGREGADAS DIARIAS (cero bloat en plan gratuito)

-- 3a. Métricas diarias por canal de origen
CREATE TABLE IF NOT EXISTS public.daily_channel_metrics (
  metric_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  channel text NOT NULL CHECK (channel IN ('instagram', 'whatsapp', 'google', 'directo', 'otro')),
  visits integer NOT NULL DEFAULT 0,
  whatsapp_clicks integer NOT NULL DEFAULT 0,
  PRIMARY KEY (metric_date, channel)
);

ALTER TABLE public.daily_channel_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de canales solo a autenticados" ON public.daily_channel_metrics;
CREATE POLICY "Permitir lectura de canales solo a autenticados"
ON public.daily_channel_metrics FOR SELECT
TO authenticated
USING (true);

-- 3b. Señales diarias por producto / próximo ingreso
CREATE TABLE IF NOT EXISTS public.daily_product_signals (
  metric_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  item_key text NOT NULL,
  item_name text NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('cart_add', 'cart_remove', 'consult_500g', 'out_of_stock', 'upcoming_notify')),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (metric_date, item_key, signal_type)
);

ALTER TABLE public.daily_product_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de senales solo a autenticados" ON public.daily_product_signals;
CREATE POLICY "Permitir lectura de senales solo a autenticados"
ON public.daily_product_signals FOR SELECT
TO authenticated
USING (true);

-- 3c. Métricas diarias por franja horaria (hora Argentina)
CREATE TABLE IF NOT EXISTS public.daily_hourly_metrics (
  metric_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  time_slot text NOT NULL CHECK (time_slot IN ('manana', 'mediodia', 'tarde', 'noche')),
  visits integer NOT NULL DEFAULT 0,
  whatsapp_clicks integer NOT NULL DEFAULT 0,
  PRIMARY KEY (metric_date, time_slot)
);

ALTER TABLE public.daily_hourly_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de franjas solo a autenticados" ON public.daily_hourly_metrics;
CREATE POLICY "Permitir lectura de franjas solo a autenticados"
ON public.daily_hourly_metrics FOR SELECT
TO authenticated
USING (true);

-- 4. FUNCIONES RPC SECURITY DEFINER (escritura segura desde tienda pública)

-- 4a. track_channel_and_slot(p_channel, p_event)
CREATE OR REPLACE FUNCTION public.track_channel_and_slot(
  p_channel text,
  p_event text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_ar timestamp;
  v_date date;
  v_hour int;
  v_slot text;
BEGIN
  IF p_channel NOT IN ('instagram', 'whatsapp', 'google', 'directo', 'otro') THEN
    RAISE EXCEPTION 'Canal no permitido: %', p_channel;
  END IF;

  IF p_event NOT IN ('visits', 'whatsapp_clicks') THEN
    RAISE EXCEPTION 'Evento no permitido: %', p_event;
  END IF;

  v_now_ar := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_date := v_now_ar::date;
  v_hour := EXTRACT(HOUR FROM v_now_ar)::int;

  IF v_hour >= 6 AND v_hour <= 11 THEN
    v_slot := 'manana';
  ELSIF v_hour >= 12 AND v_hour <= 15 THEN
    v_slot := 'mediodia';
  ELSIF v_hour >= 16 AND v_hour <= 20 THEN
    v_slot := 'tarde';
  ELSE
    v_slot := 'noche';
  END IF;

  IF p_event = 'visits' THEN
    INSERT INTO public.daily_channel_metrics (metric_date, channel, visits, whatsapp_clicks)
    VALUES (v_date, p_channel, 1, 0)
    ON CONFLICT (metric_date, channel)
    DO UPDATE SET visits = public.daily_channel_metrics.visits + 1;

    INSERT INTO public.daily_hourly_metrics (metric_date, time_slot, visits, whatsapp_clicks)
    VALUES (v_date, v_slot, 1, 0)
    ON CONFLICT (metric_date, time_slot)
    DO UPDATE SET visits = public.daily_hourly_metrics.visits + 1;
  ELSE
    INSERT INTO public.daily_channel_metrics (metric_date, channel, visits, whatsapp_clicks)
    VALUES (v_date, p_channel, 0, 1)
    ON CONFLICT (metric_date, channel)
    DO UPDATE SET whatsapp_clicks = public.daily_channel_metrics.whatsapp_clicks + 1;

    INSERT INTO public.daily_hourly_metrics (metric_date, time_slot, visits, whatsapp_clicks)
    VALUES (v_date, v_slot, 0, 1)
    ON CONFLICT (metric_date, time_slot)
    DO UPDATE SET whatsapp_clicks = public.daily_hourly_metrics.whatsapp_clicks + 1;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.track_channel_and_slot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_channel_and_slot(text, text) TO anon, authenticated;

-- 4b. track_product_signal(p_item_key, p_item_name, p_signal_type)
CREATE OR REPLACE FUNCTION public.track_product_signal(
  p_item_key text,
  p_item_name text,
  p_signal_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_key text;
  v_name text;
BEGIN
  IF p_signal_type NOT IN ('cart_add', 'cart_remove', 'consult_500g', 'out_of_stock', 'upcoming_notify') THEN
    RAISE EXCEPTION 'Tipo de señal no permitida: %', p_signal_type;
  END IF;

  v_key := left(btrim(coalesce(p_item_key, '')), 120);
  v_name := left(btrim(coalesce(p_item_name, '')), 120);

  IF v_key = '' OR v_name = '' THEN
    RETURN;
  END IF;

  v_date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  INSERT INTO public.daily_product_signals (metric_date, item_key, item_name, signal_type, count)
  VALUES (v_date, v_key, v_name, p_signal_type, 1)
  ON CONFLICT (metric_date, item_key, signal_type)
  DO UPDATE SET
    count = public.daily_product_signals.count + 1,
    item_name = EXCLUDED.item_name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.track_product_signal(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_product_signal(text, text, text) TO anon, authenticated;
