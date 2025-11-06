import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import ModalVentaMejorado from './ModalVentaMejorado';

interface Turno {
  id: number;
  numero_turno: number;
  cliente_nombre: string;
  cliente_telefono?: string;
  servicio_nombre: string;
  estado: 'espera' | 'llamado' | 'en_silla' | 'finalizando';
  prioridad: number; // 1 = alta (citas), 2 = media (walk-ins)
  hora_registro: string;
  hora_llamado?: string;
  hora_inicio?: string;
  duracion_estimada?: number;
  notas?: string;
  cita_id?: number;
}

interface EstadisticasCola {
  espera: number;
  llamado: number;
  en_silla: number;
  finalizando: number;
  total: number;
}

interface SmartQueueMejoradoProps {
  barberoInfo: any;
  mostrarNotificacion: (mensaje: string, tipo?: string) => void;
}

const SmartQueueMejorado: React.FC<SmartQueueMejoradoProps> = ({
  barberoInfo,
  mostrarNotificacion
}) => {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCola>({
    espera: 0,
    llamado: 0,
    en_silla: 0,
    finalizando: 0,
    total: 0
  });

  // Modal de agregar turno sin cita
  const [showModalTurno, setShowModalTurno] = useState(false);
  const [nuevoTurno, setNuevoTurno] = useState({
    nombre: '',
    telefono: '',
    servicio: ''
  });

  // Modal de venta
  const [showModalVenta, setShowModalVenta] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);

  // Filtro de vista
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'espera' | 'llamado' | 'en_silla' | 'finalizando'>('todos');

  const getAuthToken = () => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('auth_token='));
    return cookie ? cookie.split('=')[1] : null;
  };

  // Mapear estados del backend Laravel a los estados esperados por el frontend
  const mapearEstado = (estado: string): 'espera' | 'llamado' | 'en_silla' | 'finalizando' => {
    const mapaEstados: { [key: string]: 'espera' | 'llamado' | 'en_silla' | 'finalizando' } = {
      'en_espera': 'espera',
      'waiting': 'espera',
      'espera': 'espera',
      'llamado': 'llamado',
      'called': 'llamado',
      'en_progreso': 'en_silla',
      'in_progress': 'en_silla',
      'en_silla': 'en_silla',
      'finalizando': 'finalizando',
      'finishing': 'finalizando',
      'completing': 'finalizando'
    };
    return mapaEstados[estado.toLowerCase()] || 'espera';
  };

  // Mapear estados del frontend al backend Laravel
  const mapearEstadoBackend = (estado: string): string => {
    const mapaEstados: { [key: string]: string } = {
      'espera': 'en_espera',
      'llamado': 'llamado',
      'en_silla': 'en_progreso',
      'finalizando': 'completado'
    };
    return mapaEstados[estado] || estado;
  };

  useEffect(() => {
    if (barberoInfo?.id) {
      cargarCola();
      // Actualización en tiempo real cada 5 segundos
      const interval = setInterval(cargarCola, 5000);
      return () => clearInterval(interval);
    }
  }, [barberoInfo?.id]);
  
  const cargarCola = async () => {
    try {
      const token = getAuthToken();
      const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${API_URL}/v2/barber/${barberoInfo.id}/queue`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Datos de cola recibidos:', data);
        
        // Adaptarse a la estructura del backend Laravel
        let turnosData = [];
        if (data.queue && Array.isArray(data.queue)) {
          // Backend Laravel devuelve { success: true, queue: [...] }
          turnosData = data.queue;
        } else if (data.data?.turnos && Array.isArray(data.data.turnos)) {
          turnosData = data.data.turnos;
        } else if (data.turnos && Array.isArray(data.turnos)) {
          turnosData = data.turnos;
        }
        
        // Mapear campos del backend Laravel al formato esperado por el frontend
        const turnosMapeados = turnosData.map((turno: any) => ({
          id: turno.id,
          numero_turno: turno.turn_number || turno.numero_turno,
          cliente_nombre: turno.client_name || turno.cliente_nombre,
          cliente_telefono: turno.client_phone || turno.cliente_telefono,
          servicio_nombre: turno.service || turno.servicio_nombre || turno.service_name,
          estado: mapearEstado(turno.status || turno.estado),
          prioridad: turno.priority || turno.prioridad || 2,
          hora_registro: turno.created_at || turno.hora_registro,
          hora_llamado: turno.called_at || turno.hora_llamado,
          hora_inicio: turno.start_time || turno.hora_inicio,
          duracion_estimada: turno.estimated_duration || turno.duracion_estimada,
          notas: turno.notes || turno.notas,
          cita_id: turno.appointment_id || turno.cita_id
        }));
        
        // Ordenar por prioridad y hora de registro
        const turnosOrdenados = turnosMapeados.sort((a: Turno, b: Turno) => {
          if (a.prioridad !== b.prioridad) {
            return a.prioridad - b.prioridad;
          }
          return new Date(a.hora_registro).getTime() - new Date(b.hora_registro).getTime();
        });
        
        setTurnos(turnosOrdenados);
        
        // Calcular estadísticas
        setEstadisticas({
          espera: turnosOrdenados.filter(t => t.estado === 'espera').length,
          llamado: turnosOrdenados.filter(t => t.estado === 'llamado').length,
          en_silla: turnosOrdenados.filter(t => t.estado === 'en_silla').length,
          finalizando: turnosOrdenados.filter(t => t.estado === 'finalizando').length,
          total: turnosOrdenados.length
        });
      }
    } catch (error) {
      console.error('Error cargando cola:', error);
      mostrarNotificacion('Error al cargar la cola', 'error');
    } finally {
      setLoading(false);
    }
  };

  const agregarTurnoSinCita = async () => {
    if (!nuevoTurno.nombre.trim()) {
      mostrarNotificacion('Debes ingresar el nombre del cliente', 'error');
      return;
    }

    try {
      const token = getAuthToken();
      const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${API_URL}/v2/turns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          barber_id: barberoInfo.id,
          client_type: 'guest',
          guest_name: nuevoTurno.nombre,
          guest_phone: nuevoTurno.telefono || null,
          service_id: 1, // ID de servicio por defecto, puedes cambiarlo
          notes: nuevoTurno.servicio || 'Corte general'
        })
      });

      if (response.ok) {
        mostrarNotificacion('Cliente agregado a la cola', 'success');
        setShowModalTurno(false);
        setNuevoTurno({ nombre: '', telefono: '', servicio: '' });
        cargarCola();
      } else {
        mostrarNotificacion('Error al agregar cliente', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
    }
  };

  const cambiarEstadoTurno = async (turnoId: number, nuevoEstado: string) => {
    try {
      const token = getAuthToken();
      const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8001/api';
      const estadoBackend = mapearEstadoBackend(nuevoEstado);
      const response = await fetch(`${API_URL}/v2/turns/${turnoId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: estadoBackend })
      });

      if (response.ok) {
        mostrarNotificacion(`Cliente movido a ${nuevoEstado}`, 'success');
        cargarCola();
      } else {
        mostrarNotificacion('Error al cambiar estado', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
    }
  };

  const finalizarConVenta = (turno: Turno) => {
    setTurnoSeleccionado(turno);
    setShowModalVenta(true);
  };

  const turnosFiltrados = filtroEstado === 'todos' 
    ? turnos 
    : turnos.filter(t => t.estado === filtroEstado);

  const getColorEstado = (estado: string) => {
    switch (estado) {
      case 'espera':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'llamado':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'en_silla':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'finalizando':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
    }
  };

  const getTextoEstado = (estado: string) => {
    switch (estado) {
      case 'espera': return 'En Espera';
      case 'llamado': return 'Llamado';
      case 'en_silla': return 'En Silla';
      case 'finalizando': return 'Finalizando';
      default: return estado;
    }
  };

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <h2 className="text-2xl font-bold text-white">Cola Inteligente</h2>
            <p className="text-zinc-400">Gestiona los turnos de tus clientes</p>
          </div>
          <button
            onClick={() => setShowModalTurno(true)}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Agregar Walk-in
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{estadisticas.total}</div>
            <div className="text-sm text-zinc-400">Total</div>
          </div>
          <div className="bg-yellow-500/20 rounded-lg p-4 text-center border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-300">{estadisticas.espera}</div>
            <div className="text-sm text-yellow-400">En Espera</div>
          </div>
          <div className="bg-blue-500/20 rounded-lg p-4 text-center border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-300">{estadisticas.llamado}</div>
            <div className="text-sm text-blue-400">Llamados</div>
          </div>
          <div className="bg-purple-500/20 rounded-lg p-4 text-center border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-300">{estadisticas.en_silla}</div>
            <div className="text-sm text-purple-400">En Silla</div>
          </div>
          <div className="bg-green-500/20 rounded-lg p-4 text-center border border-green-500/30">
            <div className="text-2xl font-bold text-green-300">{estadisticas.finalizando}</div>
            <div className="text-sm text-green-400">Finalizando</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-6">
          <select
            value={filtroEstado}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFiltroEstado(e.target.value as any)}
            className="w-full md:w-64 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="todos">Todos los Estados</option>
            <option value="espera">En Espera</option>
            <option value="llamado">Llamados</option>
            <option value="en_silla">En Silla</option>
            <option value="finalizando">Finalizando</option>
          </select>
        </div>
      </div>

      {/* Lista de Turnos */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
        {turnosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay turnos</h3>
            <p className="text-zinc-400">No hay clientes en la cola actualmente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {turnosFiltrados.map((turno) => (
              <div
                key={turno.id}
                className={`border rounded-xl p-6 transition-all ${
                  turno.prioridad === 1
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-zinc-800/50 border-zinc-700/50'
                } hover:scale-[1.02]`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Información del Turno */}
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      {/* Número de Turno */}
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                        turno.prioridad === 1
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-800 text-white'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {turno.numero_turno}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{turno.cliente_nombre}</h3>
                          {turno.prioridad === 1 && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                              ⭐ Cita Agendada
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getColorEstado(turno.estado)}`}>
                            {getTextoEstado(turno.estado)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Registrado: {formatearHora(turno.hora_registro)}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6H2a1 1 0 110-2h4z"></path>
                            </svg>
                            {turno.servicio_nombre}
                          </span>
                          {turno.cliente_telefono && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                              </svg>
                              {turno.cliente_telefono}
                            </span>
                          )}
                        </div>

                        {turno.notas && (
                          <div className="mt-2 p-2 bg-zinc-800/30 rounded text-sm text-zinc-300">
                            <span className="font-medium">Notas:</span> {turno.notas}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-col space-y-2">
                    {turno.estado === 'espera' && (
                      <button
                        onClick={() => cambiarEstadoTurno(turno.id, 'llamado')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Llamar Cliente
                      </button>
                    )}

                    {turno.estado === 'llamado' && (
                      <button
                        onClick={() => cambiarEstadoTurno(turno.id, 'en_silla')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Pasar a Silla
                      </button>
                    )}

                    {turno.estado === 'en_silla' && (
                      <button
                        onClick={() => cambiarEstadoTurno(turno.id, 'finalizando')}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Finalizar Corte
                      </button>
                    )}

                    {turno.estado === 'finalizando' && (
                      <button
                        onClick={() => finalizarConVenta(turno)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Cobrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Agregar Turno Sin Cita */}
      {showModalTurno && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75"
              onClick={() => setShowModalTurno(false)}
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
                    value={nuevoTurno.nombre}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNuevoTurno({ ...nuevoTurno, nombre: e.target.value })
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
                    value={nuevoTurno.telefono}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNuevoTurno({ ...nuevoTurno, telefono: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Número de teléfono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Servicio (opcional)
                  </label>
                  <input
                    type="text"
                    value={nuevoTurno.servicio}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNuevoTurno({ ...nuevoTurno, servicio: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Tipo de corte o servicio"
                  />
                </div>
              </div>

              <div className="bg-zinc-800 px-6 py-4 flex space-x-3">
                <button
                  onClick={() => setShowModalTurno(false)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarTurnoSinCita}
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
          setTurnoSeleccionado(null);
          cargarCola(); // Recargar la cola después de cerrar
        }}
        cliente={turnoSeleccionado ? {
          nombre: turnoSeleccionado.cliente_nombre,
          telefono: turnoSeleccionado.cliente_telefono
        } : undefined}
        barberoId={barberoInfo.id}
        onVentaCompletada={(mensaje, tipo) => {
          mostrarNotificacion(mensaje, tipo);
          if (tipo === 'success') {
            setShowModalVenta(false);
            setTurnoSeleccionado(null);
            cargarCola();
          }
        }}
      />
    </div>
  );
};

export default SmartQueueMejorado;