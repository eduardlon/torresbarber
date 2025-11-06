-- ========================================
-- JP BARBER - SETUP COMPLETO DE SUPABASE
-- ========================================
-- Este script crea todas las tablas necesarias y un usuario administrador
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- ========================================
-- PARTE 1: FUNCIONES AUXILIARES
-- ========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- PARTE 2: TABLAS PRINCIPALES
-- ========================================

-- Tabla: usuarios (Administradores)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL, -- Hash BCrypt
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios(activo);

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.usuarios IS 'Usuarios administradores del sistema';

-- Tabla: barberos
CREATE TABLE IF NOT EXISTS public.barberos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255),
  telefono VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255), -- Para login de barberos
  especialidad TEXT,
  descripcion TEXT,
  foto VARCHAR(500),
  activo BOOLEAN DEFAULT true,
  experiencia_anos INTEGER DEFAULT 0,
  calificacion_promedio DECIMAL(3,2) DEFAULT 0.00,
  total_servicios INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barberos_email ON public.barberos(email);
CREATE INDEX IF NOT EXISTS idx_barberos_activo ON public.barberos(activo);
CREATE INDEX IF NOT EXISTS idx_barberos_calificacion ON public.barberos(calificacion_promedio DESC);

DROP TRIGGER IF EXISTS update_barberos_updated_at ON public.barberos;
CREATE TRIGGER update_barberos_updated_at BEFORE UPDATE ON public.barberos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.barberos IS 'Barberos empleados de la barbería';

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255),
  telefono VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  fecha_nacimiento DATE,
  genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro', NULL)),
  notas TEXT,

  -- Sistema de fidelización
  cortes_realizados INTEGER DEFAULT 0,
  cortes_gratis_disponibles INTEGER DEFAULT 0,
  descuento_referido DECIMAL(5,2) DEFAULT 0.00,
  referidos_exitosos INTEGER DEFAULT 0,

  -- Gamificación
  puntos_experiencia INTEGER DEFAULT 0,
  nivel_actual INTEGER DEFAULT 1,
  visitas_totales INTEGER DEFAULT 0,
  dinero_gastado_total DECIMAL(10,2) DEFAULT 0.00,
  logros_obtenidos JSONB DEFAULT '[]'::jsonb,
  desafios_completados JSONB DEFAULT '[]'::jsonb,
  ultima_visita TIMESTAMPTZ,
  racha_visitas INTEGER DEFAULT 0,
  barbero_favorito_id UUID REFERENCES public.barberos(id),
  servicio_favorito VARCHAR(255),
  codigo_referido VARCHAR(20) UNIQUE,
  referido_por UUID REFERENCES public.clientes(id),

  -- Preferencias
  preferencias_notificaciones JSONB DEFAULT '{}'::jsonb,
  acepta_marketing BOOLEAN DEFAULT true,

  -- Estado
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON public.clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_referido ON public.clientes(codigo_referido);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON public.clientes(activo);

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.clientes IS 'Clientes de la barbería con sistema de fidelización';

-- Tabla: servicios
CREATE TABLE IF NOT EXISTS public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  duracion_minutos INTEGER NOT NULL,
  categoria VARCHAR(100),
  imagen VARCHAR(500),
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicios_activo ON public.servicios(activo);
CREATE INDEX IF NOT EXISTS idx_servicios_categoria ON public.servicios(categoria);
CREATE INDEX IF NOT EXISTS idx_servicios_orden ON public.servicios(orden);

DROP TRIGGER IF EXISTS update_servicios_updated_at ON public.servicios;
CREATE TRIGGER update_servicios_updated_at BEFORE UPDATE ON public.servicios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.servicios IS 'Catálogo de servicios de la barbería';

-- Tabla: citas
CREATE TABLE IF NOT EXISTS public.citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  invitado_id UUID, -- Para clientes no registrados
  barbero_id UUID REFERENCES public.barberos(id) ON DELETE SET NULL NOT NULL,
  servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL,
  duracion_estimada INTEGER, -- Minutos
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notas TEXT,
  precio_cobrado DECIMAL(10,2),
  metodo_pago VARCHAR(50),
  calificacion INTEGER CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario_calificacion TEXT,
  recordatorio_enviado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_cliente ON public.citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_barbero ON public.citas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_citas_servicio ON public.citas(servicio_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora ON public.citas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_citas_status ON public.citas(status);

DROP TRIGGER IF EXISTS update_citas_updated_at ON public.citas;
CREATE TRIGGER update_citas_updated_at BEFORE UPDATE ON public.citas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.citas IS 'Citas agendadas en la barbería';

-- Tabla: daily_turns (Turnos diarios / Cola)
CREATE TABLE IF NOT EXISTS public.daily_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_number INTEGER NOT NULL,
  turn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  guest_name VARCHAR(255), -- Para clientes walk-in sin registro
  service_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES public.barberos(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show')),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_wait_time INTEGER, -- Minutos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(turn_date, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_daily_turns_date ON public.daily_turns(turn_date);
CREATE INDEX IF NOT EXISTS idx_daily_turns_status ON public.daily_turns(status);
CREATE INDEX IF NOT EXISTS idx_daily_turns_barber ON public.daily_turns(barber_id);
CREATE INDEX IF NOT EXISTS idx_daily_turns_number ON public.daily_turns(turn_date, turn_number);

DROP TRIGGER IF EXISTS update_daily_turns_updated_at ON public.daily_turns;
CREATE TRIGGER update_daily_turns_updated_at BEFORE UPDATE ON public.daily_turns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.daily_turns IS 'Sistema de turnos diarios / cola de espera';

-- ========================================
-- PARTE 3: ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_turns ENABLE ROW LEVEL SECURITY;

-- Políticas para desarrollo (TEMPORALES - ajustar en producción)
-- Usuarios: Solo lectura pública para login
DROP POLICY IF EXISTS "Permitir lectura pública de usuarios" ON public.usuarios;
CREATE POLICY "Permitir lectura pública de usuarios"
  ON public.usuarios FOR SELECT
  USING (true);

-- Barberos: Lectura pública, escritura autenticada
DROP POLICY IF EXISTS "Permitir lectura pública de barberos" ON public.barberos;
CREATE POLICY "Permitir lectura pública de barberos"
  ON public.barberos FOR SELECT
  USING (activo = true);

DROP POLICY IF EXISTS "Permitir todas las operaciones en barberos" ON public.barberos;
CREATE POLICY "Permitir todas las operaciones en barberos"
  ON public.barberos FOR ALL
  USING (true)
  WITH CHECK (true);

-- Clientes: Los clientes solo ven sus propios datos
DROP POLICY IF EXISTS "Clientes pueden ver sus propios datos" ON public.clientes;
CREATE POLICY "Clientes pueden ver sus propios datos"
  ON public.clientes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir todas las operaciones en clientes" ON public.clientes;
CREATE POLICY "Permitir todas las operaciones en clientes"
  ON public.clientes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Servicios: Lectura pública
DROP POLICY IF EXISTS "Permitir lectura pública de servicios" ON public.servicios;
CREATE POLICY "Permitir lectura pública de servicios"
  ON public.servicios FOR SELECT
  USING (activo = true);

DROP POLICY IF EXISTS "Permitir todas las operaciones en servicios" ON public.servicios;
CREATE POLICY "Permitir todas las operaciones en servicios"
  ON public.servicios FOR ALL
  USING (true)
  WITH CHECK (true);

-- Citas: Acceso completo para desarrollo
DROP POLICY IF EXISTS "Permitir todas las operaciones en citas" ON public.citas;
CREATE POLICY "Permitir todas las operaciones en citas"
  ON public.citas FOR ALL
  USING (true)
  WITH CHECK (true);

-- Turnos: Acceso completo para desarrollo
DROP POLICY IF EXISTS "Permitir todas las operaciones en turnos" ON public.daily_turns;
CREATE POLICY "Permitir todas las operaciones en turnos"
  ON public.daily_turns FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- PARTE 4: DATOS INICIALES
-- ========================================

-- Insertar usuario administrador
-- Password: admin123 (BCrypt hash)
INSERT INTO public.usuarios (email, nombre, password, role, activo)
VALUES (
  'admin@jpbarber.com',
  'Administrador JP Barber',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
  'super_admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Insertar barberos de ejemplo
INSERT INTO public.barberos (nombre, apellido, email, password, telefono, especialidad, activo, experiencia_anos)
VALUES
  ('Juan', 'Pérez', 'juan.perez@jpbarber.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '3001234567', 'Cortes clásicos y modernos', true, 5),
  ('Carlos', 'Rodríguez', 'carlos.rodriguez@jpbarber.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '3007654321', 'Barbería y diseño de barba', true, 8),
  ('Miguel', 'Sánchez', 'miguel.sanchez@jpbarber.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '3009876543', 'Cortes fade y afeitado', true, 3)
ON CONFLICT (email) DO NOTHING;

-- Insertar servicios de ejemplo
INSERT INTO public.servicios (nombre, descripcion, precio, duracion_minutos, categoria, activo, orden)
VALUES
  ('Corte de Cabello Clásico', 'Corte tradicional con tijera y máquina', 25000, 30, 'Cortes', true, 1),
  ('Corte + Barba', 'Corte de cabello más arreglo de barba', 35000, 45, 'Cortes', true, 2),
  ('Fade Degradado', 'Corte fade profesional con degradado', 30000, 40, 'Cortes', true, 3),
  ('Diseño de Barba', 'Perfilado y diseño de barba', 15000, 20, 'Barba', true, 4),
  ('Afeitado Clásico', 'Afeitado tradicional con navaja', 20000, 25, 'Barba', true, 5),
  ('Tratamiento Capilar', 'Tratamiento hidratante para el cabello', 40000, 30, 'Tratamientos', true, 6)
ON CONFLICT DO NOTHING;

-- ========================================
-- PARTE 5: FUNCIONES ÚTILES
-- ========================================

-- Función para generar número de turno del día
CREATE OR REPLACE FUNCTION get_next_turn_number(fecha DATE)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(turn_number), 0) + 1
  INTO next_num
  FROM public.daily_turns
  WHERE turn_date = fecha;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- RESUMEN
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONFIGURACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  - usuarios';
  RAISE NOTICE '  - barberos';
  RAISE NOTICE '  - clientes';
  RAISE NOTICE '  - servicios';
  RAISE NOTICE '  - citas';
  RAISE NOTICE '  - daily_turns';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuario administrador creado:';
  RAISE NOTICE '  Email: admin@jpbarber.com';
  RAISE NOTICE '  Password: admin123';
  RAISE NOTICE '  Rol: super_admin';
  RAISE NOTICE '';
  RAISE NOTICE 'Barberos de ejemplo: 3';
  RAISE NOTICE 'Servicios de ejemplo: 6';
  RAISE NOTICE '';
  RAISE NOTICE 'Row Level Security: HABILITADO';
  RAISE NOTICE 'Políticas: CONFIGURADAS PARA DESARROLLO';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Cambiar password del admin en producción';
  RAISE NOTICE '========================================';
END $$;
