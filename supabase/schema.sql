-- Esquema inicial de Base de Datos para Sin Culpa Ni Gluten
-- Tablas: business_settings, products, combos
-- Configuración de Row Level Security (RLS) y Storage

-- 1. EXTENSIÓN PARA UUID / UTILIDADES (si hiciera falta)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FUNCIÓN PARA AUTO-ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLA: business_settings (Registro único id = 1)
CREATE TABLE IF NOT EXISTS public.business_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name text NOT NULL DEFAULT 'Sin Culpa Ni Gluten',
  slogan text NOT NULL DEFAULT 'Comer rico y sin gluten ya no es un problema.',
  city text NOT NULL DEFAULT 'Río Cuarto, Córdoba',
  whatsapp_phone text NOT NULL DEFAULT '5493585728550',
  whatsapp_display text NOT NULL DEFAULT '358 572-8550',
  instagram_handle text NOT NULL DEFAULT '@sinculpa.nigluten',
  instagram_url text NOT NULL DEFAULT 'https://www.instagram.com/sinculpa.nigluten/',
  delivery_highlight text NOT NULL DEFAULT '¡Envío gratis en Río Cuarto!',
  price_list_image_url text NOT NULL DEFAULT '/images/lista-precios.jpg',
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger updated_at para business_settings
DROP TRIGGER IF EXISTS tr_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER tr_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. TABLA: products
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('milanesas', 'hamburguesas', 'empanadas', 'pizzas', 'panaderia', 'especiales')),
  short_description text NOT NULL,
  image_url text NOT NULL,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  supports_half_kg_inquiry boolean NOT NULL DEFAULT false,
  flavor_options text[] DEFAULT NULL,
  cooking_tip text NOT NULL,
  freezer_duration text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  available boolean NOT NULL DEFAULT true,
  badge text DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger updated_at para products
DROP TRIGGER IF EXISTS tr_products_updated_at ON public.products;
CREATE TRIGGER tr_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. TABLA: combos
CREATE TABLE IF NOT EXISTS public.combos (
  id text PRIMARY KEY,
  name text NOT NULL,
  subtitle text NOT NULL,
  items_included text[] NOT NULL DEFAULT '{}',
  regular_price integer NOT NULL,
  promo_price integer DEFAULT NULL,
  badge text DEFAULT NULL,
  image_url text NOT NULL,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger updated_at para combos
DROP TRIGGER IF EXISTS tr_combos_updated_at ON public.combos;
CREATE TRIGGER tr_combos_updated_at
BEFORE UPDATE ON public.combos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS: LECTURA PÚBLICA (SELECT USING true)
DROP POLICY IF EXISTS "Permitir lectura publica en business_settings" ON public.business_settings;
CREATE POLICY "Permitir lectura publica en business_settings"
ON public.business_settings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica en products" ON public.products;
CREATE POLICY "Permitir lectura publica en products"
ON public.products FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica en combos" ON public.combos;
CREATE POLICY "Permitir lectura publica en combos"
ON public.combos FOR SELECT
TO public
USING (true);

-- 8. POLÍTICAS RLS: ESCRITURA EXCLUSIVA PARA USUARIOS AUTENTICADOS (ADMIN)
DROP POLICY IF EXISTS "Permitir insercion solo a autenticados en business_settings" ON public.business_settings;
CREATE POLICY "Permitir insercion solo a autenticados en business_settings"
ON public.business_settings FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion solo a autenticados en business_settings" ON public.business_settings;
CREATE POLICY "Permitir actualizacion solo a autenticados en business_settings"
ON public.business_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir borrado solo a autenticados en business_settings" ON public.business_settings;
CREATE POLICY "Permitir borrado solo a autenticados en business_settings"
ON public.business_settings FOR DELETE
TO authenticated
USING (true);

-- Products autenticado
DROP POLICY IF EXISTS "Permitir insercion solo a autenticados en products" ON public.products;
CREATE POLICY "Permitir insercion solo a autenticados en products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion solo a autenticados en products" ON public.products;
CREATE POLICY "Permitir actualizacion solo a autenticados en products"
ON public.products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir borrado solo a autenticados en products" ON public.products;
CREATE POLICY "Permitir borrado solo a autenticados en products"
ON public.products FOR DELETE
TO authenticated
USING (true);

-- Combos autenticado
DROP POLICY IF EXISTS "Permitir insercion solo a autenticados en combos" ON public.combos;
CREATE POLICY "Permitir insercion solo a autenticados en combos"
ON public.combos FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion solo a autenticados en combos" ON public.combos;
CREATE POLICY "Permitir actualizacion solo a autenticados en combos"
ON public.combos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir borrado solo a autenticados en combos" ON public.combos;
CREATE POLICY "Permitir borrado solo a autenticados en combos"
ON public.combos FOR DELETE
TO authenticated
USING (true);

-- 9. CONFIGURACIÓN DE STORAGE: BUCKET 'catalog-images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-images', 'catalog-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para catalog-images
DROP POLICY IF EXISTS "Lectura publica de catalog-images" ON storage.objects;
CREATE POLICY "Lectura publica de catalog-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'catalog-images');

DROP POLICY IF EXISTS "Subida de catalog-images solo autenticados" ON storage.objects;
CREATE POLICY "Subida de catalog-images solo autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'catalog-images');

DROP POLICY IF EXISTS "Modificacion de catalog-images solo autenticados" ON storage.objects;
CREATE POLICY "Modificacion de catalog-images solo autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'catalog-images');

DROP POLICY IF EXISTS "Eliminacion de catalog-images solo autenticados" ON storage.objects;
CREATE POLICY "Eliminacion de catalog-images solo autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'catalog-images');
