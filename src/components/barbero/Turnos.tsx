import React, { useState, useEffect } from 'react';

const formatAppointmentTime = (isoDate) => {
  if (!isoDate) return 'Sin hora';
  try {
    const formatter = new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Bogota'
    });
    return formatter.format(new Date(isoDate));
  } catch (error) {
    console.warn('Error formateando hora', error);
    return 'Sin hora';
  }
};

const Turnos = ({ barberoInfo, mostrarNotificacion }) => {
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]); // Siempre día actual
  const [appointments, setAppointments] = useState([]);
  const [walkIns, setWalkIns] = useState([]);
  const [currentlyServing, setCurrentlyServing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walkInName, setWalkInName] = useState('');
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [currentSaleClient, setCurrentSaleClient] = useState(null);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [ventaItems, setVentaItems] = useState([]);
  const [ventaTotal, setVentaTotal] = useState(0);

  useEffect(() => {
    if (barberoInfo?.id) {
      cargarDatosDia();
      cargarProductosYServicios();
      
      // Configurar polling automático cada 5 segundos para detectar nuevos clientes
      const interval = setInterval(() => {
        if (!showSaleForm) { // Solo actualizar si no está abierto el formulario de venta
          cargarDatosDia(false); // No mostrar loading en actualizaciones automáticas
        }
      }, 5000); // 5 segundos para mejor sincronización
      
      return () => clearInterval(interval);
    }
  }, [barberoInfo, showSaleForm]);

  const cargarProductosYServicios = async () => {
    try {
      const token = localStorage.getItem('barbero_token');
      
      // Cargar productos
      const productosResponse = await fetch(`${window.API_BASE_URL}/barbero/productos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (productosResponse.ok) {
        const productosData = await productosResponse.json();
        setProductos(productosData.data || []);
      }
      
      // Cargar servicios
      const serviciosResponse = await fetch(`${window.API_BASE_URL}/barbero/servicios`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (serviciosResponse.ok) {
        const serviciosData = await serviciosResponse.json();
        setServicios(serviciosData.data || []);
      }
    } catch (error) {
      console.error('Error al cargar productos y servicios:', error);
    }
  };

  const cargarDatosDia = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
      }
      
      // Cargar citas del barbero usando la función de API autenticada
      if (!barberoInfo?.id) {
        console.log('No hay información del barbero disponible aún');
        setAppointments([]);
        setWalkIns([]);
        setCurrentlyServing(null);
        if (showLoadingIndicator) {
          setLoading(false);
        }
        return;
      }

      const data = await window.getCitasByBarberoAndDate(barberoInfo.id, selectedDate);
      
      if (data && data.success) {
        // Separar citas programadas de walk-ins y encontrar cliente en progreso
        const todasLasCitas = data.data.filter(cita => 
          ['pendiente', 'confirmada', 'programada', 'en_progreso'].includes(cita.estado)
        );
        
        // Buscar cliente actualmente siendo atendido
        const clienteEnProgreso = todasLasCitas.find(cita => cita.estado === 'en_progreso');
        if (clienteEnProgreso) {
          setCurrentlyServing({
            id: clienteEnProgreso.id,
            cliente_nombre: clienteEnProgreso.cliente_nombre,
            name: clienteEnProgreso.cliente_nombre,
            tipo: clienteEnProgreso.tipo === 'walk-in' ? 'walkIn' : 'appointment'
          });
        } else {
          // Solo resetear cliente actual si no hay uno en progreso
          setCurrentlyServing(null);
        }
        
        // Filtrar solo las citas que no están en progreso para las listas
        const citasPendientes = todasLasCitas.filter(cita => cita.estado !== 'en_progreso');
          
        // Filtrar citas programadas (tienen fecha_hora específica y no son walk-ins)
        const citasProgramadas = citasPendientes.filter(cita => 
          cita.fecha_hora && cita.tipo !== 'walk-in'
        );
        
        // Filtrar walk-ins (marcados como walk-in en la base de datos)
        const walkInsFromDB = citasPendientes.filter(cita => 
          cita.tipo === 'walk-in'
        ).map(cita => ({
          id: cita.id,
          name: cita.cliente_nombre,
          cliente_nombre: cita.cliente_nombre,
          tipo: 'walk-in',
          original: cita
        }));
        
        setAppointments(citasProgramadas || []);
        setWalkIns(walkInsFromDB || []);
        
        console.log('Datos cargados:', {
          total: todasLasCitas.length,
          enProgreso: clienteEnProgreso ? 1 : 0,
          citasProgramadas: citasProgramadas.length,
          walkIns: walkInsFromDB.length
        });
        
      } else {
        mostrarNotificacion('Error al cargar citas', 'error');
        setAppointments([]);
        setWalkIns([]);
        setCurrentlyServing(null);
      }
      
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al cargar datos del día', 'error');
      setAppointments([]);
      setWalkIns([]);
      setCurrentlyServing(null);
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
    }
  };

  const agregarWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    
    const walkInData = {
      cliente_nombre: walkInName.trim(),
      cliente_telefono: '000-000-0000', // Teléfono por defecto para walk-ins
      cliente_email: null,
      barbero_id: barberoInfo.id,
      servicio_id: null // Será asignado automáticamente por el backend
    };
    
    try {
      const result = await window.addWalkInToQueue(walkInData);
      if (result && result.success) {
        setWalkInName('');
        mostrarNotificacion('Cliente agregado a la fila de espera', 'success');
        
        // Recargar datos para mostrar el nuevo cliente
        await cargarDatosDia();
      } else {
        mostrarNotificacion(result.message || 'Error al agregar cliente a la cola', 'error');
      }
    } catch (error) {
      console.error('Error al agregar walk-in:', error);
      mostrarNotificacion('Error al agregar cliente a la cola', 'error');
    }
  };

  const iniciarServicio = async (clienteId, tipo) => {
    if (currentlyServing) {
      mostrarNotificacion('Ya hay un cliente siendo atendido. Finaliza el servicio actual primero.', 'warning');
      return;
    }
    
    let cliente;
    if (tipo === 'appointment') {
      const index = appointments.findIndex(c => c.id === clienteId);
      if (index !== -1) {
        cliente = appointments[index];
        
        // Iniciar la cita usando la función de API
        try {
          const result = await window.updateCitaStatus(clienteId, 'en_progreso');
          if (!result || !result.success) {
            mostrarNotificacion('Error al iniciar la cita', 'error');
            return;
          }
        } catch (error) {
          console.error('Error:', error);
          mostrarNotificacion('Error al iniciar la cita', 'error');
          return;
        }
        
        setAppointments(prev => prev.filter(c => c.id !== clienteId));
      }
    } else {
      const index = walkIns.findIndex(c => c.id === clienteId);
      if (index !== -1) {
        cliente = walkIns[index];
        
        // Iniciar el servicio para walk-in
        try {
          const result = await window.updateCitaStatus(cliente.id, 'en_progreso');
          if (!result || !result.success) {
            mostrarNotificacion('Error al iniciar el servicio', 'error');
            return;
          }
        } catch (error) {
          console.error('Error:', error);
          mostrarNotificacion('Error al iniciar el servicio', 'error');
          return;
        }
        
        setWalkIns(prev => prev.filter(c => c.id !== clienteId));
      }
    }
    
    if (cliente) {
      setCurrentlyServing({ ...cliente, tipo });
      mostrarNotificacion(`Iniciando servicio para ${cliente.cliente_nombre || cliente.name}`, 'success');
    }
  };

  const finalizarServicio = async () => {
    if (!currentlyServing) {
      mostrarNotificacion('No hay ningún cliente siendo atendido.', 'warning');
      return;
    }
    
    try {
      // Finalizar el servicio actualizando el estado a completado
      const result = await window.updateCitaStatus(currentlyServing.id, 'completada');
      if (!result || !result.success) {
        mostrarNotificacion('Error al finalizar el servicio', 'error');
        return;
      }
      
      mostrarNotificacion(`Servicio finalizado para ${currentlyServing.cliente_nombre || currentlyServing.name}`, 'success');
      
      // Abrir formulario de venta automáticamente
      setShowSaleForm(true);
      setCurrentSaleClient(currentlyServing);
      
      setCurrentlyServing(null);
      
      // Recargar datos para actualizar la lista
      await cargarDatosDia();
      
      // Iniciar automáticamente el siguiente cliente después de un breve delay
      setTimeout(() => {
        iniciarSiguienteClienteAutomatico();
      }, 1000);
      
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al finalizar servicio', 'error');
    }
  };

  const iniciarSiguienteCliente = () => {
    if (currentlyServing) return;
    
    // Priorizar citas sobre walk-ins
    if (appointments.length > 0) {
      iniciarServicio(appointments[0].id, 'appointment');
    } else if (walkIns.length > 0) {
      iniciarServicio(walkIns[0].id, 'walkIn');
    }
  };

  const iniciarSiguienteClienteAutomatico = () => {
     if (currentlyServing || showSaleForm) return;
     
     // Priorizar citas sobre walk-ins
     if (appointments.length > 0) {
       iniciarServicio(appointments[0].id, 'appointment');
       mostrarNotificacion('Iniciando automáticamente siguiente cliente con cita', 'info');
     } else if (walkIns.length > 0) {
       iniciarServicio(walkIns[0].id, 'walkIn');
       mostrarNotificacion('Iniciando automáticamente siguiente cliente sin cita', 'info');
     }
   };

   const agregarItemVenta = (item, tipo) => {
     const nuevoItem = {
       id: Date.now(),
       tipo: tipo, // 'producto' o 'servicio'
       item_id: item.id,
       nombre: item.nombre,
       precio: parseFloat(item.precio),
       cantidad: 1
     };
     
     setVentaItems(prev => [...prev, nuevoItem]);
     calcularTotal([...ventaItems, nuevoItem]);
   };

   const eliminarItemVenta = (itemId) => {
     const nuevosItems = ventaItems.filter(item => item.id !== itemId);
     setVentaItems(nuevosItems);
     calcularTotal(nuevosItems);
   };

   const actualizarCantidadItem = (itemId, nuevaCantidad) => {
     if (nuevaCantidad <= 0) {
       eliminarItemVenta(itemId);
       return;
     }
     
     const nuevosItems = ventaItems.map(item => 
       item.id === itemId ? { ...item, cantidad: nuevaCantidad } : item
     );
     setVentaItems(nuevosItems);
     calcularTotal(nuevosItems);
   };

   const calcularTotal = (items) => {
     const total = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
     setVentaTotal(total);
   };

   const procesarVenta = async () => {
     if (ventaItems.length === 0) {
       mostrarNotificacion('Agregue al menos un item a la venta', 'warning');
       return;
     }

     try {
       const token = localStorage.getItem('barbero_token');
       const ventaData = {
         cliente_nombre: currentSaleClient?.cliente_nombre || currentSaleClient?.name || 'Cliente Walk-in',
         barbero_id: barberoInfo.id,
         cita_id: currentSaleClient?.tipo === 'appointment' ? currentSaleClient.id : null,
         items: ventaItems.map(item => ({
           tipo: item.tipo,
           item_id: item.item_id,
           cantidad: item.cantidad,
           precio_unitario: item.precio
         })),
         total: ventaTotal
       };

       const response = await fetch(`${window.API_BASE_URL}/barbero/ventas`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(ventaData)
       });

       if (response.ok) {
         mostrarNotificacion('Venta procesada exitosamente', 'success');
         cerrarFormularioVenta();
       } else {
         const errorData = await response.json();
         mostrarNotificacion(errorData.message || 'Error al procesar la venta', 'error');
       }
     } catch (error) {
       console.error('Error al procesar venta:', error);
       mostrarNotificacion('Error al procesar la venta', 'error');
     }
   };

   const cerrarFormularioVenta = () => {
     setShowSaleForm(false);
     setCurrentSaleClient(null);
     setVentaItems([]);
     setVentaTotal(0);
   };

  const hasWaitingClients = appointments.length > 0 || walkIns.length > 0;
  const isServingClient = currentlyServing !== null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando turnos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Título de la sección */}
      <div className="text-center px-2 sm:px-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
          Gestión de Turnos - {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h2>
        <p className="text-white/60 text-sm sm:text-base">Administra tus citas y clientes sin cita del día</p>
      </div>

      {/* Controles de gestión */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
        <button 
          onClick={iniciarSiguienteCliente}
          disabled={!hasWaitingClients || isServingClient}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2z"></path>
          </svg>
          Iniciar Corte
        </button>
        <button 
          onClick={finalizarServicio}
          disabled={!isServingClient}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Finalizar Servicio
        </button>
      </div>

      {/* Sección principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-0">
        {/* Cliente actual */}
        <div className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 via-yellow-700/10 to-yellow-800/20 rounded-2xl sm:rounded-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-2xl sm:rounded-3xl"></div>
          <div className="relative border-2 border-yellow-600/30 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl text-center flex flex-col justify-center items-center backdrop-blur-sm min-h-[150px] sm:min-h-[200px] group hover:border-yellow-500/50 transition-all duration-500">
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <p className="text-sm sm:text-lg md:text-xl font-semibold text-white/70 mb-2 tracking-wide uppercase">
              Atendiendo Ahora
            </p>
            <div className="relative">
              <h2 className="font-montserrat text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-white my-2 sm:my-4 break-words bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                {currentlyServing ? (currentlyServing.cliente_nombre || currentlyServing.name) : 'Nadie'}
              </h2>
              <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 w-16 sm:w-20 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full"></div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 text-white/50 text-xs sm:text-sm">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isServingClient ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span>{isServingClient ? 'En servicio' : 'Sin servicio'}</span>
            </div>
          </div>
        </div>
        
        {/* Formulario walk-in */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-2xl sm:rounded-3xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-zinc-700/50 backdrop-blur-sm shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-6 sm:h-6">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="m22 11 2 2-2 2"></path>
                  <path d="m16 11 2 2-2 2"></path>
                </svg>
              </div>
              <h2 className="font-montserrat text-lg sm:text-xl md:text-2xl font-bold mb-2 text-white">¿Sin cita?</h2>
              <p className="text-white/60 text-xs sm:text-sm">Únete a la fila de espera</p>
            </div>
            <form onSubmit={agregarWalkIn} className="space-y-3 sm:space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Escribe tu nombre completo"
                  className="w-full bg-zinc-800/50 border border-zinc-600/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm sm:text-base text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all duration-300 backdrop-blur-sm"
                />
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-yellow-500/10 to-transparent opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
              <button type="submit" className="group w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-yellow-500/25 relative overflow-hidden text-sm sm:text-base">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                  Entrar a la Fila
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Listas de clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-0">
        {/* Clientes con cita */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-800/5 rounded-2xl sm:rounded-3xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="font-montserrat text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 sm:gap-3 text-white">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                </div>
                Con Cita
              </h2>
              <div className="flex items-center gap-2 text-blue-400 text-xs sm:text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Programados</span>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3 min-h-[150px] sm:min-h-[200px]">
              {appointments.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-zinc-800/50 rounded-xl sm:rounded-2xl flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sm:w-8 sm:h-8 text-white/30">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8" x2="8" y1="2" y2="6"/>
                      <line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                  </div>
                  <p className="text-white/40 text-xs sm:text-sm">No hay citas programadas</p>
                </div>
              ) : (
                appointments.map((client, index) => (
                  <div key={client.id} className="group relative bg-gradient-to-r from-zinc-800/80 to-zinc-700/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-600/30 hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-blue-500/20">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white group-hover:text-blue-100 transition-colors text-sm sm:text-base truncate">{client.cliente_nombre}</p>
                          <p className="text-xs sm:text-sm text-white/60 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-3.5 sm:h-3.5 flex-shrink-0">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            <span className="truncate">{formatAppointmentTime(client.fecha_hora)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button 
                          onClick={() => iniciarServicio(client.id, 'appointment')}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-xs transition-colors flex-shrink-0"
                        >
                          Iniciar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Clientes sin cita */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-orange-800/5 rounded-2xl sm:rounded-3xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="font-montserrat text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 sm:gap-3 text-white">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="22" x2="16" y1="11" y2="13"/>
                    <line x1="16" x2="22" y1="11" y2="13"/>
                  </svg>
                </div>
                Sin Cita
              </h2>
              <div className="flex items-center gap-2 text-orange-400 text-xs sm:text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>En espera</span>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3 min-h-[150px] sm:min-h-[200px]">
              {walkIns.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-zinc-800/50 rounded-xl sm:rounded-2xl flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sm:w-8 sm:h-8 text-white/30">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="22" x2="16" y1="11" y2="13"/>
                      <line x1="16" x2="22" y1="11" y2="13"/>
                    </svg>
                  </div>
                  <p className="text-white/40 text-xs sm:text-sm">No hay clientes esperando</p>
                </div>
              ) : (
                walkIns.map((client, index) => (
                  <div key={client.id} className="group relative bg-gradient-to-r from-zinc-800/80 to-zinc-700/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-600/30 hover:border-orange-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-orange-500/20">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white group-hover:text-orange-100 transition-colors text-sm sm:text-base truncate">{client.name}</p>
                          <p className="text-xs sm:text-sm text-white/60 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-3.5 sm:h-3.5 flex-shrink-0">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                            </svg>
                            <span className="truncate">Sin cita</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button 
                          onClick={() => iniciarServicio(client.id, 'walkIn')}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-xs transition-colors flex-shrink-0"
                        >
                          Iniciar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Venta Modal */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 pb-20 sm:pb-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-zinc-700/50 shadow-2xl mb-16 sm:mb-0">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2 2v-6"></path>
                  </svg>
                </div>
                Procesar Venta
              </h2>
              <button 
                onClick={cerrarFormularioVenta}
                className="text-white/60 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-zinc-700/50 rounded-lg sm:rounded-xl"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-6 sm:h-6">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {/* Servicios */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4.5 sm:h-4.5">
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                  Servicios
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-32 sm:max-h-40 overflow-y-auto">
                  {servicios.map(servicio => (
                    <button
                      key={servicio.id}
                      onClick={() => agregarItemVenta(servicio, 'servicio')}
                      className="bg-zinc-800/50 hover:bg-zinc-700/50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-zinc-600/30 hover:border-blue-500/50 transition-all duration-300 text-left group"
                    >
                      <div className="font-semibold text-white group-hover:text-blue-300 transition-colors text-sm sm:text-base">{servicio.nombre}</div>
                      <div className="text-green-400 font-bold text-xs sm:text-sm">${servicio.precio}</div>
                    </button>
                  ))}
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4.5 sm:h-4.5">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2 2v-6"></path>
                  </svg>
                  Productos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-32 sm:max-h-40 overflow-y-auto">
                  {productos.map(producto => (
                    <button
                      key={producto.id}
                      onClick={() => agregarItemVenta(producto, 'producto')}
                      className="bg-zinc-800/50 hover:bg-zinc-700/50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-zinc-600/30 hover:border-green-500/50 transition-all duration-300 text-left group"
                    >
                      <div className="font-semibold text-white group-hover:text-green-300 transition-colors text-sm sm:text-base">{producto.nombre}</div>
                      <div className="text-green-400 font-bold text-xs sm:text-sm">${producto.precio}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items de la Venta */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4.5 sm:h-4.5">
                    <path d="M9 11H5a2 2 0 00-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7V9a2 2 0 012-2h2a2 2 0 012 2v2m0 0v7m0-7H9m12 0a2 2 0 00-2-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2c0 1.1.9 2 2 2h2"></path>
                  </svg>
                  Resumen de Venta
                </h3>
                <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-60 overflow-y-auto">
                  {ventaItems.length === 0 ? (
                    <p className="text-white/60 text-center py-6 sm:py-8 text-sm sm:text-base">No hay items seleccionados</p>
                  ) : (
                    ventaItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-zinc-700/30 p-2.5 sm:p-3 rounded-lg sm:rounded-xl">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white text-sm sm:text-base truncate">{item.nombre}</h4>
                          <p className="text-white/60 text-xs sm:text-sm">${item.precio} c/u</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 ml-2">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button 
                              onClick={() => actualizarCantidadItem(item.id, Math.max(1, item.cantidad - 1))}
                              className="w-6 h-6 sm:w-8 sm:h-8 bg-zinc-600 hover:bg-zinc-500 rounded-md sm:rounded-lg flex items-center justify-center text-white transition-colors text-sm sm:text-base"
                            >
                              -
                            </button>
                            <span className="w-6 sm:w-8 text-center text-white font-semibold text-sm sm:text-base">{item.cantidad}</span>
                            <button 
                              onClick={() => actualizarCantidadItem(item.id, item.cantidad + 1)}
                              className="w-6 h-6 sm:w-8 sm:h-8 bg-zinc-600 hover:bg-zinc-500 rounded-md sm:rounded-lg flex items-center justify-center text-white transition-colors text-sm sm:text-base"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-green-400 font-bold min-w-[50px] sm:min-w-[60px] text-right text-sm sm:text-base">${(item.precio * item.cantidad).toFixed(2)}</span>
                          <button 
                            onClick={() => eliminarItemVenta(item.id)}
                            className="text-red-400 hover:text-red-300 p-1 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-4 sm:h-4">
                              <polyline points="3,6 5,6 21,6"></polyline>
                              <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total y Botones */}
                <div className="border-t border-zinc-600/30 pt-3 sm:pt-4 mt-3 sm:mt-4">
                  <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <span className="text-lg sm:text-xl font-bold text-white">Total:</span>
                    <span className="text-xl sm:text-2xl font-bold text-green-400">${ventaTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                      onClick={cerrarFormularioVenta}
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={procesarVenta}
                      disabled={ventaItems.length === 0}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      Procesar Venta
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

export default Turnos;