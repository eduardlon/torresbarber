import React, { useState, useEffect } from 'react';
import { useModal } from '../../hooks/useModal.tsx';
import { supabaseService } from '../../services/supabaseService';

type ProductoItem = {
  id: string | number;
  nombre: string;
  precio: number;
  categoria?: string | null;
  stock?: number | null;
  stock_actual?: number | null;
  stock_minimo?: number | null;
  activo: boolean;
};

type ServicioItem = {
  id: string | number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  activo: boolean;
};

type FormData = {
  nombre: string;
  precio: string;
  categoria: string;
  stock: string;
  activo: boolean;
  descripcion: string;
};

type ModalType = 'producto' | 'servicio';

const Productos = () => {
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [servicios, setServicios] = useState<ServicioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('productos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('producto');
  const [editingItem, setEditingItem] = useState<ProductoItem | ServicioItem | null>(null);
  
  const { ModalComponent, showSuccessModal, showConfirmModal } = useModal();
  
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    precio: '',
    categoria: '',
    stock: '',
    activo: true,
    descripcion: ''
  });

  const categoriasProductos = [
    'Cuidado del Cabello',
    'Cuidado de la Barba',
    'Herramientas',
    'Accesorios',
    'Productos de Peinado'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [productosResult, serviciosResult] = await Promise.all([
        supabaseService.getProductos(),
        supabaseService.getServicios()
      ]);

      if (productosResult.error) {
        setError(productosResult.error);
        setProductos([]);
      } else {
        setProductos((productosResult.data || []) as ProductoItem[]);
      }

      if (serviciosResult.error) {
        setError((prev) => prev || serviciosResult.error || '');
        setServicios([]);
      } else {
        setServicios((serviciosResult.data || []) as ServicioItem[]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let nextValue: string | boolean = value;

    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      nextValue = e.target.checked;
    }

    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const openModal = (type: ModalType, item: ProductoItem | ServicioItem | null = null) => {
    setModalType(type);
    setEditingItem(item);
    if (item) {
      if (type === 'producto') {
        const producto = item as ProductoItem;
        setFormData({
          nombre: producto.nombre,
          precio: producto.precio.toString(),
          categoria: producto.categoria ?? '',
          stock: (producto.stock_actual ?? producto.stock) != null ? String(producto.stock_actual ?? producto.stock) : '',
          activo: producto.activo,
          descripcion: ''
        });
      } else {
        const servicio = item as ServicioItem;
        setFormData({
          nombre: servicio.nombre,
          precio: servicio.precio.toString(),
          categoria: '',
          stock: '',
          activo: servicio.activo,
          descripcion: servicio.descripcion ?? ''
        });
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      precio: '',
      categoria: '',
      stock: '',
      activo: true,
      descripcion: ''
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const parsedPrice = Number.parseFloat(formData.precio);
      if (!Number.isFinite(parsedPrice)) {
        setError('El precio ingresado no es válido.');
        return;
      }

      if (modalType === 'producto') {
        const parsedStockRaw = Number.parseInt(formData.stock, 10);
        const parsedStock = Number.isNaN(parsedStockRaw) ? null : parsedStockRaw;

        // La tabla public.productos solo tiene: nombre, descripcion, precio,
        // stock_actual, stock_minimo, codigo_barras, activo, created_at, updated_at.
        // No existe la columna "categoria", por eso el POST devolvía 400.
        const productPayload = {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          precio: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          stock_actual: parsedStock,
          stock_minimo: 0,
          activo: formData.activo,
        };

        const result = editingItem
          ? await supabaseService.updateProducto(editingItem.id, productPayload)
          : await supabaseService.createProducto(productPayload);

        if (result.error) {
          setError(result.error);
          return;
        }

        await loadData();
        showSuccessModal('Éxito', editingItem ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
      } else {
        // Servicios
        const servicioPayload = {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          precio: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          duracion_minutos: 30,
          activo: formData.activo,
        };

        const result = editingItem
          ? await supabaseService.updateServicio(String(editingItem.id), servicioPayload)
          : await supabaseService.createServicio(servicioPayload);

        if (result.error) {
          setError(result.error);
          return;
        }

        await loadData();
        showSuccessModal('Éxito', editingItem ? 'Servicio actualizado exitosamente' : 'Servicio creado exitosamente');
      }

      closeModal();
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setError('Error al procesar la solicitud');
    }
  };

  const handleDelete = (type: ModalType, id: string | number) => {
    const items = type === 'producto' ? productos : servicios;
    const item = items.find(i => i.id === id);
    
    showConfirmModal(
      `Eliminar ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      `¿Estás seguro de que quieres eliminar "${item?.nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          if (type === 'producto') {
            const result = await supabaseService.deleteProducto(id);
            if (result.error) {
              setError(result.error);
              return;
            }
            await loadData();
            showSuccessModal('Éxito', 'Producto eliminado exitosamente');
          } else {
            const result = await supabaseService.deleteServicio(String(id));
            if (result.error) {
              setError(result.error);
              return;
            }
            await loadData();
            showSuccessModal('Éxito', 'Servicio eliminado exitosamente');
          }
        } catch (error) {
          console.error(`Error eliminando ${type}:`, error);
          setError(`Error al eliminar el ${type}`);
        }
      }
    );
  };

  const toggleStatus = async (type: ModalType, id: string | number) => {
    try {
      if (type === 'producto') {
        const result = await supabaseService.toggleProductoStatus(id);
        if (result.error) {
          setError(result.error);
          return;
        }
        await loadData();
        showSuccessModal('Éxito', 'Estado del producto actualizado exitosamente');
      } else {
        const result = await supabaseService.toggleServicioStatus(String(id));
        if (result.error) {
          setError(result.error);
          return;
        }
        await loadData();
        showSuccessModal('Éxito', 'Estado del servicio actualizado exitosamente');
      }
    } catch (error) {
      console.error(`Error cambiando estado del ${type}:`, error);
      setError(`Error al cambiar el estado del ${type}`);
    }
  };

  const updateStock = async (id: string | number, newStock: number) => {
    try {
      const result = await supabaseService.updateProductoStock(id, newStock);

      if (result.error) {
        setError(result.error);
        return;
      }

      await loadData();
      showSuccessModal('Éxito', 'Stock actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando stock:', error);
      setError('Error al actualizar el stock');
    }
  };

  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || producto.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredServicios = servicios.filter(servicio =>
    servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number | null | undefined) => {
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
            Gestión de Productos y Servicios
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-1">
            Administra tu inventario y servicios
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => openModal('producto')}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-red-500/25"
          >
            + Nuevo Producto
          </button>
          <button
            onClick={() => openModal('servicio')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-blue-500/25"
          >
            + Nuevo Servicio
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg backdrop-blur-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      )}

      {!loading && (
        <>
          {/* Tabs */}
          <div className="flex space-x-1 bg-black/40 p-1 rounded-lg border border-red-500/30">
            <button
              onClick={() => setActiveTab('productos')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'productos'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Productos ({productos.length})
            </button>
            <button
              onClick={() => setActiveTab('servicios')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'servicios'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Servicios ({servicios.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={`Buscar ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm sm:text-base"
              />
            </div>
            {activeTab === 'productos' && (
              <div className="sm:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm sm:text-base"
                >
                  <option value="all">Todas las categorías</option>
                  {categoriasProductos.map(categoria => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Products Grid */}
          {activeTab === 'productos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProductos.map((producto) => {
              const stockValue = (producto.stock_actual ?? producto.stock ?? 0) as number;
              const categoria = producto.categoria ?? 'Sin categoría';

              return (
                <div key={String(producto.id)} className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl border border-red-500/30 p-4 sm:p-6 shadow-lg backdrop-blur-sm hover:border-red-500/50 transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm sm:text-base mb-1 truncate">{producto.nombre}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">{categoria}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      producto.activo 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-green-400 font-bold text-sm sm:text-base">{formatCurrency(producto.precio)}</p>
                        <p className="text-gray-500 text-xs">Precio</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => updateStock(producto.id, Math.max(0, stockValue - 1))}
                            className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded text-xs flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <span className="text-blue-400 font-bold text-sm sm:text-base min-w-[2rem] text-center">{stockValue}</span>
                          <button
                            onClick={() => updateStock(producto.id, stockValue + 1)}
                            className="w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-gray-500 text-xs">Stock</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => openModal('producto', producto)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-md hover:shadow-red-500/25"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleStatus('producto', producto.id)}
                      className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-md ${
                        producto.activo
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white hover:shadow-yellow-500/25'
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white hover:shadow-green-500/25'
                      }`}
                    >
                      {producto.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete('producto', producto.id)}
                      className="px-3 py-2 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-lg text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-red-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Services Grid */}
          {activeTab === 'servicios' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredServicios.map((servicio) => (
                <div key={String(servicio.id)} className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl border border-blue-500/30 p-4 sm:p-6 shadow-lg backdrop-blur-sm hover:border-blue-500/50 transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm sm:text-base mb-1 truncate">{servicio.nombre}</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      servicio.activo 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>

                  <div className="mb-4">
                    {servicio.descripcion && (
                      <p className="text-gray-300 text-xs sm:text-sm mb-3 line-clamp-2">{servicio.descripcion}</p>
                    )}
                    <div className="text-center">
                      <div>
                        <p className="text-green-400 font-bold text-sm sm:text-base">{formatCurrency(servicio.precio)}</p>
                        <p className="text-gray-500 text-xs">Precio</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => openModal('servicio', servicio)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-md hover:shadow-blue-500/25"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleStatus('servicio', servicio.id)}
                      className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-md ${
                        servicio.activo
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white hover:shadow-yellow-500/25'
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white hover:shadow-green-500/25'
                      }`}
                    >
                      {servicio.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete('servicio', servicio.id)}
                      className="px-3 py-2 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-lg text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-red-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {((activeTab === 'productos' && filteredProductos.length === 0) ||
            (activeTab === 'servicios' && filteredServicios.length === 0)) && (
            <div className="text-center py-12 bg-gradient-to-r from-black/60 to-black/40 rounded-lg border border-red-500/30 shadow-lg backdrop-blur-sm">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-300 text-lg">No se encontraron {activeTab === 'productos' ? 'productos' : 'servicios'}</p>
              <p className="text-gray-500 text-sm mt-2">Intenta ajustar tu búsqueda o agrega un nuevo {activeTab === 'productos' ? 'producto' : 'servicio'}</p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-black/80 to-black/60 rounded-xl border border-red-500/30 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl backdrop-blur-sm">
            <div className="p-4 sm:p-6 border-b border-red-500/30">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  {editingItem ? 'Editar' : 'Nuevo'} {modalType === 'producto' ? 'Producto' : 'Servicio'}
                </h2>
                <button
                  onClick={closeModal}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-red-500/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm sm:text-base"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Precio (COP)</label>
                  <input
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm sm:text-base"
                    required
                  />
                </div>

                {modalType === 'producto' && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Stock</label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm sm:text-base"
                      required
                    />
                  </div>
                )}
              </div>

              {modalType === 'producto' ? (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Categoría
                  </label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleInputChange}
                    className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm sm:text-base"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categoriasProductos.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    placeholder="Descripción del servicio"
                    rows={3}
                    className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-sm sm:text-base"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-red-600 bg-black/40 border-red-500/30 rounded focus:ring-red-500 focus:ring-1"
                  />
                  <span className="text-gray-300 text-sm font-medium">
                    {modalType === 'producto' ? 'Producto' : 'Servicio'} activo
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-red-500/25"
                >
                  {editingItem ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-gray-500/25"
                >
                  Cancelar
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

export default Productos;