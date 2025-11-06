-- ========================================
-- SINCRONIZAR USUARIO ADMIN CON PUBLIC.USUARIOS
-- ========================================
-- Este script sincroniza el usuario de auth.users con public.usuarios
-- IMPORTANTE: Primero debes crear el usuario desde el Dashboard de Supabase

-- ========================================
-- PASO 1: Verificar que el usuario existe en auth.users
-- ========================================
DO $$
DECLARE
    admin_uuid UUID;
BEGIN
    -- Buscar el UUID del usuario admin
    SELECT id INTO admin_uuid
    FROM auth.users
    WHERE email = 'admin@jpbarber.com'
    LIMIT 1;

    IF admin_uuid IS NULL THEN
        RAISE EXCEPTION 'ERROR: El usuario admin@jpbarber.com NO existe en auth.users. Debes crearlo primero desde Authentication > Users en el Dashboard de Supabase.';
    ELSE
        RAISE NOTICE 'Usuario encontrado en auth.users con UUID: %', admin_uuid;
    END IF;
END $$;

-- ========================================
-- PASO 2: Crear/Actualizar en public.usuarios
-- ========================================
DO $$
DECLARE
    admin_uuid UUID;
BEGIN
    -- Obtener el UUID del usuario admin
    SELECT id INTO admin_uuid
    FROM auth.users
    WHERE email = 'admin@jpbarber.com'
    LIMIT 1;

    -- Insertar o actualizar en public.usuarios
    INSERT INTO public.usuarios (id, email, nombre, password, role, activo)
    VALUES (
        admin_uuid,
        'admin@jpbarber.com',
        'Administrador JP Barber',
        crypt('admin123', gen_salt('bf')),
        'super_admin',
        true
    )
    ON CONFLICT (email) DO UPDATE SET
        id = EXCLUDED.id,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        activo = EXCLUDED.activo,
        updated_at = NOW();

    RAISE NOTICE '✅ Usuario sincronizado en public.usuarios';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONFIGURACIÓN COMPLETA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UUID: %', admin_uuid;
    RAISE NOTICE 'Email: admin@jpbarber.com';
    RAISE NOTICE 'Password: admin123';
    RAISE NOTICE 'Role: super_admin';
    RAISE NOTICE '========================================';
END $$;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
DO $$
DECLARE
    auth_exists BOOLEAN;
    usuarios_exists BOOLEAN;
    user_confirmed BOOLEAN;
    user_uuid UUID;
BEGIN
    -- Verificar en auth.users
    SELECT
        (COUNT(*) > 0),
        MAX(id),
        MAX(email_confirmed_at IS NOT NULL)
    INTO auth_exists, user_uuid, user_confirmed
    FROM auth.users
    WHERE email = 'admin@jpbarber.com';

    -- Verificar en public.usuarios
    SELECT COUNT(*) > 0 INTO usuarios_exists
    FROM public.usuarios
    WHERE email = 'admin@jpbarber.com';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UUID: %', user_uuid;
    RAISE NOTICE 'Existe en auth.users: %', CASE WHEN auth_exists THEN 'SÍ' ELSE 'NO' END;
    RAISE NOTICE 'Existe en public.usuarios: %', CASE WHEN usuarios_exists THEN 'SÍ' ELSE 'NO' END;
    RAISE NOTICE 'Email confirmado: %', CASE WHEN user_confirmed THEN 'SÍ' ELSE 'NO' END;
    RAISE NOTICE '';

    IF auth_exists AND usuarios_exists AND user_confirmed THEN
        RAISE NOTICE '✅ ¡TODO LISTO! El usuario está correctamente configurado.';
        RAISE NOTICE '';
        RAISE NOTICE 'Ahora puedes iniciar sesión en:';
        RAISE NOTICE '👉 http://localhost:4321/login-admin';
        RAISE NOTICE '';
        RAISE NOTICE 'Credenciales:';
        RAISE NOTICE '📧 Email: admin@jpbarber.com';
        RAISE NOTICE '🔑 Password: admin123';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  IMPORTANTE: El error 401 debería desaparecer ahora.';
    ELSE
        RAISE WARNING '⚠️ Hay un problema con la configuración:';
        IF NOT auth_exists THEN
            RAISE WARNING '❌ Usuario NO existe en auth.users (créalo desde Dashboard)';
        END IF;
        IF NOT usuarios_exists THEN
            RAISE WARNING '❌ Usuario NO existe en public.usuarios';
        END IF;
        IF NOT user_confirmed THEN
            RAISE WARNING '❌ Email NO está confirmado (activa "Auto Confirm User")';
        END IF;
    END IF;
    RAISE NOTICE '========================================';
END $$;
