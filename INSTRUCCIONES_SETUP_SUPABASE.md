# 🚀 Instrucciones para Configurar Supabase - JP Barber

## Objetivo
Este documento te guiará paso a paso para configurar la base de datos de Supabase con todas las tablas necesarias y crear un usuario administrador.

---

## ✅ Prerequisitos

Antes de comenzar, asegúrate de tener:
- ✅ Cuenta activa en [Supabase](https://supabase.com)
- ✅ Proyecto creado en Supabase (ya tienes: `vnmtrqkhvezfpdilmbyq`)
- ✅ Credenciales del proyecto (ya están en el archivo `.env`)

---

## 📋 Paso 1: Acceder al SQL Editor de Supabase

1. **Abre tu navegador** y ve a: https://supabase.com/dashboard

2. **Inicia sesión** con tu cuenta

3. **Selecciona el proyecto** `jpbarber` (ID: `vnmtrqkhvezfpdilmbyq`)

4. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
   - Icono: 📝 o `</>`
   - Ubicación: Debajo de "Table Editor"

---

## 📝 Paso 2: Habilitar Extensión pgcrypto

Antes de ejecutar cualquier script, necesitas habilitar la extensión de encriptación:

1. En el **SQL Editor**, ejecuta:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

2. Click en **Run**
3. Deberías ver un mensaje de éxito

⚠️ **Este paso es obligatorio** para que funcione la encriptación de passwords.

---

## 📝 Paso 3: Ejecutar el Script de Configuración

### Opción A: Copiar y Pegar (Recomendado)

1. **Abre el archivo** `supabase_setup.sql` ubicado en:
   ```
   D:\PROGRAMACION\astro\jpbarber\jpbarber\supabase_setup.sql
   ```

2. **Selecciona TODO el contenido** del archivo (Ctrl + A)

3. **Copia** el contenido (Ctrl + C)

4. En el **SQL Editor de Supabase**:
   - Haz clic en **"New query"** (botón superior derecho)
   - **Pega** el contenido completo (Ctrl + V)

5. **Ejecuta el script**:
   - Haz clic en el botón **"Run"** (▶️) en la esquina inferior derecha
   - O presiona **Ctrl + Enter**

6. **Espera** aproximadamente 5-10 segundos

7. **Verifica el resultado**:
   - Deberías ver un mensaje de éxito con el resumen
   - Si hay errores, léelos cuidadosamente y revisa la sección de "Solución de Problemas"

### Opción B: Usar la CLI de Supabase (Avanzado)

```bash
# Navegar al directorio del proyecto
cd D:\PROGRAMACION\astro\jpbarber\jpbarber

# Ejecutar el script
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.vnmtrqkhvezfpdilmbyq.supabase.co:5432/postgres" --file supabase_setup.sql
```

---

## 📝 Paso 4: Crear Usuario Administrador en Supabase Auth

**IMPORTANTE**: El script anterior crea las tablas pero NO crea el usuario en Supabase Auth.

Necesitas ejecutar un script adicional para crear el usuario administrador:

1. **Abre el archivo** `supabase_create_admin_user.sql`
2. **Copia todo el contenido**
3. **Pega en SQL Editor** (nueva query)
4. **Ejecuta** (Click en Run)

Para instrucciones detalladas, lee: **[CREAR_USUARIO_ADMIN.md](./CREAR_USUARIO_ADMIN.md)**

---

## ✅ Paso 5: Verificar las Tablas Creadas

1. En el menú lateral, haz clic en **"Table Editor"**

2. Deberías ver las siguientes tablas:
   - ✅ `usuarios` - Administradores del sistema
   - ✅ `barberos` - Empleados barberos
   - ✅ `clientes` - Clientes de la barbería
   - ✅ `servicios` - Catálogo de servicios
   - ✅ `citas` - Citas agendadas
   - ✅ `daily_turns` - Sistema de turnos/cola

3. **Haz clic en cada tabla** para verificar que tienen datos:
   - `usuarios` → Debería tener 1 registro (admin)
   - `barberos` → Debería tener 3 registros (Juan, Carlos, Miguel)
   - `servicios` → Debería tener 6 registros (cortes y servicios)
   - `clientes`, `citas`, `daily_turns` → Estarán vacías (normal)

---

## ✅ Paso 6: Verificar Usuario en Authentication

1. Ve a **Authentication** > **Users**
2. Deberías ver el usuario: `admin@jpbarber.com`
3. Estado: **Confirmed** (verde)

Si NO aparece, revisa el archivo: **[CREAR_USUARIO_ADMIN.md](./CREAR_USUARIO_ADMIN.md)**

---

## 🔐 Paso 7: Credenciales del Administrador

El script ha creado un usuario administrador con las siguientes credenciales:

```
Email: admin@jpbarber.com
Password: admin123
Rol: super_admin
```

### ⚠️ IMPORTANTE - Seguridad

**DEBES cambiar esta contraseña antes de ir a producción:**

1. Ve a **SQL Editor**
2. Ejecuta este comando (reemplaza `nueva_password_segura`):

```sql
UPDATE public.usuarios
SET password = crypt('nueva_password_segura', gen_salt('bf'))
WHERE email = 'admin@jpbarber.com';
```

---

## 🧪 Paso 8: Probar la Conexión desde el Frontend

### 5.1 Verificar Variables de Entorno

Asegúrate de que el archivo `.env` tenga:

```env
PUBLIC_SUPABASE_URL=https://vnmtrqkhvezfpdilmbyq.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5.2 Iniciar el Proyecto

```bash
cd D:\PROGRAMACION\astro\jpbarber\jpbarber
npm run dev
```

### 5.3 Probar el Login Admin

1. Abre el navegador en: `http://localhost:4321/login-admin`
2. Ingresa las credenciales:
   - Email: `admin@jpbarber.com`
   - Password: `admin123`
3. Deberías poder iniciar sesión correctamente

---

## 🔍 Verificación de RLS (Row Level Security)

El script ha configurado Row Level Security con políticas permisivas para desarrollo.

### Verificar Políticas

1. Ve a **Authentication** > **Policies**
2. Verifica que cada tabla tenga políticas habilitadas
3. Las políticas actuales permiten operaciones para desarrollo

### ⚠️ Para Producción

Deberás ajustar las políticas RLS para mayor seguridad:

```sql
-- Ejemplo: Clientes solo ven sus propios datos
DROP POLICY IF EXISTS "Clientes pueden ver sus propios datos" ON public.clientes;
CREATE POLICY "Clientes pueden ver sus propios datos"
  ON public.clientes FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 📊 Datos de Ejemplo Incluidos

El script incluye datos de prueba:

### Barberos (3)
1. **Juan Pérez**
   - Email: juan.perez@jpbarber.com
   - Especialidad: Cortes clásicos y modernos
   - Experiencia: 5 años

2. **Carlos Rodríguez**
   - Email: carlos.rodriguez@jpbarber.com
   - Especialidad: Barbería y diseño de barba
   - Experiencia: 8 años

3. **Miguel Sánchez**
   - Email: miguel.sanchez@jpbarber.com
   - Especialidad: Cortes fade y afeitado
   - Experiencia: 3 años

**Password para todos:** `admin123`

### Servicios (6)
1. Corte de Cabello Clásico - $25,000 - 30 min
2. Corte + Barba - $35,000 - 45 min
3. Fade Degradado - $30,000 - 40 min
4. Diseño de Barba - $15,000 - 20 min
5. Afeitado Clásico - $20,000 - 25 min
6. Tratamiento Capilar - $40,000 - 30 min

---

## 🔧 Solución de Problemas

### Error: "relation already exists"

**Causa:** Las tablas ya existen en la base de datos.

**Solución:** El script usa `CREATE TABLE IF NOT EXISTS`, así que puedes ejecutarlo múltiples veces sin problemas. Si aún hay error, elimina las tablas existentes primero:

```sql
DROP TABLE IF EXISTS public.daily_turns CASCADE;
DROP TABLE IF EXISTS public.citas CASCADE;
DROP TABLE IF EXISTS public.servicios CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.barberos CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
```

Luego vuelve a ejecutar el script completo.

### Error: "permission denied"

**Causa:** No tienes permisos suficientes.

**Solución:** Asegúrate de estar usando la conexión correcta en Supabase con rol `postgres`.

### Error: "duplicate key value violates unique constraint"

**Causa:** Ya existe un registro con el mismo email.

**Solución:** Normal si ejecutas el script múltiples veces. El script usa `ON CONFLICT DO NOTHING` para evitar duplicados.

### No aparecen las tablas en Table Editor

**Causa:** Posible error en la ejecución del script.

**Solución:**
1. Ve a **SQL Editor** > **History**
2. Revisa los queries ejecutados
3. Busca mensajes de error en rojo
4. Si encuentras errores, cópialos y ejecútalos uno por uno

---

## 📚 Próximos Pasos

Después de completar esta configuración:

1. ✅ **Cambiar passwords** de admin y barberos
2. ✅ **Probar el login** desde el frontend
3. ✅ **Crear citas de prueba** para verificar funcionalidad
4. ✅ **Configurar Storage** para imágenes (opcional)
5. ✅ **Desplegar Edge Functions** si es necesario
6. ✅ **Ajustar políticas RLS** para producción

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs** en SQL Editor > History
2. **Consulta la documentación** de Supabase: https://supabase.com/docs
3. **Revisa el archivo** `CONFIGURACION_SUPABASE.md` para más detalles

---

## ✨ Resumen de lo Creado

- ✅ 6 tablas principales con relaciones
- ✅ Índices optimizados para consultas rápidas
- ✅ Triggers para actualizar `updated_at` automáticamente
- ✅ Row Level Security habilitado
- ✅ Políticas de acceso configuradas
- ✅ 1 usuario administrador
- ✅ 3 barberos de ejemplo
- ✅ 6 servicios de ejemplo
- ✅ Función auxiliar para números de turno

**¡Tu base de datos Supabase está lista para usar! 🎉**
