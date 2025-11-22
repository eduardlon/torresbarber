import React, { useState, useEffect } from 'react';

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  cantidad?: number;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  cantidad?: number;
}

interface VentaItem {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface VentaData {
  cita_id: number | undefined;
  cliente_nombre: string;
  servicios: VentaItem[];
  productos: VentaItem[];
  total: number;
  metodo_pago: string;
  notas: string;
}

interface Cita {
  id: number;
  cliente_nombre: string;
  servicio_id: number;
  servicio_nombre: string;
  servicio_precio: number;
}

interface ModalVentaProps {
  cita: Cita | null;
  onClose: () => void;
  onComplete: (venta: VentaData) => Promise<void>;
  mostrarNotificacion: (mensaje: string, tipo?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Extend Window interface for global functions
declare global {
  interface Window {
    getServicios: () => Promise<{ success: boolean; servicios?: Servicio[] }>;
    getProductos: () => Promise<{ success: boolean; productos?: Producto[] }>;
  }
}

const ModalVenta: React.FC<ModalVentaProps> = ({ cita, onClose, onComplete, mostrarNotificacion }) => {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [venta, setVenta] = useState<VentaData>({
    cita_id: cita?.id,
    cliente_nombre: cita?.cliente_nombre || '',
    servicios: cita ? [{
      id: cita.servicio_id,
      nombre: cita.servicio_nombre,
      precio: cita.servicio_precio,
      cantidad: 1
    }] : [],
    productos: [],
    total: cita?.servicio_precio || 0,
    metodo_pago: 'efectivo',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    calcularTotal();
  }, [venta.servicios, venta.productos]);

  useEffect(() => {
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const cargarDatos = async () => {
    try {
      const [serviciosResponse, productosResponse] = await Promise.all([
        window.getServicios(),
        window.getProductos()
      ]);

      if (serviciosResponse.success) {
        setServicios(serviciosResponse.servicios || []);
      }
      if (productosResponse.success) {
        setProductos(productosResponse.productos || []);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotal = () => {
    const totalServicios = venta.servicios.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalProductos = venta.productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const total = totalServicios + totalProductos;
    setVenta(prev => ({ ...prev, total }));
    return total;
  };

  const obtenerTotal = () => {
    const totalServicios = venta.servicios.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalProductos = venta.productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    return totalServicios + totalProductos;
  };

  const agregarServicio = (servicio) => {
    const existente = venta.servicios.find(s => s.id === servicio.id);
    if (existente) {
      setVenta(prev => ({
        ...prev,
        servicios: prev.servicios.map(s =>
          s.id === servicio.id ? { ...s, cantidad: s.cantidad + 1 } : s
        )
      }));
    } else {
      setVenta(prev => ({
        ...prev,
        servicios: [...prev.servicios, { ...servicio, cantidad: 1 }]
      }));
    }
  };

  const agregarProducto = (producto) => {
    if (producto.stock <= 0) {
      mostrarNotificacion('Producto sin stock', 'warning');
      return;
    }

    const existente = venta.productos.find(p => p.id === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stock) {
        mostrarNotificacion('Stock insuficiente', 'warning');
        return;
      }
      setVenta(prev => ({
        ...prev,
        productos: prev.productos.map(p =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        )
      }));
    } else {
      setVenta(prev => ({
        ...prev,
        productos: [...prev.productos, { ...producto, cantidad: 1 }]
      }));
    }
  };

  const removerItem = (tipo, id) => {
    if (tipo === 'servicio') {
      setVenta(prev => ({
        ...prev,
        servicios: prev.servicios.filter(s => s.id !== id)
      }));
    } else {
      setVenta(prev => ({
        ...prev,
        productos: prev.productos.filter(p => p.id !== id)
      }));
    }
  };

  const cambiarCantidad = (tipo, id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      removerItem(tipo, id);
      return;
    }

    if (tipo === 'servicio') {
      setVenta(prev => ({
        ...prev,
        servicios: prev.servicios.map(s =>
          s.id === id ? { ...s, cantidad: nuevaCantidad } : s
        )
      }));
    } else {
      const producto = productos.find(p => p.id === id);
      if (nuevaCantidad > producto.stock) {
        mostrarNotificacion('Stock insuficiente', 'warning');
        return;
      }
      setVenta(prev => ({
        ...prev,
        productos: prev.productos.map(p =>
          p.id === id ? { ...p, cantidad: nuevaCantidad } : p
        )
      }));
    }
  };

  const completarVenta = async () => {
    if (venta.servicios.length === 0 && venta.productos.length === 0) {
      mostrarNotificacion('Debe agregar al menos un servicio o producto', 'warning');
      return;
    }

    if (cargando) return; // Evitar múltiples clicks

    setCargando(true);
    try {
      await onComplete(venta);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al completar la venta', 'error');
    } finally {
      setCargando(false);
    }
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-zinc-900 w-full h-full sm:rounded-2xl sm:m-4 sm:max-w-6xl sm:h-[90vh] sm:mx-auto flex flex-col">
        {/* Header - Siempre fijo */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-700 bg-zinc-900 flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Registrar Venta</h2>
            <p className="text-zinc-400 text-sm sm:text-base">Cliente: {venta.cliente_nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Contenido principal - Solo esta sección es scrolleable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Servicios Disponibles */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold text-white mb-4">Servicios Disponibles</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {servicios.map((servicio) => (
                    <div key={servicio.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{servicio.nombre}</p>
                        <p className="text-zinc-400 text-sm">{formatearMoneda(servicio.precio)}</p>
                      </div>
                      <button
                        onClick={() => agregarServicio(servicio)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>

                <h3 className="text-lg font-semibold text-white mb-4 mt-6">Productos Disponibles</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {productos.map((producto) => (
                    <div key={producto.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{producto.nombre}</p>
                        <p className="text-zinc-400 text-sm">
                          {formatearMoneda(producto.precio)} (Stock: {producto.stock})
                        </p>
                      </div>
                      <button
                        onClick={() => agregarProducto(producto)}
                        disabled={producto.stock <= 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen de Venta */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Resumen de Venta</h3>

                {/* Servicios en la venta */}
                {venta.servicios.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-yellow-300 mb-2">Servicios</h4>
                    <div className="space-y-2">
                      {venta.servicios.map((servicio) => (
                        <div key={servicio.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-white font-medium">{servicio.nombre}</p>
                            <p className="text-zinc-400 text-sm">{formatearMoneda(servicio.precio)} c/u</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => cambiarCantidad('servicio', servicio.id, servicio.cantidad - 1)}
                              className="bg-zinc-700 hover:bg-zinc-600 text-white w-8 h-8 rounded flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="text-white w-8 text-center">{servicio.cantidad}</span>
                            <button
                              onClick={() => cambiarCantidad('servicio', servicio.id, servicio.cantidad + 1)}
                              className="bg-zinc-700 hover:bg-zinc-600 text-white w-8 h-8 rounded flex items-center justify-center"
                            >
                              +
                            </button>
                            <span className="text-yellow-300 font-medium w-20 text-right">
                              {formatearMoneda(servicio.precio * servicio.cantidad)}
                            </span>
                            <button
                              onClick={() => removerItem('servicio', servicio.id)}
                              className="text-red-400 hover:text-red-300 ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Productos en la venta */}
                {venta.productos.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-green-300 mb-2">Productos</h4>
                    <div className="space-y-2">
                      {venta.productos.map((producto) => (
                        <div key={producto.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-white font-medium">{producto.nombre}</p>
                            <p className="text-zinc-400 text-sm">{formatearMoneda(producto.precio)} c/u</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => cambiarCantidad('producto', producto.id, producto.cantidad - 1)}
                              className="bg-zinc-700 hover:bg-zinc-600 text-white w-8 h-8 rounded flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="text-white w-8 text-center">{producto.cantidad}</span>
                            <button
                              onClick={() => cambiarCantidad('producto', producto.id, producto.cantidad + 1)}
                              className="bg-zinc-700 hover:bg-zinc-600 text-white w-8 h-8 rounded flex items-center justify-center"
                            >
                              +
                            </button>
                            <span className="text-green-300 font-medium w-20 text-right">
                              {formatearMoneda(producto.precio * producto.cantidad)}
                            </span>
                            <button
                              onClick={() => removerItem('producto', producto.id)}
                              className="text-red-400 hover:text-red-300 ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Método de Pago y Notas */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Método de Pago</label>
                    <select
                      value={venta.metodo_pago}
                      onChange={(e) => setVenta(prev => ({ ...prev, metodo_pago: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (Opcional)</label>
                    <input
                      type="text"
                      value={venta.notas}
                      onChange={(e) => setVenta(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Observaciones adicionales..."
                      className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Footer - Siempre al final del modal */}
        <div className="border-t border-zinc-700 bg-zinc-900 flex-shrink-0">
          <div className="bg-zinc-800/50 p-4 sm:p-6">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={onClose}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 sm:py-3 rounded-lg font-medium transition-colors text-base sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={completarVenta}
                disabled={obtenerTotal() === 0 || cargando}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-400 text-white py-3 sm:py-3 rounded-lg font-medium transition-colors text-base sm:text-base flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Completar Venta
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-lg sm:text-xl font-bold text-white">Total:</span>
              <span className="text-xl sm:text-2xl font-bold text-yellow-300">{formatearMoneda(venta.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalVenta;