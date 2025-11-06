import React, { useState, useEffect } from 'react';
import { getBarberoStats } from '../../utils/barberoApi';

const Dashboard = ({ barberoInfo, mostrarNotificacion }) => {
  const [stats, setStats] = useState({
    gananciasHoy: 0,
    gananciasSemanales: 0,
    citasHoy: 0,
    citasSemanales: 0,
    citasPendientes: 0
  });
  const [loading, setLoading] = useState(true);
  const [actividadReciente, setActividadReciente] = useState([]);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const response = await getBarberoStats();
      if (response && response.success) {
        const statsData = response.stats || {};
        setStats({
          gananciasHoy: statsData.ventas_hoy || 0,
          gananciasSemanales: statsData.ventas_semana || 0,
          citasHoy: statsData.citas_hoy || 0,
          citasSemanales: statsData.citas_semana || 0,
          citasPendientes: statsData.citas_pendientes || 0
        });
        setActividadReciente([]);
      } else {
        mostrarNotificacion('Error al cargar estadísticas', 'error');
        setStats({
          gananciasHoy: 0,
          gananciasSemanales: 0,
          citasHoy: 0,
          citasSemanales: 0,
          citasPendientes: 0
        });
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
      setStats({
        gananciasHoy: 0,
        gananciasSemanales: 0,
        citasHoy: 0,
        citasSemanales: 0,
        citasPendientes: 0
      });
    } finally {
      setLoading(false);
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
      iconColor: 'text-green-400'
    },
    {
      titulo: 'Ganancias Semana',
      valor: formatearMoneda(stats.gananciasSemanales),
      icono: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      color: 'blue',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/20',
      iconColor: 'text-blue-400'
    },
    {
      titulo: 'Citas Hoy',
      valor: stats.citasHoy,
      icono: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'purple',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/20',
      iconColor: 'text-purple-400'
    },
    {
      titulo: 'Citas Pendientes',
      valor: stats.citasPendientes,
      icono: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'yellow',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/20',
      iconColor: 'text-yellow-400'
    }
  ];

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
          <div key={index} className={`bg-black/40 backdrop-blur-md border ${card.borderColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:scale-105 transition-transform duration-300`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-zinc-400 text-xs sm:text-sm font-medium truncate">{card.titulo}</p>
                <p className="text-lg sm:text-2xl font-bold text-white mt-1 truncate">{card.valor}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${card.bgColor} rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ml-2`}>
                <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icono}></path>
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de Ganancias Semanales */}
      <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Ganancias de la Semana</h3>
        <div className="h-48 sm:h-64 flex items-end justify-between space-x-1 sm:space-x-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia, index) => {
            const altura = Math.random() * 100 + 20; // Datos simulados
            return (
              <div key={dia} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg transition-all duration-1000 ease-out"
                  style={{ height: `${altura}%` }}
                ></div>
                <span className="text-zinc-400 text-xs sm:text-sm mt-1 sm:mt-2">{dia}</span>
              </div>
            );
          })}
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