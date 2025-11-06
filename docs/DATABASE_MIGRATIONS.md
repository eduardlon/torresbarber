# Migraciones de Base de Datos - JP Barber System

## Diagrama de Relaciones (ER)

```
usuarios (barberos, admin, recepcionistas)
    ↓
  ↓ ↓ ↓
barberos → horarios_barberos
  ↓         ↓
citas ←────────────┐
  ↓                │
turnos_cola ───────┤
  ↓                │
ventas ────────────┘
  ↓
venta_items ← servicios
         ↓    ← productos
         ↓    ← gorras
         ↓
      clientes
```

---

## 1. Tabla: usuarios

Usuarios del sistema (barberos, administradores, recepcionistas)

```sql
-- Crear tipo ENUM para rol
CREATE TYPE rol_usuario AS ENUM ('admin', 'barbero', 'recepcionista');

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'barbero',
    telefono VARCHAR(20),
    avatar VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Datos de ejemplo:**
```sql
INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('Juan Pérez', 'juan@jpbarber.com', '$2y$10$...', 'barbero', '3001234567'),
('Admin JP', 'admin@jpbarber.com', '$2y$10$...', 'admin', '3009876543'),
('María López', 'maria@jpbarber.com', '$2y$10$...', 'recepcionista', '3005554321');
```

---

## 2. Tabla: barberos

Información extendida de los barberos

```sql
CREATE TABLE barberos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE,
    especialidad TEXT,
    descripcion TEXT,
    calificacion NUMERIC(3,2) DEFAULT 5.00,
    total_cortes INTEGER DEFAULT 0,
    fecha_ingreso DATE,
    comision_porcentaje NUMERIC(5,2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_barberos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_barberos_usuario_id ON barberos(usuario_id);
CREATE INDEX idx_barberos_activo ON barberos(activo);

-- Trigger para updated_at
CREATE TRIGGER update_barberos_updated_at
    BEFORE UPDATE ON barberos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Datos de ejemplo:**
```sql
INSERT INTO barberos (usuario_id, especialidad, fecha_ingreso, calificacion) VALUES
(1, 'Cortes clásicos y modernos, especialista en fade', '2023-01-15', 4.8);
```

---

## 3. Tabla: horarios_barberos

Horarios de disponibilidad de cada barbero

```sql
-- Crear tipo ENUM para día de semana
CREATE TYPE dia_semana AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

CREATE TABLE horarios_barberos (
    id SERIAL PRIMARY KEY,
    barbero_id INTEGER NOT NULL,
    dia_semana dia_semana NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_horarios_barbero FOREIGN KEY (barbero_id) 
        REFERENCES barberos(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_horarios_barbero_dia ON horarios_barberos(barbero_id, dia_semana);

-- Trigger para updated_at
CREATE TRIGGER update_horarios_barberos_updated_at
    BEFORE UPDATE ON horarios_barberos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Datos de ejemplo:**
```sql
INSERT INTO horarios_barberos (barbero_id, dia_semana, hora_inicio, hora_fin) VALUES
(1, 'lunes', '09:00:00', '18:00:00'),
(1, 'martes', '09:00:00', '18:00:00'),
(1, 'miercoles', '09:00:00', '18:00:00'),
(1, 'jueves', '09:00:00', '18:00:00'),
(1, 'viernes', '09:00:00', '18:00:00'),
(1, 'sabado', '09:00:00', '14:00:00');
```

---

## 4. Tabla: servicios

Catálogo de servicios ofrecidos

```sql
-- Crear tipo ENUM para categoría de servicio
CREATE TYPE categoria_servicio AS ENUM ('cortes', 'barba', 'tratamientos', 'otros');

CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    duracion_estimada INTEGER NOT NULL, -- Duración en minutos
    categoria categoria_servicio DEFAULT 'cortes',
    imagen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_servicios_activo ON servicios(activo);
CREATE INDEX idx_servicios_categoria ON servicios(categoria);

-- Trigger para updated_at
CREATE TRIGGER update_servicios_updated_at
    BEFORE UPDATE ON servicios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Datos de ejemplo:**
```sql
INSERT INTO servicios (nombre, descripcion, precio, duracion_estimada, categoria) VALUES
('Corte Clásico', 'Corte tradicional con tijera y máquina', 25000, 30, 'cortes'),
('Corte + Barba', 'Corte completo más arreglo de barba', 35000, 45, 'cortes'),
('Corte Fade', 'Corte degradado profesional', 30000, 35, 'cortes'),
('Arreglo de Barba', 'Perfilado y arreglo de barba', 15000, 20, 'barba'),
('Afeitado Completo', 'Afeitado tradicional con navaja', 20000, 25, 'barba'),
('Tratamiento Capilar', 'Tratamiento hidratante para el cabello', 40000, 30, 'tratamientos');
```

---

## 5. Tabla: productos

Inventario de productos para venta

```sql
-- Crear tipo ENUM para categoría de producto
CREATE TYPE categoria_producto AS ENUM ('cuidado_cabello', 'cuidado_barba', 'styling', 'otros');

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    categoria categoria_producto DEFAULT 'otros',
    marca VARCHAR(100),
    imagen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_productos_stock ON productos(stock);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_activo ON productos(activo);

-- Trigger para updated_at
CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Datos de ejemplo:**
```sql
INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, categoria, marca) VALUES
('Cera para Cabello', 'Cera moldeadora de fijación fuerte', 35000, 15, 5, 'styling', 'American Crew'),
('Aceite para Barba', 'Aceite nutritivo con aroma suave', 28000, 10, 3, 'cuidado_barba', 'Beardman'),
('Shampoo Premium', 'Shampoo profesional para todo tipo de cabello', 45000, 8, 4, 'cuidado_cabello', 'Redken'),
('Pomada Mate', 'Pomada de acabado mate texturizado', 32000, 12, 5, 'styling', 'Suavecito');
```

---

## 6. Tabla: gorras

Galería de gorras coleccionables para venta

```sql
-- Crear tipo ENUM para estado de gorra
CREATE TYPE estado_gorra AS ENUM ('disponible', 'reservada', 'vendida');

CREATE TABLE gorras (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    imagen VARCHAR(255),
    imagenes_adicionales JSONB, -- Array de URLs de imágenes
    marca VARCHAR(100),
    talla VARCHAR(50),
    material VARCHAR(100),
    estado estado_gorra DEFAULT 'disponible',
    fecha_agregada DATE,
    fecha_venta DATE NULL,
    venta_id INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_gorras_estado ON gorras(estado);
CREATE INDEX idx_gorras_venta ON gorras(venta_id);

-- Trigger para updated_at
CREATE TRIGGER update_gorras_updated_at
    BEFORE UPDATE ON gorras
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Datos de ejemplo:**
```sql
INSERT INTO gorras (nombre, descripcion, precio, marca, talla, material, estado, fecha_agregada) VALUES
('Gorra Yankees Original', 'Gorra oficial MLB New York Yankees', 85000, 'New Era', 'Ajustable', '100% Algodón', 'disponible', '2025-09-15'),
('Gorra Lakers Championship', 'Edición especial campeonato Lakers', 95000, 'New Era', '7 1/4', '100% Algodón', 'disponible', '2025-09-20'),
('Gorra Red Sox Vintage', 'Gorra retro Boston Red Sox', 80000, 'New Era', 'Ajustable', '100% Algodón', 'vendida', '2025-08-10');
```

---

## 7. Tabla: clientes

Registro de clientes del sistema

```sql
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) UNIQUE,
    email VARCHAR(150) UNIQUE,
    fecha_nacimiento DATE NULL,
    notas TEXT, -- Preferencias, alergias, etc.
    barbero_preferido_id INTEGER NULL,
    total_visitas INTEGER DEFAULT 0,
    total_gastado NUMERIC(12,2) DEFAULT 0.00,
    ultima_visita DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_clientes_barbero_preferido FOREIGN KEY (barbero_preferido_id) 
        REFERENCES barberos(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_nombre ON clientes(nombre);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 8. Tabla: citas

Sistema de agendamiento de citas

```sql
-- Crear tipo ENUM para estado de cita
CREATE TYPE estado_cita AS ENUM ('pendiente', 'confirmada', 'en_cola', 'en_proceso', 'completada', 'cancelada', 'no_asistio');

CREATE TABLE citas (
    id SERIAL PRIMARY KEY,
    barbero_id INTEGER NOT NULL,
    servicio_id INTEGER NOT NULL,
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20) NOT NULL,
    cliente_email VARCHAR(150),
    fecha_hora TIMESTAMP NOT NULL,
    duracion_estimada INTEGER NOT NULL, -- Minutos
    estado estado_cita DEFAULT 'pendiente',
    notas TEXT,
    motivo_cancelacion TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_citas_barbero FOREIGN KEY (barbero_id) 
        REFERENCES barberos(id) ON DELETE CASCADE,
    CONSTRAINT fk_citas_servicio FOREIGN KEY (servicio_id) 
        REFERENCES servicios(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_citas_barbero_fecha ON citas(barbero_id, fecha_hora);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_fecha ON citas(fecha_hora);

-- Trigger para updated_at
CREATE TRIGGER update_citas_updated_at
    BEFORE UPDATE ON citas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 9. Tabla: turnos_cola

Cola inteligente de turnos para barberos

```sql
-- Crear tipo ENUM para estado de turno
CREATE TYPE estado_turno AS ENUM ('espera', 'llamado', 'en_silla', 'finalizando', 'completado', 'cancelado');

CREATE TABLE turnos_cola (
    id SERIAL PRIMARY KEY,
    barbero_id INTEGER NOT NULL,
    numero_turno INTEGER NOT NULL,
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20),
    servicio_nombre VARCHAR(150) NOT NULL,
    estado estado_turno DEFAULT 'espera',
    prioridad INTEGER DEFAULT 2, -- 1=Alta (con cita), 2=Media (walk-in)
    hora_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hora_llamado TIMESTAMP NULL,
    hora_inicio_atencion TIMESTAMP NULL,
    hora_fin_atencion TIMESTAMP NULL,
    duracion_estimada INTEGER, -- Minutos
    duracion_real INTEGER NULL, -- Minutos
    notas TEXT,
    cita_id INTEGER NULL, -- Referencia a cita agendada
    
    CONSTRAINT fk_turnos_barbero FOREIGN KEY (barbero_id) 
        REFERENCES barberos(id) ON DELETE CASCADE,
    CONSTRAINT fk_turnos_cita FOREIGN KEY (cita_id) 
        REFERENCES citas(id) ON DELETE SET NULL,
    CONSTRAINT uk_barbero_numero_fecha UNIQUE (barbero_id, numero_turno, DATE(hora_registro))
);

-- Índices
CREATE INDEX idx_turnos_barbero_estado ON turnos_cola(barbero_id, estado);
CREATE INDEX idx_turnos_barbero_fecha ON turnos_cola(barbero_id, hora_registro);
CREATE INDEX idx_turnos_prioridad ON turnos_cola(prioridad);
CREATE INDEX idx_turnos_cita ON turnos_cola(cita_id);
```

---

## 10. Tabla: ventas

Registro de ventas realizadas

```sql
-- Crear tipo ENUM para método de pago
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'mixto');

-- Crear tipo ENUM para estado de venta
CREATE TYPE estado_venta AS ENUM ('completada', 'anulada');

CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    barbero_id INTEGER NOT NULL,
    turno_id INTEGER NULL,
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20),
    subtotal NUMERIC(12,2) NOT NULL,
    descuento NUMERIC(12,2) DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL,
    metodo_pago metodo_pago DEFAULT 'efectivo',
    estado estado_venta DEFAULT 'completada',
    notas TEXT,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anulada_por INTEGER NULL, -- Usuario que anuló
    motivo_anulacion TEXT NULL,
    fecha_anulacion TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ventas_barbero FOREIGN KEY (barbero_id) 
        REFERENCES barberos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_turno FOREIGN KEY (turno_id) 
        REFERENCES turnos_cola(id) ON DELETE SET NULL,
    CONSTRAINT fk_ventas_anulada_por FOREIGN KEY (anulada_por) 
        REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_ventas_barbero_fecha ON ventas(barbero_id, fecha_venta);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_metodo_pago ON ventas(metodo_pago);

-- Trigger para updated_at
CREATE TRIGGER update_ventas_updated_at
    BEFORE UPDATE ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 11. Tabla: venta_items

Detalle de items vendidos en cada venta

```sql
-- Crear tipo ENUM para tipo de item
CREATE TYPE tipo_item AS ENUM ('servicio', 'producto', 'gorra');

CREATE TABLE venta_items (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL,
    tipo tipo_item NOT NULL,
    item_id INTEGER NOT NULL, -- ID del servicio, producto o gorra
    nombre VARCHAR(150) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_venta_items_venta FOREIGN KEY (venta_id) 
        REFERENCES ventas(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_venta_items_venta ON venta_items(venta_id);
CREATE INDEX idx_venta_items_tipo_item ON venta_items(tipo, item_id);
```

---

## 12. Tabla: movimientos_stock

Historial de movimientos de inventario

```sql
-- Crear tipo ENUM para tipo de movimiento
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'salida', 'ajuste', 'anulacion');

CREATE TABLE movimientos_stock (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    tipo tipo_movimiento NOT NULL,
    cantidad INTEGER NOT NULL, -- Positivo para entrada, negativo para salida
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    motivo VARCHAR(100),
    venta_id INTEGER NULL,
    usuario_id INTEGER NULL,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_movimientos_producto FOREIGN KEY (producto_id) 
        REFERENCES productos(id) ON DELETE CASCADE,
    CONSTRAINT fk_movimientos_venta FOREIGN KEY (venta_id) 
        REFERENCES ventas(id) ON DELETE SET NULL,
    CONSTRAINT fk_movimientos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(created_at);
```

---

## 13. Tabla: sesiones

Gestión de sesiones activas (opcional si usas JWT en DB)

```sql
CREATE TABLE sesiones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_sesiones_token ON sesiones(token);
CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX idx_sesiones_expires ON sesiones(expires_at);
```

---

## 14. Tabla: notificaciones

Sistema de notificaciones internas

```sql
-- Crear tipo ENUM para tipo de notificación
CREATE TYPE tipo_notificacion AS ENUM ('cita_nueva', 'cita_recordatorio', 'turno_agregado', 'producto_bajo_stock', 'venta', 'sistema');

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    tipo tipo_notificacion NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    data JSONB, -- Datos adicionales en formato JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leida_at TIMESTAMP NULL,
    
    CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_notificaciones_usuario_leida ON notificaciones(usuario_id, leida);
CREATE INDEX idx_notificaciones_fecha ON notificaciones(created_at);
```

---

## 15. Tabla: auditoria

Registro de acciones importantes (opcional pero recomendado)

```sql
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NULL,
    accion VARCHAR(100) NOT NULL,
    tabla VARCHAR(100) NOT NULL,
    registro_id INTEGER NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_tabla_registro ON auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(created_at);
```

---

## Triggers Importantes

### 1. Actualizar stock automáticamente al vender producto

```sql
CREATE OR REPLACE FUNCTION process_venta_item()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_anterior INTEGER;
BEGIN
    IF NEW.tipo = 'producto' THEN
        -- Obtener stock anterior
        SELECT stock INTO v_stock_anterior FROM productos WHERE id = NEW.item_id;
        
        -- Actualizar stock
        UPDATE productos 
        SET stock = stock - NEW.cantidad
        WHERE id = NEW.item_id;
        
        -- Registrar movimiento de stock
        INSERT INTO movimientos_stock (
            producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, venta_id
        ) VALUES (
            NEW.item_id, 
            'salida', 
            -NEW.cantidad,
            v_stock_anterior,
            v_stock_anterior - NEW.cantidad,
            'venta',
            NEW.venta_id
        );
    END IF;
    
    IF NEW.tipo = 'gorra' THEN
        UPDATE gorras
        SET estado = 'vendida', fecha_venta = CURRENT_DATE, venta_id = NEW.venta_id
        WHERE id = NEW.item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_venta_item_insert
    AFTER INSERT ON venta_items
    FOR EACH ROW
    EXECUTE FUNCTION process_venta_item();
```

### 2. Restaurar stock al anular venta

```sql
CREATE OR REPLACE FUNCTION restaurar_venta_anulada()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'anulada' AND OLD.estado = 'completada' THEN
        -- Restaurar stock de productos
        UPDATE productos p
        SET stock = p.stock + vi.cantidad
        FROM venta_items vi
        WHERE p.id = vi.item_id 
          AND vi.venta_id = NEW.id 
          AND vi.tipo = 'producto';
        
        -- Restaurar gorras
        UPDATE gorras g
        SET estado = 'disponible', fecha_venta = NULL, venta_id = NULL
        FROM venta_items vi
        WHERE g.id = vi.item_id 
          AND vi.venta_id = NEW.id 
          AND vi.tipo = 'gorra';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_venta_anulada
    AFTER UPDATE ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION restaurar_venta_anulada();
```

### 3. Actualizar estadísticas del barbero

```sql
CREATE OR REPLACE FUNCTION actualizar_stats_barbero()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE barberos
    SET total_cortes = total_cortes + 1
    WHERE id = NEW.barbero_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_venta_completada
    AFTER INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stats_barbero();
```

### 4. Actualizar estadísticas del cliente

```sql
CREATE OR REPLACE FUNCTION actualizar_stats_cliente()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO clientes (nombre, telefono, total_visitas, total_gastado, ultima_visita)
    VALUES (NEW.cliente_nombre, NEW.cliente_telefono, 1, NEW.total, CURRENT_DATE)
    ON CONFLICT (telefono) DO UPDATE
    SET
        total_visitas = clientes.total_visitas + 1,
        total_gastado = clientes.total_gastado + NEW.total,
        ultima_visita = CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_cliente
    AFTER INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stats_cliente();
```

---

## Índices Adicionales Recomendados

```sql
-- Índice compuesto para consultas de sincronización de citas
CREATE INDEX idx_citas_sync ON citas(estado, fecha_hora);

-- Índice para reportes de ventas
CREATE INDEX idx_ventas_reportes ON ventas(barbero_id, fecha_venta, estado);

-- Índice de texto completo para búsqueda de clientes (PostgreSQL)
CREATE INDEX idx_clientes_nombre_trgm ON clientes USING gin(nombre gin_trgm_ops);

-- Habilitar extensión para búsqueda fuzzy (opcional pero recomendado)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## Vistas Útiles

### Vista: estadisticas_barbero_hoy

```sql
CREATE OR REPLACE VIEW estadisticas_barbero_hoy AS
SELECT 
    b.id AS barbero_id,
    u.nombre AS barbero_nombre,
    COUNT(DISTINCT v.id) AS ventas_hoy,
    COALESCE(SUM(v.total), 0) AS total_ventas_hoy,
    COUNT(DISTINCT t.id) AS turnos_atendidos_hoy,
    COALESCE(AVG(t.duracion_real), 0) AS promedio_duracion_atencion
FROM barberos b
JOIN usuarios u ON b.usuario_id = u.id
LEFT JOIN ventas v ON v.barbero_id = b.id AND DATE(v.fecha_venta) = CURRENT_DATE
LEFT JOIN turnos_cola t ON t.barbero_id = b.id AND DATE(t.hora_registro) = CURRENT_DATE AND t.estado = 'completado'
GROUP BY b.id, u.nombre;
```

### Vista: productos_bajo_stock

```sql
CREATE OR REPLACE VIEW productos_bajo_stock AS
SELECT 
    id,
    nombre,
    stock,
    stock_minimo,
    (stock_minimo - stock) AS unidades_faltantes,
    categoria,
    marca
FROM productos
WHERE stock <= stock_minimo AND activo = TRUE
ORDER BY stock ASC;
```

### Vista: gorras_disponibles

```sql
CREATE OR REPLACE VIEW gorras_disponibles AS
SELECT 
    id,
    nombre,
    precio,
    imagen,
    marca,
    talla,
    fecha_agregada,
    (CURRENT_DATE - fecha_agregada) AS dias_en_inventario
FROM gorras
WHERE estado = 'disponible'
ORDER BY fecha_agregada DESC;
```

---

## Script Completo de Inicialización

```bash
# Ejecutar en orden con psql:

# 1. Conectar a la base de datos
psql -U postgres -d jpbarber_db

# 2. Ejecutar archivos SQL
\i 01_create_types.sql
\i 02_create_usuarios.sql
\i 03_create_barberos.sql
\i 04_create_horarios.sql
\i 05_create_servicios.sql
\i 06_create_productos.sql
\i 07_create_gorras.sql
\i 08_create_clientes.sql
\i 09_create_citas.sql
\i 10_create_turnos_cola.sql
\i 11_create_ventas.sql
\i 12_create_venta_items.sql
\i 13_create_movimientos_stock.sql
\i 14_create_sesiones.sql
\i 15_create_notificaciones.sql
\i 16_create_auditoria.sql
\i 17_create_triggers.sql
\i 18_create_indexes.sql
\i 19_create_views.sql
\i 20_seed_data.sql

# O ejecutar todo desde bash:
psql -U postgres -d jpbarber_db -f init_database.sql
```

---

## Backup Recomendado

```bash
# Backup diario (PostgreSQL)
pg_dump -U postgres jpbarber_db > backup_jpbarber_$(date +%Y%m%d).sql

# Backup con compresión
pg_dump -U postgres jpbarber_db | gzip > backup_jpbarber_$(date +%Y%m%d).sql.gz

# Backup en formato custom (mejor para restauración parcial)
pg_dump -U postgres -Fc jpbarber_db > backup_jpbarber_$(date +%Y%m%d).dump

# Restaurar backup SQL
psql -U postgres jpbarber_db < backup_jpbarber_20251001.sql

# Restaurar backup custom
pg_restore -U postgres -d jpbarber_db backup_jpbarber_20251001.dump

# Backup automático con cron (agregar a crontab)
# 0 2 * * * pg_dump -U postgres jpbarber_db | gzip > /backups/jpbarber_$(date +\%Y\%m\%d).sql.gz
```

---

## Consideraciones de Performance

1. **Particionamiento:** Para tablas que crecen mucho (ventas, auditoria), considerar particionamiento por fecha
   ```sql
   -- Ejemplo de particionamiento por mes
   CREATE TABLE ventas_2025_10 PARTITION OF ventas
   FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
   ```

2. **Archivado:** Mover registros antiguos (>1 año) a tablas de archivo

3. **Caché:** Usar Redis para cachear consultas frecuentes (servicios, barberos activos)

4. **Índices:** Revisar y optimizar índices cada 3 meses con `EXPLAIN ANALYZE`
   ```sql
   EXPLAIN ANALYZE SELECT * FROM ventas WHERE barbero_id = 1;
   ```

5. **Vacuum:** Ejecutar VACUUM periódicamente para optimizar espacio
   ```sql
   VACUUM ANALYZE ventas;
   ```

6. **Conexiones:** Configurar pool de conexiones apropiadamente
   ```
   max_connections = 100
   shared_buffers = 256MB
   ```

---

## Extensiones Útiles de PostgreSQL

```sql
-- Búsqueda de texto completo
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Funciones de encriptación
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

**Última actualización:** 2025-10-01  
**Versión:** 2.0.0  
**Motor:** PostgreSQL 17
