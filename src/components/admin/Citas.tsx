import { useState, useEffect } from 'react';
import { useModal } from '../../hooks/useModal.tsx';

const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [filteredCitas, setFilteredCitas] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCita, setSelectedCita] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsModalType, setStatsModalType] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [citasHistory, setCitasHistory] = useState([]);
  
  const { showSuccessModal, ModalComponent } = useModal();

  const statusOptions = [
    { value: 'all', label: 'Todas', color: 'slate' },
    { value: 'pendiente', label: 'Pendientes', color: 'yellow' },
    { value: 'confirmada', label: 'Confirmadas', color: 'blue' },
    { value: 'en_proceso', label: 'En Proceso', color: 'purple' },
    { value: 'completada', label: 'Completadas', color: 'green' },
    { value: 'cancelada', label: 'Canceladas', color: 'red' },
    { value: 'no_asistio', label: 'No Asistió', color: 'gray' }
  ];

  const servicios = [
    'Corte Clásico',
    'Corte + Barba',
    'Afeitado Clásico',
    'Tratamiento Capilar',
    'Peinado Especial',
    'Lavado de Cabello'
  ];

  const barberos = [
    { id: 1, nombre: 'Carlos Mendoza' },
    { id: 2, nombre: 'Miguel Torres' },
    { id: 3, nombre: 'Diego Ramírez' },
    { id: 4, nombre: 'Andrés López' }
  ];

  useEffect(() => {
    loadCitas();
  }, []);

  useEffect(() => {
    filterCitas();
  }, [citas, statusFilter, searchTerm]);

  const loadCitas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await window.authenticatedFetch(`${window.API_BASE_URL}/citas`);
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setCitas(data.data || []);
        } else {
          setError(data.message || 'Error al cargar las citas');
          setCitas([]);
        }
      } else {
        setError('Error de conexión al cargar las citas');
        setCitas([]);
      }
    } catch (error) {
      console.error('Error cargando citas:', error);
      setError('Error al cargar las citas');
      setCitas([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCitas = () => {
    let filtered = citas;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(cita => cita.estado === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(cita => 
        cita.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cita.cliente_telefono.includes(searchTerm) ||
        (cita.servicio?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cita.barbero?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => a.hora.localeCompare(b.hora));
    setFilteredCitas(filtered);
  };

  const updateCitaStatus = async (citaId, newStatus) => {
    try {
      const response = await window.authenticatedFetch(`${window.API_BASE_URL}/citas/${citaId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: newStatus })
      });
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          // Actualizar el estado local
          setCitas(prev => prev.map(cita => {
            if (cita.id === citaId) {
              return { ...cita, ...data.data };
            }
            return cita;
          }));
          
          showSuccessModal('Éxito', `Cita ${newStatus === 'confirmada' ? 'confirmada' : 'actualizada'} exitosamente`);
        } else {
          setError(data.message || 'Error al actualizar el estado de la cita');
        }
      } else {
        setError('Error de conexión al actualizar la cita');
      }
    } catch (error) {
      console.error('Error actualizando estado de cita:', error);
      setError('Error al actualizar el estado de la cita');
    }
  };

  const openCitaDetails = (cita) => {
    setSelectedCita(cita);
    setIsModalOpen(true);
  };

  const closeCitaDetails = () => {
    setSelectedCita(null);
    setIsModalOpen(false);
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.color : 'slate';
  };

  const getStatusLabel = (status) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.label : status;
  };

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

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}:00`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayCitas = citas.filter(cita => cita.fecha === today);
    
    return {
      total: todayCitas.length,
      pendientes: todayCitas.filter(c => c.estado === 'pendiente').length,
      confirmadas: todayCitas.filter(c => c.estado === 'confirmada').length,
      completadas: todayCitas.filter(c => c.estado === 'completada').length,
      ingresos: todayCitas
        .filter(c => c.estado === 'completada')
        .reduce((sum, c) => sum + c.precio, 0)
    };
  };

  const openStatsModal = (type) => {
    setStatsModalType(type);
    setIsStatsModalOpen(true);
  };

  const closeStatsModal = () => {
    setIsStatsModalOpen(false);
    setStatsModalType('');
  };

  const openHistoryModal = () => {
    loadCitasHistory();
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
  };

  const loadCitasHistory = async () => {
    try {
      const response = await window.authenticatedFetch(`${window.API_BASE_URL}/citas/history`);
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setCitasHistory(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  };

  const getFilteredCitasForModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayCitas = citas.filter(cita => cita.fecha === today);
    
    switch (statsModalType) {
      case 'total':
        return todayCitas;
      case 'pendientes':
        return todayCitas.filter(c => c.estado === 'pendiente');
      case 'confirmadas':
        return todayCitas.filter(c => c.estado === 'confirmada');
      case 'completadas':
        return todayCitas.filter(c => c.estado === 'completada');
      default:
        return [];
    }
  };

  const todayStats = getTodayStats();

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent">Gestión de Citas</h1>
          <p className="text-white/60 mt-2 text-lg">Visualiza y confirma las citas de los clientes</p>
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
          <p className="text-white/60">Cargando citas...</p>
        </div>
      )}

      {/* Stats del día */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <div className="relative group cursor-pointer" onClick={() => openStatsModal('total')}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-white">{todayStats.total}</p>
              <p className="text-white/60 text-sm">Total Hoy</p>
            </div>
          </div>
        </div>
        <div className="relative group cursor-pointer" onClick={() => openStatsModal('pendientes')}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{todayStats.pendientes}</p>
              <p className="text-white/60 text-sm">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="relative group cursor-pointer" onClick={() => openStatsModal('confirmadas')}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-blue-400">{todayStats.confirmadas}</p>
              <p className="text-white/60 text-sm">Confirmadas</p>
            </div>
          </div>
        </div>
        <div className="relative group cursor-pointer" onClick={() => openStatsModal('completadas')}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-400">{todayStats.completadas}</p>
              <p className="text-white/60 text-sm">Completadas</p>
            </div>
          </div>
        </div>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="1" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(todayStats.ingresos)}</p>
              <p className="text-white/60 text-sm">Ingresos</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Filtros */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
        <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white text-sm font-medium mb-3">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all duration-300"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-white text-sm font-medium mb-3">Buscar</label>
              <input
                type="text"
                placeholder="Cliente, teléfono, servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Citas */}
      <div className="space-y-6">
        {filteredCitas.length === 0 ? (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
            <div className="relative text-center py-16 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl cursor-pointer hover:shadow-red-500/10 transition-all duration-300" onClick={openHistoryModal}>
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v5h5"/>
                  <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                  <path d="M12 7v5l4 2"/>
                </svg>
              </div>
              <p className="text-white text-xl font-semibold">Ver Historial Completo</p>
              <p className="text-white/60 text-sm mt-2">Haz clic para ver todas las citas por día</p>
            </div>
          </div>
        ) : (
          <>
            {filteredCitas.map((cita) => {
              const statusColor = getStatusColor(cita.estado);
              return (
                <div key={cita.id} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
                  <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-semibold text-sm">
                                {cita.cliente_nombre.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">{cita.cliente_nombre}</h3>
                              <p className="text-white/60 text-sm">{cita.cliente_telefono}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusColor === 'yellow' ? 'bg-yellow-900/50 text-yellow-400' :
                            statusColor === 'blue' ? 'bg-blue-900/50 text-blue-400' :
                            statusColor === 'purple' ? 'bg-purple-900/50 text-purple-400' :
                            statusColor === 'green' ? 'bg-green-900/50 text-green-400' :
                            statusColor === 'red' ? 'bg-red-900/50 text-red-400' :
                            statusColor === 'gray' ? 'bg-gray-900/50 text-gray-400' :
                            'bg-slate-900/50 text-slate-400'
                          }`}>
                            {getStatusLabel(cita.estado)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                          <div>
                            <p className="text-white/60">Hora</p>
                            <p className="text-white font-medium">{formatTime(cita.hora)}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Servicio</p>
                            <p className="text-white font-medium">{cita.servicio?.nombre || cita.servicio}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Barbero</p>
                            <p className="text-white font-medium">{cita.barbero?.nombre || cita.barbero}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Precio</p>
                            <p className="text-green-400 font-medium">{formatCurrency(cita.precio)}</p>
                          </div>
                        </div>
                        
                        {cita.horaLlegada && (
                          <div className="mt-4 flex items-center space-x-6 text-sm">
                            <span className="text-white/60">Llegada: <span className="text-white">{formatTime(cita.horaLlegada)}</span></span>
                            <span className="text-white/60">Espera: <span className={`font-medium ${
                              cita.tiempoEspera <= 5 ? 'text-green-400' :
                              cita.tiempoEspera <= 10 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{cita.tiempoEspera} min</span></span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => openCitaDetails(cita)}
                          className="bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 hover:border-red-600/40 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300"
                        >
                          Ver Detalles
                        </button>
                        
                        {cita.estado === 'pendiente' && (
                          <button
                            onClick={() => updateCitaStatus(cita.id, 'confirmada')}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-500/25"
                          >
                            Confirmar
                          </button>
                        )}
                        
                        {(cita.estado === 'confirmada' || cita.estado === 'en_proceso') && (
                          <span className="text-white/60 text-sm px-6 py-3">
                            {cita.estado === 'confirmada' ? 'Esperando al barbero' : 'En proceso'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Modal de Detalles */}
      {isModalOpen && selectedCita && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-red-500/10">
            <div className="p-8 border-b border-zinc-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Detalles de la Cita</h2>
                <button
                  onClick={closeCitaDetails}
                  className="text-white/60 hover:text-red-500 transition-all duration-300 p-2 rounded-xl hover:bg-red-500/10"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Información del Cliente */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-red-600/30 pb-3">Información del Cliente</h3>
                <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 rounded-xl p-6 space-y-3 border border-zinc-700/30">
                  <div className="flex justify-between">
                    <span className="text-white/60">Nombre:</span>
                    <span className="text-white font-medium">{selectedCita.cliente_nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Teléfono:</span>
                    <span className="text-white font-medium">{selectedCita.cliente_telefono}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Email:</span>
                    <span className="text-white font-medium">{selectedCita.cliente_email}</span>
                  </div>
                </div>
              </div>

              {/* Información de la Cita */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-red-600/30 pb-3">Información de la Cita</h3>
                <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 rounded-xl p-6 space-y-3 border border-zinc-700/30">
                  <div className="flex justify-between">
                    <span className="text-white/60">Fecha:</span>
                    <span className="text-white font-medium">{new Date(selectedCita.fecha).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Hora:</span>
                    <span className="text-white font-medium">{formatTime(selectedCita.hora)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Servicio:</span>
                    <span className="text-white font-medium">{selectedCita.servicio?.nombre || selectedCita.servicio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Barbero:</span>
                    <span className="text-white font-medium">{selectedCita.barbero?.nombre || selectedCita.barbero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Duración:</span>
                    <span className="text-white font-medium">{selectedCita.duracion} minutos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Precio:</span>
                    <span className="text-green-400 font-medium">{formatCurrency(selectedCita.precio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Estado:</span>
                    <span className={`font-medium ${
                      getStatusColor(selectedCita.estado) === 'yellow' ? 'text-yellow-400' :
                      getStatusColor(selectedCita.estado) === 'blue' ? 'text-blue-400' :
                      getStatusColor(selectedCita.estado) === 'purple' ? 'text-purple-400' :
                      getStatusColor(selectedCita.estado) === 'green' ? 'text-green-400' :
                      getStatusColor(selectedCita.estado) === 'red' ? 'text-red-400' :
                      getStatusColor(selectedCita.estado) === 'gray' ? 'text-gray-400' :
                      'text-slate-400'
                    }`}>
                      {getStatusLabel(selectedCita.estado)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Información de Llegada */}
              {selectedCita.horaLlegada && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 border-b border-red-600/30 pb-3">Información de Llegada</h3>
                  <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 rounded-xl p-6 space-y-3 border border-zinc-700/30">
                    <div className="flex justify-between">
                      <span className="text-white/60">Hora de Llegada:</span>
                      <span className="text-white font-medium">{formatTime(selectedCita.horaLlegada)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Tiempo de Espera:</span>
                      <span className={`font-medium ${
                        selectedCita.tiempoEspera <= 5 ? 'text-green-400' :
                        selectedCita.tiempoEspera <= 10 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {selectedCita.tiempoEspera} minutos
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notas */}
              {selectedCita.notas && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 border-b border-red-600/30 pb-3">Notas</h3>
                  <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 rounded-xl p-6 border border-zinc-700/30">
                    <p className="text-white/90">{selectedCita.notas}</p>
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-4">
                {selectedCita.estado === 'pendiente' && (
                  <button
                    onClick={() => {
                      updateCitaStatus(selectedCita.id, 'confirmada');
                      closeCitaDetails();
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/25"
                  >
                    Confirmar Cita
                  </button>
                )}
                
                {(selectedCita.estado === 'confirmada' || selectedCita.estado === 'en_proceso') && (
                  <div className="flex-1 bg-zinc-800/50 border border-zinc-700/30 text-white/60 py-3 rounded-xl text-center">
                    {selectedCita.estado === 'confirmada' ? 'Esperando al barbero' : 'En proceso con el barbero'}
                  </div>
                )}
                
                {(selectedCita.estado === 'pendiente' || selectedCita.estado === 'confirmada') && (
                  <button
                    onClick={() => {
                      updateCitaStatus(selectedCita.id, 'cancelada');
                      closeCitaDetails();
                    }}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-red-500/25"
                  >
                    Cancelar Cita
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estadísticas */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-red-500/10">
            <div className="p-8 border-b border-zinc-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  Citas {statsModalType === 'total' ? 'del Día' : 
                         statsModalType === 'pendientes' ? 'Pendientes' :
                         statsModalType === 'confirmadas' ? 'Confirmadas' :
                         statsModalType === 'completadas' ? 'Completadas' : ''}
                </h2>
                <button
                  onClick={closeStatsModal}
                  className="text-white/60 hover:text-red-500 transition-all duration-300 p-2 rounded-xl hover:bg-red-500/10"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-8">
              {getFilteredCitasForModal().length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </div>
                  <p className="text-white text-xl font-semibold">No hay citas {statsModalType}</p>
                  <p className="text-white/60 text-sm mt-2">No se encontraron citas para esta categoría hoy</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredCitasForModal().map((cita) => {
                    const statusColor = getStatusColor(cita.estado);
                    return (
                      <div key={cita.id} className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 rounded-xl p-6 border border-zinc-700/30">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                                <span className="text-white font-semibold text-xs">
                                  {cita.cliente_nombre.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-white font-semibold">{cita.cliente_nombre}</h3>
                                <p className="text-white/60 text-sm">{cita.cliente_telefono}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                statusColor === 'yellow' ? 'bg-yellow-900/50 text-yellow-400' :
                                statusColor === 'blue' ? 'bg-blue-900/50 text-blue-400' :
                                statusColor === 'purple' ? 'bg-purple-900/50 text-purple-400' :
                                statusColor === 'green' ? 'bg-green-900/50 text-green-400' :
                                statusColor === 'red' ? 'bg-red-900/50 text-red-400' :
                                statusColor === 'gray' ? 'bg-gray-900/50 text-gray-400' :
                                'bg-slate-900/50 text-slate-400'
                              }`}>
                                {getStatusLabel(cita.estado)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-white/60">Hora</p>
                                <p className="text-white font-medium">{formatTime(cita.hora)}</p>
                              </div>
                              <div>
                                <p className="text-white/60">Servicio</p>
                                <p className="text-white font-medium">{cita.servicio?.nombre || cita.servicio}</p>
                              </div>
                              <div>
                                <p className="text-white/60">Barbero</p>
                                <p className="text-white font-medium">{cita.barbero?.nombre || cita.barbero}</p>
                              </div>
                              <div>
                                <p className="text-white/60">Precio</p>
                                <p className="text-green-400 font-medium">{formatCurrency(cita.precio)}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {cita.estado === 'pendiente' && (
                              <button
                                onClick={() => {
                                  updateCitaStatus(cita.id, 'confirmada');
                                  closeStatsModal();
                                }}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                              >
                                Confirmar
                              </button>
                            )}
                            
                            {(cita.estado === 'confirmada' || cita.estado === 'en_proceso') && (
                              <span className="text-white/60 text-sm px-4 py-2">
                                {cita.estado === 'confirmada' ? 'Esperando al barbero' : 'En proceso con el barbero'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-red-500/10">
            <div className="p-8 border-b border-zinc-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Historial Completo de Citas</h2>
                <button
                  onClick={closeHistoryModal}
                  className="text-white/60 hover:text-red-500 transition-all duration-300 p-2 rounded-xl hover:bg-red-500/10"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-8">
              {citasHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v5h5"/>
                      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                      <path d="M12 7v5l4 2"/>
                    </svg>
                  </div>
                  <p className="text-white text-xl font-semibold">Cargando historial...</p>
                  <p className="text-white/60 text-sm mt-2">Obteniendo todas las citas del historial</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    citasHistory.reduce((acc, cita) => {
                      const fecha = cita.fecha;
                      if (!acc[fecha]) acc[fecha] = [];
                      acc[fecha].push(cita);
                      return acc;
                    }, {})
                  )
                  .sort(([a], [b]) => new Date(b) - new Date(a))
                  .map(([fecha, citasDia]) => {
                    const totalDia = citasDia.length;
                    const completadasDia = citasDia.filter(c => c.estado === 'completada').length;
                    const ingresosDia = citasDia
                      .filter(c => c.estado === 'completada')
                      .reduce((sum, c) => sum + c.precio, 0);
                    
                    return (
                      <div key={fecha} className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 rounded-xl border border-zinc-700/30 overflow-hidden">
                        <div className="p-6 border-b border-zinc-700/30">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {new Date(fecha).toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </h3>
                              <p className="text-white/60 text-sm mt-1">{totalDia} citas programadas</p>
                            </div>
                            <div className="flex gap-6 text-sm">
                              <div className="text-center">
                                <p className="text-green-400 font-bold text-lg">{completadasDia}</p>
                                <p className="text-white/60">Completadas</p>
                              </div>
                              <div className="text-center">
                                <p className="text-green-400 font-bold text-lg">{formatCurrency(ingresosDia)}</p>
                                <p className="text-white/60">Ingresos</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6 space-y-3">
                          {citasDia
                            .sort((a, b) => a.hora.localeCompare(b.hora))
                            .map((cita) => {
                              const statusColor = getStatusColor(cita.estado);
                              return (
                                <div key={cita.id} className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg border border-zinc-700/20">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white font-semibold text-xs">
                                        {cita.cliente_nombre.split(' ').map(n => n[0]).join('')}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-white font-medium">{cita.cliente_nombre}</p>
                                      <p className="text-white/60 text-sm">{formatTime(cita.hora)} - {cita.servicio?.nombre || cita.servicio}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      statusColor === 'yellow' ? 'bg-yellow-900/50 text-yellow-400' :
                                      statusColor === 'blue' ? 'bg-blue-900/50 text-blue-400' :
                                      statusColor === 'purple' ? 'bg-purple-900/50 text-purple-400' :
                                      statusColor === 'green' ? 'bg-green-900/50 text-green-400' :
                                      statusColor === 'red' ? 'bg-red-900/50 text-red-400' :
                                      statusColor === 'gray' ? 'bg-gray-900/50 text-gray-400' :
                                      'bg-slate-900/50 text-slate-400'
                                    }`}>
                                      {getStatusLabel(cita.estado)}
                                    </span>
                                    <p className="text-green-400 font-medium text-sm">{formatCurrency(cita.precio)}</p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <ModalComponent />
    </div>
  );
};

export default Citas;