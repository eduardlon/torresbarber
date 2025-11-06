import React, { useState, useEffect } from 'react';
// import PredictiveDashboard from '@/components/ai/PredictiveDashboard'; // Temporalmente deshabilitado
// import CarbonTracker from '@/components/sustainability/CarbonTracker'; // Temporalmente deshabilitado
// import AchievementSystem from '@/components/gamification/AchievementSystem'; // Temporalmente deshabilitado

// Tipos para el Dashboard
interface Stats {
  ingresos: number;
  gastos: number;
  ganancias: number;
  productosVendidos: number;
  citasDelDia: number;
  citasPendientes: number;
}

interface Sale {
  id: number;
  cliente: string;
  servicio?: { nombre: string } | string;
  monto: number;
  hora: string;
}

interface Appointment {
  id: number;
  cliente: string;
  servicio?: { nombre: string } | string;
  hora: string;
  estado: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'year';

// Declaración de tipos para window
declare global {
  interface Window {
    authenticatedFetch?: (url: string) => Promise<Response>;
    API_BASE_URL?: string;
  }
}

const Dashboard: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'sustainability' | 'gamification'>('overview');
  const [stats, setStats] = useState<Stats>({
    ingresos: 0,
    gastos: 0,
    ganancias: 0,
    productosVendidos: 0,
    citasDelDia: 0,
    citasPendientes: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar estadísticas desde la API
      const [statsResponse, salesResponse, appointmentsResponse] = await Promise.all([
        window.authenticatedFetch(`${window.API_BASE_URL}/dashboard/stats?filter=${dateFilter}`),
        window.authenticatedFetch(`${window.API_BASE_URL}/ventas?recent=true`),
        window.authenticatedFetch(`${window.API_BASE_URL}/citas?today=true`)
      ]);

      // Procesar estadísticas
      if (statsResponse && statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      } else {
        // Datos por defecto si no hay respuesta de la API
        setStats({
          ingresos: 0,
          gastos: 0,
          ganancias: 0,
          productosVendidos: 0,
          citasDelDia: 0,
          citasPendientes: 0
        });
      }

      // Procesar ventas recientes
      if (salesResponse && salesResponse.ok) {
        const salesData = await salesResponse.json();
        if (salesData.success) {
          setRecentSales(salesData.data || []);
        }
      } else {
        setRecentSales([]);
      }

      // Procesar citas de hoy
      if (appointmentsResponse && appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        if (appointmentsData.success) {
          setTodayAppointments(appointmentsData.data || []);
        }
      } else {
        setTodayAppointments([]);
      }

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      setError('Error al cargar los datos del dashboard');
      // Establecer datos vacíos en caso de error
      setStats({
        ingresos: 0,
        gastos: 0,
        ganancias: 0,
        productosVendidos: 0,
        citasDelDia: 0,
        citasPendientes: 0
      });
      setRecentSales([]);
      setTodayAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
      <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl p-6 border border-zinc-700/50 hover:border-red-600/40 transition-all duration-300 backdrop-blur-sm shadow-xl hover:shadow-red-500/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold ${color} mt-1 bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent`}>{value}</p>
            {subtitle && <p className="text-white/40 text-xs mt-1">{subtitle}</p>}
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg text-white text-2xl">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  const formatCurrency = (amount: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0);
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getFilterLabel = () => {
    const labels = {
      today: 'Hoy',
      week: 'Esta Semana',
      month: 'Este Mes',
      year: 'Este Año'
    };
    return labels[dateFilter];
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-600/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 text-red-400">⚠️</div>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-white/60 mt-2 text-lg">Resumen de actividad - {getFilterLabel()}</p>
        </div>

        {/* Date Filter */}
        <div className="flex bg-gradient-to-r from-zinc-900/90 to-zinc-800/90 rounded-xl p-1 border border-red-600/30 backdrop-blur-sm">
          {[
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mes' },
            { value: 'year', label: 'Año' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${dateFilter === filter.value
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25'
                : 'text-white/60 hover:text-white hover:bg-red-600/20'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Ganancias"
          value={formatCurrency(stats.ganancias)}
          icon="💰"
          color="text-green-400"
          subtitle={`${formatCurrency(stats.ingresos)} ingresos - ${formatCurrency(stats.gastos)} gastos`}
        />
        <StatCard
          title="Productos Vendidos"
          value={stats.productosVendidos}
          icon="🛍️"
          color="text-blue-400"
        />
        <StatCard
          title="Citas del Día"
          value={stats.citasDelDia}
          icon="📅"
          color="text-purple-400"
          subtitle={`${stats.citasPendientes} pendientes`}
        />
      </div>

      {/* Navegación por pestañas revolucionarias */}
      <div className="bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl p-2 border border-zinc-700/30 shadow-lg">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Resumen', icon: '📊' },
            { id: 'ai', label: 'IA Predictiva', icon: '🤖' },
            { id: 'sustainability', label: 'Sostenibilidad', icon: '🌱' },
            { id: 'gamification', label: 'Gamificación', icon: '🎮' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25'
                  : 'text-white/60 hover:text-white hover:bg-red-600/20'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido dinámico basado en la pestaña activa */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Sales */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
            <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300">
              <div className="p-6 border-b border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Ventas Recientes</h2>
                    <p className="text-white/60 text-sm mt-1">Últimas transacciones del día</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentSales.length > 0 ? recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/30 hover:border-red-600/30 transition-all duration-300">
                      <div>
                        <p className="text-white font-medium">{sale.cliente}</p>
                        <p className="text-white/60 text-sm">{sale.servicio?.nombre || sale.servicio}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">{formatCurrency(sale.monto)}</p>
                        <p className="text-white/40 text-sm">{sale.hora}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">💰</div>
                      <p className="text-white/60">No hay ventas recientes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
            <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300">
              <div className="p-6 border-b border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Citas de Hoy</h2>
                    <p className="text-white/60 text-sm mt-1">Próximas citas programadas</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {todayAppointments.length > 0 ? todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/30 hover:border-red-600/30 transition-all duration-300">
                      <div>
                        <p className="text-white font-medium">{appointment.cliente}</p>
                        <p className="text-white/60 text-sm">{appointment.servicio?.nombre || appointment.servicio}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-semibold">{appointment.hora}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${appointment.estado === 'confirmada'
                          ? 'bg-green-900/50 text-green-400 border border-green-500/30'
                          : 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30'
                          }`}>
                          {appointment.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📅</div>
                      <p className="text-white/60">No hay citas programadas para hoy</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Predictivo con IA */}
      {activeTab === 'ai' && (
        <div className="text-center py-12">
          <p className="text-white/60">Módulo de IA Predictiva en desarrollo</p>
        </div>
      )}

      {/* Sistema de Sostenibilidad */}
      {activeTab === 'sustainability' && (
        <div className="text-center py-12">
          <p className="text-white/60">Módulo de Sostenibilidad en desarrollo</p>
        </div>
      )}

      {/* Sistema de Gamificación */}
      {activeTab === 'gamification' && (
        <div className="text-center py-12">
          <p className="text-white/60">Módulo de Gamificación en desarrollo</p>
        </div>
      )}


    </div>
  );
};

export default Dashboard;