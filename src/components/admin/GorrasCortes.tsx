import React, { useState, useEffect } from 'react';
import ModalComponent from './ModalComponent';
import CustomNotification from './CustomNotification';

const GorrasCortes = () => {
  // Función para generar URLs dinámicas que funciona en todos los dispositivos
  const getStorageUrl = (path) => {
    if (!path) {
      console.warn('getStorageUrl: path is empty');
      return '';
    }
    // Usar window.API_BASE_URL que ya está configurado dinámicamente
    const baseUrl = window.API_BASE_URL || 'http://localhost:8001/api';
    // Remover /api del final si existe
    const apiUrl = baseUrl.replace('/api', '');
    const url = `${apiUrl}/storage/${path}`;
    console.log('Image URL:', url);
    return url;
  };

  const [activeTab, setActiveTab] = useState('gorras');
  const [gorras, setGorras] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('gorras'); // 'gorras' o 'cortes'
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successType, setSuccessType] = useState('success');
  const [imagePreviewModal, setImagePreviewModal] = useState({ show: false, images: [], currentIndex: 0 });
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, type: '' });

  // Estados del formulario para gorras
  const [gorraFormData, setGorraFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    imagenes: [],
    colores: [],
    tags: [],
    destacado: false,
    activo: true
  });

  // Estados del formulario para cortes
  const [corteFormData, setCorteFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    imagenes: [],
    tags: [],
    destacado: false,
    activo: true
  });

  const [imagePreviews, setImagePreviews] = useState([]);
  const [newColor, setNewColor] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const showSuccessMessage = (message, type = 'success') => {
    setSuccessMessage(message);
    setSuccessType(type);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 3000);
  };

  const showNotification = (title, message, type = 'info', onConfirm = null) => {
    setNotification({ show: true, title, message, type, onConfirm });
  };

  const hideNotification = () => {
    setNotification({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar gorras y cortes por separado
      const [gorrasResponse, cortesResponse] = await Promise.all([
        window.authenticatedFetch(`${window.API_BASE_URL}/gorras`),
        window.authenticatedFetch(`${window.API_BASE_URL}/cortes`)
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
      console.error('Error cargando datos:', error);
      setError('Error al cargar los elementos');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentFormData = () => {
    return modalType === 'gorras' ? gorraFormData : corteFormData;
  };

  const setCurrentFormData = (data) => {
    if (modalType === 'gorras') {
      setGorraFormData(data);
    } else {
      setCorteFormData(data);
    }
  };

  const resetFormData = () => {
    setGorraFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      imagenes: [],
      colores: [],
      tags: [],
      destacado: false,
      activo: true
    });
    setCorteFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      imagenes: [],
      tags: [],
      destacado: false,
      activo: true
    });
    setImagePreviews([]);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const currentData = getCurrentFormData();
      setCurrentFormData({ ...currentData, imagenes: [...currentData.imagenes, ...files] });
      
      // Crear previews para las nuevas imágenes
      const newPreviews = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target.result);
          if (newPreviews.length === files.length) {
            setImagePreviews(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  const removeImage = (index) => {
    const currentData = getCurrentFormData();
    const newImagenes = currentData.imagenes.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setCurrentFormData({ ...currentData, imagenes: newImagenes });
    setImagePreviews(newPreviews);
  };

  const removeExistingImage = (imageIndex) => {
    if (!editingItem || !editingItem.imagenes || imageIndex >= editingItem.imagenes.length) {
      return;
    }

    showNotification(
      'Eliminar imagen',
      '¿Estás seguro de que quieres eliminar esta imagen? Esta acción no se puede deshacer.',
      'warning',
      () => confirmRemoveImage(imageIndex)
    );
  };

  const confirmRemoveImage = async (imageIndex) => {
    try {
      const endpoint = modalType === 'gorras' ? 'gorras' : 'cortes';
      const response = await window.authenticatedFetch(
        `${window.API_BASE_URL}/${endpoint}/${editingItem.id}/remove-image/${imageIndex}`,
        { method: 'DELETE' }
      );
      
      if (response?.ok) {
        const data = await response.json();
        if (data.success) {
          // Actualizar el item editado localmente
          const updatedImages = [...editingItem.imagenes];
          updatedImages.splice(imageIndex, 1);
          setEditingItem({ ...editingItem, imagenes: updatedImages });
          
          showNotification(
            'Imagen eliminada',
            'La imagen se eliminó correctamente',
            'success'
          );
          loadData(); // Recargar datos para mantener sincronización
        } else {
          throw new Error(data.message || 'Error al eliminar imagen');
        }
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification(
        'Error al eliminar imagen',
        error.message,
        'error'
      );
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    
    if (item) {
      const formData = {
        nombre: item.nombre || '',
        descripcion: item.descripcion || '',
        precio: item.precio || '',
        imagenes: [], // Solo para nuevas imágenes
        tags: item.tags || [],
        destacado: item.destacado || false,
        activo: item.activo !== undefined ? item.activo : true
      };
      
      if (type === 'gorras') {
        formData.colores = item.colores || [];
        setGorraFormData(formData);
      } else {
        setCorteFormData(formData);
      }
      
      // Limpiar previews de nuevas imágenes al abrir modal de edición
      setImagePreviews([]);
    } else {
      resetFormData();
    }
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    resetFormData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const currentData = getCurrentFormData();
      const formDataToSend = new FormData();
      
      formDataToSend.append('nombre', currentData.nombre);
      formDataToSend.append('descripcion', currentData.descripcion);
      formDataToSend.append('precio', currentData.precio);
      
      // Para edición: solo agregar nuevas imágenes si las hay
      // Para creación: siempre agregar las imágenes seleccionadas
      // IMPORTANTE: Solo añadir imágenes si son archivos válidos (File objects)
      if (currentData.imagenes && currentData.imagenes.length > 0) {
        currentData.imagenes.forEach((imagen) => {
          // Verificar que sea un objeto File válido antes de añadirlo
          if (imagen instanceof File) {
            formDataToSend.append(`imagenes[]`, imagen);
          }
        });
      }
      // NO enviar campo imagenes vacío - Laravel lo intentará validar y fallará
      
      // Para gorras, agregar colores
      if (modalType === 'gorras') {
        if (currentData.colores && currentData.colores.length > 0) {
          // Enviar cada color individualmente con la notación colores[]
          currentData.colores.forEach((color) => {
            formDataToSend.append('colores[]', color);
          });
        } else {
          // Si no hay colores, enviar como JSON string vacío
          formDataToSend.append('colores', JSON.stringify([]));
        }
      }
      
      // Agregar tags
      if (currentData.tags && currentData.tags.length > 0) {
        // Enviar cada tag individualmente con la notación tags[]
        currentData.tags.forEach((tag) => {
          formDataToSend.append('tags[]', tag);
        });
      } else {
        // Si no hay tags, enviar como JSON string vacío
        formDataToSend.append('tags', JSON.stringify([]));
      }
      
      formDataToSend.append('destacado', currentData.destacado ? '1' : '0');
      formDataToSend.append('activo', currentData.activo ? '1' : '0');
      
      let response;
      const endpoint = modalType === 'gorras' ? 'gorras' : 'cortes';
      
      if (editingItem) {
        // Actualizar
        formDataToSend.append('_method', 'PUT');
        response = await window.authenticatedFetch(
          `${window.API_BASE_URL}/${endpoint}/${editingItem.id}`,
          {
            method: 'POST',
            body: formDataToSend,
            headers: {
              'Authorization': `Bearer ${window.getAuthToken()}`,
              'Accept': 'application/json'
              // NO especificar Content-Type para FormData - el navegador lo añade automáticamente con el boundary correcto
            }
          }
        );
      } else {
        // Crear
        response = await window.authenticatedFetch(
          `${window.API_BASE_URL}/${endpoint}`,
          {
            method: 'POST',
            body: formDataToSend,
            headers: {
              'Authorization': `Bearer ${window.getAuthToken()}`,
              'Accept': 'application/json'
              // NO especificar Content-Type para FormData - el navegador lo añade automáticamente con el boundary correcto
            }
          }
        );
      }
      
      if (response?.ok) {
        const data = await response.json();
        if (data.success) {
          showSuccessMessage(
            editingItem ? `${modalType === 'gorras' ? 'Gorra' : 'Corte'} actualizado exitosamente` : `${modalType === 'gorras' ? 'Gorra' : 'Corte'} creado exitosamente`
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
    } catch (error) {
      console.error('Error:', error);
      showSuccessMessage('Error: ' + error.message, 'error');
    }
  };

  const handleDelete = (id) => {
    const itemType = activeTab === 'gorras' ? 'gorra' : 'corte';
    const currentItems = activeTab === 'gorras' ? gorras : cortes;
    const item = currentItems.find(item => item.id === id);
    
    showNotification(
      `Eliminar ${itemType}`,
      `¿Estás seguro de que quieres eliminar "${item?.nombre || itemType}"? Esta acción no se puede deshacer.`,
      'confirm',
      () => confirmDelete(id)
    );
  };

  const confirmDelete = async (id) => {
    try {
      const endpoint = activeTab === 'gorras' ? 'gorras' : 'cortes';
      const response = await window.authenticatedFetch(
        `${window.API_BASE_URL}/${endpoint}/${id}`,
        { method: 'DELETE' }
      );
      
      if (response?.ok) {
        const data = await response.json();
        if (data.success) {
          showNotification(
            'Eliminado exitosamente',
            `${activeTab === 'gorras' ? 'Gorra' : 'Corte'} eliminado correctamente`,
            'success'
          );
          loadData();
        } else {
          throw new Error(data.message || 'Error al eliminar');
        }
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification(
        'Error al eliminar',
        error.message,
        'error'
      );
    }
  };

  const toggleStatus = async (id) => {
    try {
      const endpoint = activeTab === 'gorras' ? 'gorras' : 'cortes';
      const response = await window.authenticatedFetch(
        `${window.API_BASE_URL}/${endpoint}/${id}/toggle-status`,
        { method: 'PATCH' }
      );
      
      if (response?.ok) {
        const data = await response.json();
        if (data.success) {
          showSuccessMessage('Estado actualizado exitosamente');
          loadData();
        } else {
          throw new Error(data.message || 'Error al cambiar estado');
        }
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error:', error);
      showSuccessMessage('Error: ' + error.message, 'error');
    }
  };

  const addColor = () => {
    if (newColor.trim() && !gorraFormData.colores.includes(newColor.trim())) {
      setGorraFormData({
        ...gorraFormData,
        colores: [...gorraFormData.colores, newColor.trim()]
      });
      setNewColor('');
    }
  };

  const removeColor = (colorToRemove) => {
    setGorraFormData({
      ...gorraFormData,
      colores: gorraFormData.colores.filter(color => color !== colorToRemove)
    });
  };

  const addTag = () => {
    const currentData = getCurrentFormData();
    if (newTag.trim() && !currentData.tags.includes(newTag.trim())) {
      setCurrentFormData({
        ...currentData,
        tags: [...currentData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    const currentData = getCurrentFormData();
    setCurrentFormData({
      ...currentData,
      tags: currentData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const openImagePreview = (images, index = 0) => {
    setImagePreviewModal({ show: true, images, currentIndex: index });
  };

  const closeImagePreview = () => {
    setImagePreviewModal({ show: false, images: [], currentIndex: 0 });
  };

  const nextImage = () => {
    setImagePreviewModal(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  };

  const prevImage = () => {
    setImagePreviewModal(prev => ({
      ...prev,
      currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1
    }));
  };

  const getCurrentItems = () => {
    const items = activeTab === 'gorras' ? gorras : cortes;
    if (!searchTerm) return items;
    
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const currentItems = getCurrentItems();
  const currentFormData = getCurrentFormData();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gestión de Gorras y Cortes</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('gorras')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'gorras'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Gorras ({gorras.length})
        </button>
        <button
          onClick={() => setActiveTab('cortes')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'cortes'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Cortes ({cortes.length})
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          onClick={() => openModal(activeTab)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar {activeTab === 'gorras' ? 'Gorra' : 'Corte'}
        </button>
        
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder={`Buscar ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-lg">
                No hay {activeTab} disponibles
              </div>
              <p className="text-gray-500 mt-2">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : `Agrega tu primer ${activeTab.slice(0, -1)}`}
              </p>
            </div>
          ) : (
            currentItems.map((item) => (
              <div key={item.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
                {/* Imagen */}
                <div className="relative h-48 bg-gray-700">
                  {item.imagenes && item.imagenes.length > 0 ? (
                    <img
                      src={getStorageUrl(item.imagenes[0])}
                      alt={item.nombre}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openImagePreview(
                        item.imagenes.map(img => getStorageUrl(img)),
                        0
                      )}
                      onError={(e) => {
                        console.error('Error loading image:', getStorageUrl(item.imagenes[0]));
                        console.error('Item data:', item);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p class="text-xs mt-2">Error al cargar imagen</p>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    {item.destacado && (
                      <span className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-medium">
                        Destacado
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.activo ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-2 truncate">{item.nombre}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.descripcion}</p>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-red-400 font-bold text-lg">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(item.precio)}
                    </span>
                  </div>

                  {/* Colores (solo para gorras) */}
                  {activeTab === 'gorras' && item.colores && item.colores.length > 0 && (
                    <div className="mb-3">
                      <p className="text-gray-400 text-xs mb-1">Colores:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.colores.slice(0, 3).map((color, index) => (
                          <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                            {color}
                          </span>
                        ))}
                        {item.colores.length > 3 && (
                          <span className="text-gray-500 text-xs">+{item.colores.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mb-3">
                      <p className="text-gray-400 text-xs mb-1">Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                        {item.tags.length > 2 && (
                          <span className="text-gray-500 text-xs">+{item.tags.length - 2}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(activeTab, item)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors duration-200"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleStatus(item.id)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors duration-200 ${
                        item.activo
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {item.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal para agregar/editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingItem ? 'Editar' : 'Agregar'} {modalType === 'gorras' ? 'Gorra' : 'Corte'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentFormData.nombre}
                    onChange={(e) => setCurrentFormData({ ...currentFormData, nombre: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={`Nombre del ${modalType === 'gorras' ? 'gorra' : 'corte'}`}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={currentFormData.descripcion}
                    onChange={(e) => setCurrentFormData({ ...currentFormData, descripcion: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Descripción detallada"
                  />
                </div>

                {/* Precio */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Precio (COP) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={currentFormData.precio}
                      onChange={(e) => setCurrentFormData({ ...currentFormData, precio: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="50000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Ingrese el precio en pesos colombianos (sin decimales)</p>
                </div>

                {/* Imágenes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Imágenes {!editingItem && '*'}
                  </label>
                  
                  {/* Imágenes existentes (solo en modo edición) */}
                  {editingItem && editingItem.imagenes && editingItem.imagenes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Imágenes actuales ({editingItem.imagenes.length}):</p>
                      <div className="grid grid-cols-3 gap-4">
                        {editingItem.imagenes.map((imagen, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={getStorageUrl(imagen)}
                              alt={`Imagen actual ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer transition-opacity group-hover:opacity-75"
                              onClick={() => openImagePreview(
                                editingItem.imagenes.map(img => getStorageUrl(img)),
                                index
                              )}
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZMMTAuNTg2IDkuNDE0QzExLjM2NyA4LjYzMyAxMi42MzMgOC42MzMgMTMuNDE0IDkuNDE0TDE2IDEyTTE0IDEwTDE1LjU4NiA4LjQxNEMxNi4zNjcgNy42MzMgMTcuNjMzIDcuNjMzIDE4LjQxNCA4LjQxNEwyMCAxME0xNCA2SDE0LjAxTTYgMjBIMThBMiAyIDAgMDAyMCAxOFY2QTIgMiAwIDAwMTggNEg2QTIgMiAwIDAwNCA2VjE4QTIgMiAwIDAwNiAyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                                e.target.className = 'w-full h-24 object-contain rounded-lg bg-gray-600 p-4';
                              }}
                            />
                            <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {index + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute -top-2 -left-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                              title="Eliminar imagen"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-600 file:text-white hover:file:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  
                  {/* Preview de nuevas imágenes */}
                  {imagePreviews.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400 mb-2">Nuevas imágenes a agregar:</p>
                      <div className="grid grid-cols-3 gap-4">
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
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 transition-colors duration-200"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Colores (solo para gorras) */}
                {modalType === 'gorras' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Colores
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Agregar color"
                      />
                      <button
                        type="button"
                        onClick={addColor}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {gorraFormData.colores.map((color, index) => (
                        <span
                          key={index}
                          className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {color}
                          <button
                            type="button"
                            onClick={() => removeColor(color)}
                            className="text-red-400 hover:text-red-300 transition-colors duration-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Agregar tag"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentFormData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-red-400 hover:text-red-300 transition-colors duration-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentFormData.destacado}
                      onChange={(e) => setCurrentFormData({ ...currentFormData, destacado: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                    />
                    Destacado
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentFormData.activo}
                      onChange={(e) => setCurrentFormData({ ...currentFormData, activo: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                    />
                    Activo
                  </label>
                </div>

                {/* Botones */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors duration-200"
                  >
                    {editingItem ? 'Actualizar' : 'Crear'} {modalType === 'gorras' ? 'Gorra' : 'Corte'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de preview de imágenes */}
      {imagePreviewModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={imagePreviewModal.images[imagePreviewModal.currentIndex]}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Controles */}
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all duration-200"
            >
              ×
            </button>
            
            {imagePreviewModal.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all duration-200"
                >
                  ‹
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all duration-200"
                >
                  ›
                </button>
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {imagePreviewModal.currentIndex + 1} / {imagePreviewModal.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      <ModalComponent
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successType === 'success' ? 'Éxito' : 'Error'}
        type={successType}
      >
        <p className="text-gray-300">{successMessage}</p>
      </ModalComponent>

      {/* Notificación personalizada */}
      <CustomNotification
        isOpen={notification.show}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onConfirm={notification.onConfirm}
        onClose={hideNotification}
      />
    </div>
  );
};

export default GorrasCortes;