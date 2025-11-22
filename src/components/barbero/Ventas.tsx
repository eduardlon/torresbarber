import React, { useState, useEffect } from 'react';
import { requestBarberoApi } from '../../utils/barbero-api-request';

interface VentasProps {
  barberoInfo: { id?: string | number; nombre?: string } | null;
  mostrarNotificacion: (mensaje: string, tipo?: 'success' | 'error' | 'warning' | 'info') => void;
}

const Ventas: React.FC<VentasProps> = ({ barberoInfo, mostrarNotificacion }) => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaVenta, setNuevaVenta] = useState<any>({
    cliente_nombre: '',
    servicios: [],
    productos: [],
    metodo_pago: 'efectivo',
    notas: '',
    total: 0
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    calcularTotal();
  }, [nuevaVenta.servicios, nuevaVenta.productos]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [ventasResponse, serviciosResponse, productosResponse] = await Promise.all([
        requestBarberoApi<{ ventas: any[] }>('/api/barbero/ventas'),
        requestBarberoApi<{ servicios: any[] }>('/api/barbero/servicios'),
        requestBarberoApi<{ productos: any[] }>('/api/barbero/productos?stock=true'),
      ]);

      setVentas(ventasResponse.ventas || []);
      setServicios(serviciosResponse.servicios || []);
      setProductos(productosResponse.productos || []);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error instanceof Error ? error.message : 'Error al cargar datos', 'error');
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotal = () => {
    const totalServicios = nuevaVenta.servicios.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalProductos = nuevaVenta.productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    setNuevaVenta(prev => ({ ...prev, total: totalServicios + totalProductos }));
  };

  const agregarServicio = (servicio) => {
    const existente = nuevaVenta.servicios.find(s => s.id === servicio.id);
    if (existente) {
      setNuevaVenta(prev => ({
        ...prev,
        servicios: prev.servicios.map(s => 
          s.id === servicio.id ? { ...s, cantidad: s.cantidad + 1 } : s
        )
      }));
    } else {
      setNuevaVenta(prev => ({
        ...prev,
        servicios: [...prev.servicios, { ...servicio, cantidad: 1 }]
      }));
    }
  };

  const agregarProducto = (producto) => {
    const stockDisponible = producto.stock_actual || producto.stock || 0;
    
    if (stockDisponible <= 0) {
      mostrarNotificacion('Producto sin stock', 'warning');
      return;
    }

    const existente = nuevaVenta.productos.find(p => p.id === producto.id);
    if (existente) {
      if (existente.cantidad >= stockDisponible) {
        mostrarNotificacion('Stock insuficiente', 'warning');
        return;
      }
      setNuevaVenta(prev => ({
        ...prev,
        productos: prev.productos.map(p => 
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        )
      }));
    } else {
      setNuevaVenta(prev => ({
        ...prev,
        productos: [...prev.productos, { ...producto, cantidad: 1 }]
      }));
    }
  };

  const removerItem = (tipo, id) => {
    if (tipo === 'servicio') {
      setNuevaVenta(prev => ({
        ...prev,
        servicios: prev.servicios.filter(s => s.id !== id)
      }));
    } else {
      setNuevaVenta(prev => ({
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
      setNuevaVenta(prev => ({
        ...prev,
        servicios: prev.servicios.map(s => 
          s.id === id ? { ...s, cantidad: nuevaCantidad } : s
        )
      }));
    } else {
      const producto = productos.find(p => p.id === id);
      const stockDisponible = producto?.stock_actual || producto?.stock || 0;
      if (nuevaCantidad > stockDisponible) {
        mostrarNotificacion('Stock insuficiente', 'warning');
        return;
      }
      setNuevaVenta(prev => ({
        ...prev,
        productos: prev.productos.map(p => 
          p.id === id ? { ...p, cantidad: nuevaCantidad } : p
        )
      }));
    }
  };

  const completarVenta = async () => {
    if (!nuevaVenta.cliente_nombre.trim()) {
      mostrarNotificacion('Debe ingresar el nombre del cliente', 'warning');
      return;
    }

    if (nuevaVenta.servicios.length === 0 && nuevaVenta.productos.length === 0) {
      mostrarNotificacion('Debe agregar al menos un servicio o producto', 'warning');
      return;
    }

    try {
      await requestBarberoApi<{ venta: any }>('/api/barbero/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaVenta),
      });

      mostrarNotificacion('Venta registrada exitosamente', 'success');
      setMostrarFormulario(false);
      setNuevaVenta({
        cliente_nombre: '',
        servicios: [],
        productos: [],
        metodo_pago: 'efectivo',
        notas: '',
        total: 0
      });
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error instanceof Error ? error.message : 'Error al registrar venta', 'error');
    }
  };

  const ventasFiltradas = ventas.filter(venta => {
    // Filtrar por método de pago
    if (filtroMetodo !== 'todos' && venta.metodo_pago !== filtroMetodo) {
      return false;
    }
    
    // Solo mostrar ventas completadas (no canceladas o rechazadas)
    if (venta.estado && venta.estado !== 'completed') {
      return false;
    }
    
    return true;
  });

  const totalVentas = ventasFiltradas.reduce((sum, venta) => sum + venta.total, 0);

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <div className="space-y-6">
      {/* Header y Filtros */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Mis Ventas</h2>
            <p className="text-zinc-400">Historial de ventas realizadas por {barberoInfo?.nombre || 'ti'}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => setMostrarFormulario(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Nueva Venta
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Filtrar por Método de Pago</label>
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="todos">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3 w-full">
              <p className="text-green-300 text-sm font-medium">Total de Ventas</p>
              <p className="text-white text-lg font-bold">{formatearMoneda(totalVentas)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Ventas */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Historial de Ventas</h3>
        
        {ventasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay ventas</h3>
            <p className="text-zinc-400">No se encontraron ventas para el período seleccionado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ventasFiltradas.map((venta) => (
              <div key={venta.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{venta.cliente_nombre}</h3>
                        <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-zinc-400">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            {formatearFecha(venta.created_at)}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                            </svg>
                            {venta.metodo_pago}
                          </span>
                        </div>
                        
                        {/* Detalles de la venta */}
                        <div className="mt-3 space-y-1">
                          {venta.servicios && venta.servicios.length > 0 && (
                            <div className="text-sm">
                              <span className="text-blue-300 font-medium">Servicios: </span>
                              <span className="text-zinc-300">
                                {venta.servicios.map(s => `${s.nombre} (${s.cantidad})`).join(', ')}
                              </span>
                            </div>
                          )}
                          {venta.productos && venta.productos.length > 0 && (
                            <div className="text-sm">
                              <span className="text-green-300 font-medium">Productos: </span>
                              <span className="text-zinc-300">
                                {venta.productos.map(p => `${p.nombre} (${p.cantidad})`).join(', ')}
                              </span>
                            </div>
                          )}
                          {venta.notas && (
                            <div className="text-sm">
                              <span className="text-yellow-300 font-medium">Notas: </span>
                              <span className="text-zinc-300">{venta.notas}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-300">{formatearMoneda(venta.total)}</div>
                    <div className="text-sm text-zinc-400">#{venta.id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Venta */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Nueva Venta</h2>
                <p className="text-zinc-400">Registra una venta manual</p>
              </div>
              <button
                onClick={() => setMostrarFormulario(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Servicios y Productos */}
              <div className="lg:col-span-1">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={nuevaVenta.cliente_nombre}
                    onChange={(e) => setNuevaVenta(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                    placeholder="Ingrese el nombre del cliente"
                    className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                <h3 className="text-lg font-semibold text-white mb-4">Servicios</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-6">
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

                <h3 className="text-lg font-semibold text-white mb-4">Productos</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {productos.map((producto) => (
                    <div key={producto.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{producto.nombre}</p>
                        <p className="text-zinc-400 text-sm">
                          {formatearMoneda(producto.precio)} (Stock: {producto.stock_actual || producto.stock || 0})
                        </p>
                      </div>
                      <button
                        onClick={() => agregarProducto(producto)}
                        disabled={(producto.stock_actual || producto.stock || 0) <= 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Resumen de Venta</h3>
                
                {/* Items seleccionados */}
                <div className="space-y-4 mb-6">
                  {nuevaVenta.servicios.map((servicio) => (
                    <div key={servicio.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{servicio.nombre}</p>
                        <p className="text-blue-300 text-sm">Servicio - {formatearMoneda(servicio.precio)} c/u</p>
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
                        <span className="text-blue-300 font-medium w-20 text-right">
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
                  
                  {nuevaVenta.productos.map((producto) => (
                    <div key={producto.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{producto.nombre}</p>
                        <p className="text-green-300 text-sm">Producto - {formatearMoneda(producto.precio)} c/u</p>
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

                {/* Método de pago y notas */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Método de Pago</label>
                    <select
                      value={nuevaVenta.metodo_pago}
                      onChange={(e) => setNuevaVenta(prev => ({ ...prev, metodo_pago: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Notas</label>
                    <input
                      type="text"
                      value={nuevaVenta.notas}
                      onChange={(e) => setNuevaVenta(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Observaciones..."
                      className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Total y acciones */}
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-white">Total:</span>
                    <span className="text-2xl font-bold text-green-300">{formatearMoneda(nuevaVenta.total)}</span>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setMostrarFormulario(false)}
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={completarVenta}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Registrar Venta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;