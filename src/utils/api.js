import { APP_CONFIG, getApiUrl, getApiHeaders, clearAuthCookies, setAuthCookies } from './config.js';

// Configuración de la API usando configuración centralizada
const API_BASE_URL = getApiUrl();

// Función para obtener el token de autenticación
const getAuthToken = () => {
  return localStorage.getItem(APP_CONFIG.auth.tokenKey);
};

// Función para establecer el token de autenticación
const setAuthToken = (token) => {
  localStorage.setItem(APP_CONFIG.auth.tokenKey, token);
  setAuthCookies(token, 'admin');
};

// Función para eliminar el token de autenticación
const removeAuthToken = () => {
  localStorage.removeItem(APP_CONFIG.auth.tokenKey);
  clearAuthCookies();
};

// Función para realizar peticiones autenticadas
const authenticatedFetch = async (url, options = {}) => {
  // Usar headers centralizados
  const headers = getApiHeaders(true, options.headers);
  
  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Si la respuesta es 401, el token ha expirado
    if (response.status === 401) {
      removeAuthToken();
      // Redirigir al login si es necesario
      window.location.href = '/login';
      return null;
    }

    return response;
  } catch (error) {
    console.error('Error en la petición:', error);
    throw error;
  }
};

// Función para login
const login = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      setAuthToken(data.token);
      return { success: true, data: data.user };
    } else {
      return { success: false, message: data.message || 'Error en el login' };
    }
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

// Función para logout
const logout = async () => {
  try {
    await authenticatedFetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error en logout:', error);
  } finally {
    removeAuthToken();
    window.location.href = '/login';
  }
};

// Verificar si el usuario está autenticado
const isAuthenticated = () => {
  return !!getAuthToken();
};

// Función para obtener barberos disponibles (sin autenticación)
const getBarberosDisponibles = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/barberos-publicos`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    return data.data || data.barberos || [];
  } catch (error) {
    console.error('Error obteniendo barberos:', error);
    throw error;
  }
};

// Función para obtener servicios públicos (sin autenticación)
const getServiciosPublico = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/servicios`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    return data.data || data.servicios || [];
  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    throw error;
  }
};

// Función para agendar cita (sin autenticación)
const agendarCita = async (citaData) => {
  try {
    console.log('%c=== ENVIANDO AL BACKEND ===', 'color: blue; font-weight: bold');
    console.log('Datos completos:', JSON.stringify(citaData, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/citas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(citaData),
    });
    
    const data = await response.json();
    
    console.log('%c=== RESPUESTA DEL BACKEND ===', 'color: ' + (response.ok ? 'green' : 'red') + '; font-weight: bold');
    console.log('Status:', response.status, response.statusText);
    console.log('Respuesta completa:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      // Mostrar errores de validación si existen
      if (data.errors) {
        console.error('Errores de validación:', data.errors);
        const errorMessages = Object.values(data.errors).flat().join(', ');
        throw new Error(errorMessages);
      }
      console.error('Error del servidor:', data.message);
      throw new Error(data.message || 'Datos inválidos');
    }
    
    console.log('%c✅ CITA AGENDADA EXITOSAMENTE', 'color: green; font-weight: bold');
    return data;
  } catch (error) {
    console.error('%c❌ ERROR AL AGENDAR', 'color: red; font-weight: bold');
    console.error('Detalles del error:', error);
    throw error;
  }
};

// Función para obtener horarios disponibles de un barbero
const getHorariosDisponibles = async (barberoId, fecha) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/barberos-publicos/${barberoId}/horarios-disponibles?fecha=${fecha}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );
    const data = await response.json();
    return data.data || data.horarios || [];
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    throw error;
  }
};

// Exportar funciones y configuración
export {
  API_BASE_URL,
  authenticatedFetch,
  login,
  logout,
  isAuthenticated,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getBarberosDisponibles,
  getServiciosPublico,
  agendarCita,
  getHorariosDisponibles,
};

// Hacer disponibles globalmente para componentes que las necesiten
if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
  window.authenticatedFetch = authenticatedFetch;
  window.login = login;
  window.logout = logout;
  window.isAuthenticated = isAuthenticated;
}