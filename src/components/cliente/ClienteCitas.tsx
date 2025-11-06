import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClienteCitasProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

interface Cita {
  id: number;
  fecha_hora: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  barbero_id: number;
  barbero?: { nombre: string };
  servicio_id: number;
  servicio?: { nombre: string; precio: number; duracion: number };
  notas?: string;
  precio_final?: number;
  descuento_aplicado?: number;
}

interface Barbero {
  id: number;
  nombre: string;
  disponible: boolean;
  horarios?: any[];
}

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  duracion: number;
  descripcion?: string;
}

export const ClienteCitas: React.FC<ClienteCitasProps> = ({
  onToast,
  authenticatedFetch
}) => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedCitaForReschedule, setSelectedCitaForReschedule] = useState<Cita | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    barbero_id: '',
    servicio_id: '',
    fecha: '',
    hora: '',
    notas: ''
  });

  useEffect(() => {
    loadInitialData();
    initializeWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (formData.barbero_id && formData.fecha) {
      loadHorariosDisponibles();
    }
  }, [formData.barbero_id, formData.fecha]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCitas(),
        loadBarberos(),
        loadServicios()
      ]);
    } catch (error) {
      console.error('Error:', error);
      onToast('Error al cargar datos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWebSocket = useCallback(() => {
    try {
      const clienteToken = localStorage.getItem('cliente_token');
      if (!clienteToken) return;

      const wsUrl = `ws://localhost:8080/ws/cliente?token=${clienteToken}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setLastUpdate(new Date());
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        // Intentar reconectar después de 5 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          initializeWebSocket();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'cita_confirmada':
        onToast(`Tu cita del ${new Date(message.data.fecha_hora).toLocaleString()} ha sido confirmada`, 'success');
        loadCitas();
        break;
      case 'cita_cancelada':
        onToast(`Tu cita del ${new Date(message.data.fecha_hora).toLocaleString()} ha sido cancelada`, 'error');
        loadCitas();
        break;
      case 'recordatorio_cita':
        onToast(`Recordatorio: Tienes una cita en ${message.data.tiempo_restante}`, 'success');
        break;
      case 'cita_reprogramada':
        onToast(`Tu cita ha sido reprogramada para el ${new Date(message.data.nueva_fecha_hora).toLocaleString()}`, 'success');
        loadCitas();
        break;
      default:
        console.log('Mensaje WebSocket no manejado:', message);
    }
  };

  const loadCitas = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=obtener_citas');
      const data = await response.json();
      
      if (data.success) {
        setCitas(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback si WebSocket no está disponible
      if (!isConnected) {
        setTimeout(loadCitas, 30000); // Polling cada 30 segundos
      }
    }
  };

  const loadBarberos = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=obtener_barberos');
      const data = await response.json();
      
      if (data.success) {
        setBarberos(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadServicios = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=obtener_servicios');
      const data = await response.json();
      
      if (data.success) {
        setServicios(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadHorariosDisponibles = async () => {
    if (!formData.barbero_id || !formData.fecha) return;
    
    try {
      const response = await authenticatedFetch(
        `/api/cliente?action=obtener_horarios_disponibles&barbero_id=${formData.barbero_id}&fecha=${formData.fecha}`
      );
      const data = await response.json();
      
      if (data.success) {
        setHorariosDisponibles(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const agendarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.barbero_id || !formData.servicio_id || !formData.fecha || !formData.hora) {
      onToast('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    setIsScheduling(true);
    try {
      const fechaHora = `${formData.fecha} ${formData.hora}`;
      
      const response = await authenticatedFetch('/api/cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'agendar_cita',
          barbero_id: parseInt(formData.barbero_id),
          servicio_id: parseInt(formData.servicio_id),
          fecha_hora: fechaHora,
          notas: formData.notas
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onToast('Cita agendada exitosamente');
        
        // Mostrar notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cita Agendada', {
            body: `Tu cita para el ${formData.fecha} a las ${formData.hora} ha sido agendada`,
            icon: '/favicon.ico'
          });
        }
        
        setFormData({
          barbero_id: '',
          servicio_id: '',
          fecha: '',
          hora: '',
          notas: ''
        });
        setShowForm(false);
        await loadCitas();
      } else {
        onToast(data.message || 'Error al agendar cita', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    } finally {
      setIsScheduling(false);
    }
  };

  const cancelarCita = async (citaId: number) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta cita?')) return;

    try {
      const response = await authenticatedFetch('/api/cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancelar_cita',
          cita_id: citaId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onToast('Cita cancelada exitosamente');
        
        // Mostrar notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cita Cancelada', {
            body: 'Tu cita ha sido cancelada exitosamente',
            icon: '/favicon.ico'
          });
        }
        
        await loadCitas();
      } else {
        onToast(data.message || 'Error al cancelar cita', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    }
  };

  const reprogramarCita = async (cita: Cita) => {
    setSelectedCitaForReschedule(cita);
    setShowRescheduleModal(true);
  };

  const confirmarReprogramacion = async (nuevaFechaHora: string) => {
    if (!selectedCitaForReschedule) return;

    try {
      const response = await authenticatedFetch('/api/cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reprogramar_cita',
          cita_id: selectedCitaForReschedule.id,
          nueva_fecha_hora: nuevaFechaHora
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onToast('Cita reprogramada exitosamente');
        
        // Mostrar notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cita Reprogramada', {
            body: `Tu cita ha sido reprogramada para el ${new Date(nuevaFechaHora).toLocaleString()}`,
            icon: '/favicon.ico'
          });
        }
        
        setShowRescheduleModal(false);
        setSelectedCitaForReschedule(null);
        await loadCitas();
      } else {
        onToast(data.message || 'Error al reprogramar cita', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-500';
      case 'confirmada': return 'bg-green-500';
      case 'cancelada': return 'bg-red-500';
      case 'completada': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'confirmada': return 'Confirmada';
      case 'cancelada': return 'Cancelada';
      case 'completada': return 'Completada';
      default: return estado;
    }
  };

  const formatearFecha = (fechaHora: string) => {
    const fecha = new Date(fechaHora);
    return {
      fecha: fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      hora: fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  // Obtener fecha mínima (hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Obtener fecha máxima (30 días desde hoy)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Indicador de conexión */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-white font-medium">
              {isConnected ? 'Conectado en tiempo real' : 'Modo offline'}
            </span>
            {isConnected && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-2 h-2 bg-green-400 rounded-full"
              />
            )}
          </div>
          <div className="text-gray-300 text-sm">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </motion.div>

      {/* Header con botón para nueva cita */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-between items-center"
      >
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-2">📅</span>
          Mis Citas
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg transition-all flex items-center space-x-2 shadow-lg"
        >
          <motion.span
            animate={{ rotate: showForm ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {showForm ? '✕' : '📅'}
          </motion.span>
          <span>{showForm ? 'Cancelar' : 'Agendar Nueva Cita'}</span>
        </motion.button>
      </motion.div>

      {/* Formulario de nueva cita */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">📅</span>
              Agendar Nueva Cita
            </h3>
          
          <form onSubmit={agendarCita} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seleccionar Barbero */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Barbero *
                </label>
                <select
                  value={formData.barbero_id}
                  onChange={(e) => handleInputChange('barbero_id', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  required
                >
                  <option value="" className="bg-gray-800">Seleccionar barbero...</option>
                  {barberos.map((barbero) => (
                    <option key={barbero.id} value={barbero.id} className="bg-gray-800">
                      {barbero.nombre} {barbero.disponible ? '✅' : '❌'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleccionar Servicio */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Servicio *
                </label>
                <select
                  value={formData.servicio_id}
                  onChange={(e) => handleInputChange('servicio_id', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  required
                >
                  <option value="" className="bg-gray-800">Seleccionar servicio...</option>
                  {servicios.map((servicio) => (
                    <option key={servicio.id} value={servicio.id} className="bg-gray-800">
                      {servicio.nombre} - ${servicio.precio?.toLocaleString()} ({servicio.duracion} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleInputChange('fecha', e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  required
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Hora *
                </label>
                <select
                  value={formData.hora}
                  onChange={(e) => handleInputChange('hora', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                  required
                  disabled={!formData.barbero_id || !formData.fecha}
                >
                  <option value="" className="bg-gray-800">Seleccionar hora...</option>
                  {horariosDisponibles.map((hora) => (
                    <option key={hora} value={hora} className="bg-gray-800">
                      {hora}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => handleInputChange('notas', e.target.value)}
                placeholder="Comentarios adicionales..."
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>

            <motion.button
              type="submit"
              disabled={isScheduling}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-3 rounded-lg transition-all font-medium shadow-lg disabled:cursor-not-allowed"
            >
              {isScheduling ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Agendando...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Agendar Cita
                </div>
              )}
            </motion.button>
          </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Citas */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">📋</span>
          Historial de Citas
          <span className="ml-auto text-sm bg-purple-600 px-2 py-1 rounded-full">
            {citas.length} cita{citas.length !== 1 ? 's' : ''}
          </span>
        </h3>
        
        {citas.length > 0 ? (
          <div className="space-y-4">
            {citas.map((cita, index) => {
              const { fecha, hora } = formatearFecha(cita.fecha_hora);
              return (
                <motion.div 
                  key={cita.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all shadow-lg"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-white font-medium text-lg">
                          {cita.servicio?.nombre || 'Servicio'}
                        </h4>
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className={`px-2 py-1 rounded-full text-xs text-white ${getEstadoColor(cita.estado)}`}
                        >
                          {getEstadoTexto(cita.estado)}
                        </motion.span>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="text-gray-300"
                        >
                          <span className="font-medium">🗓️ Fecha:</span> {fecha}
                        </motion.p>
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          className="text-gray-300"
                        >
                          <span className="font-medium">⏰ Hora:</span> {hora}
                        </motion.p>
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="text-gray-300"
                        >
                          <span className="font-medium">✂️ Barbero:</span> {cita.barbero?.nombre || 'N/A'}
                        </motion.p>
                        {cita.servicio && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="text-gray-300"
                          >
                            <span className="font-medium">💰 Precio:</span> ${(cita.precio_final || cita.servicio.precio)?.toLocaleString()}
                            {cita.descuento_aplicado && (
                              <span className="text-green-400 ml-2">
                                (Descuento: ${cita.descuento_aplicado})
                              </span>
                            )}
                          </motion.p>
                        )}
                        {cita.notas && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            className="text-gray-400"
                          >
                            <span className="font-medium">📝 Notas:</span> {cita.notas}
                          </motion.p>
                        )}
                      </div>
                    </div>
                    
                    {/* Acciones */}
                    <div className="flex space-x-2">
                      {cita.estado === 'pendiente' && (
                        <>
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => reprogramarCita(cita)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-all shadow-md"
                          >
                            📅 Reprogramar
                          </motion.button>
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.9 + index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => cancelarCita(cita.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-all shadow-md"
                          >
                            ❌ Cancelar
                          </motion.button>
                        </>
                      )}
                      {cita.estado === 'confirmada' && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => cancelarCita(cita.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-all shadow-md"
                        >
                          ❌ Cancelar
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 1 }}
              className="text-6xl mb-4"
            >
              📅
            </motion.div>
            <p className="text-gray-400">No tienes citas agendadas</p>
            <p className="text-gray-500 text-sm mt-2">¡Agenda tu primera cita!</p>
          </motion.div>
        )}
      </motion.div>

      {/* Modal de Reprogramación */}
      <AnimatePresence>
        {showRescheduleModal && selectedCita && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRescheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-white/20"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">📅</span>
                Reprogramar Cita
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-300 text-sm">
                    <span className="font-medium">Cita actual:</span> {selectedCita.servicio_nombre || selectedCita.servicio?.nombre}
                  </p>
                  <p className="text-gray-300 text-sm">
                    <span className="font-medium">Fecha:</span> {formatDate(selectedCita.fecha)} - {selectedCita.hora}
                  </p>
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Nueva Fecha
                  </label>
                  <input
                    type="date"
                    value={rescheduleData.fecha}
                    onChange={(e) => setRescheduleData({...rescheduleData, fecha: e.target.value})}
                    min={getMinDate()}
                    max={getMaxDate()}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Nueva Hora
                  </label>
                  <select
                    value={rescheduleData.hora}
                    onChange={(e) => setRescheduleData({...rescheduleData, hora: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="" className="bg-gray-800">Seleccionar nueva hora...</option>
                    {horariosDisponibles.map((hora) => (
                      <option key={hora} value={hora} className="bg-gray-800">
                        {hora}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowRescheduleModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (rescheduleData.fecha && rescheduleData.hora) {
                        reprogramarCita(selectedCita.id, rescheduleData.fecha, rescheduleData.hora);
                      }
                    }}
                    disabled={!rescheduleData.fecha || !rescheduleData.hora}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-2 rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClienteCitas;