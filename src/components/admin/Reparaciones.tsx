import { useState, useEffect } from 'react';
import { useModal } from '../../hooks/useModal.tsx';
import DetalleOrden from './DetalleOrden.tsx';

interface Orden {
  id: string;
  codigo: string;
  cliente_id: string;
  estado_actual: string;
  tipo_orden: string;
  prioridad: string;
  tipo_entrega: string;
  fecha_creacion: string;
  fecha_fin_recepcion?: string;
  fecha_entrega?: string;
  clientes?: {
    telefono: string;
    identificacion: string;
    nombre_comercial: string;
    correo_electronico: string;
  };
  equipos?: any;
  nota_orden?: string;
}

const Reparaciones = () => {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [prioridadFilter, setPrioridadFilter] = useState('all');
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null);

  const { ModalComponent } = useModal();

  const estados = [
    { value: 'recepcion', label: 'Recepción', color: 'blue', icon: '📦' },
    { value: 'diagnostico', label: 'Diagnóstico', color: 'yellow', icon: '🔍' },
    { value: 'cotizacion', label: 'Cotización', color: 'purple', icon: '📋' },
    { value: 'reparacion', label: 'Reparación', color: 'orange', icon: '🔧' },
    { value: 'entrega', label: 'Entrega', color: 'green', icon: '📤' }
  ];

  const prioridades = [
    { value: 'baja', label: 'Baja', color: 'gray' },
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'alta', label: 'Alta', color: 'orange' },
    { value: 'urgente', label: 'Urgente', color: 'red' }
  ];

  useEffect(() => {
    loadOrdenes();
  }, []);

  const loadOrdenes = async () => {
    try {
      setLoading(true);
      setError('');

      if (!window.authenticatedFetch || !window.API_BASE_URL) {
        setError('Sistema no inicializado correctamente');
        return;
      }

      const response = await window.authenticatedFetch(
        `${window.API_BASE_URL}/ordenes`
      );

      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrdenes(data.data || []);
        } else {
          setError('Error al cargar las órdenes');
        }
      } else {
        setError('Error de conexión con el servidor');
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error);
      setError('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrdenes = ordenes.filter(orden => {
    const matchesSearch =
      orden.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.clientes?.nombre_comercial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.clientes?.identificacion?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado = estadoFilter === 'all' || orden.estado_actual.toLowerCase() === estadoFilter.toLowerCase();
    const matchesPrioridad = prioridadFilter === 'all' || orden.prioridad.toLowerCase() === prioridadFilter.toLowerCase();

    return matchesSearch && matchesEstado && matchesPrioridad;
  });

  const getEstadoColor = (estado: string) => {
    const estadoLower = estado.toLowerCase();
    const estadoObj = estados.find(e => e.value === estadoLower);
    return estadoObj?.color || 'gray';
  };

  const getPrioridadColor = (prioridad: string) => {
    const prioridadLower = prioridad.toLowerCase();
    const prioridadObj = prioridades.find(p => p.value === prioridadLower);
    return prioridadObj?.color || 'gray';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getEstadoIcon = (estado: string) => {
    const estadoLower = estado.toLowerCase();
    const estadoObj = estados.find(e => e.value === estadoLower);
    return estadoObj?.icon || '📋';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
            Gestión de Órdenes de Reparación
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-1">
            Administra y da seguimiento a las órdenes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-gray-400 text-xs">Total Órdenes</p>
            <p className="text-white text-xl font-bold">{ordenes.length}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg backdrop-blur-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      )}

      {!loading && (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <input
                type="text"
                placeholder="Buscar por código, cliente o identificación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm"
              />
            </div>
            <div>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm"
              >
                <option value="all">Todos los estados</option>
                {estados.map(estado => (
                  <option key={estado.value} value={estado.value}>
                    {estado.icon} {estado.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={prioridadFilter}
                onChange={(e) => setPrioridadFilter(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm"
              >
                <option value="all">Todas las prioridades</option>
                {prioridades.map(prioridad => (
                  <option key={prioridad.value} value={prioridad.value}>
                    {prioridad.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {estados.map(estado => {
              const count = ordenes.filter(o => o.estado_actual.toLowerCase() === estado.value).length;
              return (
                <div
                  key={estado.value}
                  className={`bg-gradient-to-br from-${estado.color}-900/20 to-${estado.color}-800/20 border border-${estado.color}-500/30 p-3 rounded-lg`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{estado.icon}</span>
                    <p className={`text-${estado.color}-400 text-xs font-medium`}>{estado.label}</p>
                  </div>
                  <p className="text-white text-xl font-bold">{count}</p>
                </div>
              );
            })}
          </div>

          {/* Órdenes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrdenes.map((orden) => (
              <div
                key={orden.id}
                className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl border border-red-500/30 shadow-lg backdrop-blur-sm hover:border-red-500/50 transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedOrdenId(orden.id)}
              >
                {/* Header */}
                <div className="p-4 border-b border-red-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getEstadoIcon(orden.estado_actual)}</span>
                      <div>
                        <h3 className="text-white font-bold text-lg">{orden.codigo}</h3>
                        <p className="text-gray-400 text-xs">{orden.tipo_orden}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${getPrioridadColor(orden.prioridad)}-500/20 text-${getPrioridadColor(orden.prioridad)}-400 border border-${getPrioridadColor(orden.prioridad)}-500/30`}>
                      {orden.prioridad}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${getEstadoColor(orden.estado_actual)}-500/20 text-${getEstadoColor(orden.estado_actual)}-400 border border-${getEstadoColor(orden.estado_actual)}-500/30`}>
                    {orden.estado_actual}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Cliente */}
                  {orden.clientes && (
                    <div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400">👤</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {orden.clientes.nombre_comercial}
                          </p>
                          <p className="text-gray-400 text-xs">CC: {orden.clientes.identificacion}</p>
                          <p className="text-gray-400 text-xs">{orden.clientes.telefono}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nota */}
                  {orden.nota_orden && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded">
                      <p className="text-yellow-400 text-xs line-clamp-2">
                        <span className="font-semibold">Nota:</span> {orden.nota_orden}
                      </p>
                    </div>
                  )}

                  {/* Fechas */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-black/40 p-2 rounded">
                      <p className="text-gray-400 mb-0.5">Creación</p>
                      <p className="text-white font-medium">{formatDate(orden.fecha_creacion).split(' ')[0]}</p>
                      <p className="text-gray-400 text-[10px]">{formatDate(orden.fecha_creacion).split(' ').slice(1).join(' ')}</p>
                    </div>
                    <div className="bg-black/40 p-2 rounded">
                      <p className="text-gray-400 mb-0.5">Entrega</p>
                      <p className="text-white font-medium">
                        {orden.fecha_entrega ? formatDate(orden.fecha_entrega).split(' ')[0] : 'Pendiente'}
                      </p>
                      {orden.fecha_entrega && (
                        <p className="text-gray-400 text-[10px]">{formatDate(orden.fecha_entrega).split(' ').slice(1).join(' ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrdenId(orden.id);
                    }}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-red-500/25"
                  >
                    Ver Detalles Completos
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredOrdenes.length === 0 && (
            <div className="text-center py-12 bg-gradient-to-r from-black/60 to-black/40 rounded-lg border border-red-500/30 shadow-lg backdrop-blur-sm">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-300 text-lg">No se encontraron órdenes</p>
              <p className="text-gray-500 text-sm mt-2">Intenta ajustar tus filtros de búsqueda</p>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalles */}
      {selectedOrdenId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gradient-to-br from-black/95 to-black/80 rounded-xl border border-red-500/30 w-full max-w-6xl my-8 shadow-2xl backdrop-blur-sm">
            <div className="sticky top-0 bg-black/90 backdrop-blur-sm p-4 border-b border-red-500/30 z-10 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                Detalles de la Orden
              </h2>
              <button
                onClick={() => setSelectedOrdenId(null)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-red-500/25"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <DetalleOrden
                ordenId={selectedOrdenId}
                onClose={() => setSelectedOrdenId(null)}
              />
            </div>
          </div>
        </div>
      )}

      <ModalComponent />
    </div>
  );
};

export default Reparaciones;
