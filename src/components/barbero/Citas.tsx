import React, { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import ModalFinalizarVenta from './ModalFinalizarVenta.js';
import ConfirmActionModal from './ConfirmActionModal';
import { requestBarberoApi } from '../../utils/barbero-api-request';
import { supabase } from '../../lib/supabase';

interface EtapaHistorialEntry {
  etapa: string;
  fecha: string;
}

type AppointmentStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'waiting'
  | 'in_chair'
  | 'completed'
  | 'cancelled'
  | 'no_show';

interface Cita {
  id: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  fecha_hora: string;
  servicio_nombre: string;
  estado: AppointmentStatus;
  precio?: number;
  notas?: string;
  duracion_estimada?: number;
  colafinal?: 'completado' | 'rechazada' | null;
  colafinal_at?: string | null;
  servicio?: {
    id: string;
    nombre: string;
    precio: number | null;
    duracion_minutos: number | null;
  } | null;
  ventas?: {
    id?: string;
    total_final?: number | null;
    metodo_pago?: string | null;
  } | null;
}

interface CitasProps {
  barberoInfo: any;
  mostrarNotificacion: (mensaje: string, tipo?: string) => void;
}

/**
 * Registra una etapa en el historial de la cita
 */
const registrarEtapaCita = async (citaId: string, etapa: 'cola' | 'silla' | 'atendiendo' | 'finalizado' | 'rechazado') => {
  try {
    const { data: citaActual, error: errorConsulta } = await supabase
      .from('citas')
      .select('etapa_cola_historial')
      .eq('id', citaId)
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
      .eq('id', citaId);

    if (errorActualizacion) {
      console.error('❌ Error al registrar etapa:', errorActualizacion);
    } else {
      console.log(`✅ Etapa "${etapa}" registrada para cita ${citaId}`);
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

const Citas: React.FC<CitasProps> = ({ barberoInfo, mostrarNotificacion }) => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [citaParaVenta, setCitaParaVenta] = useState<Cita | null>(null);
  const [citasRechazadas, setCitasRechazadas] = useState<Cita[]>([]);
  const [citasFinalizadas, setCitasFinalizadas] = useState<Cita[]>([]);
  const [accionConfirmacion, setAccionConfirmacion] = useState<{ tipo: 'cancelar' | 'no_show'; cita: Cita } | null>(null);
  const fechaHoy = new Date().toISOString().split('T')[0];

  const hayCitaEnSilla = citas.some((cita) => cita.estado === 'in_chair');

  const cargarCitas = useCallback(
    async (fecha: string) => {
      try {
        const data = await requestBarberoApi<{ citas: any[] }>(`/api/barbero/citas?date=${fecha}`);
        const mapped: Cita[] = (data.citas || []).map((cita) => ({
          id: cita.id,
          cliente_nombre: cita.cliente_nombre,
          cliente_telefono: cita.cliente_telefono ?? undefined,
          fecha_hora: cita.fecha_hora,
          servicio_nombre: cita.servicio?.nombre ?? 'Servicio',
          estado: cita.status as AppointmentStatus,
          precio: cita.servicio?.precio ?? undefined,
          notas: cita.notas ?? undefined,
          duracion_estimada: cita.servicio?.duracion_minutos ?? undefined,
          colafinal: cita.colafinal ?? null,
          colafinal_at: cita.colafinal_at ?? null,
          servicio: cita.servicio
            ? {
                id: cita.servicio.id,
                nombre: cita.servicio.nombre ?? 'Servicio',
                precio: cita.servicio.precio ?? null,
                duracion_minutos: cita.servicio.duracion_minutos ?? null,
              }
            : null,
          ventas: cita.ventas ?? null,
        }));

        // Citas activas: sin resultado final
        const citasActivas = mapped.filter((cita) => !cita.colafinal);
        citasActivas.sort(
          (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
        );

        // Citas finalizadas con venta generada
        const citasConVenta = mapped.filter(
          (cita) => cita.colafinal === 'completado' && cita.ventas,
        );

        // Citas rechazadas / no-show
        const rechazadas = mapped.filter((cita) => cita.colafinal === 'rechazada');

        setCitas(citasActivas);
        setCitasFinalizadas(citasConVenta);
        setCitasRechazadas(rechazadas);
        return citasActivas;
      } catch (error) {
        console.error('Error al cargar citas:', error);
        mostrarNotificacion('No se pudieron cargar las citas', 'error');
        setCitas([]);
        return [] as Cita[];
      }
    },
    [mostrarNotificacion]
  );

  const recargarCitas = useCallback(async () => {
    await cargarCitas(fechaSeleccionada);
  }, [cargarCitas, fechaSeleccionada]);

  useEffect(() => {
    if (!barberoInfo?.id) {
      setCitas([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        await cargarCitas(fechaSeleccionada);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = setInterval(load, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [barberoInfo?.id, fechaSeleccionada, cargarCitas]);

  useEffect(() => {
    if (!barberoInfo?.id) {
      return;
    }

    const channel = supabase
      .channel(`citas-panel-${barberoInfo.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'citas',
          filter: `barbero_id=eq.${barberoInfo.id}`,
        },
        () => {
          void cargarCitas(fechaSeleccionada);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberoInfo?.id, cargarCitas, fechaSeleccionada]);

  const aceptarYAtender = async (cita: Cita) => {
    if (hayCitaEnSilla) {
      mostrarNotificacion('Termina el servicio en curso antes de atender otro cliente', 'warning');
      return;
    }

    setProcesando(cita.id);
    try {
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/cola`, {
        method: 'POST',
      });
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/atender`, { method: 'POST' });
      await registrarEtapaCita(cita.id, 'silla');
      mostrarNotificacion('Cliente en silla, ¡empieza el servicio!', 'success');
      await recargarCitas();
    } catch (error) {
      console.error('Error al aceptar y atender:', error);
      mostrarNotificacion('No se pudo iniciar la atención', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const iniciarAtencion = async (cita: Cita) => {
    setProcesando(cita.id);
    try {
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/atender`, { method: 'POST' });
      await registrarEtapaCita(cita.id, 'silla');
      mostrarNotificacion('Atención iniciada', 'success');
      await recargarCitas();
    } catch (error) {
      console.error('Error al iniciar atención:', error);
      mostrarNotificacion('No se pudo iniciar la atención', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const ejecutarCancelacion = async (cita: Cita) => {
    setProcesando(cita.id);
    try {
      await registrarEtapaCita(cita.id, 'rechazado');
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: `Cancelada por el barbero ${barberoInfo?.nombre ?? ''}`.trim() }),
      });
      await registrarColaFinal(cita.id, 'rechazada');
      mostrarNotificacion('Cita cancelada correctamente', 'info');
      await recargarCitas();
    } catch (error) {
      console.error('Error al cancelar cita:', error);
      mostrarNotificacion('No se pudo cancelar la cita', 'error');
    } finally {
      setProcesando(null);
      setAccionConfirmacion(null);
    }
  };

  const ejecutarNoShow = async (cita: Cita) => {
    setProcesando(cita.id);
    try {
      await registrarEtapaCita(cita.id, 'rechazado');
      await requestBarberoApi(`/api/barbero/citas/${cita.id}/no-show`, { method: 'POST' });
      await registrarColaFinal(cita.id, 'rechazada');
      mostrarNotificacion('Cita marcada como no asistida', 'info');
      await recargarCitas();
    } catch (error) {
      console.error('Error al marcar no show:', error);
      mostrarNotificacion('No se pudo marcar la cita como no asistida', 'error');
    } finally {
      setProcesando(null);
      setAccionConfirmacion(null);
    }
  };

  const cancelarCita = (cita: Cita) => {
    setAccionConfirmacion({ tipo: 'cancelar', cita });
  };

  const marcarNoShow = (cita: Cita) => {
    setAccionConfirmacion({ tipo: 'no_show', cita });
  };

  const formatearHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const puedeAceptarYAtender = (estado: AppointmentStatus) => ['pending', 'scheduled', 'confirmed'].includes(estado);
  const puedeIniciar = (estado: AppointmentStatus) => estado === 'waiting';
  const puedeFinalizar = (estado: AppointmentStatus) => estado === 'in_chair';
  const puedeCancelar = (estado: AppointmentStatus) => ['pending', 'scheduled', 'confirmed', 'waiting'].includes(estado);
  const puedeNoShow = (estado: AppointmentStatus) => estado === 'waiting';

  const citasFiltradas = citas.filter((cita) => {
    // Filtro por estado (solo para la lista activa)
    if (filtroEstado !== 'todas' && cita.estado !== filtroEstado) {
      return false;
    }

    // Filtro por búsqueda
    if (busqueda && !cita.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    return true;
  });

  const estadisticasCitas = {
    total: citas.length + citasFinalizadas.length + citasRechazadas.length,
    pendientes: citas.filter((c) => c.estado === 'pending' || c.estado === 'scheduled').length,
    confirmadas: citas.filter((c) => c.estado === 'confirmed').length,
    enCola: citas.filter((c) => c.estado === 'waiting').length,
    atendiendo: citas.filter((c) => c.estado === 'in_chair').length,
    finalizadas: citasFinalizadas.length,
    rechazadas: citasRechazadas.length,
  };

  const getEstadoColor = (estado: AppointmentStatus) => {
    switch (estado) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'waiting':
        return 'bg-amber-500/20 text-amber-200 border-amber-500/30';
      case 'in_chair':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'no_show':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
    }
  };

  const getEstadoTexto = (estado: AppointmentStatus) => {
    switch (estado) {
      case 'pending': return 'Pendiente';
      case 'scheduled': return 'Agendada';
      case 'confirmed': return 'Confirmada';
      case 'waiting': return 'En cola';
      case 'in_chair': return 'Atendiendo';
      case 'completed': return 'Finalizada';
      case 'cancelled': return 'Cancelada';
      case 'no_show': return 'No asistió';
      default: return estado;
    }
  };

  const abrirModalVenta = (cita: Cita) => {
    setCitaParaVenta(cita);
  };

  const cerrarModalVenta = () => {
    setCitaParaVenta(null);
  };

  const handleVentaExitosa = async () => {
    setCitaParaVenta(null);
    mostrarNotificacion('Venta registrada correctamente', 'success');
    await recargarCitas();
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
      {/* Header y Controles */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">Gestión de Citas</h2>
          <p className="text-zinc-400">Administra tus citas y agrega clientes a la cola</p>
        </div>
        
        {/* Controles de Filtrado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Selector de Fecha */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Fecha</label>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFechaSeleccionada(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          
          {/* Filtro por Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="todas">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="scheduled">Agendadas</option>
              <option value="confirmed">Confirmadas</option>
              <option value="waiting">En cola</option>
              <option value="in_chair">En silla</option>
              <option value="completed">Finalizadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="no_show">No asistió</option>
            </select>
          </div>
          
          {/* Búsqueda por Cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Buscar Cliente</label>
            <input
              type="text"
              placeholder="Nombre del cliente..."
              value={busqueda}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{estadisticasCitas.total}</div>
            <div className="text-xs text-zinc-400">Total</div>
          </div>
          <div className="bg-yellow-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-yellow-300">{estadisticasCitas.pendientes}</div>
            <div className="text-xs text-yellow-400">Pendientes</div>
          </div>
          <div className="bg-blue-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-300">{estadisticasCitas.confirmadas}</div>
            <div className="text-xs text-blue-400">Confirmadas</div>
          </div>
          <div className="bg-amber-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-200">{estadisticasCitas.enCola}</div>
            <div className="text-xs text-amber-300">En cola</div>
          </div>
          <div className="bg-purple-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-300">{estadisticasCitas.atendiendo}</div>
            <div className="text-xs text-purple-400">En silla</div>
          </div>
          <div className="bg-green-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-300">{estadisticasCitas.finalizadas}</div>
            <div className="text-xs text-green-400">Finalizadas</div>
          </div>
          <div className="bg-red-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-300">{estadisticasCitas.rechazadas}</div>
            <div className="text-xs text-red-400">Rechazadas</div>
          </div>
        </div>
      </div>

      {/* Lista de Citas */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
        {citasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay citas</h3>
            <p className="text-zinc-400">No tienes citas para la fecha y filtros seleccionados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {citasFiltradas.map((cita) => (
              <div key={cita.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 hover:bg-zinc-800/70 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Información de la Cita */}
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">{cita.cliente_nombre}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(cita.estado)}`}>
                            {getEstadoTexto(cita.estado)}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-zinc-400">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            {formatearHora(cita.fecha_hora)}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6H2a1 1 0 110-2h4z"></path>
                            </svg>
                            {cita.servicio_nombre}
                          </span>
                          {cita.cliente_telefono && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                              </svg>
                              {cita.cliente_telefono}
                            </span>
                          )}
                          {cita.precio && (
                            <span className="flex items-center text-green-400">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              ${cita.precio?.toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        {cita.notas && (
                          <div className="mt-2 p-2 bg-zinc-800/30 rounded text-sm text-zinc-300">
                            <span className="font-medium">Notas:</span> {cita.notas}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Botones de Acción */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    {/* Agregar a Cola */}
                    {puedeAceptarYAtender(cita.estado) && (
                      <button
                        onClick={() => aceptarYAtender(cita)}
                        disabled={procesando === cita.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        {procesando === cita.id ? 'Procesando...' : 'Aceptar y Atender'}
                      </button>
                    )}

                    {puedeIniciar(cita.estado) && (
                      <button
                        onClick={() => iniciarAtencion(cita)}
                        disabled={procesando === cita.id}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {procesando === cita.id ? 'Procesando...' : 'Iniciar Corte'}
                      </button>
                    )}

                    {puedeFinalizar(cita.estado) && (
                      <button
                        onClick={() => abrirModalVenta(cita)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Finalizar y Cobrar
                      </button>
                    )}

                    {puedeCancelar(cita.estado) && (
                      <button
                        onClick={() => cancelarCita(cita)}
                        disabled={procesando === cita.id}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                    )}

                    {puedeNoShow(cita.estado) && (
                      <button
                        onClick={() => marcarNoShow(cita)}
                        disabled={procesando === cita.id}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Marcar No Show
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Citas finalizadas con venta */}
      {citasFinalizadas.length > 0 && (
        <div className="bg-black/30 backdrop-blur-md border border-green-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-green-300 mb-4">✅ Citas finalizadas con venta</h3>
          <div className="space-y-3">
            {citasFinalizadas.map((cita) => {
              const ventaInfo = Array.isArray(cita.ventas) ? cita.ventas[0] : cita.ventas;
              const total = ventaInfo?.total_final ?? null;
              return (
                <div
                  key={`finalizada-${cita.id}`}
                  className="bg-zinc-900/40 border border-green-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="text-white font-semibold">{cita.cliente_nombre}</p>
                    <p className="text-sm text-zinc-400">{cita.servicio_nombre}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatearHora(cita.fecha_hora)} · {getEstadoTexto(cita.estado)}
                    </p>
                  </div>
                  {total != null && (
                    <div className="text-right">
                      <p className="text-green-300 text-sm font-semibold">
                        Total venta: ${total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {citasRechazadas.length > 0 && (
        <div className="bg-black/30 backdrop-blur-md border border-red-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-300 mb-4">🚫 Citas rechazadas / no-show</h3>
          <div className="space-y-3">
            {citasRechazadas.map((cita) => (
              <div key={`rechazada-${cita.id}`} className="bg-zinc-900/40 border border-red-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">{cita.cliente_nombre}</p>
                  <p className="text-sm text-zinc-400">{cita.servicio_nombre}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold border border-red-500/40 text-red-200">
                  {getEstadoTexto(cita.estado)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {citaParaVenta && (
        <ModalFinalizarVenta
          cita={{
            id: citaParaVenta.id,
            cliente_nombre: citaParaVenta.cliente_nombre,
            cliente_telefono: citaParaVenta.cliente_telefono,
            servicio_id: citaParaVenta.servicio?.id,
          }}
          barberoId={String(barberoInfo?.id ?? '')}
          onClose={cerrarModalVenta}
          onSuccess={handleVentaExitosa}
          servicioInicial={
            citaParaVenta.servicio
              ? {
                  ...citaParaVenta.servicio,
                  precio: citaParaVenta.servicio.precio ?? 0,
                }
              : null
          }
        />
      )}
      {accionConfirmacion && (
        <ConfirmActionModal
          title={accionConfirmacion.tipo === 'cancelar' ? 'Cancelar cita' : 'Marcar como no-show'}
          message={
            accionConfirmacion.tipo === 'cancelar'
              ? `¿Deseas cancelar la cita de ${accionConfirmacion.cita.cliente_nombre}?`
              : `¿Deseas marcar como no asistida la cita de ${accionConfirmacion.cita.cliente_nombre}?`
          }
          confirmLabel={accionConfirmacion.tipo === 'cancelar' ? 'Cancelar cita' : 'Marcar no-show'}
          cancelLabel="Volver"
          isProcessing={procesando === accionConfirmacion.cita.id}
          onCancel={() => setAccionConfirmacion(null)}
          onConfirm={() => {
            if (accionConfirmacion.tipo === 'cancelar') {
              void ejecutarCancelacion(accionConfirmacion.cita);
            } else {
              void ejecutarNoShow(accionConfirmacion.cita);
            }
          }}
        />
      )}
    </div>
  );
};

export default Citas;