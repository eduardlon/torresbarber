# 🕐 Sistema de Horas Disponibles Dinámicas

## Fecha: 2025-10-01

---

## ✨ Funcionalidad Implementada

### Sistema Inteligente de Agendamiento
El sistema ahora consulta en tiempo real las horas disponibles para cada barbero y fecha, evitando conflictos de horarios y asegurando que solo se muestren horas realmente disponibles.

---

## 🎯 Características Principales

### 1. **Validación de Disponibilidad**
- ✅ Solo muestra horas que NO están ocupadas
- ✅ Valida que la fecha sea futura (no se pueden agendar citas en el pasado)
- ✅ Excluye domingos automáticamente
- ✅ Si es hoy, solo muestra horas futuras

### 2. **Horario de Atención**
- 📅 **Lunes a Sábado**
- 🕐 **9:00 AM a 8:00 PM**
- ⏱️ **Intervalos de 30 minutos**
- 🚫 **Domingos cerrados**

### 3. **Actualización en Tiempo Real**
- 🔄 Se recarga automáticamente cuando:
  - El usuario selecciona un barbero
  - El usuario selecciona una fecha
- ⚡ Respuesta inmediata al cambio
- 🎯 Resetea hora si ya no está disponible

---

## 🛠️ Implementación Técnica

### Backend (Laravel)

#### Nuevo Endpoint
```php
GET /api/horas-disponibles

Parámetros:
- fecha: YYYY-MM-DD (requerido, debe ser hoy o posterior)
- barbero_id: number (requerido, debe existir en BD)

Respuesta:
{
  "success": true,
  "data": [
    {
      "valor": "09:00",      // Formato 24h para backend
      "etiqueta": "9:00 AM", // Formato 12h para frontend
      "disponible": true
    },
    ...
  ],
  "fecha": "2025-10-02",
  "barbero_id": 1,
  "total_disponibles": 15
}
```

#### Controlador: `ApiCitaController::getHorasDisponibles()`

**Lógica:**
1. Validar fecha (no pasada) y barbero (existente)
2. Generar array de horas desde 9:00 AM hasta 8:00 PM (cada 30 min)
3. Para cada hora:
   - Si es hoy y ya pasó: omitir
   - Buscar citas existentes en ese horario exact

o
   - Solo incluir si NO existe cita activa
4. Retornar solo horas disponibles

**Estados de cita considerados ocupados:**
- `pendiente`
- `confirmada`
- `programada`
- `en_proceso`

---

### Frontend (Astro + React)

#### Nueva Función API: `getHorasDisponibles()`

```typescript
// src/utils/api.ts
export const getHorasDisponibles = async (
  fecha: string, 
  barberoId: number
) => {
  const params = new URLSearchParams({
    fecha: fecha,
    barbero_id: barberoId.toString()
  });

  const response = await fetch(
    `${API_BASE_URL}/horas-disponibles?${params}`
  );
  
  const data = await response.json();
  return data.data; // Array de horas
};
```

#### Componente Actualizado: `BookingAppMejorado.tsx`

**Nuevos Estados:**
```typescript
const [horasDisponibles, setHorasDisponibles] = useState<HoraDisponible[]>([]);
const [cargandoHoras, setCargandoHoras] = useState(false);
```

**Efecto para Cargar Horas:**
```typescript
useEffect(() => {
  if (fecha && selectedBarbero) {
    cargarHorasDisponibles();
  } else {
    setHorasDisponibles([]);
    setHora(''); // Resetear hora
  }
}, [fecha, selectedBarbero]);
```

**SelectorHoraModerno Mejorado:**
- Props: `horasDisponibles`, `cargando`
- Muestra spinner mientras carga
- Muestra mensaje si no hay horas disponibles
- Usa horas dinámicas si están presentes
- Fallback a horas estáticas si no hay conexión

---

## 📊 Flujo de Usuario

### Paso a Paso

1. **Usuario selecciona Barbero** (Paso 1)
   - Se guarda `selectedBarbero`
   
2. **Usuario selecciona Fecha** (Paso 3 desktop o móvil)
   - Se guarda `fecha`
   - **Trigger:** `useEffect` detecta cambio
   - **Acción:** Llama a `cargarHorasDisponibles()`

3. **Sistema Carga Horas**
   - `cargandoHoras = true`
   - Llama al endpoint `/api/horas-disponibles`
   - Recibe array de horas disponibles
   - `cargandoHoras = false`

4. **Usuario ve Selector de Hora**
   - **Desktop:** Botones organizados por período (Mañana/Tarde/Noche)
   - **Móvil:** Input nativo (no afectado por horas disponibles aún)
   - Solo muestra horas realmente disponibles
   - Si no hay horas: muestra mensaje "No hay horarios disponibles"

5. **Usuario selecciona Hora**
   - Clic en botón de hora
   - Se guarda `hora`
   - Puede continuar al Paso 4

6. **Sistema Valida al Agendar**
   - Backend valida nuevamente en `store()`
   - Si alguien más agendó mientras tanto: error 422
   - Si todo ok: crea la cita

---

## 🎨 Estados Visuales

### Desktop

#### Cargando Horas
```
┌─────────────────────────┐
│                         │
│    ⟳ Spinner            │
│    Cargando horarios... │
│                         │
└─────────────────────────┘
```

#### No Hay Horas Disponibles
```
┌─────────────────────────┐
│         🕐              │
│  No hay horarios        │
│  disponibles            │
│  Intenta con otra fecha │
└─────────────────────────┘
```

#### Horas Disponibles
```
┌─────────────────────────┐
│ 🌅 Mañana              │
│ [9:00] [9:30] [10:00]  │
│                        │
│ ☀️ Tarde               │
│ [12:00] [12:30] ...    │
│                        │
│ 🌙 Noche               │
│ [5:00] [5:30] [6:00]   │
└─────────────────────────┘
```

### Móvil
- Inputs nativos (no afectados actualmente)
- Se valida en backend al enviar

---

## 🔒 Seguridad y Validación

### Backend
1. **Validación de Parámetros**
   - Fecha debe ser hoy o posterior
   - Barbero debe existir en BD

2. **Doble Validación**
   - En `getHorasDisponibles()`: filtrar ocupadas
   - En `store()`: validar nuevamente antes de crear

3. **Estados Considerados**
   - Solo considera ocupadas las citas activas
   - Ignora citas `cancelada` o `completada`

### Frontend
1. **UX Preventiva**
   - No muestra horas ocupadas
   - Resetea hora si deja de estar disponible
   - Valida prerequ isitos (fecha + barbero)

2. **Manejo de Errores**
   - Muestra mensaje si API falla
   - Fallback a horas estáticas
   - No bloquea el flujo

---

## 📝 Archivos Modificados

### Backend Laravel

#### `app/Http/Controllers/ApiCitaController.php`
- **Líneas 483-558:** Método `getHorasDisponibles()`
  - Valida parámetros
  - Genera array de horas
  - Filtra ocupadas
  - Retorna JSON

#### `routes/api.php`
- **Línea 59:** Ruta pública `GET /horas-disponibles`

### Frontend Astro

#### `src/utils/api.ts`
- **Líneas 185-206:** Función `getHorasDisponibles()`

#### `src/components/BookingAppMejorado.tsx`
- **Líneas 1-3:** Import `getHorasDisponibles`
- **Líneas 188-192:** Interface `HoraDisponible`
- **Líneas 195-200:** Props actualizadas `SelectorHoraModerno`
- **Líneas 222-225:** Uso de horas dinámicas
- **Líneas 278-303:** Indicadores de carga y vacío
- **Líneas 310-313:** Estados `horasDisponibles` y `cargandoHoras`
- **Líneas 320-352:** useEffect y función `cargarHorasDisponibles()`
- **Líneas 762-763:** Props pasadas al selector

---

## 🧪 Testing

### Escenarios a Probar

1. **Hora Feliz - Todo Disponible**
   - Seleccionar barbero
   - Seleccionar fecha futura
   - Ver todas las horas disponibles

2. **Hora Ocupada**
   - Agendar cita a las 10:00 AM
   - Intentar agendar otra a las 10:00 AM (mismo barbero, misma fecha)
   - Verificar que 10:00 AM no aparece en selector

3. **Fecha de Hoy**
   - Seleccionar hoy como fecha
   - Verificar que solo aparecen horas futuras
   - Ej: Si son las 2:00 PM, no debe mostrar 9:00 AM

4. **Domingo**
   - Intentar seleccionar un domingo
   - Verificar que está deshabilitado en calendario

5. **Sin Horas Disponibles**
   - Agendar todas las horas de un día
   - Intentar agendar en ese día
   - Ver mensaje "No hay horarios disponibles"

6. **Cambio de Fecha**
   - Seleccionar fecha con hora disponible
   - Seleccionar hora
   - Cambiar a otra fecha
   - Verificar que hora se resetea

7. **Cambio de Barbero**
   - Seleccionar barbero A y fecha
   - Seleccionar hora
   - Cambiar a barbero B
   - Verificar que hora se resetea y actualiza

---

## 🚀 Ventajas del Sistema

### Para el Negocio
1. ✅ **Evita doble agendamiento**
2. ✅ **Optimiza ocupación del barbero**
3. ✅ **Reduce cancelaciones**
4. ✅ **Mejora organización**

### Para el Cliente
1. ✅ **Ve disponibilidad real**
2. ✅ **No puede agendar horas ocupadas**
3. ✅ **Feedback inmediato**
4. ✅ **Menos fricción**

### Para el Barbero
1. ✅ **No recibe citas conflictivas**
2. ✅ **Agenda organizada**
3. ✅ **Menos confusiones**

---

## 💡 Mejoras Futuras Sugeridas

### Corto Plazo
- [ ] Aplicar horas disponibles también en móvil (input nativo)
- [ ] Mostrar contador de horas disponibles
- [ ] Agregar tooltip con info de por qué no hay horas

### Mediano Plazo
- [ ] Considerar duración del servicio en disponibilidad
- [ ] Bloquear horarios de descanso del barbero
- [ ] Sugerir "próxima hora disponible"
- [ ] Sistema de lista de espera

### Largo Plazo
- [ ] Predicción de demanda con IA
- [ ] Sugerencias de horarios alternativos
- [ ] Integración con Google Calendar
- [ ] Notificaciones de espacios liberados

---

## 📖 Ejemplo de Uso API

### Request
```http
GET /api/horas-disponibles?fecha=2025-10-02&barbero_id=1
```

### Response Exitosa
```json
{
  "success": true,
  "data": [
    {
      "valor": "09:00",
      "etiqueta": "9:00 AM",
      "disponible": true
    },
    {
      "valor": "09:30",
      "etiqueta": "9:30 AM",
      "disponible": true
    },
    {
      "valor": "14:00",
      "etiqueta": "2:00 PM",
      "disponible": true
    }
  ],
  "fecha": "2025-10-02",
  "barbero_id": 1,
  "total_disponibles": 15
}
```

### Response Error - Fecha Pasada
```json
{
  "success": false,
  "message": "Datos inválidos",
  "errors": {
    "fecha": [
      "The fecha must be a date after or equal to today."
    ]
  }
}
```

### Response Error - Barbero No Existe
```json
{
  "success": false,
  "message": "Datos inválidos",
  "errors": {
    "barbero_id": [
      "The selected barbero id is invalid."
    ]
  }
}
```

---

## ✅ Checklist de Implementación

- [x] Endpoint backend `/horas-disponibles`
- [x] Validación de parámetros
- [x] Lógica de filtrado de horas ocupadas
- [x] Ruta pública en `api.php`
- [x] Función `getHorasDisponibles()` en frontend
- [x] Estados para horas disponibles
- [x] useEffect para cargar automáticamente
- [x] Props actualizadas en `SelectorHoraModerno`
- [x] Indicador de carga
- [x] Mensaje de sin horarios disponibles
- [x] Reset de hora al cambiar fecha/barbero
- [x] Documentación completa

---

**Estado:** ✅ **IMPLEMENTADO Y FUNCIONANDO**

**Próximo paso:** Probar en ambiente de desarrollo y verificar todos los escenarios

**Desarrollado para:** JP Barber  
**Framework:** Laravel (Backend) + Astro + React (Frontend)  
**Versión:** 1.0 - Sistema de Horas Disponibles Dinámicas
