# WebSockets y Actualizaciones en Tiempo Real - JP Barber System

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Implementación Backend](#implementación-backend)
4. [Implementación Frontend](#implementación-frontend)
5. [Eventos del Sistema](#eventos-del-sistema)
6. [Casos de Uso](#casos-de-uso)

---

## Introducción

### ¿Por qué WebSockets?

El sistema JP Barber requiere actualizaciones en tiempo real para:

- 📱 **Panel del Barbero:** Ver cambios en la cola instantáneamente
- 📅 **Citas:** Notificar nuevas citas agendadas
- 🔔 **Notificaciones:** Alertas de productos bajo stock, citas próximas
- 👥 **Colaboración:** Múltiples usuarios viendo el mismo estado

**Alternativas evaluadas:**
| Tecnología | Ventajas | Desventajas | Recomendación |
|------------|----------|-------------|---------------|
| **WebSockets** | Comunicación bidireccional, baja latencia | Más complejo | ✅ Recomendado |
| **Server-Sent Events (SSE)** | Simple, unidireccional | Solo servidor → cliente | ⚠️ Limitado |
| **Polling** | Simple | Alto consumo de recursos | ❌ No recomendado |

---

## Arquitectura

### Flujo General

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   Cliente   │ ←────────────────────────→ │   Servidor   │
│  (Browser)  │      Conexión persistente   │   Node.js    │
└─────────────┘                             └──────────────┘
                                                    ↓
                                            ┌──────────────┐
                                            │   Base de    │
                                            │    Datos     │
                                            └──────────────┘
```

### Canales (Rooms)

Cada barbero tiene su propio "room" para recibir eventos específicos:

```
Room: barbero_1
  ├─ Citas propias
  ├─ Turnos en su cola
  └─ Notificaciones personales

Room: admin
  ├─ Todos los eventos
  └─ Alertas del sistema

Room: global
  └─ Eventos para todos
```

---

## Implementación Backend

### Opción 1: Socket.IO (Node.js) - Recomendado

#### 1. Instalación

```bash
npm install socket.io
npm install jsonwebtoken  # Para autenticación
```

#### 2. Configuración del Servidor

`server.js`:

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4321",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware de autenticación para sockets
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Manejo de conexiones
io.on('connection', (socket) => {
  console.log(`✅ Usuario conectado: ${socket.user.nombre} (${socket.user.rol})`);
  
  // Unir a rooms según rol
  if (socket.user.rol === 'barbero') {
    socket.join(`barbero_${socket.user.barbero_id}`);
    console.log(`🪒 Barbero ${socket.user.barbero_id} unido a su room`);
  } else if (socket.user.rol === 'admin') {
    socket.join('admin');
    console.log(`👑 Admin unido a room admin`);
  }
  
  // Todos los usuarios al room global
  socket.join('global');
  
  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado: ${socket.user.nombre}`);
  });
  
  // Evento de prueba
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// Exportar io para usar en otros archivos
module.exports = { io, server, app };

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
```

#### 3. Servicio de Eventos

`services/socketService.js`:

```javascript
let io;

const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Emitir evento a barbero específico
const emitToBarbero = (barberoId, event, data) => {
  if (!io) return;
  io.to(`barbero_${barberoId}`).emit(event, data);
  console.log(`📤 Evento "${event}" enviado a barbero ${barberoId}`);
};

// Emitir evento a todos los admins
const emitToAdmins = (event, data) => {
  if (!io) return;
  io.to('admin').emit(event, data);
  console.log(`📤 Evento "${event}" enviado a admins`);
};

// Emitir evento global
const emitGlobal = (event, data) => {
  if (!io) return;
  io.to('global').emit(event, data);
  console.log(`📤 Evento "${event}" enviado globalmente`);
};

// Emitir a usuario específico (por socket ID)
const emitToUser = (socketId, event, data) => {
  if (!io) return;
  io.to(socketId).emit(event, data);
};

// Notificación de nueva cita
const notificarNuevaCita = (cita) => {
  emitToBarbero(cita.barbero_id, 'cita:nueva', {
    id: cita.id,
    cliente_nombre: cita.cliente_nombre,
    servicio: cita.servicio_nombre,
    fecha_hora: cita.fecha_hora,
    mensaje: `Nueva cita agendada: ${cita.cliente_nombre}`
  });
  
  emitToAdmins('cita:nueva', cita);
};

// Actualización de cola
const actualizarCola = (barberoId, turnos) => {
  emitToBarbero(barberoId, 'cola:actualizada', {
    barbero_id: barberoId,
    turnos: turnos,
    timestamp: new Date()
  });
};

// Nuevo turno agregado
const nuevoTurno = (turno) => {
  emitToBarbero(turno.barbero_id, 'turno:nuevo', {
    id: turno.id,
    numero_turno: turno.numero_turno,
    cliente_nombre: turno.cliente_nombre,
    servicio: turno.servicio_nombre,
    mensaje: `Nuevo turno #${turno.numero_turno}: ${turno.cliente_nombre}`
  });
};

// Cambio de estado de turno
const cambioEstadoTurno = (turno) => {
  emitToBarbero(turno.barbero_id, 'turno:cambio_estado', {
    id: turno.id,
    numero_turno: turno.numero_turno,
    estado: turno.estado,
    timestamp: new Date()
  });
};

// Venta completada
const ventaCompletada = (venta) => {
  emitToBarbero(venta.barbero_id, 'venta:completada', {
    id: venta.id,
    total: venta.total,
    items: venta.items,
    mensaje: `Venta registrada: $${venta.total.toLocaleString()}`
  });
  
  emitToAdmins('venta:completada', venta);
};

// Producto bajo stock
const alertaBajoStock = (producto) => {
  emitToAdmins('producto:bajo_stock', {
    id: producto.id,
    nombre: producto.nombre,
    stock: producto.stock,
    stock_minimo: producto.stock_minimo,
    mensaje: `⚠️ ${producto.nombre} tiene solo ${producto.stock} unidades`
  });
};

// Gorra vendida (actualizar galería)
const gorraVendida = (gorra) => {
  emitGlobal('gorra:vendida', {
    id: gorra.id,
    nombre: gorra.nombre,
    mensaje: `🧢 ${gorra.nombre} ha sido vendida`
  });
};

module.exports = {
  setSocketIO,
  emitToBarbero,
  emitToAdmins,
  emitGlobal,
  emitToUser,
  notificarNuevaCita,
  actualizarCola,
  nuevoTurno,
  cambioEstadoTurno,
  ventaCompletada,
  alertaBajoStock,
  gorraVendida
};
```

#### 4. Integrar en Controladores

`controllers/citasController.js`:

```javascript
const socketService = require('../services/socketService');

exports.create = async (req, res) => {
  try {
    const { barbero_id, servicio_id, fecha_hora, cliente_nombre, cliente_telefono } = req.body;
    
    // Crear cita en BD
    const [result] = await db.query(`
      INSERT INTO citas (barbero_id, servicio_id, fecha_hora, cliente_nombre, cliente_telefono, estado)
      VALUES (?, ?, ?, ?, ?, 'pendiente')
    `, [barbero_id, servicio_id, fecha_hora, cliente_nombre, cliente_telefono]);
    
    const citaId = result.insertId;
    
    // Obtener datos completos
    const [citas] = await db.query(`
      SELECT c.*, s.nombre as servicio_nombre
      FROM citas c
      JOIN servicios s ON c.servicio_id = s.id
      WHERE c.id = ?
    `, [citaId]);
    
    const cita = citas[0];
    
    // 🔥 EMITIR EVENTO EN TIEMPO REAL
    socketService.notificarNuevaCita(cita);
    
    res.status(201).json({
      success: true,
      data: cita,
      message: 'Cita agendada exitosamente'
    });
    
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
```

`controllers/turnosController.js`:

```javascript
const socketService = require('../services/socketService');

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Actualizar estado
    await db.query(`
      UPDATE turnos_cola SET estado = ? WHERE id = ?
    `, [estado, id]);
    
    // Obtener turno actualizado
    const [turnos] = await db.query(`
      SELECT * FROM turnos_cola WHERE id = ?
    `, [id]);
    
    const turno = turnos[0];
    
    // 🔥 EMITIR EVENTO EN TIEMPO REAL
    socketService.cambioEstadoTurno(turno);
    
    // Si cambió a "llamado" o "en_silla", actualizar toda la cola
    if (estado === 'llamado' || estado === 'en_silla') {
      const [colaActualizada] = await db.query(`
        SELECT * FROM turnos_cola 
        WHERE barbero_id = ? AND estado IN ('espera', 'llamado', 'en_silla')
        ORDER BY prioridad ASC, hora_registro ASC
      `, [turno.barbero_id]);
      
      socketService.actualizarCola(turno.barbero_id, colaActualizada);
    }
    
    res.json({
      success: true,
      data: turno
    });
    
  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
```

---

### Opción 2: Laravel WebSockets

#### Instalación

```bash
composer require beyondcode/laravel-websockets
composer require pusher/pusher-php-server

php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider"
php artisan migrate
```

#### Configuración

`.env`:
```env
BROADCAST_DRIVER=pusher

PUSHER_APP_ID=jpbarber
PUSHER_APP_KEY=jpbarberkey
PUSHER_APP_SECRET=jpbarbersecret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
```

#### Evento

`app/Events/NuevaCita.php`:
```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class NuevaCita implements ShouldBroadcast
{
    use InteractsWithSockets;
    
    public $cita;
    
    public function __construct($cita)
    {
        $this->cita = $cita;
    }
    
    public function broadcastOn()
    {
        return new Channel('barbero.' . $this->cita->barbero_id);
    }
    
    public function broadcastAs()
    {
        return 'cita.nueva';
    }
}
```

#### Usar en Controlador

```php
use App\Events\NuevaCita;

public function store(Request $request)
{
    $cita = Cita::create($request->all());
    
    // Emitir evento
    broadcast(new NuevaCita($cita));
    
    return response()->json(['success' => true, 'data' => $cita]);
}
```

---

## Implementación Frontend

### Conexión con Socket.IO (React)

#### 1. Instalación

```bash
npm install socket.io-client
```

#### 2. Cliente de Socket

`src/services/socketClient.js`:

```javascript
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }
  
  // Conectar
  connect(token) {
    if (this.socket?.connected) {
      console.log('Ya está conectado');
      return;
    }
    
    this.socket = io(import.meta.env.PUBLIC_API_URL || 'http://localhost:3000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Conectado a WebSocket');
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado de WebSocket');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
    });
  }
  
  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  // Escuchar evento
  on(event, callback) {
    if (!this.socket) return;
    
    this.socket.on(event, callback);
    
    // Guardar para poder remover después
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  // Dejar de escuchar evento
  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }
  
  // Emitir evento
  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }
  
  // Limpiar todos los listeners
  removeAllListeners() {
    if (!this.socket) return;
    
    Object.keys(this.listeners).forEach(event => {
      this.socket.off(event);
    });
    
    this.listeners = {};
  }
}

// Exportar instancia única (Singleton)
const socketService = new SocketService();
export default socketService;
```

#### 3. Usar en Componente

`src/components/PanelBarbero.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import socketService from '../services/socketClient';

const PanelBarbero = () => {
  const [turnos, setTurnos] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  
  useEffect(() => {
    // Obtener token
    const token = localStorage.getItem('token');
    
    // Conectar a WebSocket
    socketService.connect(token);
    
    // Escuchar eventos
    socketService.on('turno:nuevo', (data) => {
      console.log('🆕 Nuevo turno:', data);
      
      // Agregar a la lista
      setTurnos(prev => [...prev, data]);
      
      // Mostrar notificación
      mostrarNotificacion(`Nuevo turno: ${data.cliente_nombre}`);
    });
    
    socketService.on('cola:actualizada', (data) => {
      console.log('🔄 Cola actualizada:', data);
      setTurnos(data.turnos);
    });
    
    socketService.on('turno:cambio_estado', (data) => {
      console.log('🔄 Estado cambiado:', data);
      
      // Actualizar turno en la lista
      setTurnos(prev => prev.map(t => 
        t.id === data.id ? { ...t, estado: data.estado } : t
      ));
    });
    
    socketService.on('cita:nueva', (data) => {
      console.log('📅 Nueva cita:', data);
      mostrarNotificacion(`Nueva cita: ${data.cliente_nombre}`);
    });
    
    socketService.on('venta:completada', (data) => {
      console.log('💰 Venta completada:', data);
      mostrarNotificacion(`Venta registrada: $${data.total}`);
    });
    
    // Cleanup al desmontar
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);
  
  const mostrarNotificacion = (mensaje) => {
    setNotificaciones(prev => [...prev, { id: Date.now(), mensaje }]);
    
    // Remover después de 5 segundos
    setTimeout(() => {
      setNotificaciones(prev => prev.slice(1));
    }, 5000);
  };
  
  return (
    <div>
      <h1>Panel del Barbero</h1>
      
      {/* Notificaciones */}
      <div className="notificaciones">
        {notificaciones.map(notif => (
          <div key={notif.id} className="notificacion">
            {notif.mensaje}
          </div>
        ))}
      </div>
      
      {/* Cola de turnos */}
      <div className="turnos">
        <h2>Cola de Turnos</h2>
        {turnos.map(turno => (
          <div key={turno.id} className={`turno estado-${turno.estado}`}>
            <span>#{turno.numero_turno}</span>
            <span>{turno.cliente_nombre}</span>
            <span>{turno.servicio}</span>
            <span>{turno.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PanelBarbero;
```

---

## Eventos del Sistema

### Listado Completo de Eventos

| Evento | Descripción | Room | Payload |
|--------|-------------|------|---------|
| `cita:nueva` | Nueva cita agendada | `barbero_{id}`, `admin` | `{ id, cliente_nombre, servicio, fecha_hora }` |
| `cita:actualizada` | Cita modificada | `barbero_{id}` | `{ id, cambios }` |
| `cita:cancelada` | Cita cancelada | `barbero_{id}` | `{ id, motivo }` |
| `turno:nuevo` | Nuevo turno agregado | `barbero_{id}` | `{ id, numero_turno, cliente_nombre, servicio }` |
| `turno:cambio_estado` | Cambio estado turno | `barbero_{id}` | `{ id, estado, timestamp }` |
| `turno:eliminado` | Turno eliminado | `barbero_{id}` | `{ id }` |
| `cola:actualizada` | Cola completa actualizada | `barbero_{id}` | `{ barbero_id, turnos[], timestamp }` |
| `venta:completada` | Venta registrada | `barbero_{id}`, `admin` | `{ id, total, items }` |
| `venta:anulada` | Venta anulada | `admin` | `{ id, motivo }` |
| `producto:bajo_stock` | Producto con stock bajo | `admin` | `{ id, nombre, stock }` |
| `gorra:vendida` | Gorra vendida | `global` | `{ id, nombre }` |
| `gorra:nueva` | Nueva gorra agregada | `global` | `{ id, nombre, precio }` |
| `notificacion` | Notificación genérica | `barbero_{id}` o `admin` | `{ titulo, mensaje, tipo }` |

---

## Casos de Uso

### Caso 1: Cliente Agenda Cita

```
1. Cliente → POST /api/citas (web pública)
2. Backend → Crea cita en BD
3. Backend → socketService.notificarNuevaCita(cita)
4. Socket.IO → Emite a room "barbero_1"
5. Panel Barbero → Recibe evento "cita:nueva"
6. Panel Barbero → Muestra notificación toast
7. Panel Barbero → Actualiza lista de citas
```

### Caso 2: Barbero Llama Siguiente Turno

```
1. Barbero → Click en "Llamar Siguiente"
2. Frontend → POST /api/turnos/siguiente/1
3. Backend → Actualiza estado a "llamado"
4. Backend → socketService.cambioEstadoTurno(turno)
5. Socket.IO → Emite a room "barbero_1"
6. Panel Barbero → Recibe "turno:cambio_estado"
7. Panel Barbero → Actualiza UI (destaca turno)
8. Pantalla Pública → Muestra "Turno #5 - Pase por favor"
```

### Caso 3: Venta Finalizada

```
1. Barbero → Completa venta con productos
2. Frontend → POST /api/ventas
3. Backend → Registra venta
4. Backend → Reduce stock de productos
5. Backend → Si stock < minimo → socketService.alertaBajoStock()
6. Backend → socketService.ventaCompletada(venta)
7. Socket.IO → Emite a "barbero_1" y "admin"
8. Panel Admin → Recibe alerta de stock bajo
9. Panel Barbero → Muestra confirmación de venta
```

---

## Testing

### Test de Conexión

`tests/socket.test.js`:

```javascript
const io = require('socket.io-client');

describe('WebSocket Tests', () => {
  let socket;
  const token = 'tu_token_de_prueba';
  
  beforeAll((done) => {
    socket = io('http://localhost:3000', {
      auth: { token }
    });
    socket.on('connect', done);
  });
  
  afterAll(() => {
    socket.disconnect();
  });
  
  test('debe conectarse correctamente', () => {
    expect(socket.connected).toBe(true);
  });
  
  test('debe recibir pong al enviar ping', (done) => {
    socket.emit('ping');
    socket.on('pong', (data) => {
      expect(data.timestamp).toBeDefined();
      done();
    });
  });
  
  test('debe recibir evento de nueva cita', (done) => {
    socket.on('cita:nueva', (data) => {
      expect(data.id).toBeDefined();
      expect(data.cliente_nombre).toBeDefined();
      done();
    });
    
    // Simular creación de cita...
  });
});
```

---

## Monitoreo y Debugging

### Panel de Admin de Socket.IO

```javascript
// En server.js
const { instrument } = require('@socket.io/admin-ui');

instrument(io, {
  auth: {
    type: "basic",
    username: "admin",
    password: "$2b$10$..."  // Hasheado con bcrypt
  },
  mode: "development"
});

// Abrir: https://admin.socket.io
// Conectar a: http://localhost:3000
```

### Logs

```javascript
// Activar logs de debugging
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// En frontend
socketService.socket.on('connect', () => {
  console.log('Connected with ID:', socketService.socket.id);
});

socketService.socket.onAny((event, ...args) => {
  console.log(`Evento recibido: ${event}`, args);
});
```

---

## Consideraciones de Producción

### Escalabilidad

Para múltiples servidores, usar Redis adapter:

```bash
npm install @socket.io/redis-adapter redis
```

```javascript
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient({ host: "localhost", port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Seguridad

1. **Autenticación:** Validar JWT en cada conexión
2. **Rate Limiting:** Limitar eventos por usuario
3. **Sanitización:** Validar datos antes de emitir
4. **CORS:** Configurar origins permitidos

---

**Última actualización:** 2025-10-01  
**Versión:** 1.0.0