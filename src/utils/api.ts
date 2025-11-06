// Utilidades para llamadas a API - Actualizado
const API_BASE_URL = typeof window !== 'undefined' 
  ? `http://${window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname}:8001/api`
  : 'http://localhost:8001/api';

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('barbero_token') || getCookie('auth_token');
};

export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// API de Barberos
export const getBarberoStats = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/barbero/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar estadísticas');
  }
  
  return response.json();
};

export const getBarberoInfo = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/barbero/info`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar información del barbero');
  }
  
  return response.json();
};

// API de Servicios
export const getServicios = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/servicios`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar servicios');
  }
  
  return response.json();
};

// API de Productos
export const getProductos = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/productos`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar productos');
  }
  
  return response.json();
};

// API de Citas
export const getCitas = async (fecha: string) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/barbero/citas?fecha=${fecha}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar citas');
  }
  
  return response.json();
};

// API de Cola
export const getBarberoQueue = async (barberoId: number) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/barbero/cola?barbero_id=${barberoId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar cola');
  }
  
  return response.json();
};

// API de Ventas
export const getVentas = async (fechaInicio?: string, fechaFin?: string) => {
  const token = getAuthToken();
  let url = `${API_BASE_URL}/barbero/ventas`;
  const params = new URLSearchParams();
  
  if (fechaInicio) params.append('fecha_inicio', fechaInicio);
  if (fechaFin) params.append('fecha_fin', fechaFin);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar ventas');
  }
  
  return response.json();
};

// API pública (sin autenticación)
export const getBarberosDisponibles = async () => {
  const response = await fetch(`${API_BASE_URL}/barberos/disponibles`);
  
  if (!response.ok) {
    throw new Error('Error al cargar barberos disponibles');
  }
  
  return response.json();
};

export const getServiciosPublico = async () => {
  const response = await fetch(`${API_BASE_URL}/servicios/publico`);
  
  if (!response.ok) {
    throw new Error('Error al cargar servicios');
  }
  
  return response.json();
};

export const agendarCita = async (citaData: any) => {
  const response = await fetch(`${API_BASE_URL}/citas/agendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(citaData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al agendar cita');
  }
  
  return response.json();
};

/**
 * Obtener horas disponibles para una fecha y barbero específico
 * @param fecha - Fecha en formato YYYY-MM-DD
 * @param barberoId - ID del barbero
 * @returns Lista de horas disponibles
 */
export const getHorasDisponibles = async (fecha: string, barberoId: number) => {
  const params = new URLSearchParams({
    fecha: fecha,
    barbero_id: barberoId.toString()
  });

  const response = await fetch(`${API_BASE_URL}/horas-disponibles?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cargar horas disponibles');
  }
  
  const data = await response.json();
  return data.data; // Retornar solo el array de horas
};

