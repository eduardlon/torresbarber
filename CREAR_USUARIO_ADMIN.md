# 🔐 Crear Usuario Administrador en Supabase

## Problema Actual

El error `401 (Unauthorized)` ocurre porque el usuario `admin@jpbarber.com` no existe en **Supabase Auth** todavía.

En Supabase, los usuarios deben existir en **DOS lugares**:
1. ✅ `auth.users` - Sistema de autenticación de Supabase
2. ✅ `public.usuarios` - Tu tabla personalizada de usuarios

---

## 🚀 Solución Rápida

### Opción A: Usar el Script SQL (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto: `jpbarber`

2. **Abre SQL Editor**
   - En el menú lateral: **SQL Editor**
   - Click en **New query**

3. **Copia y pega el script**
   - Abre el archivo: `supabase_create_admin_user.sql`
   - Selecciona TODO el contenido (Ctrl + A)
   - Copia (Ctrl + C)
   - Pega en el SQL Editor

4. **Ejecuta el script**
   - Click en **Run** (▶️)
   - Espera el mensaje de confirmación

5. **Verifica la creación**
   - Deberías ver mensajes en verde indicando que se creó correctamente
   - Verifica en: **Authentication** > **Users** (debería aparecer admin@jpbarber.com)

---

### Opción B: Crear Usuario desde el Dashboard (Alternativa)

Si el script SQL no funciona, puedes crear el usuario manualmente:

#### Paso 1: Crear en Authentication

1. Ve a **Authentication** > **Users**
2. Click en **Add user** > **Create new user**
3. Llena el formulario:
   ```
   Email: admin@jpbarber.com
   Password: admin123
   Auto Confirm User: ✅ (activar)
   ```
4. Click en **Create user**

#### Paso 2: Obtener el UUID del usuario

1. En la lista de usuarios, busca `admin@jpbarber.com`
2. Click en el usuario
3. Copia el **UUID** (algo como: `a1b2c3d4-e5f6-7890-1234-567890abcdef`)

#### Paso 3: Crear en la tabla usuarios

1. Ve a **SQL Editor**
2. Ejecuta este script (reemplaza `[UUID_AQUI]` con el UUID que copiaste):

```sql
INSERT INTO public.usuarios (id, email, nombre, password, role, activo)
VALUES (
    '[UUID_AQUI]',  -- Reemplazar con el UUID del paso 2
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
```

---

## ✅ Verificación

Después de crear el usuario, verifica:

### 1. En Authentication
- Ve a **Authentication** > **Users**
- Deberías ver: `admin@jpbarber.com`
- Estado: **Confirmed** (verde)

### 2. En Table Editor
- Ve a **Table Editor** > **usuarios**
- Deberías ver un registro con:
  - Email: `admin@jpbarber.com`
  - Role: `super_admin`
  - Activo: `true`

### 3. Probar Login
1. Ve a: http://localhost:4321/login-admin
2. Ingresa:
   - Email: `admin@jpbarber.com`
   - Password: `admin123`
3. Click en **Iniciar Sesión**
4. Deberías ser redirigido a `/panel-admin`

---

## 🔍 Solución de Problemas

### Error: "function gen_salt does not exist"

**Solución**: Instalar la extensión pgcrypto

```sql
-- Ejecutar en SQL Editor
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Error: "permission denied for table auth.users"

**Causa**: No tienes permisos para modificar `auth.users` directamente.

**Solución**: Usa la Opción B (crear desde el Dashboard)

### El login sigue dando 401

**Verificaciones**:

1. ✅ ¿El usuario existe en **Authentication** > **Users**?
2. ✅ ¿El usuario está **Confirmed** (confirmado)?
3. ✅ ¿El email es exactamente `admin@jpbarber.com`?
4. ✅ ¿La contraseña es exactamente `admin123`?
5. ✅ ¿Las variables de entorno están correctas en `.env`?

Para verificar las variables:
```bash
# En la consola del navegador (F12):
console.log(import.meta.env.PUBLIC_SUPABASE_URL);
console.log(import.meta.env.PUBLIC_SUPABASE_ANON_KEY ? 'Key exists' : 'Key missing');
```

### Error: "Invalid login credentials"

**Causa**: El password en la base de datos no coincide.

**Solución**: Resetear el password desde el Dashboard:

1. Ve a **Authentication** > **Users**
2. Click en el usuario `admin@jpbarber.com`
3. Click en **Reset password**
4. Ingresa la nueva contraseña: `admin123`
5. Click en **Update user**

---

## 📝 Notas Importantes

1. **Dos sistemas de usuarios**:
   - `auth.users` = Sistema de autenticación de Supabase
   - `public.usuarios` = Tu tabla con información adicional (rol, nombre, etc.)

2. **IDs deben coincidir**:
   - El `id` en `public.usuarios` debe ser el mismo `id` que en `auth.users`

3. **Password encriptado**:
   - En `auth.users`: Supabase lo encripta automáticamente
   - En `public.usuarios`: Usamos `crypt()` con bcrypt

4. **Email confirmado**:
   - El usuario debe tener `email_confirmed_at` con fecha
   - O marcar "Auto Confirm User" al crear

---

## 🎯 Resumen Rápido

**Para crear el usuario administrador:**

```sql
-- 1. Habilitar extensión (solo una vez)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ejecutar el script
-- (Copiar y pegar supabase_create_admin_user.sql)

-- 3. Verificar
SELECT * FROM auth.users WHERE email = 'admin@jpbarber.com';
SELECT * FROM public.usuarios WHERE email = 'admin@jpbarber.com';
```

**Credenciales:**
```
Email: admin@jpbarber.com
Password: admin123
```

**Luego probar en:**
http://localhost:4321/login-admin

---

## 🆘 ¿Sigue sin funcionar?

Si después de seguir todos los pasos aún tienes problemas:

1. **Verifica los logs de Supabase**:
   - Dashboard > Logs > Auth Logs
   - Busca errores relacionados con `admin@jpbarber.com`

2. **Verifica la consola del navegador**:
   - Presiona F12
   - Ve a la pestaña Console
   - Busca errores en rojo

3. **Comparte el error**:
   - Copia el mensaje de error completo
   - Revisa la sección de Supabase Auth en la documentación

---

¡Después de crear el usuario, deberías poder iniciar sesión correctamente! 🎉
