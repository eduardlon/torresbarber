import React, { useState, useEffect } from 'react';

interface ClienteDashboardProps {
  clienteData: any;
  onRefresh: () => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const ClienteDashboard: React.FC<ClienteDashboardProps> = ({
  clienteData,
  onRefresh,
  onToast,
  authenticatedFetch
}) => {
  const [isUsingFreecut, setIsUsingFreecut] = useState(false);

  const handleUseFreecut = async () => {
    if (isUsingFreecut) return;
    
    setIsUsingFreecut(true);
    try {
      const response = await authenticatedFetch('/cliente/usar-corte-gratis', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        onToast(data.message);
        onRefresh();
      } else {
        onToast(data.message || 'Error al usar corte gratis', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    } finally {
      setIsUsingFreecut(false);
    }
  };

  const copyReferralCode = () => {
    const code = clienteData?.cliente?.codigo_referido;
    if (code && code !== 'N/A') {
      navigator.clipboard.writeText(code).then(() => {
        onToast('Código copiado al portapapeles');
      });
    }
  };

  const { cliente, estadisticas, proximas_citas, logros_recientes } = clienteData || {};
  const progress = cliente?.progreso_nivel || 0;

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Nivel Actual</p>
              <p className="text-3xl font-bold text-white">{cliente?.nivel || '1'}</p>
            </div>
            <div className="text-4xl">🏆</div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Cortes Gratis</p>
              <p className="text-3xl font-bold text-white">{cliente?.cortes_gratis_disponibles || '0'}</p>
            </div>
            <div className="text-4xl">✂️</div>
          </div>
          {(cliente?.cortes_gratis_disponibles || 0) > 0 && (
            <button
              onClick={handleUseFreecut}
              disabled={isUsingFreecut}
              className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              {isUsingFreecut ? 'Usando...' : 'Usar Corte Gratis'}
            </button>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Visitas Este Año</p>
              <p className="text-3xl font-bold text-white">{estadisticas?.citas_este_ano || '0'}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Código Referido</p>
              <p className="text-lg font-bold text-white">{cliente?.codigo_referido || 'N/A'}</p>
            </div>
            <button
              onClick={copyReferralCode}
              className="text-2xl hover:scale-110 transition-transform"
              title="Copiar código"
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-white">Progreso de Nivel</h3>
          <span className="text-sm text-gray-300">
            {cliente?.puntos_experiencia || 0} / {(cliente?.puntos_experiencia || 0) + (cliente?.experiencia_siguiente_nivel || 100)} XP
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Próximas Citas */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">📅</span>
            Próximas Citas
          </h3>
          <div className="space-y-3">
            {proximas_citas && proximas_citas.length > 0 ? (
              proximas_citas.map((cita: any, index: number) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-white font-medium">
                    {new Date(cita.fecha_hora).toLocaleDateString()}
                  </p>
                  <p className="text-gray-300 text-sm">
                    {cita.servicio?.nombre || 'Servicio'} - {cita.barbero?.nombre || 'Barbero'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No tienes citas próximas</p>
            )}
          </div>
        </div>

        {/* Logros Recientes */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Logros Recientes
          </h3>
          <div className="space-y-3">
            {logros_recientes && logros_recientes.length > 0 ? (
              logros_recientes.map((logro: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-lg p-3">
                  <span className="text-2xl">{logro.icono || '🏆'}</span>
                  <div>
                    <p className="text-white font-medium">{logro.nombre}</p>
                    <p className="text-gray-300 text-sm">{logro.descripcion}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">Aún no tienes logros</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
            <span>📅</span>
            <span>Agendar Cita</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
            <span>🎫</span>
            <span>Tomar Turno</span>
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
            <span>🤖</span>
            <span>Asistente IA</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClienteDashboard;