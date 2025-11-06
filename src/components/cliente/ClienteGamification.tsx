import React, { useState, useEffect } from 'react';

interface ClienteGamificationProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

interface GamificationData {
  gamificacion: {
    nivel: number;
    puntos_experiencia: number;
    experiencia_siguiente_nivel: number;
    progreso_nivel: number;
    ranking_posicion: number;
    puntos_lealtad: number;
    cortes_gratis_disponibles: number;
  };
  logros: {
    total_obtenidos: number;
    disponibles: any[];
    obtenidos: number[];
    recientes: any[];
  };
  estadisticas: {
    visitas_totales: number;
    racha_visitas: number;
    dinero_gastado_total: number;
    servicio_favorito: string;
    barbero_favorito: string;
  };
  desafios: {
    activos: any[];
    completados: any[];
  };
  beneficios: {
    disponibles: any[];
    canjeados: any[];
  };
}

interface Challenge {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  objetivo: number;
  progreso_actual: number;
  recompensa_xp: number;
  recompensa_puntos: number;
  fecha_limite?: string;
  icono: string;
}

export const ClienteGamification: React.FC<ClienteGamificationProps> = ({
  onToast,
  authenticatedFetch
}) => {
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isClaimingReward, setIsClaimingReward] = useState<number | null>(null);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    try {
      const response = await authenticatedFetch('/cliente/gamificacion');
      const data = await response.json();
      
      if (data.success) {
        setGamificationData(data.data);
      } else {
        onToast('Error al cargar datos de gamificación', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const claimAchievement = async (achievementId: number) => {
    setIsClaimingReward(achievementId);
    try {
      const response = await authenticatedFetch(`/cliente/logros/${achievementId}/reclamar`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        onToast(`¡Logro reclamado! +${data.data.xp_ganado} XP`);
        await loadGamificationData();
      } else {
        onToast(data.message || 'Error al reclamar logro', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    } finally {
      setIsClaimingReward(null);
    }
  };

  const redeemBenefit = async (benefitId: number) => {
    try {
      const response = await authenticatedFetch(`/cliente/beneficios/${benefitId}/canjear`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        onToast('¡Beneficio canjeado exitosamente!');
        await loadGamificationData();
      } else {
        onToast(data.message || 'Error al canjear beneficio', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getRankColor = (position: number) => {
    if (position <= 3) return 'text-yellow-400';
    if (position <= 10) return 'text-gray-300';
    if (position <= 50) return 'text-orange-400';
    return 'text-gray-500';
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '🏅';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!gamificationData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No se pudieron cargar los datos de gamificación</p>
      </div>
    );
  }

  const { gamificacion, logros, estadisticas, desafios, beneficios } = gamificationData;

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: '📊' },
    { id: 'achievements', label: 'Logros', icon: '🏆' },
    { id: 'challenges', label: 'Desafíos', icon: '🎯' },
    { id: 'benefits', label: 'Beneficios', icon: '🎁' },
    { id: 'leaderboard', label: 'Ranking', icon: '👑' }
  ];

  return (
    <div className="space-y-8">
      {/* Header con estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🏆</span>
            <span className="text-2xl font-bold">{gamificacion.nivel}</span>
          </div>
          <p className="text-purple-200">Nivel Actual</p>
          <div className="mt-3">
            <div className="w-full bg-purple-900 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${gamificacion.progreso_nivel}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-200 mt-1">
              {gamificacion.puntos_experiencia} / {gamificacion.puntos_experiencia + gamificacion.experiencia_siguiente_nivel} XP
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{getRankIcon(gamificacion.ranking_posicion)}</span>
            <span className="text-2xl font-bold">#{gamificacion.ranking_posicion}</span>
          </div>
          <p className="text-blue-200">Posición Ranking</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">⭐</span>
            <span className="text-2xl font-bold">{gamificacion.puntos_lealtad}</span>
          </div>
          <p className="text-green-200">Puntos Lealtad</p>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🏅</span>
            <span className="text-2xl font-bold">{logros.total_obtenidos}</span>
          </div>
          <p className="text-orange-200">Logros Obtenidos</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Resumen de Progreso</h3>
            
            {/* Estadísticas detalladas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-300 text-sm">Visitas Totales</p>
                <p className="text-2xl font-bold text-white">{estadisticas.visitas_totales}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-300 text-sm">Racha de Visitas</p>
                <p className="text-2xl font-bold text-white">{estadisticas.racha_visitas} días</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-300 text-sm">Total Gastado</p>
                <p className="text-2xl font-bold text-white">${estadisticas.dinero_gastado_total.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-300 text-sm">Servicio Favorito</p>
                <p className="text-lg font-medium text-white">{estadisticas.servicio_favorito || 'N/A'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-300 text-sm">Barbero Favorito</p>
                <p className="text-lg font-medium text-white">{estadisticas.barbero_favorito || 'N/A'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-300 text-sm">Cortes Gratis</p>
                <p className="text-2xl font-bold text-white">{gamificacion.cortes_gratis_disponibles}</p>
              </div>
            </div>

            {/* Logros recientes */}
            {logros.recientes && logros.recientes.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Logros Recientes</h4>
                <div className="space-y-2">
                  {logros.recientes.map((logro: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 bg-white/5 rounded-lg p-3">
                      <span className="text-2xl">{logro.icono || '🏆'}</span>
                      <div>
                        <p className="text-white font-medium">{logro.nombre}</p>
                        <p className="text-gray-300 text-sm">{logro.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Logros</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logros.disponibles.map((logro: any) => {
                const isUnlocked = logros.obtenidos.includes(logro.id);
                const canClaim = isUnlocked && !logro.reclamado;
                
                return (
                  <div key={logro.id} className={`border rounded-lg p-4 ${
                    isUnlocked ? 'bg-green-900/20 border-green-500/50' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <span className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {logro.icono || '🏆'}
                      </span>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{logro.nombre}</h4>
                        <p className="text-gray-300 text-sm mb-2">{logro.descripcion}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{logro.puntos} XP</span>
                          {isUnlocked && (
                            <span className="text-green-400 text-sm">✓ Desbloqueado</span>
                          )}
                        </div>
                        {canClaim && (
                          <button
                            onClick={() => claimAchievement(logro.id)}
                            disabled={isClaimingReward === logro.id}
                            className="mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            {isClaimingReward === logro.id ? 'Reclamando...' : 'Reclamar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Desafíos</h3>
            
            {/* Desafíos activos */}
            {desafios.activos && desafios.activos.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Desafíos Activos</h4>
                <div className="space-y-4">
                  {desafios.activos.map((desafio: Challenge) => {
                    const progress = getProgressPercentage(desafio.progreso_actual, desafio.objetivo);
                    
                    return (
                      <div key={desafio.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{desafio.icono}</span>
                          <div className="flex-1">
                            <h5 className="text-white font-medium">{desafio.nombre}</h5>
                            <p className="text-gray-300 text-sm mb-2">{desafio.descripcion}</p>
                            
                            <div className="mb-2">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300">
                                  Progreso: {desafio.progreso_actual} / {desafio.objetivo}
                                </span>
                                <span className="text-gray-300">{progress.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-yellow-400">
                                Recompensa: {desafio.recompensa_xp} XP + {desafio.recompensa_puntos} puntos
                              </span>
                              {desafio.fecha_limite && (
                                <span className="text-red-400">
                                  Hasta: {new Date(desafio.fecha_limite).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Desafíos completados */}
            {desafios.completados && desafios.completados.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Desafíos Completados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {desafios.completados.map((desafio: any, index: number) => (
                    <div key={index} className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{desafio.icono}</span>
                        <div>
                          <h5 className="text-white font-medium">{desafio.nombre}</h5>
                          <p className="text-green-400 text-sm">✓ Completado</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Beneficios</h3>
            
            <div className="mb-4">
              <p className="text-gray-300">
                Puntos de lealtad disponibles: <span className="text-white font-bold">{gamificacion.puntos_lealtad}</span>
              </p>
            </div>

            {/* Beneficios disponibles */}
            {beneficios.disponibles && beneficios.disponibles.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Beneficios Disponibles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {beneficios.disponibles.map((beneficio: any) => {
                    const canRedeem = gamificacion.puntos_lealtad >= beneficio.costo_puntos;
                    
                    return (
                      <div key={beneficio.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{beneficio.icono || '🎁'}</span>
                          <div className="flex-1">
                            <h5 className="text-white font-medium">{beneficio.nombre}</h5>
                            <p className="text-gray-300 text-sm mb-2">{beneficio.descripcion}</p>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${
                                canRedeem ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {beneficio.costo_puntos} puntos
                              </span>
                              <button
                                onClick={() => redeemBenefit(beneficio.id)}
                                disabled={!canRedeem}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                              >
                                {canRedeem ? 'Canjear' : 'Insuficientes puntos'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Beneficios canjeados */}
            {beneficios.canjeados && beneficios.canjeados.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Beneficios Canjeados</h4>
                <div className="space-y-2">
                  {beneficios.canjeados.map((beneficio: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
                      <span className="text-2xl">{beneficio.icono || '🎁'}</span>
                      <div>
                        <p className="text-white font-medium">{beneficio.nombre}</p>
                        <p className="text-blue-400 text-sm">
                          Canjeado el {new Date(beneficio.fecha_canje).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Ranking de Clientes</h3>
            
            <div className="text-center mb-6">
              <div className={`text-6xl mb-2 ${getRankColor(gamificacion.ranking_posicion)}`}>
                {getRankIcon(gamificacion.ranking_posicion)}
              </div>
              <p className="text-2xl font-bold text-white">Posición #{gamificacion.ranking_posicion}</p>
              <p className="text-gray-300">Tu posición actual en el ranking</p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-center text-gray-300">
                El ranking se actualiza semanalmente basado en:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-400">
                <li>• Puntos de experiencia ganados</li>
                <li>• Frecuencia de visitas</li>
                <li>• Logros desbloqueados</li>
                <li>• Participación en desafíos</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClienteGamification;