import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  tipo: 'gorra' | 'producto';
}

interface ItemVenta {
  tipo: 'servicio' | 'producto';
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface ModalVentaMejoradoProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: {
    id?: number;
    nombre: string;
    telefono?: string;
  };
  barberoId: number;
  onVentaCompletada: (mensaje: string, tipo?: string) => void;
}

const ModalVentaMejorado: React.FC<ModalVentaMejoradoProps> = ({
  isOpen,
  onClose,
  cliente,
  barberoId,
  onVentaCompletada
}) => {
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>([]);
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  const [gorrasDisponibles, setGorrasDisponibles] = useState<Producto[]>([]);
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notasVenta, setNotasVenta] = useState('');
  const [clienteNombre, setClienteNombre] = useState(cliente?.nombre || '');
  const [clienteTelefono, setClienteTelefono] = useState(cliente?.telefono || '');

  // Vista actual del modal
  const [vistaActual, setVistaActual] = useState<'resumen' | 'servicios' | 'productos' | 'gorras'>('resumen');

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
      setClienteNombre(cliente?.nombre || '');
      setClienteTelefono(cliente?.telefono || '');
    } else {
      // Resetear estado al cerrar
      setItemsVenta([]);
      setNotasVenta('');
      setMetodoPago('efectivo');
      setVistaActual('resumen');
    }
  }, [isOpen, cliente]);

  const cargarDatos = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('barbero_token');
      
      // Cargar servicios
      const serviciosRes = await fetch('/api/servicios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (serviciosRes.ok) {
        const servicios = await serviciosRes.json();
        setServiciosDisponibles(servicios);
      }

      // Cargar productos
      const productosRes = await fetch('/api/productos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (productosRes.ok) {
        const productos = await productosRes.json();
        setProductosDisponibles(productos.filter((p: Producto) => p.tipo !== 'gorra'));
      }

      // Cargar gorras
      const gorrasRes = await fetch('/api/gorras', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (gorrasRes.ok) {
        const gorras = await gorrasRes.json();
        setGorrasDisponibles(gorras);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const agregarItem = (tipo: 'servicio' | 'producto', id: number, nombre: string, precio: number) => {
    // Verificar si ya existe
    const existente = itemsVenta.find(item => item.tipo === tipo && item.id === id);
    
    if (existente) {
      // Incrementar cantidad
      setItemsVenta(items =>
        items.map(item =>
          item.tipo === tipo && item.id === id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      // Agregar nuevo
      setItemsVenta([...itemsVenta, { tipo, id, nombre, precio, cantidad: 1 }]);
    }
    
    setVistaActual('resumen');
  };

  const eliminarItem = (tipo: string, id: number) => {
    setItemsVenta(items => items.filter(item => !(item.tipo === tipo && item.id === id)));
  };

  const actualizarCantidad = (tipo: string, id: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarItem(tipo, id);
    } else {
      setItemsVenta(items =>
        items.map(item =>
          item.tipo === tipo && item.id === id
            ? { ...item, cantidad: nuevaCantidad }
            : item
        )
      );
    }
  };

  const calcularTotal = () => {
    return itemsVenta.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  };

  const finalizarVenta = async () => {
    if (itemsVenta.length === 0) {
      onVentaCompletada('Debes agregar al menos un servicio o producto', 'error');
      return;
    }

    if (!clienteNombre.trim()) {
      onVentaCompletada('Debes ingresar el nombre del cliente', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('barbero_token');
      const response = await fetch('/api/barbero/ventas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          barbero_id: barberoId,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono || null,
          items: itemsVenta,
          metodo_pago: metodoPago,
          notas: notasVenta,
          total: calcularTotal()
        })
      });

      if (response.ok) {
        onVentaCompletada('Venta registrada exitosamente', 'success');
        onClose();
      } else {
        const error = await response.json();
        onVentaCompletada(error.message || 'Error al registrar la venta', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onVentaCompletada('Error de conexión al registrar la venta', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-black bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-zinc-900 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-zinc-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center">
                <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Finalizar Venta
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-yellow-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Información del Cliente */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Información del Cliente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setClienteNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setClienteTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Número de teléfono"
                  />
                </div>
              </div>
            </div>

            {/* Navegación de Vistas */}
            <div className="flex space-x-2 mb-6 overflow-x-auto">
              <button
                onClick={() => setVistaActual('resumen')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  vistaActual === 'resumen'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Resumen ({itemsVenta.length})
              </button>
              <button
                onClick={() => setVistaActual('servicios')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  vistaActual === 'servicios'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Servicios
              </button>
              <button
                onClick={() => setVistaActual('productos')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  vistaActual === 'productos'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Productos
              </button>
              <button
                onClick={() => setVistaActual('gorras')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  vistaActual === 'gorras'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Gorras
              </button>
            </div>

            {/* Vista de Resumen */}
            {vistaActual === 'resumen' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Items de la Venta</h4>
                {itemsVenta.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">
                    <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                    <p>No hay items agregados. Selecciona servicios, productos o gorras para agregar.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itemsVenta.map((item, index) => (
                      <div key={`${item.tipo}-${item.id}-${index}`} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-4">
                        <div className="flex-1">
                          <h5 className="font-medium text-white">{item.nombre}</h5>
                          <p className="text-sm text-zinc-400 capitalize">{item.tipo}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => actualizarCantidad(item.tipo, item.id, item.cantidad - 1)}
                              className="w-8 h-8 bg-zinc-700 hover:bg-zinc-600 rounded text-white"
                            >
                              -
                            </button>
                            <span className="w-12 text-center text-white font-medium">{item.cantidad}</span>
                            <button
                              onClick={() => actualizarCantidad(item.tipo, item.id, item.cantidad + 1)}
                              className="w-8 h-8 bg-zinc-700 hover:bg-zinc-600 rounded text-white"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-green-400 font-medium w-24 text-right">
                            ${(item.precio * item.cantidad).toLocaleString()}
                          </span>
                          <button
                            onClick={() => eliminarItem(item.tipo, item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vista de Servicios */}
            {vistaActual === 'servicios' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Servicios Disponibles</h4>
                {loadingData ? (
                  <div className="text-center py-8 text-zinc-400">Cargando servicios...</div>
                ) : serviciosDisponibles.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">No hay servicios disponibles</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {serviciosDisponibles.map(servicio => (
                      <div key={servicio.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-yellow-500 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-white">{servicio.nombre}</h5>
                          <span className="text-green-400 font-medium">${servicio.precio.toLocaleString()}</span>
                        </div>
                        {servicio.descripcion && (
                          <p className="text-sm text-zinc-400 mb-3">{servicio.descripcion}</p>
                        )}
                        <button
                          onClick={() => agregarItem('servicio', servicio.id, servicio.nombre, servicio.precio)}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vista de Productos */}
            {vistaActual === 'productos' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Productos Disponibles</h4>
                {loadingData ? (
                  <div className="text-center py-8 text-zinc-400">Cargando productos...</div>
                ) : productosDisponibles.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">No hay productos disponibles</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {productosDisponibles.map(producto => (
                      <div key={producto.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-yellow-500 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium text-white">{producto.nombre}</h5>
                            <p className="text-xs text-zinc-400">Stock: {producto.stock}</p>
                          </div>
                          <span className="text-green-400 font-medium">${producto.precio.toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => agregarItem('producto', producto.id, producto.nombre, producto.precio)}
                          disabled={producto.stock === 0}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            producto.stock === 0
                              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          }`}
                        >
                          {producto.stock === 0 ? 'Sin Stock' : 'Agregar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vista de Gorras */}
            {vistaActual === 'gorras' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Gorras Disponibles</h4>
                <p className="text-sm text-yellow-400 mb-3">
                  ⚠️ Las gorras se eliminarán de la galería automáticamente al completar la venta
                </p>
                {loadingData ? (
                  <div className="text-center py-8 text-zinc-400">Cargando gorras...</div>
                ) : gorrasDisponibles.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">No hay gorras disponibles</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {gorrasDisponibles.map(gorra => (
                      <div key={gorra.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-yellow-500 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-white">{gorra.nombre}</h5>
                          <span className="text-green-400 font-medium">${gorra.precio.toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => agregarItem('producto', gorra.id, gorra.nombre, gorra.precio)}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Método de Pago y Notas */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setMetodoPago(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notasVenta}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotasVenta(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Observaciones adicionales sobre la venta..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-zinc-800 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-zinc-300">Total:</span>
              <span className="text-3xl font-bold text-green-400">${calcularTotal().toLocaleString()}</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={finalizarVenta}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || itemsVenta.length === 0}
              >
                {loading ? 'Procesando...' : 'Finalizar Venta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalVentaMejorado;