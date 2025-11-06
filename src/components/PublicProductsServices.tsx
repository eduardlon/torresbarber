import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, Scissors, Star, ShoppingBag, Clock, DollarSign, Eye } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  imagen?: string;
  activo: boolean;
}

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  duracion: number;
  activo: boolean;
  categoria?: string;
}

const PublicProductsServices: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'productos' | 'servicios'>('productos');

  const getApiBaseUrl = () => {
    return 'http://localhost:8001/api';
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([cargarProductos(), cargarServicios()]);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/productos/publico`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setProductos(result.data);
      } else {
        console.error('Error en respuesta de productos:', result);
        setProductos([]);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductos([]);
    }
  };

  const cargarServicios = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/servicios/publico`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setServicios(result.data);
      } else {
        console.error('Error en respuesta de servicios:', result);
        setServicios([]);
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
      setServicios([]);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const getCategories = () => {
    const items = activeTab === 'productos' ? productos : servicios;
    const categories = [...new Set(items.map(item => item.categoria || 'Sin categoría'))];
    return categories.filter(Boolean);
  };

  const filteredItems = () => {
    const items = activeTab === 'productos' ? productos : servicios;
    
    return items.filter(item => {
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
                             (item.categoria || 'Sin categoría') === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-zinc-700 border-t-yellow-500 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 blur-xl"></div>
          </div>
          <p className="text-white/70 text-lg font-medium">Cargando productos y servicios...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-600/30 rounded-2xl p-8 backdrop-blur-sm">
            <div className="text-red-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Error al cargar</h3>
            <p className="text-red-200 mb-6">{error}</p>
            <button
              onClick={cargarDatos}
              className="group flex items-center justify-center w-full px-6 py-3 bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-900/40 transition-all duration-300 ease-in-out hover:bg-red-600 hover:shadow-xl hover:shadow-red-800/50 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-red-500 active:scale-95"
            >
              <svg className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/50 to-black"></div>
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-yellow-500/5 to-yellow-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6">
              <img
                src="/images/logo-barberia.png"
                alt="Logo de JP Barber"
                width={80}
                height={80}
                className="mx-auto mb-4 filter drop-shadow-lg"
              />
            </div>
            <h1 className="text-4xl md:text-5xl text-white font-bold tracking-wide mb-4 leading-tight">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Productos y Servicios
              </span>
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Descubre nuestros productos de calidad premium y servicios profesionales de barbería.
              Tu estilo, nuestra pasión.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-gradient-to-br from-zinc-900/95 to-black/95 border border-yellow-600/30 rounded-2xl p-2 backdrop-blur-sm shadow-2xl">
            <button
              onClick={() => setActiveTab('productos')}
              className={`group flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ease-in-out ${
                activeTab === 'productos'
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-lg shadow-yellow-500/30 transform scale-105'
                  : 'text-white/70 hover:text-white hover:bg-zinc-800/50 hover:scale-102'
              }`}
            >
              <Package className={`w-6 h-6 mr-3 transition-transform duration-300 ${
                activeTab === 'productos' ? 'scale-110' : 'group-hover:scale-110'
              }`} />
              Productos ({productos.length})
            </button>
            <button
              onClick={() => setActiveTab('servicios')}
              className={`group flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ease-in-out ${
                activeTab === 'servicios'
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-lg shadow-yellow-500/30 transform scale-105'
                  : 'text-white/70 hover:text-white hover:bg-zinc-800/50 hover:scale-102'
              }`}
            >
              <Scissors className={`w-6 h-6 mr-3 transition-transform duration-300 ${
                activeTab === 'servicios' ? 'scale-110' : 'group-hover:scale-110'
              }`} />
              Servicios ({servicios.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-black/95 border border-yellow-600/30 rounded-2xl p-8 mb-12 backdrop-blur-sm shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-white font-semibold mb-3 text-lg">
                <Search className="inline w-5 h-5 mr-2 text-yellow-500" />
                Buscar {activeTab}
              </label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5 transition-colors group-focus-within:text-yellow-500" />
                <input
                  type="text"
                  placeholder={`Buscar ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:bg-zinc-800 transition-all duration-300 text-lg"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-500/0 to-yellow-600/0 group-focus-within:from-yellow-500/10 group-focus-within:to-yellow-600/10 transition-all duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-80">
              <label className="block text-white font-semibold mb-3 text-lg">
                <Filter className="inline w-5 h-5 mr-2 text-yellow-500" />
                Categoría
              </label>
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5 transition-colors group-focus-within:text-yellow-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:bg-zinc-800 transition-all duration-300 appearance-none text-lg cursor-pointer"
                >
                  <option value="all">Todas las categorías</option>
                  {getCategories().map(category => (
                    <option key={category} value={category} className="bg-zinc-800 text-white">
                      {category}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-zinc-400 group-focus-within:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-500/0 to-yellow-600/0 group-focus-within:from-yellow-500/10 group-focus-within:to-yellow-600/10 transition-all duration-300 pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems().map((item) => (
            <div key={item.id} className="group relative">
              {/* Card */}
              <div className="bg-gradient-to-br from-zinc-900/95 to-black/95 border border-yellow-600/30 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl transition-all duration-500 ease-in-out hover:border-yellow-500/50 hover:shadow-yellow-500/20 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
                
                {/* Image placeholder with gradient overlay */}
                <div className="relative h-56 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  
                  {/* Icon */}
                  <div className="relative z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                    {activeTab === 'productos' ? (
                      <ShoppingBag className="w-20 h-20 text-yellow-500 filter drop-shadow-lg" />
                    ) : (
                      <Scissors className="w-20 h-20 text-yellow-500 filter drop-shadow-lg" />
                    )}
                  </div>
                  
                  {/* Floating particles effect */}
                  <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-500/60 rounded-full animate-pulse"></div>
                  <div className="absolute bottom-6 right-6 w-1 h-1 bg-yellow-400/80 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-yellow-300/70 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>

                <div className="p-6">
                  {/* Category badge */}
                  {item.categoria && (
                    <span className="inline-block bg-gradient-to-r from-yellow-600 to-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-lg">
                      {item.categoria}
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="font-bold text-white mb-3 text-xl leading-tight group-hover:text-yellow-400 transition-colors duration-300">
                    {item.nombre}
                  </h3>

                  {/* Description */}
                  {item.descripcion && (
                    <p className="text-zinc-300 text-sm mb-4 leading-relaxed line-clamp-3">
                      {item.descripcion}
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 text-yellow-500 mr-2" />
                        <span className="text-2xl font-bold text-yellow-400">
                          {formatPrice(item.precio)}
                        </span>
                      </div>
                      {activeTab === 'servicios' && 'duracion' in item && (
                        <div className="flex items-center text-zinc-400">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">
                            {formatDuration(item.duracion)}
                          </span>
                        </div>
                      )}
                    </div>

                    {activeTab === 'productos' && 'stock' in item && (
                      <div className="flex items-center justify-between text-sm bg-zinc-800/50 rounded-lg p-3">
                        <span className="text-zinc-400 font-medium">Stock disponible:</span>
                        <span className={`font-bold flex items-center ${
                          item.stock > 10 ? 'text-green-400' : 
                          item.stock > 0 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            item.stock > 10 ? 'bg-green-400' : 
                            item.stock > 0 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                          {item.stock > 0 ? `${item.stock} unidades` : 'Agotado'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="mt-6">
                    {activeTab === 'productos' && 'stock' in item ? (
                      <button
                        disabled={item.stock === 0}
                        className={`group/btn w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ease-in-out ${
                          item.stock > 0
                            ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95'
                            : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {item.stock > 0 ? (
                            <>
                              <Eye className="w-5 h-5 mr-2 transition-transform duration-300 group-hover/btn:scale-110" />
                              Consultar disponibilidad
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                              </svg>
                              Agotado
                            </>
                          )}
                        </div>
                      </button>
                    ) : (
                      <button className="group/btn w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-black py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95">
                        <div className="flex items-center justify-center">
                          <Scissors className="w-5 h-5 mr-2 transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12" />
                          Agendar servicio
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/0 to-yellow-600/0 group-hover:from-yellow-500/20 group-hover:to-yellow-600/20 transition-all duration-500 pointer-events-none blur-xl"></div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredItems().length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-20">
              <div className="bg-gradient-to-br from-zinc-900/95 to-black/95 border border-yellow-600/30 rounded-3xl p-12 max-w-md mx-auto backdrop-blur-sm shadow-2xl">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-full blur-2xl"></div>
                  <div className="relative text-yellow-500 mb-6">
                    {activeTab === 'productos' ? (
                      <Package className="w-24 h-24 mx-auto filter drop-shadow-lg" />
                    ) : (
                      <Scissors className="w-24 h-24 mx-auto filter drop-shadow-lg" />
                    )}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  No se encontraron {activeTab}
                </h3>
                
                <p className="text-zinc-300 text-lg leading-relaxed mb-8">
                  {searchTerm || selectedCategory !== 'all'
                    ? 'Intenta ajustar los filtros de búsqueda para encontrar lo que buscas'
                    : `No hay ${activeTab} disponibles en este momento. ¡Vuelve pronto para ver las novedades!`}
                </p>
                
                {(searchTerm || selectedCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="group flex items-center justify-center mx-auto px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/30 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95"
                  >
                    <svg className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProductsServices;