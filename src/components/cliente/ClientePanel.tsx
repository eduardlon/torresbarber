import React, { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase.js';

interface ClientePanelProps {
  className?: string;
}

interface ClienteData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  cortes_realizados: number;
  cortes_gratis_disponibles: number;
  puntos_experiencia: number;
  nivel_actual: number;
  visitas_totales: number;
  dinero_gastado_total: number;
  ultima_visita: string | null;
}

export const ClientePanel: React.FC<ClientePanelProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Verificar autenticación
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/login-cliente';
        return;
      }

      const { data: clienteData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error al cargar datos:', error);
        toast('Error al cargar datos del cliente', 'error');
        return;
      }

      setClienteData(clienteData);
    } catch (error) {
      console.error('Error:', error);
      toast('Error al cargar datos del cliente', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      window.location.href = '/';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'gamification', label: 'Recompensas', icon: '🏆' },
    { id: 'galeria', label: 'Galería', icon: '🎨' },
    { id: 'cola', label: 'Cola Virtual', icon: '⏱️' },
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
        } shadow-lg`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">✂️ JP Barber</h1>
              <span className="text-gray-300">Panel Cliente</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white font-medium">
                  {clienteData?.nombre || 'Usuario'} {clienteData?.apellido || ''}
                </p>
                <p className="text-gray-300 text-sm">
                  Nivel {clienteData?.nivel_actual || '1'} • {clienteData?.puntos_experiencia || 0} XP
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
        {activeTab === 'dashboard' && clienteData && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Dashboard</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-gray-300 text-sm mb-2">Cortes Realizados</h3>
                <p className="text-4xl font-bold text-red-400">{clienteData.cortes_realizados || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-2xl p-6">
                <h3 className="text-gray-300 text-sm mb-2">Puntos XP</h3>
                <p className="text-4xl font-bold text-yellow-400">{clienteData.puntos_experiencia || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-gray-300 text-sm mb-2">Nivel</h3>
                <p className="text-4xl font-bold text-purple-400">{clienteData.nivel_actual || 1}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a href="/agendar" className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl transition-all text-center font-semibold">
                  📅 Agendar Cita
                </a>
                <button onClick={() => setActiveTab('cola')} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-xl transition-all font-semibold">
                  ⏱️ Ver Cola Virtual
                </button>
                <button onClick={() => setActiveTab('galeria')} className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-4 rounded-xl transition-all font-semibold">
                  🎨 Ver Galería
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'gamification' && clienteData && (
          <ClienteGamificationView clienteData={clienteData} onRefresh={loadInitialData} />
        )}
        
        {activeTab === 'galeria' && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4">Galería</h2>
            <p className="text-gray-300 mb-8">Explora nuestros cortes, productos y servicios</p>
            <a href="/galeria" className="inline-block bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl transition-all font-semibold">
              Ir a Galería Completa
            </a>
          </div>
        )}
        
        {activeTab === 'cola' && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4">Cola Virtual</h2>
            <p className="text-gray-300 mb-8">Revisa el estado actual de la cola</p>
            <a href="/cola-virtual" className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl transition-all font-semibold">
              Ver Cola Virtual
            </a>
          </div>
        )}
      </main>
    </div>
  );
};

// Componente de Gamificación
const ClienteGamificationView: React.FC<{ clienteData: ClienteData; onRefresh: () => void }> = ({ clienteData, onRefresh }) => {
  const progreso = (clienteData.cortes_realizados % 10) * 10;
  const cortesParaSiguiente = 10 - (clienteData.cortes_realizados % 10);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white mb-6">🏆 Programa de Recompensas</h2>

      {/* Cortes Gratis Disponibles */}
      {clienteData.cortes_gratis_disponibles > 0 && (
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">🎁 ¡Tienes Cortes Gratis!</h3>
          <div className="text-6xl font-bold text-green-400 mb-4">
            {clienteData.cortes_gratis_disponibles}
          </div>
          <p className="text-gray-300 mb-4">Cortes gratis disponibles para usar</p>
          <a href="/agendar" className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl transition-all font-semibold">
            Usar Ahora
          </a>
        </div>
      )}

      {/* Progreso hacia siguiente corte gratis */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <h3 className="text-2xl font-bold text-white mb-6">Progreso hacia tu próximo corte gratis</h3>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Cortes realizados</span>
            <span className="text-white font-bold">{clienteData.cortes_realizados % 10}/10</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-6 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${progreso}%` }}
            >
              {progreso > 20 && <span className="text-white text-xs font-bold">{progreso}%</span>}
            </div>
          </div>
          <p className="text-gray-400 mt-3 text-center">
            {cortesParaSiguiente === 0 ? '🎉 ¡Felicitaciones! Tienes un corte gratis' : `${cortesParaSiguiente} cortes para tu próximo corte gratis`}
          </p>
        </div>

        {/* Info de Cortes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Total de Cortes</p>
            <p className="text-2xl font-bold text-white">{clienteData.cortes_realizados}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Visitas</p>
            <p className="text-2xl font-bold text-white">{clienteData.visitas_totales || 0}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Nivel</p>
            <p className="text-2xl font-bold text-purple-400">{clienteData.nivel_actual}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Experiencia</p>
            <p className="text-2xl font-bold text-yellow-400">{clienteData.puntos_experiencia}</p>
          </div>
        </div>
      </div>

      {/* Cómo funciona */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">¿Cómo funciona?</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">1️⃣</span>
            <div>
              <h4 className="text-white font-semibold">Agenda tu cita</h4>
              <p className="text-gray-400 text-sm">Reserva y asiste a tus citas en JP Barber</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">2️⃣</span>
            <div>
              <h4 className="text-white font-semibold">Acumula cortes</h4>
              <p className="text-gray-400 text-sm">Cada corte completado cuenta para tu progreso</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">3️⃣</span>
            <div>
              <h4 className="text-white font-semibold">Obtén recompensas</h4>
              <p className="text-gray-400 text-sm">Cada 10 cortes = 1 corte gratis + puntos de experiencia</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientePanel;