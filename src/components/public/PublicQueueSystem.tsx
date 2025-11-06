import React, { useState, useEffect } from 'react';

interface Barbero {
  id: number;
  nombre: string;
  apellido?: string;
  especialidad?: string;
  activo: boolean;
}

interface Turno {
  id: number;
  numero_turno: number;
  cliente_nombre: string;
  cliente_telefono?: string;
  servicio_nombre: string;
  estado: 'espera' | 'llamado' | 'en_silla' | 'finalizando';
  prioridad: number;
  hora_registro: string;
  barbero_id: number;
  tiempo_estimado?: number;
}

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  duracion_estimada: number;
}

interface PublicQueueSystemProps {
  onNotification?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const PublicQueueSystem: React.FC<PublicQueueSystemProps> = ({ onNotification }) => {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [turnos, setTurnos] = useState<{ [barberoId: number]: Turno[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedBarbero, setSelectedBarbero] = useState<number | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [tipoAccion, setTipoAccion] = useState<'turno' | 'cita' | null>(null);
  const [fechaCita, setFechaCita] = useState('');
  const [horaCita, setHoraCita] = useState('');

  const getApiBaseUrl = () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiHost = isLocalhost ? 'localhost' : window.location.hostname;
    return `http://${apiHost}:8001/api`;
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
    const interval = setInterval(cargarTurnos, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      await Promise.all([
        cargarBarberos(),
        cargarServicios(),
        cargarTurnos()
      ]);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      onNotification?.('Error al cargar los datos iniciales', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarBarberos = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/barberos/publico`);
      if (response.ok) {
        const result = await response.json();
        // Extraer la propiedad data de la respuesta API
        const data = result.success ? result.data : result;
        setBarberos(Array.isArray(data) ? data.filter((b: Barbero) => b.activo) : []);
      }
    } catch (error) {
      console.error('Error cargando barberos:', error);
      setBarberos([]); // Establecer array vacío en caso de error
    }
  };

  const cargarServicios = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/servicios/publico`);
      if (response.ok) {
        const result = await response.json();
        // Extraer la propiedad data de la respuesta API
        const data = result.success ? result.data : result;
        setServicios(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
      setServicios([]); // Establecer array vacío en caso de error
    }
  };

  const cargarTurnos = async () => {
    try {
      const turnosPorBarbero: { [barberoId: number]: Turno[] } = {};
      
      for (const barbero of barberos) {
        const response = await fetch(`${getApiBaseUrl()}/v2/barber/${barbero.id}/queue/public`);
        if (response.ok) {
          const data = await response.json();
          turnosPorBarbero[barbero.id] = data;
        }
      }
      
      setTurnos(turnosPorBarbero);
    } catch (error) {
      console.error('Error cargando turnos:', error);
    }
  };

  const agregarTurno = async () => {
    if (!selectedBarbero || !selectedServicio || !clienteNombre.trim()) {
      onNotification?.('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    try {
      const servicio = servicios.find(s => s.id === selectedServicio);
      const response = await fetch(`${getApiBaseUrl()}/v2/turns/public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbero_id: selectedBarbero,
          cliente_nombre: clienteNombre.trim(),
          cliente_telefono: clienteTelefono.trim() || null,
          servicio_id: selectedServicio,
          servicio_nombre: servicio?.nombre || 'Servicio',
          duracion_estimada: servicio?.duracion_estimada || 30,
          prioridad: 2 // Prioridad normal para turnos sin cita
        })
      });

      if (response.ok) {
        const nuevoTurno = await response.json();
        onNotification?.(`Turno agregado exitosamente. Número: ${nuevoTurno.numero_turno}`, 'success');
        limpiarFormulario();
        cargarTurnos();
      } else {
        const error = await response.json();
        onNotification?.(error.message || 'Error al agregar el turno', 'error');
      }
    } catch (error) {
      console.error('Error agregando turno:', error);
      onNotification?.('Error de conexión al agregar el turno', 'error');
    }
  };

  const agendarCita = async () => {
    if (!selectedBarbero || !selectedServicio || !clienteNombre.trim() || !fechaCita || !horaCita) {
      onNotification?.('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    try {
      const fechaHora = `${fechaCita} ${horaCita}:00`;
      const servicio = servicios.find(s => s.id === selectedServicio);
      
      const response = await fetch(`${getApiBaseUrl()}/citas/publico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbero_id: selectedBarbero,
          cliente_nombre: clienteNombre.trim(),
          cliente_telefono: clienteTelefono.trim() || null,
          servicio_id: selectedServicio,
          fecha_hora: fechaHora,
          precio: servicio?.precio || 0,
          notas: `Cita agendada públicamente para ${servicio?.nombre || 'servicio'}`
        })
      });

      if (response.ok) {
        const nuevaCita = await response.json();
        onNotification?.(`Cita agendada exitosamente para ${fechaCita} a las ${horaCita}`, 'success');
        limpiarFormulario();
      } else {
        const error = await response.json();
        onNotification?.(error.message || 'Error al agendar la cita', 'error');
      }
    } catch (error) {
      console.error('Error agendando cita:', error);
      onNotification?.('Error de conexión al agendar la cita', 'error');
    }
  };

  const limpiarFormulario = () => {
    setClienteNombre('');
    setClienteTelefono('');
    setSelectedBarbero(null);
    setSelectedServicio(null);
    setFechaCita('');
    setHoraCita('');
    setTipoAccion(null);
  };

  const obtenerEstadoCola = (barberoId: number) => {
    const turnosBarbero = turnos[barberoId] || [];
    const enSilla = turnosBarbero.find(t => t.estado === 'en_silla');
    const enEspera = turnosBarbero.filter(t => t.estado === 'espera');
    const proximoTurno = enEspera.sort((a, b) => a.numero_turno - b.numero_turno)[0];

    return {
      clienteActual: enSilla?.cliente_nombre || 'Disponible',
      proximoCliente: proximoTurno?.cliente_nombre || 'Sin turnos',
      numeroProximo: proximoTurno?.numero_turno || null,
      cantidadEspera: enEspera.length,
      tiempoEstimado: enEspera.reduce((total, turno) => total + (turno.tiempo_estimado || 30), 0)
    };
  };

  const formatearTiempo = (minutos: number): string => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        <span className="ml-3 text-white">Cargando sistema de colas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visualización de Colas en Tiempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {barberos.map((barbero) => {
          const estadoCola = obtenerEstadoCola(barbero.id);
          return (
            <div key={barbero.id} className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-yellow-600/30 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-yellow-500">✂️</span>
                  {barbero.nombre} {barbero.apellido}
                </h3>
                <div className="text-sm text-zinc-400">
                  {barbero.especialidad}
                </div>
              </div>

              <div className="space-y-3">
                {/* Cliente Actual */}
                <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-3">
                  <div className="text-sm text-green-400 font-medium">Atendiendo ahora:</div>
                  <div className="text-white font-semibold">{estadoCola.clienteActual}</div>
                </div>

                {/* Próximo Cliente */}
                <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-3">
                  <div className="text-sm text-yellow-400 font-medium">Próximo en cola:</div>
                  <div className="text-white font-semibold">
                    {estadoCola.proximoCliente}
                    {estadoCola.numeroProximo && (
                      <span className="text-yellow-400 ml-2">#{estadoCola.numeroProximo}</span>
                    )}
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{estadoCola.cantidadEspera}</div>
                    <div className="text-xs text-zinc-400">En espera</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">
                      {formatearTiempo(estadoCola.tiempoEstimado)}
                    </div>
                    <div className="text-xs text-zinc-400">Tiempo est.</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulario de Agendamiento */}
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-yellow-600/30 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-yellow-500">📅</span>
          Sistema de Agendamiento
        </h3>

        {/* Selector de Acción */}
        {!tipoAccion && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setTipoAccion('turno')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-lg mb-1">🎫 Tomar Turno</div>
              <div className="text-sm opacity-90">Entrar a la cola ahora</div>
            </button>
            <button
              onClick={() => setTipoAccion('cita')}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-lg mb-1">📅 Agendar Cita</div>
              <div className="text-sm opacity-90">Reservar fecha y hora</div>
            </button>
          </div>
        )}

        {/* Formulario */}
        {tipoAccion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">
                {tipoAccion === 'turno' ? '🎫 Tomar Turno' : '📅 Agendar Cita'}
              </h4>
              <button
                onClick={limpiarFormulario}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                ✕ Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Datos del Cliente */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Tu número de teléfono"
                  />
                </div>
              </div>

              {/* Selección de Servicio y Barbero */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Barbero *
                  </label>
                  <select
                    value={selectedBarbero || ''}
                    onChange={(e) => setSelectedBarbero(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Selecciona un barbero</option>
                    {barberos.map((barbero) => (
                      <option key={barbero.id} value={barbero.id}>
                        {barbero.nombre} {barbero.apellido}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Servicio *
                  </label>
                  <select
                    value={selectedServicio || ''}
                    onChange={(e) => setSelectedServicio(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Selecciona un servicio</option>
                    {servicios.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre} - ${servicio.precio} ({servicio.duracion_estimada} min)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Campos adicionales para citas */}
            {tipoAccion === 'cita' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={fechaCita}
                    onChange={(e) => setFechaCita(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={horaCita}
                    onChange={(e) => setHoraCita(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Botón de Acción */}
            <div className="flex justify-end mt-6">
              <button
                onClick={tipoAccion === 'turno' ? agregarTurno : agendarCita}
                className={`px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 ${
                  tipoAccion === 'turno'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                }`}
              >
                {tipoAccion === 'turno' ? '🎫 Tomar Turno' : '📅 Agendar Cita'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicQueueSystem;