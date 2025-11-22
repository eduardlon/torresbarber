import React, { useState, useEffect, useCallback } from 'react';
import ModalFinalizarVenta from './ModalFinalizarVenta.js';
import AgendarCitaDesdeCola from './AgendarCitaDesdeCola';
import ConfirmActionModal from './ConfirmActionModal';
import { supabase } from '../../lib/supabase';

type VentaRelacion = {
  id: string;
  total_final: number | null;
  metodo_pago?: string | null;
};

const normalizeStatus = (status?: string | null) => (status ?? '').toLowerCase();
const isCompletedStatus = (status?: string | null) => normalizeStatus(status) === 'completed';
const isRejectedStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return normalized === 'cancelled' || normalized === 'no_show';
};

interface EtapaHistorialEntry {
  etapa: string;
  fecha: string;
}

interface Cita {
  id: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  fecha_hora: string;
  status: string;
  etapa_cola?: 'cola' | 'silla' | 'atendiendo' | 'finalizado' | 'rechazado' | null;
  posicion_cola?: number;
  hora_llegada?: string;
  hora_inicio_atencion?: string;
  hora_finalizacion?: string;
  servicio_id?: string;
  etapa_cola_historial?: EtapaHistorialEntry[] | null;
  colafinal?: 'completado' | 'rechazada' | null;
  colafinal_at?: string | null;
  servicio: {
    id: string;
    nombre: string;
    duracion_minutos: number;
    precio: number;
  } | null;
  ventas?: VentaRelacion | null;
}

interface BarberoInfo {
  id: number | string;
  nombre: string;
  apellido?: string;
}

interface GestionColaProps {
  barberoInfo: BarberoInfo | null;
  mostrarNotificacion: (mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') => void;
}

const estadosConfig = {
  pending: { label: 'Pendiente', color: 'gray', icon: '⏳' },
  scheduled: { label: 'Agendada', color: 'blue', icon: '📅' },
  confirmed: { label: 'Confirmada', color: 'green', icon: '✓' },
  waiting: { label: 'En Cola', color: 'yellow', icon: '⏱️' },
  in_chair: { label: 'En Silla', color: 'purple', icon: '💺' },
  in_progress: { label: 'En Progreso', color: 'purple', icon: '✂️' },
  finishing: { label: 'Finalizando', color: 'orange', icon: '🎯' },
  completed: { label: 'Completado', color: 'green', icon: '✅' },
  cancelled: { label: 'Cancelado', color: 'red', icon: '❌' },
  no_show: { label: 'No Asistió', color: 'red', icon: '🚫' }
};

type BarberoApiResponse<T> = {
  success: boolean;
  message?: string;
} & T;

const normalizeVentaRelacion = (venta?: VentaRelacion | VentaRelacion[] | null): VentaRelacion | null => {
  if (!venta) {
    return null;
  }

  const data = Array.isArray(venta) ? venta[0] : venta;
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    total_final:
      typeof data.total_final === 'number'
        ? data.total_final
        : data.total_final != null
        ? Number(data.total_final)
        : null,
    metodo_pago: data.metodo_pago ?? null,
  };
};

const getVentaTotal = (cita: Cita): number => {
  // Solo retornar el total si hay una venta registrada
  // Si fue rechazada o no tiene venta, retornar 0
  if (cita.colafinal === 'rechazada') {
    return 0;
  }
  if (cita.ventas?.total_final != null) {
    return Number(cita.ventas.total_final);
  }
  // Si está completada pero no tiene venta, usar precio del servicio
  if (cita.colafinal === 'completado') {
    return cita.servicio?.precio ?? 0;
  }
  return 0;
};

const formatearMonto = (valor: number | null | undefined): string => {
  if (valor == null || Number.isNaN(valor)) {
    return '0';
  }
  return valor.toLocaleString('es-CO');
};

const requestBarberoApi = async <T,>(endpoint: string, init: RequestInit = {}): Promise<T> => {
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  const response = await fetch(endpoint, { ...init, headers });
  const data = (await response.json().catch(() => null)) as BarberoApiResponse<T> | null;

  if (!response.ok || !data || data.success === false) {
    throw new Error(data?.message || 'Error al comunicar con el servidor');
  }

  return data;
};

/**
 * Registra una etapa en el historial de la cita
 */
const registrarEtapaCita = async (cita: Cita, etapa: 'cola' | 'silla' | 'atendiendo' | 'finalizado' | 'rechazado') => {
  try {
    const { data: citaActual, error: errorConsulta } = await supabase
      .from('citas')
      .select('etapa_cola_historial')
      .eq('id', cita.id)
      .single();

    if (errorConsulta) {
      console.error('❌ Error al consultar cita:', errorConsulta);
      return;
    }

    const historial = citaActual?.etapa_cola_historial || [];
    const nuevoRegistro: EtapaHistorialEntry = {
      etapa,
      fecha: new Date().toISOString(),
    };

    const nuevoHistorial = [...historial, nuevoRegistro];

    const { error: errorActualizacion } = await supabase
      .from('citas')
      .update({
        etapa_cola: etapa,
        etapa_cola_historial: nuevoHistorial,
      })
      .eq('id', cita.id);

    if (errorActualizacion) {
      console.error('❌ Error al registrar etapa:', errorActualizacion);
    } else {
      console.log(`✅ Etapa "${etapa}" registrada para cita ${cita.id}`);
    }
  } catch (error) {
    console.error('❌ Error en registrarEtapaCita:', error);
  }
};

/**
 * Registra el estado final de la cola (completado o rechazada)
 * Este campo es independiente de etapa_cola y solo indica el resultado final
 */
const registrarColaFinal = async (citaId: string, estadoFinal: 'completado' | 'rechazada') => {
  try {
    const { error } = await supabase
      .from('citas')
      .update({
        colafinal: estadoFinal,
        colafinal_at: new Date().toISOString(),
      })
      .eq('id', citaId);

    if (error) {
      console.error('❌ Error al registrar colafinal:', error);
    } else {
      console.log(`✅ Cola final "${estadoFinal}" registrada para cita ${citaId}`);
    }
  } catch (error) {
    console.error('❌ Error en registrarColaFinal:', error);
  }
};

/**
 * Verifica si una fecha es del día actual
 */
const esFechaHoy = (fecha: string): boolean => {
  const hoy = new Date();
  const fechaCita = new Date(fecha);
  return (
    fechaCita.getFullYear() === hoy.getFullYear() &&
    fechaCita.getMonth() === hoy.getMonth() &&
    fechaCita.getDate() === hoy.getDate()
  );
};

/**
 * Verifica si una fecha ya pasó
 */
const esFechaPasada = (fecha: string): boolean => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaCita = new Date(fecha);
  fechaCita.setHours(0, 0, 0, 0);
  return fechaCita < hoy;
};

const GestionCola: React.FC<GestionColaProps> = ({ barberoInfo, mostrarNotificacion }) => {
  const [colaClientes, setColaClientes] = useState<Cita[]>([]);
  const [citaAtendiendo, setCitaAtendiendo] = useState<Cita | null>(null);
  const [citasFinalizadas, setCitasFinalizadas] = useState<Cita[]>([]);
  const [citasRechazadas, setCitasRechazadas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [mostrarModalAgendar, setMostrarModalAgendar] = useState(false);
  const [citaParaRechazar, setCitaParaRechazar] = useState<Cita | null>(null);

  const cargarCitas = useCallback(async () => {
    if (!barberoInfo?.id) {
      return;
    }

    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const data = await requestBarberoApi<{ citas: Cita[] }>(`/api/barbero/citas?date=${hoy}`);
      
      console.log('🔍 Datos recibidos del backend:', data.citas?.length, 'citas');
      
      const citas = (data.citas || []).map((cita) => {
        // Log para verificar si colafinal viene del backend
        if (cita.colafinal) {
          console.log('🔖 Cita con colafinal:', cita.id, cita.colafinal, cita.colafinal_at);
        }
        
        return {
          ...cita,
          servicio: cita.servicio ?? null,
          ventas: normalizeVentaRelacion(cita.ventas),
        };
      });

      // Filtrar solo citas del día actual (no mostrar fechas pasadas)
      const citasHoy = citas.filter((c) => esFechaHoy(c.fecha_hora));

      // Cola: solo citas pendientes, agendadas, confirmadas o en espera del día de hoy
      // Excluir las que ya tienen colafinal definido (completadas o rechazadas)
      const cola = citasHoy
        .filter((c) => {
          const status = normalizeStatus(c.status);
          const esPendiente = ['waiting', 'pending', 'scheduled', 'confirmed'].includes(status);
          const noEsPasada = !esFechaPasada(c.fecha_hora);
          const noTieneColaFinal = !c.colafinal; // Excluir si ya tiene estado final
          return esPendiente && noEsPasada && noTieneColaFinal;
        })
        .sort((a, b) => {
          const priority = (status: string) => {
            const normalized = normalizeStatus(status);
            if (normalized === 'waiting') return 0;
            if (normalized === 'confirmed') return 1;
            if (normalized === 'scheduled') return 2;
            return 3;
          };

          const diff = priority(a.status) - priority(b.status);
          if (diff !== 0) return diff;

          if (a.status === 'waiting' && b.status === 'waiting') {
            return (a.posicion_cola ?? 999) - (b.posicion_cola ?? 999);
          }

          return new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime();
        });

      // Cliente actualmente en atención
      const atendiendo = citasHoy.find((c) => c.status === 'in_chair') ?? null;

      // Citas finalizadas del día de hoy (basado en colafinal = 'completado')
      const finalizadasHoy = citasHoy
        .filter((c) => {
          const esCompletado = c.colafinal === 'completado';
          if (esCompletado) {
            console.log('✅ Cita completada encontrada:', c.id, c.cliente_nombre, c.colafinal);
          }
          return esCompletado;
        })
        .sort((a, b) => {
          const aTime = a.colafinal_at ? new Date(a.colafinal_at).getTime() : 0;
          const bTime = b.colafinal_at ? new Date(b.colafinal_at).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 5);

      // Citas rechazadas del día de hoy (basado en colafinal = 'rechazada')
      const rechazadasHoy = citasHoy
        .filter((c) => {
          const esRechazada = c.colafinal === 'rechazada';
          if (esRechazada) {
            console.log('❌ Cita rechazada encontrada:', c.id, c.cliente_nombre, c.colafinal);
          }
          return esRechazada;
        })
        .sort((a, b) => {
          const aTime = a.colafinal_at ? new Date(a.colafinal_at).getTime() : 0;
          const bTime = b.colafinal_at ? new Date(b.colafinal_at).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 5);
      
      console.log('📊 Resumen de citas:', {
        total: citasHoy.length,
        cola: cola.length,
        finalizadas: finalizadasHoy.length,
        rechazadas: rechazadasHoy.length
      });

      setColaClientes(cola);
      setCitaAtendiendo(atendiendo);
      setCitasFinalizadas(finalizadasHoy);
      setCitasRechazadas(rechazadasHoy);
    } catch (error) {
      console.error('❌ ERROR al cargar citas:', error);
      mostrarNotificacion('Error al cargar las citas', 'error');
    } finally {
      setLoading(false);
    }
  }, [barberoInfo, mostrarNotificacion]);

  useEffect(() => {
    cargarCitas();
    const interval = setInterval(cargarCitas, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [cargarCitas]);

  useEffect(() => {
    if (!barberoInfo?.id) {
      return;
    }

    const channel = supabase
      .channel(`citas-cola-${barberoInfo.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'citas',
          filter: `barbero_id=eq.${barberoInfo.id}`,
        },
        () => {
          void cargarCitas();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberoInfo?.id, cargarCitas]);

  const aceptarYAtender = async (cita: Cita) => {
    if (citaAtendiendo) {
      mostrarNotificacion('Termina el servicio actual antes de aceptar otro cliente', 'warning');
      return;
    }

    setProcesando(cita.id);
    try {
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/cola`, { method: 'POST' });
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/atender`, { method: 'POST' });
      await registrarEtapaCita(cita, 'silla');
      mostrarNotificacion('Cliente pasando a la silla', 'success');
      await cargarCitas();
    } catch (error) {
      console.error('❌ ERROR al aceptar y atender:', error);
      mostrarNotificacion('No se pudo iniciar la atención', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const iniciarAtencion = async (cita: Cita) => {
    if (citaAtendiendo && citaAtendiendo.id !== cita.id) {
      mostrarNotificacion('Termina la cita actual antes de atender a otro cliente', 'warning');
      return;
    }

    setProcesando(cita.id);
    try {
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/atender`, { method: 'POST' });
      await registrarEtapaCita(cita, 'silla');
      mostrarNotificacion('Servicio iniciado', 'success');
      await cargarCitas();
    } catch (error) {
      console.error('Error al iniciar atención:', error);
      mostrarNotificacion('No se pudo iniciar la atención', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const rechazarCita = async (cita: Cita) => {
    console.log('❌ rechazarCita INICIADO');
    console.log('📋 Cita a rechazar:', cita);

    setProcesando(cita.id);
    try {
      // Primero registramos la etapa como rechazada
      await registrarEtapaCita(cita, 'rechazado');
      
      // Luego cancelamos la cita en el backend
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: `Cita cancelada por el barbero ${barberoInfo?.nombre ?? ''}`.trim() }),
      });

      // Registramos el estado final de la cola como rechazada
      await registrarColaFinal(cita.id, 'rechazada');

      // Actualizar el estado local inmediatamente
      const rejectedSnapshot: Cita = {
        ...cita,
        status: 'cancelled',
        hora_finalizacion: new Date().toISOString(),
        etapa_cola: 'rechazado',
        colafinal: 'rechazada',
        colafinal_at: new Date().toISOString(),
      };

      setColaClientes((prev) => prev.filter((c) => c.id !== cita.id));
      setCitasFinalizadas((prev) => prev.filter((c) => c.id !== cita.id));
      setCitasRechazadas((prev) => [rejectedSnapshot, ...prev].slice(0, 5));

      mostrarNotificacion('Cita cancelada correctamente', 'info');
      
      // Recargar citas para sincronizar con el servidor
      await cargarCitas();
    } catch (error) {
      console.error('❌ Error al rechazar cita:', error);
      mostrarNotificacion('No se pudo cancelar la cita', 'error');
    } finally {
      setProcesando(null);
      setCitaParaRechazar(null);
    }
  };

  const prepararFinalizacion = () => {
    if (!citaAtendiendo) {
      mostrarNotificacion('No hay cliente en atención', 'warning');
      return;
    }
    setMostrarModalVenta(true);
  };

  const handleVentaExitosa = async () => {
    setMostrarModalVenta(false);
    mostrarNotificacion('Venta registrada exitosamente', 'success');
    if (citaAtendiendo) {
      await registrarEtapaCita(citaAtendiendo, 'finalizado');
      await registrarColaFinal(citaAtendiendo.id, 'completado');
    }
    await cargarCitas();
  };

  const cerrarModalVenta = () => {
    setMostrarModalVenta(false);
  };

  const formatHora = (fecha: string) => {
    try {
      const date = new Date(fecha);
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return '—';
      }
      // Formatear en hora local
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('❌ Error al formatear hora:', error);
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-bold text-white">Gestión de Cola</h2>
          <div className="flex w-full flex-wrap justify-start gap-2 sm:w-auto sm:justify-end">
            <button
              onClick={cargarCitas}
              className="w-full sm:w-auto px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg transition-all"
            >
              🔄 Actualizar lista
            </button>
            <button
              onClick={() => setMostrarModalAgendar(true)}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg text-emerald-100 transition-all"
            >
              ➕ Agendar cita
            </button>
          </div>
        </div>

        {/* Flujo de estados */}
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <div className="w-10 h-10 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-200 font-bold">1</div>
              <div>
                <p className="text-white font-semibold">En Cola</p>
                <p className="text-yellow-200/70 text-xs">Clientes esperando turno</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-200 font-bold">2</div>
              <div>
                <p className="text-white font-semibold">Atendiendo</p>
                <p className="text-purple-200/70 text-xs">Servicio en curso</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center text-green-200 font-bold">3</div>
              <div>
                <p className="text-white font-semibold">Finalizados</p>
                <p className="text-green-200/70 text-xs">Servicios terminados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cliente en atención */}
      <div className="bg-gradient-to-br from-purple-500/15 via-purple-600/10 to-purple-500/15 border border-purple-500/40 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💺</span>
              <h3 className="text-2xl font-bold text-purple-200">Cliente en atención</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/30 border border-purple-500/40 text-purple-100 ${citaAtendiendo ? '' : 'hidden'}`}>
                {citaAtendiendo ? estadosConfig[citaAtendiendo.status as keyof typeof estadosConfig]?.label || 'en atención' : ''}
              </span>
            </div>

            {citaAtendiendo ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-2">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Cliente</p>
                  <p className="text-lg font-semibold text-white">{citaAtendiendo.cliente_nombre}</p>
                  {citaAtendiendo.cliente_telefono && (
                    <p className="text-purple-200 text-sm">📞 {citaAtendiendo.cliente_telefono}</p>
                  )}
                </div>
                <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-2">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Servicio</p>
                  <p className="text-lg font-semibold text-white">{citaAtendiendo.servicio?.nombre ?? 'Sin servicio asignado'}</p>
                  <p className="text-purple-200 text-sm flex flex-wrap items-center gap-2">
                    <span>⏱️ {citaAtendiendo.servicio?.duracion_minutos ?? 0} min</span>
                    <span>•</span>
                    <span>${citaAtendiendo.servicio?.precio?.toLocaleString() ?? '0'}</span>
                  </p>
                </div>
                <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-2 sm:col-span-2 lg:col-span-1">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Inicio de atención</p>
                  <p className="text-lg font-semibold text-white">
                    {citaAtendiendo.hora_inicio_atencion ? formatHora(citaAtendiendo.hora_inicio_atencion) : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-black/15 rounded-xl border border-dashed border-purple-500/40 p-6 text-center text-purple-200">
                No hay ningún cliente siendo atendido en este momento.
              </div>
            )}
          </div>

          <div className="w-full lg:w-64 flex flex-col gap-3">
            <button
              onClick={citaAtendiendo ? prepararFinalizacion : undefined}
              disabled={!citaAtendiendo || procesando === citaAtendiendo.id}
              className="w-full px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {citaAtendiendo
                ? (procesando === citaAtendiendo.id ? '⏳ Procesando...' : '✅ Finalizar y Registrar Venta')
                : 'Esperando cliente'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Asegúrate de registrar los productos adicionales antes de finalizar el servicio.
            </p>
          </div>
        </div>
      </div>

      {/* Cola de espera */}
      <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-2xl p-6">
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            ⏱️ Clientes en cola
            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-200">
              {colaClientes.length}
            </span>
          </h3>
          <p className="text-xs text-gray-400">Ordena automáticamente por prioridad y hora agendada.</p>
        </div>

        {colaClientes.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No hay clientes esperando en este momento.</p>
        ) : (
          <div className="space-y-3">
            {colaClientes.map((cita, index) => {
              const estaAceptada = cita.status === 'waiting';
              const puedeAtender = estaAceptada && index === 0 && !citaAtendiendo;
              const puedeAceptarDirecto = ['pending', 'scheduled', 'confirmed'].includes(cita.status) && !citaAtendiendo;

              return (
                <div
                  key={cita.id}
                  className="bg-zinc-800/50 border border-zinc-700/60 hover:border-yellow-500/40 rounded-xl p-4 transition-all flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 bg-yellow-500/15 border border-yellow-500/40 rounded-lg flex items-center justify-center font-semibold text-yellow-200">
                        {index + 1}
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-white">{cita.cliente_nombre}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${estaAceptada ? 'bg-green-500/15 border-green-500/40 text-green-200' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'}`}>
                            {estaAceptada ? 'En cola' : 'Por aceptar'}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm flex items-center gap-2">
                          <span>{cita.servicio?.nombre ?? 'Servicio sin asignar'}</span>
                          {cita.servicio?.duracion_minutos && <span className="text-xs text-gray-500">({cita.servicio?.duracion_minutos} min)</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                          <span>🕐 {formatHora(cita.fecha_hora)}</span>
                          {cita.cliente_telefono && <span>📞 {cita.cliente_telefono}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {estaAceptada ? (
                        <button
                          onClick={() => iniciarAtencion(cita)}
                          disabled={!puedeAtender || procesando === cita.id}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 transition-all disabled:opacity-40"
                        >
                          {procesando === cita.id ? '⏳' : '📢 Atender ahora'}
                        </button>
                      ) : puedeAceptarDirecto ? (
                        <button
                          onClick={() => aceptarYAtender(cita)}
                          disabled={procesando === cita.id}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 transition-all disabled:opacity-40"
                        >
                          {procesando === cita.id ? '⏳' : '⚡ Aceptar y atender'}
                        </button>
                      ) : (
                        <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-700/40 border border-zinc-600/40 text-zinc-300">
                          En espera
                        </span>
                      )}
                      <button
                        onClick={() => setCitaParaRechazar(cita)}
                        disabled={procesando === cita.id}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 transition-all disabled:opacity-40"
                      >
                        ✕ Cancelar cita
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-300">{colaClientes.length}</p>
          <p className="text-sm text-gray-400 mt-1">En cola</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-300">{citaAtendiendo ? 1 : 0}</p>
          <p className="text-sm text-gray-400 mt-1">Atendiendo</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-300">{citasFinalizadas.length}</p>
          <p className="text-sm text-gray-400 mt-1">Finalizadas hoy</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-300">{citasRechazadas.length}</p>
          <p className="text-sm text-gray-400 mt-1">Rechazadas</p>
        </div>
      </div>

      {/* Historial reciente */}
      {citasFinalizadas.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-700/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center gap-2">
            ✅ Servicios finalizados recientemente
          </h3>
          <div className="space-y-3">
            {citasFinalizadas.map((cita) => {
              const totalVenta = getVentaTotal(cita);
              const esRedencion = totalVenta === 0;

              return (
                <div
                  key={cita.id}
                  className="bg-zinc-800/40 border border-green-500/20 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-white font-semibold">{cita.cliente_nombre}</p>
                    <p className="text-sm text-gray-400">
                      {cita.servicio?.nombre || 'Servicio'} • Finalizado {cita.colafinal_at
                        ? formatHora(cita.colafinal_at)
                        : cita.hora_finalizacion
                        ? formatHora(cita.hora_finalizacion)
                        : '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-green-300 font-semibold text-sm">
                      ${formatearMonto(totalVenta)}
                    </span>
                    {esRedencion && (
                      <span className="mt-1 text-xs text-emerald-300 uppercase tracking-wide">
                        Descuento por redención
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {citasRechazadas.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-300 mb-4 flex items-center gap-2">
            🚫 Citas rechazadas / no-show
          </h3>
          <div className="space-y-3">
            {citasRechazadas.map((cita) => (
              <div key={cita.id} className="bg-zinc-800/40 border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">{cita.cliente_nombre}</p>
                  <p className="text-sm text-gray-400">
                    {cita.servicio?.nombre || 'Servicio'} • {cita.status === 'no_show' ? 'No asistió' : 'Cancelada'}
                  </p>
                </div>
                <span className="text-red-300 font-semibold text-xs uppercase tracking-wide">{cita.status === 'no_show' ? 'NO SHOW' : 'CANCELADA'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Venta */}
      {mostrarModalVenta && citaAtendiendo && (
        <ModalFinalizarVenta
          cita={{
            id: citaAtendiendo.id,
            cliente_nombre: citaAtendiendo.cliente_nombre,
            cliente_telefono: citaAtendiendo.cliente_telefono,
            servicio_id: citaAtendiendo.servicio_id,
          }}
          barberoId={String(barberoInfo?.id)}
          onClose={cerrarModalVenta}
          onSuccess={handleVentaExitosa}
          servicioInicial={citaAtendiendo.servicio ?? null}
        />
      )}
      {mostrarModalAgendar && (
        <AgendarCitaDesdeCola
          barberoId={barberoInfo?.id}
          onClose={() => setMostrarModalAgendar(false)}
          onSuccess={async () => {
            setMostrarModalAgendar(false);
            await cargarCitas();
          }}
        />
      )}
      {citaParaRechazar && (
        <ConfirmActionModal
          title="Rechazar cita"
          message={`¿Seguro que deseas rechazar la cita de ${citaParaRechazar.cliente_nombre}? Esta acción no se puede deshacer.`}
          confirmLabel="Rechazar"
          cancelLabel="Mantener"
          isProcessing={procesando === citaParaRechazar.id}
          onCancel={() => setCitaParaRechazar(null)}
          onConfirm={() => {
            void rechazarCita(citaParaRechazar);
          }}
        />
      )}
    </div>
  );
};

export default GestionCola;
