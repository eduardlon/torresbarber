import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getBarberosDisponibles, getServiciosPublico, agendarCita } from '../utils/api';

// Workaround temporal: definir getHorasDisponibles aquí hasta resolver el caché
const API_BASE_URL = typeof window !== 'undefined' 
  ? `http://${window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname}:8001/api`
  : 'http://localhost:8001/api';

const getHorasDisponibles = async (fecha: string, barberoId: number) => {
  const params = new URLSearchParams({
    fecha: fecha,
    barbero_id: barberoId.toString()
  });

  const response = await fetch(`${API_BASE_URL}/horas-disponibles?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cargar horas disponibles');
  }
  
  const data = await response.json();
  return data.data;
};

interface Barbero {
  id: number;
  nombre: string;
  apellido?: string;
  especialidad?: string;
  foto?: string;
}

interface Servicio {
  id: number;
  nombre: string;
  descripcion?: string;
  base_duration?: number;      // Campo del backend Laravel
  duracion_estimada?: number;  // Compatibilidad con otros componentes
  complexity_tier?: string;    // Campo del backend Laravel
  precio: number;
  imagen?: string;
  activo: boolean;
}

// Componente: Calendario Moderno
const CalendarioModerno: React.FC<{
  fechaSeleccionada: string;
  onSeleccionarFecha: (fecha: string) => void;
}> = ({ fechaSeleccionada, onSeleccionarFecha }) => {
  const [mesActual, setMesActual] = useState(new Date());
  
  const obtenerDiasDelMes = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();
    
    const dias = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }
    
    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(new Date(year, month, dia));
    }
    
    return dias;
  };
  
  const cambiarMes = (incremento: number) => {
    const nuevoMes = new Date(mesActual);
    nuevoMes.setMonth(mesActual.getMonth() + incremento);
    setMesActual(nuevoMes);
  };
  
  const cambiarAño = (incremento: number) => {
    const nuevoMes = new Date(mesActual);
    nuevoMes.setFullYear(mesActual.getFullYear() + incremento);
    setMesActual(nuevoMes);
  };
  
  const formatearFecha = (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const esHoy = (fecha: Date | null) => {
    if (!fecha) return false;
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };
  
  const esPasado = (fecha: Date | null) => {
    if (!fecha) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha < hoy;
  };
  
  const esDomingo = (fecha: Date | null) => {
    if (!fecha) return false;
    return fecha.getDay() === 0; // Domingo cerrado
  };
  
  const esSeleccionada = (fecha: Date | null) => {
    if (!fecha || !fechaSeleccionada) return false;
    return formatearFecha(fecha) === fechaSeleccionada;
  };
  
  const dias = obtenerDiasDelMes();
  const nombreMes = mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  const hoy = new Date();
  const puedeRetroceder = mesActual.getMonth() > hoy.getMonth() || mesActual.getFullYear() > hoy.getFullYear();
  
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          {/* Año anterior */}
          <button
            type="button"
            onClick={() => cambiarAño(-1)}
            disabled={!puedeRetroceder}
            className="p-1 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Año anterior"
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
            </svg>
          </button>
          {/* Mes anterior */}
          <button
            type="button"
            onClick={() => cambiarMes(-1)}
            disabled={!puedeRetroceder}
            className="p-1 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mes anterior"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
        </div>
        
        <h3 className="text-xs font-bold text-white capitalize">{nombreMes}</h3>
        
        <div className="flex items-center gap-1">
          {/* Mes siguiente */}
          <button
            type="button"
            onClick={() => cambiarMes(1)}
            className="p-1 rounded-lg hover:bg-zinc-700 transition-colors"
            title="Mes siguiente"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
          {/* Año siguiente */}
          <button
            type="button"
            onClick={() => cambiarAño(1)}
            className="p-1 rounded-lg hover:bg-zinc-700 transition-colors"
            title="Año siguiente"
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-0.5 mb-1.5">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((dia) => (
          <div key={dia} className="text-center text-[10px] font-semibold text-zinc-400 py-0.5">
            {dia}
          </div>
        ))}
      </div>
      
      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((fecha, index) => {
          if (!fecha) {
            return <div key={`empty-${index}`} className="aspect-square"></div>;
          }
          
          const deshabilitado = esPasado(fecha) || esDomingo(fecha);
          const seleccionada = esSeleccionada(fecha);
          const hoyDia = esHoy(fecha);
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => !deshabilitado && onSeleccionarFecha(formatearFecha(fecha))}
              disabled={deshabilitado}
              className={`
                aspect-square rounded text-[10px] font-medium transition-all
                ${deshabilitado 
                  ? 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed' 
                  : 'hover:bg-zinc-700 text-white cursor-pointer'
                }
                ${seleccionada 
                  ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black font-bold ring-1 ring-yellow-400' 
                  : ''
                }
                ${hoyDia && !seleccionada 
                  ? 'ring-1 ring-blue-500 text-blue-400' 
                  : ''
                }
              `}
            >
              {fecha.getDate()}
            </button>
          );
        })}
      </div>
      
      {/* Leyenda compacta */}
      <div className="mt-2 pt-2 border-t border-zinc-700 flex flex-wrap gap-1.5 text-[10px]">
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded bg-gradient-to-br from-yellow-500 to-yellow-600"></div>
          <span className="text-zinc-400">Sel.</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded ring-1 ring-blue-500"></div>
          <span className="text-zinc-400">Hoy</span>
        </div>
      </div>
    </div>
  );
};

interface HoraDisponible {
  valor: string;
  etiqueta: string;
  disponible: boolean;
}

// Componente: Selector de Hora Moderno
const SelectorHoraModerno: React.FC<{
  horaSeleccionada: string;
  onSeleccionarHora: (hora: string) => void;
  horasDisponibles?: HoraDisponible[];
  cargando?: boolean;
}> = ({ horaSeleccionada, onSeleccionarHora, horasDisponibles, cargando = false }) => {
  // Horario: 9:00 AM a 8:00 PM (cada 30 minutos)
  const generarHorarios = () => {
    const horarios = [];
    for (let hora = 9; hora <= 20; hora++) {
      for (let minuto of [0, 30]) {
        if (hora === 20 && minuto === 30) continue; // No pasar de 8:00 PM
        const horaStr = String(hora).padStart(2, '0');
        const minutoStr = String(minuto).padStart(2, '0');
        const tiempo24 = `${horaStr}:${minutoStr}`;
        
        // Formato AM/PM
        const hora12 = hora > 12 ? hora - 12 : hora;
        const periodo = hora >= 12 ? 'PM' : 'AM';
        const tiempoFormato = `${hora12}:${minutoStr} ${periodo}`;
        
        horarios.push({ valor: tiempo24, etiqueta: tiempoFormato });
      }
    }
    return horarios;
  };
  
  // Usar horas disponibles si están presentes, sino generar las estáticas
  const horariosAUsar = horasDisponibles && horasDisponibles.length > 0 
    ? horasDisponibles 
    : generarHorarios();
  
  // Dividir en mañana, tarde y noche
  const horariosMañana = horariosAUsar.filter(h => {
    const hora = parseInt(h.valor.split(':')[0]);
    return hora >= 9 && hora < 12;
  });
  
  const horariosTarde = horariosAUsar.filter(h => {
    const hora = parseInt(h.valor.split(':')[0]);
    return hora >= 12 && hora < 17;
  });
  
  const horariosNoche = horariosAUsar.filter(h => {
    const hora = parseInt(h.valor.split(':')[0]);
    return hora >= 17;
  });
  
  const SeccionHorarios = ({ 
    titulo, 
    icono, 
    horarios 
  }: { 
    titulo: string; 
    icono: string; 
    horarios: { valor: string; etiqueta: string }[] 
  }) => (
    <div>
      <h4 className="text-[10px] font-semibold text-zinc-400 mb-1.5 flex items-center gap-1">
        <span className="text-xs">{icono}</span>
        {titulo}
      </h4>
      <div className="grid grid-cols-3 gap-1.5">
        {horarios.map((horario) => (
          <button
            key={horario.valor}
            type="button"
            onClick={() => onSeleccionarHora(horario.valor)}
            className={`
              px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all
              ${horaSeleccionada === horario.valor
                ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black ring-1 ring-yellow-400 scale-105'
                : 'bg-zinc-800/70 text-white hover:bg-zinc-700 hover:scale-105'
              }
            `}
          >
            {horario.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
  
  // Mostrar indicador de carga
  if (cargando) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-600 border-t-transparent mx-auto mb-2"></div>
          <p className="text-zinc-400 text-xs">Cargando horarios...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si no hay horas disponibles
  if (horariosAUsar.length === 0) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
        <div className="text-center text-zinc-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p className="text-sm font-medium mb-1">No hay horarios disponibles</p>
          <p className="text-xs">Intenta con otra fecha</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 space-y-3 max-h-[380px] overflow-y-auto scrollbar-hide">
      {horariosMañana.length > 0 && <SeccionHorarios titulo="Mañana" icono="🌅" horarios={horariosMañana} />}
      {horariosTarde.length > 0 && <SeccionHorarios titulo="Tarde" icono="☀️" horarios={horariosTarde} />}
      {horariosNoche.length > 0 && <SeccionHorarios titulo="Noche" icono="🌙" horarios={horariosNoche} />}
    </div>
  );
};

// Función helper para formatear hora en formato 12h
const formatTime12 = (time24: string): string => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const BookingAppMejorado: React.FC = () => {
  const [paso, setPaso] = useState(1);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  
  // Datos del formulario
  const [selectedBarbero, setSelectedBarbero] = useState<number | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<number | null>(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [notas, setNotas] = useState('');
  
  // Estados para horas disponibles
  const [horasDisponibles, setHorasDisponibles] = useState<HoraDisponible[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);

  useEffect(() => {
    cargarDatos();

    // Leer parámetro de barbero de la URL
    const params = new URLSearchParams(window.location.search);
    const barberoParam = params.get('barbero');
    if (barberoParam) {
      const barberoId = parseInt(barberoParam);
      if (!isNaN(barberoId)) {
        setSelectedBarbero(barberoId);
      }
    }
  }, []);

  // Cargar horas disponibles cuando cambien fecha o barbero
  useEffect(() => {
    if (fecha && selectedBarbero) {
      cargarHorasDisponibles();
    } else {
      setHorasDisponibles([]);
      setHora(''); // Resetear hora si cambian los prerequisitos
    }
  }, [fecha, selectedBarbero]);

  const cargarHorasDisponibles = async () => {
    if (!fecha || !selectedBarbero) return;

    setCargandoHoras(true);
    try {
      const horas = await getHorasDisponibles(fecha, selectedBarbero);
      
      // Verificar si la fecha seleccionada es hoy
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0];
      const esHoy = fecha === fechaHoy;
      
      let horasFiltradas = horas;
      
      // Si es hoy, filtrar horas que ya pasaron
      if (esHoy) {
        const horaActual = hoy.getHours();
        const minutoActual = hoy.getMinutes();
        const totalMinutosActual = horaActual * 60 + minutoActual;
        
        console.log('\n=== FILTRADO DE HORAS (HOY) ===');
        console.log('Hora actual:', `${horaActual}:${minutoActual.toString().padStart(2, '0')}`);
        console.log('Total minutos actual:', totalMinutosActual);
        console.log('Horas disponibles del backend:', horas.map(h => h.valor));
        
        horasFiltradas = horas.filter((h: HoraDisponible) => {
          const [horaStr, minutoStr] = h.valor.split(':');
          const horaNum = parseInt(horaStr);
          const minutoNum = parseInt(minutoStr);
          const totalMinutosHora = horaNum * 60 + minutoNum;
          
          // Debe ser al menos 10 minutos en el futuro (reducido de 30 a 10)
          const esValida = totalMinutosHora > (totalMinutosActual + 10);
          
          console.log(`Hora ${h.valor}: ${totalMinutosHora} minutos vs ${totalMinutosActual + 10} requeridos = ${esValida ? 'VÁLIDA' : 'FILTRADA'}`);
          
          return esValida;
        });
        
        console.log('Horas filtradas:', horasFiltradas.map(h => h.valor));
      } else {
        console.log('\n=== FILTRADO DE HORAS (NO ES HOY) ===');
        console.log('Fecha seleccionada:', fecha, '- No se filtran horas');
      }
      
      setHorasDisponibles(horasFiltradas);
      
      // Si la hora seleccionada ya no está disponible, resetearla
      if (hora && !horasFiltradas.some((h: HoraDisponible) => h.valor === hora)) {
        setHora('');
      }
    } catch (error) {
      console.error('Error al cargar horas disponibles:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Error al cargar horarios disponibles. Intenta nuevamente.'
      });
      setHorasDisponibles([]);
    } finally {
      setCargandoHoras(false);
    }
  };

  const cargarDatos = async () => {
    try {
      const [dataBarberos, dataServicios] = await Promise.all([
        getBarberosDisponibles(),
        getServiciosPublico()
      ]);
      
      console.log('Servicios recibidos del backend:', dataServicios);
      
      // Mapear servicios del backend Laravel al formato esperado
      const serviciosMapeados = dataServicios.map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        base_duration: s.base_duration,
        duracion_estimada: s.base_duration || s.duracion_estimada,
        complexity_tier: s.complexity_tier,
        precio: parseFloat(s.precio),
        imagen: s.imagen,
        activo: s.activo === true || s.activo === 1
      }));
      
      setBarberos(dataBarberos);
      // Filtrar solo servicios activos
      setServicios(serviciosMapeados.filter((s: Servicio) => s.activo));
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error al cargar datos. Por favor recarga la página.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setEnviando(true);

    try {
      // Asegurar formato correcto de hora
      const horaCompleta = hora.includes(':') ? hora : `${hora}:00`;
      
      // Crear objeto Date para validar que sea futura
      const [year, month, day] = fecha.split('-').map(Number);
      const [horas, minutos] = horaCompleta.split(':').map(Number);
      const fechaSeleccionada = new Date(year, month - 1, day, horas, minutos, 0);
      
      // Validar que sea fecha futura con margen de seguridad
      const ahora = new Date();
      const margenMinutos = 5; // 5 minutos de margen
      const ahoraConMargen = new Date(ahora.getTime() + (margenMinutos * 60 * 1000));
      
      if (fechaSeleccionada <= ahoraConMargen) {
        setMensaje({
          tipo: 'error',
          texto: `Por favor selecciona una fecha y hora con al menos ${margenMinutos} minutos de anticipación.`
        });
        setEnviando(false);
        return;
      }
      
      // SOLUCION AL PROBLEMA DE TIMEZONE:
      // Opción 1: Enviar como UTC (si el backend espera UTC)
      const fechaHoraUTC = fechaSeleccionada.toISOString().slice(0, 19).replace('T', ' ');
      
      // Opción 2: Enviar con timezone explícito (formato ISO con timezone)
      const fechaHoraConTimezone = fechaSeleccionada.toISOString();
      
      // Usar la fecha local sin conversión (si el backend maneja timezone correctamente)
      const fechaHoraLocal = `${fecha} ${horaCompleta}:00`;
      
      // Por ahora usaremos la fecha local + un margen en el backend
      const fechaHoraParaBackend = fechaHoraLocal;
      
      console.log('=== AGENDANDO CITA - DEBUG TIMEZONE ===' );
      console.log('Fecha seleccionada:', fecha);
      console.log('Hora seleccionada:', hora);
      console.log('Fecha objeto local:', fechaSeleccionada.toLocaleString('es-CO'));
      console.log('Timezone offset (minutos):', fechaSeleccionada.getTimezoneOffset());
      console.log('\n--- OPCIONES DE FORMATO ---');
      console.log('Formato local:', fechaHoraLocal);
      console.log('Formato UTC:', fechaHoraUTC);
      console.log('Formato con timezone:', fechaHoraConTimezone);
      console.log('\n--- CONTEXTO ---');
      console.log('Ahora local:', ahora.toLocaleString('es-CO'));
      console.log('Ahora UTC:', ahora.toISOString());
      console.log('¿Es futura (con margen)?', fechaSeleccionada > ahoraConMargen);
      console.log('\n--- ENVIANDO AL BACKEND ---');
      console.log('Fecha/Hora para backend:', fechaHoraParaBackend);
      console.log('Barbero ID:', selectedBarbero);
      console.log('Servicio ID:', selectedServicio);
      
      await agendarCita({
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
        cliente_email: clienteEmail ? clienteEmail.trim() : null,
        barbero_id: parseInt(selectedBarbero as any),
        servicio_id: parseInt(selectedServicio as any),
        fecha_hora: fechaHoraParaBackend, // Usar la fecha convertida a UTC
        estado: 'pendiente',
        notas: notas ? notas.trim() : null
      });

      setMensaje({ 
        tipo: 'success', 
        texto: '¡Cita agendada exitosamente! Te contactaremos para confirmar.' 
      });
      
      // Reiniciar formulario
      setTimeout(() => {
        resetFormulario();
      }, 3000);
      
    } catch (error: any) {
      setMensaje({ 
        tipo: 'error', 
        texto: error.message || 'Error al agendar la cita.' 
      });
    } finally {
      setEnviando(false);
    }
  };

  const resetFormulario = () => {
    setPaso(1);
    setSelectedBarbero(null);
    setSelectedServicio(null);
    setFecha('');
    setHora('');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteEmail('');
    setNotas('');
    setMensaje(null);
  };

  const puedeAvanzar = () => {
    switch (paso) {
      case 1: return selectedBarbero !== null;
      case 2: return selectedServicio !== null;
      case 3: return fecha !== '' && hora !== '';
      case 4: return clienteNombre !== '' && clienteTelefono !== '';
      default: return false;
    }
  };

  const barberoSeleccionado = barberos.find(b => b.id === selectedBarbero);
  const servicioSeleccionado = servicios.find(s => s.id === selectedServicio);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
            Agenda tu Cita
          </h1>
          <p className="text-zinc-400">Sigue los pasos para agendar tu corte</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center relative">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex-1 relative">
                <div className={`w-full h-2 rounded-full transition-colors ${
                  num <= paso ? 'bg-yellow-600' : 'bg-zinc-700'
                }`}></div>
                <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  num <= paso 
                    ? 'bg-yellow-600 text-black' 
                    : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {num}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-5">
            <span className={`text-xs ${paso >= 1 ? 'text-yellow-400' : 'text-zinc-600'}`}>Barbero</span>
            <span className={`text-xs ${paso >= 2 ? 'text-yellow-400' : 'text-zinc-600'}`}>Servicio</span>
            <span className={`text-xs ${paso >= 3 ? 'text-yellow-400' : 'text-zinc-600'}`}>Fecha/Hora</span>
            <span className={`text-xs ${paso >= 4 ? 'text-yellow-400' : 'text-zinc-600'}`}>Datos</span>
          </div>
        </div>

        {/* Mensaje de notificación */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl border ${
            mensaje.tipo === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-300' 
              : 'bg-red-500/20 border-red-500/30 text-red-300'
          }`}>
            <p className="font-medium">{mensaje.texto}</p>
          </div>
        )}

        {/* Contenido del formulario */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-8">
          <form onSubmit={handleSubmit}>
            {/* Paso 1: Selección de Barbero */}
            {paso === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Selecciona tu Barbero</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {barberos.map((barbero) => (
                    <button
                      key={barbero.id}
                      type="button"
                      onClick={() => setSelectedBarbero(barbero.id)}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        selectedBarbero === barbero.id
                          ? 'border-yellow-500 bg-yellow-500/20'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center text-2xl">
                          ✂️
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white">
                            {barbero.nombre} {barbero.apellido}
                          </h3>
                          {barbero.especialidad && (
                            <p className="text-sm text-zinc-400">{barbero.especialidad}</p>
                          )}
                        </div>
                        {selectedBarbero === barbero.id && (
                          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paso 2: Selección de Servicio */}
            {paso === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Selecciona el Servicio</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {servicios.map((servicio) => (
                    <button
                      key={servicio.id}
                      type="button"
                      onClick={() => setSelectedServicio(servicio.id)}
                      className={`p-6 rounded-xl border-2 transition-all text-left overflow-hidden ${
                        selectedServicio === servicio.id
                          ? 'border-yellow-500 bg-yellow-500/20'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Imagen del servicio si existe */}
                        {servicio.imagen && (
                          <div className="w-full h-32 rounded-lg overflow-hidden mb-3">
                            <img 
                              src={servicio.imagen} 
                              alt={servicio.nombre}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white">{servicio.nombre}</h3>
                            {servicio.complexity_tier && (
                              <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-zinc-700 text-zinc-300">
                                {servicio.complexity_tier}
                              </span>
                            )}
                          </div>
                          {selectedServicio === servicio.id && (
                            <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                        
                        {servicio.descripcion && (
                          <p className="text-sm text-zinc-400 line-clamp-2">{servicio.descripcion}</p>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                          <span className="text-yellow-400 font-bold text-xl">
                            ${servicio.precio.toLocaleString()}
                          </span>
                          {(servicio.base_duration || servicio.duracion_estimada) && (
                            <span className="text-zinc-400 text-sm flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              {servicio.base_duration || servicio.duracion_estimada} min
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paso 3: Fecha y Hora */}
            {paso === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Selecciona Fecha y Hora</h2>
                
                {/* Versión Móvil - Con Selector de Horas Disponibles */}
                <div className="block lg:hidden space-y-4">
                  {/* Input Fecha */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      📅 Selecciona la fecha
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFecha(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-3 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none cursor-pointer"
                        style={{
                          colorScheme: 'dark',
                        }}
                        required
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Selector de Hora Móvil */}
                  {fecha && (
                    <div className="animate-fadeIn">
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        🕐 Selecciona la hora disponible
                      </label>
                      <SelectorHoraModerno 
                        horaSeleccionada={hora}
                        onSeleccionarHora={(nuevaHora) => setHora(nuevaHora)}
                        horasDisponibles={horasDisponibles}
                        cargando={cargandoHoras}
                      />
                    </div>
                  )}

                  {/* Vista previa elegante en móvil */}
                  {fecha && hora && (
                    <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-4 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-zinc-400 mb-1">Tu cita</p>
                          <p className="text-white font-bold text-sm">
                            {new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-zinc-700"></div>
                        <div className="flex-1 text-right">
                          <p className="text-xs text-zinc-400 mb-1">Hora</p>
                          <p className="text-white font-bold text-sm">
                            {formatTime12(hora)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Versión Desktop - Layout lado a lado */}
                <div className="hidden lg:grid lg:grid-cols-5 gap-6">
                  {/* Calendario Compacto - 2 columnas */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                      📅 Elige el día
                    </label>
                    <CalendarioModerno 
                      fechaSeleccionada={fecha}
                      onSeleccionarFecha={(nuevaFecha) => setFecha(nuevaFecha)}
                    />
                  </div>

                  {/* Selector de Hora - 3 columnas */}
                  {fecha && (
                    <div className="lg:col-span-3 animate-fadeIn">
                      <label className="block text-sm font-medium text-zinc-300 mb-3">
                        🕐 Selecciona la hora
                      </label>
                      <SelectorHoraModerno 
                        horaSeleccionada={hora}
                        onSeleccionarHora={(nuevaHora) => setHora(nuevaHora)}
                        horasDisponibles={horasDisponibles}
                        cargando={cargandoHoras}
                      />
                    </div>
                  )}
                </div>

                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-xs sm:text-sm">
                    ⓘ Horario de atención: Lunes a Sábado de 9:00 AM a 8:00 PM
                  </p>
                </div>
              </div>
            )}

            {/* Paso 4: Datos del Cliente */}
            {paso === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Tus Datos</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setClienteNombre(e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setClienteTelefono(e.target.value)}
                      placeholder="3001234567"
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setClienteEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Notas o Preferencias (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotas(e.target.value)}
                      rows={3}
                      placeholder="Ej: Preferencia de estilo, alergias, etc."
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mt-6">
                  <h3 className="text-lg font-bold text-yellow-400 mb-4">✨ Resumen de tu Cita</h3>
                  <div className="space-y-3 text-white">
                    <div className="flex items-start">
                      <span className="text-zinc-400 w-28 flex-shrink-0">Barbero:</span>
                      <span className="font-medium">{barberoSeleccionado?.nombre} {barberoSeleccionado?.apellido}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-zinc-400 w-28 flex-shrink-0">Servicio:</span>
                      <div className="flex-1">
                        <p className="font-medium">{servicioSeleccionado?.nombre}</p>
                        {servicioSeleccionado?.descripcion && (
                          <p className="text-sm text-zinc-500 mt-1">{servicioSeleccionado.descripcion}</p>
                        )}
                      </div>
                    </div>
                    {(servicioSeleccionado?.base_duration || servicioSeleccionado?.duracion_estimada) && (
                      <div className="flex items-start">
                        <span className="text-zinc-400 w-28 flex-shrink-0">Duración:</span>
                        <span className="font-medium">{servicioSeleccionado.base_duration || servicioSeleccionado.duracion_estimada} minutos</span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-zinc-400 w-28 flex-shrink-0">Fecha:</span>
                      <span className="font-medium capitalize">
                        {(() => {
                          const [year, month, day] = fecha.split('-').map(Number);
                          const fechaObj = new Date(year, month - 1, day);
                          return fechaObj.toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        })()}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-zinc-400 w-28 flex-shrink-0">Hora:</span>
                      <span className="font-medium text-yellow-300">{formatTime12(hora)}</span>
                    </div>
                    <div className="border-t border-yellow-500/30 pt-3 mt-3">
                      <p className="text-2xl font-bold text-yellow-400 flex justify-between items-center">
                        <span>Total:</span>
                        <span>${servicioSeleccionado?.precio.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de navegación */}
            <div className="flex justify-between mt-8">
              {paso > 1 && (
                <button
                  type="button"
                  onClick={() => setPaso(paso - 1)}
                  className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
                >
                  Anterior
                </button>
              )}
              
              {paso < 4 ? (
                <button
                  type="button"
                  onClick={() => setPaso(paso + 1)}
                  disabled={!puedeAvanzar()}
                  className="ml-auto px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!puedeAvanzar() || enviando}
                  className="ml-auto px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {enviando ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Agendando...
                    </>
                  ) : (
                    'Confirmar Cita'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingAppMejorado;