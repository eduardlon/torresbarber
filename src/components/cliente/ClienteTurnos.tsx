import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClienteTurnosProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

interface Turno {
  id: number;
  numero_turno: string;
  estado: 'esperando' | 'en_proceso' | 'completado' | 'cancelado';
  barbero_id: number;
  barbero?: { nombre: string };
  servicio_id: number;
  servicio?: { nombre: string; precio: number };
  fecha_creacion: string;
  tiempo_estimado?: number;
  posicion_cola?: number;
}

interface Barbero {
  id: number;
  nombre: string;
  disponible: boolean;
  turno_actual?: number;
  cola_turnos: number;
}

export const ClienteTurnos: React.FC<ClienteTurnosProps> = ({
  onToast,
  authenticatedFetch
}) => {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [selectedBarbero, setSelectedBarbero] = useState<number | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTakingTurn, setIsTakingTurn] = useState(false);
  const [colaEstado, setColaEstado] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedTurnoForQR, setSelectedTurnoForQR] = useState<Turno | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadInitialData();
    connectWebSocket();
    
    // Actualizar cada 30 segundos como fallback
    const interval = setInterval(() => {
      if (!isConnected) {
        loadTurnos();
        loadColaEstado();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      const token = localStorage.getItem('cliente_token');
      const wsUrl = `ws://localhost:8080/ws/cliente?token=${token}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        
        // Reconectar después de 5 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  }, []);

  const handleWebSocketMessage = (data: any) => {
    setLastUpdate(new Date());
    
    switch (data.type) {
      case 'turno_update':
        loadTurnos();
        if (data.notification) {
          onToast(data.notification.message, data.notification.type);
          
          // Mostrar notificación del navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('JP Barber - Actualización de Turno', {
              body: data.notification.message,
              icon: '/favicon.ico'
            });
          }
        }
        break;
        
      case 'cola_update':
        loadColaEstado();
        break;
        
      case 'barbero_update':
        loadBarberos();
        break;
        
      case 'turno_llamado':
        if (data.turno_id) {
          onToast(`¡Tu turno ${data.numero_turno} está siendo llamado!`, 'success');
          
          // Notificación del navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('¡Tu turno está listo!', {
              body: `Turno ${data.numero_turno} - Dirígete a la barbería`,
              icon: '/favicon.ico',
              requireInteraction: true
            });
          }
          
          // Vibración si está disponible
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
        break;
        
      default:
        console.log('Mensaje WebSocket no manejado:', data);
    }
  };

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadTurnos(),
        loadBarberos(),
        loadServicios(),
        loadColaEstado()
      ]);
    } catch (error) {
      console.error('Error:', error);
      onToast('Error al cargar datos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTurnos = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=get_turnos');
      const data = await response.json();
      
      if (data.success) {
        setTurnos(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadBarberos = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=get_barberos');
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
      const response = await authenticatedFetch('/api/cliente?action=get_servicios');
      const data = await response.json();
      
      if (data.success) {
        setServicios(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadColaEstado = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=get_cola_estado');
      const data = await response.json();
      
      if (data.success) {
        setColaEstado(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const tomarTurno = async () => {
    if (!selectedBarbero || !selectedServicio) {
      onToast('Por favor selecciona un barbero y servicio', 'error');
      return;
    }

    setIsTakingTurn(true);
    try {
      const response = await authenticatedFetch('/api/cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tomar_turno',
          barbero_id: selectedBarbero,
          servicio_id: selectedServicio
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onToast(`Turno tomado exitosamente: ${data.data.numero_turno}`);
        setSelectedBarbero(null);
        setSelectedServicio(null);
        
        // Mostrar notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('¡Turno tomado exitosamente!', {
            body: `Tu número de turno es: ${data.data.numero_turno}`,
            icon: '/favicon.ico'
          });
        }
        
        // Los datos se actualizarán automáticamente vía WebSocket
        if (!isConnected) {
          await loadTurnos();
          await loadBarberos();
          await loadColaEstado();
        }
      } else {
        onToast(data.message || 'Error al tomar turno', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    } finally {
      setIsTakingTurn(false);
    }
  };

  const generateQRCode = (turno: Turno) => {
    setSelectedTurnoForQR(turno);
    setShowQRCode(true);
  };

  const getQRCodeData = (turno: Turno) => {
    return JSON.stringify({
      turno_id: turno.id,
      numero_turno: turno.numero_turno,
      barberia: 'JP Barber',
      servicio: turno.servicio?.nombre,
      barbero: turno.barbero?.nombre,
      fecha: turno.fecha_creacion
    });
  };

  const cancelarTurno = async (turnoId: number) => {
    if (!confirm('¿Estás seguro de que quieres cancelar este turno?')) return;

    try {
      const response = await authenticatedFetch('/api/cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancelar_turno',
          turno_id: turnoId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onToast('Turno cancelado exitosamente');
        
        // Los datos se actualizarán automáticamente vía WebSocket
        if (!isConnected) {
          await loadTurnos();
          await loadBarberos();
          await loadColaEstado();
        }
      } else {
        onToast(data.message || 'Error al cancelar turno', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'esperando': return 'bg-yellow-500';
      case 'en_proceso': return 'bg-blue-500';
      case 'completado': return 'bg-green-500';
      case 'cancelado': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'esperando': return 'Esperando';
      case 'en_proceso': return 'En Proceso';
      case 'completado': return 'Completado';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
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
      {/* Estado de la Cola */}
      {colaEstado && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Estado Actual de la Cola
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center bg-white/5 rounded-lg p-4"
            >
              <motion.p 
                key={colaEstado.total_esperando}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-yellow-400"
              >
                {colaEstado.total_esperando || 0}
              </motion.p>
              <p className="text-gray-300">Esperando</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center bg-white/5 rounded-lg p-4"
            >
              <motion.p 
                key={colaEstado.total_en_proceso}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-blue-400"
              >
                {colaEstado.total_en_proceso || 0}
              </motion.p>
              <p className="text-gray-300">En Proceso</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center bg-white/5 rounded-lg p-4"
            >
              <motion.p 
                key={colaEstado.tiempo_promedio}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-green-400"
              >
                {colaEstado.tiempo_promedio || 0} min
              </motion.p>
              <p className="text-gray-300">Tiempo Promedio</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center bg-white/5 rounded-lg p-4"
            >
              <motion.p 
                key={colaEstado.total_completados}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-purple-400"
              >
                {colaEstado.total_completados || 0}
              </motion.p>
              <p className="text-gray-300">Completados Hoy</p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Tomar Nuevo Turno */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">🎫</span>
          Tomar Nuevo Turno
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Seleccionar Barbero */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Seleccionar Barbero
            </label>
            <select
              value={selectedBarbero || ''}
              onChange={(e) => setSelectedBarbero(Number(e.target.value) || null)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="" className="bg-gray-800">Seleccionar barbero...</option>
              {barberos.filter(b => b.disponible).map((barbero) => (
                <option key={barbero.id} value={barbero.id} className="bg-gray-800">
                  {barbero.nombre} ({barbero.cola_turnos} en cola)
                </option>
              ))}
            </select>
          </div>

          {/* Seleccionar Servicio */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Seleccionar Servicio
            </label>
            <select
              value={selectedServicio || ''}
              onChange={(e) => setSelectedServicio(Number(e.target.value) || null)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="" className="bg-gray-800">Seleccionar servicio...</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={servicio.id} className="bg-gray-800">
                  {servicio.nombre} - ${servicio.precio?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={tomarTurno}
          disabled={!selectedBarbero || !selectedServicio || isTakingTurn}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-3 rounded-lg transition-all font-medium shadow-lg disabled:cursor-not-allowed"
        >
          {isTakingTurn ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Tomando Turno...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Tomar Turno
            </div>
          )}
        </motion.button>
      </motion.div>

      {/* Lista de Turnos */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">📋</span>
          Mis Turnos
        </h3>
        
        <AnimatePresence>
          {turnos.length > 0 ? (
            <div className="space-y-4">
              {turnos.map((turno, index) => (
                <motion.div 
                  key={turno.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-white font-medium text-lg">
                          Turno #{turno.numero_turno}
                        </p>
                        {turno.estado === 'esperando' && (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-2 h-2 bg-yellow-400 rounded-full"
                          />
                        )}
                      </div>
                      <p className="text-gray-300">
                        {turno.servicio?.nombre || 'Servicio'} - {turno.barbero?.nombre || 'Barbero'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(turno.fecha_creacion).toLocaleString()}
                      </p>
                      {turno.posicion_cola && turno.estado === 'esperando' && (
                        <motion.p 
                          key={turno.posicion_cola}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="text-yellow-400 text-sm font-medium"
                        >
                          🏃‍♂️ Posición en cola: {turno.posicion_cola}
                        </motion.p>
                      )}
                      {turno.tiempo_estimado && turno.estado === 'esperando' && (
                        <p className="text-blue-400 text-sm">
                          ⏱️ Tiempo estimado: {turno.tiempo_estimado} minutos
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-3 py-1 rounded-full text-xs text-white font-medium ${getEstadoColor(turno.estado)}`}>
                        {getEstadoTexto(turno.estado)}
                      </span>
                      <div className="flex space-x-2">
                        {(turno.estado === 'esperando' || turno.estado === 'en_proceso') && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => generateQRCode(turno)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                            </svg>
                            QR
                          </motion.button>
                        )}
                        {turno.estado === 'esperando' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => cancelarTurno(turno.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Cancelar
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">🎫</div>
              <p className="text-gray-400 text-lg">No tienes turnos activos</p>
              <p className="text-gray-500 text-sm mt-2">¡Toma tu primer turno arriba!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Barberos Disponibles */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">✂️</span>
          Barberos Disponibles
        </h3>
        
        <AnimatePresence>
          {barberos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {barberos.map((barbero, index) => (
                <motion.div 
                  key={barbero.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    barbero.disponible 
                      ? 'bg-green-500/20 border-green-500/30 hover:bg-green-500/30' 
                      : 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        barbero.disponible ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      {barbero.nombre}
                    </h4>
                    <motion.span 
                      animate={barbero.disponible ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        barbero.disponible 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {barbero.disponible ? '🟢 Disponible' : '🔴 Ocupado'}
                    </motion.span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-300 text-sm">
                        👥 En cola: 
                      </p>
                      <motion.span 
                        key={barbero.cola_turnos}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className="text-white font-bold"
                      >
                        {barbero.cola_turnos || 0}
                      </motion.span>
                    </div>
                    {barbero.turno_actual && (
                      <div className="flex items-center justify-between">
                        <p className="text-blue-400 text-sm">
                          🔄 Atendiendo:
                        </p>
                        <span className="text-blue-300 text-sm font-medium">
                          #{barbero.turno_actual}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">✂️</div>
              <p className="text-gray-400 text-lg">No hay barberos disponibles</p>
              <p className="text-gray-500 text-sm mt-2">Intenta más tarde</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal QR Code */}
      <AnimatePresence>
        {showQRCode && selectedTurnoForQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Código QR - Turno #{selectedTurnoForQR.numero_turno}
                </h3>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <div className="w-48 h-48 mx-auto bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-500">QR Code aquí</span>
                  </div>
                </div>
                <div className="text-left text-sm text-gray-600 mb-4">
                  <p><strong>Servicio:</strong> {selectedTurnoForQR.servicio?.nombre}</p>
                  <p><strong>Barbero:</strong> {selectedTurnoForQR.barbero?.nombre}</p>
                  <p><strong>Fecha:</strong> {new Date(selectedTurnoForQR.fecha_creacion).toLocaleString()}</p>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Muestra este código al barbero para confirmar tu turno
                </p>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClienteTurnos;