import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import ModalVentaMejorado from './ModalVentaMejorado';
import { requestBarberoApi } from '../../utils/barbero-api-request';
import type { Appointment, DailyTurn } from '../../types';

type NormalizedTurnStatus = 'waiting' | 'in_progress' | 'finishing';

interface ColaTurnoDisplay {
  id: string;
  turnId: string;
  normalizedStatus: NormalizedTurnStatus;
  rawStatus: DailyTurn['status'];
  cliente_nombre: string;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  fecha_hora: string;
  servicio?: {
    nombre: string;
    duracion_minutos?: number | null;
  } | null;
  notas?: string | null;
  appointment?: Appointment;
  turn?: DailyTurn;
}

interface EstadisticasCola {
  pendientes: number;
  enCola: number;
  finalizando: number;
  total: number;
}

interface ColaInteligenteMejoradaProps {
  barberoInfo: any;
  mostrarNotificacion: (mensaje: string, tipo?: string) => void;
}

const ColaInteligenteMejorada: React.FC<ColaInteligenteMejoradaProps> = ({
  barberoInfo,
  mostrarNotificacion
}) => {
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [activeTurns, setActiveTurns] = useState<DailyTurn[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModalCita, setShowModalCita] = useState(false);
  const [nuevaCita, setNuevaCita] = useState({
    nombre: '',
    telefono: '',
    email: ''
  });

  const [showModalVenta, setShowModalVenta] = useState(false);
  const [entradaSeleccionada, setEntradaSeleccionada] = useState<ColaTurnoDisplay | null>(null);

  const isFetchingRef = useRef(false);

  const formatearHora = (fecha?: string | null) => {
    if (!fecha) return '--:--';
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const normalizeTurnStatus = (status: DailyTurn['status']): NormalizedTurnStatus => {
    const normalized = (status ?? 'waiting').toLowerCase();
    if (normalized === 'in_progress' || normalized === 'en_progreso' || normalized === 'en_silla') {
      return 'in_progress';
    }
    if (normalized === 'finishing' || normalized === 'finalizando') {
      return 'finishing';
    }
    return 'waiting';
  };

  const mapAppointmentToEntry = useCallback((appointment: Appointment): ColaTurnoDisplay => {
    const servicioRelacion = (appointment as unknown as Record<string, any>)?.servicios ?? (appointment as unknown as Record<string, any>)?.servicio ?? null;

    return {
      id: String(appointment.id),
      turnId: String(appointment.id),
      normalizedStatus: 'waiting',
      rawStatus: (appointment.status ?? appointment.estado ?? 'pending') as DailyTurn['status'],
      cliente_nombre: appointment.cliente_nombre ?? 'Cliente',
      cliente_telefono: appointment.cliente_telefono ?? null,
      cliente_email: appointment.cliente_email ?? null,
      fecha_hora: appointment.fecha_hora ?? new Date().toISOString(),
      servicio: servicioRelacion
        ? {
            nombre: servicioRelacion.nombre ?? 'Servicio',
            duracion_minutos: servicioRelacion.duracion_minutos ?? servicioRelacion.duracion ?? appointment.estimated_duration ?? null
          }
        : null,
      notas: (appointment as unknown as Record<string, any>)?.notas ?? null,
      appointment,
    };
  }, []);

  const mapTurnToEntry = useCallback((turn: DailyTurn): ColaTurnoDisplay => {
    const normalizedStatus = normalizeTurnStatus(turn.status);
    const appointment = turn.appointment as Appointment | undefined;
    const servicioRelacion = turn.service ?? (appointment as unknown as Record<string, any>)?.servicios ?? null;

    return {
      id: String(appointment?.id ?? turn.id),
      turnId: String(turn.id),
      normalizedStatus,
      rawStatus: turn.status,
      cliente_nombre: turn.client_name ?? appointment?.cliente_nombre ?? 'Cliente',
      cliente_telefono: turn.client_phone ?? appointment?.cliente_telefono ?? null,
      cliente_email: turn.client_email ?? appointment?.cliente_email ?? null,
      fecha_hora: turn.scheduled_time ?? appointment?.fecha_hora ?? turn.created_at ?? new Date().toISOString(),
      servicio: servicioRelacion
        ? {
            nombre: servicioRelacion.nombre ?? 'Servicio',
            duracion_minutos:
              servicioRelacion.duracion_minutos ??
              appointment?.estimated_duration ??
              turn.estimated_duration ??
              null,
          }
        : null,
      notas: turn.notes ?? appointment?.notas ?? null,
      appointment,
      turn,
    };
  }, []);

  const fetchQueueData = useCallback(async (withSpinner = false) => {
    if (!barberoInfo?.id || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    if (withSpinner) {
      setLoading(true);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const [citasResponse, turnosResponse] = await Promise.all([
        requestBarberoApi<{ citas: Appointment[] }>(`/api/barbero/citas?fecha=${today}`),
        requestBarberoApi<{ turnos: DailyTurn[] }>(`/api/barbero/turnos?fecha=${today}`),
      ]);

      const pendientes = (citasResponse.citas || []).filter(
        (cita) => cita.status === 'pending' || cita.status === 'confirmed'
      );
      const activos = (turnosResponse.turnos || []).filter(
        (turno) => turno.status !== 'completed' && turno.status !== 'cancelled'
      );

      setPendingAppointments(pendientes);
      setActiveTurns(activos);
    } catch (error) {
      console.error('Error al sincronizar cola:', error);
      mostrarNotificacion(error instanceof Error ? error.message : 'Error de conexión al sincronizar la cola', 'error');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [barberoInfo?.id, mostrarNotificacion]);

  useEffect(() => {
    if (!barberoInfo?.id) {
      return;
    }

    fetchQueueData(true);

    // Polling cada 10 segundos para actualizar la cola
    // TODO: Implementar real-time con Supabase Realtime cuando sea necesario
    const interval = setInterval(() => {
      fetchQueueData();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [barberoInfo?.id, fetchQueueData]);

  const entradasPendientes = useMemo(
    () => pendingAppointments.map(mapAppointmentToEntry),
    [pendingAppointments, mapAppointmentToEntry]
  );

  const entradasTurnos = useMemo(
    () => activeTurns.map(mapTurnToEntry),
    [activeTurns, mapTurnToEntry]
  );

  const entradasEnCola = useMemo(
    () => entradasTurnos.filter((entry) => entry.normalizedStatus === 'waiting' || entry.normalizedStatus === 'in_progress'),
    [entradasTurnos]
  );

  const entradasFinalizando = useMemo(
    () => entradasTurnos.filter((entry) => entry.normalizedStatus === 'finishing'),
    [entradasTurnos]
  );

  const estadisticas = useMemo<EstadisticasCola>(() => ({
    pendientes: entradasPendientes.length,
    enCola: entradasEnCola.length,
    finalizando: entradasFinalizando.length,
    total: entradasPendientes.length + entradasEnCola.length + entradasFinalizando.length
  }), [entradasPendientes.length, entradasEnCola.length, entradasFinalizando.length]);

  const actualizarEstadoEntrada = async (
    entrada: ColaTurnoDisplay,
    status: DailyTurn['status'],
    options: {
      exito?: string;
      error?: string;
      appointmentExtra?: Partial<Appointment>;
      turnExtra?: Partial<DailyTurn>;
    } = {}
  ) => {
    try {
      if (entrada.appointment) {
        // Actualizar cita usando endpoint correspondiente según el estado
        const citaId = String(entrada.appointment.id);
        let endpoint = '';
        
        if (status === 'in_progress' || status === 'en_progreso') {
          endpoint = `/api/barbero/citas/${citaId}/atender`;
        } else if (status === 'cancelled' || status === 'cancelado') {
          endpoint = `/api/barbero/citas/${citaId}/cancelar`;
        } else if (status === 'no_show') {
          endpoint = `/api/barbero/citas/${citaId}/no-show`;
        }
        
        if (endpoint) {
          await requestBarberoApi(endpoint, { method: 'POST' });
        }
      } else if (entrada.turn) {
        // Actualizar turno usando endpoint de estado
        await requestBarberoApi(`/api/barbero/turnos/${entrada.turn.id}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: status }),
        });
      } else {
        throw new Error('No se encontró la referencia para actualizar el estado.');
      }

      if (options.exito) {
        mostrarNotificacion(options.exito, 'success');
      }

      await fetchQueueData();
    } catch (error) {
      console.error('Error al actualizar estado de la cola:', error);
      mostrarNotificacion(options.error ?? 'Error al actualizar el estado', 'error');
    }
  };

  const aceptarCita = async (entrada: ColaTurnoDisplay) => {
    if (!entrada.appointment) {
      return;
    }

    await actualizarEstadoEntrada(entrada, 'waiting', {
      exito: `${entrada.cliente_nombre} agregado a la cola`,
      error: 'No se pudo aceptar la cita',
      appointmentExtra: { cola_prioridad: entrada.appointment.cola_prioridad ?? 1 },
    });
  };

  const rechazarCita = async (entrada: ColaTurnoDisplay) => {
    if (!entrada.appointment) {
      return;
    }

    await actualizarEstadoEntrada(entrada, 'cancelled', {
      exito: `Cita de ${entrada.cliente_nombre} rechazada`,
      error: 'No se pudo rechazar la cita',
    });
  };

  const avanzarTurno = async (entrada: ColaTurnoDisplay, nuevoEstado: DailyTurn['status']) => {
    const mensajes: Record<string, string> = {
      waiting: 'Cliente en espera',
      in_progress: 'Cliente en silla',
      finishing: 'Listo para cobrar',
      completed: 'Servicio completado',
    };

    await actualizarEstadoEntrada(entrada, nuevoEstado, {
      exito: mensajes[nuevoEstado] ?? 'Estado actualizado',
      error: 'No se pudo actualizar el estado del turno',
      appointmentExtra: nuevoEstado === 'in_progress'
        ? { start_time: new Date().toISOString() }
        : nuevoEstado === 'completed'
          ? { end_time: new Date().toISOString(), venta_registrada: true }
          : undefined,
      turnExtra: nuevoEstado === 'in_progress'
        ? { start_time: new Date().toISOString() }
        : nuevoEstado === 'completed'
          ? { end_time: new Date().toISOString() }
          : undefined,
    });
  };

  const agregarCitaWalkIn = async () => {
    if (!nuevaCita.nombre.trim()) {
      mostrarNotificacion('Debes ingresar el nombre del cliente', 'error');
      return;
    }

    try {
      const ahora = new Date();
      const turnDate = ahora.toISOString().split('T')[0];
      const barberId = barberoInfo?.id;

      if (!barberId) {
        mostrarNotificacion('No se encontró la información del barbero', 'error');
        return;
      }

      await requestBarberoApi('/api/barbero/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicio_id: 1, // TODO: Permitir seleccionar servicio
          cliente_nombre: nuevaCita.nombre.trim(),
          cliente_telefono: nuevaCita.telefono.trim() || undefined,
          notas: 'Walk-in sin cita previa',
          fecha: turnDate,
        }),
      });

      mostrarNotificacion('Cliente agregado a la cola', 'success');
      setShowModalCita(false);
      setNuevaCita({ nombre: '', telefono: '', email: '' });
      await fetchQueueData();
    } catch (error) {
      console.error('Error al crear walk-in:', error);
      mostrarNotificacion('No se pudo agregar el cliente a la cola', 'error');
    }
  };

  const finalizarConVenta = (entrada: ColaTurnoDisplay) => {
    setEntradaSeleccionada(entrada);
    setShowModalVenta(true);
  };

  const completarServicio = async (entrada?: ColaTurnoDisplay | null) => {
    if (!entrada) return;
    await avanzarTurno(entrada, 'completed');
    setShowModalVenta(false);
    setEntradaSeleccionada(null);
    await fetchQueueData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* Header con Estadísticas */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Sistema de Citas y Cola</h2>
            <p className="text-zinc-400">Gestiona tus citas: Acepta → Atiende → Finaliza</p>
          </div>
          <button
            onClick={() => setShowModalCita(true)}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Agregar Walk-in
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-orange-500/20 rounded-lg p-4 text-center border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-300">{estadisticas.pendientes}</div>
            <div className="text-sm text-orange-400">Pendientes</div>
          </div>
          <div className="bg-blue-500/20 rounded-lg p-4 text-center border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-300">{estadisticas.enCola}</div>
            <div className="text-sm text-blue-400">En Cola</div>
          </div>
          <div className="bg-green-500/20 rounded-lg p-4 text-center border border-green-500/30">
            <div className="text-2xl font-bold text-green-300">{estadisticas.finalizando}</div>
            <div className="text-sm text-green-400">Finalizando</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{estadisticas.total}</div>
            <div className="text-sm text-zinc-400">Total</div>
          </div>
        </div>
      </div>

      {/* ETAPA 1: Citas Pendientes (Para Aceptar/Rechazar) */}
      {entradasPendientes.length > 0 && (
        <div className="bg-gradient-to-r from-orange-900/40 to-orange-800/40 backdrop-blur-md border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-orange-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="text-xl font-bold text-white">ETAPA 1: Citas Pendientes de Aceptación</h3>
          </div>

          <div className="space-y-3">
            {entradasPendientes.map((entrada) => (
              <div
                key={entrada.id}
                className="bg-black/30 border border-orange-500/30 rounded-xl p-4 hover:bg-black/40 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-orange-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{entrada.cliente_nombre}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {formatearHora(entrada.fecha_hora)}
                        </span>
                        {entrada.servicio && (
                          <span>{entrada.servicio.nombre}</span>
                        )}
                        {entrada.cliente_telefono && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            {entrada.cliente_telefono}
                          </span>
                        )}
                      </div>
                      {entrada.notas && (
                        <p className="mt-2 text-xs text-zinc-400">{entrada.notas}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => aceptarCita(entrada)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Aceptar
                    </button>
                    <button
                      onClick={() => rechazarCita(entrada)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ETAPA 2: Cola de Clientes Aceptados */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <h3 className="text-xl font-bold text-white">ETAPA 2: Cola de Clientes Aceptados</h3>
        </div>

        {entradasEnCola.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay clientes en cola</h3>
            <p className="text-zinc-400">Acepta citas pendientes para que aparezcan aquí</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entradasEnCola.map((entrada, index) => (
              <div
                key={entrada.id}
                className="border rounded-xl p-6 transition-all bg-zinc-800/50 border-zinc-700/50 hover:scale-[1.02]"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-blue-600 text-white">
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{entrada.cliente_nombre}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            entrada.normalizedStatus === 'waiting'
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}>
                            {entrada.normalizedStatus === 'waiting' ? 'En Espera' : 'En Silla'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            {formatearHora(entrada.fecha_hora)}
                          </span>
                          {entrada.servicio && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6H2a1 1 0 110-2h4z"></path>
                              </svg>
                              {entrada.servicio.nombre}
                            </span>
                          )}
                          {entrada.cliente_telefono && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                              </svg>
                              {entrada.cliente_telefono}
                            </span>
                          )}
                        </div>

                        {entrada.notas && (
                          <div className="mt-2 p-2 bg-zinc-800/30 rounded text-sm text-zinc-300">
                            <span className="font-medium">Notas:</span> {entrada.notas}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {entrada.normalizedStatus === 'waiting' && (
                      <button
                        onClick={() => avanzarTurno(entrada, 'in_progress')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Pasar a Silla
                      </button>
                    )}

                    {entrada.normalizedStatus === 'in_progress' && (
                      <button
                        onClick={() => avanzarTurno(entrada, 'finishing')}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Finalizar Corte
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ETAPA 3: Finalizar con Productos */}
      {entradasFinalizando.length > 0 && (
        <div className="bg-gradient-to-r from-green-900/40 to-green-800/40 backdrop-blur-md border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="text-xl font-bold text-white">ETAPA 3: Finalizar y Cobrar</h3>
          </div>

          <div className="space-y-3">
            {entradasFinalizando.map((entrada) => (
              <div
                key={entrada.id}
                className="bg-black/30 border border-green-500/30 rounded-xl p-4 hover:bg-black/40 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{entrada.cliente_nombre}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                        {entrada.servicio && <span>{entrada.servicio.nombre}</span>}
                        {entrada.cliente_telefono && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            {entrada.cliente_telefono}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => finalizarConVenta(entrada)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Cobrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Agregar Cita Walk-in */}
      {showModalCita && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75"
              onClick={() => setShowModalCita(false)}
            ></div>

            <div className="inline-block align-bottom bg-zinc-900 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-zinc-700">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Agregar Cliente Walk-in</h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    value={nuevaCita.nombre}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNuevaCita({ ...nuevaCita, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={nuevaCita.telefono}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNuevaCita({ ...nuevaCita, telefono: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Número de teléfono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={nuevaCita.email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNuevaCita({ ...nuevaCita, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="bg-zinc-800 px-6 py-4 flex space-x-3">
                <button
                  onClick={() => setShowModalCita(false)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarCitaWalkIn}
                  className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  Agregar a Cola
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Venta */}
      <ModalVentaMejorado
        isOpen={showModalVenta}
        onClose={() => {
          setShowModalVenta(false);
          setEntradaSeleccionada(null);
        }}
        cliente={entradaSeleccionada ? {
          nombre: entradaSeleccionada.cliente_nombre,
          telefono: entradaSeleccionada.cliente_telefono ?? undefined
        } : undefined}
        barberoId={barberoInfo.id}
        onVentaCompletada={(mensaje, tipo) => {
          mostrarNotificacion(mensaje, tipo);
          if (tipo === 'success' && entradaSeleccionada) {
            completarServicio(entradaSeleccionada);
          }
        }}
      />
    </div>
  );
};

export default ColaInteligenteMejorada;
