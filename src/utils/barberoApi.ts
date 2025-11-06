// Utilidades para llamadas API del barbero

const API_BASE_URL = '/api';

// Obtener token de autenticación
const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie.split('; ').find(row => row.startsWith('auth_token='));
  return cookie ? cookie.split('=')[1] : null;
};

// Headers comunes con autenticación
const getHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Obtener estadísticas del barbero
export const getBarberoStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/barbero/stats`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al obtener estadísticas del barbero:', error);
    return {
      success: false,
      error: 'Error de conexión',
      stats: {
        ventas_hoy: 0,
        ventas_semana: 0,
        citas_hoy: 0,
        citas_semana: 0,
        citas_pendientes: 0,
        ganancias_dia: 0,
        ganancias_semana: 0,
        ganancias_mes: 0,
        citas_dia: 0,
        citas_mes: 0,
        ventas_dia: 0,
        ventas_mes: 0,
        servicios_populares: [],
        productos_vendidos: [],
        horarios_ocupados: []
      }
    };
  }
};

// Obtener servicios
export const getServicios = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/servicios`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      servicios: data.data || []
    };
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    return {
      success: false,
      error: 'Error de conexión',
      servicios: []
    };
  }
};

// Obtener productos
export const getProductos = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/productos`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      productos: data.data || []
    };
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return {
      success: false,
      error: 'Error de conexión',
      productos: []
    };
  }
};

// Obtener ventas del barbero
export const getVentas = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/barbero/ventas`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      ventas: data.data || []
    };
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return {
      success: false,
      error: 'Error de conexión',
      ventas: []
    };
  }
};

// Crear nueva venta
export const createVenta = async (ventaData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ventas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ventaData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al crear venta:', error);
    return {
      success: false,
      error: 'Error de conexión',
      message: 'No se pudo registrar la venta'
    };
  }
};

// Obtener citas del barbero
export const getCitas = async (fecha?: string) => {
  try {
    const url = fecha 
      ? `${API_BASE_URL}/barbero/citas?fecha=${fecha}`
      : `${API_BASE_URL}/barbero/citas`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      citas: data.data || []
    };
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return {
      success: false,
      error: 'Error de conexión',
      citas: []
    };
  }
};

// Obtener cola de turnos del barbero
export const getTurnosCola = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/barbero/cola`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    return {
      success: false,
      error: 'Error de conexión',
      turnos: []
    };
  }
};

// Cambiar estado de turno
export const cambiarEstadoTurno = async (turnoId: number, nuevoEstado: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/turnos/${turnoId}/estado`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ estado: nuevoEstado })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al cambiar estado de turno:', error);
    return {
      success: false,
      error: 'Error de conexión'
    };
  }
};

// Agregar turno walk-in
export const agregarTurno = async (turnoData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/turnos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(turnoData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al agregar turno:', error);
    return {
      success: false,
      error: 'Error de conexión'
    };
  }
};
