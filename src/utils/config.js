// Configuración centralizada de la aplicación

/**
 * Detecta el entorno y configura las URLs apropiadas
 */
export const getApiConfig = () => {
  // Detectar si estamos en el navegador
  if (typeof window === 'undefined') {
    return {
      apiBaseUrl: 'http://localhost:8001/api',
      apiHost: 'localhost',
      apiPort: 8001
    };
  }

  // Detectar si estamos en localhost
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  // Configurar host según el entorno
  const apiHost = isLocalhost ? 'localhost' : window.location.hostname;
  const apiPort = 8001;
  const apiBaseUrl = `http://${apiHost}:${apiPort}/api`;

  return {
    apiBaseUrl,
    apiHost,
    apiPort,
    isLocalhost
  };
};

/**
 * Configuración de la aplicación
 */
export const APP_CONFIG = {
  name: 'JP Barber',
  version: '1.0.0',
  description: 'Sistema de gestión para barbería profesional',
  
  // URLs de la API
  ...getApiConfig(),
  
  // Configuración de autenticación
  auth: {
    tokenKey: 'auth_token',
    barberoTokenKey: 'barbero_auth_token',
    sessionCookie: 'admin_session',
    barberoSessionCookie: 'barbero_session'
  },
  
  // Configuración de la cola de turnos
  queue: {
    refreshInterval: 5000, // 5 segundos
    maxWaitTime: 180, // 3 horas en minutos
    defaultServiceDuration: 30 // minutos
  },
  
  // Configuración de notificaciones
  notifications: {
    duration: 5000, // 5 segundos
    position: 'top-right'
  },
  
  // Configuración de la PWA
  pwa: {
    name: 'JP Barber',
    shortName: 'JP Barber',
    description: 'Sistema de gestión para barbería profesional',
    themeColor: '#1f2937',
    backgroundColor: '#ffffff'
  }
};

const resolveSupabaseProjectRef = () => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
  if (!supabaseUrl) {
    return undefined;
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0];
  } catch (error) {
    console.warn('No fue posible determinar el project ref de Supabase:', error);
    return undefined;
  }
};

const SUPABASE_PROJECT_REF = resolveSupabaseProjectRef();

/**
 * Función helper para obtener URLs de la API
 */
export const getApiUrl = (endpoint = '') => {
  const config = getApiConfig();
  return endpoint ? `${config.apiBaseUrl}/${endpoint.replace(/^\//, '')}` : config.apiBaseUrl;
};

/**
 * Función helper para configurar headers de peticiones
 */
export const getApiHeaders = (includeAuth = true, customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...customHeaders
  };

  if (includeAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem(APP_CONFIG.auth.tokenKey) || 
                  localStorage.getItem(APP_CONFIG.auth.barberoTokenKey);
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Función para limpiar todas las cookies de autenticación
 */
export const clearAuthCookies = () => {
  if (typeof document === 'undefined') return;
  
  const config = getApiConfig();
  const domain = config.isLocalhost ? '' : `; Domain=.${window.location.hostname}`;
  const cookieOptions = `expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${domain}`;
  
  // Limpiar todas las cookies de autenticación
  document.cookie = `${APP_CONFIG.auth.sessionCookie}=; ${cookieOptions}`;
  document.cookie = `${APP_CONFIG.auth.barberoSessionCookie}=; ${cookieOptions}`;
  document.cookie = `${APP_CONFIG.auth.tokenKey}=; ${cookieOptions}`;
  document.cookie = `barbero_data=; ${cookieOptions}`;
  document.cookie = `user_data=; ${cookieOptions}`;
  document.cookie = `sb-access-token=; ${cookieOptions}`;
  document.cookie = `sb-refresh-token=; ${cookieOptions}`;
  if (SUPABASE_PROJECT_REF) {
    document.cookie = `sb-${SUPABASE_PROJECT_REF}-access-token=; ${cookieOptions}`;
    document.cookie = `sb-${SUPABASE_PROJECT_REF}-refresh-token=; ${cookieOptions}`;
  }
};

/**
 * Función para establecer cookies de autenticación
 */
export const setAuthCookies = (tokenOrSession, userType = 'admin') => {
  if (typeof document === 'undefined') return;
  
  const accessToken = typeof tokenOrSession === 'string'
    ? tokenOrSession
    : tokenOrSession?.accessToken ?? tokenOrSession?.access_token ?? tokenOrSession?.token ?? '';

  const refreshToken = typeof tokenOrSession === 'string'
    ? undefined
    : tokenOrSession?.refreshToken ?? tokenOrSession?.refresh_token ?? undefined;

  const config = getApiConfig();
  const domain = config.isLocalhost ? '' : `; Domain=.${window.location.hostname}`;
  const cookieOptions = `path=/; SameSite=Lax; max-age=86400${domain}`;
  
  // Establecer cookies según el tipo de usuario
  if (accessToken) {
    document.cookie = `${APP_CONFIG.auth.tokenKey}=${accessToken}; ${cookieOptions}`;
    // Cookies compatibles con Supabase SSR helpers
    document.cookie = `sb-access-token=${accessToken}; ${cookieOptions}`;
    if (SUPABASE_PROJECT_REF) {
      document.cookie = `sb-${SUPABASE_PROJECT_REF}-access-token=${accessToken}; ${cookieOptions}`;
    }
  }

  if (refreshToken) {
    document.cookie = `sb-refresh-token=${refreshToken}; ${cookieOptions}`;
    if (SUPABASE_PROJECT_REF) {
      document.cookie = `sb-${SUPABASE_PROJECT_REF}-refresh-token=${refreshToken}; ${cookieOptions}`;
    }
  }
  
  if (userType === 'admin') {
    document.cookie = `${APP_CONFIG.auth.sessionCookie}=authenticated; ${cookieOptions}`;
  } else if (userType === 'barbero') {
    document.cookie = `${APP_CONFIG.auth.barberoSessionCookie}=authenticated; ${cookieOptions}`;
  }
};

export default APP_CONFIG;