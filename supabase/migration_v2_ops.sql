-- =============================================================================
-- Migración V2: Operaciones y Control de Pedidos
-- Sin Culpa Ni Gluten
-- Agrega columnas de estado operativo a business_settings
-- Idempotente: seguro para ejecutar múltiples veces en Supabase SQL Editor
-- =============================================================================

DO $$
BEGIN
    -- 1. Agregar is_accepting_orders si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'is_accepting_orders'
    ) THEN
        ALTER TABLE public.business_settings 
        ADD COLUMN is_accepting_orders boolean NOT NULL DEFAULT true;
    END IF;

    -- 2. Agregar pause_message si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'pause_message'
    ) THEN
        ALTER TABLE public.business_settings 
        ADD COLUMN pause_message text NOT NULL DEFAULT 'Estamos con agenda completa por hoy. Volvemos a tomar pedidos muy pronto.';
    END IF;
END $$;
