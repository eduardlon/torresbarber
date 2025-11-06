# Documentación de APIs del Backend - Sistema de Barbero

## Tabla de Contenidos
1. [Gestión de Citas](#gestión-de-citas)
2. [Cola Inteligente](#cola-inteligente)
3. [Servicios](#servicios)
4. [Productos](#productos)
5. [Gorras](#gorras)
6. [Ventas](#ventas)

---

## Gestión de Citas

### 1. Obtener Citas por Fecha
**Endpoint:** `GET /api/barbero/citas`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Query Parameters:**
- `fecha`: Fecha en formato YYYY-MM-DD

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "cliente_nombre": "Juan Pérez",
    "cliente_telefono": "3001234567",
    "fecha_hora": "2025-10-01T10:00:00Z",
    "servicio_nombre": "Corte Clásico",
    "estado": "pendiente",
    "precio": 25000,
    "notas": "Preferencia de estilo clásico",
    "duracion_estimada": 30
  }
]
```

**Estados posibles:**
- `pendiente`: Cita creada, esperando confirmación
- `confirmada`: Cita confirmada por el barbero
- `en_proceso`: Corte en progreso
- `finalizada`: Cita completada
- `cancelada`: Cita cancelada

### 2. Agregar Cita a la Cola
**Endpoint:** `POST /api/barbero/agregar-a-cola`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "cita_id": 1,
  "barbero_id": 1,
  "cliente_nombre": "Juan Pérez",
  "servicio_nombre": "Corte Clásico",
  "prioridad": 1
}
```

**Prioridad:**
- `1`: Alta - Citas agendadas
- `2`: Media - Walk-ins

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Cliente agregado a la cola",
  "turno": {
    "id": 1,
    "numero_turno": 5,
    "prioridad": 1
  }
}
```

### 3. Actualizar Estado de Cita
**Endpoint:** `PUT /api/barbero/citas/{id}/estado`

**Body:**
```json
{
  "estado": "confirmada"
}
```

---

## Cola Inteligente

### 1. Obtener Cola del Barbero
**Endpoint:** `GET /api/barbero/cola`

**Query Parameters:**
- `barbero_id`: ID del barbero

**Respuesta Exitosa (200):**
```json
{
  "turnos": [
    {
      "id": 1,
      "numero_turno": 5,
      "cliente_nombre": "Juan Pérez",
      "cliente_telefono": "3001234567",
      "servicio_nombre": "Corte Clásico",
      "estado": "espera",
      "prioridad": 1,
      "hora_registro": "2025-10-01T09:00:00Z",
      "hora_llamado": null,
      "hora_inicio": null,
      "duracion_estimada": 30,
      "notas": "Cliente VIP",
      "cita_id": 1
    }
  ]
}
```

**Estados de la cola:**
- `espera`: Cliente esperando ser llamado
- `llamado`: Cliente llamado para pasar
- `en_silla`: Cliente siendo atendido
- `finalizando`: Servicio completado, pendiente de pago

### 2. Agregar Walk-in a la Cola
**Endpoint:** `POST /api/barbero/cola/agregar-walkin`

**Body:**
```json
{
  "barbero_id": 1,
  "cliente_nombre": "María García",
  "cliente_telefono": "3007654321",
  "servicio_nombre": "Corte general",
  "prioridad": 2
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Cliente agregado a la cola",
  "turno": {
    "id": 2,
    "numero_turno": 6,
    "cliente_nombre": "María García",
    "prioridad": 2
  }
}
```

### 3. Cambiar Estado de Turno
**Endpoint:** `PUT /api/barbero/cola/{id}/estado`

**Body:**
```json
{
  "estado": "llamado"
}
```

**Lógica del backend:**
- Al cambiar a `llamado`: Registrar `hora_llamado`
- Al cambiar a `en_silla`: Registrar `hora_inicio`
- Al cambiar a `finalizando`: Calcular duración real

---

## Servicios

### 1. Listar Todos los Servicios
**Endpoint:** `GET /api/servicios`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Corte Clásico",
    "precio": 25000,
    "descripcion": "Corte de cabello estilo clásico",
    "duracion_estimada": 30,
    "activo": true
  },
  {
    "id": 2,
    "nombre": "Corte + Barba",
    "precio": 35000,
    "descripcion": "Corte de cabello y arreglo de barba",
    "duracion_estimada": 45,
    "activo": true
  }
]
```

**Nota:** Solo los servicios con `activo: true` deben mostrarse al barbero.

---

## Productos

### 1. Listar Productos Disponibles
**Endpoint:** `GET /api/productos`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Gel Fijador",
    "precio": 15000,
    "stock": 10,
    "tipo": "producto",
    "descripcion": "Gel fijador profesional"
  },
  {
    "id": 2,
    "nombre": "Agua Mineral",
    "precio": 2000,
    "stock": 50,
    "tipo": "producto"
  }
]
```

**Tipos de producto:**
- `producto`: Productos generales (agua, gel, etc.)
- `gorra`: Gorras (se manejan por separado para eliminar de galería)

---

## Gorras

### 1. Listar Gorras Disponibles
**Endpoint:** `GET /api/gorras`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Gorra NY Original",
    "precio": 45000,
    "descripcion": "Gorra original de NY Yankees",
    "imagenes": [
      "storage/gorras/gorra-ny-1.jpg",
      "storage/gorras/gorra-ny-2.jpg"
    ],
    "colores": ["Negro", "Azul"],
    "tags": ["NY", "Original", "MLB"]
  }
]
```

**IMPORTANTE:** 
- Las gorras vendidas deben eliminarse automáticamente de la galería y la base de datos.
- No solo marcar como vendido, sino eliminar completamente el registro.

---

## Ventas

### 1. Crear Nueva Venta
**Endpoint:** `POST /api/barbero/ventas`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "barbero_id": 1,
  "cliente_nombre": "Juan Pérez",
  "cliente_telefono": "3001234567",
  "items": [
    {
      "tipo": "servicio",
      "id": 1,
      "nombre": "Corte Clásico",
      "precio": 25000,
      "cantidad": 1
    },
    {
      "tipo": "servicio",
      "id": 2,
      "nombre": "Corte Infantil",
      "precio": 20000,
      "cantidad": 1
    },
    {
      "tipo": "producto",
      "id": 1,
      "nombre": "Gel Fijador",
      "precio": 15000,
      "cantidad": 2
    },
    {
      "tipo": "producto",
      "id": 5,
      "nombre": "Gorra NY Original",
      "precio": 45000,
      "cantidad": 1
    }
  ],
  "metodo_pago": "efectivo",
  "notas": "Cliente satisfecho",
  "total": 125000
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Venta registrada exitosamente",
  "venta": {
    "id": 123,
    "numero_venta": "V-2025-001",
    "total": 125000,
    "fecha": "2025-10-01T10:30:00Z"
  }
}
```

**Lógica del Backend:**

1. **Validaciones:**
   - Verificar que el barbero existe y está activo
   - Verificar que todos los servicios y productos existen
   - Verificar stock disponible para productos
   - Validar que el total coincide con la suma de items

2. **Procesamiento de Items:**
   
   **Para Servicios:**
   - Registrar en tabla `venta_servicios`
   - No afecta inventario
   
   **Para Productos Generales:**
   - Registrar en tabla `venta_productos`
   - Reducir stock en tabla `productos`
   - Si stock llega a 0, notificar al administrador
   
   **Para Gorras:**
   - Registrar en tabla `venta_productos`
   - **ELIMINAR** completamente el registro de la tabla `gorras`
   - **ELIMINAR** las imágenes físicas del servidor
   - **ELIMINAR** de la galería del frontend

3. **Actualización de Turno:**
   - Si la venta está asociada a un turno de la cola
   - Marcar el turno como `completado`
   - Registrar hora de finalización

4. **Comisiones:**
   - Calcular comisión del barbero (si aplica)
   - Actualizar estadísticas del barbero

### 2. Obtener Historial de Ventas
**Endpoint:** `GET /api/barbero/ventas`

**Query Parameters:**
- `fecha_inicio`: Fecha inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha fin (YYYY-MM-DD)
- `barbero_id`: ID del barbero (opcional si es admin)

**Respuesta Exitosa (200):**
```json
{
  "ventas": [
    {
      "id": 123,
      "numero_venta": "V-2025-001",
      "cliente_nombre": "Juan Pérez",
      "total": 125000,
      "metodo_pago": "efectivo",
      "fecha": "2025-10-01T10:30:00Z",
      "items_count": 4,
      "barbero_nombre": "Carlos López"
    }
  ],
  "total_ventas": 125000,
  "cantidad_ventas": 1
}
```

---

## Estructura de Base de Datos Requerida

### Tabla: `turnos_cola`
```sql
CREATE TABLE turnos_cola (
  id INT PRIMARY KEY AUTO_INCREMENT,
  barbero_id INT NOT NULL,
  numero_turno INT NOT NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_telefono VARCHAR(20),
  servicio_nombre VARCHAR(255),
  estado ENUM('espera', 'llamado', 'en_silla', 'finalizando', 'completado', 'cancelado') DEFAULT 'espera',
  prioridad INT DEFAULT 2 COMMENT '1=Alta (citas), 2=Media (walk-ins)',
  hora_registro DATETIME NOT NULL,
  hora_llamado DATETIME,
  hora_inicio DATETIME,
  hora_finalizacion DATETIME,
  duracion_real INT COMMENT 'Duración en minutos',
  duracion_estimada INT DEFAULT 30,
  notas TEXT,
  cita_id INT COMMENT 'ID de la cita si proviene de agendamiento',
  FOREIGN KEY (barbero_id) REFERENCES barberos(id),
  FOREIGN KEY (cita_id) REFERENCES citas(id),
  INDEX idx_barbero_estado (barbero_id, estado),
  INDEX idx_fecha_registro (hora_registro)
);
```

### Tabla: `ventas`
```sql
CREATE TABLE ventas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero_venta VARCHAR(50) UNIQUE NOT NULL,
  barbero_id INT NOT NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_telefono VARCHAR(20),
  total DECIMAL(10,2) NOT NULL,
  metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'otro') DEFAULT 'efectivo',
  notas TEXT,
  turno_id INT COMMENT 'ID del turno asociado',
  fecha DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbero_id) REFERENCES barberos(id),
  FOREIGN KEY (turno_id) REFERENCES turnos_cola(id),
  INDEX idx_barbero_fecha (barbero_id, fecha),
  INDEX idx_fecha (fecha)
);
```

### Tabla: `venta_items`
```sql
CREATE TABLE venta_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  venta_id INT NOT NULL,
  tipo ENUM('servicio', 'producto') NOT NULL,
  item_id INT NOT NULL COMMENT 'ID del servicio o producto',
  nombre VARCHAR(255) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  INDEX idx_venta (venta_id),
  INDEX idx_tipo_item (tipo, item_id)
);
```

---

## Lógica Especial para Gorras

### Flujo Completo:

1. **Al Mostrar Gorras en Modal de Venta:**
   ```sql
   SELECT id, nombre, precio, imagenes
   FROM gorras
   WHERE estado = 'disponible'
   ORDER BY created_at DESC;
   ```

2. **Al Registrar Venta con Gorras:**
   ```php
   // Pseudocódigo
   foreach ($items as $item) {
     if ($item['tipo'] === 'producto' && esGorra($item['id'])) {
       // 1. Registrar en venta_items
       registrarItemVenta($venta_id, $item);
       
       // 2. Obtener información de la gorra
       $gorra = obtenerGorra($item['id']);
       
       // 3. Eliminar imágenes físicas
       foreach ($gorra->imagenes as $imagen) {
         eliminarArchivo($imagen);
       }
       
       // 4. Eliminar registro de base de datos
       eliminarGorra($item['id']);
       
       // 5. Log para auditoría
       log("Gorra vendida y eliminada: ID {$item['id']}, Venta: {$venta_id}");
     }
   }
   ```

3. **Función para Verificar si es Gorra:**
   ```sql
   SELECT tipo FROM productos WHERE id = ? AND tipo = 'gorra';
   -- O directamente de tabla gorras
   SELECT id FROM gorras WHERE id = ?;
   ```

---

## Respuestas de Error Comunes

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Datos inválidos",
  "errors": {
    "cliente_nombre": "El nombre del cliente es requerido",
    "items": "Debe agregar al menos un item a la venta"
  }
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Token inválido o expirado"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Recurso no encontrado"
}
```

### 409 - Conflict
```json
{
  "success": false,
  "message": "Stock insuficiente",
  "details": {
    "producto_id": 1,
    "stock_disponible": 2,
    "cantidad_solicitada": 5
  }
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Descripción del error (solo en desarrollo)"
}
```

---

## Notas de Implementación

### Seguridad:
- Todas las rutas deben requerir autenticación con JWT
- Validar que el barbero solo puede acceder a sus propios datos
- Sanitizar todas las entradas del usuario
- Validar tipos de datos y rangos

### Performance:
- Implementar caché para lista de servicios (no cambian frecuentemente)
- Indexar correctamente las tablas
- Optimizar consultas de cola con estados activos
- Implementar paginación para historial de ventas

### Auditoría:
- Registrar todas las eliminaciones de gorras
- Log de ventas con timestamp y usuario
- Historial de cambios de estado de turnos
- Backup automático antes de eliminar gorras

### Notificaciones:
- Notificar a administrador cuando stock de producto es bajo
- Alertar cuando una gorra es vendida (para actualizar inventario físico)
- Notificar problemas en proceso de venta

---

## Testing Recomendado

### Pruebas Críticas:

1. **Cola Inteligente:**
   - Verificar orden correcto de prioridades
   - Validar transiciones de estados
   - Comprobar que no se pierden turnos

2. **Ventas:**
   - Probar venta con múltiples items
   - Verificar cálculo correcto de totales
   - Validar reducción de stock

3. **Gorras:**
   - Confirmar eliminación completa de base de datos
   - Verificar eliminación de archivos físicos
   - Comprobar que no aparecen en galería post-venta

4. **Concurrencia:**
   - Probar múltiples barberos trabajando simultáneamente
   - Validar que no se venden productos sin stock
   - Verificar integridad de números de turno

---

## Changelog de API

### Versión 1.0 (2025-10-01)
- Implementación inicial del sistema de cola inteligente
- Sistema de prioridades para citas vs walk-ins
- Modal de venta mejorado con servicios y productos
- Lógica especial para manejo de gorras
- Gestión completa de turnos con estados

---

**Última actualización:** 2025-10-01
**Autor:** Equipo de Desarrollo JP Barber