-- =====================================================
-- SOLUCIÓN DEFINITIVA PARA ERROR 42P10
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Deshabilitar RLS temporalmente
ALTER TABLE public.citas DISABLE ROW LEVEL SECURITY;

-- PASO 2: Verificar que la tabla tenga PRIMARY KEY en 'id'
DO $$ 
BEGIN
    -- Eliminar primary key si existe con nombre diferente
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.citas'::regclass 
        AND contype = 'p'
        AND conname != 'citas_pkey'
    ) THEN
        EXECUTE 'ALTER TABLE public.citas DROP CONSTRAINT ' || 
            (SELECT conname FROM pg_constraint 
             WHERE conrelid = 'public.citas'::regclass 
             AND contype = 'p' 
             LIMIT 1);
    END IF;
    
    -- Agregar primary key si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.citas'::regclass 
        AND contype = 'p'
    ) THEN
        ALTER TABLE public.citas ADD PRIMARY KEY (id);
    END IF;
END $$;

-- PASO 3: Asegurar que todas las columnas necesarias existen
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS posicion_cola INTEGER;
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS hora_llegada TIMESTAMPTZ;
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS hora_inicio_atencion TIMESTAMPTZ;
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS hora_finalizacion TIMESTAMPTZ;
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(20);

-- PASO 4: Eliminar constraint de status antiguo y crear nuevo
ALTER TABLE public.citas DROP CONSTRAINT IF EXISTS citas_status_check;
ALTER TABLE public.citas ADD CONSTRAINT citas_status_check 
CHECK (status IN (
  'pending',
  'scheduled', 
  'confirmed', 
  'waiting',
  'in_chair',
  'in_progress',
  'finishing',
  'completed', 
  'cancelled', 
  'no_show'
));

-- PASO 5: Eliminar TODAS las políticas RLS existentes
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'citas' 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.citas';
    END LOOP;
END $$;

-- PASO 6: Crear políticas RLS simples (SIN WITH CHECK que cause conflictos)
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT a todos
CREATE POLICY "citas_select_all" ON public.citas
    FOR SELECT
    USING (true);

-- Permitir INSERT a autenticados
CREATE POLICY "citas_insert_auth" ON public.citas
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Permitir UPDATE a autenticados (SIN RESTRICCIONES COMPLEJAS)
CREATE POLICY "citas_update_auth" ON public.citas
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permitir DELETE a autenticados
CREATE POLICY "citas_delete_auth" ON public.citas
    FOR DELETE
    TO authenticated
    USING (true);

-- PASO 7: Verificación final
SELECT 
    'CONFIGURACIÓN COMPLETADA' as resultado,
    (SELECT COUNT(*) FROM public.citas) as total_citas,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'citas') as politicas_activas,
    (SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'public.citas'::regclass AND contype = 'p') as tiene_primary_key;

-- PASO 8: Test de UPDATE (descomentar para probar)
-- SELECT 'Probando UPDATE...' as test;
-- UPDATE public.citas 
-- SET status = 'waiting', 
--     hora_llegada = NOW(),
--     posicion_cola = 1
-- WHERE id = (SELECT id FROM public.citas WHERE status IN ('pending', 'scheduled', 'confirmed') LIMIT 1)
-- RETURNING id, status, hora_llegada;
