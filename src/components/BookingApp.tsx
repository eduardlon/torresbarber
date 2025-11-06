import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, MessageSquare } from 'lucide-react';

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

const BookingApp: React.FC = () => {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarbero, setSelectedBarbero] = useState<number | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<number | null>(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);

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
      setMensaje({ tipo: 'error', texto: 'Error al cargar los datos. Intenta recargar la página.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!selectedBarbero || !selectedServicio || !fecha || !hora || !clienteNombre || !clienteTelefono) {
      setMensaje({ tipo: 'error', texto: 'Por favor completa todos los campos obligatorios.' });
      return;
    }

    try {
      const fechaHora = `${fecha} ${hora}:00`;
      
      const response = await fetch('http://localhost:8001/api/citas-publicas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          cliente_email: clienteEmail || null,
          barbero_id: selectedBarbero,
          servicio_id: selectedServicio,
          fecha_hora: fechaHora,
          notas: notas || null,
          estado: 'pendiente',
          tipo: 'cita'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMensaje({ tipo: 'success', texto: '¡Cita agendada exitosamente! Te contactaremos pronto.' });
        // Limpiar formulario
        setSelectedBarbero(null);
        setSelectedServicio(null);
        setFecha('');
        setHora('');
        setClienteNombre('');
        setClienteTelefono('');
        setClienteEmail('');
        setNotas('');
      } else {
        setMensaje({ tipo: 'error', texto: data.message || 'Error al agendar la cita.' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({ tipo: 'error', texto: 'Error de conexión. Por favor intenta nuevamente.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {mensaje && (
        <div className={`mb-6 p-4 rounded-lg ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
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
          >
            <option value="">-- Selecciona un barbero --</option>
            {barberos.map((barbero) => (
              <option key={barbero.id} value={barbero.id}>
                {barbero.nombre} {barbero.especialidad && `- ${barbero.especialidad}`}
              </option>
            ))}
          </select>
        </div>

        {/* Selección de Servicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="inline w-4 h-4 mr-2" />
            Selecciona el Servicio *
          </label>
          <select
            value={selectedServicio || ''}
            onChange={(e) => setSelectedServicio(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          >
            <option value="">-- Selecciona un servicio --</option>
            {servicios.map((servicio) => (
              <option key={servicio.id} value={servicio.id}>
                {servicio.nombre} - ${servicio.precio} ({servicio.duracion} min)
              </option>
            ))}
          </select>
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-2" />
              Fecha *
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline w-4 h-4 mr-2" />
              Hora *
            </label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              min="09:00"
              max="20:00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>
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
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="inline w-4 h-4 mr-2" />
            Email (Opcional)
          </label>
          <input
            type="email"
            value={clienteEmail}
            onChange={(e) => setClienteEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="inline w-4 h-4 mr-2" />
            Notas Adicionales (Opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="¿Alguna preferencia especial?"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Botón Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 flex items-center"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Agendar Cita
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingApp;
