/**
 * 🔮 Dashboard Predictivo con IA
 * Componente revolucionario que muestra predicciones inteligentes
 */

import React, { useState, useEffect } from 'react';
import { aiService, PredictionData, TrendAnalysis } from '@/services/AIService';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PredictiveDashboardProps {
  barberId?: number;
  className?: string;
}

const PredictiveDashboard: React.FC<PredictiveDashboardProps> = ({ 
  barberId, 
  className = '' 
}) => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [revenuePredict, setRevenuePredict] = useState<{
    prediction: number;
    confidence: number;
    factors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  useEffect(() => {
    loadPredictiveData();
  }, [barberId, selectedPeriod]);

  const loadPredictiveData = async () => {
    setLoading(true);
    try {
      const [predictionsData, trendsData, revenueData] = await Promise.all([
        aiService.predictDemand(barberId),
        aiService.analyzeTrends(selectedPeriod),
        aiService.predictRevenue(selectedPeriod, barberId)
      ]);

      setPredictions(predictionsData);
      setTrends(trendsData);
      setRevenuePredict(revenueData);
    } catch (error) {
      console.error('Error loading predictive data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Configuración del gráfico de predicción de demanda
  const demandChartData = {
    labels: predictions.map(p => {
      const date = new Date(p.date);
      return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Demanda Predicha',
        data: predictions.map(p => p.expectedDemand),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      }
    ]
  };

  const demandChartOptions = {
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
        text: '📈 Predicción de Demanda (IA)',
        color: '#fff',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const confidence = predictions[index]?.confidence || 0;
            return `Confianza: ${(confidence * 100).toFixed(0)}%`;
          }
        }
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

  // Configuración del gráfico de tendencias
  const trendsChartData = trends ? {
    labels: trends.trends.map(t => t.trend),
    datasets: [{
      data: trends.trends.map(t => t.growth),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(245, 158, 11, 0.8)'
      ],
      borderColor: [
        'rgb(239, 68, 68)',
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)',
        'rgb(168, 85, 247)',
        'rgb(245, 158, 11)'
      ],
      borderWidth: 2
    }]
  } : null;

  const trendsChartOptions = {
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
        text: '📊 Análisis de Tendencias',
        color: '#fff',
        font: { size: 14, weight: 'bold' }
      }
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">🤖 IA analizando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🔮 Dashboard Predictivo IA
            </h2>
            <p className="text-white/60 mt-1">Análisis inteligente y predicciones avanzadas</p>
          </div>
          
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  selectedPeriod === period
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-700/50 text-white/70 hover:bg-zinc-600/50'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas predictivas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Predicción de ingresos */}
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-2xl border border-green-600/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
              💰
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ingresos Predichos</h3>
              <p className="text-green-400 text-sm">Próximos {selectedPeriod}</p>
            </div>
          </div>
          
          {revenuePredict && (
            <>
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${revenuePredict.prediction.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-full bg-green-900/30 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${revenuePredict.confidence * 100}%` }}
                  />
                </div>
                <span className="text-green-400 text-sm">
                  {(revenuePredict.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-xs text-white/60">
                Factores: {revenuePredict.factors.join(', ')}
              </div>
            </>
          )}
        </div>

        {/* Demanda promedio */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-2xl border border-blue-600/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
              📈
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Demanda Promedio</h3>
              <p className="text-blue-400 text-sm">Predicción IA</p>
            </div>
          </div>
          
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {predictions.length > 0 
              ? Math.round(predictions.reduce((acc, p) => acc + p.expectedDemand, 0) / predictions.length)
              : 0
            } citas/día
          </div>
          <div className="text-xs text-white/60">
            Basado en patrones históricos y tendencias
          </div>
        </div>

        {/* Confianza del modelo */}
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-2xl border border-purple-600/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
              🎯
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Precisión IA</h3>
              <p className="text-purple-400 text-sm">Confianza del modelo</p>
            </div>
          </div>
          
          <div className="text-3xl font-bold text-purple-400 mb-2">
            {predictions.length > 0 
              ? Math.round((predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length) * 100)
              : 0
            }%
          </div>
          <div className="text-xs text-white/60">
            Mejora continuamente con más datos
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de predicción de demanda */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <Line data={demandChartData} options={demandChartOptions} />
        </div>

        {/* Gráfico de tendencias */}
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          {trendsChartData ? (
            <Doughnut data={trendsChartData} options={trendsChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-white/60">No hay datos de tendencias disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de tendencias detalladas */}
      {trends && (
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            🔍 Análisis Detallado de Tendencias
          </h3>
          
          <div className="space-y-4">
            {trends.trends.map((trend, index) => (
              <div key={index} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{trend.trend}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      trend.growth > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trend.growth > 0 ? '↗️' : '↘️'} {Math.abs(trend.growth)}%
                    </span>
                    <span className="text-xs text-white/60">
                      {(trend.confidence * 100).toFixed(0)}% confianza
                    </span>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-2">{trend.prediction}</p>
                <div className="text-xs text-white/50 capitalize">
                  Categoría: {trend.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveDashboard;