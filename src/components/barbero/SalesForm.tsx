import React, { useState, useEffect } from 'react';

const SalesForm = ({ turn, onClose, onSuccess, barberoInfo }) => {
  const [productos, setProductos] = useState([]);
  const [gorras, setGorras] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [ventaItems, setVentaItems] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [propina, setPropina] = useState(0);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (turn) {
      fetchProductosYServicios();
      // Agregar automáticamente el servicio del turno
      const serviceId = turn.service?.id || turn.service_id;
      const serviceName = turn.service?.name || turn.service?.nombre || turn.service_name;
      const servicePrice = turn.service?.price || turn.service?.precio || turn.service_price || 0;
      
      if (serviceId && serviceName) {
        const servicioItem = {
          id: `service_${serviceId}`,
          tipo: 'servicio',
          servicio_id: serviceId,
          producto_id: null,
          nombre: serviceName,
          precio_unitario: parseFloat(servicePrice),
          cantidad: 1,
          subtotal: parseFloat(servicePrice)
        };
        setVentaItems(prev => {
          // Solo agregar si no existe ya
          const exists = prev.find(item => item.tipo === 'servicio' && item.servicio_id === serviceId);
          return exists ? prev : [...prev, servicioItem];
        });
      }
    }
  }, [turn]);

  const fetchProductosYServicios = async () => {
    try {
      const [productosRes, gorrasRes, serviciosRes] = await Promise.all([
        window.barberoAuthenticatedFetch(`${window.API_BASE_URL}/productos`),
        window.barberoAuthenticatedFetch(`${window.API_BASE_URL}/gorras`),
        window.barberoAuthenticatedFetch(`${window.API_BASE_URL}/servicios`)
      ]);
      
      // Procesar productos
      if (productosRes && productosRes.ok) {
        try {
          const productosData = await productosRes.json();
          let productosArray = [];
          
          if (Array.isArray(productosData)) {
            productosArray = productosData;
          } else if (productosData && productosData.data && Array.isArray(productosData.data)) {
            productosArray = productosData.data;
          } else if (productosData && typeof productosData === 'object') {
            productosArray = Object.values(productosData).filter(item => 
              item && typeof item === 'object' && item.id && item.nombre && item.precio !== undefined
            );
          }
          
          const validProductos = productosArray.filter(p => 
            p && p.id && p.nombre && p.precio !== undefined && p.activo && p.stock > 0
          );
          setProductos(validProductos);
        } catch (parseError) {
          console.error('Error parsing productos:', parseError);
          setProductos([]);
        }
      } else {
        setProductos([]);
      }
      
      // Procesar gorras
      if (gorrasRes && gorrasRes.ok) {
        try {
          const gorrasData = await gorrasRes.json();
          let gorrasArray = [];
          
          if (Array.isArray(gorrasData)) {
            gorrasArray = gorrasData;
          } else if (gorrasData && gorrasData.data && Array.isArray(gorrasData.data)) {
            gorrasArray = gorrasData.data;
          } else if (gorrasData && typeof gorrasData === 'object') {
            gorrasArray = Object.values(gorrasData).filter(item => 
              item && typeof item === 'object' && item.id && item.nombre && item.precio !== undefined
            );
          }
          
          const validGorras = gorrasArray.filter(g => 
            g && g.id && g.nombre && g.precio !== undefined && g.activo
          );
          setGorras(validGorras);
        } catch (parseError) {
          console.error('Error parsing gorras:', parseError);
          setGorras([]);
        }
      } else {
        setGorras([]);
      }
      
      // Procesar servicios
      if (serviciosRes && serviciosRes.ok) {
        try {
          const serviciosData = await serviciosRes.json();
          let serviciosArray = [];
          
          if (Array.isArray(serviciosData)) {
            serviciosArray = serviciosData;
          } else if (serviciosData && serviciosData.data && Array.isArray(serviciosData.data)) {
            serviciosArray = serviciosData.data;
          } else if (serviciosData && typeof serviciosData === 'object') {
            serviciosArray = Object.values(serviciosData).filter(item => 
              item && typeof item === 'object' && item.id && item.nombre && item.precio !== undefined
            );
          }
          
          const validServicios = serviciosArray.filter(s => 
            s && s.id && s.nombre && s.precio !== undefined && s.activo
          );
          setServicios(validServicios);
        } catch (parseError) {
          console.error('Error parsing servicios:', parseError);
          setServicios([]);
        }
      } else {
        setServicios([]);
      }
    } catch (error) {
      console.error('Error fetching productos, gorras y servicios:', error);
      setError('Error al cargar productos, gorras y servicios');
      setProductos([]);
      setGorras([]);
      setServicios([]);
    }
  };

  const agregarItem = (tipo, item) => {
    // Para gorras, no permitir agregar más de 1 ya que son únicas
    if (tipo === 'gorra') {
      const gorraExistente = ventaItems.find(vi => vi.tipo === 'gorra' && vi.gorra_id === item.id);
      if (gorraExistente) {
        setError('Esta gorra ya está en la venta. Las gorras son únicas.');
        return;
      }
    }
    
    const itemExistente = ventaItems.find(vi => {
      if (tipo === 'servicio') return vi.tipo === tipo && vi.servicio_id === item.id;
      if (tipo === 'producto') return vi.tipo === tipo && vi.producto_id === item.id;
      if (tipo === 'gorra') return vi.tipo === tipo && vi.gorra_id === item.id;
      return false;
    });
    
    if (itemExistente && tipo !== 'gorra') {
      actualizarCantidad(itemExistente.id, itemExistente.cantidad + 1);
    } else {
      const nuevoItem = {
        id: `${tipo}_${item.id}_${Date.now()}`,
        tipo,
        servicio_id: tipo === 'servicio' ? item.id : null,
        producto_id: tipo === 'producto' ? item.id : null,
        gorra_id: tipo === 'gorra' ? item.id : null,
        nombre: item.nombre,
        precio_unitario: parseFloat(item.precio),
        cantidad: 1,
        subtotal: parseFloat(item.precio)
      };
      setVentaItems([...ventaItems, nuevoItem]);
    }
    setError(''); // Limpiar errores
  };

  const actualizarCantidad = (itemId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarItem(itemId);
      return;
    }
    
    setVentaItems(ventaItems.map(item => {
      if (item.id === itemId) {
        // Las gorras no pueden cambiar de cantidad (son únicas)
        if (item.tipo === 'gorra') {
          setError('Las gorras son únicas, no se puede cambiar la cantidad.');
          return item;
        }
        
        return {
          ...item,
          cantidad: nuevaCantidad,
          subtotal: item.precio_unitario * nuevaCantidad
        };
      }
      return item;
    }));
  };

  const eliminarItem = (itemId) => {
    setVentaItems(ventaItems.filter(item => item.id !== itemId));
  };

  const calcularTotales = () => {
    const subtotal = ventaItems.reduce((sum, item) => sum + item.subtotal, 0);
    const descuentoAplicado = (subtotal * descuento) / 100;
    const propinaAplicada = parseFloat(propina) || 0; // Propina como cantidad fija
    const total = subtotal - descuentoAplicado + propinaAplicada;
    return { subtotal, descuentoAplicado, propinaAplicada, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (ventaItems.length === 0) {
      setError('Debe agregar al menos un item a la venta');
      return;
    }

    // Validaciones adicionales
    if (!turn || !turn.id) {
      setError('Error: No se encontró información del turno');
      return;
    }

    // Obtener barber_id del turn o del barberoInfo como fallback
    const barberId = turn.barber_id || barberoInfo?.id;
    if (!barberId) {
      setError('Error: No se encontró información del barbero');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { subtotal, total, propinaAplicada } = calcularTotales();
      
      // Validar que los totales sean válidos
      if (isNaN(subtotal) || isNaN(total) || subtotal < 0 || total < 0) {
        throw new Error('Error en el cálculo de totales');
      }
      
      // Validar items
      const validItems = ventaItems.filter(item => 
        item && item.tipo && item.cantidad > 0 && item.precio_unitario > 0
      );
      
      if (validItems.length === 0) {
        throw new Error('No hay items válidos en la venta');
      }
      
      const ventaData = {
        cliente_nombre: String(turn.client_name || turn.guest_name || 'Cliente').trim(),
        cliente_telefono: turn.client_phone ? String(turn.client_phone).trim() : null,
        barbero_id: parseInt(barberId),
        turn_id: parseInt(turn.id),
        subtotal: Math.round(subtotal * 100) / 100, // Redondear a 2 decimales
        descuento: Math.round(((subtotal * descuento) / 100) * 100) / 100,
        propina: Math.round((parseFloat(propina) || 0) * 100) / 100,
        total: Math.round(total * 100) / 100,
        metodo_pago: metodoPago,
        estado: 'completada',
        notas: notas ? String(notas).trim() : null,
        items: validItems.map(item => {
          const itemData = {
            tipo: item.tipo,
            cantidad: parseInt(item.cantidad),
            precio_unitario: Math.round(item.precio_unitario * 100) / 100
          };
          
          // Solo incluir el ID correspondiente según el tipo
          if (item.tipo === 'servicio' && item.servicio_id) {
            itemData.servicio_id = parseInt(item.servicio_id);
          } else if (item.tipo === 'producto' && item.producto_id) {
            itemData.producto_id = parseInt(item.producto_id);
          } else if (item.tipo === 'gorra' && item.gorra_id) {
            itemData.gorra_id = parseInt(item.gorra_id);
          }
          
          return itemData;
        })
      };

      console.log('Enviando venta:', ventaData);
      
      const response = await window.barberoAuthenticatedFetch(`${window.API_BASE_URL}/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ventaData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Venta creada:', result);
        onSuccess(result);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      setError(error.message || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, descuentoAplicado, propinaAplicada, total } = calcularTotales();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-0 sm:p-4">
      <div className="bg-gray-900 rounded-none sm:rounded-2xl w-full h-full sm:max-w-4xl sm:w-full sm:max-h-[90vh] overflow-hidden shadow-2xl border-0 sm:border border-gray-700 flex flex-col">
        {/* Header - Fijo */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 sm:p-6 text-white border-b border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">💰 Generar Venta</h2>
              <p className="text-gray-300 text-sm sm:text-base">
                Cliente: <span className="font-semibold text-white">{turn.client_name || turn.guest_name || 'Cliente'}</span>
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">
                Turno #{turn.queue_number} • {turn.service_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 p-2 rounded-xl transition-colors flex-shrink-0 touch-manipulation"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido central - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="pb-4">
            {/* Sección de agregar items */}
            <div className="p-3 sm:p-6 border-b border-gray-700 bg-gray-800">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-6">🛍️ Agregar Items</h3>
              
              {/* Servicios */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium text-gray-300 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Servicios
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 sm:max-h-40 overflow-y-auto">
                  {servicios.map(servicio => (
                    <button
                      key={servicio.id}
                      onClick={() => agregarItem('servicio', servicio)}
                      className="p-2 sm:p-3 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-blue-400 transition-colors text-left bg-gray-900 touch-manipulation min-h-0"
                    >
                      <div className="font-medium text-white text-sm sm:text-base truncate">{servicio.nombre}</div>
                      <div className="text-xs sm:text-sm text-gray-400">${servicio.precio}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Productos */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium text-gray-300 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9z" clipRule="evenodd" />
                  </svg>
                  Productos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 sm:max-h-40 overflow-y-auto">
                  {productos.filter(p => p.stock > 0).map(producto => (
                    <button
                      key={producto.id}
                      onClick={() => agregarItem('producto', producto)}
                      className="p-2 sm:p-3 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-green-400 transition-colors text-left bg-gray-900 touch-manipulation min-h-0"
                    >
                      <div className="font-medium text-white text-sm sm:text-base truncate">{producto.nombre}</div>
                      <div className="text-xs sm:text-sm text-gray-400">${producto.precio} • Stock: {producto.stock}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gorras */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-medium text-gray-300 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd" />
                  </svg>
                  Gorras
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 sm:max-h-40 overflow-y-auto">
                  {gorras.map(gorra => (
                    <button
                      key={gorra.id}
                      onClick={() => agregarItem('gorra', gorra)}
                      className="p-2 sm:p-3 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-purple-400 transition-colors text-left bg-gray-900 touch-manipulation min-h-0"
                    >
                      <div className="font-medium text-white text-sm sm:text-base truncate">{gorra.nombre}</div>
                      <div className="text-xs sm:text-sm text-gray-400">${gorra.precio} • Única</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumen de venta */}
            <div className="p-3 sm:p-6 bg-gray-900 pb-20 sm:pb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-6">🧾 Resumen de Venta</h3>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
                {/* Items de la venta */}
                <div className="flex-1 mb-4 sm:mb-6">
                  <h4 className="font-medium text-gray-300 mb-2 sm:mb-3 text-sm sm:text-base">Items seleccionados:</h4>
                  {ventaItems.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-gray-400">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-sm sm:text-base">No hay items en la venta</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-60 overflow-y-auto">
                      {ventaItems.map(item => (
                        <div key={item.id} className="bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-white text-sm sm:text-base">{item.nombre}</div>
                              <div className="text-xs sm:text-sm text-gray-400">
                                {item.tipo === 'servicio' ? '🔧 Servicio' : item.tipo === 'gorra' ? '🧢 Gorra' : '📦 Producto'} • ${item.precio_unitario}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => eliminarItem(item.id)}
                              className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/20 rounded transition-colors touch-manipulation"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {item.tipo === 'gorra' ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs sm:text-sm text-purple-400 font-medium">Única</span>
                                  <span className="w-6 sm:w-8 text-center font-medium text-white text-sm sm:text-base">{item.cantidad}</span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                    className="bg-gray-700 hover:bg-gray-600 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-sm sm:text-base touch-manipulation"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 sm:w-8 text-center font-medium text-white text-sm sm:text-base">{item.cantidad}</span>
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                    className="bg-gray-700 hover:bg-gray-600 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-sm sm:text-base touch-manipulation"
                                  >
                                    +
                                  </button>
                                </>
                              )}
                            </div>
                            <div className="font-semibold text-white text-sm sm:text-base">
                              ${item.subtotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Configuración de venta */}
                <div className="space-y-4 border-t border-gray-700 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        💳 Método de Pago
                      </label>
                      <select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-800 text-white text-base touch-manipulation"
                      >
                        <option value="efectivo">💵 Efectivo</option>
                        <option value="tarjeta">💳 Tarjeta</option>
                        <option value="transferencia">🏦 Transferencia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        🏷️ Descuento (%) - Opcional
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={descuento}
                        onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-800 text-white text-base touch-manipulation"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        💰 Propina ($) - Opcional
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={propina}
                        onChange={(e) => setPropina(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-800 text-white text-base touch-manipulation"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      📝 Notas (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-800 text-white text-base touch-manipulation resize-none"
                      placeholder="Notas adicionales..."
                    />
                  </div>

                  {/* Totales */}
                  <div className="bg-gray-800 p-3 sm:p-4 rounded-lg space-y-2 border border-gray-700">
                    <div className="flex justify-between text-xs sm:text-sm text-gray-300">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {descuentoAplicado > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-red-400">
                        <span>Descuento ({descuento}%):</span>
                        <span>-${descuentoAplicado.toFixed(2)}</span>
                      </div>
                    )}
                    {propinaAplicada > 0 && (
                       <div className="flex justify-between text-xs sm:text-sm text-green-400">
                         <span>Propina:</span>
                         <span>+${propinaAplicada.toFixed(2)}</span>
                       </div>
                     )}
                    <div className="flex justify-between text-base sm:text-lg font-bold border-t border-gray-600 pt-2">
                      <span className="text-white">Total:</span>
                      <span className="text-green-400">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}


                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Footer - Fijo con botones y total */}
        <div className="bg-gray-800 border-t border-gray-700 p-3 sm:p-4 flex-shrink-0">
          {/* Total */}
          <div className="bg-gray-900 p-3 rounded-lg mb-3 border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-white font-medium text-sm sm:text-base">Total:</span>
              <span className="text-green-400 font-bold text-lg sm:text-xl">${total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 sm:py-4 px-4 rounded-xl font-medium transition-colors text-base touch-manipulation"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || ventaItems.length === 0}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 sm:py-4 px-4 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-base touch-manipulation"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Completar Venta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesForm;