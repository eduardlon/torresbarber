// @ts-nocheck
import React, { useState, useEffect } from 'react';
import ModalComponent from './ModalComponent';
import CustomNotification from './CustomNotification';
import { supabaseService } from '../../services/supabaseService';
import type { GaleriaItem, GaleriaItemTipo, GaleriaItemPayload } from '../../services/supabaseService';

type TabKey = 'gorras' | 'cortes' | 'vapes';

type BaseFormData = {
  nombre: string;
  descripcion: string;
  precio: string;
  imagenes: (string | File)[];
  tags: string[];
  destacado: boolean;
  activo: boolean;
};

type GorraFormData = BaseFormData & {
  colores: string[];
};

type CorteFormData = BaseFormData;

type VapeFormData = BaseFormData & {
  sabores: string[];
  nicotina_mg: string;
  stock: string;
};

type ToastType = 'success' | 'error' | 'warning' | 'info';
type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

type NotificationState = {
  show: boolean;
  title: string;
  message: string;
  type: NotificationType;
  onConfirm: (() => void) | null;
};

type ImagePreviewState = {
  show: boolean;
  images: string[];
  currentIndex: number;
};

const TAB_LABELS: Record<TabKey, { singular: string; plural: string }> = {
  gorras: { singular: 'Gorra', plural: 'Gorras' },
  cortes: { singular: 'Corte', plural: 'Cortes' },
  vapes: { singular: 'Vape', plural: 'Vapes' },
};

const getTabLabel = (tab: TabKey, plural = false): string =>
  plural ? TAB_LABELS[tab].plural : TAB_LABELS[tab].singular;

const createEmptyGorraForm = (): GorraFormData => ({
  nombre: '',
  descripcion: '',
  precio: '',
  imagenes: [],
  colores: [],
  tags: [],
  destacado: false,
  activo: true,
});

const createEmptyCorteForm = (): CorteFormData => ({
  nombre: '',
  descripcion: '',
  precio: '',
  imagenes: [],
  tags: [],
  destacado: false,
  activo: true,
});

const createEmptyVapeForm = (): VapeFormData => ({
  nombre: '',
  descripcion: '',
  precio: '',
  imagenes: [],
  tags: [],
  sabores: [],
  nicotina_mg: '',
  stock: '',
  destacado: false,
  activo: true,
});

const GorrasCortes = (): JSX.Element => {
  // Función para generar URLs dinámicas que funciona en todos los dispositivos
  const getStorageUrl = (path: string | null | undefined): string => {
    if (!path) {
      console.warn('getStorageUrl: path is empty');
      return '';
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const apiWindow = window as typeof window & { API_BASE_URL?: string };
    const baseUrl = apiWindow.API_BASE_URL ?? 'http://localhost:8001/api';
    const apiUrl = baseUrl.replace('/api', '');
    return `${apiUrl}/storage/${path}`;
  };

  const tabToTipo: Record<TabKey, GaleriaItemTipo> = {
    gorras: 'gorra',
    cortes: 'corte',
    vapes: 'vape',
  };

  const tabs: TabKey[] = ['gorras', 'cortes', 'vapes'];

  const [activeTab, setActiveTab] = useState<TabKey>('gorras');
  const [gorras, setGorras] = useState<GaleriaItem[]>([]);
  const [cortes, setCortes] = useState<GaleriaItem[]>([]);
  const [vapes, setVapes] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<TabKey>('gorras');
  const [editingItem, setEditingItem] = useState<GaleriaItem | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [successType, setSuccessType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [imagePreviewModal, setImagePreviewModal] = useState<{ show: boolean; images: string[]; currentIndex: number }>({
    show: false,
    images: [],
    currentIndex: 0,
  });
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
    onConfirm: (() => void) | null;
  }>({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null; type: TabKey | null }>({
    show: false,
    id: null,
    type: null,
  });

  // Estados del formulario para gorras
  const [gorraFormData, setGorraFormData] = useState<GorraFormData>(createEmptyGorraForm());
  const [corteFormData, setCorteFormData] = useState<CorteFormData>(createEmptyCorteForm());
  const [vapeFormData, setVapeFormData] = useState<VapeFormData>(createEmptyVapeForm());

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [newColor, setNewColor] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  const [newSabor, setNewSabor] = useState<string>('');

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

      const [gorrasResult, cortesResult, vapesResult] = await Promise.all([
        supabaseService.getGaleriaItems('gorra'),
        supabaseService.getGaleriaItems('corte'),
        supabaseService.getGaleriaItems('vape'),
      ]);

      const errors = [gorrasResult.error, cortesResult.error, vapesResult.error].filter(Boolean) as string[];
      if (errors.length > 0) {
        setError(errors.join(' | '));
      }

      setGorras(gorrasResult.data ?? []);
      setCortes(cortesResult.data ?? []);
      setVapes(vapesResult.data ?? []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los elementos');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentFormData = (): GorraFormData | CorteFormData | VapeFormData => {
    if (modalType === 'gorras') return gorraFormData;
    if (modalType === 'cortes') return corteFormData;
    return vapeFormData;
  };

  const setCurrentFormData = (data: GorraFormData | CorteFormData | VapeFormData) => {
    if (modalType === 'gorras') {
      setGorraFormData(data as GorraFormData);
    } else if (modalType === 'cortes') {
      setCorteFormData(data as CorteFormData);
    } else {
      setVapeFormData(data as VapeFormData);
    }
  };

  const resetFormData = () => {
    setGorraFormData(createEmptyGorraForm());
    setCorteFormData(createEmptyCorteForm());
    setVapeFormData(createEmptyVapeForm());
    setImagePreviews([]);
    setNewColor('');
    setNewTag('');
    setNewSabor('');
  };

  const getItemsByTab = (tab: TabKey): GaleriaItem[] => {
    if (tab === 'gorras') return gorras;
    if (tab === 'cortes') return cortes;
    return vapes;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const currentData = getCurrentFormData();
    setCurrentFormData({ ...currentData, imagenes: [...currentData.imagenes, ...files] });

    const readers = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(typeof ev.target?.result === 'string' ? ev.target.result : '');
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((previews) => {
      setImagePreviews((prev) => [...prev, ...previews.filter(Boolean)]);
    });
  };
  
  const removeImage = (index: number) => {
    const currentData = getCurrentFormData();
    const isFile = currentData.imagenes[index] instanceof File;

    const newImagenes = currentData.imagenes.filter((_, i) => i !== index);
    setCurrentFormData({ ...currentData, imagenes: newImagenes });

    if (isFile) {
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
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
      const currentImages = editingItem?.imagenes ?? [];
      const updatedImages = currentImages.filter((_, idx) => idx !== imageIndex);

      const { error } = await supabaseService.updateGaleriaItem(editingItem.id, {
        imagenes: updatedImages,
      });

      if (error) {
        throw new Error(error);
      }

      setEditingItem({ ...editingItem, imagenes: updatedImages });

      showNotification(
        'Imagen eliminada',
        'La imagen se eliminó correctamente',
        'success'
      );
      loadData();
    } catch (error) {
      console.error('Error:', error);
      showNotification(
        'Error al eliminar imagen',
        error.message,
        'error'
      );
    }
  };

  const openModal = (type: TabKey, item: GaleriaItem | null = null) => {
    setModalType(type);
    setEditingItem(item);

    if (item) {
      const baseData: BaseFormData = {
        nombre: item.nombre || '',
        descripcion: item.descripcion || '',
        precio: String(item.precio ?? ''),
        imagenes: [],
        tags: item.tags || [],
        destacado: Boolean(item.destacado),
        activo: item.activo !== undefined ? item.activo : true,
      };

      if (type === 'gorras') {
        setGorraFormData({ ...baseData, colores: item.colores || [] });
      } else if (type === 'cortes') {
        setCorteFormData(baseData);
      } else {
        setVapeFormData({
          ...baseData,
          sabores: item.sabores || [],
          nicotina_mg: item.nicotina_mg !== null && item.nicotina_mg !== undefined ? String(item.nicotina_mg) : '',
          stock: item.stock !== null && item.stock !== undefined ? String(item.stock) : '',
        });
      }

      setImagePreviews([]);
    } else {
      resetFormData();
      setModalType(type);
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

      if (!currentData.nombre?.trim()) {
        showNotification('Nombre requerido', 'El nombre es obligatorio', 'warning');
        return;
      }

      const parsedPrice = Number(currentData.precio);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        showNotification('Precio inválido', 'Ingresa un precio válido mayor o igual a 0', 'warning');
        return;
      }

      const tipo = tabToTipo[modalType];
      const payload: GaleriaItemPayload = {
        nombre: currentData.nombre,
        descripcion: currentData.descripcion,
        precio: parsedPrice || 0,
        tags: currentData.tags ?? [],
        destacado: currentData.destacado ?? false,
        activo: currentData.activo ?? true,
        imagenes: editingItem?.imagenes ?? [],
      };

      if (tipo === 'gorra') {
        payload.colores = (currentData as GorraFormData).colores ?? [];
      }

      if (tipo === 'vape') {
        const vapeData = currentData as VapeFormData;
        payload.sabores = vapeData.sabores ?? [];

        const parsedNicotina = Number(vapeData.nicotina_mg);
        payload.nicotina_mg = vapeData.nicotina_mg ? (Number.isNaN(parsedNicotina) ? null : parsedNicotina) : null;

        const parsedStock = Number(vapeData.stock);
        payload.stock = vapeData.stock ? (Number.isNaN(parsedStock) ? null : parsedStock) : null;
      }

      // Manejo de nuevas imágenes
      const newImages = currentData.imagenes.filter((imagen) => imagen instanceof File) as File[];
      if (newImages.length > 0) {
        const { data: uploadedUrls, error: uploadError } = await supabaseService.uploadGaleriaImages(newImages, tipo);

        if (uploadError) {
          throw new Error(uploadError);
        }

        payload.imagenes = [...(payload.imagenes ?? []), ...uploadedUrls];
      }

      if (editingItem) {
        const { error: updateError } = await supabaseService.updateGaleriaItem(editingItem.id, payload);

        if (updateError) {
          throw new Error(updateError);
        }

        showSuccessMessage(
          `${getTabLabel(modalType)} actualizado exitosamente`
        );
      } else {
        const { error: createError } = await supabaseService.createGaleriaItem(tipo, payload);

        if (createError) {
          throw new Error(createError);
        }

        showSuccessMessage(
          `${getTabLabel(modalType)} creado exitosamente`
        );
      }

      closeModal();
      loadData();
    } catch (error) {
      console.error('Error:', error);
      showSuccessMessage('Error: ' + error.message, 'error');
    }
  };

  const handleDelete = (id: string) => {
    const items = getItemsByTab(activeTab);
    const item = items.find((entry) => entry.id === id);
    const label = getTabLabel(activeTab).toLowerCase();
    
    showNotification(
      `Eliminar ${label}`,
      `¿Estás seguro de que quieres eliminar "${item?.nombre ?? label}"? Esta acción no se puede deshacer.`,
      'confirm',
      () => confirmDelete(id)
    );
  };

  const confirmDelete = async (id: string) => {
    try {
      const { error } = await supabaseService.deleteGaleriaItem(id);

      if (error) {
        throw new Error(error);
      }

      showNotification(
        'Eliminado exitosamente',
        `${getTabLabel(activeTab)} eliminado correctamente`,
        'success'
      );
      loadData();
    } catch (error) {
      console.error('Error:', error);
      showNotification(
        'Error al eliminar',
        error.message,
        'error'
      );
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const { error } = await supabaseService.toggleGaleriaItemStatus(id);

      if (error) {
        throw new Error(error);
      }

      showNotification(
        `${getTabLabel(activeTab)} actualizado`,
        `El estado de ${getTabLabel(activeTab).toLowerCase()} se actualizó correctamente`,
        'success'
      );
      loadData();
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

  const addSabor = () => {
    const sabor = newSabor.trim();
    if (sabor && !vapeFormData.sabores.includes(sabor)) {
      setVapeFormData({
        ...vapeFormData,
        sabores: [...vapeFormData.sabores, sabor],
      });
      setNewSabor('');
    }
  };

  const removeSabor = (saborToRemove) => {
    setVapeFormData({
      ...vapeFormData,
      sabores: vapeFormData.sabores.filter((sabor) => sabor !== saborToRemove),
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
      currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1
    }));
  };

  const filteredItems = getItemsByTab(activeTab).filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.nombre.toLowerCase().includes(term) ||
      (item.descripcion ?? '').toLowerCase().includes(term) ||
      (item.tags ?? []).some((tag) => tag.toLowerCase().includes(term))
    );
  });
  const currentFormData = getCurrentFormData();
  const modalLabel = getTabLabel(modalType);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gestión de Galería</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearchTerm('');
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {getTabLabel(tab, true)} ({getItemsByTab(tab).length})
          </button>
        ))}
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
          Agregar {getTabLabel(activeTab)}
        </button>
        
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder={`Buscar ${getTabLabel(activeTab, true)}...`}
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
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-lg">
                No hay {getTabLabel(activeTab, true)} disponibles
              </div>
              <p className="text-gray-500 mt-2">
                {searchTerm
                  ? 'Intenta con otros términos de búsqueda'
                  : `Agrega tu primer ${getTabLabel(activeTab).toLowerCase()}`}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
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
                  {tabToTipo[activeTab] === 'gorra' && item.colores && item.colores.length > 0 && (
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

                  {/* Sabores y nicotina (solo para vapes) */}
                  {tabToTipo[activeTab] === 'vape' && (
                    <div className="mb-3 text-sm text-gray-300 space-y-1">
                      {item.sabores && item.sabores.length > 0 && (
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Sabores:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.sabores.slice(0, 4).map((sabor, index) => (
                              <span key={index} className="bg-purple-900/50 text-purple-200 px-2 py-1 rounded text-xs">
                                {sabor}
                              </span>
                            ))}
                            {item.sabores.length > 4 && (
                              <span className="text-gray-500 text-xs">+{item.sabores.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Nicotina:</span>
                        <span className="text-white font-medium">{item.nicotina_mg ?? 'N/D'} mg</span>
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Stock:</span>
                        <span className={`font-medium ${item.stock && item.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.stock ?? 0} unidades
                        </span>
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
                  {editingItem ? 'Editar' : 'Agregar'} {modalLabel}
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
                    placeholder={`Nombre del ${modalLabel.toLowerCase()}`}
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

                {modalType === 'vapes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nicotina (mg)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={vapeFormData.nicotina_mg}
                        onChange={(e) => setVapeFormData({ ...vapeFormData, nicotina_mg: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Stock (unidades)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={vapeFormData.stock}
                        onChange={(e) => setVapeFormData({ ...vapeFormData, stock: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {modalType === 'vapes' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Sabores</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newSabor}
                        onChange={(e) => setNewSabor(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSabor())}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Agregar sabor"
                      />
                      <button
                        type="button"
                        onClick={addSabor}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vapeFormData.sabores.map((sabor, index) => (
                        <span
                          key={index}
                          className="bg-purple-900/40 text-purple-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {sabor}
                          <button
                            type="button"
                            onClick={() => removeSabor(sabor)}
                            className="text-red-300 hover:text-red-200 transition-colors duration-200"
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
                    {editingItem ? 'Actualizar' : 'Crear'} {modalLabel}
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