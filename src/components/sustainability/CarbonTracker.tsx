/**
 * 🌱 Rastreador de Huella de Carbono
 * Componente revolucionario para sostenibilidad ambiental
 */

import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';

interface CarbonData {
  date: string;
  emissions: number;
  category: 'energy' | 'products' | 'transport' | 'waste';
  description: string;
}

interface CarbonGoal {
  target: number;
  current: number;
  deadline: string;
  status: 'on-track' | 'behind' | 'achieved';
}

interface EcoRecommendation {
  id: number;
  title: string;
  description: string;
  impact: number; // kg CO2 saved
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

const CarbonTracker: React.FC = () => {
  const [carbonData, setCarbonData] = useState<CarbonData[]>([]);
  const [carbonGoal, setCarbonGoal] = useState<CarbonGoal>({
    target: 0,
    current: 0,
    deadline: '',
    status: 'on-track'
  });
  const [ecoRecommendations, setEcoRecommendations] = useState<EcoRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadCarbonData();
  }, [selectedPeriod]);

  const loadCarbonData = async () => {
    setLoading(true);
    try {
      // Simular datos de carbono (en producción vendría de la API)
      const mockData: CarbonData[] = [
        { date: '2024-01-01', emissions: 12.5, category: 'energy', description: 'Consumo eléctrico' },
        { date: '2024-01-02', emissions: 8.3, category: 'products', description: 'Productos químicos' },
        { date: '2024-01-03', emissions: 15.2, category: 'transport', description: 'Transporte de productos' },
        { date: '2024-01-04', emissions: 5.7, category: 'waste', description: 'Gestión de residuos' },
        { date: '2024-01-05', emissions: 11.8, category: 'energy', description: 'Consumo eléctrico' },
        { date: '2024-01-06', emissions: 9.4, category: 'products', description: 'Productos químicos' },
        { date: '2024-01-07', emissions: 13.6, category: 'transport', description: 'Transporte de productos' }
      ];

      const mockGoal: CarbonGoal = {
        target: 200,
        current: 76.5,
        deadline: '2024-12-31',
        status: 'on-track'
      };

      const mockRecommendations: EcoRecommendation[] = [
        {
          id: 1,
          title: 'Cambiar a productos orgánicos',
          description: 'Usar productos de cuidado capilar orgánicos y biodegradables',
          impact: 25.5,
          difficulty: 'easy',
          category: 'Productos'
        },
        {
          id: 2,
          title: 'Instalar paneles solares',
          description: 'Generar energía renovable para reducir dependencia eléctrica',
          impact: 120.0,
          difficulty: 'hard',
          category: 'Energía'
        },
        {
          id: 3,
          title: 'Sistema de reciclaje de agua',
          description: 'Implementar sistema de filtrado y reutilización de agua',
          impact: 45.2,
          difficulty: 'medium',
          category: 'Agua'
        },
        {
          id: 4,
          title: 'Transporte eléctrico',
          description: 'Usar vehículos eléctricos para entregas y transporte',
          impact: 80.3,
          difficulty: 'medium',
          category: 'Transporte'
        }
      ];

      setCarbonData(mockData);
      setCarbonGoal(mockGoal);
      setEcoRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error loading carbon data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Configuración del gráfico de emisiones por tiempo
  const emissionsChartData = {
    labels: carbonData.map(d => new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })),
    datasets: [
      {
        label: 'Emisiones CO₂ (kg)',
        data: carbonData.map(d => d.emissions),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      }
    ]
  };

  const emissionsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff',
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: '🌱 Emisiones de CO₂ por Día',
        color: '#fff',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' }
      },
      y: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' }
      }
    }
  };

  // Configuración del gráfico de emisiones por categoría
  const categoryData = carbonData.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.emissions;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = {
    labels: Object.keys(categoryData).map(key => {
      const labels: Record<string, string> = {
        energy: 'Energía',
        products: 'Productos',
        transport: 'Transporte',
        waste: 'Residuos'
      };
      return labels[key] || key;
    }),
    datasets: [{
      data: Object.values(categoryData),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',   // Energía - Rojo
        'rgba(34, 197, 94, 0.8)',   // Productos - Verde
        'rgba(59, 130, 246, 0.8)',  // Transporte - Azul
        'rgba(245, 158, 11, 0.8)'   // Residuos - Amarillo
      ],
      borderColor: [
        'rgb(239, 68, 68)',
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)',
        'rgb(245, 158, 11)'
      ],
      borderWidth: 2
    }]
  };

  const categoryChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#fff',
          font: { size: 10 }
        }
      },
      title: {
        display: true,
        text: '📊 Emisiones por Categoría',
        color: '#fff',
        font: { size: 14, weight: 'bold' }
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-900/20 border-green-600/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-600/30';
      case 'hard': return 'text-red-400 bg-red-900/20 border-red-600/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-600/30';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">🌱 Calculando huella de carbono...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalEmissions = carbonData.reduce((acc, item) => acc + item.emissions, 0);
  const progressPercentage = (carbonGoal.current / carbonGoal.target) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-2xl border border-green-600/30 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🌱 Rastreador de Carbono
            </h2>
            <p className="text-green-400 mt-1">Monitoreo de sostenibilidad ambiental</p>
          </div>

          <div className="flex gap-2">
            {['7d', '30d', '90d'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${selectedPeriod === period
                  ? 'bg-green-600 text-white'
                  : 'bg-zinc-700/50 text-white/70 hover:bg-zinc-600/50'
                  }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Emisiones totales */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center">
              🏭
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Emisiones Totales</h3>
              <p className="text-red-400 text-sm">Período actual</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-400 mb-2">
            {totalEmissions.toFixed(1)} kg
          </div>
          <div className="text-xs text-white/60">CO₂ equivalente</div>
        </div>

        {/* Meta de reducción */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
              🎯
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Meta Anual</h3>
              <p className="text-green-400 text-sm">Reducción CO₂</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-2">
            {carbonGoal.target} kg
          </div>
          <div className="w-full bg-green-900/30 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-white/60">
            {progressPercentage.toFixed(1)}% completado
          </div>
        </div>

        {/* Ahorro potencial */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
              💡
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ahorro Potencial</h3>
              <p className="text-blue-400 text-sm">Con mejoras</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {ecoRecommendations.reduce((acc, rec) => acc + rec.impact, 0).toFixed(1)} kg
          </div>
          <div className="text-xs text-white/60">CO₂ por año</div>
        </div>

        {/* Estado de sostenibilidad */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
              🌍
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Estado</h3>
              <p className="text-purple-400 text-sm">Sostenibilidad</p>
            </div>
          </div>
          <div className={`text-2xl font-bold mb-2 ${carbonGoal.status === 'on-track' ? 'text-green-400' :
            carbonGoal.status === 'achieved' ? 'text-blue-400' : 'text-yellow-400'
            }`}>
            {carbonGoal.status === 'on-track' ? '✅ En camino' :
              carbonGoal.status === 'achieved' ? '🏆 Logrado' : '⚠️ Atrasado'}
          </div>
          <div className="text-xs text-white/60">
            Meta: {new Date(carbonGoal.deadline).toLocaleDateString('es-ES')}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de emisiones por tiempo */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <Line data={emissionsChartData} options={emissionsChartOptions as any} />
        </div>

        {/* Gráfico de emisiones por categoría */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <Doughnut data={categoryChartData} options={categoryChartOptions as any} />
        </div>
      </div>

      {/* Recomendaciones ecológicas */}
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          💡 Recomendaciones Ecológicas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ecoRecommendations.map((recommendation) => (
            <div key={recommendation.id} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30 hover:border-green-600/30 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-white">{recommendation.title}</h4>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getDifficultyColor(recommendation.difficulty)}`}>
                  {getDifficultyIcon(recommendation.difficulty)} {recommendation.difficulty}
                </div>
              </div>

              <p className="text-white/70 text-sm mb-3">{recommendation.description}</p>

              <div className="flex items-center justify-between">
                <div className="text-green-400 font-semibold">
                  -{recommendation.impact} kg CO₂/año
                </div>
                <div className="text-xs text-white/50 bg-zinc-700/50 px-2 py-1 rounded">
                  {recommendation.category}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarbonTracker;