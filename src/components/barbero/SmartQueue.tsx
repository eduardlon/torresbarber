import React, { useState, useEffect } from 'react';
import TurnRegistrationModal from './TurnRegistrationModal';
import ClientIntelligence from './ClientIntelligence';
import SalesForm from './SalesForm';
import TurnsModal from './TurnsModal';
import { requestBarberoApi } from '../../utils/barbero-api-request';
import type { DailyTurn } from '../../types';

type QueueStatus = 'waiting' | 'called' | 'in_progress' | 'finishing' | 'completed' | 'cancelled' | 'no_show';

interface QueueTurn {
  id: number;
  status: QueueStatus;
  turn_number: number;
  queue_number: number;
  created_at?: string | null;
  called_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  scheduled_time?: string | null;
  client_name?: string;
  client_phone?: string | null;
  client_email?: string | null;
  client_id?: number | string | null;
  appointment_id?: number;
  service_name?: string;
  priority?: number | string | null;
  estimated_duration?: number | null;
  notes?: string | null;
  justCalled?: boolean;
  original: DailyTurn;
}

const DB_TO_UI_STATUS: Record<DailyTurn['status'], QueueStatus> = {
  en_espera: 'waiting',
  llamado: 'called',
  en_progreso: 'in_progress',
  finalizando: 'finishing',
  completado: 'completed',
  cancelado: 'cancelled',
  no_show: 'no_show'
};

const UI_TO_DB_STATUS: Record<QueueStatus, DailyTurn['status']> = {
  waiting: 'en_espera',
  called: 'llamado',
  in_progress: 'en_progreso',
  finishing: 'finalizando',
  completed: 'completado',
  cancelled: 'cancelado',
  no_show: 'no_show'
};

const todayISO = () => new Date().toISOString().split('T')[0];

const mapDailyTurnToQueueTurn = (turn: DailyTurn): QueueTurn => {
  const status = DB_TO_UI_STATUS[turn.status] ?? 'waiting';

  return {
    id: Number(turn.id),
    status,
    turn_number: turn.turn_number,
    queue_number: turn.turn_number,
    created_at: turn.created_at,
    called_at: turn.called_at ?? undefined,
    start_time: turn.start_time ?? undefined,
    end_time: turn.end_time ?? undefined,
    scheduled_time: turn.scheduled_time ?? undefined,
    client_name: turn.client_name ?? turn.cliente?.nombre ?? turn.invitado?.nombre ?? 'Cliente',
    client_phone: turn.client_phone ?? turn.cliente?.telefono ?? turn.invitado?.telefono ?? null,
    client_email: turn.client_email ?? turn.cliente?.email ?? turn.invitado?.email ?? null,
    client_id: turn.cliente_id ?? turn.invitado_id ?? null,
    appointment_id: turn.appointment_id,
    service_name: turn.service_name ?? turn.service?.nombre ?? 'Servicio',
    priority: turn.priority ?? undefined,
    estimated_duration: turn.estimated_duration ?? turn.service?.duracion_minutos ?? null,
    notes: turn.notes ?? null,
    original: turn
  };
};

interface SmartQueueProps {
  barberoInfo: {
    id: number;
    [key: string]: unknown;
  };
}

const SmartQueue: React.FC<SmartQueueProps> = ({ barberoInfo }) => {
  const [turns, setTurns] = useState<QueueTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turnStats, setTurnStats] = useState({
    waiting: 0,
    called: 0,
    inProgress: 0,
    finishing: 0,
    total: 0
  });

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedTurn, setSelectedTurn] = useState<QueueTurn | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(30);
  const [turnToStart, setTurnToStart] = useState<QueueTurn | null>(null);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [turnToComplete, setTurnToComplete] = useState<QueueTurn | null>(null);
  const [showTurnsModal, setShowTurnsModal] = useState(false);
  const [modalTurns, setModalTurns] = useState<QueueTurn[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalStatus, setModalStatus] = useState('');

  useEffect(() => {
    if (barberoInfo?.id) {
      void loadTurns();

      const interval = setInterval(() => {
        void loadTurns(true);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [barberoInfo?.id]);

  // Actualizar modalTurns automáticamente cuando cambien los turns y el modal esté abierto
  useEffect(() => {
    if (showTurnsModal && modalStatus) {
      let filteredTurns = [];
      
      switch (modalStatus) {
        case 'waiting':
          filteredTurns = turns.filter(t => t.status === 'waiting');
          break;
        case 'called':
          filteredTurns = turns.filter(t => t.status === 'called');
          break;
        case 'in_progress':
          filteredTurns = turns.filter(t => t.status === 'in_progress');
          break;
        case 'finishing':
          filteredTurns = turns.filter(t => t.status === 'finishing');
          break;
        case 'all':
          filteredTurns = turns;
          break;
        default:
          filteredTurns = turns.filter(t => t.status === modalStatus);
      }
      
      setModalTurns(filteredTurns);
    }
  }, [turns, showTurnsModal, modalStatus]);
  
  const updateStats = (list: QueueTurn[]) => {
    setTurnStats({
      waiting: list.filter((t) => t.status === 'waiting').length,
      called: list.filter((t) => t.status === 'called').length,
      inProgress: list.filter((t) => t.status === 'in_progress').length,
      finishing: list.filter((t) => t.status === 'finishing').length,
      total: list.length
    });
  };

  const loadTurns = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const response = await requestBarberoApi<{ turnos: DailyTurn[] }>(
        `/api/barbero/turnos?fecha=${todayISO()}`
      );

      const mappedTurns = (response.turnos ?? []).map(mapDailyTurnToQueueTurn);

      setTurns((prevTurns) => {
        const hasChanged = JSON.stringify(prevTurns) !== JSON.stringify(mappedTurns);
        return hasChanged ? mappedTurns : prevTurns;
      });

      updateStats(mappedTurns);
      setError(null);
    } catch (err) {
      console.error('Error cargando turnos:', err);
      setError('Error al cargar los turnos');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Removed manual refresh - now fully real-time

  const callTurn = async (turnId: number) => {
    const currentTime = new Date().toISOString();
    const calledTime = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Actualizar el estado local INMEDIATAMENTE (sin esperar respuesta)
    setTurns(prevTurns => 
      prevTurns.map(turn => 
        turn.id === turnId 
          ? { ...turn, status: 'called', called_at: currentTime, justCalled: true }
          : turn
      )
    );
    
    // Remover el indicador de "recién llamado" después de 2 segundos
    setTimeout(() => {
      setTurns(prevTurns => 
        prevTurns.map(turn => 
          turn.id === turnId 
            ? { ...turn, justCalled: false }
            : turn
        )
      );
    }, 2000);
    
    // Actualizar estadísticas INMEDIATAMENTE
    setTurnStats(prevStats => ({
      ...prevStats,
      waiting: Math.max(0, prevStats.waiting - 1),
      called: prevStats.called + 1
    }));
    
    // Mostrar mensaje INMEDIATAMENTE
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 opacity-0';
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <span>Cliente llamado exitosamente a las ${calledTime}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada inmediatamente
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });
    
    // Remover la notificación después de 4 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
    
    // Hacer la llamada al servidor en segundo plano (sin bloquear la UI)
    try {
      await requestBarberoApi(`/api/barbero/turnos/${turnId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: UI_TO_DB_STATUS.called }),
      });

      void loadTurns(true);
    } catch (error) {
      console.error('Error calling turn:', error);
      // Si falla, revertir el cambio
      setTurns(prevTurns => 
        prevTurns.map(turn => 
          turn.id === turnId 
            ? { ...turn, status: 'waiting', called_at: null }
            : turn
        )
      );
      
      setTurnStats(prevStats => ({
        ...prevStats,
        waiting: prevStats.waiting + 1,
        called: Math.max(0, prevStats.called - 1)
      }));
      
      setError('Error al llamar el turno');
    }
  };

  const handleStartTurn = async (turn: QueueTurn) => {
    setTurnToStart(turn);
    setEstimatedDuration(turn.estimated_duration || 30);
    setShowDurationModal(true);
  };

  const confirmStartTurn = async () => {
    try {
      if (!turnToStart) {
        throw new Error('No se seleccionó turno para iniciar');
      }

      const startTime = new Date().toISOString();

      await requestBarberoApi(`/api/barbero/turnos/${turnToStart.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: UI_TO_DB_STATUS['in_progress'], start_time: startTime, estimated_duration: estimatedDuration }),
      });

      await loadTurns(true);
      setShowDurationModal(false);
      setTurnToStart(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar el turno';
      setError(message);
    }
  };

  const finishingTurn = async (turnId: number) => {
    try {
      await requestBarberoApi(`/api/barbero/turnos/${turnId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: UI_TO_DB_STATUS.finishing }),
      });

      await loadTurns(true);
    } catch (error) {
      console.error('Error finishing turn:', error);
      setError('Error al cambiar estado a finalizando');
    }
  };

  const readyToPayTurn = async (turnId: number) => {
    // Encontrar el turno que está listo para pagar
    const turn = turns.find(t => t.id === turnId);
    if (turn) {
      // Abrir el modal de ventas directamente
      setTurnToComplete(turn);
      setShowSalesForm(true);
    } else {
      setError('No se pudo encontrar el turno');
    }
  };

  const handleFinishTurn = async (turnId: number) => {
    // Encontrar el turno que se va a completar
    const turn = turns.find(t => t.id === turnId);
    if (turn) {
      setTurnToComplete(turn);
      setShowSalesForm(true);
    }
  };

  const completeTurnWithSale = async (saleData: unknown) => {
    try {
      if (!turnToComplete) {
        throw new Error('No se encontró el turno a completar');
      }

      const endTime = new Date().toISOString();

      await requestBarberoApi(`/api/barbero/turnos/${turnToComplete.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: UI_TO_DB_STATUS.completed }),
      });

      await loadTurns(true);
      setShowSalesForm(false);
      setTurnToComplete(null);
      console.log('Turno completado y venta registrada:', saleData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al finalizar el turno';
      setError(message);
    }
  };

  const cancelSaleForm = () => {
    setShowSalesForm(false);
    setTurnToComplete(null);
  };

  const openTurnsModal = (status: QueueStatus | 'all', title: string) => {
    let filteredTurns: QueueTurn[] = [];
    
    switch (status) {
      case 'waiting':
        filteredTurns = turns.filter(t => t.status === 'waiting');
        break;
      case 'called':
        filteredTurns = turns.filter(t => t.status === 'called');
        break;
      case 'in_progress':
        filteredTurns = turns.filter(t => t.status === 'in_progress');
        break;
      case 'finishing':
        filteredTurns = turns.filter(t => t.status === 'finishing');
        break;
      case 'all':
        filteredTurns = turns;
        break;
      default:
        filteredTurns = turns.filter(t => t.status === status);
    }
    
    setModalTurns(filteredTurns);
    setModalTitle(title);
    setModalStatus(status);
    setShowTurnsModal(true);
  };

  const closeTurnsModal = () => {
    setShowTurnsModal(false);
    setModalTurns([]);
    setModalTitle('');
    setModalStatus('');
  };

  const handleViewClient = (turn: QueueTurn) => {
    setSelectedTurn(turn);
    setShowClientModal(true);
  };

  const getStatusColor = (status: QueueStatus | 'ready_to_pay') => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'called':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'finishing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'cancelled':
      case 'no_show':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: QueueStatus | 'ready_to_pay') => {
    switch (status) {
      case 'waiting':
        return '🔵 En Espera';
      case 'called':
        return '🟡 Llamado';
      case 'in_progress':
        return '🟢 En la Silla';
      case 'finishing':
        return '🟣 Finalizando';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'no_show':
        return status;
    }
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!barberoInfo?.id) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Cargando información del barbero...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-200 border-t-yellow-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-white/80 font-medium">Cargando cola inteligente...</p>
          <p className="text-white/60 text-sm">Sincronizando turnos en tiempo real</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8 p-3 md:p-6 pb-20 md:pb-6">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 md:gap-6">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl md:text-3xl font-bold text-white mb-1">Cola Inteligente</h2>
                <p className="text-white/90 text-sm md:text-lg">Gestión avanzada de turnos con IA</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl px-2 md:px-4 py-1 md:py-2 flex items-center space-x-1 md:space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-xs md:text-sm font-medium">Tiempo real activo</span>
              </div>
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="bg-white hover:bg-white/90 text-yellow-600 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-1 md:space-x-2 text-sm md:text-base"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Nuevo Turno</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-16 h-16 md:w-32 md:h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 md:-translate-y-16 md:translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 md:w-24 md:h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6 md:translate-y-12 md:-translate-x-12"></div>
      </div>

      {/* Enhanced Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-xl shadow-lg border-l-4 border-red-300 animate-pulse">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-red-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Error en la cola</p>
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
        <button 
          onClick={() => openTurnsModal('waiting', 'Turnos en Espera')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold mb-1 transition-all duration-300">{turns.filter(t => t.status === 'waiting').length}</div>
              <div className="text-blue-100 font-medium text-xs md:text-sm">🔵 En Espera</div>
            </div>
            <div className="bg-white/20 p-1 md:p-2 rounded-lg md:rounded-xl">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </button>
        <button 
          onClick={() => openTurnsModal('called', 'Turnos Llamados')}
          className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold mb-1 transition-all duration-300">{turns.filter(t => t.status === 'called').length}</div>
              <div className="text-yellow-100 font-medium text-xs md:text-sm">🟡 Llamados</div>
            </div>
            <div className="bg-white/20 p-1 md:p-2 rounded-lg md:rounded-xl">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          </div>
        </button>
        <button 
          onClick={() => openTurnsModal('in_progress', 'Turnos en la Silla')}
          className="bg-gradient-to-br from-green-500 to-green-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold mb-1">{turns.filter(t => t.status === 'in_progress').length}</div>
              <div className="text-green-100 font-medium text-xs md:text-sm">🟢 En la Silla</div>
            </div>
            <div className="bg-white/20 p-1 md:p-2 rounded-lg md:rounded-xl">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </button>
        <button 
          onClick={() => openTurnsModal('finishing', 'Turnos Finalizando')}
          className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold mb-1">{turns.filter(t => t.status === 'finishing').length}</div>
              <div className="text-purple-100 font-medium text-xs md:text-sm">🟣🏁 Finalizando</div>
            </div>
            <div className="bg-white/20 p-1 md:p-2 rounded-lg md:rounded-xl">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </button>
        <button 
          onClick={() => openTurnsModal('all', 'Todos los Turnos de Hoy')}
          className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-2xl col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold mb-1">{turns.length}</div>
              <div className="text-orange-100 font-medium text-xs md:text-sm">Total Turnos</div>
            </div>
            <div className="bg-white/20 p-1 md:p-2 rounded-lg md:rounded-xl">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {/* Today's Turns Section */}
      <div className="mt-4 md:mt-8">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Turnos de Hoy
          </h3>
          <button
            onClick={() => openTurnsModal('all', 'Todos los Turnos de Hoy')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 md:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-1 md:gap-2 text-sm md:text-base"
          >
            <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Ver Todos</span>
            <span className="sm:hidden">Todos</span>
          </button>
        </div>
        
        {turns.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-6 md:p-8 text-center border border-white/20">
            <svg className="w-12 h-12 md:w-16 md:h-16 text-white/40 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <p className="text-white/80 text-base md:text-lg font-medium">No hay turnos programados para hoy</p>
            <p className="text-white/60 mt-2 text-sm md:text-base">Los turnos aparecerán aquí cuando se registren</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {turns.slice(0, 6).map((turn) => (
              <div key={`${turn.id}-${turn.status}-${turn.called_at || 'no-call'}`} className={`bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3 md:p-4 hover:bg-white/20 transition-all duration-200 hover:scale-105 ${turn.status === 'called' ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''} ${turn.justCalled ? 'animate-pulse ring-4 ring-yellow-300 bg-yellow-500/20' : ''}`}>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                      turn.status === 'waiting' ? 'bg-blue-400' :
                      turn.status === 'called' ? 'bg-yellow-400' :
                      turn.status === 'in_progress' ? 'bg-green-400' :
                      turn.status === 'finishing' ? 'bg-purple-400' :
                      turn.status === 'completed' ? 'bg-gray-400' :
                      turn.status === 'cancelled' ? 'bg-red-400' :
                      turn.status === 'no_show' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-xs md:text-sm font-medium text-white/80">
                      #{turn.turn_number}
                    </span>
                  </div>
                  <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                    turn.status === 'waiting' ? 'bg-blue-500/20 text-blue-300' :
                    turn.status === 'called' ? 'bg-yellow-500/20 text-yellow-300' :
                    turn.status === 'in_progress' ? 'bg-green-500/20 text-green-300' :
                    turn.status === 'finishing' ? 'bg-purple-500/20 text-purple-300' :
                    turn.status === 'completed' ? 'bg-gray-500/20 text-gray-300' :
                    turn.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                    turn.status === 'no_show' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {getStatusText(turn.status)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-white truncate">
                      {turn.client_name || 'Cliente'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-white/70">
                      {turn.created_at ? formatTime(turn.created_at) : 'Sin hora'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-white/70 truncate">
                      {turn.service_name || 'Servicio'}
                    </span>
                  </div>
                  
                  {/* Información adicional de citas */}
                  {turn.appointment_id && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-green-300 font-semibold">Cita Programada</span>
                      </div>
                      {turn.scheduled_time && (
                        <div className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-blue-300">Hora: {formatTime(turn.scheduled_time)}</span>
                        </div>
                      )}
                      {turn.priority && (
                        <div className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          <span className={`text-xs font-semibold ${
                            turn.priority === 'high' ? 'text-red-300' :
                            turn.priority === 'medium' ? 'text-yellow-300' :
                            'text-green-300'
                          }`}>
                            Prioridad: {turn.priority === 'high' ? 'Alta' : turn.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/20">
                  <button
                    onClick={() => handleViewClient(turn)}
                    className="group w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-3 border border-blue-400/30 hover:border-blue-400/50 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/20 transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-500/30 rounded-lg group-hover:bg-blue-500/50 transition-colors duration-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="flex-1">Ver Detalles del Cliente</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {turns.length > 6 && (
          <div className="mt-4 sm:mt-6 text-center">
            <button
              onClick={() => openTurnsModal('all', 'Todos los Turnos de Hoy')}
              className="text-yellow-400 hover:text-yellow-300 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 mx-auto transition-colors duration-200"
            >
              <span className="hidden sm:inline">Ver {turns.length - 6} turnos más</span>
              <span className="sm:hidden">Ver más ({turns.length - 6})</span>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>



      {/* Modals */}
      {showRegistrationModal && (
        <TurnRegistrationModal
          barberoId={barberoInfo.id}
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={() => {
            setShowRegistrationModal(false);
            void loadTurns();
          }}
        />
      )}

      {showClientModal && selectedTurn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-900/95 via-black/90 to-gray-800/95 backdrop-blur-md rounded-2xl sm:rounded-3xl max-w-5xl w-full min-h-[95vh] sm:min-h-0 sm:max-h-[95vh] overflow-hidden shadow-2xl border border-white/10 my-4 sm:my-0 flex flex-col">
            {/* Header oscuro y moderno */}
            <div className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-sm p-3 sm:p-6 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-2xl font-bold text-white truncate">Detalles del Cliente</h3>
                    <p className="text-gray-300 text-xs sm:text-sm hidden sm:block">Información completa para el barbero</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="p-2 sm:p-3 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-200 text-gray-400 hover:text-white group flex-shrink-0"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              <ClientIntelligence clientId={selectedTurn.client_id} turnData={selectedTurn} />
            </div>
          </div>
        </div>
      )}

      {showDurationModal && turnToStart && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-2 sm:p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl sm:rounded-2xl max-w-lg w-full mx-2 sm:mx-4 shadow-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Iniciar Corte</h3>
                    <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Configurar duración estimada</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDurationModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-6">
              {/* Client and Service Info */}
              <div className="bg-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-white/10">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 rounded-md sm:rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Cliente</p>
                      <p className="text-white font-semibold text-sm sm:text-base">{turnToStart.client_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500/20 rounded-md sm:rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Servicio</p>
                      <p className="text-white font-semibold text-sm sm:text-base">{turnToStart.service_name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration Input */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3 flex items-center space-x-1 sm:space-x-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Duración estimada (minutos)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(parseInt(e.target.value))}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-white/50 font-medium text-base sm:text-lg text-center backdrop-blur-sm"
                    placeholder="30"
                  />
                  <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-white/60 text-xs sm:text-sm font-medium">min</span>
                  </div>
                </div>
                <div className="mt-1 sm:mt-2 flex justify-between text-xs text-white/60">
                  <span>Mínimo: 5 min</span>
                  <span>Máximo: 180 min</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={() => setShowDurationModal(false)}
                  className="flex-1 px-3 sm:px-6 py-2 sm:py-3 text-white bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 border border-white/20 hover:border-white/30"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmStartTurn}
                  className="flex-1 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center space-x-1 sm:space-x-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4V8a3 3 0 016 0v2M5 12h14l-1 7H6l-1-7z" />
                  </svg>
                  <span className="hidden sm:inline">Iniciar Turno</span>
                  <span className="sm:hidden">Iniciar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSalesForm && turnToComplete && (
         <SalesForm
           turn={turnToComplete}
           onClose={cancelSaleForm}
           onSuccess={completeTurnWithSale}
           barberoInfo={barberoInfo}
         />
       )}

      {showTurnsModal && (
        <TurnsModal
          turns={modalTurns}
          title={modalTitle}
          status={modalStatus}
          onClose={closeTurnsModal}
          onCallTurn={callTurn}
          onStartTurn={handleStartTurn}
          onFinishingTurn={finishingTurn}
          onReadyToPayTurn={readyToPayTurn}
          onFinishTurn={handleFinishTurn}
          onViewClient={handleViewClient}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          formatTime={formatTime}
        />
      )}
    </div>
  );
};

export default SmartQueue;