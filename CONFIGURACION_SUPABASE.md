# Configuración de Supabase en JP Barber

## Estado Actual de la Integración

El proyecto **JP Barber** tiene integración con **Supabase** funcionando correctamente. El sistema está configurado para usar Supabase como backend principal con las siguientes características:

## Archivos de Configuración

### 1. `src/lib/supabase.ts`
Cliente de Supabase configurado con:
- Variables de entorno para URL y clave anónima
- Configuración de autenticación con persistencia de sesión
- Validación de variables de entorno
- Funciones helper para verificar configuración

```typescript
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
```

### 2. Variables de Entorno (`.env`)
```bash
PUBLIC_SUPABASE_URL=https://vnmtrqkhvezfpdilmbyq.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Servicios Implementados

### `src/services/supabaseService.ts`
Servicio completo que implementa:

#### Autenticación
- `loginCliente()` - Login de clientes con Supabase Auth
- `loginBarbero()` - Login de barberos usando Edge Functions
- `loginAdmin()` - Login de administradores con validación de roles
- `logout()` - Cierre de sesión

#### Gestión de Barberos
- `getBarberos()` - Obtener lista de barberos activos
- `getBarbero(id)` - Obtener barbero específico

#### Gestión de Servicios
- `getServicios()` - Obtener servicios activos
- `getServicio(id)` - Obtener servicio específico

#### Gestión de Citas
- `getCitas(filters)` - Obtener citas con filtros (barbero, fecha)
- `getCita(id)` - Obtener cita específica
- `crearCita(data)` - Crear nueva cita
- `actualizarCita(id, data)` - Actualizar cita
- `cancelarCita(id)` - Cancelar cita
- `agendarCita(data)` - Agendar cita para cliente autenticado

#### Gestión de Turnos
- `getColaPublica()` - Obtener cola de turnos del día
- `crearTurno(data)` - Crear nuevo turno

#### Panel de Cliente
- `getClientePanel(clienteId)` - Obtener datos del panel del cliente

#### Suscripciones en Tiempo Real
- `subscribeToAppointments(callback)` - Escuchar cambios en citas
- `subscribeToQueue(callback)` - Escuchar cambios en cola de turnos

### `src/services/apiService.ts`
Wrapper del servicio de Supabase que:
- Mantiene compatibilidad con la API anterior de Laravel
- Adapta los tipos de datos entre Supabase y la interfaz del frontend
- Convierte IDs de number a string para Supabase y viceversa

## Estructura de Tablas en Supabase

El proyecto espera las siguientes tablas:

### Tablas Principales
- `clientes` - Información de clientes
- `barberos` - Información de barberos
- `servicios` - Catálogo de servicios
- `citas` - Citas agendadas
- `daily_turns` - Cola de turnos diarios
- `usuarios` - Usuarios del sistema (para autenticación)

### Relaciones
- Las citas tienen relaciones con clientes, barberos y servicios
- Los turnos tienen relaciones con clientes (opcional), barberos y servicios

## Edge Functions

El proyecto utiliza Edge Functions de Supabase para:
- Autenticación de barberos: `https://vnmtrqkhvezfpdilmbyq.functions.supabase.co/auth-barbero`

## Configuración de Autenticación

### Persistencia de Sesión
- Habilitado: `persistSession: true`
- Refresh automático de tokens: `autoRefreshToken: true`
- Detección de sesión en URL: `detectSessionInUrl: true`
- Storage: `localStorage` (solo en navegador)

### Roles de Usuario
- **Cliente**: Acceso a través de la tabla `clientes`
- **Barbero**: Acceso a través de Edge Function personalizada
- **Admin**: Validación de rol en tabla `usuarios`

## Paquetes Instalados

```json
{
  "@supabase/auth-helpers-react": "^0.5.0",
  "@supabase/supabase-js": "^2.79.0"
}
```

## Cómo Usar Supabase en el Proyecto

### 1. Importar el Cliente
```typescript
import { supabase } from '@/lib/supabase';
```

### 2. Usar el Servicio
```typescript
import { supabaseService } from '@/services/supabaseService';

// Obtener barberos
const { data, error } = await supabaseService.getBarberos();

// Crear cita
const appointment = await supabaseService.crearCita({
  cliente_nombre: "Juan Pérez",
  barbero_id: "123",
  servicio_id: "456",
  fecha_hora: "2025-01-10T10:00:00"
});
```

### 3. Usar el API Service (Compatibilidad)
```typescript
import { apiService } from '@/services/apiService';

// Mantiene la interfaz anterior pero usa Supabase internamente
const barberos = await apiService.getBarberos();
```

## Migraciones Pendientes

Según el documento `GUIA_COMPLETA_MIGRACION_SUPABASE.md`, la migración completa a Supabase incluiría:

### Fase 1: Base de Datos ✅
- Tablas configuradas en Supabase

### Fase 2: Autenticación ✅
- Sistema de autenticación implementado

### Fase 3: RLS Policies
- Configurar Row Level Security para cada tabla

### Fase 4: Edge Functions
- `auth-barbero` - ✅ Implementado
- Otras funciones pendientes según necesidad

### Fase 5: Storage
- Configurar buckets para imágenes
- Políticas de acceso a archivos

### Fase 6: Realtime
- ✅ Subscripciones básicas implementadas
- Expandir según necesidad

## Estado de la Configuración

✅ **FUNCIONANDO**
- Cliente de Supabase configurado
- Variables de entorno establecidas
- Servicio de autenticación completo
- CRUD de barberos, servicios, citas y turnos
- Suscripciones en tiempo real básicas
- Wrapper de compatibilidad con API anterior

⚠️ **PENDIENTE/OPCIONAL**
- Row Level Security (RLS) policies completas
- Edge Functions adicionales
- Supabase Storage para imágenes
- Migración de datos desde Laravel (si aplica)

## Notas Importantes

1. **Seguridad**: La clave anónima (`ANON_KEY`) está diseñada para ser pública. Las políticas RLS protegen los datos.

2. **Edge Functions**: Requieren deployment separado a Supabase. La función `auth-barbero` debe estar desplegada.

3. **Tipos**: El proyecto usa TypeScript con interfaces definidas en `supabaseService.ts` para type-safety.

4. **Testing**: Verificar que el proyecto Supabase tenga:
   - Tablas creadas según el esquema
   - RLS habilitado pero políticas configuradas para desarrollo
   - Edge Functions desplegadas

## Verificación Rápida

Para verificar que Supabase está configurado correctamente:

```typescript
import { getSupabaseConfig } from '@/lib/supabase';

console.log(getSupabaseConfig());
// { url: "https://...", isConfigured: true, hasAnonKey: true }
```

## Soporte y Referencias

- Documentación oficial: https://supabase.com/docs
- Dashboard del proyecto: https://supabase.com/dashboard/project/vnmtrqkhvezfpdilmbyq
- Guía de migración completa: `GUIA_COMPLETA_MIGRACION_SUPABASE.md`
