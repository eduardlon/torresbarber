import React, { useState, useEffect } from 'react';

const ClientIntelligence = ({ clientId, turnData }) => {
  const [clientHistory, setClientHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    if (turnData && (turnData.client_name || turnData.guest_name)) {
      fetchClientHistory();
    }
  }, [clientId, turnData]);

  const fetchClientHistory = async () => {
    try {
      setLoading(true);
      
      // Construir la URL con los parámetros correctos
      const params = new URLSearchParams();
      
      // Obtener el nombre del cliente desde turnData
      const clientName = turnData?.client_name || turnData?.guest_name;
      const clientPhone = turnData?.client_phone;
      
      if (clientName) {
        params.append('nombre', clientName);
      }
      
      if (clientPhone) {
        params.append('telefono', clientPhone);
      }
      
      if (!clientName) {
        throw new Error('No se encontró información del cliente');
      }
      
      const response = await window.barberoAuthenticatedFetch(`/api/barbero/clientes/history?${params.toString()}`);
       
       if (!response) {
         throw new Error('Error de autenticación');
       }
      
      if (!response.ok) {
        throw new Error('Error al cargar el historial del cliente');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setClientHistory(data.data);
      } else {
        setError(data.message || 'Error al cargar el historial del cliente');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6 animate-pulse">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gray-700 rounded-full w-8 h-8"></div>
          <div className="bg-gray-700 h-6 w-48 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-700 h-4 w-full rounded"></div>
          <div className="bg-gray-700 h-4 w-3/4 rounded"></div>
          <div className="bg-gray-700 h-4 w-1/2 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-red-500/80 rounded-full p-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-semibold text-red-400 text-lg">Error al cargar información</h4>
        </div>
        <p className="text-red-300 mb-4">{error}</p>
        <button 
          onClick={fetchClientHistory}
          className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          Reintentar
        </button>
      </div>
    );
  }



  if (!clientId) {
    return (
      <div className="space-y-6">
        {/* Header futurista para cliente invitado */}
        <div className="relative bg-gradient-to-br from-slate-900/90 via-gray-900/90 to-slate-800/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-400/10 to-transparent rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-3 shadow-lg shadow-cyan-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Cliente Invitado</h3>
                  <p className="text-gray-400 text-sm">Usuario no registrado • Sesión temporal</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                <span className="text-orange-400 text-xs font-medium">TEMPORAL</span>
              </div>
            </div>

            {/* Información del cliente invitado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex items-center space-x-3">
                  <div className="bg-cyan-500/20 rounded-lg p-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Nombre</p>
                    <p className="text-white font-semibold text-lg">{turnData?.guest_name || turnData?.client_name || 'Sin nombre'}</p>
                  </div>
                </div>
              </div>
              
              {(turnData?.client_phone || turnData?.guest_phone) && (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500/20 rounded-lg p-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</p>
                      <p className="text-white font-semibold text-lg">{turnData?.client_phone || turnData?.guest_phone}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {turnData?.service_name && (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300 md:col-span-2">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-500/20 rounded-lg p-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Servicio a realizar</p>
                      <p className="text-white font-semibold text-lg">{turnData.service_name}</p>
                      {turnData?.service_price && (
                        <p className="text-cyan-400 font-medium">{formatCurrency(turnData.service_price)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notas importantes */}
            {turnData?.notes && (
              <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-500/20 rounded-lg p-2 mt-1">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-amber-400 uppercase tracking-wide font-medium mb-1">Notas importantes</p>
                    <p className="text-gray-200 text-sm leading-relaxed">{turnData.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header futurista para cliente registrado */}
      <div className="relative bg-gradient-to-br from-slate-900/90 via-gray-900/90 to-slate-800/90 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-400/10 to-transparent rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl p-3 shadow-lg shadow-emerald-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Cliente Registrado</h3>
                <p className="text-gray-400 text-sm">Historial completo • Análisis avanzado</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
              <span className="text-emerald-400 text-xs font-medium">VERIFICADO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Información del cliente y servicio actual */}
      <div className="relative bg-gradient-to-br from-gray-900/90 via-slate-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-transparent to-purple-500/3"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-2 shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Información del Cliente</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500/20 rounded-lg p-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Nombre completo</p>
                  <p className="text-white font-semibold text-lg">{clientHistory?.cliente?.nombre || turnData?.client_name || turnData?.guest_name || 'Sin nombre'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-green-500/30 transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500/20 rounded-lg p-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</p>
                  <p className="text-white font-semibold text-lg">{clientHistory?.cliente?.telefono || turnData?.client_phone || turnData?.guest_phone || 'Sin teléfono'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500/20 rounded-lg p-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Total citas</p>
                  <p className="text-white font-semibold text-lg">{clientHistory?.estadisticas?.total_citas || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Servicio actual */}
          {turnData?.service_name && (
            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-indigo-500/20 rounded-lg p-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h5 className="text-indigo-400 font-semibold">Servicio Actual</h5>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-lg">{turnData.service_name}</p>
                  {turnData?.service_duration && (
                    <p className="text-gray-400 text-sm">Duración estimada: {turnData.service_duration} min</p>
                  )}
                </div>
                {turnData?.service_price && (
                  <div className="text-right">
                    <p className="text-indigo-400 font-bold text-xl">{formatCurrency(turnData.service_price)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas importantes */}
          {turnData?.notes && (
            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-amber-500/20 rounded-lg p-2 mt-1">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-amber-400 uppercase tracking-wide font-medium mb-2">Notas importantes</p>
                  <p className="text-gray-200 leading-relaxed">{turnData.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas avanzadas */}
      <div className="relative bg-gradient-to-br from-gray-900/90 via-slate-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/3 via-transparent to-pink-500/3"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-br from-violet-500 to-pink-600 rounded-xl p-2 shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Análisis de Rendimiento</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-emerald-900/60 to-green-900/60 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-500/20 rounded-xl p-3 border border-emerald-500/30">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Total Invertido</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(clientHistory?.estadisticas?.gasto_total)}</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full" style={{width: '85%'}}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Cliente de alto valor</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-violet-900/60 to-purple-900/60 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/30 hover:border-violet-400/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-violet-500/20 rounded-xl p-3 border border-violet-500/30">
                    <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-violet-400 uppercase tracking-wide font-medium">Promedio por Cita</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(clientHistory?.estadisticas?.gasto_total / (clientHistory?.estadisticas?.total_citas || 1))}</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full" style={{width: '70%'}}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Tendencia creciente</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-orange-900/60 to-red-900/60 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-orange-500/20 rounded-xl p-3 border border-orange-500/30">
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-orange-400 uppercase tracking-wide font-medium">Última Visita</p>
                    <p className="text-3xl font-bold text-white">{clientHistory?.statistics?.days_since_last_visit || 'N/A'}<span className="text-lg">d</span></p>
                  </div>
                </div>
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-red-400 rounded-full" style={{width: '45%'}}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Tiempo desde última cita</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notas e información crítica */}
      <div className="relative bg-gradient-to-br from-slate-900/90 via-gray-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 via-transparent to-blue-500/3"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-2 shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Información Crítica</h4>
          </div>
          
          <div className="space-y-4">
            {/* Notas del cliente */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-slate-800/80 to-gray-800/80 backdrop-blur-sm rounded-xl p-5 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="bg-cyan-500/20 rounded-lg p-2 border border-cyan-500/30 mt-1">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-cyan-300 mb-2">Notas del Cliente</h5>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {clientHistory?.notas || 'No hay notas adicionales para este cliente.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Preferencias y especificaciones */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-slate-800/80 to-gray-800/80 backdrop-blur-sm rounded-xl p-5 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-500/30 mt-1">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-blue-300 mb-3">Preferencias y Especificaciones</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Estilo Preferido</p>
                        <p className="text-white text-sm font-medium">{clientHistory?.estilo_preferido || 'No especificado'}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Alergias</p>
                        <p className="text-white text-sm font-medium">{clientHistory?.alergias || 'Ninguna conocida'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Notas adicionales editables */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-slate-800/80 to-gray-800/80 backdrop-blur-sm rounded-xl p-5 border border-indigo-500/20 hover:border-indigo-400/40 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-500/20 rounded-lg p-2 border border-indigo-500/30 mt-1">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-indigo-300 mb-3">Notas de la Sesión Actual</h5>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                      <textarea
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        className="w-full h-20 p-3 bg-gray-800/50 border border-gray-600/30 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none"
                        placeholder="Agregar notas sobre el cliente, preferencias, observaciones especiales..."
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 space-y-2 sm:space-y-0">
                        <p className="text-xs text-gray-400">Las notas se guardarán automáticamente</p>
                        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 self-start sm:self-auto">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            <span>Guardar Notas</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientIntelligence;