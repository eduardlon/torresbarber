/**
 * Script de inicialización de la aplicación
 * Configura automáticamente la red, autenticación y otros servicios
 */

import { setupApiUrl, getApiUrl } from './network.js';
import { APP_CONFIG, clearAuthCookies } from './config.js';

/**
 * Inicializa la configuración de red
 * NOTA: Backend migrado a Supabase, Laravel backend deshabilitado
 */
const initializeNetwork = async () => {
  try {
    console.log('🌐 Inicializando configuración de red...');
    console.log('✅ Usando Supabase como backend (Laravel deshabilitado)');

    // Configurar URL de API como fallback para compatibilidad
    if (typeof window !== 'undefined') {
      window.API_BASE_URL = 'https://vnmtrqkhvezfpdilmbyq.supabase.co';
    }

    return 'supabase';
  } catch (error) {
    console.error('❌ Error inicializando red:', error);
    return 'supabase';
  }
};

/**
 * Inicializa la autenticación
 */
const initializeAuth = () => {
  try {
    console.log('🔐 Inicializando sistema de autenticación...');
    
    // Verificar tokens existentes
    const adminToken = localStorage.getItem(APP_CONFIG.auth.tokenKey);
    const barberoToken = localStorage.getItem(APP_CONFIG.auth.barberoTokenKey);
    
    if (adminToken) {
      console.log('👤 Token de administrador encontrado');
    }
    
    if (barberoToken) {
      console.log('✂️ Token de barbero encontrado');
    }
    
    // Limpiar tokens expirados o inválidos
    // Esta verificación se hará en las peticiones individuales
    
    console.log('✅ Sistema de autenticación inicializado');
  } catch (error) {
    console.error('❌ Error inicializando autenticación:', error);
    clearAuthCookies();
  }
};

/**
 * Inicializa el sistema de notificaciones globales
 */
const initializeNotifications = () => {
  try {
    console.log('🔔 Inicializando sistema de notificaciones...');
    
    // Función global para mostrar notificaciones
    window.showNotification = (message, type = 'info', title = '') => {
      const event = new CustomEvent('showNotification', {
        detail: { message, type, title }
      });
      window.dispatchEvent(event);
    };
    
    // Aliases para diferentes tipos
    window.showSuccess = (message, title = 'Éxito') => {
      window.showNotification(message, 'success', title);
    };
    
    window.showError = (message, title = 'Error') => {
      window.showNotification(message, 'error', title);
    };
    
    window.showWarning = (message, title = 'Advertencia') => {
      window.showNotification(message, 'warning', title);
    };
    
    window.showInfo = (message, title = 'Información') => {
      window.showNotification(message, 'info', title);
    };
    
    // Mantener compatibilidad con función anterior
    window.mostrarNotificacion = window.showNotification;
    
    console.log('✅ Sistema de notificaciones inicializado');
  } catch (error) {
    console.error('❌ Error inicializando notificaciones:', error);
  }
};

/**
 * Inicializa métricas y analytics
 */
const initializeAnalytics = () => {
  try {
    console.log('📊 Inicializando analytics...');
    
    // Configurar métricas básicas
    if ('performance' in window) {
      // Medir tiempo de carga de la aplicación
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`⚡ Aplicación cargada en ${loadTime.toFixed(2)}ms`);
        
        // Enviar métrica si hay analytics configurado
        if (window.gtag) {
          window.gtag('event', 'timing_complete', {
            name: 'app_load',
            value: Math.round(loadTime)
          });
        }
      });
    }
    
    console.log('✅ Analytics inicializado');
  } catch (error) {
    console.error('❌ Error inicializando analytics:', error);
  }
};

/**
 * Inicializa el Service Worker para PWA
 */
const initializeServiceWorker = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (import.meta.env.DEV && isLocalDev) {
        console.log('⚠️  Service Worker deshabilitado en entorno de desarrollo local.');
        return;
      }

      console.log('🔧 Inicializando Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registrado:', registration);
      
      // Escuchar actualizaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión disponible
              window.showInfo(
                'Nueva versión disponible. Recarga la página para actualizar.',
                'Actualización disponible'
              );
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('❌ Error inicializando Service Worker:', error);
  }
};

/**
 * Inicializa la detección de conexión
 */
const initializeConnectionMonitoring = () => {
  try {
    console.log('📡 Inicializando monitoreo de conexión...');
    
    // Detectar cambios en la conexión
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada');
      window.showSuccess('Conexión a internet restaurada');
    });
    
    window.addEventListener('offline', () => {
      console.log('📴 Conexión perdida');
      window.showWarning('Sin conexión a internet. Algunas funciones pueden no estar disponibles.');
    });
    
    // Estado inicial
    if (!navigator.onLine) {
      window.showWarning('Sin conexión a internet');
    }
    
    console.log('✅ Monitoreo de conexión inicializado');
  } catch (error) {
    console.error('❌ Error inicializando monitoreo de conexión:', error);
  }
};

/**
 * Función principal de inicialización
 */
export const initializeApp = async () => {
  console.log('🚀 Inicializando JP Barber App...');
  
  try {
    // Inicializar en orden de dependencias
    await initializeNetwork();
    initializeAuth();
    initializeNotifications();
    initializeAnalytics();
    await initializeServiceWorker();
    initializeConnectionMonitoring();
    
    console.log('✅ JP Barber App inicializada correctamente');

    // Mostrar información de la aplicación
    console.log(`
    🏪 JP Barber - Sistema de Gestión de Barbería
    📱 Versión: ${APP_CONFIG.version}
    🌐 Backend: Supabase (https://vnmtrqkhvezfpdilmbyq.supabase.co)
    🔧 Entorno: ${typeof process !== 'undefined' && process.env ? (process.env.NODE_ENV || 'development') : 'production'}
    `);
    
    return true;
  } catch (error) {
    console.error('❌ Error inicializando la aplicación:', error);
    
    // Mostrar error al usuario
    if (window.showError) {
      window.showError(
        'Error inicializando la aplicación. Por favor, recarga la página.',
        'Error de Inicialización'
      );
    }
    
    return false;
  }
};

/**
 * Función para reinicializar la aplicación
 */
export const reinitializeApp = async () => {
  console.log('🔄 Reinicializando aplicación...');
  
  // Limpiar configuraciones anteriores
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api_url');
  }
  
  // Reinicializar
  return await initializeApp();
};

/**
 * Auto-inicialización cuando se carga el módulo (DESHABILITADO)
 * Se inicializa manualmente desde Layout.astro para evitar doble ejecución
 */
// if (typeof window !== 'undefined') {
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializeApp);
//   } else {
//     initializeApp();
//   }
// }

export default {
  initializeApp,
  reinitializeApp
};