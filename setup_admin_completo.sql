-- ========================================
-- SETUP COMPLETO DEL USUARIO ADMINISTRADOR
-- ========================================
-- Este script hace todo el proceso de configuración automáticamente

-- ========================================
-- PASO 1: Limpiar usuarios existentes
-- ========================================
DO $$
BEGIN
    -- Eliminar identidades primero
    DELETE FROM auth.identities
    WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@jpbarber.com');

    -- Eliminar de auth.users
    DELETE FROM auth.users WHERE email = 'admin@jpbarber.com';

    -- Eliminar de public.usuarios
    DELETE FROM public.usuarios WHERE email = 'admin@jpbarber.com';

    RAISE NOTICE '✅ Usuarios anteriores eliminados';
END $$;

-- ========================================
-- PASO 2: Crear usuario en auth.users usando la función de Supabase
-- ========================================
-- IMPORTANTE: Este paso debes hacerlo manualmente desde el Dashboard
-- Authentication > Users > Add user > Create new user
-- Email: admin@jpbarber.com
-- Password: admin123
-- Auto Confirm User: ✅ ACTIVAR

-- ========================================
-- PASO 3: Verificar y sincronizar
-- ========================================
DO $$
DECLARE
    admin_uuid UUID;
    user_exists BOOLEAN;
BEGIN
    -- Buscar el UUID del usuario admin
    SELECT id INTO admin_uuid
    FROM auth.users
    WHERE email = 'admin@jpbarber.com'
    LIMIT 1;

    user_exists := (admin_uuid IS NOT NULL);

    IF NOT user_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  ACCIÓN REQUERIDA ⚠️';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'El usuario NO existe en auth.users';
        RAISE NOTICE '';
        RAISE NOTICE 'DEBES crear el usuario manualmente:';
        RAISE NOTICE '';
        RAISE NOTICE '1. Ve a Authentication > Users';
        RAISE NOTICE '2. Click "Add user" > "Create new user"';
        RAISE NOTICE '3. Completa:';
        RAISE NOTICE '   - Email: admin@jpbarber.com';
        RAISE NOTICE '   - Password: admin123';
        RAISE NOTICE '   - Auto Confirm User: ✅ ACTIVAR';
        RAISE NOTICE '4. Click "Create user"';
        RAISE NOTICE '5. Ejecuta este script nuevamente';
        RAISE NOTICE '========================================';
    ELSE
        -- Usuario existe, sincronizar con public.usuarios
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

        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ CONFIGURACIÓN COMPLETA';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Usuario encontrado y sincronizado';
        RAISE NOTICE 'UUID: %', admin_uuid;
        RAISE NOTICE 'Email: admin@jpbarber.com';
        RAISE NOTICE 'Password: admin123';
        RAISE NOTICE 'Role: super_admin';
        RAISE NOTICE '';
        RAISE NOTICE '👉 Ahora puedes iniciar sesión en:';
        RAISE NOTICE 'http://localhost:4321/login-admin';
        RAISE NOTICE '========================================';
    END IF;
END $$;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
SELECT
    u.id,
    u.email,
    u.created_at,
    CASE
        WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '❌ NO Confirmado'
    END as estado,
    CASE
        WHEN uu.id IS NOT NULL THEN '✅ Existe'
        ELSE '❌ NO existe'
    END as en_public_usuarios
FROM auth.users u
LEFT JOIN public.usuarios uu ON u.id = uu.id
WHERE u.email = 'admin@jpbarber.com';
