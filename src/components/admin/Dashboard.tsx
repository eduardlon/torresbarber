import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
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
  citasCompletadas?: number;
  citasCanceladas?: number;
}

interface Sale {
  id: number;
  cliente: string;
  servicio?: { nombre: string } | string;
  monto: number;
  hora: string;
}

interface Appointment {
  id: string;
  cliente: string;
  servicio?: { nombre: string } | string;
  hora: string;
  estado: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'year';

interface TopBarber {
  id: number | string;
  nombre: string;
  ganancias: number;
  citas: number;
  citasCompletadas: number;
}

interface TopService {
  nombre: string;
  cantidad: number;
  total: number;
}

const Dashboard: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [stats, setStats] = useState<Stats>({
    ingresos: 0,
    gastos: 0,
    ganancias: 0,
    productosVendidos: 0,
    citasDelDia: 0,
    citasPendientes: 0,
    citasCompletadas: 0,
    citasCanceladas: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [topBarbers, setTopBarbers] = useState<TopBarber[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, salesResponse, appointmentsResult] = await Promise.all([
        fetch(`/api/admin/stats?periodo=${dateFilter}`)
          .then(async (res) => {
            const json = await res.json().catch(() => null);
            if (!res.ok || !json) {
              throw new Error('Error al obtener estadísticas');
            }
            if (json.success === false) {
              throw new Error(json.message || 'Error al obtener estadísticas');
            }
            return json as { stats: any };
          }),
        fetch('/api/admin/ventas-recientes?limit=10')
          .then(async (res) => {
            const json = await res.json().catch(() => null);
            if (!res.ok || !json) {
              throw new Error('Error al obtener ventas recientes');
            }
            return json as { success: boolean; ventas: any[] };
          })
          .catch((err) => {
            console.error('Error al obtener ventas recientes:', err);
            return { success: false, ventas: [] as any[] };
          }),
        supabaseService.getTodayAppointments({ onlyToday: true })
      ]);

      const apiStats = statsResponse.stats || {};

      setStats({
        ingresos: apiStats.ingresos ?? 0,
        gastos: apiStats.gastos ?? 0,
        ganancias: apiStats.ganancias ?? 0,
        productosVendidos: apiStats.productosVendidos ?? 0,
        citasDelDia: apiStats.citasDelPeriodo ?? apiStats.citasDelDia ?? 0,
        citasPendientes: apiStats.citasPendientes ?? 0,
        citasCompletadas: apiStats.citasCompletadas ?? 0,
        citasCanceladas: apiStats.citasCanceladas ?? 0,
      });

      const mappedTopBarbers: TopBarber[] = (apiStats.topBarberos || []).map((b: any) => ({
        id: b.id ?? b.barbero_id ?? '',
        nombre: b.nombre ?? 'Barbero',
        ganancias: Number(b.ganancias ?? 0),
        citas: Number(b.citas ?? 0),
        citasCompletadas: Number(b.citasCompletadas ?? 0),
      }));

      const mappedTopServices: TopService[] = (apiStats.topServicios || []).map((s: any) => ({
        nombre: s.nombre ?? 'Servicio',
        cantidad: Number(s.cantidad ?? 0),
        total: Number(s.total ?? 0),
      }));

      setTopBarbers(mappedTopBarbers);
      setTopServices(mappedTopServices);

      if (!salesResponse || salesResponse.success === false) {
        setRecentSales([]);
      } else {
        const mappedSales: Sale[] = (salesResponse.ventas || []).map((venta: any) => ({
          id: venta.id,
          cliente: venta.cliente ?? 'Cliente',
          servicio: venta.servicio ?? 'Servicio',
          monto: Number(venta.monto ?? venta.total_final ?? 0),
          hora: venta.hora ?? '',
        }));
        setRecentSales(mappedSales);
      }

      if (appointmentsResult.error) {
        setTodayAppointments([]);
        if (!error) setError(appointmentsResult.error);
      } else {
        setTodayAppointments(appointmentsResult.data || []);
      }

    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del dashboard');
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
      setTopBarbers([]);
      setTopServices([]);
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

  const getAppointmentStatusLabel = (estado: string): string => {
    const normalized = (estado ?? '').toString().toLowerCase();
    switch (normalized) {
      case 'pending':
        return 'Pendiente';
      case 'scheduled':
        return 'Agendada';
      case 'confirmed':
        return 'Confirmada';
      case 'waiting':
        return 'En cola';
      case 'in_progress':
      case 'in_chair':
        return 'En silla';
      case 'completed':
        return 'Finalizada';
      case 'cancelled':
      case 'canceled':
        return 'Cancelada';
      case 'no_show':
        return 'No asistió';
      default:
        return estado || 'Pendiente';
    }
  };

  const getAppointmentStatusClasses = (estado: string): string => {
    const normalized = (estado ?? '').toString().toLowerCase();
    switch (normalized) {
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30';
      case 'confirmed':
        return 'bg-blue-900/50 text-blue-300 border border-blue-500/30';
      case 'waiting':
        return 'bg-amber-900/50 text-amber-300 border border-amber-500/30';
      case 'in_progress':
      case 'in_chair':
        return 'bg-purple-900/50 text-purple-300 border border-purple-500/30';
      case 'completed':
        return 'bg-green-900/50 text-green-300 border border-green-500/30';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-900/50 text-red-300 border border-red-500/30';
      case 'no_show':
        return 'bg-red-900/50 text-red-300 border border-red-500/30';
      default:
        return 'bg-zinc-900/50 text-zinc-300 border border-zinc-500/30';
    }
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

  const getCitasTitle = () => {
    switch (dateFilter) {
      case 'today':
        return 'Citas del Día';
      case 'week':
        return 'Citas de la Semana';
      case 'month':
        return 'Citas del Mes';
      case 'year':
        return 'Citas del Año';
      default:
        return 'Citas';
    }
  };

  const getCitasSubtitle = () => {
    const parts: string[] = [];
    parts.push(`${stats.citasPendientes} pendientes`);
    if (typeof stats.citasCompletadas === 'number') {
      parts.push(`${stats.citasCompletadas} completadas`);
    }
    if (typeof stats.citasCanceladas === 'number') {
      parts.push(`${stats.citasCanceladas} canceladas`);
    }
    return parts.join(' · ');
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
              onClick={() => setDateFilter(filter.value as DateFilter)}
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
          title={getCitasTitle()}
          value={stats.citasDelDia}
          icon="📅"
          color="text-purple-400"
          subtitle={getCitasSubtitle()}
        />
      </div>

      {/* Contenido principal: resumen */}
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
                        <p className="text-white/60 text-sm">
                          {typeof sale.servicio === 'string' ? sale.servicio : sale.servicio?.nombre}
                        </p>
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
                        <p className="text-white/60 text-sm">
                          {typeof appointment.servicio === 'string'
                            ? appointment.servicio
                            : appointment.servicio?.nombre}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-semibold">{appointment.hora}</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getAppointmentStatusClasses(
                            appointment.estado,
                          )}`}
                        >
                          {getAppointmentStatusLabel(appointment.estado)}
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

      {/* Top Barberos y Servicios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Barberos */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300">
            <div className="p-6 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">🏆</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Top Barberos</h2>
                  <p className="text-white/60 text-sm mt-1">Mejores resultados en el período seleccionado</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {topBarbers.length > 0 ? (
                <div className="space-y-4">
                  {topBarbers.map((barber, index) => (
                    <div
                      key={barber.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{barber.nombre}</p>
                          <p className="text-white/50 text-xs">
                            {barber.citasCompletadas} citas completadas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold text-sm">
                          {formatCurrency(barber.ganancias)}
                        </p>
                        <p className="text-white/40 text-xs">{barber.citas} citas totales</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60 text-sm">
                  No hay datos suficientes para mostrar el ranking.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Servicios */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
          <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl hover:shadow-red-500/10 transition-all duration-300">
            <div className="p-6 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">💇‍♂️</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Servicios Más Vendidos</h2>
                  <p className="text-white/60 text-sm mt-1">Basado en cantidad e ingresos</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {topServices.length > 0 ? (
                <div className="space-y-4">
                  {topServices.map((service, index) => (
                    <div
                      key={`${service.nombre}-${index}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/50"
                    >
                      <div>
                        <p className="text-white font-medium text-sm">{service.nombre}</p>
                        <p className="text-white/50 text-xs">{service.cantidad} servicios</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold text-sm">
                          {formatCurrency(service.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60 text-sm">
                  No hay datos suficientes de servicios.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;