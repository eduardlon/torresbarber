/**
 * Sistema de notificaciones optimizado
 * Componente para mostrar notificaciones toast con animaciones suaves
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/useAppStore';
import { useNetworkStatus } from '@/utils/performance';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';

// TypeScript refresh trigger

// Iconos para cada tipo de notificación
const notificationIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// Colores para cada tipo
const notificationStyles = {
  success: {
    bg: 'bg-success-50 border-success-200',
    text: 'text-success-800',
    icon: 'text-success-600',
    progress: 'bg-success-500',
  },
  error: {
    bg: 'bg-error-50 border-error-200',
    text: 'text-error-800',
    icon: 'text-error-600',
    progress: 'bg-error-500',
  },
  warning: {
    bg: 'bg-warning-50 border-warning-200',
    text: 'text-warning-800',
    icon: 'text-warning-600',
    progress: 'bg-warning-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600',
    progress: 'bg-blue-500',
  },
};

// Componente individual de notificación
interface NotificationItemProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onRemove,
}) => {
  const [progress, setProgress] = React.useState(100);
  const [isPaused, setIsPaused] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());
  const remainingTimeRef = React.useRef<number>(duration);

  const Icon = notificationIcons[type];
  const styles = notificationStyles[type];

  // Manejar el progreso de auto-cierre
  React.useEffect(() => {
    if (duration <= 0) return;

    const updateProgress = () => {
      if (isPaused) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingTimeRef.current - elapsed);
      const newProgress = (remaining / duration) * 100;

      setProgress(newProgress);

      if (remaining <= 0) {
        onRemove(id);
      }
    };

    intervalRef.current = setInterval(updateProgress, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id, duration, isPaused, onRemove]);

  // Pausar/reanudar en hover
  const handleMouseEnter = () => {
    setIsPaused(true);
    remainingTimeRef.current = (progress / 100) * duration;
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now();
  };

  // Cerrar manualmente
  const handleClose = () => {
    onRemove(id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        relative overflow-hidden rounded-lg border shadow-medium p-4 mb-3
        ${styles.bg} ${styles.text}
        transform transition-transform hover:scale-105
        cursor-pointer
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClose}
    >
      {/* Barra de progreso */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-200 w-full">
          <motion.div
            className={`h-full ${styles.progress}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      )}

      <div className="flex items-start space-x-3">
        {/* Icono */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <Icon size={20} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight">{title}</h4>
          <p className="text-sm opacity-90 mt-1 leading-relaxed">{message}</p>
        </div>

        {/* Botón de cerrar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className={`
            flex-shrink-0 p-1 rounded-full transition-colors
            hover:bg-black hover:bg-opacity-10
            ${styles.icon}
          `}
          aria-label="Cerrar notificación"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// Componente principal del sistema de notificaciones
const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  // Crear contenedor para el portal
  React.useEffect(() => {
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'notification-container';
      notificationContainer.className = `
        fixed top-4 right-4 z-100 w-full max-w-sm
        pointer-events-none
      `;
      document.body.appendChild(notificationContainer);
    }
    
    setContainer(notificationContainer);
    
    return () => {
      // Limpiar al desmontar si no hay notificaciones
      if (notifications.length === 0 && notificationContainer) {
        document.body.removeChild(notificationContainer);
      }
    };
  }, [notifications.length]);

  if (!container || notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            id={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            duration={notification.duration ?? 5000}
            onRemove={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>,
    container
  );
};

export default NotificationSystem;

// Hook para usar notificaciones fácilmente
export const useToast = () => {
  const { addNotification } = useNotifications();

  const toast = React.useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 5000,
    }: {
      type?: 'success' | 'error' | 'warning' | 'info';
      title: string;
      message: string;
      duration?: number;
    }) => {
      addNotification({
        type,
        title,
        message,
        duration,
      });
    },
    [addNotification]
  );

  // Métodos de conveniencia
  const success = React.useCallback(
    (title: string, message: string, duration?: number) => {
      toast({ type: 'success', title, message, duration: duration ?? 5000 });
    },
    [toast]
  );

  const error = React.useCallback(
    (title: string, message: string, duration?: number) => {
      toast({ type: 'error', title, message, duration: duration ?? 5000 });
    },
    [toast]
  );

  const warning = React.useCallback(
    (title: string, message: string, duration?: number) => {
      toast({ type: 'warning', title, message, duration: duration ?? 5000 });
    },
    [toast]
  );

  const info = React.useCallback(
    (title: string, message: string, duration?: number) => {
      toast({ type: 'info', title, message, duration: duration ?? 5000 });
    },
    [toast]
  );

  return {
    toast,
    success,
    error,
    warning,
    info,
  };
};

// Componente para mostrar notificaciones de conexión
export const ConnectionNotification: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const { addNotification } = useNotifications();
  const wasOnlineRef = React.useRef(isOnline);

  React.useEffect(() => {
    if (wasOnlineRef.current && !isOnline) {
      // Se perdió la conexión
      addNotification({
        type: 'warning',
        title: 'Conexión perdida',
        message: 'No hay conexión a internet. Algunos datos pueden no estar actualizados.',
        duration: 0, // No auto-cerrar
      });
    } else if (!wasOnlineRef.current && isOnline) {
      // Se recuperó la conexión
      addNotification({
        type: 'success',
        title: 'Conexión restaurada',
        message: 'La conexión a internet se ha restablecido.',
        duration: 3000,
      });
    }
    
    wasOnlineRef.current = isOnline;
  }, [isOnline, addNotification]);

  return null;
};