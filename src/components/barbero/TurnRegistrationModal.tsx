import React, { useState, useEffect } from 'react';
import { Search, User, UserPlus, Scissors, Clock, DollarSign, CheckCircle, ArrowRight, ArrowLeft, X, AlertCircle } from 'lucide-react';

const TurnRegistrationModal = ({ barberoId, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Client search and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  
  // Guest client data
  const [guestData, setGuestData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  // Service selection
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  
  // Notes
  const [notes, setNotes] = useState('');
  const [lineOptions, setLineOptions] = useState({
    type: 'none', // 'none', 'head', 'eyebrow', 'both'
    side: 'both' // 'left', 'right', 'both'
  });
  
  // Modal de notificación personalizada
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  useEffect(() => {
    fetchServices();
    
    // Ocultar la barra de navegación cuando el modal esté abierto
    if (typeof document !== 'undefined') {
      document.body.classList.add('modal-open');
    }
    
    // Cleanup: mostrar la barra de navegación cuando el modal se cierre
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('modal-open');
      }
    };
  }, []);

  // Manejador global para errores de extensiones del navegador
  useEffect(() => {
    const handleError = (event) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('message channel closed') ||
           event.error.message.includes('listener indicated an asynchronous response'))) {
        console.warn('Browser extension error ignored:', event.error.message);
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event) => {
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('message channel closed') ||
           event.reason.message.includes('listener indicated an asynchronous response'))) {
        console.warn('Browser extension promise rejection ignored:', event.reason.message);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const fetchServices = async () => {
    try {
      const data = await window.getServicios();
      if (data) {
        setServices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const searchClients = async (term) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      // Buscar en clientes registrados
      const clientesResponse = await fetch(`${window.API_BASE_URL}/v2/clientes/search?q=${encodeURIComponent(term)}`, {
        headers: {
          'Authorization': `Bearer ${window.getBarberoAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Buscar en invitados
      const invitadosResponse = await fetch(`${window.API_BASE_URL}/v2/invitados/search?q=${encodeURIComponent(term)}`, {
        headers: {
          'Authorization': `Bearer ${window.getBarberoAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      const clientesData = clientesResponse.ok ? await clientesResponse.json() : { data: [] };
      const invitadosData = invitadosResponse.ok ? await invitadosResponse.json() : { data: [] };
      
      // Filtrar resultados para que coincidan exactamente con el término de búsqueda
      const termLower = term.toLowerCase();
      
      const clientes = (clientesData.data || [])
        .filter(cliente => {
          const nombre = (cliente.nombre || cliente.name || '').toLowerCase();
          const telefono = (cliente.telefono || cliente.phone || '').toLowerCase();
          return nombre.includes(termLower) || telefono.includes(termLower);
        })
        .map(cliente => ({
          ...cliente,
          client_type: 'cliente',
          nombre: cliente.nombre || cliente.name,
          telefono: cliente.telefono || cliente.phone
        }));
      
      const invitados = (invitadosData.data || [])
        .filter(invitado => {
          const nombre = (invitado.nombre || invitado.name || '').toLowerCase();
          const telefono = (invitado.telefono || invitado.phone || '').toLowerCase();
          return nombre.includes(termLower) || telefono.includes(termLower);
        })
        .map(invitado => ({
          ...invitado,
          client_type: 'invitado',
          nombre: invitado.nombre || invitado.name,
          telefono: invitado.telefono || invitado.phone
        }));
      
      // Ordenar resultados por relevancia (coincidencias exactas primero)
      const allResults = [...clientes, ...invitados].sort((a, b) => {
        const aName = (a.nombre || '').toLowerCase();
        const bName = (b.nombre || '').toLowerCase();
        const aStartsWith = aName.startsWith(termLower);
        const bStartsWith = bName.startsWith(termLower);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return aName.localeCompare(bName);
      });
      
      setSearchResults(allResults);
    } catch (error) {
      console.error('Error searching clients:', error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchClients(value);
  };

  const selectClient = async (client) => {
    console.log('Cliente seleccionado:', client);
    
    // Verificar si el cliente ya está en la cola
    try {
      const checkUrl = client.client_type === 'cliente' 
        ? `${window.API_BASE_URL}/v2/barber/${barberoId}/queue/check-client/${client.id}`
        : `${window.API_BASE_URL}/v2/barber/${barberoId}/queue/check-guest/${client.invitado_id || client.id}`;
      
      const response = await fetch(checkUrl, {
        headers: {
          'Authorization': `Bearer ${window.getBarberoAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.in_queue) {
          const clientType = client.client_type === 'cliente' ? 'cliente' : 'invitado';
          const turnInfo = data.data?.turn || {};
          const turnNumber = turnInfo.turn_number || 'N/A';
          const statusText = turnInfo.status_text || data.status_text || 'en cola';
          const serviceName = turnInfo.service_name || 'N/A';
          const barberName = turnInfo.barber_name || 'N/A';
          
          const message = `Este ${clientType} ya está en la cola:\n\nTurno #${turnNumber}\nEstado: ${statusText}\nServicio: ${serviceName}\nBarbero: ${barberName}`;
          
          if (window.mostrarNotificacion) {
            window.mostrarNotificacion(message, 'warning');
          } else {
            alert(message);
          }
          setError(`El ${clientType} ya está ${statusText}. No se puede seleccionar.`);
          return;
        }
      }
    } catch (error) {
      console.warn('Error verificando estado del cliente:', error);
      // Continuar con la selección si hay error en la verificación
    }
    
    setSelectedClient(client);
    setSearchTerm(client.nombre || client.name);
    setSearchResults([]);
    setIsGuest(false);
    setError(null);
    // Limpiar datos de invitado cuando se selecciona un cliente registrado
    setGuestData({ name: '', phone: '', email: '' });
  };

  const selectGuestOption = () => {
    console.log('Seleccionando opción de invitado');
    setIsGuest(true);
    setSelectedClient(null);
    setSearchTerm('');
    setSearchResults([]);
    // Limpiar datos de invitado para empezar fresh
    setGuestData({ name: '', phone: '', email: '' });
  };

  const toggleClientType = () => {
    if (isGuest) {
      // Cambiar a cliente registrado
      setIsGuest(false);
      setGuestData({ name: '', phone: '', email: '' });
      setSearchTerm('');
      setSelectedClient(null);
      setSearchResults([]);
    } else {
      // Cambiar a cliente invitado
      setIsGuest(true);
      setSelectedClient(null);
      setSearchTerm('');
      setSearchResults([]);
      setGuestData({ name: '', phone: '', email: '' });
    }
  };

  const handleGuestDataChange = (field, value) => {
    setGuestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePhoneNumber = async (phone) => {
    if (!phone || phone.trim() === '') return null;
    
    try {
      // Buscar en clientes registrados
      const clientesResponse = await fetch(`${window.API_BASE_URL}/v2/clientes/search?q=${encodeURIComponent(phone)}`, {
        headers: {
          'Authorization': `Bearer ${window.getBarberoAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Buscar en invitados
      const invitadosResponse = await fetch(`${window.API_BASE_URL}/v2/invitados/search?q=${encodeURIComponent(phone)}`, {
        headers: {
          'Authorization': `Bearer ${window.getBarberoAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      const clientesData = clientesResponse.ok ? await clientesResponse.json() : { data: [] };
      const invitadosData = invitadosResponse.ok ? await invitadosResponse.json() : { data: [] };
      
      // Buscar coincidencias exactas de teléfono
      const phoneMatch = phone.trim();
      
      const clienteMatch = (clientesData.data || []).find(cliente => 
        (cliente.telefono || cliente.phone || '').trim() === phoneMatch
      );
      
      const invitadoMatch = (invitadosData.data || []).find(invitado => 
        (invitado.telefono || invitado.phone || '').trim() === phoneMatch
      );
      
      if (clienteMatch) {
        return {
          type: 'cliente',
          data: {
            ...clienteMatch,
            nombre: clienteMatch.nombre || clienteMatch.name,
            telefono: clienteMatch.telefono || clienteMatch.phone
          }
        };
      }
      
      if (invitadoMatch) {
        return {
          type: 'invitado',
          data: {
            ...invitadoMatch,
            nombre: invitadoMatch.nombre || invitadoMatch.name,
            telefono: invitadoMatch.telefono || invitadoMatch.phone
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error validating phone number:', error);
      return null;
    }
  };

  const canProceedToStep2 = () => {
    if (isGuest) {
      return guestData.name.trim() !== '';
    }
    return selectedClient !== null;
  };
  
  const handleNextStep = async () => {
    if (step === 1 && isGuest && guestData.phone.trim() !== '') {
      // Validar teléfono duplicado para invitados
      const duplicateResult = await validatePhoneNumber(guestData.phone);
      if (duplicateResult) {
        setDuplicateData(duplicateResult);
        setShowDuplicateModal(true);
        return;
      }
    }
    setStep(step + 1);
  };

  const canProceedToStep3 = () => {
    return selectedService !== null;
  };



  const handleCreateTurn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Debug logs
      console.log('Estado actual del modal:');
      console.log('- isGuest:', isGuest);
      console.log('- selectedClient:', selectedClient);
      console.log('- guestData:', guestData);
      console.log('- selectedService:', selectedService);
      
      // Validaciones antes de enviar
      if (isGuest) {
        if (!guestData.name || !guestData.name.trim()) {
          throw new Error('El nombre del cliente invitado es requerido');
        }
      } else {
        if (!selectedClient) {
          throw new Error('Debe seleccionar un cliente de la lista');
        }
        // Verificar que el cliente tenga un ID válido
        const clientId = selectedClient.id;
        console.log('Verificando ID del cliente:', clientId, 'Tipo:', typeof clientId, 'Client type:', selectedClient.client_type);
        
        if (!clientId) {
          console.error('Cliente seleccionado sin ID:', selectedClient);
          throw new Error('El cliente seleccionado no tiene un ID válido. Por favor, seleccione otro cliente.');
        }
        
        const parsedClientId = parseInt(clientId);
        if (isNaN(parsedClientId) || parsedClientId <= 0) {
          console.error('ID de cliente no válido:', clientId, 'Parsed:', parsedClientId);
          throw new Error('El ID del cliente no es válido. Por favor, seleccione otro cliente.');
        }
      }
      
      if (!selectedService || !selectedService.id) {
        throw new Error('Debe seleccionar un servicio');
      }
      
      // Construir notas completas incluyendo opciones de rayitas
      let completeNotes = notes.trim();
      if (lineOptions.type !== 'none') {
        const lineType = lineOptions.type === 'head' ? 'cabeza' : 
                        lineOptions.type === 'eyebrow' ? 'ceja' : 'cabeza y ceja';
        const lineSide = lineOptions.side === 'left' ? 'izquierdo' : 
                        lineOptions.side === 'right' ? 'derecho' : 'ambos lados';
        const lineNote = `Rayitas en ${lineType} - ${lineSide}`;
        completeNotes = completeNotes ? `${completeNotes}\n\n${lineNote}` : lineNote;
      }
      
      const turnData = {
        barber_id: parseInt(barberoId),
        service_id: parseInt(selectedService.id),
        type: 'sin_cita',
        notes: completeNotes || null,
        line_options: lineOptions.type !== 'none' ? lineOptions : null
      };
      
      if (isGuest) {
        // Crear nuevo invitado
        turnData.client_type = 'invitado';
        turnData.invitado_data = {
          nombre: guestData.name.trim(),
          telefono: guestData.phone.trim() || null,
          email: guestData.email.trim() || null
        };
        console.log('Creando nuevo invitado:', turnData.invitado_data);
      } else {
        // Cliente existente (registrado o invitado)
        const clientId = parseInt(selectedClient.id);
        turnData.client_type = selectedClient.client_type;
        
        if (selectedClient.client_type === 'cliente') {
          turnData.cliente_id = clientId;
          console.log('Agregando cliente_id:', clientId);
        } else {
          // Para invitados existentes, usar el invitado_id real
          const invitadoId = selectedClient.invitado_id || clientId;
          turnData.invitado_id = parseInt(invitadoId);
          console.log('Agregando invitado_id:', invitadoId);
        }
      }
      
      console.log('Datos finales del turno:', turnData);
      
      // Crear turno usando la nueva API
      const response = await fetch(`${window.API_BASE_URL}/v2/turns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.getBarberoAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(turnData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Manejar específicamente el error 409 (cliente ya en cola)
        if (response.status === 409) {
          const statusText = errorData.existing_turn?.status_text || 'en cola';
          const message = `El cliente ya está ${statusText}. No se puede agregar nuevamente a la cola.`;
          
          if (window.mostrarNotificacion) {
            window.mostrarNotificacion(message, 'warning');
          }
          setError(message);
          return;
        }
        
        throw new Error(errorData.message || 'Error al crear el turno');
      }
      
      const result = await response.json();
      
      if (result.success !== false) {
        // Mostrar notificación de éxito
        if (window.mostrarNotificacion) {
          window.mostrarNotificacion('¡Turno creado exitosamente!', 'success');
        }
        
        // Cerrar modal y actualizar lista
        onSuccess();
      } else {
        throw new Error(result.message || 'Error al crear el turno');
      }
    } catch (err) {
      console.error('Error al crear turno:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Header moderno */}
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl rotate-6 opacity-20"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-4">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Seleccionar Cliente</h3>
        <p className="text-gray-300">Busca un cliente existente o crea uno nuevo</p>
        
        {/* Botones de cambio de tipo de cliente */}
        <div className="flex bg-gray-800/20 rounded-xl p-1 mt-4 max-w-sm mx-auto">
          <button
            onClick={() => {
              if (isGuest) {
                setIsGuest(false);
                setGuestData({ name: '', phone: '', email: '' });
                setSearchTerm('');
                setSelectedClient(null);
                setSearchResults([]);
              }
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              !isGuest 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Cliente Registrado
          </button>
          <button
            onClick={() => {
              if (!isGuest) {
                setIsGuest(true);
                setSelectedClient(null);
                setSearchTerm('');
                setSearchResults([]);
                setGuestData({ name: '', phone: '', email: '' });
              }
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isGuest 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Cliente Invitado
          </button>
        </div>
      </div>
      
      {/* Grid de opciones de cliente con diseño moderno */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {/* Buscar cliente existente */}
        <div className={`relative group transition-all duration-300 ${
          !isGuest ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
        }`}>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-gray-600/30 h-full">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${
                !isGuest ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="font-semibold text-sm sm:text-base text-white">Cliente Registrado</h4>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Buscar por nombre, teléfono..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-700/50 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-white placeholder-gray-400"
                disabled={isGuest}
              />
              
              {searchResults.length > 0 && !isGuest && (
                <div className="bg-gray-700/50 rounded-lg sm:rounded-xl border border-gray-600 max-h-40 sm:max-h-64 md:max-h-80 lg:max-h-96 overflow-y-auto">
                  {searchResults.map((client, index) => (
                    <button
                      key={client.id || `client-${index}`}
                      onClick={() => selectClient(client)}
                      className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-blue-600/20 border-b border-gray-600 last:border-b-0 transition-all duration-200 first:rounded-t-lg first:sm:rounded-t-xl last:rounded-b-lg last:sm:rounded-b-xl"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className={`rounded-full p-1.5 sm:p-2 ${
                          client.client_type === 'cliente' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          <User className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            client.client_type === 'cliente' ? 'text-blue-600' : 'text-purple-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="font-medium text-sm sm:text-base text-white">{client.nombre || client.name}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              client.client_type === 'cliente' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {client.client_type === 'cliente' ? 'Registrado' : 'Invitado'}
                            </span>
                          </div>
                          {client.telefono && (
                            <div className="text-xs sm:text-sm text-gray-300">{client.telefono}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {selectedClient && !isGuest && (
                <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm sm:text-base text-green-900">{selectedClient.nombre || selectedClient.name}</p>
                        <p className="text-xs sm:text-sm text-green-700">Cliente seleccionado</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClient(null);
                        setSearchTerm('');
                        setSearchResults([]);
                        setError(null);
                      }}
                      className="group p-1.5 rounded-full hover:bg-red-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      title="Deseleccionar cliente"
                    >
                      <svg 
                        className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors duration-200" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Cliente invitado */}
        <div className={`relative group transition-all duration-300 ${
          isGuest ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:shadow-lg'
        }`}>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-gray-600/30 h-full">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${
                isGuest ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="font-semibold text-sm sm:text-base text-white">Cliente Invitado</h4>
            </div>
            
            <button
              onClick={selectGuestOption}
              className={`w-full p-3 sm:p-4 border-2 border-dashed rounded-lg sm:rounded-xl transition-all duration-200 mb-3 sm:mb-4 ${
                isGuest 
                  ? 'border-purple-500 bg-purple-50 text-purple-700' 
                  : 'border-gray-300 hover:border-purple-400 text-gray-600 hover:bg-purple-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">Crear cliente temporal</span>
              </div>
            </button>
            
            {isGuest && (
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={guestData.name}
                    onChange={(e) => handleGuestDataChange('name', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-700/50 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={guestData.phone}
                    onChange={(e) => handleGuestDataChange('phone', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-700/50 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="Número de teléfono"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={guestData.email}
                    onChange={(e) => handleGuestDataChange('email', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-700/50 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="Correo electrónico"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Header moderno */}
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl rotate-6 opacity-20"></div>
          <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4">
            <Scissors className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Seleccionar Servicio</h3>
        <p className="text-gray-300">Elige el servicio que deseas ofrecer al cliente</p>
      </div>
      
      {/* Grid de servicios */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => setSelectedService(service)}
            className={`group cursor-pointer transition-all duration-300 rounded-xl sm:rounded-2xl border-2 overflow-hidden ${
              selectedService?.id === service.id
                ? 'border-emerald-500 bg-emerald-900/20 shadow-lg scale-[1.02]'
                : 'border-gray-600 hover:border-emerald-400 hover:shadow-md hover:scale-[1.01] bg-gray-800/50'
            }`}
          >
            <div className="p-3 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                      selectedService?.id === service.id 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                    }`}>
                      <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h4 className="font-bold text-base sm:text-lg text-white">{service.nombre}</h4>
                  </div>
                  
                  <div className="flex items-center space-x-3 sm:space-x-6 mb-2 sm:mb-3">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Clock className={`w-3 h-3 sm:w-4 sm:h-4 ${
                        selectedService?.id === service.id ? 'text-emerald-600' : 'text-gray-500'
                      }`} />
                      <span className="text-xs sm:text-sm font-medium text-gray-300">
                        {service.duracion_estimada} min
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <DollarSign className={`w-3 h-3 sm:w-4 sm:h-4 ${
                        selectedService?.id === service.id ? 'text-emerald-600' : 'text-gray-500'
                      }`} />
                      <span className="text-base sm:text-lg font-bold text-emerald-600">
                        ${service.precio}
                      </span>
                    </div>
                  </div>
                  
                  {service.descripcion && (
                    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                      {service.descripcion}
                    </p>
                  )}
                </div>
                
                <div className={`ml-2 sm:ml-4 transition-all duration-200 ${
                  selectedService?.id === service.id ? 'scale-110' : 'scale-0'
                }`}>
                  <div className="bg-emerald-500 rounded-full p-1.5 sm:p-2">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Indicador de selección */}
              <div className={`mt-2 sm:mt-4 h-0.5 sm:h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ${
                selectedService?.id === service.id ? 'opacity-100' : 'opacity-0'
              }`}></div>
            </div>
          </div>
        ))}
      </div>
      
      {services.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="bg-gray-700 rounded-full p-3 sm:p-4 inline-block mb-3 sm:mb-4">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm sm:text-base">No hay servicios disponibles</p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Header moderno */}
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl rotate-6 opacity-20"></div>
          <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Confirmar Turno</h3>
        <p className="text-gray-300">Revisa los detalles antes de confirmar la reserva</p>
      </div>
      
      {/* Resumen del turno */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl sm:rounded-2xl border border-gray-600 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-3 sm:px-6 py-3 sm:py-4">
          <h4 className="text-white font-bold text-base sm:text-lg flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Resumen del Turno
          </h4>
        </div>
        
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
          {/* Información del cliente */}
          <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-600 shadow-sm">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="bg-blue-100 rounded-lg sm:rounded-xl p-2 sm:p-3">
                <User className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm sm:text-base text-white mb-1">Cliente</h5>
                <p className="text-base sm:text-lg text-gray-200 font-medium">
                  {isGuest ? guestData.name : (selectedClient?.nombre || selectedClient?.name)}
                </p>
                {(isGuest ? guestData.phone : selectedClient?.telefono) && (
                  <div className="flex items-center space-x-1 sm:space-x-2 mt-1 sm:mt-2">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-xs sm:text-sm text-gray-300">
                      {isGuest ? guestData.phone : selectedClient?.telefono}
                    </span>
                  </div>
                )}
                {(isGuest ? guestData.email : selectedClient?.email) && (
                  <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs sm:text-sm text-gray-300">
                      {isGuest ? guestData.email : selectedClient?.email}
                    </span>
                  </div>
                )}
                {isGuest && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mt-1 sm:mt-2">
                    <UserPlus className="w-3 h-3 mr-1" />
                    Cliente Invitado
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Información del servicio */}
          <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-600 shadow-sm">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="bg-emerald-100 rounded-lg sm:rounded-xl p-2 sm:p-3">
                <Scissors className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm sm:text-base text-white mb-1">Servicio</h5>
                <p className="text-base sm:text-lg text-gray-200 font-medium mb-2 sm:mb-3">{selectedService?.nombre}</p>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    <span className="text-xs sm:text-sm text-gray-300">
                      {selectedService?.duracion_estimada} min
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                    <span className="text-base sm:text-lg font-bold text-emerald-600">
                      ${selectedService?.precio}
                    </span>
                  </div>
                </div>
                
                {selectedService?.descripcion && (
                  <p className="text-xs sm:text-sm text-gray-300 mt-2 sm:mt-3 p-2 sm:p-3 bg-gray-700/50 rounded-lg">
                    {selectedService?.descripcion}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Opciones de rayitas */}
          <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-600 shadow-sm">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="bg-indigo-100 rounded-lg sm:rounded-xl p-2 sm:p-3">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4 4 4 0 004-4V5z" />
                </svg>
              </div>
              <h5 className="font-bold text-sm sm:text-base text-white">Opciones de Rayitas</h5>
            </div>
            
            {/* Tipo de rayita */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">¿Desea rayitas?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { value: 'none', label: 'No', icon: '❌' },
                  { value: 'head', label: 'Cabeza', icon: '👤' },
                  { value: 'eyebrow', label: 'Ceja', icon: '👁️' },
                  { value: 'both', label: 'Ambas', icon: '✨' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLineOptions(prev => ({ ...prev, type: option.value }))}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-center ${
                      lineOptions.type === option.value
                        ? 'border-indigo-400 bg-indigo-900/30 text-indigo-300'
                        : 'border-gray-600 hover:border-indigo-400 text-gray-300 bg-gray-700/30'
                    }`}
                  >
                    <div className="text-sm sm:text-lg mb-1">{option.icon}</div>
                    <div className="text-xs font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Selección de lado (solo si no es 'none') */}
            {lineOptions.type !== 'none' && (
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">¿En qué lado?</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { value: 'left', label: 'Izquierdo', icon: '⬅️' },
                    { value: 'right', label: 'Derecho', icon: '➡️' },
                    { value: 'both', label: 'Ambos', icon: '↔️' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLineOptions(prev => ({ ...prev, side: option.value }))}
                      className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-center ${
                        lineOptions.side === option.value
                          ? 'border-indigo-400 bg-indigo-900/30 text-indigo-300'
                          : 'border-gray-600 hover:border-indigo-400 text-gray-300 bg-gray-700/30'
                      }`}
                    >
                      <div className="text-sm sm:text-lg mb-1">{option.icon}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Resumen de selección */}
            {lineOptions.type !== 'none' && (
              <div className="bg-indigo-900/30 border border-indigo-600 rounded-lg p-2 sm:p-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-indigo-300">
                    Rayitas en {lineOptions.type === 'head' ? 'cabeza' : lineOptions.type === 'eyebrow' ? 'ceja' : 'cabeza y ceja'} - 
                    Lado {lineOptions.side === 'left' ? 'izquierdo' : lineOptions.side === 'right' ? 'derecho' : 'ambos'}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Notas adicionales */}
          <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-600 shadow-sm">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="bg-amber-100 rounded-lg sm:rounded-xl p-2 sm:p-3">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h5 className="font-bold text-sm sm:text-base text-white">Notas Adicionales</h5>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar comentarios o instrucciones especiales..."
              className="w-full p-3 sm:p-4 text-sm bg-gray-700/50 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none transition-all duration-200 text-white placeholder-gray-400"
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl sm:rounded-3xl w-full max-w-[98vw] sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl h-[95vh] sm:h-[95vh] md:h-[95vh] lg:h-[98vh] xl:h-[98vh] overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col">
        {/* Enhanced Header - Reduced size */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 p-2 sm:p-4 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-violet-600/90"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-1.5 sm:p-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold">Nuevo Turno</h2>
                <p className="text-white/80 text-xs hidden sm:block">Registra una nueva cita para el cliente</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 p-1.5 sm:p-2 rounded-lg sm:rounded-xl"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full translate-y-6 -translate-x-6"></div>
        </div>
        
        {/* Indicador de progreso moderno - Solo móvil */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-2 sm:p-6 border-b border-gray-700/50 flex-shrink-0 block lg:hidden">
          <div className="flex items-center justify-between max-w-lg mx-auto relative">
            {[
              { number: 1, label: 'Cliente', icon: User },
              { number: 2, label: 'Servicio', icon: Scissors },
              { number: 3, label: 'Confirmar', icon: CheckCircle }
            ].map((stepInfo, index) => {
              const Icon = stepInfo.icon;
              return (
                <div key={stepInfo.number} className="flex items-center">
                  <div className="flex flex-col items-center relative z-10">
                    <div className={`relative flex items-center justify-center w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-300 ${
                      step >= stepInfo.number
                        ? 'bg-white text-blue-600 shadow-lg scale-110'
                        : 'bg-white/20 text-white/60'
                    }`}>
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                      {step > stepInfo.number && (
                        <div className="absolute inset-0 bg-green-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <span className={`mt-1 sm:mt-2 text-xs font-medium ${
                      step >= stepInfo.number ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {stepInfo.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`flex-1 h-0.5 sm:h-1 mx-2 sm:mx-4 rounded-full transition-all duration-300 ${
                      step > stepInfo.number ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Enhanced Content */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-gradient-to-b from-gray-800/30 to-gray-900/50 flex-1 min-h-0">
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-xl shadow-lg border-l-4 border-red-300 animate-pulse">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-red-100">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
        
        {/* Footer modernizado */}
        <div className="bg-gray-800/95 backdrop-blur-sm p-4 sm:p-6 pb-6 sm:pb-6 border-t border-gray-700/50 flex-shrink-0" style={{paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'}}>
          {/* Mobile Layout */}
          <div className="block sm:hidden space-y-2 pb-3" style={{paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 1rem))'}}>
            <div className="flex justify-between items-center gap-2">
              {step > 1 && (
                <button
                    onClick={() => setStep(step - 1)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-1 text-sm flex-1 min-h-[40px] hover:scale-105"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Atrás</span>
                  </button>
              )}
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm flex-1 min-h-[40px] hover:scale-105"
              >
                Cancelar
              </button>
            </div>
            <div className="w-full">
              {step < 3 ? (
                <button
                  onClick={handleNextStep}
                  disabled={step === 1 ? !canProceedToStep2() : !canProceedToStep3()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm w-full min-h-[44px] hover:scale-105"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                    onClick={handleCreateTurn}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm w-full min-h-[44px] hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Crear Turno</span>
                      </>
                    )}
                  </button>
              )}
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden lg:flex justify-between items-center">
            {/* Lado izquierdo: Botón anterior + Indicadores de progreso */}
            <div className="flex items-center space-x-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 hover:scale-105 text-sm shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Atrás</span>
                </button>
              )}
              
              {/* Indicadores de progreso horizontales */}
              <div className="flex items-center space-x-4">
                {[
                  { number: 1, label: 'Cliente', icon: User },
                  { number: 2, label: 'Servicio', icon: Scissors },
                  { number: 3, label: 'Confirmar', icon: CheckCircle }
                ].map((stepInfo, index) => {
                  const Icon = stepInfo.icon;
                  return (
                    <div key={stepInfo.number} className="flex items-center">
                      <div className="flex items-center space-x-2">
                        <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 ${
                          step >= stepInfo.number
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'bg-white/20 text-white/60'
                        }`}>
                          <Icon className="w-4 h-4" />
                          {step > stepInfo.number && (
                            <div className="absolute inset-0 bg-green-500 rounded-xl flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          step >= stepInfo.number ? 'text-blue-400' : 'text-gray-500'
                        }`}>
                          {stepInfo.label}
                        </span>
                      </div>
                      {index < 2 && (
                        <div className={`w-8 h-0.5 mx-3 rounded-full transition-all duration-300 ${
                          step > stepInfo.number ? 'bg-blue-600' : 'bg-gray-600'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Lado derecho: Botones de acción */}
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 text-sm shadow-sm hover:shadow-md"
              >
                Cancelar
              </button>
              {step < 3 ? (
                <button
                  onClick={handleNextStep}
                  disabled={step === 1 ? !canProceedToStep2() : !canProceedToStep3()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 text-sm"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleCreateTurn}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Crear Turno</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Tablet Layout (md-lg) */}
          <div className="hidden sm:flex lg:hidden justify-between items-center">
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 hover:scale-105 text-sm shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Atrás</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 text-sm shadow-sm hover:shadow-md"
              >
                Cancelar
              </button>
              {step < 3 ? (
                <button
                  onClick={handleNextStep}
                  disabled={step === 1 ? !canProceedToStep2() : !canProceedToStep3()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 text-sm"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleCreateTurn}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Crear Turno</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de notificación de teléfono duplicado */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-md border border-gray-700/50 shadow-2xl">
            <div className="relative bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Teléfono Duplicado</h3>
                  <p className="text-white/80 text-sm">Este número ya está registrado</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm mb-3">
                  El número de teléfono <strong>{guestData.phone}</strong> ya está registrado como:
                </p>
                
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      duplicateData?.type === 'cliente' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {duplicateData?.type === 'cliente' ? 'Cliente Registrado' : 'Cliente Invitado'}
                    </span>
                  </div>
                  <p className="text-gray-800 font-semibold">{duplicateData?.data?.nombre}</p>
                  <p className="text-gray-600 text-sm">{duplicateData?.data?.telefono}</p>
                  {duplicateData?.data?.email && (
                    <p className="text-gray-600 text-sm">{duplicateData?.data?.email}</p>
                  )}
                </div>
              </div>
              
              <p className="text-gray-300 text-sm mb-6">
                Por favor, verifica el número de teléfono o busca al cliente existente en lugar de crear uno nuevo.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setDuplicateData(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                >
                  Entendido
                </button>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setDuplicateData(null);
                    // Cambiar a búsqueda de cliente y buscar el duplicado
                    setIsGuest(false);
                    setSearchTerm(duplicateData?.data?.nombre || '');
                    setGuestData({ name: '', phone: '', email: '' });
                    if (duplicateData?.data) {
                      searchClients(duplicateData.data.nombre || duplicateData.data.telefono);
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                >
                  Buscar Cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnRegistrationModal;