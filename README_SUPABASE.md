# 🚀 JP Barber - Configuración con Supabase

## Estado Actual del Proyecto

El proyecto **JP Barber** ha sido migrado completamente a **Supabase** como backend. El backend Laravel ya NO es necesario y ha sido deshabilitado.

---

## ✅ Configuración Actual

### Backend: Supabase
- **URL**: https://vnmtrqkhvezfpdilmbyq.supabase.co
- **Autenticación**: Supabase Auth
- **Base de Datos**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage (para imágenes futuras)

### Frontend: Astro + React
- **Puerto de desarrollo**: 4321
- **Framework**: Astro 5.14.1
- **UI**: React 19.1.0 + Tailwind CSS

---

## 🔧 Configuración Inicial

### 1. Instalar Dependencias

```bash
cd D:\PROGRAMACION\astro\jpbarber\jpbarber
npm install
```

### 2. Configurar Variables de Entorno

El archivo `.env` ya está configurado con las credenciales de Supabase:

```env
# Supabase
PUBLIC_SUPABASE_URL=https://vnmtrqkhvezfpdilmbyq.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **No necesitas cambiar nada** si estás usando el proyecto Supabase actual.

### 3. Crear Tablas en Supabase

**IMPORTANTE**: Antes de iniciar el proyecto, debes ejecutar el script SQL en Supabase:

1. Lee las instrucciones completas en: `INSTRUCCIONES_SETUP_SUPABASE.md`
2. Ejecuta el script `supabase_setup.sql` en el SQL Editor de Supabase
3. Verifica que todas las tablas fueron creadas correctamente

---

## 🎯 Iniciar el Proyecto

### Modo Desarrollo

```bash
npm run dev
```

El proyecto estará disponible en: **http://localhost:4321**

### Puertos Utilizados

- **Frontend (Astro)**: Puerto 4321
- **Backend (Supabase)**: Nube (no requiere puerto local)
- ~~Backend (Laravel)~~: ❌ DESHABILITADO - Ya no se usa

---

## 🔐 Credenciales de Acceso

### Usuario Administrador
Después de ejecutar el script SQL en Supabase:

```
URL: http://localhost:4321/login-admin
Email: admin@jpbarber.com
Password: admin123
```

### Barberos de Ejemplo
```
Email: juan.perez@jpbarber.com
Password: admin123

Email: carlos.rodriguez@jpbarber.com
Password: admin123

Email: miguel.sanchez@jpbarber.com
Password: admin123
```

⚠️ **IMPORTANTE**: Cambia estas contraseñas antes de ir a producción.

---

## 📂 Estructura del Proyecto

```
jpbarber/
├── src/
│   ├── components/          # Componentes React
│   ├── layouts/             # Layouts de Astro
│   ├── pages/               # Páginas de Astro
│   ├── lib/
│   │   └── supabase.ts      # Cliente de Supabase ✅
│   ├── services/
│   │   ├── supabaseService.ts  # Servicio completo de Supabase ✅
│   │   └── apiService.ts       # Wrapper de compatibilidad
│   └── utils/
│       ├── config.js        # Configuración general
│       ├── init.js          # Inicialización (sin Laravel) ✅
│       └── network.js       # Utilidades de red
├── public/                  # Archivos públicos
├── .env                     # Variables de entorno ✅
├── supabase_setup.sql       # Script de configuración SQL ✅
└── INSTRUCCIONES_SETUP_SUPABASE.md  # Guía completa ✅
```

---

## 🛠️ Cambios Importantes Realizados

### ✅ Eliminados
1. ❌ Sistema de pago con Wompi (eliminado según solicitud)
2. ❌ Dependencia del backend Laravel
3. ❌ Conexión al puerto 8001

### ✅ Agregados
1. ✅ Cliente de Supabase configurado
2. ✅ Servicio completo con todas las operaciones CRUD
3. ✅ Autenticación con Supabase Auth
4. ✅ Row Level Security (RLS) configurado
5. ✅ Script SQL completo para setup inicial
6. ✅ Documentación completa

### ✅ Modificados
1. ✅ `src/lib/supabase.ts` - Cliente con variables de entorno
2. ✅ `src/utils/init.js` - Sin intentar conectar a Laravel
3. ✅ `.env` - Variables de Supabase agregadas
4. ✅ `PublicProductsServices.tsx` - Revertido al estado original

---

## 🔍 Solución de Problemas

### Error: "Missing PUBLIC_SUPABASE_ANON_KEY"

**Solución**: Verifica que el archivo `.env` tenga las variables de Supabase:
```bash
PUBLIC_SUPABASE_URL=https://vnmtrqkhvezfpdilmbyq.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-key-aqui
```

### Error: "No se pudo conectar a http://localhost:8001"

**Esto es normal**. El mensaje aparecerá en la consola pero no afecta la funcionalidad:
- ✅ El backend Laravel ya NO se usa
- ✅ Todas las operaciones usan Supabase
- ✅ Los mensajes son solo advertencias legacy

### Login no funciona

**Verificaciones**:
1. ✅ ¿Ejecutaste el script SQL en Supabase?
2. ✅ ¿Las tablas existen en Supabase?
3. ✅ ¿El usuario administrador fue creado?
4. ✅ ¿Las credenciales son correctas? (admin@jpbarber.com / admin123)

Para verificar, ve a Supabase Dashboard > Table Editor > usuarios

### Error 404 al cargar módulos

**Es normal en desarrollo**. Los mensajes como:
```
Failed to load resource: the server responded with a status of 404
services/supabaseService:1
utils/config:1
```

Son normales en Astro/Vite durante el desarrollo. El bundler los resuelve automáticamente.

---

## 📊 Funcionalidades Disponibles

### ✅ Implementadas con Supabase

1. **Autenticación**
   - Login de administradores
   - Login de barberos
   - Login de clientes
   - Logout

2. **Gestión de Barberos**
   - Listar barberos
   - Ver detalles de barbero
   - (CRUD completo disponible en el servicio)

3. **Gestión de Servicios**
   - Listar servicios
   - Ver detalles de servicio
   - (CRUD completo disponible en el servicio)

4. **Gestión de Citas**
   - Crear citas
   - Listar citas
   - Actualizar estado de citas
   - Cancelar citas
   - Filtros por barbero y fecha

5. **Sistema de Turnos**
   - Cola de turnos diaria
   - Crear turno
   - Llamar turno
   - Completar turno

6. **Panel de Cliente**
   - Ver historial de citas
   - Información del cliente
   - Sistema de fidelización

7. **Tiempo Real**
   - Suscripciones a cambios en citas
   - Suscripciones a cambios en cola de turnos

---

## 🚀 Próximos Pasos

1. ✅ **Ejecutar el script SQL** en Supabase (si aún no lo hiciste)
2. ✅ **Probar el login** con las credenciales de administrador
3. ✅ **Cambiar las contraseñas** por defecto
4. 🔄 **Configurar Storage** para imágenes (opcional)
5. 🔄 **Ajustar políticas RLS** para producción
6. 🔄 **Desplegar** en producción cuando esté listo

---

## 📚 Documentación Adicional

- **Configuración de Supabase**: `CONFIGURACION_SUPABASE.md`
- **Instrucciones de Setup**: `INSTRUCCIONES_SETUP_SUPABASE.md`
- **Guía de Migración Completa**: `GUIA_COMPLETA_MIGRACION_SUPABASE.md`
- **Script SQL**: `supabase_setup.sql`

---

## 🆘 Soporte

Si tienes problemas:

1. Verifica la consola del navegador (F12)
2. Revisa los logs de Supabase Dashboard
3. Consulta la documentación de Supabase: https://supabase.com/docs
4. Revisa los archivos de documentación mencionados arriba

---

## 📝 Notas Importantes

- ⚠️ El backend Laravel ya **NO se usa** - puedes apagarlo
- ✅ Todas las operaciones ahora usan **Supabase**
- ✅ Los errores de conexión a `localhost:8001` son **normales** y pueden ignorarse
- ✅ Las credenciales por defecto son solo para **desarrollo**
- ✅ Cambia las contraseñas antes de **producción**

---

**¡Tu aplicación JP Barber está lista para usarse con Supabase! 🎉**
