-- ========================================
-- CREAR USUARIO ADMINISTRADOR EN SUPABASE AUTH
-- ========================================
-- Este script crea el usuario administrador tanto en auth.users como en public.usuarios

-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- con privilegios de servicio (service_role)

-- ========================================
-- PASO 1: Crear usuario en auth.users
-- ========================================

-- Insertar usuario en la tabla auth.users (sistema de autenticación de Supabase)
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@jpbarber.com',
    crypt('admin123', gen_salt('bf')), -- Password: admin123
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
)
ON CONFLICT (email) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = NOW();

-- ========================================
-- PASO 2: Crear usuario en public.usuarios
-- ========================================

-- Obtener el ID del usuario que acabamos de crear
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Obtener el UUID del usuario admin
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = 'admin@jpbarber.com'
    LIMIT 1;

    -- Insertar en la tabla usuarios si existe el UUID
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.usuarios (id, email, nombre, password, role, activo)
        VALUES (
            user_uuid,
            'admin@jpbarber.com',
            'Administrador JP Barber',
            crypt('admin123', gen_salt('bf')),
            'super_admin',
            true
        )
        ON CONFLICT (email) DO UPDATE SET
            id = EXCLUDED.id,
            password = EXCLUDED.password,
            updated_at = NOW();

        RAISE NOTICE 'Usuario administrador creado exitosamente';
        RAISE NOTICE 'Email: admin@jpbarber.com';
        RAISE NOTICE 'Password: admin123';
        RAISE NOTICE 'UUID: %', user_uuid;
    ELSE
        RAISE EXCEPTION 'No se pudo crear el usuario en auth.users';
    END IF;
END $$;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar que el usuario fue creado correctamente
DO $$
DECLARE
    auth_count INTEGER;
    usuarios_count INTEGER;
BEGIN
    -- Contar en auth.users
    SELECT COUNT(*) INTO auth_count
    FROM auth.users
    WHERE email = 'admin@jpbarber.com';

    -- Contar en public.usuarios
    SELECT COUNT(*) INTO usuarios_count
    FROM public.usuarios
    WHERE email = 'admin@jpbarber.com';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN DE CREACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuarios en auth.users: %', auth_count;
    RAISE NOTICE 'Usuarios en public.usuarios: %', usuarios_count;

    IF auth_count > 0 AND usuarios_count > 0 THEN
        RAISE NOTICE '✅ Usuario administrador creado correctamente';
    ELSE
        RAISE WARNING '⚠️ Verificar la creación del usuario';
    END IF;
    RAISE NOTICE '========================================';
END $$;
