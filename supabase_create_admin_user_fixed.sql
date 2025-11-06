-- ========================================
-- CREAR USUARIO ADMINISTRADOR - VERSIÓN CORREGIDA
-- ========================================
-- Este script crea el usuario administrador de forma segura

-- ========================================
-- PASO 1: Verificar si el usuario ya existe
-- ========================================
DO $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Buscar si ya existe el usuario
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = 'admin@jpbarber.com'
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
        RAISE NOTICE 'Usuario admin@jpbarber.com ya existe con UUID: %', existing_user_id;

        -- Actualizar en public.usuarios si existe
        INSERT INTO public.usuarios (id, email, nombre, password, role, activo)
        VALUES (
            existing_user_id,
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
            updated_at = NOW();

        RAISE NOTICE '✅ Usuario actualizado en public.usuarios';
    ELSE
        RAISE NOTICE 'Usuario no existe, creando nuevo...';
    END IF;
END $$;

-- ========================================
-- PASO 2: Crear usuario usando auth.users (si no existe)
-- ========================================
DO $$
DECLARE
    new_user_id UUID;
    identity_id UUID;
BEGIN
    -- Verificar nuevamente si existe
    SELECT id INTO new_user_id
    FROM auth.users
    WHERE email = 'admin@jpbarber.com'
    LIMIT 1;

    -- Si no existe, crear nuevo usuario
    IF new_user_id IS NULL THEN
        new_user_id := gen_random_uuid();
        identity_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            'admin@jpbarber.com',
            crypt('admin123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"role":"admin"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );

        -- Crear también en identities con provider_id
        INSERT INTO auth.identities (
            id,
            user_id,
            provider_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            identity_id,
            new_user_id,
            new_user_id::text,  -- provider_id es el ID del usuario como string
            jsonb_build_object('sub', new_user_id::text, 'email', 'admin@jpbarber.com'),
            'email',
            NOW(),
            NOW(),
            NOW()
        );

        RAISE NOTICE '✅ Usuario creado en auth.users con UUID: %', new_user_id;

        -- Crear en public.usuarios
        INSERT INTO public.usuarios (id, email, nombre, password, role, activo)
        VALUES (
            new_user_id,
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
            updated_at = NOW();

        RAISE NOTICE '✅ Usuario creado en public.usuarios';
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'CREDENCIALES DE ACCESO';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Email: admin@jpbarber.com';
        RAISE NOTICE 'Password: admin123';
        RAISE NOTICE 'UUID: %', new_user_id;
        RAISE NOTICE '========================================';
    END IF;
END $$;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
DO $$
DECLARE
    auth_count INTEGER;
    usuarios_count INTEGER;
    identities_count INTEGER;
    user_confirmed BOOLEAN;
BEGIN
    -- Contar en auth.users
    SELECT COUNT(*) INTO auth_count
    FROM auth.users
    WHERE email = 'admin@jpbarber.com';

    -- Contar en public.usuarios
    SELECT COUNT(*) INTO usuarios_count
    FROM public.usuarios
    WHERE email = 'admin@jpbarber.com';

    -- Contar en auth.identities
    SELECT COUNT(*) INTO identities_count
    FROM auth.identities i
    JOIN auth.users u ON i.user_id = u.id
    WHERE u.email = 'admin@jpbarber.com';

    -- Verificar si está confirmado
    SELECT (email_confirmed_at IS NOT NULL) INTO user_confirmed
    FROM auth.users
    WHERE email = 'admin@jpbarber.com'
    LIMIT 1;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuarios en auth.users: %', auth_count;
    RAISE NOTICE 'Usuarios en public.usuarios: %', usuarios_count;
    RAISE NOTICE 'Identidades en auth.identities: %', identities_count;
    RAISE NOTICE 'Email confirmado: %', CASE WHEN user_confirmed THEN 'SÍ' ELSE 'NO' END;
    RAISE NOTICE '';

    IF auth_count > 0 AND usuarios_count > 0 AND identities_count > 0 AND user_confirmed THEN
        RAISE NOTICE '✅ ¡Usuario administrador configurado correctamente!';
        RAISE NOTICE '';
        RAISE NOTICE 'Puedes iniciar sesión en:';
        RAISE NOTICE 'http://localhost:4321/login-admin';
        RAISE NOTICE '';
        RAISE NOTICE 'Con las credenciales:';
        RAISE NOTICE 'Email: admin@jpbarber.com';
        RAISE NOTICE 'Password: admin123';
    ELSE
        RAISE WARNING '⚠️ Hay un problema con la configuración del usuario';
        IF auth_count = 0 THEN
            RAISE WARNING '- Usuario NO existe en auth.users';
        END IF;
        IF usuarios_count = 0 THEN
            RAISE WARNING '- Usuario NO existe en public.usuarios';
        END IF;
        IF identities_count = 0 THEN
            RAISE WARNING '- Usuario NO tiene identidad en auth.identities';
        END IF;
        IF NOT user_confirmed THEN
            RAISE WARNING '- Email NO está confirmado';
        END IF;
    END IF;
    RAISE NOTICE '========================================';
END $$;
