import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Package,
  Scissors,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RefreshCw,
  Brain,
  Zap,
  Target
} from 'lucide-react';
import PredictiveAI from './PredictiveAI';

interface DashboardStats {
  ventas_hoy: number;
  ventas_mes: number;
  citas_hoy: number;
  citas_pendientes: number;
  clientes_nuevos_mes: number;
  total_clientes: number;
  barberos_activos: number;
  productos_bajo_stock: number;
  ingresos_mes: number;
  gastos_mes: number;
  ganancia_neta: number;
  crecimiento_ventas: number;
  tasa_ocupacion: number;
  servicios_populares: Array<{
    nombre: string;
    cantidad: number;
    ingresos: number;
  }>;
  barberos_top: Array<{
    nombre: string;
    ventas: number;
    servicios: number;
  }>;
  citas_proximas: Array<{
    id: number;
    cliente: string;
    barbero: string;
    servicio: string;
    fecha_hora: string;
  }>;
}

const OptimizedDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [showAI, setShowAI] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/backend/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleCardVisibility = (cardId: string) => {
    setHiddenCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4" />;
    if (value < 0) return <ArrowDown className="w-4 h-4" />;
    return null;
  };

  const mainCards = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        id: 'ventas-hoy',
        title: 'Ventas Hoy',
        value: formatCurrency(stats.ventas_hoy),
        icon: DollarSign,
        color: 'bg-green-500',
        change: stats.crecimiento_ventas,
        subtitle: `${formatCurrency(stats.ventas_mes)} este mes`
      },
      {
        id: 'citas-hoy',
        title: 'Citas Hoy',
        value: stats.citas_hoy.toString(),
        icon: Calendar,
        color: 'bg-blue-500',
        subtitle: `${stats.citas_pendientes} pendientes`
      },
      {
        id: 'clientes',
        title: 'Clientes',
        value: stats.total_clientes.toString(),
        icon: Users,
        color: 'bg-purple-500',
        subtitle: `+${stats.clientes_nuevos_mes} este mes`
      },
      {
        id: 'ocupacion',
        title: 'Ocupación',
        value: `${stats.tasa_ocupacion.toFixed(1)}%`,
        icon: BarChart3,
        color: 'bg-orange-500',
        subtitle: `${stats.barberos_activos} barberos activos`
      }
    ];
  }, [stats]);

  const secondaryCards = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        id: 'ingresos',
        title: 'Ingresos del Mes',
        value: formatCurrency(stats.ingresos_mes),
        icon: TrendingUp,
        color: 'bg-emerald-500'
      },
      {
        id: 'gastos',
        title: 'Gastos del Mes',
        value: formatCurrency(stats.gastos_mes),
        icon: AlertTriangle,
        color: 'bg-red-500'
      },
      {
        id: 'ganancia',
        title: 'Ganancia Neta',
        value: formatCurrency(stats.ganancia_neta),
        icon: Target,
        color: stats.ganancia_neta > 0 ? 'bg-green-600' : 'bg-red-600'
      },
      {
        id: 'stock',
        title: 'Productos Bajo Stock',
        value: stats.productos_bajo_stock.toString(),
        icon: Package,
        color: stats.productos_bajo_stock > 0 ? 'bg-yellow-500' : 'bg-gray-500'
      }
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar datos</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Resumen general de tu barbería</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showAI 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            IA Predictiva
          </button>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* AI Panel */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="h-96">
              <PredictiveAI />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainCards.map((card) => {
          const Icon = card.icon;
          const isHidden = hiddenCards.has(card.id);
          
          return (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <button
                    onClick={() => toggleCardVisibility(card.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                <AnimatePresence>
                  {!isHidden && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-gray-800">{card.value}</span>
                        {card.change !== undefined && (
                          <div className={`flex items-center gap-1 ${getGrowthColor(card.change)}`}>
                            {getGrowthIcon(card.change)}
                            <span className="text-sm font-medium">
                              {formatPercentage(card.change)}
                            </span>
                          </div>
                        )}
                      </div>
                      {card.subtitle && (
                        <p className="text-sm text-gray-500">{card.subtitle}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {secondaryCards.map((card) => {
          const Icon = card.icon;
          const isHidden = hiddenCards.has(card.id);
          
          return (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <button
                    onClick={() => toggleCardVisibility(card.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                <AnimatePresence>
                  {!isHidden && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
                      <span className="text-2xl font-bold text-gray-800">{card.value}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        {stats?.servicios_populares && stats.servicios_populares.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Scissors className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Servicios Populares</h3>
              </div>
              <div className="space-y-3">
                {stats.servicios_populares.slice(0, 5).map((servicio, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{servicio.nombre}</span>
                      <div className="text-sm text-gray-600">{servicio.cantidad} servicios</div>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(servicio.ingresos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Barbers */}
        {stats?.barberos_top && stats.barberos_top.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Barberos Destacados</h3>
              </div>
              <div className="space-y-3">
                {stats.barberos_top.slice(0, 5).map((barbero, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{barbero.nombre}</span>
                      <div className="text-sm text-gray-600">{barbero.servicios} servicios</div>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(barbero.ventas)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Upcoming Appointments */}
      {stats?.citas_proximas && stats.citas_proximas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Próximas Citas</h3>
            </div>
            <div className="space-y-3">
              {stats.citas_proximas.slice(0, 5).map((cita) => (
                <div key={cita.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-800">{cita.cliente}</span>
                    <div className="text-sm text-gray-600">
                      {cita.servicio} con {cita.barbero}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    {new Date(cita.fecha_hora).toLocaleString('es-ES', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OptimizedDashboard;

// Tipos
interface MetricData {
  value: number;
  previousValue: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  label: string;
  icon: React.ReactNode;
  color: string;
  format?: 'currency' | 'percentage' | 'number';
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
    fill?: boolean;
  }>;
}

interface AppointmentData {
  id: string;
  clientName: string;
  barberName: string;
  service: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  price: number;
}

interface DashboardProps {
  metrics: {
    totalRevenue: MetricData;
    totalAppointments: MetricData;
    totalClients: MetricData;
    averageRating: MetricData;
    occupancyRate: MetricData;
    averageServiceTime: MetricData;
  };
  revenueChart: ChartData;
  appointmentsChart: ChartData;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  recentAppointments: AppointmentData[];
  alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; time: string }>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Componente de métrica individual
interface MetricCardProps {
  metric: MetricData;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, className = '' }) => {
  const [isVisible, setIsVisible] = React.useState(true);
  
  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangeIcon = () => {
    if (metric.changeType === 'increase') {
      return <TrendingUp className="h-4 w-4 text-success-600" />;
    } else if (metric.changeType === 'decrease') {
      return <TrendingDown className="h-4 w-4 text-error-600" />;
    }
    return null;
  };

  const getChangeColor = () => {
    switch (metric.changeType) {
      case 'increase':
        return 'text-success-600';
      case 'decrease':
        return 'text-error-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-medium p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${metric.color}`}>
          {metric.icon}
        </div>
        
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={isVisible ? 'Ocultar métrica' : 'Mostrar métrica'}
        >
          {isVisible ? (
            <Eye className="h-4 w-4 text-gray-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h3 className="text-2xl font-bold text-gray-900">
              {formatValue(metric.value, metric.format)}
            </h3>
            
            <p className="text-sm text-gray-600">{metric.label}</p>
            
            <div className="flex items-center space-x-2">
              {getChangeIcon()}
              <span className={`text-sm font-medium ${getChangeColor()}`}>
                {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">vs período anterior</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Componente de gráfico simple (simulado)
interface SimpleChartProps {
  data: ChartData;
  type: 'line' | 'bar';
  height?: number;
  className?: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ 
  data, 
  type, 
  height = 200, 
  className = '' 
}) => {
  const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
  
  return (
    <div className={`${className}`} style={{ height }}>
      <div className="flex items-end justify-between h-full space-x-2 px-4 pb-4">
        {data.labels.map((label, index) => {
          const values = data.datasets.map(dataset => dataset.data[index]);
          const maxValueInGroup = Math.max(...values);
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center space-y-2">
              <div className="flex-1 flex items-end justify-center space-x-1">
                {data.datasets.map((dataset, datasetIndex) => {
                  const value = dataset.data[index];
                  const heightPercentage = (value / maxValue) * 100;
                  
                  return (
                    <motion.div
                      key={datasetIndex}
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`w-full max-w-8 rounded-t ${dataset.color} relative group`}
                      style={{ minHeight: '4px' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {dataset.label}: {value}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              <span className="text-xs text-gray-600 text-center">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Componente de lista de citas recientes
interface RecentAppointmentsProps {
  appointments: AppointmentData[];
  className?: string;
}

const RecentAppointments: React.FC<RecentAppointmentsProps> = ({ 
  appointments, 
  className = '' 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'cancelled':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {appointments.map((appointment, index) => (
        <motion.div
          key={appointment.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Scissors className="h-5 w-5 text-primary-600" />
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">{appointment.clientName}</h4>
              <p className="text-sm text-gray-600">
                {appointment.service} • {appointment.barberName}
              </p>
              <p className="text-xs text-gray-500">{appointment.time}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-gray-900">
              ${appointment.price}
            </span>
            
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {getStatusIcon(appointment.status)}
              <span className="capitalize">{appointment.status}</span>
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Componente de alertas
interface AlertsPanelProps {
  alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; time: string }>;
  className?: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, className = '' }) => {
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800';
      case 'error':
        return 'bg-error-50 border-error-200 text-error-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Activity className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  if (alerts.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Todo está funcionando bien
        </h3>
        <p className="text-gray-600">No hay alertas en este momento</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {alerts.map((alert, index) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
        >
          <div className="flex items-start space-x-3">
            {getAlertIcon(alert.type)}
            <div className="flex-1">
              <p className="text-sm font-medium">{alert.message}</p>
              <p className="text-xs opacity-75 mt-1">{alert.time}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// End of file