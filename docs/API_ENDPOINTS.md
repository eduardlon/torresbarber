# Documentación de API - JP Barber System

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Barberos](#barberos)
3. [Servicios](#servicios)
4. [Productos](#productos)
5. [Gorras](#gorras)
6. [Citas](#citas)
7. [Cola Inteligente (Turnos)](#cola-inteligente-turnos)
8. [Ventas](#ventas)
9. [Clientes](#clientes)
10. [Dashboard y Estadísticas](#dashboard-y-estadísticas)

---

## Base URL

```
Desarrollo: http://localhost:3000/api
Producción: https://jpbarber.com/api
```

## Headers Comunes

```http
Content-Type: application/json
Authorization: Bearer {token}
```

---

## Autenticación

### 1. Login

```http
POST /auth/login
```

**Body:**
```json
{
  "email": "barbero@jpbarber.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "barbero@jpbarber.com",
      "rol": "barbero",
      "avatar": "https://...",
      "telefono": "3001234567"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-10-02T13:20:00Z"
  }
}
```

**Errores:**
```json
{
  "success": false,
  "error": "Credenciales inválidas",
  "code": 401
}
```

---

### 2. Logout

```http
POST /auth/logout
```

**Headers:**
```http
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

---

### 3. Verificar Sesión

```http
GET /auth/me
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "barbero@jpbarber.com",
    "rol": "barbero"
  }
}
```

---

## Barberos

### 1. Listar Barberos

```http
GET /barberos
```

**Query Params:**
- `activos` (boolean): Filtrar solo activos
- `con_horarios` (boolean): Incluir horarios disponibles

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Juan Pérez",
      "avatar": "https://...",
      "especialidad": "Cortes clásicos y modernos",
      "calificacion": 4.8,
      "activo": true,
      "horarios": [
        {
          "dia": "lunes",
          "hora_inicio": "09:00",
          "hora_fin": "18:00"
        }
      ]
    }
  ]
}
```

---

### 2. Obtener Barbero

```http
GET /barberos/{id}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@jpbarber.com",
    "telefono": "3001234567",
    "avatar": "https://...",
    "especialidad": "Cortes clásicos",
    "calificacion": 4.8,
    "total_cortes": 1523,
    "activo": true,
    "fecha_ingreso": "2023-01-15"
  }
}
```

---

### 3. Horarios Disponibles de Barbero

```http
GET /barberos/{id}/horarios-disponibles
```

**Query Params:**
- `fecha` (string): Fecha en formato YYYY-MM-DD
- `servicio_id` (int): ID del servicio (para calcular duración)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "barbero_id": 1,
    "fecha": "2025-10-05",
    "horarios_disponibles": [
      {
        "hora": "09:00",
        "disponible": true
      },
      {
        "hora": "09:30",
        "disponible": false,
        "razon": "Cita agendada"
      },
      {
        "hora": "10:00",
        "disponible": true
      }
    ]
  }
}
```

---

### 4. Estadísticas del Barbero

```http
GET /barberos/{id}/estadisticas
```

**Query Params:**
- `fecha_inicio` (string): YYYY-MM-DD
- `fecha_fin` (string): YYYY-MM-DD

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2025-10-01",
      "fin": "2025-10-31"
    },
    "total_ventas": 1250000,
    "total_clientes": 45,
    "promedio_ticket": 27777,
    "servicios_realizados": 48,
    "productos_vendidos": 12,
    "calificacion_promedio": 4.8,
    "servicios_mas_solicitados": [
      {
        "servicio": "Corte Clásico",
        "cantidad": 20
      }
    ]
  }
}
```

---

## Servicios

### 1. Listar Servicios

```http
GET /servicios
```

**Query Params:**
- `activos` (boolean): Solo servicios activos

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Corte Clásico",
      "descripcion": "Corte tradicional con tijera y máquina",
      "precio": 25000,
      "duracion_estimada": 30,
      "imagen": "https://...",
      "activo": true,
      "categoria": "cortes"
    },
    {
      "id": 2,
      "nombre": "Corte + Barba",
      "descripcion": "Corte completo más arreglo de barba",
      "precio": 35000,
      "duracion_estimada": 45,
      "imagen": "https://...",
      "activo": true,
      "categoria": "cortes"
    }
  ]
}
```

---

### 2. Crear Servicio (Admin)

```http
POST /servicios
```

**Body:**
```json
{
  "nombre": "Afeitado Completo",
  "descripcion": "Afeitado tradicional con navaja",
  "precio": 20000,
  "duracion_estimada": 25,
  "categoria": "barba",
  "activo": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 10,
    "nombre": "Afeitado Completo",
    "precio": 20000,
    "duracion_estimada": 25
  },
  "message": "Servicio creado exitosamente"
}
```

---

### 3. Actualizar Servicio (Admin)

```http
PUT /servicios/{id}
```

**Body:**
```json
{
  "precio": 22000,
  "activo": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Servicio actualizado"
}
```

---

### 4. Eliminar Servicio (Admin)

```http
DELETE /servicios/{id}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Servicio eliminado"
}
```

---

## Productos

### 1. Listar Productos

```http
GET /productos
```

**Query Params:**
- `categoria` (string): Filtrar por categoría
- `en_stock` (boolean): Solo productos con stock

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Cera para Cabello",
      "descripcion": "Cera moldeadora de fijación fuerte",
      "precio": 35000,
      "stock": 15,
      "stock_minimo": 5,
      "imagen": "https://...",
      "categoria": "cuidado_cabello",
      "activo": true
    }
  ]
}
```

---

### 2. Obtener Producto

```http
GET /productos/{id}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Cera para Cabello",
    "descripcion": "Cera moldeadora de fijación fuerte",
    "precio": 35000,
    "stock": 15,
    "stock_minimo": 5,
    "imagen": "https://...",
    "categoria": "cuidado_cabello",
    "marca": "American Crew",
    "activo": true
  }
}
```

---

### 3. Crear Producto (Admin)

```http
POST /productos
```

**Body:**
```json
{
  "nombre": "Aceite para Barba",
  "descripcion": "Aceite nutritivo para barba",
  "precio": 28000,
  "stock": 10,
  "stock_minimo": 3,
  "categoria": "cuidado_barba",
  "marca": "Beardman"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 20,
    "nombre": "Aceite para Barba",
    "precio": 28000
  }
}
```

---

### 4. Actualizar Stock

```http
PATCH /productos/{id}/stock
```

**Body:**
```json
{
  "cantidad": -2,
  "motivo": "venta",
  "venta_id": 123
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stock_anterior": 15,
    "stock_nuevo": 13
  }
}
```

---

## Gorras

### 1. Listar Gorras (Galería)

```http
GET /gorras
```

**Query Params:**
- `disponibles` (boolean): Solo gorras disponibles

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Gorra Yankees Original",
      "descripcion": "Gorra oficial MLB New York Yankees",
      "precio": 85000,
      "imagen": "https://...",
      "estado": "disponible",
      "fecha_agregada": "2025-09-15",
      "marca": "New Era",
      "talla": "Ajustable"
    },
    {
      "id": 2,
      "nombre": "Gorra Lakers",
      "precio": 75000,
      "imagen": "https://...",
      "estado": "vendida",
      "fecha_venta": "2025-09-28"
    }
  ]
}
```

---

### 2. Obtener Gorra

```http
GET /gorras/{id}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Gorra Yankees Original",
    "descripcion": "Gorra oficial MLB New York Yankees",
    "precio": 85000,
    "imagen": "https://...",
    "imagenes_adicionales": [
      "https://...",
      "https://..."
    ],
    "estado": "disponible",
    "marca": "New Era",
    "talla": "Ajustable",
    "material": "100% Algodón",
    "fecha_agregada": "2025-09-15"
  }
}
```

---

### 3. Agregar Gorra (Admin)

```http
POST /gorras
```

**Body:**
```json
{
  "nombre": "Gorra Red Sox",
  "descripcion": "Gorra oficial Boston Red Sox",
  "precio": 80000,
  "imagen": "https://...",
  "marca": "New Era",
  "talla": "7 1/4"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 15,
    "nombre": "Gorra Red Sox",
    "precio": 80000
  }
}
```

---

### 4. Marcar como Vendida

```http
PATCH /gorras/{id}/marcar-vendida
```

**Body:**
```json
{
  "venta_id": 456
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Gorra marcada como vendida",
  "data": {
    "estado": "vendida",
    "fecha_venta": "2025-10-01T13:20:00Z"
  }
}
```

---

## Citas

### 1. Listar Citas

```http
GET /citas
```

**Query Params:**
- `barbero_id` (int): Filtrar por barbero
- `fecha` (string): YYYY-MM-DD
- `estado` (string): pendiente, confirmada, en_cola, completada, cancelada

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "barbero_id": 1,
      "barbero_nombre": "Juan Pérez",
      "cliente_nombre": "Carlos Gómez",
      "cliente_telefono": "3001234567",
      "cliente_email": "carlos@email.com",
      "servicio_id": 1,
      "servicio_nombre": "Corte Clásico",
      "fecha_hora": "2025-10-05T10:00:00Z",
      "duracion_estimada": 30,
      "estado": "confirmada",
      "notas": "Cliente prefiere corte bajo",
      "created_at": "2025-10-01T08:30:00Z"
    }
  ]
}
```

---

### 2. Crear Cita (Agendar)

```http
POST /citas
```

**Body:**
```json
{
  "barbero_id": 1,
  "servicio_id": 1,
  "fecha_hora": "2025-10-05T10:00:00Z",
  "cliente_nombre": "Carlos Gómez",
  "cliente_telefono": "3001234567",
  "cliente_email": "carlos@email.com",
  "notas": "Primera vez en JP Barber"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 50,
    "barbero_nombre": "Juan Pérez",
    "fecha_hora": "2025-10-05T10:00:00Z",
    "estado": "pendiente"
  },
  "message": "Cita agendada exitosamente"
}
```

**Errores:**
```json
{
  "success": false,
  "error": "El barbero no está disponible en ese horario",
  "code": 409
}
```

---

### 3. Obtener Cita

```http
GET /citas/{id}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "barbero": {
      "id": 1,
      "nombre": "Juan Pérez",
      "avatar": "https://..."
    },
    "cliente": {
      "nombre": "Carlos Gómez",
      "telefono": "3001234567",
      "email": "carlos@email.com"
    },
    "servicio": {
      "id": 1,
      "nombre": "Corte Clásico",
      "precio": 25000,
      "duracion": 30
    },
    "fecha_hora": "2025-10-05T10:00:00Z",
    "estado": "confirmada",
    "notas": "Cliente prefiere corte bajo"
  }
}
```

---

### 4. Actualizar Estado de Cita

```http
PATCH /citas/{id}/estado
```

**Body:**
```json
{
  "estado": "confirmada"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Estado actualizado a confirmada"
}
```

---

### 5. Cancelar Cita

```http
DELETE /citas/{id}
```

**Body:**
```json
{
  "motivo": "Cliente canceló"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Cita cancelada"
}
```

---

### 6. Verificar Estado en Cola

```http
GET /citas/{id}/estado-cola
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "cita_id": 1,
    "esta_en_cola": true,
    "turno": {
      "id": 45,
      "numero_turno": 3,
      "estado": "espera",
      "posicion_en_cola": 1,
      "tiempo_estimado_minutos": 15
    }
  }
}
```

---

## Cola Inteligente (Turnos)

### 1. Obtener Cola del Barbero

```http
GET /turnos/cola/{barbero_id}
```

**Query Params:**
- `fecha` (string): YYYY-MM-DD (default: hoy)
- `incluir_finalizados` (boolean): Incluir turnos completados

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "barbero_id": 1,
    "fecha": "2025-10-01",
    "turnos": [
      {
        "id": 1,
        "numero_turno": 1,
        "cliente_nombre": "Carlos Gómez",
        "cliente_telefono": "3001234567",
        "servicio_nombre": "Corte Clásico",
        "estado": "en_silla",
        "prioridad": 1,
        "hora_registro": "2025-10-01T09:00:00Z",
        "hora_llamado": "2025-10-01T09:05:00Z",
        "duracion_estimada": 30,
        "notas": "Cliente con cita",
        "cita_id": 50,
        "tiene_cita": true
      },
      {
        "id": 2,
        "numero_turno": 2,
        "cliente_nombre": "Pedro López",
        "servicio_nombre": "Corte + Barba",
        "estado": "espera",
        "prioridad": 2,
        "hora_registro": "2025-10-01T09:10:00Z",
        "duracion_estimada": 45,
        "tiene_cita": false
      }
    ],
    "estadisticas": {
      "total_en_espera": 3,
      "total_atendidos_hoy": 5,
      "tiempo_promedio_atencion": 28
    }
  }
}
```

---

### 2. Agregar Turno (Walk-in)

```http
POST /turnos
```

**Body:**
```json
{
  "barbero_id": 1,
  "cliente_nombre": "Pedro López",
  "cliente_telefono": "3009876543",
  "servicio_nombre": "Corte + Barba",
  "notas": "Cliente nuevo",
  "prioridad": 2
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 15,
    "numero_turno": 5,
    "estado": "espera",
    "posicion_en_cola": 3,
    "tiempo_estimado_minutos": 45
  },
  "message": "Turno agregado a la cola"
}
```

---

### 3. Cambiar Estado de Turno

```http
PATCH /turnos/{id}/estado
```

**Body:**
```json
{
  "estado": "llamado"
}
```

**Estados válidos:**
- `espera`: En espera
- `llamado`: Cliente llamado
- `en_silla`: En atención
- `finalizando`: Procesando pago
- `completado`: Atención finalizada

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "estado": "llamado",
    "hora_cambio": "2025-10-01T09:05:00Z"
  }
}
```

---

### 4. Llamar Siguiente Turno

```http
POST /turnos/siguiente/{barbero_id}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "turno_id": 2,
    "numero_turno": 2,
    "cliente_nombre": "Pedro López",
    "servicio_nombre": "Corte + Barba",
    "estado": "llamado"
  },
  "message": "Turno #2 llamado"
}
```

---

### 5. Eliminar Turno

```http
DELETE /turnos/{id}
```

**Body:**
```json
{
  "motivo": "Cliente no se presentó"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Turno eliminado de la cola"
}
```

---

## Ventas

### 1. Crear Venta (Finalizar Turno)

```http
POST /ventas
```

**Body:**
```json
{
  "barbero_id": 1,
  "turno_id": 15,
  "cliente_nombre": "Carlos Gómez",
  "cliente_telefono": "3001234567",
  "items": [
    {
      "tipo": "servicio",
      "servicio_id": 1,
      "nombre": "Corte Clásico",
      "precio": 25000,
      "cantidad": 1
    },
    {
      "tipo": "producto",
      "producto_id": 5,
      "nombre": "Cera para Cabello",
      "precio": 35000,
      "cantidad": 1
    },
    {
      "tipo": "gorra",
      "gorra_id": 10,
      "nombre": "Gorra Yankees",
      "precio": 85000,
      "cantidad": 1
    }
  ],
  "metodo_pago": "efectivo",
  "total": 145000,
  "notas": "Cliente satisfecho"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 500,
    "fecha": "2025-10-01T13:20:00Z",
    "total": 145000,
    "items_count": 3,
    "turno_id": 15
  },
  "message": "Venta registrada exitosamente"
}
```

---

### 2. Listar Ventas

```http
GET /ventas
```

**Query Params:**
- `barbero_id` (int): Filtrar por barbero
- `fecha_inicio` (string): YYYY-MM-DD
- `fecha_fin` (string): YYYY-MM-DD
- `metodo_pago` (string): efectivo, tarjeta, transferencia

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 500,
      "fecha": "2025-10-01T13:20:00Z",
      "barbero_nombre": "Juan Pérez",
      "cliente_nombre": "Carlos Gómez",
      "total": 145000,
      "metodo_pago": "efectivo",
      "items_count": 3
    }
  ],
  "metadata": {
    "total_ventas": 15,
    "suma_total": 2500000,
    "promedio_ticket": 166666
  }
}
```

---

### 3. Obtener Detalle de Venta

```http
GET /ventas/{id}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 500,
    "fecha": "2025-10-01T13:20:00Z",
    "barbero": {
      "id": 1,
      "nombre": "Juan Pérez"
    },
    "cliente": {
      "nombre": "Carlos Gómez",
      "telefono": "3001234567"
    },
    "items": [
      {
        "tipo": "servicio",
        "nombre": "Corte Clásico",
        "precio": 25000,
        "cantidad": 1,
        "subtotal": 25000
      },
      {
        "tipo": "producto",
        "nombre": "Cera para Cabello",
        "precio": 35000,
        "cantidad": 1,
        "subtotal": 35000
      },
      {
        "tipo": "gorra",
        "nombre": "Gorra Yankees",
        "precio": 85000,
        "cantidad": 1,
        "subtotal": 85000
      }
    ],
    "subtotal": 145000,
    "descuento": 0,
    "total": 145000,
    "metodo_pago": "efectivo",
    "notas": "Cliente satisfecho",
    "turno_id": 15
  }
}
```

---

### 4. Anular Venta (Admin)

```http
DELETE /ventas/{id}
```

**Body:**
```json
{
  "motivo": "Error en el registro"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Venta anulada. Stock restaurado."
}
```

---

## Clientes

### 1. Buscar Clientes

```http
GET /clientes
```

**Query Params:**
- `q` (string): Búsqueda por nombre o teléfono
- `limit` (int): Límite de resultados

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Carlos Gómez",
      "telefono": "3001234567",
      "email": "carlos@email.com",
      "total_visitas": 12,
      "ultima_visita": "2025-09-28",
      "barbero_preferido": "Juan Pérez"
    }
  ]
}
```

---

### 2. Obtener Historial de Cliente

```http
GET /clientes/{id}/historial
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "cliente": {
      "id": 1,
      "nombre": "Carlos Gómez",
      "telefono": "3001234567",
      "email": "carlos@email.com"
    },
    "estadisticas": {
      "total_visitas": 12,
      "total_gastado": 350000,
      "promedio_gasto": 29166,
      "ultima_visita": "2025-09-28"
    },
    "historial_ventas": [
      {
        "id": 500,
        "fecha": "2025-09-28",
        "barbero": "Juan Pérez",
        "servicios": ["Corte Clásico"],
        "total": 25000
      }
    ],
    "proximas_citas": [
      {
        "id": 50,
        "fecha_hora": "2025-10-05T10:00:00Z",
        "barbero": "Juan Pérez",
        "servicio": "Corte + Barba"
      }
    ]
  }
}
```

---

## Dashboard y Estadísticas

### 1. Dashboard General (Admin)

```http
GET /dashboard
```

**Query Params:**
- `fecha_inicio` (string): YYYY-MM-DD
- `fecha_fin` (string): YYYY-MM-DD

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2025-10-01",
      "fin": "2025-10-31"
    },
    "resumen": {
      "total_ventas": 5250000,
      "total_clientes": 156,
      "promedio_ticket": 33653,
      "citas_agendadas": 78,
      "citas_completadas": 65,
      "tasa_asistencia": 83.3
    },
    "ventas_por_barbero": [
      {
        "barbero_id": 1,
        "nombre": "Juan Pérez",
        "total_ventas": 2100000,
        "total_clientes": 65
      }
    ],
    "servicios_mas_vendidos": [
      {
        "servicio": "Corte Clásico",
        "cantidad": 85,
        "total": 2125000
      }
    ],
    "productos_mas_vendidos": [
      {
        "producto": "Cera para Cabello",
        "cantidad": 25,
        "total": 875000
      }
    ],
    "ventas_por_dia": [
      {
        "fecha": "2025-10-01",
        "total": 250000,
        "clientes": 8
      }
    ]
  }
}
```

---

### 2. Estadísticas del Barbero

```http
GET /dashboard/barbero/{id}
```

**Response:** (Ver endpoint GET /barberos/{id}/estadisticas)

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 204 | No Content - Éxito sin contenido |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: horario ocupado) |
| 422 | Unprocessable Entity - Validación fallida |
| 500 | Internal Server Error - Error del servidor |

---

## Paginación

Para endpoints con múltiples resultados:

**Query Params:**
- `page` (int): Número de página (default: 1)
- `per_page` (int): Items por página (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8,
    "next_page": 2,
    "prev_page": null
  }
}
```

---

## Rate Limiting

- **Límite:** 100 requests por minuto por IP
- **Headers de respuesta:**
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1696168800
  ```

---

**Última actualización:** 2025-10-01  
**Versión:** 1.0.0