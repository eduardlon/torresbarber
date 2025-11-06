import React, { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';

interface Cita {
  id: number;
  cliente_nombre: string;
  cliente_telefono?: string;
  fecha_hora: string;
  servicio_nombre: string;
  estado: string;
  precio?: number;
  notas?: string;
  duracion_estimada?: number;
}

interface CitasProps {
  barberoInfo: any;
  mostrarNotificacion: (mensaje: string, tipo?: string) => void;
  abrirModalVenta: (cita: any) => void;
}

const Citas: React.FC<CitasProps> = ({ barberoInfo, mostrarNotificacion, abrirModalVenta }) => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const fechaHoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    cargarCitas();
    // Recargar cada 30 segundos para verificar tiempos
    const interval = setInterval(cargarCitas, 30000);
    return () => clearInterval(interval);
  }, [fechaSeleccionada]);

  const cargarCitas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('barbero_token');
      const response = await fetch(`/api/barbero/citas?fecha=${fechaSeleccionada}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Ordenar por hora
        const citasOrdenadas = data.sort((a: Cita, b: Cita) => 
          new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
        );
        setCitas(citasOrdenadas);
      } else {
        mostrarNotificacion('Error al cargar citas', 'error');
        setCitas([]);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
      setCitas([]);
    } finally {
      setLoading(false);
    }
  };

  const addToQueue = async (cita: Cita) => {
    try {
      const response = await fetch(`/api/barbero/agregar-a-cola`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('barbero_token')}`
        },
        body: JSON.stringify({
          cita_id: cita.id,
          barbero_id: barberoInfo.id,
          cliente_nombre: cita.cliente_nombre,
          servicio_nombre: cita.servicio_nombre,
          prioridad: 1 // Prioridad alta para citas agendadas
        })
      });
      
      if (response.ok) {
        mostrarNotificacion('Cliente agregado a la cola inteligente', 'success');
        cargarCitas();
      } else {
        mostrarNotificacion('Error al agregar cliente a la cola', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
    }
  };

  const actualizarEstadoCita = async (citaId: number, nuevoEstado: string) => {
    try {
      const token = localStorage.getItem('barbero_token');
      let endpoint = `/api/barbero/citas/${citaId}/estado`;
      
      // Usar endpoints específicos para iniciar y finalizar
      if (nuevoEstado === 'en_proceso') {
        endpoint = `/api/barbero/citas/${citaId}/iniciar`;
      } else if (nuevoEstado === 'completada') {
        endpoint = `/api/barbero/citas/${citaId}/finalizar`;
      }
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      if (response.ok) {
        // Recargar las citas
        cargarCitas();
        mostrarNotificacion(`Cita ${nuevoEstado}`, 'success');
        
        // Si se completa la cita, abrir modal de venta
        if (nuevoEstado === 'completada') {
          const cita = citas.find(c => c.id === citaId);
          if (cita) {
            abrirModalVenta(cita);
          }
        }
      } else {
        mostrarNotificacion('Error al actualizar cita', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
    }
  };

  const puedeConfirmar = (fechaHora: string) => {
    const ahora = new Date();
    const citaTime = new Date(fechaHora);
    const diferencia = (citaTime.getTime() - ahora.getTime()) / (1000 * 60); // diferencia en minutos
    
    // Puede confirmar entre 10 y 5 minutos antes
    return diferencia >= 5 && diferencia <= 10;
  };
  
  const puedeIniciar = (fechaHora: string, estado: string) => {
    if (estado !== 'confirmada') return false;
    
    const ahora = new Date();
    const citaTime = new Date(fechaHora);
    const diferencia = (citaTime.getTime() - ahora.getTime()) / (1000 * 60); // diferencia en minutos
    
    // Puede iniciar 5 minutos después de la hora asignada
    return diferencia <= -5;
  };

  const formatearHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const citasFiltradas = citas.filter((cita) => {
    // Filtro por estado
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
    total: citasFiltradas.length,
    pendientes: citasFiltradas.filter(c => c.estado === 'pendiente').length,
    confirmadas: citasFiltradas.filter(c => c.estado === 'confirmada').length,
    enProceso: citasFiltradas.filter(c => c.estado === 'en_proceso').length,
    finalizadas: citasFiltradas.filter(c => c.estado === 'finalizada').length
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'confirmada':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'en_proceso':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'finalizada':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelada':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'confirmada': return 'Confirmada';
      case 'en_proceso': return 'En Proceso';
      case 'finalizada': return 'Finalizada';
      case 'cancelada': return 'Cancelada';
      default: return estado;
    }
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
              <option value="pendiente">Pendientes</option>
              <option value="confirmada">Confirmadas</option>
              <option value="en_proceso">En Proceso</option>
              <option value="finalizada">Finalizadas</option>
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
          <div className="bg-purple-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-300">{estadisticasCitas.enProceso}</div>
            <div className="text-xs text-purple-400">En Proceso</div>
          </div>
          <div className="bg-green-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-300">{estadisticasCitas.finalizadas}</div>
            <div className="text-xs text-green-400">Finalizadas</div>
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
                    {['confirmada', 'pendiente'].includes(cita.estado) && (
                      <button
                        onClick={() => addToQueue(cita)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Agregar a Cola
                      </button>
                    )}
                    
                    {cita.estado === 'pendiente' && puedeConfirmar(cita.fecha_hora) && (
                      <button
                        onClick={() => actualizarEstadoCita(cita.id, 'confirmada')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Confirmar
                      </button>
                    )}
                    
                    {puedeIniciar(cita.fecha_hora, cita.estado) && (
                      <button
                        onClick={() => actualizarEstadoCita(cita.id, 'en_proceso')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Iniciar Corte
                      </button>
                    )}
                    
                    {cita.estado === 'en_proceso' && (
                      <button
                        onClick={() => actualizarEstadoCita(cita.id, 'completada')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Finalizar Corte
                      </button>
                    )}
                    
                    {['pendiente', 'confirmada'].includes(cita.estado) && (
                      <button
                        onClick={() => {
                          if (confirm('¿Estás seguro de cancelar esta cita?')) {
                            actualizarEstadoCita(cita.id, 'cancelada');
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Citas;