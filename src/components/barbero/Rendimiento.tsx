import React, { useState, useEffect } from 'react';
import { getBarberoStats } from '../../utils/barberoApi';

const Rendimiento = ({ barberoInfo, mostrarNotificacion }) => {
  const [stats, setStats] = useState({
    ganancias_dia: 0,
    ganancias_semana: 0,
    ganancias_mes: 0,
    citas_dia: 0,
    citas_semana: 0,
    citas_mes: 0,
    ventas_dia: 0,
    ventas_semana: 0,
    ventas_mes: 0,
    servicios_populares: [],
    productos_vendidos: [],
    horarios_ocupados: []
  });
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('semana'); // dia, semana, mes
  const [chartData, setChartData] = useState({
    ganancias: [],
    citas: [],
    labels: []
  });

  useEffect(() => {
    cargarEstadisticas();
  }, [periodo]);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      const response = await getBarberoStats();
      if (response.success) {
        setStats(response.stats);
        generarDatosGrafico(response.stats);
      } else {
        mostrarNotificacion('Error al cargar estadísticas', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generarDatosGrafico = (statsData) => {
    // Generar datos simulados para el gráfico basados en el período
    let labels = [];
    let ganancias = [];
    let citas = [];

    if (periodo === 'dia') {
      // Últimas 24 horas por horas
      for (let i = 23; i >= 0; i--) {
        const hora = new Date();
        hora.setHours(hora.getHours() - i);
        labels.push(hora.getHours() + ':00');
        ganancias.push(Math.random() * 50000);
        citas.push(Math.floor(Math.random() * 5));
      }
    } else if (periodo === 'semana') {
      // Últimos 7 días
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        labels.push(dias[fecha.getDay()]);
        ganancias.push(Math.random() * 200000);
        citas.push(Math.floor(Math.random() * 15));
      }
    } else {
      // Últimos 30 días
      for (let i = 29; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        labels.push(fecha.getDate().toString());
        ganancias.push(Math.random() * 300000);
        citas.push(Math.floor(Math.random() * 20));
      }
    }

    setChartData({ labels, ganancias, citas });
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const calcularPorcentajeCambio = (actual, anterior) => {
    if (anterior === 0) return 0;
    return ((actual - anterior) / anterior * 100).toFixed(1);
  };

  const obtenerColorPorcentaje = (porcentaje) => {
    return porcentaje >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const obtenerIconoPorcentaje = (porcentaje) => {
    return porcentaje >= 0 ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17l9.2-9.2M17 17V7H7"></path>
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 7l-9.2 9.2M7 7v10h10"></path>
      </svg>
    );
  };

  const SimpleChart = ({ data, labels, color, type = 'line' }) => {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    return (
      <div className="relative h-32 w-full">
        <svg className="w-full h-full" viewBox="0 0 400 120">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="24" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 24" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Chart line/bars */}
          {type === 'line' ? (
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={data.map((value, index) => {
                const x = (index / (data.length - 1)) * 380 + 10;
                const y = 110 - ((value - minValue) / range) * 100;
                return `${x},${y}`;
              }).join(' ')}
            />
          ) : (
            data.map((value, index) => {
              const x = (index / data.length) * 380 + 10;
              const height = ((value - minValue) / range) * 100;
              const y = 110 - height;
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={380 / data.length - 2}
                  height={height}
                  fill={color}
                  opacity="0.7"
                />
              );
            })
          )}
          
          {/* Data points */}
          {type === 'line' && data.map((value, index) => {
            const x = (index / (data.length - 1)) * 380 + 10;
            const y = 110 - ((value - minValue) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={color}
              />
            );
          })}
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-zinc-400 px-2">
          {labels.map((label, index) => (
            <span key={index} className={index % 2 === 0 ? '' : 'hidden sm:block'}>
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-zinc-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Rendimiento</h2>
            <p className="text-sm sm:text-base text-zinc-400">Análisis de tu desempeño y estadísticas</p>
          </div>
          
          <div className="flex space-x-1 sm:space-x-2">
            {['dia', 'semana', 'mes'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                  periodo === p
                    ? 'bg-yellow-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-zinc-400 text-xs sm:text-sm font-medium">Ganancias Hoy</p>
              <p className="text-lg sm:text-2xl font-bold text-white truncate">{formatearMoneda(stats.ganancias_dia)}</p>
              <div className={`flex items-center mt-1 text-xs sm:text-sm ${obtenerColorPorcentaje(15)}`}>
                {obtenerIconoPorcentaje(15)}
                <span className="ml-1 truncate">+15.3% vs ayer</span>
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-600 to-green-800 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-zinc-400 text-xs sm:text-sm font-medium">Citas Hoy</p>
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.citas_dia}</p>
              <div className={`flex items-center mt-1 text-xs sm:text-sm ${obtenerColorPorcentaje(8)}`}>
                {obtenerIconoPorcentaje(8)}
                <span className="ml-1 truncate">+8.1% vs ayer</span>
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-zinc-400 text-xs sm:text-sm font-medium">Ganancias Semana</p>
              <p className="text-lg sm:text-2xl font-bold text-white truncate">{formatearMoneda(stats.ganancias_semana)}</p>
              <div className={`flex items-center mt-1 text-xs sm:text-sm ${obtenerColorPorcentaje(12)}`}>
                {obtenerIconoPorcentaje(12)}
                <span className="ml-1 truncate">+12.5% vs sem. anterior</span>
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-zinc-400 text-xs sm:text-sm font-medium">Promedio por Cita</p>
              <p className="text-lg sm:text-2xl font-bold text-white truncate">
                {formatearMoneda(stats.citas_dia > 0 ? stats.ganancias_dia / stats.citas_dia : 0)}
              </p>
              <div className={`flex items-center mt-1 text-xs sm:text-sm ${obtenerColorPorcentaje(5)}`}>
                {obtenerIconoPorcentaje(5)}
                <span className="ml-1 truncate">+5.2% vs ayer</span>
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-600 to-purple-800 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Ganancias - {periodo}</h3>
          <SimpleChart 
            data={chartData.ganancias} 
            labels={chartData.labels} 
            color="#10b981" 
            type="line"
          />
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Citas - {periodo}</h3>
          <SimpleChart 
            data={chartData.citas} 
            labels={chartData.labels} 
            color="#3b82f6" 
            type="bar"
          />
        </div>
      </div>

      {/* Servicios y productos populares */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Servicios Más Populares</h3>
          <div className="space-y-3 sm:space-y-4">
            {stats.servicios_populares && stats.servicios_populares.length > 0 ? (
              stats.servicios_populares.map((servicio, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' : 'bg-zinc-600'
                    }`}></div>
                    <span className="text-white font-medium text-sm sm:text-base truncate">{servicio.nombre}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-white font-semibold text-sm sm:text-base">{servicio.cantidad || 0} veces</p>
                    <p className="text-zinc-400 text-xs sm:text-sm">{formatearMoneda(servicio.total || 0)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 sm:py-8">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <p className="text-zinc-400 text-sm sm:text-base">No hay datos de servicios</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Productos Más Vendidos</h3>
          <div className="space-y-3 sm:space-y-4">
            {stats.productos_vendidos && stats.productos_vendidos.length > 0 ? (
              stats.productos_vendidos.map((producto, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                      index === 0 ? 'bg-green-500' :
                      index === 1 ? 'bg-blue-400' :
                      index === 2 ? 'bg-purple-600' : 'bg-zinc-600'
                    }`}></div>
                    <span className="text-white font-medium text-sm sm:text-base truncate">{producto.nombre}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-white font-semibold text-sm sm:text-base">{producto.cantidad || 0} unidades</p>
                    <p className="text-zinc-400 text-xs sm:text-sm">{formatearMoneda(producto.total || 0)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 sm:py-8">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                <p className="text-zinc-400 text-sm sm:text-base">No hay datos de productos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horarios más ocupados */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Horarios Más Ocupados</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-2 sm:gap-4">
          {Array.from({ length: 12 }, (_, i) => {
            const hora = i + 8; // De 8 AM a 7 PM
            const ocupacion = Math.random() * 100; // Simulado
            const intensidad = ocupacion > 75 ? 'high' : ocupacion > 50 ? 'medium' : 'low';
            
            return (
              <div key={hora} className="text-center">
                <div className={`w-full h-12 sm:h-16 rounded-lg mb-1 sm:mb-2 flex items-center justify-center ${
                  intensidad === 'high' ? 'bg-red-600/80' :
                  intensidad === 'medium' ? 'bg-yellow-600/80' : 'bg-green-600/80'
                }`}>
                  <span className="text-white font-bold text-xs sm:text-sm">{ocupacion.toFixed(0)}%</span>
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm">{hora}:00</p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 text-xs sm:text-sm">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-600 rounded"></div>
            <span className="text-zinc-400">Baja ocupación</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-600 rounded"></div>
            <span className="text-zinc-400">Media ocupación</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-600 rounded"></div>
            <span className="text-zinc-400">Alta ocupación</span>
          </div>
        </div>
      </div>

      {/* Objetivos y metas */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Objetivos del Mes</h3>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
              <span className="text-white font-medium text-sm sm:text-base">Ganancias Mensuales</span>
              <span className="text-zinc-400 text-xs sm:text-sm">{formatearMoneda(stats.ganancias_mes)} / {formatearMoneda(2000000)}</span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2 sm:h-3">
              <div 
                className="bg-gradient-to-r from-green-600 to-green-400 h-2 sm:h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((stats.ganancias_mes / 2000000) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">{((stats.ganancias_mes / 2000000) * 100).toFixed(1)}% completado</p>
          </div>
          
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
              <span className="text-white font-medium text-sm sm:text-base">Citas Mensuales</span>
              <span className="text-zinc-400 text-xs sm:text-sm">{stats.citas_mes} / 100</span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2 sm:h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 sm:h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((stats.citas_mes / 100) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">{((stats.citas_mes / 100) * 100).toFixed(1)}% completado</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rendimiento;