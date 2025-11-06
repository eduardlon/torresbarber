import { useState, useEffect } from 'react';

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
  fecha_inicio_diagnostico?: string;
  fecha_fin_diagnostico?: string;
  fecha_cotizacion?: string;
  fecha_aprobacion?: string;
  fecha_solicitud_repuestos?: string;
  fecha_recepcion_repuestos?: string;
  fecha_inicio_reparacion?: string;
  fecha_fin_reparacion?: string;
  fecha_entrega?: string;
  comentarios_recepcion?: string;
  comentarios_diagnostico?: string;
  comentarios_cotizacion?: string;
  comentarios_reparacion?: string;
  comentarios_entrega?: string;
  tecnico_recepcion?: string;
  tecnico_diagnostico?: string;
  tecnico_cotiza?: string;
  tecnico_repara?: string;
  tecnico_entrega?: string;
  fotos_recepcion?: string[];
  fotos_diagnostico?: string[];
  fotos_reparacion?: string[];
  fotos_entrega?: string[];
  repuestos_diagnostico?: any[];
  repuestos_cotizacion?: any[];
  esta_accesorios?: any[];
  aprobacion_marca?: any;
  nota_orden?: string;
  firma_cliente?: string;
  fecha_firma?: string;
  estado_firma?: string;
  clientes?: {
    telefono: string;
    identificacion: string;
    nombre_comercial: string;
    correo_electronico: string;
  };
  equipos?: any;
}

interface DetalleOrdenProps {
  ordenId: string;
  onClose?: () => void;
}

const DetalleOrden: React.FC<DetalleOrdenProps> = ({ ordenId, onClose }) => {
  const [orden, setOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'recepcion' | 'diagnostico' | 'cotizacion' | 'reparacion' | 'entrega'>('recepcion');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const stages = [
    { key: 'recepcion', label: 'Recepción', icon: '📦', color: 'blue' },
    { key: 'diagnostico', label: 'Diagnóstico', icon: '🔍', color: 'yellow' },
    { key: 'cotizacion', label: 'Cotización', icon: '📋', color: 'purple' },
    { key: 'reparacion', label: 'Reparación', icon: '🔧', color: 'orange' },
    { key: 'entrega', label: 'Entrega', icon: '📤', color: 'green' }
  ];

  useEffect(() => {
    loadOrden();
  }, [ordenId]);

  const loadOrden = async () => {
    try {
      setLoading(true);
      setError('');

      if (!window.authenticatedFetch || !window.API_BASE_URL) {
        setError('Sistema no inicializado correctamente');
        setLoading(false);
        return;
      }

      const response = await window.authenticatedFetch(
        `${window.API_BASE_URL}/ordenes/${ordenId}`
      );

      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrden(data.data);
        } else {
          setError('Error al cargar la orden');
        }
      } else {
        setError('Error de conexión con el servidor');
      }
    } catch (error) {
      console.error('Error cargando orden:', error);
      setError('Error al cargar la orden');
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStageIndex = (key: string) => {
    return stages.findIndex(s => s.key === key);
  };

  const getCurrentStageIndex = () => {
    if (!orden) return 0;
    const estado = orden.estado_actual.toLowerCase();
    return getStageIndex(estado);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
        <p>{error || 'No se pudo cargar la orden'}</p>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="space-y-6">
      {/* Header con Info de la Orden */}
      <div className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl border border-red-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{orden.codigo}</h2>
            <p className="text-gray-400 text-sm">{orden.tipo_orden}</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              {orden.estado_actual}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>

        {/* Info del Cliente */}
        {orden.clientes && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-red-500/20">
            <div>
              <p className="text-gray-400 text-xs mb-1">Cliente</p>
              <p className="text-white font-medium">{orden.clientes.nombre_comercial}</p>
              <p className="text-gray-400 text-sm">CC: {orden.clientes.identificacion}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Contacto</p>
              <p className="text-white font-medium">{orden.clientes.telefono}</p>
              <p className="text-gray-400 text-sm">{orden.clientes.correo_electronico}</p>
            </div>
          </div>
        )}

        {/* Nota de Orden */}
        {orden.nota_orden && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              <span className="font-semibold">Nota:</span> {orden.nota_orden}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar de Estados */}
      <div className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl border border-red-500/30 p-6">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-0 w-full h-1 bg-gray-700/50"
               style={{
                 marginLeft: '2rem',
                 width: 'calc(100% - 4rem)'
               }}>
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
              style={{
                width: `${(currentStageIndex / (stages.length - 1)) * 100}%`
              }}
            />
          </div>

          {/* Stages */}
          <div className="relative flex justify-between items-start">
            {stages.map((stage, index) => {
              const isActive = index === currentStageIndex;
              const isCompleted = index < currentStageIndex;
              const isPending = index > currentStageIndex;

              return (
                <div
                  key={stage.key}
                  className="flex flex-col items-center flex-1 cursor-pointer group"
                  onClick={() => setActiveTab(stage.key as any)}
                >
                  {/* Icon Circle */}
                  <div className="relative mb-3">
                    <div
                      className={`
                        w-16 h-16 rounded-full flex items-center justify-center text-2xl
                        border-2 transition-all duration-300 z-10 relative
                        ${isActive
                          ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 shadow-lg shadow-red-500/50 scale-110'
                          : isCompleted
                          ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-400'
                          : 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600'
                        }
                        group-hover:scale-105 group-hover:shadow-xl
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className={isActive ? 'text-white' : 'text-gray-300'}>
                          {stage.icon}
                        </span>
                      )}
                    </div>

                    {/* Pulsing effect for active stage */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                    )}
                  </div>

                  {/* Stage Name */}
                  <div className="text-center">
                    <p
                      className={`
                        text-xs sm:text-sm font-medium transition-colors duration-300
                        ${isActive
                          ? 'text-red-400 font-bold'
                          : isCompleted
                          ? 'text-green-400'
                          : 'text-gray-500'
                        }
                      `}
                    >
                      {stage.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido según la Etapa Seleccionada */}
      <div className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl border border-red-500/30 p-6">
        {/* Recepción */}
        {activeTab === 'recepcion' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              📦 Recepción
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Fecha de Recepción</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_fin_recepcion)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Técnico</p>
                <p className="text-white font-medium">{orden.tecnico_recepcion || 'N/A'}</p>
              </div>
            </div>

            {orden.comentarios_recepcion && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-2">Comentarios</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{orden.comentarios_recepcion}</p>
              </div>
            )}

            {/* Accesorios */}
            {orden.esta_accesorios && orden.esta_accesorios.length > 0 && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Accesorios Recibidos</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {orden.esta_accesorios.map((acc, index) => (
                    <div key={index} className="bg-black/60 p-2 rounded border border-gray-700">
                      <p className="text-white text-sm">{acc.nombre}</p>
                      <p className={`text-xs ${
                        acc.estado === 'bueno' ? 'text-green-400' :
                        acc.estado === 'regular' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {acc.estado}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fotos de Recepción */}
            {orden.fotos_recepcion && orden.fotos_recepcion.length > 0 && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Fotos de Recepción ({orden.fotos_recepcion.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {orden.fotos_recepcion.map((foto, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-black/60 rounded-lg border border-red-500/20 overflow-hidden cursor-pointer hover:border-red-500/50 transition-all"
                      onClick={() => setSelectedImage(foto)}
                    >
                      <img src={foto} alt={`Recepción ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Diagnóstico */}
        {activeTab === 'diagnostico' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              🔍 Diagnóstico
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Inicio</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_inicio_diagnostico)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Fin</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_fin_diagnostico)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Técnico</p>
                <p className="text-white font-medium">{orden.tecnico_diagnostico || 'N/A'}</p>
              </div>
            </div>

            {orden.comentarios_diagnostico && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-2">Comentarios del Diagnóstico</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{orden.comentarios_diagnostico}</p>
              </div>
            )}

            {/* Repuestos Identificados */}
            {orden.repuestos_diagnostico && orden.repuestos_diagnostico.length > 0 && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Repuestos Necesarios</p>
                <div className="space-y-2">
                  {orden.repuestos_diagnostico.map((repuesto, index) => (
                    <div key={index} className="bg-black/60 p-3 rounded border border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium">{repuesto.codigo}</p>
                          <p className="text-gray-400 text-sm">{repuesto.descripcion}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          x{repuesto.cantidad}
                        </span>
                      </div>
                      {repuesto.pieza_causante && (
                        <p className="text-red-400 text-xs">
                          <span className="font-semibold">Causa:</span> {repuesto.pieza_causante}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fotos de Diagnóstico */}
            {orden.fotos_diagnostico && orden.fotos_diagnostico.length > 0 && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Fotos del Diagnóstico ({orden.fotos_diagnostico.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {orden.fotos_diagnostico.map((foto, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-black/60 rounded-lg border border-red-500/20 overflow-hidden cursor-pointer hover:border-red-500/50 transition-all"
                      onClick={() => setSelectedImage(foto)}
                    >
                      <img src={foto} alt={`Diagnóstico ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cotización */}
        {activeTab === 'cotizacion' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              📋 Cotización
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Fecha Cotización</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_cotizacion)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Fecha Aprobación</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_aprobacion)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Técnico</p>
                <p className="text-white font-medium">{orden.tecnico_cotiza || 'N/A'}</p>
              </div>
            </div>

            {orden.comentarios_cotizacion && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-2">Comentarios</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{orden.comentarios_cotizacion}</p>
              </div>
            )}

            {/* Repuestos Cotizados */}
            {orden.repuestos_cotizacion && orden.repuestos_cotizacion.length > 0 && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Repuestos y Precios</p>
                <div className="space-y-2">
                  {orden.repuestos_cotizacion.map((repuesto, index) => {
                    const subtotal = repuesto.precio_unitario * repuesto.cantidad;
                    const descuentoMonto = subtotal * (repuesto.descuento / 100);
                    const iva = (subtotal - descuentoMonto) * (repuesto.iva / 100);
                    const total = subtotal - descuentoMonto + iva;

                    return (
                      <div key={index} className="bg-black/60 p-4 rounded border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="text-white font-medium">{repuesto.codigo}</p>
                            <p className="text-gray-400 text-sm">{repuesto.descripcion}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              repuesto.en_stock
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {repuesto.en_stock ? 'En Stock' : 'Por Pedir'}
                            </span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                              x{repuesto.cantidad}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs">Precio Unit.</p>
                            <p className="text-white">{formatCurrency(repuesto.precio_unitario)}</p>
                          </div>
                          {repuesto.descuento > 0 && (
                            <div>
                              <p className="text-gray-400 text-xs">Descuento</p>
                              <p className="text-yellow-400">{repuesto.descuento}%</p>
                            </div>
                          )}
                          {repuesto.iva > 0 && (
                            <div>
                              <p className="text-gray-400 text-xs">IVA</p>
                              <p className="text-white">{repuesto.iva}%</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-400 text-xs">Total</p>
                            <p className="text-green-400 font-bold">{formatCurrency(total)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aprobación de Marca/Garantía */}
            {orden.aprobacion_marca && (
              <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 p-4 rounded-lg border border-purple-500/30">
                <p className="text-purple-400 font-semibold mb-3">Información de Garantía</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-gray-400 text-xs">Estado</p>
                    <p className="text-white">{orden.aprobacion_marca.estado_garantia}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Evaluador</p>
                    <p className="text-white">{orden.aprobacion_marca.evaluador}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Fecha Pedido</p>
                    <p className="text-white">{orden.aprobacion_marca.fecha_pedido}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Fecha Pago</p>
                    <p className="text-white">{orden.aprobacion_marca.fecha_pago}</p>
                  </div>
                </div>
                {orden.aprobacion_marca.comentarios_garantia && (
                  <div className="mt-3">
                    <p className="text-gray-400 text-xs mb-1">Comentarios</p>
                    <p className="text-gray-300 text-sm">{orden.aprobacion_marca.comentarios_garantia}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reparación */}
        {activeTab === 'reparacion' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              🔧 Reparación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Inicio</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_inicio_reparacion)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Fin</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_fin_reparacion)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Técnico</p>
                <p className="text-white font-medium">{orden.tecnico_repara || 'N/A'}</p>
              </div>
            </div>

            {/* Fechas de Repuestos */}
            {(orden.fecha_solicitud_repuestos || orden.fecha_recepcion_repuestos) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                  <p className="text-blue-400 text-xs mb-1">Solicitud de Repuestos</p>
                  <p className="text-white font-medium">{formatDate(orden.fecha_solicitud_repuestos)}</p>
                </div>
                <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                  <p className="text-green-400 text-xs mb-1">Recepción de Repuestos</p>
                  <p className="text-white font-medium">{formatDate(orden.fecha_recepcion_repuestos)}</p>
                </div>
              </div>
            )}

            {orden.comentarios_reparacion && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-2">Comentarios de Reparación</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{orden.comentarios_reparacion}</p>
              </div>
            )}

            {/* Fotos de Reparación */}
            {orden.fotos_reparacion && orden.fotos_reparacion.length > 0 && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Fotos del Proceso ({orden.fotos_reparacion.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {orden.fotos_reparacion.map((foto, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-black/60 rounded-lg border border-red-500/20 overflow-hidden cursor-pointer hover:border-red-500/50 transition-all"
                      onClick={() => setSelectedImage(foto)}
                    >
                      <img src={foto} alt={`Reparación ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Entrega */}
        {activeTab === 'entrega' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              📤 Entrega
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Fecha de Entrega</p>
                <p className="text-white font-medium">{formatDate(orden.fecha_entrega)}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Técnico</p>
                <p className="text-white font-medium">{orden.tecnico_entrega || 'N/A'}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Tipo de Entrega</p>
                <p className="text-white font-medium">{orden.tipo_entrega}</p>
              </div>
            </div>

            {orden.comentarios_entrega && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-2">Comentarios de Entrega</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{orden.comentarios_entrega}</p>
              </div>
            )}

            {/* Fotos de Entrega */}
            {orden.fotos_entrega && orden.fotos_entrega.length > 0 && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Fotos de Entrega ({orden.fotos_entrega.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {orden.fotos_entrega.map((foto, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-black/60 rounded-lg border border-red-500/20 overflow-hidden cursor-pointer hover:border-red-500/50 transition-all"
                      onClick={() => setSelectedImage(foto)}
                    >
                      <img src={foto} alt={`Entrega ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Firma */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-1">Estado de Firma</p>
                <p className={`font-medium ${
                  orden.estado_firma === 'firmado' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {orden.estado_firma === 'firmado' ? '✓ Firmado' : 'Pendiente'}
                </p>
              </div>
              {orden.fecha_firma && (
                <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                  <p className="text-gray-400 text-xs mb-1">Fecha de Firma</p>
                  <p className="text-white font-medium">{formatDate(orden.fecha_firma)}</p>
                </div>
              )}
            </div>

            {orden.firma_cliente && (
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/20">
                <p className="text-gray-400 text-xs mb-3">Firma del Cliente</p>
                <div className="bg-white p-4 rounded">
                  <img src={orden.firma_cliente} alt="Firma" className="max-w-full h-auto" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para Ver Imagen Ampliada */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="Vista ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleOrden;
