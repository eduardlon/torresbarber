// Configuración global de la API
// Detectar si estamos en localhost o en la red
const isLocalhostAPI = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const apiHost = isLocalhostAPI ? 'localhost' : window.location.hostname;
window.API_BASE_URL = `http://${apiHost}:8001/api`;

// Configurar la URL base para el servicio de API
if (typeof window !== 'undefined') {
  window.API_CONFIG = {
    baseURL: window.API_BASE_URL,
    timeout: 10000
  };
}

// Funciones de autenticación
window.getAuthToken = function() {
  // Primero intentar localStorage
  let token = localStorage.getItem('auth_token');
  
  // Si no está en localStorage, intentar obtener de cookies
  if (!token) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        token = value;
        // Sincronizar con localStorage
        localStorage.setItem('auth_token', token);
        break;
      }
    }
  }
  
  return token;
};

window.setAuthToken = function(token) {
  localStorage.setItem('auth_token', token);
  
  // También configurar cookie para compatibilidad cross-device
  const expires = new Date();
  expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
  
  // Configuración más permisiva para acceso cross-device
  const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  
  document.cookie = `auth_token=${token}; ${cookieOptions}`;
  
  console.log('Auth token set in localStorage and cookie');
};

window.removeAuthToken = function() {
  localStorage.removeItem('auth_token');
  
  // También eliminar cookies
  const domain = isLocalhostAPI ? '' : `.${window.location.hostname}`;
  
  document.cookie = `auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` Domain=${domain};` : ''}`;
  document.cookie = `barbero_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` Domain=${domain};` : ''}`;
  document.cookie = `admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` Domain=${domain};` : ''}`;
};

// Función para realizar peticiones autenticadas
window.authenticatedFetch = async function(url, options = {}) {
  const token = window.getAuthToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    
    // Si el token ha expirado, redirigir al login apropiado
    if (response.status === 401) {
      window.removeAuthToken();
      // Limpiar cookies también
      document.cookie = 'barbero_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Detectar si es una petición de barbero y redirigir apropiadamente
      if (url.includes('/barbero/')) {
        window.location.href = '/login-barbero';
      } else {
        window.location.href = '/login-admin';
      }
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en la petición:', error);
    throw error;
  }
};

// Función de login
window.login = async function(email, password) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      window.setAuthToken(data.data.token);
      
      // Establecer cookie de sesión de barbero inmediatamente
      const expires = new Date();
      expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
      const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      document.cookie = `barbero_session=authenticated; ${cookieOptions}`;
      document.cookie = `barbero_id=${data.data.barbero.id}; ${cookieOptions}`;
      
      console.log('Barbero login successful, cookies set');
      return { success: true, data: data.data };
    } else {
      return { success: false, message: data.message || 'Error de autenticación' };
    }
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

// Función de logout
window.logout = async function() {
  try {
    await window.authenticatedFetch(`${window.API_BASE_URL}/logout`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error en logout:', error);
  } finally {
    window.removeAuthToken();
    // Limpiar cookies
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login-admin';
  }
};

// Función para verificar si está autenticado
window.isAuthenticated = function() {
  return !!window.getAuthToken();
};

// Funciones específicas para administradores
window.adminLogin = async function(email, password) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      window.setAuthToken(data.token);
      
      // Establecer cookies de sesión de admin inmediatamente
      const expires = new Date();
      expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
      const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      document.cookie = `admin_session=authenticated; ${cookieOptions}`;
      document.cookie = `user_data=${encodeURIComponent(JSON.stringify(data.user))}; ${cookieOptions}`;
      
      console.log('Admin login successful, cookies set');
      return { success: true, data: data };
    } else {
      return { success: false, message: data.message || 'Error de autenticación' };
    }
  } catch (error) {
    console.error('Error en login de admin:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

// Funciones específicas para barberos
window.setBarberoAuthToken = function(token) {
  localStorage.setItem('barbero_auth_token', token);
  
  // También configurar cookie para compatibilidad cross-device
  const expires = new Date();
  expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
  
  const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  
  document.cookie = `barbero_auth_token=${token}; ${cookieOptions}`;
  
  console.log('Barbero auth token set in localStorage and cookie');
};

window.getBarberoAuthToken = function() {
  // Primero intentar localStorage
  let token = localStorage.getItem('barbero_auth_token');
  
  // Verificar que el token no esté vacío
  if (token && token.trim() === '') {
    token = null;
  }
  
  // Si no está en localStorage, intentar obtener de cookies
  if (!token) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'barbero_auth_token' && value && value.trim() !== '') {
        token = value;
        // Sincronizar con localStorage
        localStorage.setItem('barbero_auth_token', token);
        break;
      }
    }
  }
  
  return token;
};

window.barberoLogin = async function(usuario, password) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/barbero/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ usuario, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      window.setBarberoAuthToken(data.data.token);
      
      // Establecer cookies de sesión de barbero inmediatamente
      const expires = new Date();
      expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
      const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      document.cookie = `barbero_session=authenticated; ${cookieOptions}`;
      document.cookie = `barbero_id=${data.data.barbero.id}; ${cookieOptions}`;
      document.cookie = `barbero_data=${encodeURIComponent(JSON.stringify(data.data.barbero))}; ${cookieOptions}`;
      
      console.log('Barbero login successful, cookies set');
      return { success: true, data: data.data };
    } else {
      return { success: false, message: data.message || 'Error de autenticación' };
    }
  } catch (error) {
    console.error('Error en login de barbero:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

window.removeBarberoAuthToken = function() {
  localStorage.removeItem('barbero_auth_token');
  
  // También eliminar cookies
  const domain = isLocalhostAPI ? '' : `.${window.location.hostname}`;
  
  document.cookie = `barbero_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` Domain=${domain};` : ''}`;
  document.cookie = `barbero_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` Domain=${domain};` : ''}`;
  document.cookie = `barbero_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` Domain=${domain};` : ''}`;
  document.cookie = `barbero_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` Domain=${domain};` : ''}`;
};

window.authenticatedBarberoFetch = async function(url, options = {}) {
  const token = window.getBarberoAuthToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    
    // Si el token ha expirado, redirigir al login de barbero
    if (response.status === 401 || response.status === 403) {
      window.removeBarberoAuthToken();
      window.location.href = '/login-barbero';
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en la petición de barbero:', error);
    throw error;
  }
};

window.barberoLogout = async function() {
  try {
    await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/logout`, {
      method: 'POST'
    });
    window.removeBarberoAuthToken();
    return { success: true };
  } catch (error) {
    console.error('Error en logout de barbero:', error);
    window.removeBarberoAuthToken();
    return { success: false, message: 'Error al cerrar sesión' };
  }
};

window.getBarberoInfo = async function() {
  try {
    const response = await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/me`);
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener info del barbero:', error);
    return null;
  }
};

window.getBarberoStats = async function() {
  try {
    const response = await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/stats`);
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return null;
  }
};

window.getBarberoCitas = async function(fecha = null) {
  try {
    const url = fecha ? `${window.API_BASE_URL}/barbero/citas?fecha=${fecha}` : `${window.API_BASE_URL}/barbero/citas`;
    const response = await window.authenticatedBarberoFetch(url);
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return null;
  }
};

window.updateCitaStatus = async function(citaId, estado) {
  try {
    const response = await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/citas/${citaId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estado })
    });
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    return null;
  }
};

window.createVenta = async function(ventaData) {
  try {
    const response = await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/ventas`, {
      method: 'POST',
      body: JSON.stringify(ventaData)
    });
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al crear venta:', error);
    return null;
  }
};

window.getProductos = async function() {
  try {
    const response = await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/productos`);
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return null;
  }
};

window.getServicios = async function() {
  try {
    const response = await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/servicios`);
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    return null;
  }
};

window.isBarberoAuthenticated = function() {
  return !!window.getBarberoAuthToken();
};

window.verifyBarberoToken = async function() {
  try {
    const response = await window.authenticatedBarberoFetch(`${window.API_BASE_URL}/barbero/verify-token`);
    return response && response.ok;
  } catch (error) {
    return false;
  }
};

// Funciones adicionales para el sistema de turnos (mantenidas para compatibilidad)
window.getAllBarberos = async function() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/barberos-publicos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    if (response && response.ok) {
      const data = await response.json();
      if (data.success) {
        return { barberos: data.data };
      }
      return { barberos: [] };
    }
    return { barberos: [] };
  } catch (error) {
    console.error('Error al obtener todos los barberos:', error);
    return { barberos: [] };
  }
};

// Función para obtener servicios públicos
window.getAllServicios = async function() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/servicios-publicos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    if (response && response.ok) {
      const data = await response.json();
      if (data.success) {
        return { servicios: data.data };
      }
      return { servicios: [] };
    }
    return { servicios: [] };
  } catch (error) {
    console.error('Error al obtener todos los servicios:', error);
    return { servicios: [] };
  }
};

window.getCitasByBarberoAndDate = async function(barberoId, fecha) {
  try {
    // Usar endpoint público para obtener citas del barbero
    const response = await fetch(`${window.API_BASE_URL}/barberos-publicos/${barberoId}/citas?fecha=${fecha}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener citas por barbero y fecha:', error);
    return null;
  }
};

// Función para crear una nueva cita desde el sistema de agendamiento
window.createCita = async function(citaData) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/citas-publicas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(citaData)
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const errorData = await response.json();
      console.error('Error del servidor:', errorData);
      return { success: false, message: errorData.message || 'Error al crear la cita' };
    }
  } catch (error) {
    console.error('Error al crear cita:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

// Función para agregar cliente walk-in (alias para compatibilidad)
window.addWalkInClient = window.addWalkInToQueue;

// Función para obtener horarios disponibles de un barbero en una fecha
window.getHorariosDisponibles = async function(barberoId, fecha) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/barberos-publicos/${barberoId}/horarios-disponibles?fecha=${fecha}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return { horarios: [] };
  } catch (error) {
    console.error('Error al obtener horarios disponibles:', error);
    return { horarios: [] };
  }
};

// Función para agregar cliente walk-in a la cola del barbero
window.addWalkInToQueue = async function(walkInData) {
  try {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0].substring(0, 8); // HH:MM:SS
    const fecha_hora = `${fecha} ${hora}`;
    
    const response = await fetch(`${window.API_BASE_URL}/citas-publicas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        cliente_nombre: walkInData.cliente_nombre,
        cliente_telefono: walkInData.cliente_telefono,
        cliente_email: walkInData.cliente_email || null,
        barbero_id: walkInData.barbero_id,
        servicio_id: walkInData.servicio_id || null,
        fecha_hora: fecha_hora,
        estado: 'pendiente',
        notas: walkInData.notas || null,
        tipo: 'walk-in'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const errorData = await response.json();
      console.error('Error del servidor:', errorData);
      return { success: false, message: errorData.message || 'Error al agregar cliente a la cola', errors: errorData.errors };
    }
  } catch (error) {
    console.error('Error al agregar walk-in:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

// Función para obtener la cola actual del barbero
window.getBarberoQueue = async function(barberoId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barbero/citas?fecha=${today}&barbero_id=${barberoId}`);
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return { citas: [] };
  } catch (error) {
    console.error('Error al obtener cola del barbero:', error);
    return { citas: [] };
  }
};

// Función para iniciar corte
window.startCut = async function(citaId) {
  try {
    const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barbero/citas/${citaId}/iniciar`, {
      method: 'PATCH'
    });
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al iniciar corte:', error);
    return null;
  }
};

// Función para finalizar corte
window.finishCut = async function(citaId) {
  try {
    const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barbero/citas/${citaId}/finalizar`, {
      method: 'PATCH'
    });
    if (response && response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error al finalizar corte:', error);
    return null;
  }
};

console.log('API Configuration loaded successfully');