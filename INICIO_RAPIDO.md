# ⚡ Inicio Rápido - JP Barber con Supabase

## 🎯 El Error que Tienes Ahora

```
POST https://vnmtrqkhvezfpdilmbyq.supabase.co/auth/v1/token?grant_type=password 401 (Unauthorized)
```

**Causa**: El usuario `admin@jpbarber.com` NO existe en Supabase Auth todavía.

**Solución**: Ejecutar 2 scripts SQL en Supabase.

---

## 🚀 Solución en 5 Pasos (10 minutos)

### Paso 1: Abrir Supabase Dashboard
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto: `jpbarber` (ID: vnmtrqkhvezfpdilmbyq)
3. Click en **SQL Editor** (menú lateral izquierdo)

### Paso 2: Habilitar Encriptación
1. Click en **New query**
2. Pega este comando:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
3. Click en **Run** (▶️)

### Paso 3: Crear Tablas
1. **Abre** el archivo `supabase_setup.sql`
2. **Copia TODO** el contenido (Ctrl + A, Ctrl + C)
3. En Supabase, click en **New query**
4. **Pega** el contenido
5. Click en **Run** (▶️)
6. Espera ~10 segundos

### Paso 4: Crear Usuario Administrador
1. **Abre** el archivo `supabase_create_admin_user.sql`
2. **Copia TODO** el contenido
3. En Supabase, click en **New query**
4. **Pega** el contenido
5. Click en **Run** (▶️)

### Paso 5: Probar el Login
1. En tu navegador, ve a: http://localhost:4321/login-admin
2. Ingresa:
   ```
   Email: admin@jpbarber.com
   Password: admin123
   ```
3. Click en **Iniciar Sesión**
4. ✅ Deberías ser redirigido a `/panel-admin`

---

## ✅ Verificación Rápida

### En Supabase Dashboard

**Verificar Tablas** (Table Editor):
- ✅ usuarios
- ✅ barberos (3 registros)
- ✅ clientes
- ✅ servicios (6 registros)
- ✅ citas
- ✅ daily_turns

**Verificar Usuario** (Authentication > Users):
- ✅ admin@jpbarber.com
- ✅ Estado: Confirmed (verde)

---

## 🔍 Si Algo Sale Mal

### Error: "function gen_salt does not exist"
**Solución**: Ejecuta el Paso 2 (habilitar pgcrypto)

### Error: "relation usuarios does not exist"
**Solución**: Ejecuta el Paso 3 (crear tablas)

### Error 401 al hacer login
**Solución**: Ejecuta el Paso 4 (crear usuario admin)

### Sigue sin funcionar
Lee el archivo completo: **[CREAR_USUARIO_ADMIN.md](./CREAR_USUARIO_ADMIN.md)**

---

## 📂 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `supabase_setup.sql` | Script principal (crea tablas) |
| `supabase_create_admin_user.sql` | Crea el usuario admin |
| `CREAR_USUARIO_ADMIN.md` | Guía detallada del usuario admin |
| `INSTRUCCIONES_SETUP_SUPABASE.md` | Guía completa paso a paso |
| `README_SUPABASE.md` | Información del proyecto |

---

## 🎯 Resumen Ultra-Rápido

```sql
-- 1. Habilitar encriptación
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ejecutar supabase_setup.sql (crear tablas)

-- 3. Ejecutar supabase_create_admin_user.sql (crear admin)

-- 4. Probar login en http://localhost:4321/login-admin
```

**Credenciales:**
```
Email: admin@jpbarber.com
Password: admin123
```

---

¡Eso es todo! Después de estos pasos, tu aplicación estará completamente funcional con Supabase. 🎉
