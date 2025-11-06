// Tipos globales para la aplicación de barbería JP Barber

// ===== TIPOS BASE =====

export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: {
    total?: number;
    per_page?: number;
    current_page?: number;
    last_page?: number;
  };
}

// ===== TIPOS DE USUARIO =====

export interface Usuario extends BaseEntity {
  name: string;
  email: string;
  role: 'admin' | 'barbero' | 'cliente';
  activo: boolean;
  email_verified_at?: string;
}

export interface Barbero extends BaseEntity {
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  usuario: string;
  especialidad?: string;
  descripcion?: string;
  foto?: string;
  activo: boolean;
  fechaIngreso?: string;
  // Campos calculados
  ventasHoy?: number;
  clientesHoy?: number;
  calificacion?: number;
  especialidades?: string[];
  avatar?: string;
}

export interface Cliente extends BaseEntity {
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  fecha_nacimiento?: string;
  genero?: 'masculino' | 'femenino' | 'otro';
  notas?: string;
  cortes_realizados: number;
  cortes_gratis_disponibles: number;
  descuento_referido: number;
  referidos_exitosos: number;
  activo: boolean;
  ultimo_corte?: string;
  // Campos calculados
  fechaRegistro?: string;
  ultimaVisita?: string;
  totalVisitas?: number;
  serviciosFavoritos?: string[];
  nombre_completo?: string;
}

export interface Invitado extends BaseEntity {
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  total_visitas: number;
  primera_visita?: string;
  ultima_visita?: string;
  activo: boolean;
  // Campos calculados
  nombre_completo?: string;
}

// ===== TIPOS DE NEGOCIO =====

export interface Producto extends BaseEntity {
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  imagen?: string;
  activo: boolean;
  // Campos calculados
  ventasHoy?: number;
  categoria?: string;
}

export interface Servicio extends BaseEntity {
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion_minutos: number;
  imagen?: string;
  activo: boolean;
  // Campos calculados
  duracion?: number;
  categoria?: string;
  base_duration?: number;
}

export interface Cita extends BaseEntity {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string;
  barbero_id: number;
  servicio_id: number;
  fecha_hora: string;
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'completada' | 'cancelada';
  estimated_duration?: number;
  start_time?: string;
  end_time?: string;
  actual_duration?: number;
  precio?: number;
  hora_inicio?: string;
  hora_fin?: string;
  notas?: string;
  tipo?: 'cita' | 'walk-in';
  // Relaciones
  barbero?: Barbero;
  servicio?: Servicio;
  // Campos calculados
  cliente?: string;
  fecha?: string;
  hora?: string;
}

export interface DailyTurn extends BaseEntity {
  turn_number: number;
  appointment_id?: number;
  client_type: 'cliente' | 'invitado';
  cliente_id?: number;
  invitado_id?: number;
  service_id?: number;
  barber_id: number;
  type: 'cita' | 'sin_cita';
  status: 'en_espera' | 'llamado' | 'en_progreso' | 'finalizando' | 'completado' | 'cancelado' | 'no_show';
  priority?: number;
  scheduled_time?: string;
  estimated_duration?: number;
  start_time?: string;
  end_time?: string;
  called_at?: string;
  actual_duration?: number;
  notes?: string;
  turn_date: string;
  line_options?: any;
  descuento_aplicado?: number;
  tipo_descuento?: string;
  // Relaciones
  barber?: Barbero;
  service?: Servicio;
  appointment?: Cita;
  cliente?: Cliente;
  invitado?: Invitado;
  // Campos calculados
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  client_info?: any;
  estimated_wait_time?: number;
  status_text?: string;
  service_name?: string;
  service_price?: number;
  service_duration?: number;
}

export interface Venta extends BaseEntity {
  barbero_id: number;
  cliente_id?: number;
  cliente_nombre?: string;
  total: number;
  propina?: number;
  estado: 'pendiente' | 'completada' | 'cancelada';
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia';
  notas?: string;
  // Relaciones
  barbero?: Barbero;
  cliente?: Cliente;
  detalles?: VentaDetalle[];
  // Campos calculados
  fecha?: string;
  productos?: {
    id: number;
    nombre: string;
    cantidad: number;
    precio: number;
  }[];
  servicios?: {
    id: number;
    nombre: string;
    precio: number;
  }[];
  metodoPago?: 'efectivo' | 'tarjeta' | 'transferencia';
}

export interface VentaDetalle extends BaseEntity {
  venta_id: number;
  producto_id?: number;
  servicio_id?: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  // Relaciones
  producto?: Producto;
  servicio?: Servicio;
}

export interface Gasto extends BaseEntity {
  descripcion: string;
  monto: number;
  categoria: string;
  fecha: string;
}

// ===== TIPOS DE GALERÍA =====

export interface ImagenGaleria extends BaseEntity {
  titulo: string;
  descripcion?: string;
  imagen: string;
  activo: boolean;
  // Campos calculados
  url?: string;
  fechaSubida?: string;
}

export interface Gorra extends BaseEntity {
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenes?: string[] | string;
  activo: boolean;
}

export interface Corte extends BaseEntity {
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenes?: string[] | string;
  activo: boolean;
}

export interface ImagenProducto extends ImagenGaleria {
  categoria: string;
}

export interface ImagenTrabajo extends ImagenGaleria {
  barbero: string;
  likes: number;
}

// ===== TIPOS DE ESTADÍSTICAS =====

export interface StatsData {
  ventasHoy: number;
  clientesHoy: number;
  ingresosDia: number;
  promedioCalificacion: number;
  productosVendidos: number;
  serviciosRealizados: number;
  barberosMasVentas: string;
  servicioMasPopular: string;
  // Estadísticas adicionales
  citasPendientes?: number;
  citasCompletadas?: number;
  ingresosSemana?: number;
  ingresosMes?: number;
  clientesNuevos?: number;
  productosStockBajo?: number;
}

export interface PerformanceData {
  barbero: string;
  barbero_id?: number;
  ventas: number;
  clientes: number;
  calificacion: number;
  ingresos: number;
  meta: number;
  progreso: number;
  // Datos adicionales
  servicios_realizados?: number;
  productos_vendidos?: number;
  tiempo_promedio_servicio?: number;
  satisfaccion_cliente?: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface DashboardStatsBasic {
  general: StatsData;
  barberos: PerformanceData[];
  ventas_por_dia: ChartData;
  servicios_populares: ChartData;
  ingresos_mensuales: ChartData;
  clientes_nuevos: ChartData;
}

// ===== TIPOS DE FORMULARIOS =====

export interface LoginFormData {
  email?: string;
  usuario?: string;
  password: string;
}

export interface CitaFormData {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string;
  barbero_id: number;
  servicio_id: number;
  fecha_hora: string;
  notas?: string;
}

export interface VentaFormData {
  cliente_id?: number;
  cliente_nombre?: string;
  productos: {
    id: number;
    cantidad: number;
    precio: number;
  }[];
  servicios: {
    id: number;
    precio: number;
  }[];
  propina?: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  notas?: string;
}

export interface TurnFormData {
  service_id: number;
  barber_id: number;
  client_type: 'cliente' | 'invitado';
  cliente_id?: number;
  invitado_id?: number;
  invitado_data?: {
    nombre: string;
    apellido?: string;
    telefono: string;
    email?: string;
  };
  notes?: string;
  descuento_aplicado?: number;
  tipo_descuento?: string;
}

// ===== TIPOS DE FILTROS =====

export interface DateRange {
  start: string;
  end: string;
}

export interface HistorialFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  barbero_id?: number;
  cliente_id?: number;
  tipo?: 'cita' | 'venta' | 'turno';
  estado?: string;
  page?: number;
  per_page?: number;
}

export interface VentasFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  barbero_id?: number;
  cliente_id?: number;
  estado?: 'pendiente' | 'completada' | 'cancelada';
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia';
  page?: number;
  per_page?: number;
}

// ===== TIPOS DE UI =====

export type TabType = 'productos' | 'servicios';
export type GalleryTabType = 'productos' | 'trabajos';
export type ModalType = 'producto' | 'trabajo' | 'servicio' | 'cita' | 'venta' | 'turno';
export type SectionType = 'dashboard' | 'barberos' | 'productos' | 'galeria' | 'citas' | 'historial' | 'ventas' | 'turnos';
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ModalConfig {
  type: ModalType;
  title: string;
  message?: string;
  data?: any;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface NotificationConfig {
  id?: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PaginationInfo {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// ===== TIPOS DE HOOKS =====

export interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface UseApiReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

// ===== TIPOS DE CONTEXTO =====

export interface AuthContextType {
  user: Usuario | null;
  barbero: Barbero | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBarbero: boolean;
  login: (credentials: LoginFormData) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export interface AppContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  notifications: NotificationConfig[];
  addNotification: (notification: Omit<NotificationConfig, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// ===== TIPOS DE CONFIGURACIÓN =====

export interface AppConfig {
  name: string;
  version: string;
  description: string;
  apiBaseUrl: string;
  apiHost: string;
  apiPort: number;
  isLocalhost: boolean;
  auth: {
    tokenKey: string;
    barberoTokenKey: string;
    sessionCookie: string;
    barberoSessionCookie: string;
  };
  queue: {
    refreshInterval: number;
    maxWaitTime: number;
    defaultServiceDuration: number;
  };
  notifications: {
    duration: number;
    position: string;
  };
  pwa: {
    name: string;
    shortName: string;
    description: string;
    themeColor: string;
    backgroundColor: string;
  };
}

// ===== EXPORTACIONES ADICIONALES =====

export type ID = number | string;
export type Timestamp = string;
export type Currency = number;
export type Percentage = number;

// Tipos de utilidad
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// Tipos para formularios
export type FormErrors<T> = {
  [K in keyof T]?: string;
};

export type FormState<T> = {
  values: T;
  errors: FormErrors<T>;
  touched: { [K in keyof T]?: boolean };
  isValid: boolean;
  isSubmitting: boolean;
};

// Tipos para tablas
export type SortDirection = 'asc' | 'desc';
export type SortConfig<T> = {
  key: keyof T;
  direction: SortDirection;
};

// Tipos para búsqueda
export interface SearchConfig {
  query: string;
  filters: Record<string, any>;
  sort: {
    field: string;
    direction: SortDirection;
  };
  pagination: {
    page: number;
    limit: number;
  };
}

// ===== TIPOS DE DASHBOARD AVANZADO =====

export interface DashboardStats {
  ingresos_totales: number;
  gastos_totales: number;
  ganancias_netas: number;
  citas_totales: number;
  citas_completadas: number;
  citas_canceladas: number;
  tasa_completadas: number;
  productos_vendidos: number;
  servicios_realizados: number;
  clientes_atendidos: number;
  clientes_nuevos: number;
  barberos_activos: number;
  ingresos_productos: number;
  ingresos_servicios: number;
  variacion_ingresos: number;
  variacion_citas: number;
  variacion_clientes: number;
  ticket_promedio: number;
  servicios_por_dia: number;
  margen_ganancia: number;
}

export interface DashboardResumen {
  ganancias_netas: number;
  margen_ganancia: number;
  ticket_promedio: number;
  servicios_por_dia: number;
  eficiencia_general: number;
  satisfaccion_promedio: number;
  crecimiento_mensual: number;
  retencion_clientes: number;
}

export interface DashboardIngresos {
  total: number;
  por_dia: Array<{
    fecha: string;
    ingresos: number;
    gastos: number;
    ganancia: number;
  }>;
  por_categoria: {
    servicios: number;
    productos: number;
    propinas: number;
  };
  por_barbero: Array<{
    barbero_id: number;
    nombre: string;
    ingresos: number;
    porcentaje: number;
  }>;
  comparacion_periodo_anterior: {
    diferencia: number;
    porcentaje: number;
  };
}

export interface DashboardCitas {
  total: number;
  completadas: number;
  canceladas: number;
  pendientes: number;
  tasa_completadas: number;
  tasa_canceladas: number;
  proximas: Array<{
    id: number;
    cliente_nombre: string;
    barbero_nombre: string;
    servicio_nombre: string;
    fecha_hora: string;
    hora: string;
    estado: string;
  }>;
  por_barbero: Array<{
    barbero_id: number;
    nombre: string;
    total: number;
    completadas: number;
    eficiencia: number;
  }>;
  por_servicio: Array<{
    servicio_id: number;
    nombre: string;
    total: number;
    ingresos: number;
  }>;
}

export interface DashboardProductos {
  total_vendidos: number;
  ingresos_totales: number;
  mas_vendidos: Array<{
    producto_id: number;
    nombre: string;
    cantidad: number;
    ingresos: number;
  }>;
  stock_bajo: Array<{
    producto_id: number;
    nombre: string;
    stock: number;
    stock_minimo: number;
  }>;
  por_categoria: Array<{
    categoria: string;
    cantidad: number;
    ingresos: number;
  }>;
  valor_inventario: number;
}

export interface DashboardBarberos {
  total_activos: number;
  ranking: Array<{
    barbero_id: number;
    nombre: string;
    citas_completadas: number;
    ingresos: number;
    eficiencia: number;
    calificacion: number;
    clientes_unicos: number;
  }>;
  rendimiento: Array<{
    barbero_id: number;
    nombre: string;
    horas_trabajadas: number;
    servicios_por_hora: number;
    tiempo_promedio_servicio: number;
    satisfaccion_cliente: number;
  }>;
  comparacion: Array<{
    barbero_id: number;
    nombre: string;
    periodo_actual: number;
    periodo_anterior: number;
    crecimiento: number;
  }>;
}

export interface DashboardClientes {
  total_registrados: number;
  nuevos_periodo: number;
  activos_periodo: number;
  recurrentes: number;
  tasa_retencion: number;
  valor_promedio_cliente: number;
  top_clientes: Array<{
    cliente_id: number;
    nombre: string;
    total_gastado: number;
    visitas: number;
    ultima_visita: string;
  }>;
  distribucion_frecuencia: {
    una_vez: number;
    ocasionales: number;
    regulares: number;
    frecuentes: number;
  };
  crecimiento_mensual: number;
}

export interface DashboardTurnos {
  total_hoy: number;
  en_espera: number;
  llamados: number;
  en_progreso: number;
  completados: number;
  cancelados: number;
  tiempo_espera_promedio: number;
  eficiencia_turnos: number;
  por_barbero: Array<{
    barbero_id: number;
    nombre: string;
    turnos_asignados: number;
    turnos_completados: number;
    tiempo_promedio: number;
  }>;
  distribucion_por_hora: Array<{
    hora: string;
    cantidad: number;
  }>;
}

// ===== TIPOS DE ESTADÍSTICAS AVANZADAS =====

export interface EstadisticasGenerales {
  ingresos: number;
  gastos: number;
  ganancias: number;
  margen_ganancia: number;
  citas_total: number;
  citas_completadas: number;
  tasa_completadas: number;
  clientes_atendidos: number;
  productos_vendidos: number;
  servicios_realizados: number;
  barberos_activos: number;
  clientes_registrados: number;
  clientes_nuevos: number;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface EstadisticasBarbero {
  barbero_id: number;
  nombre: string;
  ingresos: number;
  propinas: number;
  total_ganancias: number;
  citas_total: number;
  citas_completadas: number;
  citas_canceladas: number;
  tasa_completadas: number;
  clientes_unicos: number;
  productos_vendidos: number;
  servicios_realizados: number;
  promedio_por_cita: number;
  tiempo_promedio: number;
  eficiencia: number;
}

export interface EstadisticasClientes {
  clientes_nuevos: number;
  clientes_activos: number;
  clientes_recurrentes: number;
  tasa_retencion: number;
  valor_promedio: number;
  distribucion_frecuencia: {
    una_vez: number;
    recurrentes: number;
    frecuentes: number;
  };
  top_clientes: Array<{
    nombre: string;
    total_gastado: number;
    visitas: number;
  }>;
  cliente_especifico?: {
    id: number;
    nombre: string;
    telefono: string;
    email: string;
    fecha_registro: string;
    citas_total: number;
    citas_completadas: number;
    ventas_total: number;
    gasto_total: number;
    gasto_promedio: number;
    cortes_realizados: number;
    cortes_gratis_disponibles: number;
    ultimo_corte: string;
  };
}

export interface EstadisticasFinancieras {
  ingresos_por_dia: Array<{
    fecha: string;
    ingresos: number;
  }>;
  ingresos_por_categoria: {
    servicios: number;
    productos: number;
  };
  gastos_por_categoria: Record<string, number>;
  flujo_caja: Array<{
    fecha: string;
    ingresos: number;
    gastos: number;
    balance: number;
  }>;
  rentabilidad: {
    ingresos: number;
    gastos: number;
    ganancias: number;
    margen: number;
    roi: number;
  };
}

export interface EstadisticasServicios {
  servicios_populares: Array<{
    nombre: string;
    precio: number;
    total: number;
    ingresos: number;
  }>;
  ingresos_por_servicio: Array<{
    nombre: string;
    ingresos: number;
  }>;
  duracion_promedio: Array<{
    nombre: string;
    duracion: number;
  }>;
}

export interface EstadisticasProductos {
  productos_mas_vendidos: Array<{
    nombre: string;
    precio: number;
    cantidad: number;
    ingresos: number;
  }>;
  ingresos_por_producto: Array<{
    nombre: string;
    ingresos: number;
  }>;
  productos_stock_bajo: Array<{
    id: number;
    nombre: string;
    stock: number;
    precio: number;
  }>;
  valor_inventario: number;
}

export interface EstadisticasComparativas {
  ingresos: {
    periodo1: number;
    periodo2: number;
    diferencia: number;
    porcentaje: number;
  };
  citas: {
    periodo1: number;
    periodo2: number;
    diferencia: number;
    porcentaje: number;
  };
  clientes: {
    periodo1: number;
    periodo2: number;
    diferencia: number;
    porcentaje: number;
  };
  productos: {
    periodo1: number;
    periodo2: number;
    diferencia: number;
    porcentaje: number;
  };
  periodos: {
    periodo1: {
      nombre: string;
      fecha_inicio: string;
      fecha_fin: string;
    };
    periodo2: {
      nombre: string;
      fecha_inicio: string;
      fecha_fin: string;
    };
  };
}

export interface EstadisticasRendimiento {
  tiempo_promedio_servicio: Array<{
    barbero: string;
    tiempo_promedio: number;
  }>;
  eficiencia_barberos: Array<{
    barbero: string;
    citas_total: number;
    citas_completadas: number;
    eficiencia: number;
  }>;
  tasa_conversion_citas: number;
  tasa_cancelacion: number;
}

// ===== TIPOS DE HISTORIAL AVANZADO =====

export interface HistorialItem {
  id: number;
  tipo: 'venta' | 'cita' | 'turno';
  fecha: string;
  barbero: string;
  cliente: string;
  servicio?: string;
  total?: number;
  estado: string;
  detalles?: any;
}

export interface HistorialVenta {
  id: number;
  fecha: string;
  barbero: string;
  cliente: string;
  total: number;
  propina: number;
  metodo_pago: string;
  estado: string;
  detalles: Array<{
    tipo: 'producto' | 'servicio';
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }>;
}

export interface HistorialCita {
  id: number;
  fecha: string;
  barbero: string;
  cliente: string;
  telefono: string;
  servicio: string;
  precio: number;
  duracion: number;
  estado: string;
  notas: string;
  created_at: string;
}

export interface HistorialTurno {
  id: number;
  numero: number;
  fecha: string;
  barbero: string;
  cliente: string;
  telefono: string;
  servicio: string;
  precio: number;
  estado: string;
  tipo: string;
  client_type: string;
  created_at: string;
  called_at?: string;
  completed_at?: string;
}

export interface HistorialDetalle {
  venta?: {
    id: number;
    fecha: string;
    barbero: {
      id: number;
      nombre: string;
    };
    cliente: {
      id?: number;
      nombre: string;
      telefono: string;
      email?: string;
    };
    subtotal: number;
    descuento: number;
    total: number;
    propina: number;
    metodo_pago: string;
    estado: string;
    notas: string;
    detalles: Array<{
      id: number;
      tipo: 'producto' | 'servicio';
      item_id: number;
      nombre: string;
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
    }>;
  };
  cita?: {
    id: number;
    fecha_hora: string;
    barbero: {
      id: number;
      nombre: string;
      telefono: string;
    };
    cliente: {
      id?: number;
      nombre: string;
      telefono: string;
      email?: string;
    };
    servicio: {
      id: number;
      nombre: string;
      descripcion: string;
      precio: number;
      duracion_minutos: number;
    };
    estado: string;
    notas: string;
    created_at: string;
    updated_at: string;
  };
}

export interface HistorialEstadisticas {
  ventas: {
    total: number;
    ingresos: number;
    propinas: number;
    promedio: number;
  };
  citas: {
    total: number;
    completadas: number;
    canceladas: number;
    tasa_completadas: number;
  };
  turnos: {
    total: number;
    completados: number;
    tasa_completados: number;
  };
  clientes_unicos: number;
  periodo: {
    inicio: string;
    fin: string;
  };
}