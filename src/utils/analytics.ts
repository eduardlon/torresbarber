/**
 * Sistema de analytics y métricas para JP Barber
 */

// Declaración de tipos para gtag
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

// Tipos para eventos de analytics
interface AnalyticsEvent {
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any> | undefined;
}

interface UserProperties {
  user_type?: 'admin' | 'barbero' | 'cliente' | 'guest';
  session_id?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  connection_type?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
}

/**
 * Clase principal para manejo de analytics
 */
class AnalyticsManager {
  private isEnabled: boolean = false;
  private sessionId: string;
  private userProperties: UserProperties = {};
  private performanceMetrics: PerformanceMetric[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * Inicializa el sistema de analytics
   */
  private initialize(): void {
    try {
      // Detectar tipo de dispositivo
      this.userProperties.device_type = this.detectDeviceType();
      
      // Detectar tipo de conexión
      this.userProperties.connection_type = this.detectConnectionType();
      
      // Generar session ID
      this.userProperties.session_id = this.sessionId;
      
      // Habilitar analytics si está en producción o si está configurado
      this.isEnabled = process.env.NODE_ENV === 'production' || 
                      localStorage.getItem('analytics_enabled') === 'true';
      
      if (this.isEnabled) {
        this.setupPerformanceObserver();
        this.trackPageLoad();
      }
      
      console.log('📊 Analytics inicializado:', {
        enabled: this.isEnabled,
        sessionId: this.sessionId,
        deviceType: this.userProperties.device_type
      });
    } catch (error) {
      console.error('Error inicializando analytics:', error);
    }
  }

  /**
   * Genera un ID único para la sesión
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Detecta el tipo de dispositivo
   */
  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Detecta el tipo de conexión
   */
  private detectConnectionType(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    return connection?.effectiveType || 'unknown';
  }

  /**
   * Configura el observer de rendimiento
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Observer para métricas de navegación
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackPerformanceMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart, 'ms');
            this.trackPerformanceMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart, 'ms');
            this.trackPerformanceMetric('first_byte', navEntry.responseStart - navEntry.fetchStart, 'ms');
          }
        }
      });
      
      navObserver.observe({ entryTypes: ['navigation'] });

      // Observer para métricas de recursos
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.name.includes('.js') || resourceEntry.name.includes('.css')) {
              this.trackPerformanceMetric(
                `resource_load_${resourceEntry.name.split('/').pop()}`,
                resourceEntry.responseEnd - resourceEntry.fetchStart,
                'ms'
              );
            }
          }
        }
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('No se pudo configurar PerformanceObserver:', error);
    }
  }

  /**
   * Rastrea la carga de página
   */
  private trackPageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.trackEvent({
        name: 'page_load',
        category: 'performance',
        action: 'load',
        value: Math.round(loadTime)
      });
    });
  }

  /**
   * Establece propiedades del usuario
   */
  public setUserProperties(properties: UserProperties): void {
    this.userProperties = { ...this.userProperties, ...properties };
    
    if (this.isEnabled && typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        custom_map: properties
      });
    }
  }

  /**
   * Rastrea un evento
   */
  public trackEvent(event: AnalyticsEvent): void {
    if (!this.isEnabled) return;

    try {
      // Agregar propiedades del usuario al evento
      const enrichedEvent = {
        ...event,
        custom_parameters: {
          ...event.custom_parameters,
          session_id: this.sessionId,
          device_type: this.userProperties.device_type,
          connection_type: this.userProperties.connection_type,
          timestamp: Date.now()
        }
      };

      // Enviar a Google Analytics si está disponible
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
          ...enrichedEvent.custom_parameters
        });
      }

      // Log para desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Analytics Event:', enrichedEvent);
      }

      // Almacenar localmente para análisis offline
      this.storeEventLocally(enrichedEvent);
    } catch (error) {
      console.error('Error enviando evento de analytics:', error);
    }
  }

  /**
   * Rastrea una métrica de rendimiento personalizada
   */
  public trackPerformanceMetric(name: string, value: number, unit: PerformanceMetric['unit']): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.performanceMetrics.push(metric);

    // Mantener solo las últimas 100 métricas
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }

    // Enviar como evento de analytics
    this.trackEvent({
      name: 'performance_metric',
      category: 'performance',
      action: name,
      value: Math.round(value),
      custom_parameters: { unit }
    });
  }

  /**
   * Rastrea errores de JavaScript
   */
  public trackError(error: Error, context?: string): void {
    this.trackEvent({
      name: 'javascript_error',
      category: 'error',
      action: 'exception',
      label: error.message,
      custom_parameters: {
        error_name: error.name,
        error_stack: error.stack,
        context: context || 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      }
    });
  }

  /**
   * Rastrea interacciones del usuario
   */
  public trackUserInteraction(element: string, action: string, details?: Record<string, any>): void {
    this.trackEvent({
      name: 'user_interaction',
      category: 'engagement',
      action,
      label: element,
      custom_parameters: details
    });
  }

  /**
   * Rastrea navegación entre páginas
   */
  public trackPageView(page: string, title?: string): void {
    this.trackEvent({
      name: 'page_view',
      category: 'navigation',
      action: 'view',
      label: page,
      custom_parameters: {
        page_title: title || document.title,
        page_location: typeof window !== 'undefined' ? window.location.href : page
      }
    });
  }

  /**
   * Almacena eventos localmente para análisis offline
   */
  private storeEventLocally(event: any): void {
    try {
      const stored = localStorage.getItem('analytics_events');
      const events = stored ? JSON.parse(stored) : [];
      
      events.push(event);
      
      // Mantener solo los últimos 50 eventos
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      console.warn('No se pudo almacenar evento localmente:', error);
    }
  }

  /**
   * Obtiene métricas de rendimiento almacenadas
   */
  public getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  /**
   * Obtiene eventos almacenados localmente
   */
  public getStoredEvents(): any[] {
    try {
      const stored = localStorage.getItem('analytics_events');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error obteniendo eventos almacenados:', error);
      return [];
    }
  }

  /**
   * Limpia datos almacenados localmente
   */
  public clearStoredData(): void {
    try {
      localStorage.removeItem('analytics_events');
      this.performanceMetrics = [];
    } catch (error) {
      console.error('Error limpiando datos almacenados:', error);
    }
  }

  /**
   * Habilita o deshabilita analytics
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('analytics_enabled', enabled.toString());
    
    if (enabled) {
      this.setupPerformanceObserver();
    }
  }

  /**
   * Obtiene el estado actual de analytics
   */
  public getStatus(): {
    enabled: boolean;
    sessionId: string;
    userProperties: UserProperties;
    metricsCount: number;
    eventsCount: number;
  } {
    return {
      enabled: this.isEnabled,
      sessionId: this.sessionId,
      userProperties: this.userProperties,
      metricsCount: this.performanceMetrics.length,
      eventsCount: this.getStoredEvents().length
    };
  }
}

// Instancia global de analytics
const analytics = new AnalyticsManager();

// Funciones de conveniencia para uso directo
export const trackEvent = (event: AnalyticsEvent) => analytics.trackEvent(event);
export const trackError = (error: Error, context?: string) => analytics.trackError(error, context);
export const trackPageView = (page: string, title?: string) => analytics.trackPageView(page, title);
export const trackUserInteraction = (element: string, action: string, details?: Record<string, any>) => 
  analytics.trackUserInteraction(element, action, details);
export const trackCustomMetric = (name: string, value: number, unit: PerformanceMetric['unit'] = 'count') => 
  analytics.trackPerformanceMetric(name, value, unit);

// Configurar manejo global de errores
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    analytics.trackError(new Error(event.message), 'global_error_handler');
  });

  window.addEventListener('unhandledrejection', (event) => {
    analytics.trackError(new Error(event.reason), 'unhandled_promise_rejection');
  });
}

// Hacer disponible globalmente para uso desde otros scripts
if (typeof window !== 'undefined') {
  (window as any).analytics = analytics;
  (window as any).trackEvent = trackEvent;
  (window as any).trackError = trackError;
  (window as any).trackPageView = trackPageView;
  (window as any).trackUserInteraction = trackUserInteraction;
  (window as any).trackCustomMetric = trackCustomMetric;
}

export default analytics;
export { analytics, AnalyticsManager };
export type { AnalyticsEvent, UserProperties, PerformanceMetric };