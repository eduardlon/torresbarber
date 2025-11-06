import React, { useState, useEffect } from 'react';
import { Users, User, Phone, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Barbero {
  id: number;
  nombre: string;
  especialidad?: string;
}

interface Servicio {
  id: number;
  nombre: string;
  duracion: number;
  precio: number;
}

const QueueApp: React.FC = () => {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBarbero, setSelectedBarbero] = useState<number | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error' | 'info', texto: string } | null>(null);
  const [turnoGenerado, setTurnoGenerado] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar barberos
      const resBarberos = await fetch('http://localhost:8001/api/barberos-publicos');
      if (resBarberos.ok) {
        const dataBarberos = await resBarberos.json();
        setBarberos(dataBarberos.data || []);
      }

      // Cargar servicios
      const resServicios = await fetch('http://localhost:8001/api/servicios-publicos');
      if (resServicios.ok) {
        const dataServicios = await resServicios.json();
        setServicios(dataServicios.data || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error al cargar los datos. Por favor, recarga la página.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setSubmitting(true);

    if (!selectedBarbero || !clienteNombre || !clienteTelefono) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Por favor completa todos los campos obligatorios.' 
      });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8001/api/citas-publicas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          cliente_email: null,
          barbero_id: selectedBarbero,
          servicio_id: selectedServicio,
          fecha_hora: new Date().toISOString().slice(0, 19).replace('T', ' '),
          notas: notas || null,
          estado: 'pendiente',
          tipo: 'walk-in'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTurnoGenerado(data.data);
        setMensaje({ 
          tipo: 'success', 
          texto: '¡Turno generado exitosamente! Guarda tu número de turno.' 
        });
        
        // Limpiar formulario
        setClienteNombre('');
        setClienteTelefono('');
        setSelectedBarbero(null);
        setSelectedServicio(null);
        setNotas('');
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: data.message || 'Error al generar el turno.' 
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error de conexión. Por favor intenta nuevamente.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando sistema de turnos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mensaje de éxito/error */}
      {mensaje && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' :
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {mensaje.tipo === 'success' && <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
          {mensaje.tipo === 'error' && <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Tarjeta de turno generado */}
      {turnoGenerado && (
        <div className="mb-6 bg-gradient-to-br from-red-600 to-red-700 text-white p-8 rounded-lg shadow-xl">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Tu Turno</h2>
            <div className="text-6xl font-bold my-6">
              #{turnoGenerado.id || '---'}
            </div>
            <div className="bg-white/10 rounded-lg p-4 mt-4">
              <p className="text-sm mb-1">Barbero: <strong>{barberos.find(b => b.id === selectedBarbero)?.nombre}</strong></p>
              <p className="text-sm">Hora de registro: {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <p className="mt-4 text-sm opacity-90">
              Mantén este número visible. Te llamaremos cuando sea tu turno.
            </p>
          </div>
        </div>
      )}

      {/* Formulario de registro */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800">¿Cómo funciona la cola inteligente?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Regístrate en la cola virtual, recibe un número de turno y espera cómodamente. 
                Te avisaremos cuando sea tu turno.
              </p>
            </div>
          </div>
        </div>

        {/* Selección de Barbero */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline w-4 h-4 mr-2" />
            Selecciona tu Barbero *
          </label>
          <select
            value={selectedBarbero || ''}
            onChange={(e) => setSelectedBarbero(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
            disabled={submitting}
          >
            <option value="">-- Selecciona un barbero --</option>
            {barberos.map((barbero) => (
              <option key={barbero.id} value={barbero.id}>
                {barbero.nombre} {barbero.especialidad && `- ${barbero.especialidad}`}
              </option>
            ))}
          </select>
        </div>

        {/* Selección de Servicio (Opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="inline w-4 h-4 mr-2" />
            Servicio (Opcional)
          </label>
          <select
            value={selectedServicio || ''}
            onChange={(e) => setSelectedServicio(Number(e.target.value) || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={submitting}
          >
            <option value="">-- Selecciona un servicio (opcional) --</option>
            {servicios.map((servicio) => (
              <option key={servicio.id} value={servicio.id}>
                {servicio.nombre} - ${servicio.precio} ({servicio.duracion} min)
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Puedes seleccionar el servicio ahora o decidirlo cuando sea tu turno
          </p>
        </div>

        {/* Datos del Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline w-4 h-4 mr-2" />
              Tu Nombre *
            </label>
            <input
              type="text"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline w-4 h-4 mr-2" />
              Teléfono *
            </label>
            <input
              type="tel"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              placeholder="Ej: 3001234567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              disabled={submitting}
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Adicionales (Opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="¿Alguna preferencia especial?"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={submitting}
          />
        </div>

        {/* Botón Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 flex items-center"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generando turno...
              </>
            ) : (
              <>
                <Users className="w-5 h-5 mr-2" />
                Unirse a la Cola
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QueueApp;
