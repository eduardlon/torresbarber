import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrendData {
  id: string;
  name: string;
  category: 'corte' | 'color' | 'estilo' | 'producto';
  popularity: number;
  growth: number;
  description: string;
  image?: string;
  tags: string[];
  seasonality: 'primavera' | 'verano' | 'otoño' | 'invierno' | 'todo_año';
  difficulty: 'fácil' | 'medio' | 'difícil';
  duration: number; // en minutos
  price_range: { min: number; max: number };
  suitable_for: string[];
}

interface PersonalStats {
  total_visits: number;
  favorite_services: string[];
  spending_trend: number[];
  satisfaction_score: number;
  loyalty_level: string;
  next_visit_prediction: string;
  style_evolution: { date: string; style: string; image?: string }[];
  recommendations: string[];
}

interface TrendAnalyticsProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onToast: (message: string, type: 'success' | 'error') => void;
}

const TrendAnalytics: React.FC<TrendAnalyticsProps> = ({ authenticatedFetch, onToast }) => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'trends' | 'personal' | 'predictions'>('trends');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'growth' | 'price'>('popularity');
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadTrendData();
    loadPersonalStats();
  }, []);

  useEffect(() => {
    if (personalStats && chartRef.current) {
      drawSpendingChart();
    }
  }, [personalStats]);

  const loadTrendData = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch('/api/cliente?action=obtener_tendencias');
      const data = await response.json();
      
      if (data.success) {
        setTrends(data.tendencias || []);
      }
    } catch (error) {
      console.error('Error al cargar tendencias:', error);
      onToast('Error al cargar tendencias', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPersonalStats = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=obtener_estadisticas_personales');
      const data = await response.json();
      
      if (data.success) {
        setPersonalStats(data.estadisticas);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const drawSpendingChart = () => {
    const canvas = chartRef.current;
    if (!canvas || !personalStats) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    const data = personalStats.spending_trend;
    const maxValue = Math.max(...data);
    const padding = 40;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Configurar estilos
    ctx.strokeStyle = '#8B5CF6';
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 3;
    
    // Dibujar área
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
      const y = height - padding - (value / maxValue) * (height - 2 * padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Completar área
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Dibujar línea
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
      const y = height - padding - (value / maxValue) * (height - 2 * padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Dibujar puntos
    ctx.fillStyle = '#8B5CF6';
    data.forEach((value, index) => {
      const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
      const y = height - padding - (value / maxValue) * (height - 2 * padding);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const filteredTrends = trends.filter(trend => {
    const matchesCategory = selectedCategory === 'all' || trend.category === selectedCategory;
    const matchesSeason = selectedSeason === 'all' || trend.seasonality === selectedSeason || trend.seasonality === 'todo_año';
    const matchesSearch = trend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trend.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trend.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSeason && matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'popularity':
        return b.popularity - a.popularity;
      case 'growth':
        return b.growth - a.growth;
      case 'price':
        return a.price_range.min - b.price_range.min;
      default:
        return 0;
    }
  });

  const getCategoryIcon = (category: string) => {
    const icons = {
      corte: '✂️',
      color: '🎨',
      estilo: '💫',
      producto: '🧴'
    };
    return icons[category as keyof typeof icons] || '📊';
  };

  const getSeasonIcon = (season: string) => {
    const icons = {
      primavera: '🌸',
      verano: '☀️',
      otoño: '🍂',
      invierno: '❄️',
      todo_año: '🌍'
    };
    return icons[season as keyof typeof icons] || '📅';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      fácil: 'text-green-400',
      medio: 'text-yellow-400',
      difícil: 'text-red-400'
    };
    return colors[difficulty as keyof typeof colors] || 'text-gray-400';
  };

  const formatPrice = (range: { min: number; max: number }) => {
    if (range.min === range.max) {
      return `$${range.min}`;
    }
    return `$${range.min} - $${range.max}`;
  };

  const generatePersonalizedRecommendation = async (trendId: string) => {
    try {
      const response = await authenticatedFetch('/api/cliente', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generar_recomendacion_personalizada',
          trend_id: trendId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onToast('Recomendación personalizada generada', 'success');
        // Aquí podrías mostrar la recomendación en un modal
      }
    } catch (error) {
      console.error('Error al generar recomendación:', error);
      onToast('Error al generar recomendación', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Analizando tendencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Análisis de Tendencias</h1>
        <p className="text-gray-300">Descubre las últimas tendencias y tu evolución personal</p>
      </div>

      {/* Navigation */}
      <div className="flex justify-center space-x-4">
        {[
          { id: 'trends', label: 'Tendencias', icon: '📈' },
          { id: 'personal', label: 'Mi Evolución', icon: '👤' },
          { id: 'predictions', label: 'Predicciones', icon: '🔮' }
        ].map((view) => (
          <motion.button
            key={view.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(view.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all ${
              activeView === view.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Trends View */}
      {activeView === 'trends' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Filters */}
          <div className="bg-white/10 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Buscar</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar tendencias..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Categoría</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todas</option>
                  <option value="corte">Cortes</option>
                  <option value="color">Colores</option>
                  <option value="estilo">Estilos</option>
                  <option value="producto">Productos</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Temporada</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todas</option>
                  <option value="primavera">Primavera</option>
                  <option value="verano">Verano</option>
                  <option value="otoño">Otoño</option>
                  <option value="invierno">Invierno</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="popularity">Popularidad</option>
                  <option value="growth">Crecimiento</option>
                  <option value="price">Precio</option>
                </select>
              </div>
            </div>
          </div>

          {/* Trends Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrends.map((trend, index) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getCategoryIcon(trend.category)}</span>
                    <div>
                      <h3 className="font-semibold text-white">{trend.name}</h3>
                      <p className="text-sm text-gray-400 capitalize">{trend.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-sm">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-white">{trend.popularity}%</span>
                    </div>
                    <div className={`text-sm ${
                      trend.growth > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trend.growth > 0 ? '↗️' : '↘️'} {Math.abs(trend.growth)}%
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 text-sm mb-4">{trend.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Temporada:</span>
                    <div className="flex items-center space-x-1">
                      <span>{getSeasonIcon(trend.seasonality)}</span>
                      <span className="text-white capitalize">{trend.seasonality.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Dificultad:</span>
                    <span className={`capitalize ${getDifficultyColor(trend.difficulty)}`}>
                      {trend.difficulty}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Duración:</span>
                    <span className="text-white">{trend.duration} min</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Precio:</span>
                    <span className="text-white">{formatPrice(trend.price_range)}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {trend.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {trend.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{trend.tags.length - 3}</span>
                    )}
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => generatePersonalizedRecommendation(trend.id)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2 rounded-lg text-sm transition-all"
                  >
                    Recomendación Personalizada
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
          
          {filteredTrends.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400">No se encontraron tendencias con los filtros aplicados</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Personal Stats View */}
      {activeView === 'personal' && personalStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold text-white">{personalStats.total_visits}</div>
              <div className="text-gray-400 text-sm">Visitas Totales</div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">⭐</div>
              <div className="text-2xl font-bold text-white">{personalStats.satisfaction_score}/5</div>
              <div className="text-gray-400 text-sm">Satisfacción</div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-lg font-bold text-white capitalize">{personalStats.loyalty_level}</div>
              <div className="text-gray-400 text-sm">Nivel de Lealtad</div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm font-bold text-white">{personalStats.next_visit_prediction}</div>
              <div className="text-gray-400 text-sm">Próxima Visita</div>
            </div>
          </div>

          {/* Spending Chart */}
          <div className="bg-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Tendencia de Gastos</h3>
            <canvas
              ref={chartRef}
              width={800}
              height={300}
              className="w-full h-auto max-h-72"
            />
          </div>

          {/* Style Evolution */}
          <div className="bg-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Evolución de Estilo</h3>
            <div className="space-y-4">
              {personalStats.style_evolution.map((evolution, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{evolution.style}</div>
                    <div className="text-gray-400 text-sm">{evolution.date}</div>
                  </div>
                  {evolution.image && (
                    <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📸</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Predictions View */}
      {activeView === 'predictions' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-2xl font-bold text-white mb-4">Predicciones Personalizadas</h2>
            <p className="text-gray-300 mb-8">Basadas en IA y análisis de tendencias</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-semibold text-white mb-3">🎯 Próximo Estilo Recomendado</h3>
                <p className="text-gray-300 text-sm mb-4">Basado en tu historial y tendencias actuales</p>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="font-semibold text-purple-300">Corte Fade Moderno</div>
                  <div className="text-gray-400 text-sm">Probabilidad: 87%</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 rounded-xl p-6 border border-green-500/30">
                <h3 className="text-lg font-semibold text-white mb-3">📈 Tendencia Personal</h3>
                <p className="text-gray-300 text-sm mb-4">Tu evolución de estilo predicha</p>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="font-semibold text-green-300">Estilo Clásico → Moderno</div>
                  <div className="text-gray-400 text-sm">Confianza: 92%</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl p-6 border border-yellow-500/30">
                <h3 className="text-lg font-semibold text-white mb-3">💰 Optimización de Gastos</h3>
                <p className="text-gray-300 text-sm mb-4">Recomendaciones para mejor valor</p>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="font-semibold text-yellow-300">Paquete Mensual</div>
                  <div className="text-gray-400 text-sm">Ahorro estimado: 25%</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-pink-600/20 to-red-600/20 rounded-xl p-6 border border-pink-500/30">
                <h3 className="text-lg font-semibold text-white mb-3">⏰ Mejor Momento</h3>
                <p className="text-gray-300 text-sm mb-4">Horario óptimo para tu próxima cita</p>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="font-semibold text-pink-300">Martes 3:00 PM</div>
                  <div className="text-gray-400 text-sm">Disponibilidad: Alta</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TrendAnalytics;