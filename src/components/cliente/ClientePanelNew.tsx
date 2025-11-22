import React, { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase.js';
import BookingExperience from '../BookingExperience.tsx';
import PublicQueueSystem from '../public/PublicQueueSystem.tsx';
import type { GaleriaItem } from '../../services/supabaseService';

interface ClienteData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  cortes_realizados: number;
  cortes_gratis_disponibles: number;
  puntos_experiencia: number;
  nivel_actual: number;
  visitas_totales: number;
  dinero_gastado_total: number;
  ultima_visita: string | null;
}

interface Cita {
  id: string;
  fecha_hora: string;
  status: string;
  cliente_nombre: string;
  servicio: {
    nombre: string;
    duracion_minutos: number;
    precio: number;
  } | null;
  ventas?: {
    total_final: number | null;
    es_corte_gratis?: boolean | null;
  } | null;
}

interface NotificationItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
  meta?: {
    citaId?: string;
    status?: string;
  };
}

export const ClientePanelNew: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agendar' | 'cola' | 'galeria'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFreeCutMode, setIsFreeCutMode] = useState(false);
  const [pendingFreeRedemptions, setPendingFreeRedemptions] = useState(0);
  const [bookingModal, setBookingModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Forzar modo oscuro para que los componentes se vean bien
  useEffect(() => {
    // Agregar clase dark al html
    document.documentElement.classList.add('dark');
    
    const style = document.createElement('style');
    style.textContent = `
      /* Forzar dark mode en todo el documento */
      html {
        color-scheme: dark;
      }

      /* Estilos para los componentes integrados */
      .booking-wrapper,
      .queue-wrapper {
        color-scheme: dark;
      }

      /* Forzar estilos oscuros en inputs de texto */
      .booking-wrapper input[type="text"],
      .booking-wrapper input[type="tel"],
      .booking-wrapper input[type="email"],
      .queue-wrapper input[type="text"],
      .queue-wrapper input[type="tel"],
      .queue-wrapper input[type="email"],
      .booking-wrapper textarea,
      .queue-wrapper textarea {
        background: rgba(0, 0, 0, 0.4) !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
        color: white !important;
      }

      /* Inputs de fecha y hora mantienen su estilo original */
      .booking-wrapper input[type="date"],
      .booking-wrapper input[type="time"] {
        color-scheme: dark;
      }

      .booking-wrapper input::placeholder,
      .queue-wrapper input::placeholder,
      .booking-wrapper textarea::placeholder,
      .queue-wrapper textarea::placeholder {
        color: rgba(255, 255, 255, 0.4) !important;
      }

      /* Asegurar que los textos sean visibles */
      .booking-wrapper h2,
      .booking-wrapper p,
      .booking-wrapper label,
      .queue-wrapper h2,
      .queue-wrapper p,
      .queue-wrapper label {
        color: white !important;
      }

      /* Los botones de selección de hora mantienen sus estilos originales */
      .booking-wrapper button[type="button"]:not([class*="rounded-lg"]) {
        /* Solo aplicar a botones que no sean de selección de hora */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
      // No remover la clase dark porque puede afectar otras páginas
    };
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const pushNotification = React.useCallback((input: {
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    status?: string;
    citaId?: string | number;
  }) => {
    setNotifications((prev) => {
      const normalizedType: NotificationItem['type'] = input.type ?? 'info';
      const citaIdStr = input.citaId ? String(input.citaId) : undefined;
      const status = input.status;

      const isDuplicate = prev.some((notification) => {
        const sameMessage = notification.message === input.message;
        const sameType = notification.type === normalizedType;
        const sameCita = (!citaIdStr && !notification.meta?.citaId) || notification.meta?.citaId === citaIdStr;
        const sameStatus = (!status && !notification.meta?.status) || notification.meta?.status === status;
        return sameMessage && sameType && sameCita && sameStatus;
      });

      if (isDuplicate) {
        return prev;
      }

      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const item: NotificationItem = {
        id,
        message: input.message,
        type: normalizedType,
        createdAt: new Date().toISOString(),
        read: false,
        meta: {
          citaId: citaIdStr,
          status,
        },
      };

      return [item, ...prev].slice(0, 30);
    });
  }, []);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/login-cliente';
        return;
      }

      const { data: clienteData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error al cargar datos:', error);
        toast('Error al cargar datos del cliente', 'error');
        return;
      }

      setClienteData(clienteData);
      await loadCitas(clienteData.id);
      await loadPendingFreeRedemptions(clienteData.id);
    } catch (error) {
      console.error('Error:', error);
      toast('Error al cargar datos del cliente', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCitas = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select(`
          id,
          fecha_hora,
          status,
          cliente_nombre,
          servicio:servicio_id (
            nombre,
            duracion_minutos,
            precio
          ),
          ventas:ventas_cita_id_fkey (
            total_final,
            es_corte_gratis
          )
        `)
        .eq('cliente_id', clienteId)
        .eq('status', 'completed')
        .order('fecha_hora', { ascending: false })
        .limit(10);

      if (!error && data) {
        setCitas(data as unknown as Cita[]);
      }
    } catch (error) {
      console.error('Error cargando citas:', error);
    }
  };

  const reloadClienteById = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (!error && data) {
        setClienteData((prev) => (prev ? { ...prev, ...data } : data));
      }
    } catch (err) {
      console.error('Error recargando datos del cliente:', err);
    }
  };

  const loadPendingFreeRedemptions = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('id, status, usar_bono_fidelizacion')
        .eq('cliente_id', clienteId)
        .eq('usar_bono_fidelizacion', true);

      if (!error && data) {
        const activos = (data as any[]).filter((row) => {
          const raw = (row.status ?? '').toString().toLowerCase();
          return ![
            'completed',
            'completada',
            'cancelled',
            'cancelada',
            'canceled',
            'no_show',
            'ausente',
          ].includes(raw);
        });
        setPendingFreeRedemptions(activos.length);
      }
    } catch (err) {
      console.error('Error cargando redenciones pendientes:', err);
    }
  };

  // Suscripción en tiempo real al perfil del cliente para actualizar dashboard (cortes, XP, nivel, etc.)
  useEffect(() => {
    if (!clienteData?.id) return;

    const channel = supabase
      .channel(`client-profile-${clienteData.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clientes', filter: `id=eq.${clienteData.id}` },
        (payload: any) => {
          const updated = payload.new as ClienteData;
          setClienteData((prev) => (prev ? { ...prev, ...updated } : updated));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteData?.id]);

  useEffect(() => {
    if (!clienteData?.id) return;

    const channel = supabase
      .channel(`client-notifications-${clienteData.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas', filter: `cliente_id=eq.${clienteData.id}` },
        (payload: any) => {
          const row: any = payload?.new ?? payload?.old;
          if (!row) return;

          const normalizeStatus = (status: string | null | undefined): string => {
            if (!status) return 'pending';
            const value = status.toLowerCase();
            if (value === 'pendiente') return 'pending';
            if (value === 'confirmada') return 'confirmed';
            if (value === 'en_progreso') return 'in_progress';
            if (value === 'completada') return 'completed';
            if (value === 'cancelada' || value === 'canceled') return 'cancelled';
            if (value === 'ausente') return 'no_show';
            return value;
          };

          const status = normalizeStatus(row.status as string | null | undefined);

          let message: string | null = null;
          let type: 'info' | 'success' | 'warning' | 'error' = 'info';

          if (payload.eventType === 'INSERT') {
            message = 'Tu cita fue agendada correctamente.';
            type = 'success';
          } else if (payload.eventType === 'UPDATE') {
            if (status === 'confirmed') {
              message = 'Tu cita ha sido confirmada.';
              type = 'success';
            } else if (status === 'cancelled') {
              message = 'Tu cita ha sido cancelada.';
              type = 'warning';
            } else if (status === 'no_show') {
              message = 'Se marcó tu cita como no asistida.';
              type = 'warning';
            } else {
              // Otros cambios de estado (como pasar a cola o ser atendido) se
              // notificarán desde ClienteQueueStatus a través de onStatusEvent.
              message = null;
            }
          }

          if (message) {
            pushNotification({
              message,
              type,
              status,
              citaId: row.id,
            });
          }

          // Cuando una cita del cliente se completa, refrescar su historial
          if (payload.eventType === 'UPDATE' && status === 'completed') {
            void loadCitas(clienteData.id);
          }

          // Actualizar en tiempo real cuántas redenciones de corte gratis están pendientes
          void loadPendingFreeRedemptions(clienteData.id);

          // Refrescar también el perfil del cliente (cortes realizados, bonos, XP, nivel, etc.)
          // para que el dashboard refleje inmediatamente los cambios tras finalizar la venta.
          void reloadClienteById(clienteData.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteData?.id, pushNotification]);

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      window.location.href = '/';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin"></div>
          <p className="text-white text-xl font-semibold">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* Efectos de fondo similar a HeroBarber */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(220,38,38,0.15),transparent_50%),radial-gradient(circle_at_85%_70%,rgba(185,28,28,0.12),transparent_55%)]" style={{ filter: 'blur(100px)' }}></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(3px 3px at 15% 20%, rgba(255,255,255,1), transparent), radial-gradient(2px 2px at 25% 45%, rgba(255,255,255,0.95), transparent), radial-gradient(3.5px 3.5px at 35% 15%, rgba(220,38,38,1), transparent)', backgroundSize: '100% 100%' }}></div>
      </div>

      {/* Toast Notifications */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium shadow-lg ${
          showToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 bg-black/40 backdrop-blur-md border-b border-red-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4 md:py-0 md:h-20">
            <div className="flex items-center justify-between md:justify-start gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider">
                  ✂️ <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-300 bg-clip-text text-transparent">JP BARBER</span>
                </h1>
                <span className="hidden sm:inline text-gray-400 text-sm font-medium">Panel Cliente</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 md:gap-4">
              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <p className="text-white font-semibold text-base sm:text-lg leading-tight">
                    {clienteData?.nombre || 'Usuario'} {clienteData?.apellido || ''}
                  </p>
                  <p className="text-red-400 text-xs sm:text-sm font-medium mt-1">
                    Nivel {clienteData?.nivel_actual || '1'} • {clienteData?.puntos_experiencia || 0} XP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((open) => !open);
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-500/40 bg-black/60 text-red-200 shadow-lg shadow-red-500/30 hover:bg-red-500/20 hover:text-white transition-colors"
                >
                  <span className="sr-only">Ver notificaciones</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[0.65rem] font-bold text-white">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-300 font-semibold shadow-lg shadow-red-500/50 hover:shadow-red-500/70 text-sm sm:text-base"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {isNotificationsOpen && (
        <div className="fixed top-20 right-4 z-40 w-full max-w-xs sm:max-w-sm rounded-2xl border border-red-500/40 bg-black/90 p-4 shadow-2xl shadow-red-500/40 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.35em] text-red-300">Notificaciones</p>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setNotifications([])}
                className="text-[0.7rem] font-semibold text-red-300/80 hover:text-red-200"
              >
                Limpiar
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-zinc-300">No tienes notificaciones por ahora.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border px-3 py-2 text-xs sm:text-sm transition-colors ${
                    n.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : n.type === 'warning'
                      ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'
                      : n.type === 'error'
                      ? 'border-red-500/40 bg-red-500/10 text-red-100'
                      : 'border-zinc-600/60 bg-zinc-900/70 text-zinc-100'
                  } ${n.read ? 'opacity-80' : 'opacity-100'}`}
                >
                  <p className="leading-snug">{n.message}</p>
                  <p className="mt-1 text-[0.65rem] text-zinc-300/80">
                    {new Date(n.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="relative z-10 bg-black/30 backdrop-blur-sm border-b border-red-500/10">
        <div className="max-w-7xl mx-auto px-0 sm:px-4">
          <div className="overflow-x-auto">
            <div className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 lg:px-8 min-w-max">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'agendar', label: 'Agendar Cita', icon: '📅' },
                { id: 'cola', label: 'Cola Virtual', icon: '⏱️' },
                { id: 'galeria', label: 'Galería', icon: '🎨' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'agendar') {
                      setIsFreeCutMode(false);
                    }
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center space-x-2 py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-semibold text-xs sm:text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Listener oculto de cola para notificaciones en toda la app */}
        {clienteData && (
          <div className="hidden">
            <ClienteQueueStatus
              clienteData={clienteData}
              onStatusEvent={(event) => {
                if (!event) return;

                if (event.estado === 'atendiendo') {
                  pushNotification({
                    message: 'Tu turno ha comenzado, estás siendo atendido.',
                    type: 'info',
                    status: event.rawStatus,
                    citaId: event.citaId,
                  });
                } else if (event.estado === 'cola') {
                  pushNotification({
                    message: 'Estás en la cola. Te avisaremos cuando sea tu turno.',
                    type: 'info',
                    status: event.rawStatus,
                    citaId: event.citaId,
                  });
                } else if (event.estado === 'finalizado') {
                  pushNotification({
                    message: 'Tu turno en la cola ha finalizado.',
                    type: 'success',
                    status: event.rawStatus,
                    citaId: event.citaId,
                  });
                }
              }}
            />
          </div>
        )}
        {activeTab === 'dashboard' && clienteData && (
          <DashboardView
            clienteData={clienteData}
            citas={citas}
            pendingFreeRedemptions={pendingFreeRedemptions}
            onUseFreeCut={() => {
              setIsFreeCutMode(true);
              setActiveTab('agendar');
            }}
          />
        )}
        
        {activeTab === 'agendar' && (
          <AgendarView
            clienteData={clienteData}
            isFreeCutMode={isFreeCutMode}
            onBookingSuccess={() => {
              setBookingModal({
                type: 'success',
                message: 'Tu cita fue agendada con éxito. Ahora puedes seguir tu turno en la cola virtual.',
              });
              setIsFreeCutMode(false);
              setActiveTab('cola');
            }}
            onBookingError={(message) => {
              setBookingModal({ type: 'error', message });
            }}
          />
        )}
        
        {activeTab === 'cola' && (
          <ColaView clienteData={clienteData} />
        )}
        
        {activeTab === 'galeria' && (
          <GaleriaView />
        )}
      </main>
      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3
              className={`mb-2 text-lg font-bold ${
                bookingModal.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {bookingModal.type === 'success' ? 'Cita agendada' : 'No se pudo agendar la cita'}
            </h3>
            <p className="mb-4 text-sm text-zinc-100">{bookingModal.message}</p>
            <button
              type="button"
              onClick={() => setBookingModal(null)}
              className="mt-2 w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Dashboard View Component
const DashboardView: React.FC<{
  clienteData: ClienteData;
  citas: Cita[];
  pendingFreeRedemptions?: number;
  onUseFreeCut?: () => void;
}> = ({ clienteData, citas, pendingFreeRedemptions = 0, onUseFreeCut }) => {
  const totalCortes = clienteData.cortes_realizados || 0;
  const cortesGratisDisponibles = clienteData.cortes_gratis_disponibles || 0;
  const totalBonosGenerados = Math.floor(totalCortes / 10);
  const bonosUsados = Math.max(0, totalBonosGenerados - cortesGratisDisponibles);
  const hayRedencionPendiente = pendingFreeRedemptions > 0;

  // Cortes en el ciclo actual hacia el próximo corte gratis (solo cortes pagados)
  const cortesEnCiclo = totalCortes % 10;
  const progreso = (cortesEnCiclo / 10) * 100;
  const cortesParaSiguiente = 10 - cortesEnCiclo;

  const progresoMensaje =
    cortesGratisDisponibles > 0
      ? `¡Felicitaciones! Tienes ${cortesGratisDisponibles} corte${cortesGratisDisponibles === 1 ? '' : 's'} gratis disponible${cortesGratisDisponibles === 1 ? '' : 's'}`
      : totalCortes === 0
      ? 'Agenda tu primer corte para empezar a acumular'
      : `${cortesParaSiguiente} cortes para tu próximo corte gratis`;

  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-black text-white mb-6 tracking-tight">Bienvenido de vuelta</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-900/40 to-red-800/30 border-2 border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-gray-300 text-sm mb-2 font-semibold uppercase tracking-wider">Cortes Realizados</h3>
          <p className="text-5xl font-black text-red-400">{clienteData.cortes_realizados || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-red-900/40 to-pink-900/30 border-2 border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-gray-300 text-sm mb-2 font-semibold uppercase tracking-wider">Puntos XP</h3>
          <p className="text-5xl font-black text-pink-400">{clienteData.puntos_experiencia || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/30 border-2 border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-gray-300 text-sm mb-2 font-semibold uppercase tracking-wider">Nivel Actual</h3>
          <p className="text-5xl font-black text-orange-400">{clienteData.nivel_actual || 1}</p>
        </div>
      </div>

      {/* Resumen de bonos y redenciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border border-emerald-500/40 rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-gray-300 text-xs mb-1 font-semibold uppercase tracking-wider">Bonos generados</h3>
          <p className="text-3xl font-black text-emerald-300">{totalBonosGenerados}</p>
          <p className="text-xs text-emerald-100/80 mt-1">1 bono por cada 10 cortes pagados</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/30 to-green-800/20 border border-emerald-500/40 rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-gray-300 text-xs mb-1 font-semibold uppercase tracking-wider">Bonos disponibles</h3>
          <p className="text-3xl font-black text-emerald-300">{cortesGratisDisponibles}</p>
          <p className="text-xs text-emerald-100/80 mt-1">Puedes redimirlos al agendar tu próximo corte</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/30 to-teal-800/20 border border-emerald-500/40 rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-gray-300 text-xs mb-1 font-semibold uppercase tracking-wider">Cortes gratis redimidos</h3>
          <p className="text-3xl font-black text-emerald-300">{bonosUsados}</p>
          <p className="text-xs text-emerald-100/80 mt-1">Históricamente has usado estos bonos</p>
        </div>
      </div>

      {/* Cortes Gratis Disponibles */}
      {clienteData.cortes_gratis_disponibles > 0 && (
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-800/30 border-2 border-green-500/50 rounded-2xl p-8 text-center backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-white mb-4">🎁 ¡Tienes Cortes Gratis!</h3>
          <div className="text-7xl font-black text-green-400 mb-4">
            {clienteData.cortes_gratis_disponibles}
          </div>
          <p className="text-gray-300 mb-4 text-lg">
            {hayRedencionPendiente
              ? 'Ya tienes un corte gratis agendado. Úsalo antes de redimir otro.'
              : 'Cortes gratis disponibles para usar'}
          </p>
          {!hayRedencionPendiente && (
            <button
              onClick={onUseFreeCut}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-full transition-all font-semibold text-lg shadow-lg shadow-green-500/50"
            >
              Redimir corte gratis
            </button>
          )}
        </div>
      )}

      {/* Progreso */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
        <h3 className="text-2xl font-bold text-white mb-6">Progreso hacia tu próximo corte gratis</h3>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400 font-medium">Cortes realizados</span>
            <span className="text-white font-bold">{cortesEnCiclo}/10</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-8 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-600 via-orange-500 to-red-500 h-8 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
              style={{ width: `${progreso}%` }}
            >
              {progreso > 20 && <span className="text-white text-sm font-bold">{progreso}%</span>}
            </div>
          </div>
          <p className="text-gray-400 mt-3 text-center font-medium">
            {progresoMensaje}
          </p>
        </div>
      </div>

      {/* Historial de Citas Finalizadas */}
      {citas.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
          <h3 className="text-2xl font-bold text-white mb-6">Historial de Citas Finalizadas</h3>
          <div className="space-y-4">
            {citas.map((cita) => {
              const esGratis = Boolean(cita.ventas?.es_corte_gratis) || cita.ventas?.total_final === 0;
              const totalLabel = esGratis
                ? 'Gratis (redención)'
                : cita.ventas?.total_final != null
                ? new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                  }).format(Number(cita.ventas.total_final))
                : null;

              return (
                <div
                  key={cita.id}
                  className="bg-gray-800/50 border border-red-500/10 rounded-xl p-4 hover:border-red-500/30 transition-all"
                >
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="text-white font-semibold">{cita.servicio?.nombre || 'Servicio'}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(cita.fecha_hora).toLocaleDateString('es-ES')}
                      </p>
                      {esGratis && (
                        <p className="mt-1 text-xs text-emerald-300 uppercase tracking-wide">
                          Corte gratis redimido
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          cita.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : cita.status === 'confirmed'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {cita.status}
                      </span>
                      {totalLabel && (
                        <span className="text-xs text-gray-200 font-medium">{totalLabel}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AgendarView: React.FC<{
  clienteData: ClienteData | null;
  isFreeCutMode: boolean;
  onBookingSuccess?: () => void;
  onBookingError?: (message: string) => void;
}> = ({ clienteData, isFreeCutMode, onBookingSuccess, onBookingError }) => (
  <div className="py-6">
    <div className="booking-wrapper">
      <BookingExperience
        defaultNombre={clienteData ? `${clienteData.nombre} ${clienteData.apellido || ''}`.trim() : undefined}
        defaultTelefono={clienteData?.telefono ?? undefined}
        defaultEmail={clienteData?.email ?? undefined}
        clienteId={clienteData?.id}
        isFreeCutMode={isFreeCutMode}
        onBookingSuccess={onBookingSuccess}
        onBookingError={onBookingError}
      />
    </div>
  </div>
);

// Componente de Cola Virtual (solo UI)
const ColaView: React.FC<{ clienteData: ClienteData | null }> = ({ clienteData }) => (
  <div className="py-6">
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-bold text-white mb-3">⏱️ Cola Virtual en Tiempo Real</h2>
      <p className="text-gray-300">Sigue tu turno en vivo y el estado general de la cola</p>
    </div>
    <div className="space-y-6">
      <ClienteQueueStatus clienteData={clienteData} />
      <div className="queue-wrapper">
        <PublicQueueSystem />
      </div>
    </div>
  </div>
);

// Estado personalizado de cola para el cliente
const ClienteQueueStatus: React.FC<{
  clienteData: ClienteData | null;
  onStatusEvent?: (event: {
    estado: 'cola' | 'atendiendo' | 'finalizado';
    rawStatus: string;
    turnNumber: number | null;
    citaId?: string | number;
  }) => void;
}> = ({ clienteData, onStatusEvent }) => {
  const [turn, setTurn] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const hasLoadedOnceRef = React.useRef(false);
  const lastEstadoRef = React.useRef<'cola' | 'atendiendo' | 'finalizado' | null>(null);
  const lastCitaIdRef = React.useRef<string | number | null>(null);

  const fetchTurn = React.useCallback(async () => {
    if (!clienteData?.id) {
      setTurn(null);
      setLoading(false);
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const normalizeStatus = (status: string | null | undefined): string => {
        if (!status) return 'pending';
        const value = status.toLowerCase();
        if (value === 'pendiente') return 'pending';
        if (value === 'confirmada') return 'confirmed';
        if (value === 'en_progreso') return 'in_progress';
        if (value === 'completada') return 'completed';
        if (value === 'cancelada' || value === 'canceled') return 'cancelled';
        if (value === 'ausente') return 'no_show';
        return value;
      };

      const { data: citas, error } = await supabase
        .from('citas')
        .select(`
          id,
          fecha_hora,
          status,
          cliente_nombre,
          barbero_id,
          servicio:servicio_id (
            nombre,
            duracion_minutos,
            precio
          ),
          barbero:barbero_id (
            id,
            nombre,
            apellido
          )
        `)
        .eq('cliente_id', clienteData.id)
        .gte('fecha_hora', startOfDay.toISOString())
        .lt('fecha_hora', endOfDay.toISOString())
        .order('fecha_hora', { ascending: true });

      if (error) {
        setError(error.message ?? 'No pudimos obtener tu estado en la cola');
        setTurn(null);
        return;
      }

      const rows = citas ?? [];

      if (!rows.length) {
        setError(null);
        setTurn(null);
        return;
      }

      const attendingStatuses = new Set([
        'in_progress',
        'in_chair',
        'en_silla',
        'en_progreso',
        'finishing',
        'finalizando',
      ]);
      const waitingStatuses = new Set([
        'pending',
        'waiting',
        'en_espera',
        'confirmed',
        'confirmada',
        'scheduled',
      ]);

      const withNormalizedStatus = rows.map((row: any) => ({
        ...row,
        _normStatus: normalizeStatus(row.status),
      }));

      const currentCita =
        withNormalizedStatus.find((row) => attendingStatuses.has(row._normStatus)) ??
        withNormalizedStatus.find((row) => waitingStatuses.has(row._normStatus)) ??
        withNormalizedStatus[withNormalizedStatus.length - 1];

      if (!currentCita) {
        setError(null);
        setTurn(null);
        return;
      }

      let turnNumber: number | null = null;
      const barberoId = currentCita.barbero_id ?? currentCita.barbero?.id;

      if (barberoId) {
        const { data: barberCitas } = await supabase
          .from('citas')
          .select('id, fecha_hora, status')
          .eq('barbero_id', barberoId)
          .gte('fecha_hora', startOfDay.toISOString())
          .lt('fecha_hora', endOfDay.toISOString())
          .order('fecha_hora', { ascending: true });

        const activeForBarber = (barberCitas ?? []).filter((row: any) => {
          const st = normalizeStatus(row.status);
          return !['completed', 'cancelled', 'no_show'].includes(st);
        });

        const idx = activeForBarber.findIndex((row: any) => row.id === currentCita.id);
        if (idx >= 0) {
          turnNumber = idx + 1;
        }
      }

      const mergedTurn = {
        id: currentCita.id,
        status: currentCita._normStatus,
        status_text: null,
        turn_number: turnNumber,
        estimated_wait_time: null,
        price_estimate: currentCita.servicio?.precio ?? null,
        service_price: currentCita.servicio?.precio ?? null,
        service_duration: currentCita.servicio?.duracion_minutos ?? null,
        barber: currentCita.barbero,
        service: currentCita.servicio,
      };

      setError(null);
      setTurn(mergedTurn);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error('Error cargando estado de cola del cliente:', err);
      setError('No pudimos obtener tu estado en la cola');
      setTurn(null);
    } finally {
      setLoading(false);
    }
  }, [clienteData?.id]);

  React.useEffect(() => {
    fetchTurn();
  }, [fetchTurn]);

  React.useEffect(() => {
    if (!clienteData?.id) return;

    const channel = supabase
      .channel(`client-queue-${clienteData.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas', filter: `cliente_id=eq.${clienteData.id}` },
        () => fetchTurn(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteData?.id, fetchTurn]);

  // Refresco periódico como respaldo en caso de que la suscripción en tiempo real falle
  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchTurn();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchTurn]);

  // Notificar cambios de estado de cola al consumidor (campanita)
  React.useEffect(() => {
    if (!turn) return;

    const rawStatus: string = (turn.status as string | null) ?? '';
    let estado: 'cola' | 'atendiendo' | 'finalizado' = 'cola';

    if (['atendiendo', 'en_silla', 'in_chair', 'in_progress', 'en_progreso'].includes(rawStatus)) {
      estado = 'atendiendo';
    } else if (
      ['finalizado', 'completed', 'completado', 'cancelado', 'cancelled', 'ausente', 'no_show'].includes(rawStatus)
    ) {
      estado = 'finalizado';
    } else {
      estado = 'cola';
    }

    const currentId = turn.id as string | number | undefined;

    if (lastEstadoRef.current !== estado || lastCitaIdRef.current !== (currentId ?? null)) {
      lastEstadoRef.current = estado;
      lastCitaIdRef.current = currentId ?? null;

      onStatusEvent?.({
        estado,
        rawStatus,
        turnNumber: (turn.turn_number as number | null | undefined) ?? null,
        citaId: currentId,
      });
    }
  }, [turn, onStatusEvent]);

  if (!clienteData) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-red-400">Cola personal</p>
          <p className="mt-2 text-sm text-gray-200">Sincronizando tu estado en la cola…</p>
        </div>
        <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (!turn) {
    return (
      <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5 flex flex-col gap-3">
        <div className="text-xs uppercase tracking-[0.35em] text-zinc-400">Cola personal</div>
        <p className="text-lg font-semibold text-white">No estás en la cola en este momento</p>
        <p className="text-sm text-zinc-400">
          Cuando registremos tu llegada a la barbería, verás aquí si estás en cola o siendo atendido, junto con el
          valor estimado a pagar.
        </p>
      </div>
    );
  }

  const rawStatus: string = (turn.status as string | null) ?? '';
  let estado: 'cola' | 'atendiendo' | 'finalizado' = 'cola';

  if (['atendiendo', 'en_silla', 'in_chair', 'in_progress', 'en_progreso'].includes(rawStatus)) {
    estado = 'atendiendo';
  } else if (['finalizado', 'completed', 'completado', 'cancelado', 'cancelled', 'ausente', 'no_show'].includes(rawStatus)) {
    estado = 'finalizado';
  } else {
    estado = 'cola';
  }

  const montoBase = (turn.price_estimate ?? turn.service_price) as number | null | undefined;
  const montoLabel = montoBase != null ? formatPrecio(Number(montoBase)) : 'Por definir';
  const tiempoEspera = typeof turn.estimated_wait_time === 'number' ? turn.estimated_wait_time : null;

  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-900/40 via-red-900/20 to-black/60 p-5 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-red-300">Tu estado en la cola</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {estado === 'atendiendo' && `Ahora mismo estás siendo atendido en tu turno #${turn.turn_number ?? '—'}`}
            {estado === 'cola' && 'Estás en la cola esperando tu turno'}
            {estado === 'finalizado' && 'Tu turno ya fue finalizado en la cola de hoy'}
          </p>
          {turn.status_text && (
            <p className="mt-1 text-sm text-red-200/80">{turn.status_text}</p>
          )}
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <span className="inline-flex items-center rounded-full border border-red-500/50 bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-red-100">
            Turno #{turn.turn_number ?? '—'}
          </span>
          {tiempoEspera !== null && estado !== 'finalizado' && (
            <span className="text-xs text-red-100/80">
              Espera estimada: {tiempoEspera} min
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-700/70 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 mb-1">Barbero</p>
          <p className="text-sm font-semibold text-white">
            {turn.barber?.nombre ? `${turn.barber.nombre} ${turn.barber.apellido ?? ''}` : 'Por asignar'}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-1">Servicio</p>
          <p className="text-sm text-zinc-200">{turn.service?.nombre ?? 'Por definir'}</p>
        </div>

        <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200 mb-1">Monto estimado</p>
            <p className="text-xl font-bold text-emerald-300">{montoLabel}</p>
            <p className="mt-1 text-[11px] text-emerald-100/80">
              El valor final puede variar según servicios adicionales o productos que elijas en tu visita.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helpers reutilizados de la página de galería
const FALLBACK_IMAGES: Record<string, string> = {
  corte: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&h=600&fit=crop&crop=center',
  gorra: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=600&fit=crop&crop=center',
  vape: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba9?w=800&h=600&fit=crop&crop=center',
  default: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop&crop=center'
};

const mapGaleriaImagenes = (imagenes: string[] | null | undefined) => {
  if (!imagenes || imagenes.length === 0) return [];

  return imagenes
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    .map((url) => {
      if (/^https?:\/\//i.test(url)) return url;

      const base = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
      if (!base) return url;

      const normalized = url.startsWith('galeria/') ? url.replace(/^galeria\//, '') : url;
      return `${base}/storage/v1/object/public/galeria/${normalized}`;
    });
};

const formatPrecio = (precio: number | null | undefined) => {
  if (typeof precio !== 'number' || Number.isNaN(precio)) return '—';

  try {
    return precio.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    });
  } catch (error) {
    console.warn('No se pudo formatear el precio', precio, error);
    return `$${precio.toFixed(0)}`;
  }
};

const formatSabores = (sabores: string[]) => {
  if (!sabores.length) return null;
  return sabores.join(', ');
};

const mapGaleriaItem = (row: GaleriaItem) => {
  const metadata = (row.metadata as Record<string, unknown> | null | undefined) ?? {};
  const imagenes = mapGaleriaImagenes(row.imagenes ?? []);
  const primaryImage = imagenes[0] ?? FALLBACK_IMAGES[row.tipo] ?? FALLBACK_IMAGES.default;
  const colores = Array.isArray(row.colores)
    ? row.colores.filter((color): color is string => typeof color === 'string')
    : [];
  const sabores = Array.isArray(row.sabores)
    ? row.sabores.filter((sabor): sabor is string => typeof sabor === 'string')
    : [];
  const tags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  const infoLabel = (() => {
    if (row.tipo === 'corte') {
      const duracion = metadata?.duracion as string | number | undefined;
      const duracionEstimada = metadata?.duracion_estimada as string | number | undefined;

      if (typeof duracion === 'number') return `${duracion} min`;
      if (typeof duracion === 'string' && duracion.trim().length > 0) return duracion;
      if (typeof duracionEstimada === 'number') return `${duracionEstimada} min`;
      if (typeof duracionEstimada === 'string' && duracionEstimada.trim().length > 0) return duracionEstimada;
      return null;
    }

    if (row.tipo === 'gorra') {
      if (typeof row.stock === 'number') return `${row.stock} en stock`;
      return null;
    }

    if (row.tipo === 'vape') {
      const nicotina = typeof row.nicotina_mg === 'number' ? `${row.nicotina_mg} mg` : null;
      const saboresLabel = sabores.length ? `${sabores.length} sabores` : null;
      const pieces = [nicotina, saboresLabel].filter((value): value is string => Boolean(value));
      return pieces.length ? pieces.join(' • ') : null;
    }

    return null;
  })();

  return {
    id: row.id,
    tipo: row.tipo,
    nombre: row.nombre,
    descripcion: typeof row.descripcion === 'string' ? row.descripcion : '',
    precio: typeof row.precio === 'number' ? row.precio : null,
    precioFormatted: formatPrecio(row.precio),
    imagenes,
    primaryImage,
    destacado: Boolean(row.destacado),
    colores,
    sabores,
    saboresLabel: formatSabores(sabores),
    nicotina_mg: typeof row.nicotina_mg === 'number' ? row.nicotina_mg : null,
    stock: typeof row.stock === 'number' ? row.stock : null,
    tags,
    infoLabel,
    metadata,
  };
};

type CategoriaGaleria = 'todos' | 'corte' | 'gorra' | 'vape';

const GaleriaView = () => {
  const [items, setItems] = React.useState<ReturnType<typeof mapGaleriaItem>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoria, setCategoria] = React.useState<CategoriaGaleria>('todos');
  const [modalItem, setModalItem] = React.useState<ReturnType<typeof mapGaleriaItem> | null>(null);
  const [imagenActual, setImagenActual] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;

    const cargarGaleria = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('galeria_items')
          .select('*')
          .eq('activo', true)
          .order('destacado', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (isMounted) {
          setItems((data ?? []).map((row) => mapGaleriaItem(row as GaleriaItem)));
        }
      } catch (error) {
        console.error('Error cargando galería:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    cargarGaleria();

    return () => {
      isMounted = false;
    };
  }, []);

  const itemsFiltrados = categoria === 'todos'
    ? items
    : items.filter((item) => item.tipo === categoria);

  const categorias: { id: CategoriaGaleria; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'corte', label: 'Cortes' },
    { id: 'gorra', label: 'Gorras' },
    { id: 'vape', label: 'Vapes' },
  ];

  const abrirModal = (item: ReturnType<typeof mapGaleriaItem>) => {
    setModalItem(item);
    setImagenActual(0);
    document.body.style.overflow = 'hidden';
  };

  const cerrarModal = () => {
    setModalItem(null);
    setImagenActual(0);
    document.body.style.overflow = 'auto';
  };

  const cambiarImagen = (direccion: number) => {
    if (!modalItem) return;
    let nuevaImagen = imagenActual + direccion;
    if (nuevaImagen >= modalItem.imagenes.length) nuevaImagen = 0;
    if (nuevaImagen < 0) nuevaImagen = modalItem.imagenes.length - 1;
    setImagenActual(nuevaImagen);
  };

  return (
    <div className="py-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">🎨 Galería JP Barber</h2>
        <p className="text-gray-300 mb-6">Explora nuestros cortes, estilos y productos</p>

        <div className="flex justify-center gap-3 flex-wrap">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoria(cat.id)}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                categoria === cat.id
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-red-500/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {itemsFiltrados.map((item) => (
            <div
              key={item.id}
              className="group bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-red-500/20 hover:border-red-500/50 transition-all duration-300 hover:scale-105"
            >
              <div className="relative aspect-square overflow-hidden bg-black/40">
                <img
                  src={item.primaryImage}
                  alt={item.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/90 text-white backdrop-blur-sm">
                  {item.tipo === 'corte' ? 'Corte' : item.tipo === 'gorra' ? 'Gorra' : 'Vape'}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white flex-1">{item.nombre}</h3>
                  {item.destacado && (
                    <span className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1">
                      Destacado
                    </span>
                  )}
                </div>

                {item.descripcion && (
                  <p className="text-sm text-gray-300 line-clamp-3">{item.descripcion}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  {item.infoLabel && (
                    <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                      {item.infoLabel}
                    </span>
                  )}
                  {item.colores?.length ? (
                    <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                      Colores: {item.colores.join(', ')}
                    </span>
                  ) : null}
                  {item.saboresLabel && (
                    <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                      Sabores: {item.saboresLabel}
                    </span>
                  )}
                  {typeof item.stock === 'number' && (
                    <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                      Stock: {item.stock > 0 ? item.stock : 'Agotado'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xl font-bold text-red-400">{item.precioFormatted}</span>
                  <button
                    type="button"
                    className="text-sm font-semibold text-red-500 hover:text-red-300 transition-colors"
                    onClick={() => abrirModal(item)}
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && itemsFiltrados.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No hay elementos en esta categoría</p>
        </div>
      )}

      {/* Modal de detalle */}
      {modalItem && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={cerrarModal}
        >
          <div 
            className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-3xl border border-zinc-700/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-6 border-b border-zinc-700/50 flex justify-between items-center">
              <h2 className="font-montserrat text-2xl font-bold text-white">{modalItem.nombre}</h2>
              <button 
                onClick={cerrarModal}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Galería */}
                <div className="lg:w-2/3">
                  <div className="relative mb-4">
                    <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-2xl overflow-hidden shadow-2xl">
                      <img 
                        src={modalItem.imagenes[imagenActual] || modalItem.primaryImage} 
                        alt={modalItem.nombre}
                        className="w-full h-full object-cover transition-all duration-500"
                      />
                    </div>

                    {modalItem.imagenes.length > 1 && (
                      <>
                        <button 
                          onClick={() => cambiarImagen(-1)}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => cambiarImagen(1)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        {/* Indicadores */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/30 px-3 py-2 rounded-full backdrop-blur-sm">
                          {modalItem.imagenes.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setImagenActual(index)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === imagenActual ? 'bg-red-500' : 'bg-white/30'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Miniaturas */}
                  {modalItem.imagenes.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {modalItem.imagenes.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setImagenActual(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                            index === imagenActual ? 'border-red-500' : 'border-zinc-600 hover:border-zinc-500'
                          }`}
                        >
                          <img src={img} alt={`${modalItem.nombre} ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="lg:w-1/3 flex flex-col">
                  <div className="mb-6">
                    <h3 className="font-montserrat text-2xl lg:text-3xl font-bold text-white mb-4">{modalItem.nombre}</h3>
                    <p className="text-white/70 mb-6 leading-relaxed">{modalItem.descripcion}</p>

                    {/* Tags */}
                    {modalItem.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {modalItem.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-blue-600/90 text-white px-2 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Precio y acción */}
                  <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-700/80 rounded-2xl p-6 border border-zinc-600/30 backdrop-blur-sm mt-auto">
                    <div className="flex flex-col justify-between items-start mb-6">
                      <span className="text-red-400 font-bold text-3xl lg:text-4xl mb-2">{modalItem.precioFormatted}</span>
                      {modalItem.infoLabel && (
                        <span className="text-white/60 text-sm">{modalItem.infoLabel}</span>
                      )}
                    </div>

                    <button 
                      onClick={() => window.location.href = '/agendar'}
                      className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Reservar Cita
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

