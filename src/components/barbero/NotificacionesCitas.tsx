import React, { useEffect, useState, useRef } from 'react';

interface NotificacionCita {
  id: number;
  cliente_nombre: string;
  tiempo_restante: number; // minutos
  tipo: 'proxima' | 'urgente' | 'cola'; // proxima: 30min, urgente: 10min, cola: 5min
}

interface NotificacionesCitasProps {
  citas: NotificacionCita[];
  onAcknowledge?: (citaId: number) => void;
}

const NotificacionesCitas: React.FC<NotificacionesCitasProps> = ({ citas, onAcknowledge }) => {
  const [notificacionesActivas, setNotificacionesActivas] = useState<NotificacionCita[]>([]);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificacionesVistas = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Crear elemento de audio para notificaciones
    if (!audioRef.current && sonidoHabilitado) {
      const audio = new Audio();
      // Usar un tono simple generado por código
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjCC0fPTgjMGHGm/7+OZUQ0PVKzn77BfGAg+ltryy3gpBSh+zPLaizsIGGS67uihUhELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjUxELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILEl+16+mjU=';
      audioRef.current = audio;
    }

    // Filtrar notificaciones nuevas que no hayan sido vistas
    const nuevas = citas.filter(cita => !notificacionesVistas.current.has(cita.id));
    
    if (nuevas.length > 0) {
      // Agregar IDs a las vistas
      nuevas.forEach(cita => notificacionesVistas.current.add(cita.id));
      
      // Reproducir sonido para notificaciones urgentes o de cola
      if (sonidoHabilitado) {
        nuevas.forEach(cita => {
          if (cita.tipo === 'urgente' || cita.tipo === 'cola') {
            audioRef.current?.play().catch(err => console.log('No se pudo reproducir el sonido:', err));
          }
        });
      }

      // Solicitar permiso para notificaciones del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        nuevas.forEach(cita => {
          let titulo = '';
          let cuerpo = '';
          
          switch (cita.tipo) {
            case 'cola':
              titulo = '🔔 Cliente listo para atención';
              cuerpo = `${cita.cliente_nombre} ha sido agregado a la cola automáticamente`;
              break;
            case 'urgente':
              titulo = '⚠️ Cita próxima';
              cuerpo = `${cita.cliente_nombre} llegará en ${cita.tiempo_restante} minutos`;
              break;
            case 'proxima':
              titulo = '📅 Cita programada';
              cuerpo = `${cita.cliente_nombre} tiene cita en ${cita.tiempo_restante} minutos`;
              break;
          }

          new Notification(titulo, {
            body: cuerpo,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: `cita-${cita.id}`
          });
        });
      }

      setNotificacionesActivas(nuevas);
      
      // Auto-ocultar después de 10 segundos (excepto las de cola)
      setTimeout(() => {
        setNotificacionesActivas(prev => 
          prev.filter(n => n.tipo === 'cola' || !nuevas.some(nueva => nueva.id === n.id))
        );
      }, 10000);
    }
  }, [citas, sonidoHabilitado]);

  const handleDismiss = (citaId: number) => {
    setNotificacionesActivas(prev => prev.filter(n => n.id !== citaId));
    if (onAcknowledge) {
      onAcknowledge(citaId);
    }
  };

  const solicitarPermiso = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Mostrar notificación de prueba
        new Notification('¡Notificaciones activadas!', {
          body: 'Ahora recibirás alertas sobre tus citas próximas',
          icon: '/favicon.svg'
        });
      }
    }
  };

  const getColorPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'cola':
        return 'from-green-600 to-green-700 border-green-500';
      case 'urgente':
        return 'from-red-600 to-red-700 border-red-500';
      case 'proxima':
        return 'from-blue-600 to-blue-700 border-blue-500';
      default:
        return 'from-zinc-600 to-zinc-700 border-zinc-500';
    }
  };

  const getIconoPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'cola':
        return '🔔';
      case 'urgente':
        return '⚠️';
      case 'proxima':
        return '📅';
      default:
        return '🔔';
    }
  };

  const getTituloPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'cola':
        return 'Cliente en Cola';
      case 'urgente':
        return 'Cita Urgente';
      case 'proxima':
        return 'Cita Próxima';
      default:
        return 'Notificación';
    }
  };

  if (notificacionesActivas.length === 0) {
    return null;
  }

  return (
    <>
      {/* Panel de control de notificaciones */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {/* Botón de configuración */}
        <div className="bg-black/90 backdrop-blur-md border border-zinc-700 rounded-lg p-2 flex items-center gap-2">
          <button
            onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
            className={`p-2 rounded-lg transition-colors ${
              sonidoHabilitado 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-zinc-700 hover:bg-zinc-600'
            }`}
            title={sonidoHabilitado ? 'Silenciar notificaciones' : 'Activar sonido'}
          >
            {sonidoHabilitado ? '🔊' : '🔇'}
          </button>
          
          {('Notification' in window && Notification.permission !== 'granted') && (
            <button
              onClick={solicitarPermiso}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white text-sm"
              title="Activar notificaciones del navegador"
            >
              🔔 Activar
            </button>
          )}
        </div>

        {/* Notificaciones activas */}
        {notificacionesActivas.map((notif) => (
          <div
            key={notif.id}
            className={`bg-gradient-to-r ${getColorPorTipo(notif.tipo)} border-2 rounded-2xl p-4 shadow-2xl animate-bounce-in min-w-[320px] max-w-md`}
          >
            <div className="flex items-start gap-3">
              <div className="text-4xl flex-shrink-0">
                {getIconoPorTipo(notif.tipo)}
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">
                  {getTituloPorTipo(notif.tipo)}
                </h3>
                <p className="text-white/90 font-semibold mb-1">
                  {notif.cliente_nombre}
                </p>
                <p className="text-white/70 text-sm">
                  {notif.tipo === 'cola' 
                    ? 'Ha sido agregado a la cola automáticamente'
                    : `Llegará en ${notif.tiempo_restante} minutos`
                  }
                </p>
              </div>

              <button
                onClick={() => handleDismiss(notif.id)}
                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          50% {
            transform: translateX(-10px);
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </>
  );
};

export default NotificacionesCitas;
