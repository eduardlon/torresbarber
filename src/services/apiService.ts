import { supabaseService } from './supabaseService';
import { useAppStore } from '../store/appStore';

// API Service wrapper that now uses Supabase
class ApiService {
  constructor() {
    // No initialization needed - Supabase service handles everything
  }

  // Métodos de autenticación
  async loginCliente(credentials: { email: string; password: string }) {
    return await supabaseService.loginCliente(credentials);
  }

  async loginBarbero(credentials: { email: string; password: string }) {
    return await supabaseService.loginBarbero(credentials);
  }

  async loginAdmin(credentials: { email: string; password: string }) {
    return await supabaseService.loginAdmin(credentials);
  }

  async logout() {
    await supabaseService.logout();
    return { success: true };
  }

  // Métodos para barberos
  async getBarberos() {
    const result = await supabaseService.getBarberos();
    return result;
  }

  async getBarbero(id: number) {
    const result = await supabaseService.getBarbero(id.toString());
    return result;
  }

  // Métodos para servicios
  async getServicios() {
    const result = await supabaseService.getServicios();
    return result;
  }

  async getServicio(id: number) {
    const result = await supabaseService.getServicio(id.toString());
    return result;
  }

  // Métodos para citas
  async getCitas(params?: { barbero_id?: number; fecha?: string }) {
    const filters = {
      barbero_id: params?.barbero_id?.toString(),
      fecha: params?.fecha
    };
    const result = await supabaseService.getCitas(filters);
    return result;
  }

  async getCita(id: number) {
    const result = await supabaseService.getCita(id.toString());
    return result;
  }

  async crearCita(data: {
    cliente_id?: number;
    barbero_id: number;
    servicio_id: number;
    fecha_hora: string;
    notas?: string;
    cliente_nombre?: string;
    cliente_telefono?: string;
    cliente_email?: string;
  }) {
    const appointmentData = {
      ...data,
      barbero_id: data.barbero_id.toString(),
      servicio_id: data.servicio_id.toString(),
      cliente_id: data.cliente_id?.toString()
    };
    const result = await supabaseService.crearCita(appointmentData);
    return result;
  }

  async actualizarCita(id: number, data: Partial<{
    barbero_id: number;
    servicio_id: number;
    fecha_hora: string;
    estado: string;
    notas: string;
  }>) {
    const updateData = {
      ...data,
      barbero_id: data.barbero_id?.toString(),
      servicio_id: data.servicio_id?.toString(),
      status: data.estado
    };
    const result = await supabaseService.actualizarCita(id.toString(), updateData);
    return result;
  }

  async cancelarCita(id: number) {
    const result = await supabaseService.cancelarCita(id.toString());
    return result;
  }

  // Métodos para turnos
  async getTurnos(params?: { barbero_id?: number; fecha?: string }) {
    const response = await this.api.get('/turnos', { params });
    return response.data;
  }

  async getColaPublica() {
    const result = await supabaseService.getColaPublica();
    return result;
  }

  async crearTurno(data: {
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email?: string;
    barbero_id: number;
    servicio_id?: number;
  }) {
    const turnoData = {
      ...data,
      barbero_id: data.barbero_id.toString(),
      servicio_id: data.servicio_id?.toString()
    };
    const result = await supabaseService.crearTurno(turnoData);
    return result;
  }

  async llamarTurno(turno_id: number, barbero_id: number) {
    const result = await supabaseService.llamarTurno(turno_id.toString(), barbero_id.toString());
    return result;
  }

  async completarTurno(turno_id: number) {
    const result = await supabaseService.completarTurno(turno_id.toString());
    return result;
  }

  // Métodos para horarios disponibles
  async getHorariosDisponibles(barberoId: number, fecha: string) {
    // For now, return a default schedule. This could be enhanced with actual availability logic
    return {
      disponibles: [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00'
      ],
      ocupados: []
    };
  }

  // Métodos para el panel del cliente
  async getClientePanel(clienteId: number) {
    const result = await supabaseService.getClientePanel(clienteId.toString());
    return result;
  }

  async agendarCita(data: {
    cliente_id?: number;
    barbero_id: number;
    servicio_id: number;
    fecha_hora: string;
    notas?: string;
    cliente_nombre?: string;
    cliente_telefono?: string;
    cliente_email?: string;
  }) {
    const appointmentData = {
      ...data,
      barbero_id: data.barbero_id.toString(),
      servicio_id: data.servicio_id.toString(),
      cliente_id: data.cliente_id?.toString()
    };
    const result = await supabaseService.agendarCita(appointmentData);
    return result;
  }

  async tomarTurno(data: {
    barbero_id: number;
    servicio_id?: number;
  }) {
    const response = await this.api.post('/cliente/tomar-turno', data);
    return response.data;
  }

  // Métodos para el panel del barbero
  async getBarberoPanel(barberoId: number) {
    const response = await this.api.get(`/barbero/${barberoId}/panel`);
    return response.data;
  }

  async atenderSiguiente(barberoId: number) {
    const response = await this.api.post(`/barbero/${barberoId}/atender-siguiente`);
    return response.data;
  }

  async completarAtencion(barberoId: number, turnoId: number) {
    const response = await this.api.post(`/barbero/${barberoId}/completar/${turnoId}`);
    return response.data;
  }

  // Métodos para el panel de administración
  async getAdminPanel() {
    const response = await this.api.get('/admin/panel');
    return response.data;
  }

  async getEstadisticas(params?: { fecha_inicio?: string; fecha_fin?: string }) {
    const response = await this.api.get('/admin/estadisticas', { params });
    return response.data;
  }

  // Métodos para notificaciones
  async getNotificaciones() {
    const response = await this.api.get('/notificaciones');
    return response.data;
  }

  async marcarNotificacionLeida(id: number) {
    const response = await this.api.put(`/notificaciones/${id}/leida`);
    return response.data;
  }

  // Método genérico para llamadas personalizadas
  async request<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.request({
      method,
      url,
      data,
    });
    return response.data;
  }
}

// Instancia singleton del servicio de API
export const apiService = new ApiService();

// Hook para usar el servicio de API en componentes React
export const useApiService = () => {
  return apiService;
};

// Tipos de respuesta comunes
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Tipos para las entidades
export interface Barbero {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string;
  disponible: boolean;
  avatar?: string;
  telefono?: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion: number; // en minutos
  activo: boolean;
}

export interface Cita {
  id: number;
  cliente_id?: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string;
  barbero_id: number;
  barbero_nombre: string;
  servicio_id: number;
  servicio_nombre: string;
  fecha_hora: string;
  estado: 'pendiente' | 'confirmada' | 'en_progreso' | 'completada' | 'cancelada';
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface Turno {
  id: number;
  numero_turno: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string;
  barbero_id: number;
  barbero_nombre: string;
  servicio_id?: number;
  servicio_nombre?: string;
  estado: 'en_espera' | 'en_progreso' | 'completado' | 'cancelado' | 'no_show';
  tipo: 'cita' | 'walk-in';
  hora_llegada: string;
  tiempo_estimado?: number;
  created_at: string;
  updated_at: string;
}