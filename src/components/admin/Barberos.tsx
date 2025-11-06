import React, { useState, useEffect } from 'react';
import { useModal } from '../../hooks/useModal.tsx';

const Barberos = () => {
  const [activeTab, setActiveTab] = useState('gestion');
  const [barberos, setBarberos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarbero, setEditingBarbero] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showSuccessModal, showConfirmModal, ModalComponent } = useModal();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    username: '',
    password: '',
    activo: true
  });

  useEffect(() => {
    loadBarberos();
  }, []);

  const loadBarberos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barberos`);
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setBarberos(data.data || []);
        } else {
          setError(data.message || 'Error al cargar barberos');
        }
      } else {
        setError('Error de conexión con el servidor');
      }
    } catch (error) {
      console.error('Error cargando barberos:', error);
      setError('Error al cargar los barberos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openModal = (barbero = null) => {
    if (barbero) {
      setEditingBarbero(barbero);
      setFormData({
        nombre: barbero.nombre || '',
        apellido: barbero.apellido || '',
        email: barbero.email || '',
        telefono: barbero.telefono || '',
        username: barbero.usuario || '',
        password: '',
        activo: barbero.activo ?? true
      });
    } else {
      setEditingBarbero(null);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        username: '',
        password: '',
        activo: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBarbero(null);
  };

  const preparePayload = (data, isEditing) => {
    const sanitized = { ...data };

    ['nombre', 'apellido', 'email', 'telefono', 'username', 'password'].forEach((field) => {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = sanitized[field].trim();
      }
    });

    sanitized.username = sanitized.username?.toLowerCase() || '';

    if (!sanitized.email) {
      sanitized.email = null;
    }

    if (!sanitized.telefono) {
      sanitized.telefono = null;
    }

    sanitized.activo = Boolean(sanitized.activo);

    if (isEditing) {
      if (!sanitized.password) {
        delete sanitized.password;
      }
    } else {
      sanitized.password = sanitized.password || '';
    }

    return sanitized;
  };

  const parseErrorResponse = async (response) => {
    if (!response) {
      return 'Error de conexión con el servidor';
    }

    try {
      const data = await response.clone().json();
      if (data?.errors) {
        const messages = Object.values(data.errors)
          .flat()
          .filter(Boolean);
        if (messages.length > 0) {
          return messages.join('. ');
        }
      }
      if (data?.message) {
        return data.message;
      }
    } catch (error) {
      // Ignorar errores de parseo y continuar con mensaje genérico
    }

    return `Error inesperado (${response.status || ''})`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);

      const payload = preparePayload(formData, Boolean(editingBarbero));

      if (!editingBarbero && !payload.password) {
        setError('La contraseña es obligatoria.');
        return;
      }

      if (editingBarbero) {
        // Actualizar barbero existente
        const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barberos/${editingBarbero.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (response?.ok) {
          const data = await response.json();
          if (data.success) {
            await loadBarberos(); // Recargar la lista
            showSuccessModal('Éxito', 'Barbero actualizado exitosamente');
          } else {
            setError(data.message || 'Error al actualizar barbero');
            return;
          }
        } else {
          const message = await parseErrorResponse(response);
          setError(message);
          return;
        }
      } else {
        // Crear nuevo barbero
        const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barberos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (response?.ok) {
          const data = await response.json();
          if (data.success) {
            await loadBarberos(); // Recargar la lista
            showSuccessModal('Éxito', 'Barbero creado exitosamente');
          } else {
            setError(data.message || 'Error al crear barbero');
            return;
          }
        } else {
          const message = await parseErrorResponse(response);
          setError(message);
          return;
        }
      }
      
      closeModal();
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setError('Error al procesar la solicitud');
    }
  };

  const handleDelete = (id) => {
    const barbero = barberos.find(b => b.id === id);
    showConfirmModal(
      'Eliminar Barbero',
      `¿Estás seguro de que quieres eliminar a ${barbero?.nombre}? Esta acción no se puede deshacer.`,
      async () => {
        try {
          const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barberos/${id}`, {
            method: 'DELETE'
          });

          if (response && response.ok) {
            const data = await response.json();
            if (data.success) {
              await loadBarberos(); // Recargar la lista
              showSuccessModal('Éxito', 'Barbero eliminado exitosamente');
            } else {
              setError(data.message || 'Error al eliminar barbero');
            }
          } else {
            setError('Error de conexión con el servidor');
          }
        } catch (error) {
          console.error('Error eliminando barbero:', error);
          setError('Error al eliminar el barbero');
        }
      }
    );
  };

  const toggleStatus = async (id) => {
    try {
      const response = await window.authenticatedFetch(`${window.API_BASE_URL}/barberos/${id}/toggle-status`, {
        method: 'PATCH'
      });

      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadBarberos(); // Recargar la lista
          const barbero = barberos.find(b => b.id === id);
          showSuccessModal('Éxito', `Barbero ${barbero?.activo ? 'desactivado' : 'activado'} exitosamente`);
        } else {
          setError(data.message || 'Error al cambiar estado del barbero');
        }
      } else {
        setError('Error de conexión con el servidor');
      }
    } catch (error) {
      console.error('Error cambiando estado del barbero:', error);
      setError('Error al cambiar el estado del barbero');
    }
  };

  const handlePago = (id) => {
    const barbero = barberos.find(b => b.id === id);
    const ultimoPago = barbero.ultimoPago ? new Date(barbero.ultimoPago) : null;
    const ahora = new Date();
    const unaSemana = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
    
    if (ultimoPago && (ahora - ultimoPago) < unaSemana) {
      const diasRestantes = Math.ceil((unaSemana - (ahora - ultimoPago)) / (24 * 60 * 60 * 1000));
      showSuccessModal('Pago no disponible', `Debes esperar ${diasRestantes} días más para realizar el próximo pago.`);
      return;
    }

    showConfirmModal(
      'Confirmar Pago',
      `¿Confirmar pago semanal para ${barbero?.nombre} ${barbero?.apellido}?\nMonto: $${barbero?.ventasSemana?.toFixed(2)}`,
      () => {
        setBarberos(prev => prev.map(b => 
          b.id === id 
            ? { 
                ...b, 
                estadoPago: 'pagado', 
                ultimoPago: new Date().toISOString().split('T')[0],
                ventasSemana: 0 // Resetear ventas de la semana
              }
            : b
        ));
        showSuccessModal('Éxito', 'Pago procesado exitosamente');
      }
    );
  };

  const filteredBarberos = barberos.filter(barbero => 
    barbero.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barbero.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barbero.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0);
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const canPay = (barbero) => {
    if (!barbero.ultimoPago) return true;
    const ultimoPago = new Date(barbero.ultimoPago);
    const ahora = new Date();
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    return (ahora - ultimoPago) >= unaSemana;
  };

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Barberos</h1>
          <p className="text-white/60 mt-2">Gestión y rendimiento del equipo</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/60">Cargando barberos...</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl p-2 border border-zinc-700/30 shadow-lg">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('gestion')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'gestion'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25'
                : 'text-white/60 hover:text-white hover:bg-zinc-700/30'
            }`}
          >
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Gestión de Barberos
          </button>
          <button
            onClick={() => setActiveTab('rendimiento')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'rendimiento'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25'
                : 'text-white/60 hover:text-white hover:bg-zinc-700/30'
            }`}
          >
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Rendimiento
          </button>
        </div>
      </div>

      {/* Gestión de Barberos Tab */}
      {activeTab === 'gestion' && !loading && (
        <div className="space-y-6">
          {/* Header con botón agregar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <h2 className="text-2xl font-semibold text-white">Gestión de Barberos</h2>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg shadow-red-500/25"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nuevo Barbero</span>
            </button>
          </div>

          {/* Search */}
          <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/30 shadow-lg">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar barberos por nombre, apellido o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/30 rounded-xl pl-12 pr-4 py-4 text-white placeholder-white/40 focus:outline-none focus:border-red-600/50 focus:ring-2 focus:ring-red-600/20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Barberos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBarberos.map((barbero) => (
              <div key={barbero.id} className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-2xl border border-zinc-700/30 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 hover:border-red-600/30">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                      <span className="text-white font-bold text-lg">
                        {(barbero.nombre?.charAt(0) || '') + (barbero.apellido?.charAt(0) || '')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base">{barbero.nombre} {barbero.apellido}</h3>
                      <p className="text-white/60 text-sm">@{barbero.usuario}</p>
                    </div>
                  </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-medium ${
                      barbero.activo 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {barbero.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-3 text-sm">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-white/80 truncate">{barbero.email}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-white/80">{barbero.telefono}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-6 0V7" />
                      </svg>
                      <span className="text-white/80">Desde {barbero.fechaIngreso ? new Date(barbero.fechaIngreso).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-center">
                      <p className="text-blue-400 font-bold text-xl">{barbero.citasHoy || 0}</p>
                      <p className="text-white/60 text-xs mt-1">Citas Hoy</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4 text-center">
                      <p className="text-green-400 font-bold text-xl">{formatCurrency(barbero.ventasHoy)}</p>
                      <p className="text-white/60 text-xs mt-1">Ventas Hoy</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => openModal(barbero)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-500/25"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleStatus(barbero.id)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg ${
                        barbero.activo
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-yellow-500/25'
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/25'
                      }`}
                    >
                      {barbero.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(barbero.id)}
                      className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-sm transition-all duration-300 shadow-lg shadow-red-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBarberos.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-12">
                <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <p className="text-white/60 text-xl font-medium">No se encontraron barberos</p>
                <p className="text-white/40 text-sm mt-2">Intenta ajustar tu búsqueda o agrega un nuevo barbero</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rendimiento Tab */}
      {activeTab === 'rendimiento' && (
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold text-white">Rendimiento y Pagos</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {barberos.filter(b => b.activo).map((barbero) => (
              <div key={barbero.id} className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-6 shadow-xl hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 hover:border-red-600/30">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                      <span className="text-white font-bold text-lg">
                        {(barbero.nombre?.charAt(0) || '') + (barbero.apellido?.charAt(0) || '')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base">{barbero.nombre} {barbero.apellido}</h3>
                      <p className="text-white/60 text-sm">Rendimiento semanal</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-medium border ${
                    barbero.estadoPago === 'pagado'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {barbero.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <p className="text-blue-400 font-bold text-xl">{barbero.citasHoy || 0}</p>
                    <p className="text-white/60 text-xs mt-1">Citas Hoy</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-green-400 font-bold text-xl">{formatCurrency(barbero.ventasHoy)}</p>
                    <p className="text-white/60 text-xs mt-1">Ventas Hoy</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 border border-zinc-700/30 rounded-xl p-5 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white/80 text-sm font-medium">Ventas Semana:</span>
                    <span className="text-green-400 font-bold text-xl">{formatCurrency(barbero.ventasSemana)}</span>
                  </div>
                  {barbero.ultimoPago && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/60">Último pago:</span>
                      <span className="text-white/80">{new Date(barbero.ultimoPago).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handlePago(barbero.id)}
                  disabled={!canPay(barbero) || barbero.ventasSemana === 0}
                  className={`w-full py-4 rounded-xl font-medium transition-all duration-300 text-sm flex items-center justify-center space-x-2 ${
                    canPay(barbero) && barbero.ventasSemana > 0
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-500/25'
                      : 'bg-zinc-700/50 text-white/40 cursor-not-allowed border border-zinc-600/30'
                  }`}
                >
                  {canPay(barbero) && barbero.ventasSemana > 0 && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  )}
                  <span>
                    {!canPay(barbero) ? 'Pago no disponible' : 
                     barbero.ventasSemana === 0 ? 'Sin ventas' : 
                     `Pagar ${formatCurrency(barbero.ventasSemana)}`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-sm rounded-2xl border border-zinc-700/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-zinc-700/30">
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {editingBarbero ? 'Editar Barbero' : 'Nuevo Barbero'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Información Personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="Nombre"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="Apellido"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="email@ejemplo.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="+1234567890"
                    required
                  />
                </div>
              </div>

              {/* Credenciales de Login */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Usuario</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="usuario"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">
                    Contraseña {editingBarbero && '(dejar vacío para mantener actual)'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="••••••••"
                    required={!editingBarbero}
                  />
                </div>
              </div>

              {/* Estado */}
              <div className="bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 border border-zinc-700/30 rounded-xl p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-red-600 bg-zinc-800/50 border-zinc-700/50 rounded-lg focus:ring-red-500/50 focus:ring-2"
                  />
                  <span className="text-white/80 text-sm font-medium">Barbero activo</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-zinc-700/50 hover:bg-zinc-600/50 text-white/80 py-3 sm:py-4 rounded-xl font-medium transition-all duration-300 border border-zinc-600/30 text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 sm:py-4 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-red-500/25 text-sm sm:text-base"
                >
                  {editingBarbero ? 'Actualizar' : 'Crear'} Barbero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalComponent />
    </div>
  );
};

export default Barberos;