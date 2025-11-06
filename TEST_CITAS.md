# 🐛 Guía de Depuración - Error 422 al Agendar Citas

## Problema Detectado
Error 422 (Unprocessable Content) al intentar agendar una cita desde el formulario.

## Cambios Realizados

### 1. api.js - Mejorado manejo de errores
```javascript
// Ahora muestra:
- Datos enviados al backend (console.log)
- Respuesta completa del backend
- Errores de validación específicos si existen
```

### 2. BookingAppMejorado.tsx - Formato correcto de datos
```javascript
Cambios:
✅ Formato de fecha: 'YYYY-MM-DD HH:mm:ss' (con espacio)
✅ IDs convertidos a enteros con parseInt()
✅ Strings con .trim() para eliminar espacios
✅ Campo 'estado' agregado con valor 'pendiente'
✅ Logs de depuración agregados
```

## Campos Esperados por el Backend

```json
{
  "cliente_nombre": "string (requerido)",
  "cliente_telefono": "string (requerido)",
  "cliente_email": "string|null (opcional)",
  "barbero_id": integer (requerido),
  "servicio_id": integer (requerido),
  "fecha_hora": "YYYY-MM-DD HH:mm:ss (requerido)",
  "estado": "pendiente|confirmada|cancelada (requerido)",
  "notas": "string|null (opcional)"
}
```

## Cómo Verificar

### 1. Abrir Consola del Navegador (F12)
Buscar estos logs cuando intentes agendar una cita:

```
Agendando cita: {...}  // Datos antes de enviar
Datos enviados al backend: {...}  // Lo que se envía
Respuesta del backend: {...}  // Respuesta del servidor
```

### 2. Verificar Network (Red)
- Ir a la pestaña Network/Red
- Intentar agendar una cita
- Buscar la petición a `/api/citas`
- Ver:
  - **Request Payload**: ¿Qué se está enviando?
  - **Response**: ¿Qué responde el servidor?

### 3. Posibles Errores del Backend

#### Error de validación de campos:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "fecha_hora": ["El formato de fecha es inválido"],
    "barbero_id": ["El campo barbero_id es requerido"],
    "servicio_id": ["El servicio seleccionado no existe"]
  }
}
```

#### Barbero no disponible:
```json
{
  "message": "El barbero no está disponible en ese horario"
}
```

#### Hora ya ocupada:
```json
{
  "message": "El horario seleccionado ya no está disponible"
}
```

## Soluciones Comunes

### Si el error persiste, verificar:

1. **Formato de fecha del backend Laravel**
   ```php
   // El backend puede esperar:
   'Y-m-d H:i:s'  // 2025-01-15 14:30:00
   // o
   'Y-m-d\TH:i:s'  // 2025-01-15T14:30:00
   ```

2. **Validación de IDs**
   - Los IDs de barbero y servicio deben existir en la base de datos
   - Deben ser integers, no strings

3. **Estado de la cita**
   - Debe ser un valor válido según el enum del backend
   - Valores comunes: 'pendiente', 'confirmada', 'cancelada'

## Próximos Pasos

Si después de estos cambios el error continúa:

1. **Revisar el backend Laravel** (`app/Http/Controllers/CitaController.php`)
   - Ver qué validaciones tiene
   - Verificar el método `store()` o `create()`

2. **Revisar las migraciones** (base de datos)
   - Estructura de la tabla `citas`
   - Campos requeridos (NOT NULL)
   - Valores por defecto

3. **Revisar el modelo** (`app/Models/Cita.php`)
   - $fillable o $guarded
   - Casts de campos
   - Relaciones

## Ejemplo de Request Correcto

```javascript
{
  "cliente_nombre": "Juan Pérez",
  "cliente_telefono": "3001234567",
  "cliente_email": "juan@email.com",
  "barbero_id": 1,
  "servicio_id": 2,
  "fecha_hora": "2025-01-15 14:30:00",
  "estado": "pendiente",
  "notas": "Preferencia por corte bajo"
}
```

## Comandos Útiles Backend

```bash
# Ver logs de Laravel
php artisan tail

# Limpiar caché
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Ver rutas disponibles
php artisan route:list | grep citas
```

---

**Actualizado**: Con logs de depuración activados
**Próximo paso**: Revisar la consola del navegador al agendar una cita
