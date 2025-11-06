-- ========================================
-- SCRIPT DE VERIFICACIÓN DEL USUARIO ADMIN
-- ========================================

-- Verificar en auth.users
SELECT
    id,
    email,
    created_at,
    email_confirmed_at,
    CASE
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '❌ NO Confirmado'
    END as estado_confirmacion
FROM auth.users
WHERE email = 'admin@jpbarber.com';

-- Verificar en auth.identities
SELECT
    i.id,
    i.user_id,
    i.provider,
    i.provider_id,
    i.created_at
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'admin@jpbarber.com';

-- Verificar en public.usuarios
SELECT
    id,
    email,
    nombre,
    role,
    activo,
    created_at
FROM public.usuarios
WHERE email = 'admin@jpbarber.com';

-- Resumen
DO $$
DECLARE
    auth_count INTEGER;
    identity_count INTEGER;
    usuarios_count INTEGER;
    is_confirmed BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email = 'admin@jpbarber.com';
    SELECT COUNT(*) INTO identity_count FROM auth.identities i JOIN auth.users u ON i.user_id = u.id WHERE u.email = 'admin@jpbarber.com';
    SELECT COUNT(*) INTO usuarios_count FROM public.usuarios WHERE email = 'admin@jpbarber.com';
    SELECT (email_confirmed_at IS NOT NULL) INTO is_confirmed FROM auth.users WHERE email = 'admin@jpbarber.com' LIMIT 1;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE VERIFICACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'En auth.users: %', auth_count;
    RAISE NOTICE 'En auth.identities: %', identity_count;
    RAISE NOTICE 'En public.usuarios: %', usuarios_count;
    RAISE NOTICE 'Email confirmado: %', CASE WHEN is_confirmed THEN 'SÍ' ELSE 'NO' END;
    RAISE NOTICE '========================================';

    IF auth_count = 0 THEN
        RAISE NOTICE '⚠️ PROBLEMA: Usuario NO existe en auth.users';
        RAISE NOTICE '📋 SOLUCIÓN: Créalo desde Authentication > Users en el Dashboard';
    ELSIF NOT is_confirmed THEN
        RAISE NOTICE '⚠️ PROBLEMA: Email NO está confirmado';
        RAISE NOTICE '📋 SOLUCIÓN: Al crear el usuario, activa "Auto Confirm User"';
    ELSIF identity_count = 0 THEN
        RAISE NOTICE '⚠️ PROBLEMA: Usuario NO tiene identity en auth.identities';
        RAISE NOTICE '📋 SOLUCIÓN: Este se crea automáticamente desde el Dashboard';
    ELSIF usuarios_count = 0 THEN
        RAISE NOTICE '⚠️ PROBLEMA: Usuario NO existe en public.usuarios';
        RAISE NOTICE '📋 SOLUCIÓN: Ejecuta el script supabase_sync_admin_to_usuarios.sql';
    ELSE
        RAISE NOTICE '✅ TODO CORRECTO - El usuario debería poder hacer login';
        RAISE NOTICE '';
        RAISE NOTICE 'Si aún ves error 401, verifica:';
        RAISE NOTICE '1. El password es exactamente: admin123';
        RAISE NOTICE '2. El email es exactamente: admin@jpbarber.com';
        RAISE NOTICE '3. Las variables de entorno están correctas';
    END IF;
    RAISE NOTICE '========================================';
END $$;
