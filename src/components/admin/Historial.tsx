import React, { useState, useEffect } from 'react';
import { useModal } from '../../hooks/useModal.tsx';

const Historial = () => {
  const [historial, setHistorial] = useState([]);
  const [filteredHistorial, setFilteredHistorial] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { showInfoModal, ModalComponent } = useModal();

  const transactionTypes = [
    { value: 'all', label: 'Todos', color: 'slate' },
    { value: 'venta', label: 'Ventas', color: 'green' },
    { value: 'servicio', label: 'Servicios', color: 'blue' },
    { value: 'gasto', label: 'Gastos', color: 'red' },
    { value: 'ingreso_extra', label: 'Ingresos Extra', color: 'purple' },
    { value: 'devolucion', label: 'Devoluciones', color: 'orange' }
  ];

  const dateFilters = [
    { value: 'all', label: 'Todo el tiempo' },
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Rango personalizado' }
  ];

  useEffect(() => {
    loadHistorial();
  }, []);

  useEffect(() => {
    filterHistorial();
  }, [historial, searchTerm, typeFilter, dateFilter, startDate, endDate]);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await window.authenticatedFetch(`${window.API_BASE_URL}/historial`);
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistorial(data.data || []);
        } else {
          setError(data.message || 'Error al cargar el historial');
        }
      } else {
        setError('Error de conexión con el servidor');
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const filterHistorial = () => {
    let filtered = historial;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barbero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.factura?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.tipo === typeFilter);
    }

    // Filtrar por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.fecha);
        
        switch (dateFilter) {
          case 'today':
            return itemDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            return itemDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            return itemDate >= yearAgo;
          case 'custom':
            if (startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              return itemDate >= start && itemDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Ordenar por fecha (más reciente primero)
    filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    setFilteredHistorial(filtered);
    setCurrentPage(1);
  };

  const openTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const closeTransactionDetails = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  const getTypeColor = (type) => {
    const typeOption = transactionTypes.find(option => option.value === type);
    return typeOption ? typeOption.color : 'slate';
  };

  const getTypeLabel = (type) => {
    const typeOption = transactionTypes.find(option => option.value === type);
    return typeOption ? typeOption.label : type;
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

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStats = () => {
    const totalIngresos = filteredHistorial
      .filter(item => ['venta', 'servicio', 'ingreso_extra'].includes(item.tipo))
      .reduce((sum, item) => sum + Math.abs(item.monto), 0);
    
    const totalGastos = filteredHistorial
      .filter(item => ['gasto', 'devolucion'].includes(item.tipo))
      .reduce((sum, item) => sum + Math.abs(item.monto), 0);
    
    const gananciaTotal = totalIngresos - totalGastos;
    
    return {
      totalIngresos,
      totalGastos,
      gananciaTotal,
      totalTransacciones: filteredHistorial.length
    };
  };

  const stats = getStats();

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistorial.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <span className="ml-3 text-gray-400">Cargando historial...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-400 font-medium">Error: {error}</span>
          </div>
          <button
            onClick={loadHistorial}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Historial de Transacciones</h1>
          <p className="text-gray-400 mt-1">Visualiza el historial completo de ventas, ingresos y gastos</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 border border-red-500/20 shadow-lg hover:shadow-red-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir</span>
          </button>
          <button
            onClick={() => showInfoModal('Función en Desarrollo', 'La función de exportar está actualmente en desarrollo y estará disponible próximamente.')}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-red-500/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalIngresos)}</p>
            <p className="text-gray-400 text-sm">Total Ingresos</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4 4m4-4l-4-4" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalGastos)}</p>
            <p className="text-gray-400 text-sm">Total Gastos</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className={`text-2xl font-bold ${
              stats.gananciaTotal >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.gananciaTotal >= 0 ? '+' : ''}{formatCurrency(stats.gananciaTotal)}
            </p>
            <p className="text-gray-400 text-sm">Ganancia Total</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.totalTransacciones}</p>
            <p className="text-gray-400 text-sm">Transacciones</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar transacciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-red-500/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
          >
            {transactionTypes.map(type => (
              <option key={type.value} value={type.value} className="bg-gray-900">{type.label}</option>
            ))}
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
          >
            {dateFilters.map(filter => (
              <option key={filter.value} value={filter.value} className="bg-gray-900">{filter.label}</option>
            ))}
          </select>
          
          <div className="bg-black/20 border border-red-500/20 rounded-lg px-4 py-2 text-gray-300 text-sm flex items-center">
            {filteredHistorial.length} de {historial.length} registros
          </div>
        </div>
        
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Lista de Transacciones */}
      <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg border border-red-500/20 shadow-lg overflow-hidden">
        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">No se encontraron transacciones</p>
            <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-black/80 to-gray-900/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cliente/Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-500/20">
                {currentItems.map((transaction) => {
                  const typeColor = getTypeColor(transaction.tipo);
                  return (
                    <tr key={transaction.id} className="hover:bg-red-500/10 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDateTime(transaction.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          typeColor === 'green' ? 'bg-green-900/50 text-green-400 border border-green-500/30' :
                          typeColor === 'blue' ? 'bg-blue-900/50 text-blue-400 border border-blue-500/30' :
                          typeColor === 'red' ? 'bg-red-900/50 text-red-400 border border-red-500/30' :
                          typeColor === 'purple' ? 'bg-purple-900/50 text-purple-400 border border-purple-500/30' :
                          typeColor === 'orange' ? 'bg-orange-900/50 text-orange-400 border border-orange-500/30' :
                          'bg-gray-900/50 text-gray-400 border border-gray-500/30'
                        }`}>
                          {getTypeLabel(transaction.tipo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <div className="max-w-xs truncate">{transaction.descripcion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {transaction.cliente || transaction.proveedor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.monto >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {transaction.monto >= 0 ? '+' : ''}{formatCurrency(transaction.monto)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openTransactionDetails(transaction)}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/30"
                        >
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredHistorial.length)} de {filteredHistorial.length} registros
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-700 hover:to-gray-800 transition-all duration-200 border border-red-500/20 shadow-lg"
            >
              Anterior
            </button>
            
            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => paginate(pageNumber)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      currentPage === pageNumber
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-700 hover:to-gray-800 border border-red-500/20 shadow-lg'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (
                pageNumber === currentPage - 2 ||
                pageNumber === currentPage + 2
              ) {
                return <span key={pageNumber} className="px-2 text-gray-400">...</span>;
              }
              return null;
            })}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-700 hover:to-gray-800 transition-all duration-200 border border-red-500/20 shadow-lg"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-sm rounded-xl border border-red-500/30 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-500/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Detalles de la Transacción</h2>
                <button
                  onClick={closeTransactionDetails}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Información General</h3>
                <div className="bg-black/40 border border-red-500/20 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID:</span>
                    <span className="text-white font-medium">#{selectedTransaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tipo:</span>
                    <span className={`font-medium ${
                      getTypeColor(selectedTransaction.tipo) === 'green' ? 'text-green-400' :
                      getTypeColor(selectedTransaction.tipo) === 'blue' ? 'text-blue-400' :
                      getTypeColor(selectedTransaction.tipo) === 'red' ? 'text-red-400' :
                      getTypeColor(selectedTransaction.tipo) === 'purple' ? 'text-purple-400' :
                      getTypeColor(selectedTransaction.tipo) === 'orange' ? 'text-orange-400' :
                      'text-gray-400'
                    }`}>
                      {getTypeLabel(selectedTransaction.tipo)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="text-white font-medium">{formatDateTime(selectedTransaction.fecha)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monto:</span>
                    <span className={`font-bold text-lg ${
                      selectedTransaction.monto >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedTransaction.monto >= 0 ? '+' : ''}{formatCurrency(selectedTransaction.monto)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Método de Pago:</span>
                    <span className="text-white font-medium">{selectedTransaction.metodoPago}</span>
                  </div>
                </div>
              </div>

              {/* Información de Cliente/Proveedor */}
              {(selectedTransaction.cliente || selectedTransaction.proveedor) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {selectedTransaction.cliente ? 'Información del Cliente' : 'Información del Proveedor'}
                  </h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nombre:</span>
                      <span className="text-white font-medium">
                        {selectedTransaction.cliente || selectedTransaction.proveedor}
                      </span>
                    </div>
                    {selectedTransaction.barbero && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Barbero:</span>
                        <span className="text-white font-medium">{selectedTransaction.barbero}</span>
                      </div>
                    )}
                    {selectedTransaction.categoria && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Categoría:</span>
                        <span className="text-white font-medium">{selectedTransaction.categoria}</span>
                      </div>
                    )}
                    {selectedTransaction.factura && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Factura:</span>
                        <span className="text-white font-medium">{selectedTransaction.factura}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Productos */}
              {selectedTransaction.productos && selectedTransaction.productos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Productos</h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                    {selectedTransaction.productos.map((producto, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-red-500/20 last:border-b-0">
                        <div>
                          <span className="text-white font-medium">{producto.nombre}</span>
                          <span className="text-gray-400 ml-2">x{producto.cantidad}</span>
                        </div>
                        <span className="text-green-400 font-medium">{formatCurrency(producto.precio * producto.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Servicios */}
              {selectedTransaction.servicios && selectedTransaction.servicios.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Servicios</h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                    {selectedTransaction.servicios.map((servicio, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-red-500/20 last:border-b-0">
                        <div>
                          <span className="text-white font-medium">{servicio.nombre}</span>
                          <span className="text-gray-400 ml-2">({servicio.duracion} min)</span>
                        </div>
                        <span className="text-blue-400 font-medium">{formatCurrency(servicio.precio)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {selectedTransaction.notas && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Notas</h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                    <p className="text-white">{selectedTransaction.notas}</p>
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Descripción</h3>
                <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                  <p className="text-white">{selectedTransaction.descripcion}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ModalComponent />
    </div>
  );
};

export default Historial;