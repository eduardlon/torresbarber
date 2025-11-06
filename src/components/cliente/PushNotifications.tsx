import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'promotion';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface PushNotificationsProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onToast: (message: string, type: 'success' | 'error') => void;
}

const PushNotifications: React.FC<PushNotificationsProps> = ({ authenticatedFetch, onToast }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    appointments: true,
    promotions: true,
    reminders: true,
    updates: true,
    sound: true,
    vibration: true
  });

  // Verificar soporte y permisos
  useEffect(() => {
    checkNotificationSupport();
    loadNotifications();
    loadSettings();
  }, []);

  // Actualizar contador de no leídas
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const checkNotificationSupport = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      onToast('Tu navegador no soporta notificaciones', 'error');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        setIsEnabled(true);
        onToast('Notificaciones activadas correctamente', 'success');
        
        // Registrar service worker para notificaciones push
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registrado:', registration);
        }
        
        // Enviar token al servidor
        await registerPushSubscription();
      } else {
        onToast('Permisos de notificación denegados', 'error');
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      onToast('Error al activar notificaciones', 'error');
    }
  };

  const registerPushSubscription = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' // Clave pública VAPID
        });
        
        // Enviar suscripción al servidor
        await authenticatedFetch('/api/cliente', {
          method: 'POST',
          body: JSON.stringify({
            action: 'register_push',
            subscription: subscription
          })
        });
      }
    } catch (error) {
      console.error('Error al registrar push subscription:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch('/api/cliente?action=obtener_notificaciones');
      const data = await response.json();
      
      if (data.success) {
        const formattedNotifications = data.notificaciones.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('notification_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('notification_settings', JSON.stringify(newSettings));
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await authenticatedFetch('/api/cliente', {
        method: 'POST',
        body: JSON.stringify({
          action: 'marcar_notificacion_leida',
          notification_id: notificationId
        })
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authenticatedFetch('/api/cliente', {
        method: 'POST',
        body: JSON.stringify({
          action: 'marcar_todas_leidas'
        })
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onToast('Todas las notificaciones marcadas como leídas', 'success');
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await authenticatedFetch('/api/cliente', {
        method: 'DELETE',
        body: JSON.stringify({
          action: 'eliminar_notificacion',
          notification_id: notificationId
        })
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      onToast('Notificación eliminada', 'success');
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
    }
  };

  const sendTestNotification = () => {
    if (isEnabled) {
      const notification = new Notification('JP Barber - Notificación de Prueba', {
        body: 'Las notificaciones están funcionando correctamente',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test',
        requireInteraction: false,
        silent: !settings.sound
      });
      
      if (settings.vibration && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      setTimeout(() => notification.close(), 5000);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    const icons = {
      info: '💡',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      appointment: '📅',
      promotion: '🎉'
    };
    return icons[type] || '📢';
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    const colors = {
      low: 'border-gray-500',
      medium: 'border-blue-500',
      high: 'border-yellow-500',
      urgent: 'border-red-500'
    };
    return colors[priority];
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowPanel(!showPanel)}
        className="relative bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all border border-white/20"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Panel de notificaciones */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-96 bg-gray-900 rounded-xl shadow-2xl border border-white/20 z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold flex items-center">
                  <span className="mr-2">🔔</span>
                  Notificaciones
                </h3>
                <div className="flex space-x-2">
                  {unreadCount > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={markAllAsRead}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-all"
                    >
                      Marcar todas
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPanel(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </motion.button>
                </div>
              </div>
              
              {/* Estado de permisos */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-300">
                    {isEnabled ? 'Activadas' : 'Desactivadas'}
                  </span>
                </div>
                
                {!isEnabled && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={requestPermission}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-all"
                  >
                    Activar
                  </motion.button>
                )}
                
                {isEnabled && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendTestNotification}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-all"
                  >
                    Probar
                  </motion.button>
                )}
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                  <p className="text-gray-400 text-sm">Cargando notificaciones...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔕</div>
                  <p className="text-gray-400">No hay notificaciones</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 border-l-4 ${getPriorityColor(notification.priority)} ${
                        notification.read ? 'bg-white/5' : 'bg-white/10'
                      } hover:bg-white/15 transition-all cursor-pointer`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                            <h4 className={`font-medium ${
                              notification.read ? 'text-gray-300' : 'text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className={`text-sm ${
                            notification.read ? 'text-gray-400' : 'text-gray-300'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {notification.actionUrl && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(notification.actionUrl, '_blank');
                                }}
                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-all"
                              >
                                {notification.actionText || 'Ver'}
                              </motion.button>
                            )}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                        >
                          🗑️
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con configuración */}
            <div className="p-3 border-t border-white/10 bg-white/5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // Aquí podrías abrir un modal de configuración
                  onToast('Configuración de notificaciones próximamente', 'info');
                }}
                className="w-full text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center space-x-1"
              >
                <span>⚙️</span>
                <span>Configurar notificaciones</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PushNotifications;