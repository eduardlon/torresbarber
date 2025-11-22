import React, { useState, useEffect } from 'react';
import { requestBarberoApi } from '../../utils/barbero-api-request';

interface DashboardProps {
  barberoInfo: { id?: string | number; nombre?: string } | null;
  mostrarNotificacion: (mensaje: string, tipo?: 'success' | 'error' | 'warning' | 'info') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ barberoInfo, mostrarNotificacion }) => {
  const [stats, setStats] = useState({
    gananciasHoy: 0,
    gananciasSemanales: 0,
    gananciasMes: 0,
    citasHoy: 0,
    citasSemanales: 0,
    citasMes: 0,
    citasPendientes: 0,
    ventasHoy: 0,
    ventasSemana: 0,
    promedioVentaDia: 0,
    servicioPopular: '---',
    productoPopular: '---'
  });
  const [loading, setLoading] = useState(true);
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);
  const [chartSemana, setChartSemana] = useState<{ labels: string[]; ganancias: number[] }>({
    labels: [],
    ganancias: [],
  });

  useEffect(() => {
    if (barberoInfo?.id) {
      cargarEstadisticas(barberoInfo.id);
      cargarGraficoSemana();
      cargarActividadReciente();
    } else {
      setLoading(false);
    }
  }, [barberoInfo?.id]);

  const cargarEstadisticas = async (barberoId: string | number) => {
    try {
      const response = await requestBarberoApi<{ stats: any }>('/api/barbero/stats');
      const statsResumen = response.stats?.resumen || {};
      const statsRendimiento = response.stats?.rendimiento || {};
      
      const serviciosPopulares = statsRendimiento.servicios_populares || [];
      const productosVendidos = statsRendimiento.productos_vendidos || [];
      
      setStats({
        gananciasHoy: statsResumen.gananciasHoy || 0,
        gananciasSemanales: statsResumen.gananciasSemana || 0,
        gananciasMes: statsRendimiento.ganancias_mes || 0,
        citasHoy: statsResumen.citasHoy || 0,
        citasSemanales: statsResumen.citasSemana || 0,
        citasMes: statsRendimiento.citas_mes || 0,
        citasPendientes: statsResumen.citasPendientes || 0,
        ventasHoy: statsRendimiento.ventas_dia || 0,
        ventasSemana: statsRendimiento.ventas_semana || 0,
        promedioVentaDia: statsResumen.citasHoy > 0 ? Math.round(statsResumen.gananciasHoy / statsResumen.citasHoy) : 0,
        servicioPopular: serviciosPopulares[0]?.nombre || '---',
        productoPopular: productosVendidos[0]?.nombre || '---'
      });
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error instanceof Error ? error.message : 'Error al cargar estadísticas', 'error');
      setStats({
        gananciasHoy: 0,
        gananciasSemanales: 0,
        gananciasMes: 0,
        citasHoy: 0,
        citasSemanales: 0,
        citasMes: 0,
        citasPendientes: 0,
        ventasHoy: 0,
        ventasSemana: 0,
        promedioVentaDia: 0,
        servicioPopular: '---',
        productoPopular: '---'
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarGraficoSemana = async () => {
    try {
      const response = await requestBarberoApi<{ chartData?: { labels: string[]; ganancias: number[] } }>(
        '/api/barbero/stats/chart?periodo=semana',
      );

      if (response.chartData) {
        setChartSemana({
          labels: response.chartData.labels || [],
          ganancias: response.chartData.ganancias || [],
        });
      } else {
        setChartSemana({ labels: [], ganancias: [] });
      }
    } catch (error) {
      console.error('Error cargando gráfico semanal:', error);
      setChartSemana({ labels: [], ganancias: [] });
    }
  };

  const cargarActividadReciente = async () => {
    try {
      const data = await requestBarberoApi<{ ventas?: any[] }>('/api/barbero/ventas');
      const ventas = (data.ventas || []).slice(0, 5);

      const actividades = ventas.map((venta) => {
        const total = Number(venta.total_final ?? venta.total ?? 0);
        const fechaBase = venta.created_at || venta.fecha_venta;
        const fecha = fechaBase ? new Date(fechaBase) : null;
        const tiempo = fecha
          ? fecha.toLocaleString('es-CO', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        return {
          descripcion: `${venta.cliente_nombre || 'Cliente'} - ${formatearMoneda(total)}`,
          tiempo,
          tipo: 'venta' as const,
        };
      });

      setActividadReciente(actividades);
    } catch (error) {
      console.error('Error cargando actividad reciente:', error);
      setActividadReciente([]);
    }
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const statsCards = [
    {
      titulo: 'Ganancias Hoy',
      valor: formatearMoneda(stats.gananciasHoy),
      icono: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'green',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/20',
      iconColor: 'text-green-400',
      subtitulo: `${stats.ventasHoy} ventas`
    },
    {
      titulo: 'Ganancias Semana',
      valor: formatearMoneda(stats.gananciasSemanales),
      icono: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      color: 'blue',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/20',
      iconColor: 'text-blue-400',
      subtitulo: `${stats.ventasSemana} ventas`
    },
    {
      titulo: 'Ganancias Mes',
      valor: formatearMoneda(stats.gananciasMes),
      icono: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'indigo',
      bgColor: 'bg-indigo-500/20',
      borderColor: 'border-indigo-500/20',
      iconColor: 'text-indigo-400',
      subtitulo: `${stats.citasMes} citas`
    },
    {
      titulo: 'Citas Hoy',
      valor: stats.citasHoy,
      icono: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'purple',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/20',
      iconColor: 'text-purple-400',
      subtitulo: `Promedio: ${formatearMoneda(stats.promedioVentaDia)}`
    },
    {
      titulo: 'Citas Pendientes',
      valor: stats.citasPendientes,
      icono: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'yellow',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/20',
      iconColor: 'text-yellow-400',
      subtitulo: 'Requieren atención'
    },
    {
      titulo: 'Servicio Más Popular',
      valor: stats.servicioPopular,
      icono: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
      color: 'orange',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/20',
      iconColor: 'text-orange-400',
      subtitulo: 'Del mes'
    },
    {
      titulo: 'Producto Más Vendido',
      valor: stats.productoPopular,
      icono: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      color: 'pink',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/20',
      iconColor: 'text-pink-400',
      subtitulo: 'Del mes'
    },
    {
      titulo: 'Citas Semana',
      valor: stats.citasSemanales,
      icono: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'cyan',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/20',
      iconColor: 'text-cyan-400',
      subtitulo: 'Últimos 7 días'
    }
  ];

  const maxGananciaSemana =
    chartSemana.ganancias && chartSemana.ganancias.length > 0
      ? Math.max(...chartSemana.ganancias)
      : 0;

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 animate-pulse">
              <div className="h-3 sm:h-4 bg-zinc-700 rounded mb-2"></div>
              <div className="h-6 sm:h-8 bg-zinc-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 pb-20 sm:pb-6">
      {/* Bienvenida */}
      <div className="bg-black/40 backdrop-blur-md border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">¡Bienvenido, {barberoInfo?.nombre}!</h2>
            <p className="text-yellow-300 text-sm sm:text-base">Aquí tienes un resumen de tu actividad</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statsCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} ${card.borderColor} backdrop-blur-md border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all hover:scale-105 hover:shadow-xl hover:shadow-${card.color}-500/20`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-zinc-300">{card.titulo}</h3>
              <svg
                className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icono} />
              </svg>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white truncate">{card.valor}</p>
            {card.subtitulo && (
              <p className="text-xs text-zinc-400 mt-1">{card.subtitulo}</p>
            )}
          </div>
        ))}
      </div>

      {/* Gráfico de Ganancias Semanales */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Ganancias de la Semana</h3>
        <div className="h-48 sm:h-64 flex items-end justify-between space-x-1 sm:space-x-2">
          {chartSemana.labels.length > 0 && maxGananciaSemana > 0 ? (
            chartSemana.labels.map((label, index) => {
              const valor = chartSemana.ganancias[index] || 0;
              const altura = Math.max(5, (valor / maxGananciaSemana) * 100);

              return (
                <div key={label} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg transition-all duration-700 ease-out"
                    style={{ height: `${altura}%` }}
                  ></div>
                  <span className="text-zinc-400 text-xs sm:text-sm mt-1 sm:mt-2">{label}</span>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
              Sin datos suficientes de esta semana
            </div>
          )}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Actividad Reciente</h3>
        <div className="space-y-3 sm:space-y-4">
          {actividadReciente.length > 0 ? (
            actividadReciente.map((actividad, index) => (
              <div key={index} className="flex items-center space-x-2 sm:space-x-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors">
                <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs sm:text-sm truncate">{actividad.descripcion}</p>
                  <p className="text-zinc-400 text-xs">{actividad.tiempo}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  actividad.tipo === 'cita' ? 'bg-blue-500/20 text-blue-300' :
                  actividad.tipo === 'venta' ? 'bg-green-500/20 text-green-300' :
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {actividad.tipo}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 sm:py-8">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-600 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <p className="text-zinc-400 text-sm sm:text-base">No hay actividad reciente</p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default Dashboard;