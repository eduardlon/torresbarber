-- ========================================
-- CONFIGURAR PERMISOS PARA AUTENTICACIÓN
-- ========================================
-- Este script configura los permisos necesarios para que funcione la autenticación

-- ========================================
-- PASO 1: Deshabilitar RLS temporalmente (para desarrollo)
-- ========================================
ALTER TABLE IF EXISTS public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.barberos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.servicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.citas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_turns DISABLE ROW LEVEL SECURITY;

-- ========================================
-- PASO 2: Eliminar políticas existentes
-- ========================================
DROP POLICY IF EXISTS "Permitir lectura pública de usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir inserción pública de usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir actualización de usuarios propios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todos los usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.usuarios;

DROP POLICY IF EXISTS "Permitir lectura pública de barberos" ON public.barberos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver barberos" ON public.barberos;

DROP POLICY IF EXISTS "Permitir lectura pública de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver clientes" ON public.clientes;

DROP POLICY IF EXISTS "Permitir lectura pública de servicios" ON public.servicios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver servicios" ON public.servicios;

DROP POLICY IF EXISTS "Permitir lectura pública de citas" ON public.citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver citas" ON public.citas;

DROP POLICY IF EXISTS "Permitir lectura pública de turnos" ON public.daily_turns;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver turnos" ON public.daily_turns;

-- ========================================
-- PASO 3: Otorgar permisos públicos completos (para desarrollo)
-- ========================================

-- Permisos en usuarios
GRANT ALL ON public.usuarios TO anon;
GRANT ALL ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;

-- Permisos en barberos
GRANT ALL ON public.barberos TO anon;
GRANT ALL ON public.barberos TO authenticated;
GRANT ALL ON public.barberos TO service_role;

-- Permisos en clientes
GRANT ALL ON public.clientes TO anon;
GRANT ALL ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

-- Permisos en servicios
GRANT ALL ON public.servicios TO anon;
GRANT ALL ON public.servicios TO authenticated;
GRANT ALL ON public.servicios TO service_role;

-- Permisos en citas
GRANT ALL ON public.citas TO anon;
GRANT ALL ON public.citas TO authenticated;
GRANT ALL ON public.citas TO service_role;

-- Permisos en daily_turns
GRANT ALL ON public.daily_turns TO anon;
GRANT ALL ON public.daily_turns TO authenticated;
GRANT ALL ON public.daily_turns TO service_role;

-- ========================================
-- PASO 4: Verificar que auth.users es accesible
-- ========================================
-- Nota: auth.users es una tabla del sistema, no necesita permisos adicionales
-- pero verificamos que podamos consultarla

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PERMISOS CONFIGURADOS CORRECTAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RLS deshabilitado en todas las tablas';
    RAISE NOTICE '✅ Permisos completos otorgados a anon, authenticated y service_role';
    RAISE NOTICE '✅ Políticas antiguas eliminadas';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: Estos permisos son para DESARROLLO';
    RAISE NOTICE '⚠️  En producción, debes habilitar RLS y crear políticas seguras';
    RAISE NOTICE '========================================';
END $$;

-- ========================================
-- PASO 5: Verificar la configuración
-- ========================================
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '🔒 RLS Habilitado'
        ELSE '🔓 RLS Deshabilitado'
    END as estado_rls
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('usuarios', 'barberos', 'clientes', 'servicios', 'citas', 'daily_turns')
ORDER BY tablename;
