/**
 * Utilidades para manejo de red y detección automática de configuración
 */

/**
 * Detecta la configuración de red apropiada
 */
export const detectNetworkConfig = () => {
  if (typeof window === 'undefined') {
    return {
      isLocalhost: true,
      hostname: 'localhost',
      apiUrl: 'http://localhost:8001/api'
    };
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Para desarrollo local, usar localhost
  // Para red local, usar la IP actual
  const apiHost = isLocalhost ? 'localhost' : hostname;
  const apiUrl = `http://${apiHost}:8001/api`;

  return {
    isLocalhost,
    hostname,
    apiHost,
    apiUrl
  };
};

/**
 * Obtiene la configuración de red con fallbacks
 */
export const getNetworkConfig = () => {
  try {
    return detectNetworkConfig();
  } catch (error) {
    console.warn('Error detectando configuración de red, usando localhost:', error);
    return {
      isLocalhost: true,
      hostname: 'localhost',
      apiHost: 'localhost',
      apiUrl: 'http://localhost:8001/api'
    };
  }
};

/**
 * Verifica si una URL es accesible
 */
export const checkUrlAccessibility = async (url, timeout = 3000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Usar GET en lugar de HEAD para mejor compatibilidad
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 también indica que el servidor responde
  } catch (error) {
    console.warn(`No se pudo conectar a ${url}:`, error.message);
    return false;
  }
};

/**
 * Encuentra la mejor URL de API disponible
 */
export const findBestApiUrl = async () => {
  const config = getNetworkConfig();
  const possibleUrls = [
    config.apiUrl,
    'http://localhost:8001/api',
    'http://127.0.0.1:8001/api'
  ];

  // Si no es localhost, también probar con la IP local común
  if (!config.isLocalhost) {
    possibleUrls.push('http://192.168.1.92:8001/api');
  }

  // Eliminar duplicados
  const uniqueUrls = [...new Set(possibleUrls)];

  for (const url of uniqueUrls) {
    const isAccessible = await checkUrlAccessibility(url);
    if (isAccessible) {
      console.log(`✅ API encontrada en: ${url}`);
      return url;
    }
  }

  console.log('ℹ️ Backend no disponible - modo solo frontend');
  return config.apiUrl;
};

/**
 * Configura automáticamente la URL de la API
 */
export const setupApiUrl = async () => {
  if (typeof window === 'undefined') return 'http://localhost:8001/api';

  try {
    const bestUrl = await findBestApiUrl();
    
    // Guardar en localStorage para uso posterior
    localStorage.setItem('api_url', bestUrl);
    
    // Hacer disponible globalmente
    window.API_BASE_URL = bestUrl;
    
    return bestUrl;
  } catch (error) {
    console.error('Error configurando URL de API:', error);
    const fallbackUrl = 'http://localhost:8001/api';
    window.API_BASE_URL = fallbackUrl;
    return fallbackUrl;
  }
};

/**
 * Obtiene la URL de la API desde localStorage o detecta automáticamente
 */
export const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:8001/api';

  // Intentar obtener desde localStorage primero
  const savedUrl = localStorage.getItem('api_url');
  if (savedUrl) {
    return savedUrl;
  }

  // Si no hay URL guardada, usar detección automática
  const config = getNetworkConfig();
  return config.apiUrl;
};

/**
 * Reinicia la detección de red (útil cuando cambia la conexión)
 */
export const resetNetworkConfig = async () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api_url');
    return await setupApiUrl();
  }
};

export default {
  detectNetworkConfig,
  getNetworkConfig,
  checkUrlAccessibility,
  findBestApiUrl,
  setupApiUrl,
  getApiUrl,
  resetNetworkConfig
};