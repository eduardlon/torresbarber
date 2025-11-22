import React, { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useModal } from '../../hooks/useModal.tsx';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

// Componente optimizado para carga lazy de imágenes
const LazyImage = ({ src, alt, className, onClick }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={() => setIsLoaded(true)}
          onClick={onClick}
          loading="lazy"
        />
      )}
      {!isLoaded && isInView && (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

interface GalleryItem {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number | string;
  imagenes: string[];
  imagen?: string;
  colores?: string[];
  tags?: string[];
  destacado: boolean;
  activo: boolean;
}

const Galeria = () => {
  // Función para generar URLs dinámicas que funciona en todos los dispositivos
  const getStorageUrl = (path: string) => {
    // Usar la IP de la red local para que funcione en todos los dispositivos
    const apiHost = '192.168.1.92'; // IP fija de la red local
    return `http://${apiHost}:8001/storage/${path}`;
  };

  const [gorras, setGorras] = useState<GalleryItem[]>([]);
  const [cortes, setCortes] = useState<GalleryItem[]>([]);
  const [activeTab, setActiveTab] = useState('gorras');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'gorras' o 'cortes'
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { showSuccessModal, showConfirmModal, ModalComponent } = useModal();

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    imagenes: [] as File[],
    colores: [] as string[],
    tags: [] as string[],
    destacado: false,
    activo: true
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);


  const coloresDisponibles = [
    'Negro', 'Blanco', 'Gris', 'Azul', 'Rojo', 'Verde',
    'Amarillo', 'Rosa', 'Morado', 'Naranja', 'Beige', 'Marrón'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar gorras y cortes por separado
      const [gorrasResponse, cortesResponse] = await Promise.all([
        (window as any).authenticatedFetch(`${(window as any).API_BASE_URL}/galeria/gorras`),
        (window as any).authenticatedFetch(`${(window as any).API_BASE_URL}/galeria/cortes`)
      ]);

      if (gorrasResponse?.ok) {
        const gorrasData = await gorrasResponse.json();
        if (gorrasData.success) {
          setGorras(gorrasData.data || []);
        }
      }

      if (cortesResponse?.ok) {
        const cortesData = await cortesResponse.json();
        if (cortesData.success) {
          setCortes(cortesData.data || []);
        }
      }
    } catch (error) {
      console.error('Error cargando galería:', error);
      setError('Error al cargar los elementos de la galería');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFormData({ ...formData, imagenes: [...formData.imagenes, ...files] });

      // Crear previews para las nuevas imágenes
      const newPreviews: string[] = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            if (newPreviews.length === files.length) {
              setImagePreviews(prev => [...prev, ...newPreviews]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    const newImagenes = formData.imagenes.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setFormData({ ...formData, imagenes: newImagenes });
    setImagePreviews(newPreviews);
  };

  const openModal = (type: string, item: GalleryItem | null = null) => {
    setModalType(type);
    setEditingItem(item);

    if (item) {
      setFormData({
        nombre: item.nombre || '',
        descripcion: item.descripcion || '',
        precio: item.precio.toString() || '',
        imagenes: [],
        colores: item.colores || [],
        tags: item.tags || [],
        destacado: item.destacado || false,
        activo: item.activo !== undefined ? item.activo : true
      });
      // Mostrar imágenes existentes como previews
      if (item.imagenes && item.imagenes.length > 0) {
        setImagePreviews(item.imagenes.map(img => getStorageUrl(img)));
      } else if (item.imagen) {
        // Compatibilidad con el formato anterior
        setImagePreviews([getStorageUrl(item.imagen)]);
      } else {
        setImagePreviews([]);
      }
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        precio: '',
        imagenes: [],
        colores: [],
        tags: [],
        destacado: false,
        activo: true
      });
      setImagePreviews([]);
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      imagenes: [],
      colores: [],
      tags: [],
      destacado: false,
      activo: true
    });
    setImagePreviews([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('descripcion', formData.descripcion);
      formDataToSend.append('precio', formData.precio);
      formDataToSend.append('categoria', modalType);

      // Solo agregar imágenes si hay archivos nuevos seleccionados
      if (formData.imagenes && formData.imagenes.length > 0) {
        formData.imagenes.forEach((imagen, index) => {
          formDataToSend.append(`imagenes[]`, imagen);
        });
      }

      // Enviar colores como array
      if (formData.colores.length > 0) {
        formData.colores.forEach((color, index) => {
          formDataToSend.append(`colores[${index}]`, color);
        });
      }

      // Enviar tags como array
      if (formData.tags.length > 0) {
        formData.tags.forEach((tag, index) => {
          formDataToSend.append(`tags[${index}]`, tag);
        });
      }

      formDataToSend.append('destacado', formData.destacado ? '1' : '0');
      formDataToSend.append('activo', formData.activo ? '1' : '0');

      let response;
      if (editingItem) {
        // Actualizar - usar PUT method
        formDataToSend.append('_method', 'PUT');
        response = await (window as any).authenticatedFetch(
          `${(window as any).API_BASE_URL}/galeria/${editingItem.id}`,
          {
            method: 'POST',
            body: formDataToSend,
            headers: {
              'Authorization': `Bearer ${(window as any).getAuthToken()}`,
              'Accept': 'application/json'
            }
          }
        );
      } else {
        // Crear
        response = await (window as any).authenticatedFetch(
          `${(window as any).API_BASE_URL}/galeria`,
          {
            method: 'POST',
            body: formDataToSend,
            headers: {
              'Authorization': `Bearer ${(window as any).getAuthToken()}`,
              'Accept': 'application/json'
            }
          }
        );
      }

      if (response?.ok) {
        const data = await response.json();
        if (data.success) {
          showSuccessModal(
            editingItem ? 'Elemento actualizado exitosamente' : 'Elemento creado exitosamente'
          );
          closeModal();
          loadData();
        } else {
          throw new Error(data.message || 'Error al procesar la solicitud');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      showSuccessModal('Error: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirmModal(
      '¿Estás seguro de que quieres eliminar este elemento?',
      'Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      try {
        const response = await (window as any).authenticatedFetch(
          `${(window as any).API_BASE_URL}/galeria/${id}`,
          { method: 'DELETE' }
        );

        if (response?.ok) {
          const data = await response.json();
          if (data.success) {
            showSuccessModal('Elemento eliminado exitosamente');
            loadData();
          } else {
            throw new Error(data.message);
          }
        } else {
          throw new Error('Error de conexión');
        }
      } catch (error: any) {
        console.error('Error:', error);
        showSuccessModal('Error al eliminar: ' + error.message, 'error');
      }
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      const response = await (window as any).authenticatedFetch(
        `${(window as any).API_BASE_URL}/galeria/${id}/toggle-status`,
        { method: 'PATCH' }
      );

      if (response?.ok) {
        const data = await response.json();
        if (data.success) {
          showSuccessModal('Estado actualizado exitosamente');
          loadData();
        } else {
          throw new Error(data.message);
        }
      } else {
        throw new Error('Error de conexión');
      }
    } catch (error: any) {
      console.error('Error:', error);
      showSuccessModal('Error al cambiar estado: ' + error.message, 'error');
    }
  };

  const openImageModal = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setIsImageModalOpen(true);
  };

  const getCurrentItems = () => {
    const items = activeTab === 'gorras' ? gorras : cortes;

    if (!searchTerm) return items;

    return items.filter(item =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags && item.tags.some(tag =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  };

  const handleColorToggle = (color: string) => {
    const newColors = formData.colores.includes(color)
      ? formData.colores.filter(c => c !== color)
      : [...formData.colores, color];
    setFormData({ ...formData, colores: newColors });
  };

  const handleTagAdd = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const currentItems = getCurrentItems();

  return (
    <div className="space-y-6">
      {/* Header con tabs y botones de acción */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('gorras')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'gorras'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-300 hover:text-white'
              }`}
          >
            Gorras ({gorras.length})
          </button>
          <button
            onClick={() => setActiveTab('cortes')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'cortes'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-300 hover:text-white'
              }`}
          >
            Cortes ({cortes.length})
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => openModal('gorras')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Gorra
          </button>
          <button
            onClick={() => openModal('cortes')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Corte
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <input
          type="text"
          placeholder={`Buscar ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Grid de elementos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentItems.map((item) => (
          <div key={item.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <div className="relative h-48">
              {item.imagenes && item.imagenes.length > 0 ? (
                <div className="relative w-full h-full">
                  <LazyImage
                    src={getStorageUrl(item.imagenes[0])}
                    alt={item.nombre}
                    className="w-full h-full"
                    onClick={() => openImageModal(getStorageUrl(item.imagenes[0]))}
                  />
                  {item.imagenes.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      +{item.imagenes.length - 1} más
                    </div>
                  )}
                </div>
              ) : item.imagen ? (
                <LazyImage
                  src={getStorageUrl(item.imagen)}
                  alt={item.nombre}
                  className="w-full h-full"
                  onClick={() => openImageModal(getStorageUrl(item.imagen))}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {item.destacado && (
                  <span className="bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-medium">
                    Destacado
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.activo ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                  {item.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Precio */}
              <div className="absolute top-2 right-2">
                <span className="bg-black/70 text-white text-sm px-2 py-1 rounded">
                  ${item.precio}
                </span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-white font-semibold text-lg mb-2 truncate">{item.nombre}</h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.descripcion}</p>

              {/* Información adicional */}
              <div className="space-y-2 mb-4">


                {item.colores && item.colores.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Colores:</span>
                    <div className="flex gap-1">
                      {item.colores.slice(0, 3).map((color, index) => (
                        <span key={index} className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                          {color}
                        </span>
                      ))}
                      {item.colores.length > 3 && (
                        <span className="text-xs text-gray-500">+{item.colores.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(activeTab, item)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleStatus(item.id)}
                  className={`flex-1 text-sm px-3 py-2 rounded transition-colors ${item.activo
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  {item.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded transition-colors"
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

      {/* Mensaje cuando no hay elementos */}
      {currentItems.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-300">
            No hay {activeTab} {searchTerm ? 'que coincidan con la búsqueda' : 'registrados'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : `Comienza agregando ${activeTab === 'gorras' ? 'una gorra' : 'un corte'}`}
          </p>
        </div>
      )}

      {/* Modal de formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingItem ? 'Editar' : 'Agregar'} {modalType === 'gorras' ? 'Gorra' : 'Corte'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder={`Nombre del ${modalType === 'gorras' ? 'gorra' : 'corte'}`}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Descripción detallada"
                  />
                </div>

                {/* Precio */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Precio *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="0.00"
                  />
                </div>

                {/* Imágenes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Imágenes {!editingItem && '*'} {modalType === 'gorras' && '(Múltiples permitidas)'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple={modalType === 'gorras'}
                    onChange={handleImageChange}
                    required={!editingItem && imagePreviews.length === 0}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  {imagePreviews.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {modalType === 'gorras' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Puedes seleccionar múltiples imágenes para las gorras
                    </p>
                  )}
                </div>



                {/* Colores */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Colores disponibles
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {coloresDisponibles.map(color => (
                      <label key={color} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.colores.includes(color)}
                          onChange={() => handleColorToggle(color)}
                          className="rounded border-gray-600 text-yellow-400 focus:ring-yellow-400"
                        />
                        <span className="text-sm text-gray-300">{color}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="bg-blue-600 text-white text-sm px-2 py-1 rounded flex items-center gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleTagRemove(tag)}
                          className="text-blue-200 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Agregar tag y presionar Enter"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTagAdd((e.target as HTMLInputElement).value.trim());
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex gap-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.destacado}
                      onChange={(e) => setFormData({ ...formData, destacado: e.target.checked })}
                      className="rounded border-gray-600 text-yellow-400 focus:ring-yellow-400"
                    />
                    <span className="text-sm text-gray-300">Destacado</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="rounded border-gray-600 text-green-400 focus:ring-green-400"
                    />
                    <span className="text-sm text-gray-300">Activo</span>
                  </label>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-2 px-4 rounded-lg transition-colors font-medium"
                  >
                    {editingItem ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de imagen */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setIsImageModalOpen(false)}>
          <div className="max-w-4xl max-h-full">
            <img
              src={selectedImage || ''}
              alt="Vista ampliada"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      <ModalComponent />
    </div>
  );
};

export default Galeria;