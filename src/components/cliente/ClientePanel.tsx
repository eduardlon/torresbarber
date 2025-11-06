import React, { useState, useEffect } from 'react';
import { ClienteTurnos } from './ClienteTurnos';
import { ClienteCitas } from './ClienteCitas';
import { ClienteGamification } from './ClienteGamification';
import { ClienteDashboard } from './ClienteDashboard';
import VirtualHairTryOn from './VirtualHairTryOn';
import PushNotifications from './PushNotifications';
import AIAssistant from './AIAssistant';
import TrendAnalytics from './TrendAnalytics';

interface ClientePanelProps {
  className?: string;
}

export const ClientePanel: React.FC<ClientePanelProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [clienteData, setClienteData] = useState<any>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Verificar autenticación
  useEffect(() => {
    const token = localStorage.getItem('cliente_token');
    if (!token) {
      window.location.href = '/login-cliente';
      return;
    }
    
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const response = await authenticatedFetch('/cliente/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setClienteData(data.data);
      } else {
        throw new Error(data.message || 'Error al cargar datos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast('Error al cargar datos del cliente', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('cliente_token');
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`http://localhost:8000/api${url}`, defaultOptions);
    
    if (response.status === 401) {
      localStorage.removeItem('cliente_token');
      localStorage.removeItem('cliente_data');
      window.location.href = '/login-cliente';
      throw new Error('No autorizado');
    }
    
    return response;
  };

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await authenticatedFetch('/cliente/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      localStorage.removeItem('cliente_token');
      localStorage.removeItem('cliente_data');
      window.location.href = '/login-cliente';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'turnos', label: 'Turnos', icon: '🎫' },
    { id: 'citas', label: 'Citas', icon: '📅' },
    { id: 'virtual-try-on', label: 'Probador Virtual', icon: '🤳' },
    { id: 'trends', label: 'Tendencias', icon: '📈' },
    { id: 'gamification', label: 'Gamificación', icon: '🏆' },
    { id: 'ai', label: 'Asistente IA', icon: '🤖' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando panel del cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 ${className || ''}`}>
      {/* Toast Notifications */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium ${
          showToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } animate-fade-in`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">JP Barber</h1>
              <span className="text-gray-300">Panel Cliente</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notificaciones Push */}
              <PushNotifications 
                authenticatedFetch={authenticatedFetch}
                onToast={toast}
              />
              
              <div className="text-right">
                <p className="text-white font-medium">
                  {clienteData?.cliente?.nombre_completo || 'Usuario'}
                </p>
                <p className="text-gray-300 text-sm">
                  Nivel {clienteData?.cliente?.nivel || '1'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-400 text-purple-400'
                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <ClienteDashboard 
            clienteData={clienteData} 
            onRefresh={loadInitialData}
            onToast={toast}
            authenticatedFetch={authenticatedFetch}
          />
        )}
        
        {activeTab === 'turnos' && (
          <ClienteTurnos 
            onToast={toast}
            authenticatedFetch={authenticatedFetch}
          />
        )}
        
        {activeTab === 'citas' && (
          <ClienteCitas 
            onToast={toast}
            authenticatedFetch={authenticatedFetch}
          />
        )}
        
        {activeTab === 'virtual-try-on' && (
          <VirtualHairTryOn />
        )}
        
        {activeTab === 'trends' && (
          <TrendAnalytics 
            authenticatedFetch={authenticatedFetch}
            onToast={toast}
          />
        )}
        
        {activeTab === 'gamification' && (
          <ClienteGamification 
            onToast={toast}
            authenticatedFetch={authenticatedFetch}
          />
        )}
        
        {activeTab === 'ai' && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4">Asistente IA</h2>
            <p className="text-gray-300 mb-8">El asistente IA está disponible como botón flotante en la esquina inferior derecha</p>
            <div className="bg-white/10 rounded-xl p-8 max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-white mb-4">¿Qué puede hacer el asistente?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-300 mb-2">📅 Gestión de Citas</h4>
                  <p className="text-gray-300 text-sm">Agendar, consultar y reprogramar citas</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-300 mb-2">💡 Recomendaciones</h4>
                  <p className="text-gray-300 text-sm">Sugerencias de servicios y estilos</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-300 mb-2">🎤 Control por Voz</h4>
                  <p className="text-gray-300 text-sm">Comandos de voz y respuestas habladas</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-300 mb-2">📊 Información</h4>
                  <p className="text-gray-300 text-sm">Horarios, precios y promociones</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Asistente IA Flotante */}
      <AIAssistant 
        authenticatedFetch={authenticatedFetch}
        onToast={toast}
        onNavigate={setActiveTab}
      />
    </div>
  );
};

export default ClientePanel;