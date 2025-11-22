import { useEffect, useMemo, useState } from 'react';

import { useModal } from '../../hooks/useModal.tsx';
import { supabaseService } from '../../services/supabaseService';
import { supabase } from '../../db/supabase.js';
import type { Appointment } from '../../types';

type StatusValue = 'pendiente' | 'confirmada' | 'en_proceso' | 'completada' | 'cancelada' | 'no_asistio';

type StatusMeta = {
  label: string;
  badgeClass: string;
  accentClass: string;
};

const DB_TO_UI_STATUS: Record<string, StatusValue> = {
  pending: 'pendiente',
  pendiente: 'pendiente',
  confirmed: 'confirmada',
  confirmada: 'confirmada',
  in_progress: 'en_proceso',
  en_proceso: 'en_proceso',
  processing: 'en_proceso',
  completed: 'completada',
  completada: 'completada',
  cancelled: 'cancelada',
  canceled: 'cancelada',
  cancelada: 'cancelada',
  no_show: 'no_asistio',
  ausente: 'no_asistio',
};

const UI_TO_DB_STATUS: Record<StatusValue, string> = {
  pendiente: 'pending',
  confirmada: 'confirmed',
  en_proceso: 'in_progress',
  completada: 'completed',
  cancelada: 'cancelled',
  no_asistio: 'no_show',
};

const STATUS_META: Record<StatusValue, StatusMeta> = {
  pendiente: {
    label: 'Pendiente',
    badgeClass: 'bg-yellow-900/50 text-yellow-400',
    accentClass: 'text-yellow-400',
  },
  confirmada: {
    label: 'Confirmada',
    badgeClass: 'bg-blue-900/50 text-blue-400',
    accentClass: 'text-blue-400',
  },
  en_proceso: {
    label: 'En proceso',
    badgeClass: 'bg-purple-900/50 text-purple-400',
    accentClass: 'text-purple-400',
  },
  completada: {
    label: 'Completada',
    badgeClass: 'bg-green-900/50 text-green-400',
    accentClass: 'text-green-400',
  },
  cancelada: {
    label: 'Cancelada',
    badgeClass: 'bg-red-900/50 text-red-400',
    accentClass: 'text-red-400',
  },
  no_asistio: {
    label: 'No asistió',
    badgeClass: 'bg-zinc-900/60 text-zinc-300',
    accentClass: 'text-zinc-300',
  },
};

type CitaItem = {
  id: string;
  fecha: string;
  hora24: string;
  horaDisplay: string;
  estado: StatusValue;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string | null;
  barberoNombre: string;
  servicioNombre: string;
  precio: number;
  notas?: string | null;
  duracion?: number | null;
  horaLlegada?: string | null;
  tiempoEspera?: number | null;
};

type StatsModalType = 'total' | 'pendientes' | 'confirmadas' | 'completadas';

const todayISO = (): string => new Date().toISOString().split('T')[0];

const formatCurrency = (value: number | null | undefined): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value ?? 0) ? Number(value ?? 0) : 0);

const formatDisplayTime = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return '--:--';
  const [hoursRaw, minutes] = time24.split(':');
  const hours = Number(hoursRaw);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

const formatDateLabel = (date: string): string => {
  if (!date) return 'Fecha no disponible';
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const extractRelationName = (relation: unknown, fallback: string): string => {
  const resolve = (value: Record<string, unknown>): string | null => {
    const nombre = value.nombre ?? value.name;
    const apellido = value.apellido ?? value.last_name;

    if (nombre && apellido) return `${nombre as string} ${apellido as string}`.trim();
    if (nombre) return String(nombre);
    if (apellido) return String(apellido);
    return null;
  };

  if (!relation) return fallback;

  if (Array.isArray(relation)) {
    const first = relation[0];
    if (first && typeof first === 'object') {
      return resolve(first as Record<string, unknown>) ?? fallback;
    }
  }

  if (typeof relation === 'object') {
    return resolve(relation as Record<string, unknown>) ?? fallback;
  }

  if (typeof relation === 'string') {
    return relation;
  }

  return fallback;
};

const mapAppointmentToItem = (appointment: Appointment): CitaItem => {
  const rawStatus = (appointment as unknown as Record<string, unknown>).estado ??
    (appointment as unknown as Record<string, unknown>).status ??
    'pendiente';

  const statusKey = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : 'pendiente';
  const estado = DB_TO_UI_STATUS[statusKey] ?? 'pendiente';

  const fechaHora = appointment.fecha_hora ? new Date(appointment.fecha_hora) : null;
  const fecha = fechaHora ? fechaHora.toISOString().split('T')[0] : todayISO();
  const hora24 = fechaHora
    ? fechaHora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';

  const horaLlegadaRaw = (appointment as unknown as Record<string, unknown>).hora_llegada ??
    (appointment as unknown as Record<string, unknown>).horaLlegada;
  const horaLlegada = typeof horaLlegadaRaw === 'string' && horaLlegadaRaw.includes(':')
    ? formatDisplayTime(horaLlegadaRaw.slice(0, 5))
    : null;

  const servicioNombre = extractRelationName(
    (appointment as unknown as Record<string, unknown>).servicios ?? appointment.servicio,
    'Servicio',
  );

  const barberoNombre = extractRelationName(
    (appointment as unknown as Record<string, unknown>).barberos ?? appointment.barbero,
    'Barbero',
  );

  const precio = Number(
    (appointment as unknown as Record<string, unknown>).precio_cobrado ??
    (appointment as unknown as Record<string, unknown>).precio ??
    appointment.servicio?.precio ??
    0,
  );

  const duracion = (appointment as unknown as Record<string, unknown>).duracion_estimada ??
    (appointment as unknown as Record<string, unknown>).duracion ??
    (appointment as unknown as Record<string, unknown>).estimated_duration ??
    appointment.servicio?.duracion_minutos ??
    null;

  return {
    id: String(appointment.id),
    fecha,
    hora24,
    horaDisplay: formatDisplayTime(hora24),
    estado,
    clienteNombre: appointment.cliente_nombre ?? 'Cliente',
    clienteTelefono: appointment.cliente_telefono ?? 'N/D',
    clienteEmail: appointment.cliente_email ?? null,
    barberoNombre,
    servicioNombre,
    precio,
    notas: (appointment as unknown as Record<string, unknown>).notas as string | null | undefined,
    duracion: typeof duracion === 'number' ? duracion : null,
    horaLlegada,
    tiempoEspera: (appointment as unknown as Record<string, unknown>).tiempo_espera as number | null | undefined,
  };
};

const Citas = () => {
  const [citas, setCitas] = useState<CitaItem[]>([]);
  const [filteredCitas, setFilteredCitas] = useState<CitaItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [statusFilter, setStatusFilter] = useState<StatusValue | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCita, setSelectedCita] = useState<CitaItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [statsModalType, setStatsModalType] = useState<StatsModalType | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [citasHistory, setCitasHistory] = useState<CitaItem[]>([]);

  const { showSuccessModal, ModalComponent } = useModal();

  useEffect(() => {
    setSelectedDate(todayISO());
  }, []);

  useEffect(() => {
    void loadCitas(selectedDate);
  }, [selectedDate]);

  // Suscripción en tiempo real a cambios en citas
  useEffect(() => {
    const channel = supabase
      .channel('admin:citas_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas' },
        () => {
          void loadCitas(selectedDate);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matches = citas.filter((cita) => {
      if (statusFilter !== 'all' && cita.estado !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        cita.clienteNombre.toLowerCase(),
        cita.clienteTelefono.toLowerCase(),
        cita.servicioNombre.toLowerCase(),
        cita.barberoNombre.toLowerCase(),
      ].some((value) => value.includes(normalizedSearch));
    });

    matches.sort((a, b) => a.hora24.localeCompare(b.hora24));
    setFilteredCitas(matches);
  }, [citas, statusFilter, searchTerm]);

  const loadCitas = async (date: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabaseService.getCitasHistory(1000);

      if (error) {
        setError(error);
        setCitas([]);
        return;
      }

      const mapped = (data ?? []).map(mapAppointmentToItem);
      const filteredByDate = mapped.filter((cita) => cita.fecha === date);
      setCitas(filteredByDate);
    } catch (err) {
      console.error('Error cargando citas:', err);
      setError('Error al cargar las citas del día');
      setCitas([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (historyLoaded) return;

    try {
      setHistoryLoading(true);
      const { data, error } = await supabaseService.getCitasHistory(1000);

      if (error) {
        setError(error);
        setCitasHistory([]);
        return;
      }

      setCitasHistory((data ?? []).map(mapAppointmentToItem));
      setHistoryLoaded(true);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('Error al cargar el historial de citas');
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateCitaStatus = async (citaId: string, newStatus: StatusValue) => {
    try {
      const { data, error } = await supabaseService.updateCitaStatus(citaId, UI_TO_DB_STATUS[newStatus]);

      if (error) {
        setError(error);
        return;
      }

      const updated = data ? mapAppointmentToItem(data) : null;

      setCitas((prev) =>
        prev.map((cita) =>
          cita.id === citaId
            ? {
                ...cita,
                estado: updated?.estado ?? newStatus,
              }
            : cita,
        ),
      );

      showSuccessModal('Estado actualizado', 'La cita fue actualizada correctamente.');
    } catch (err) {
      console.error('Error actualizando estado de cita:', err);
      setError('No fue posible actualizar el estado de la cita');
    }
  };

  const todayStats = useMemo(() => {
    const total = filteredCitas.length;
    const pendientes = filteredCitas.filter((cita) => cita.estado === 'pendiente').length;
    const confirmadas = filteredCitas.filter((cita) => cita.estado === 'confirmada').length;
    const completadas = filteredCitas.filter((cita) => cita.estado === 'completada').length;
    const ingresos = filteredCitas
      .filter((cita) => cita.estado === 'completada')
      .reduce((sum, cita) => sum + cita.precio, 0);

    return {
      total,
      pendientes,
      confirmadas,
      completadas,
      ingresos,
    };
  }, [filteredCitas]);

  const filteredForStatsModal = useMemo(() => {
    if (!statsModalType) return [] as CitaItem[];

    switch (statsModalType) {
      case 'total':
        return filteredCitas;
      case 'pendientes':
        return filteredCitas.filter((cita) => cita.estado === 'pendiente');
      case 'confirmadas':
        return filteredCitas.filter((cita) => cita.estado === 'confirmada');
      case 'completadas':
        return filteredCitas.filter((cita) => cita.estado === 'completada');
      default:
        return [];
    }
  }, [filteredCitas, statsModalType]);

  const getStatsStatusMeta = (type: StatsModalType | null): StatusMeta | null => {
    if (!type || type === 'total') return null;
    const key: StatusValue =
      type === 'pendientes'
        ? 'pendiente'
        : type === 'confirmadas'
          ? 'confirmada'
          : 'completada';
    return STATUS_META[key];
  };

  const historyGrouped = useMemo(() => {
    const grouped = new Map<string, CitaItem[]>();

    citasHistory.forEach((cita) => {
      if (!grouped.has(cita.fecha)) {
        grouped.set(cita.fecha, []);
      }
      grouped.get(cita.fecha)!.push(cita);
    });

    return Array.from(grouped.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
  }, [citasHistory]);

  const openDetails = (cita: CitaItem) => {
    setSelectedCita(cita);
    setIsDetailsModalOpen(true);
  };

  const closeDetails = () => {
    setSelectedCita(null);
    setIsDetailsModalOpen(false);
  };

  const openStatsModal = (type: StatsModalType) => {
    setStatsModalType(type);
  };

  const closeStatsModal = () => {
    setStatsModalType(null);
  };

  const openHistoryModal = () => {
    setIsHistoryModalOpen(true);
    void loadHistory();
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
  };

  // Recargar historial si está abierto cuando haya cambios en Supabase
  useEffect(() => {
    if (!isHistoryModalOpen) return;

    const channel = supabase
      .channel('admin:citas_history_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas' },
        () => {
          setHistoryLoaded(false);
          void loadHistory();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHistoryModalOpen]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent">
            Gestión de citas
          </h1>
          <p className="text-white/60 mt-2 text-lg">Visualiza y monitorea las citas agendadas automáticamente.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="text-white/60 text-sm" htmlFor="date-filter">
              Fecha seleccionada
            </label>
            <input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-zinc-900/70 border border-zinc-700/40 text-white px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <button
            type="button"
            onClick={openHistoryModal}
            className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs sm:text-sm font-semibold text-red-100 hover:bg-red-500/20 transition-colors"
          >
            🗂️ Historial completo
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-300 text-sm">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 border border-zinc-700/40 rounded-2xl p-12 text-center">
          <div className="animate-spin w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">Cargando citas programadas...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <button
              type="button"
              onClick={() => openStatsModal('total')}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl p-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto">
                    📅
                  </div>
                  <p className="text-2xl font-bold text-white">{todayStats.total}</p>
                  <p className="text-white/60 text-sm">Total del día</p>
                </div>
              </div>
            </button>

            <button type="button" onClick={() => openStatsModal('pendientes')} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-yellow-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl p-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mx-auto">
                    ⏳
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{todayStats.pendientes}</p>
                  <p className="text-white/60 text-sm">Pendientes</p>
                </div>
              </div>
            </button>

            <button type="button" onClick={() => openStatsModal('confirmadas')} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl p-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto">
                    ✅
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{todayStats.confirmadas}</p>
                  <p className="text-white/60 text-sm">Confirmadas</p>
                </div>
              </div>
            </button>

            <button type="button" onClick={() => openStatsModal('completadas')} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-green-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl p-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto">
                    ✂️
                  </div>
                  <p className="text-2xl font-bold text-green-400">{todayStats.completadas}</p>
                  <p className="text-white/60 text-sm">Completadas</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openStatsModal('completadas')}
              className="relative group text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-emerald-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl p-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                    💰
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(todayStats.ingresos)}</p>
                  <p className="text-white/60 text-sm">Ingresos (clic para ver completadas)</p>
                </div>
              </div>
            </button>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.01]" />
            <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 backdrop-blur-sm shadow-xl transition-all duration-300 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-3">Estado</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusValue | 'all')}
                    className="w-full bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                  >
                    <option value="all">Todos</option>
                    {Object.entries(STATUS_META).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white text-sm font-medium mb-3">Buscar</label>
                  <input
                    type="text"
                    placeholder="Cliente, teléfono, servicio..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {filteredCitas.length === 0 ? (
              <div
                role="button"
                tabIndex={0}
                onClick={openHistoryModal}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openHistoryModal();
                }}
                className="relative group focus:outline-none"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.02]" />
                <div className="relative text-center py-16 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 shadow-xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white text-2xl">
                    🗂️
                  </div>
                  <p className="text-white text-xl font-semibold">Sin citas para esta fecha</p>
                  <p className="text-white/60 text-sm mt-2">Haz clic para revisar el historial completo</p>
                </div>
              </div>
            ) : (
              filteredCitas.map((cita) => {
                const meta = STATUS_META[cita.estado];

                return (
                  <div key={cita.id} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/10 rounded-2xl transform transition-transform duration-300 group-hover:scale-[1.01]" />
                    <div className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 shadow-xl p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg text-white font-semibold">
                                {cita.clienteNombre
                                  .split(' ')
                                  .filter(Boolean)
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>
                              <div>
                                <h3 className="text-white text-lg font-semibold">{cita.clienteNombre}</h3>
                                <p className="text-white/60 text-sm">{cita.clienteTelefono}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border border-zinc-700/40 ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-white/60">Hora</p>
                              <p className="text-white font-medium">{cita.horaDisplay}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Servicio</p>
                              <p className="text-white font-medium">{cita.servicioNombre}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Barbero</p>
                              <p className="text-white font-medium">{cita.barberoNombre}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Precio</p>
                              <p className="text-green-400 font-medium">{formatCurrency(cita.precio)}</p>
                            </div>
                          </div>

                          {(cita.horaLlegada || Number.isFinite(cita.tiempoEspera)) && (
                            <div className="flex flex-wrap gap-4 text-sm text-white/70">
                              {cita.horaLlegada && (
                                <span>
                                  Llegada: <span className="text-white">{cita.horaLlegada}</span>
                                </span>
                              )}
                              {Number.isFinite(cita.tiempoEspera) && (
                                <span>
                                  Espera:{' '}
                                  <span
                                    className={
                                      (cita.tiempoEspera ?? 0) <= 5
                                        ? 'text-green-400'
                                        : (cita.tiempoEspera ?? 0) <= 10
                                          ? 'text-yellow-400'
                                          : 'text-red-400'
                                    }
                                  >
                                    {(cita.tiempoEspera ?? 0)} min
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => openDetails(cita)}
                            className="bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-white px-6 py-3 rounded-xl text-sm transition-all"
                          >
                            Ver detalles
                          </button>

                          {cita.estado === 'pendiente' && (
                            <button
                              type="button"
                              onClick={() => updateCitaStatus(cita.id, 'confirmada')}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/30"
                            >
                              Confirmar
                            </button>
                          )}

                          {(cita.estado === 'confirmada' || cita.estado === 'en_proceso') && (
                            <span className="text-white/60 text-sm px-6 py-3">
                              {cita.estado === 'confirmada' ? 'Esperando al barbero' : 'En proceso'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {isDetailsModalOpen && selectedCita && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-zinc-700/40 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Detalles de la cita</h2>
              <button type="button" onClick={closeDetails} className="text-white/60 hover:text-red-400">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm">
              <section>
                <h3 className="text-white font-semibold mb-3">Información del cliente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/40 border border-zinc-700/30 rounded-xl p-4">
                  <div>
                    <p className="text-white/60">Nombre</p>
                    <p className="text-white font-medium">{selectedCita.clienteNombre}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Teléfono</p>
                    <p className="text-white font-medium">{selectedCita.clienteTelefono}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Correo</p>
                    <p className="text-white font-medium">{selectedCita.clienteEmail ?? 'No registrado'}</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-3">Información de la cita</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/40 border border-zinc-700/30 rounded-xl p-4">
                  <div>
                    <p className="text-white/60">Fecha</p>
                    <p className="text-white font-medium">{formatDateLabel(selectedCita.fecha)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Hora</p>
                    <p className="text-white font-medium">{selectedCita.horaDisplay}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Servicio</p>
                    <p className="text-white font-medium">{selectedCita.servicioNombre}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Barbero</p>
                    <p className="text-white font-medium">{selectedCita.barberoNombre}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Duración estimada</p>
                    <p className="text-white font-medium">{selectedCita.duracion ?? 30} min</p>
                  </div>
                  <div>
                    <p className="text-white/60">Precio</p>
                    <p className="text-green-400 font-medium">{formatCurrency(selectedCita.precio)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Estado</p>
                    <p className={`font-semibold ${STATUS_META[selectedCita.estado].accentClass}`}>
                      {STATUS_META[selectedCita.estado].label}
                    </p>
                  </div>
                </div>
              </section>

              {selectedCita.notas && (
                <section>
                  <h3 className="text-white font-semibold mb-3">Notas</h3>
                  <div className="bg-zinc-900/40 border border-zinc-700/30 rounded-xl p-4 text-white/80">
                    {selectedCita.notas}
                  </div>
                </section>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {selectedCita.estado === 'pendiente' && (
                  <button
                    type="button"
                    onClick={() => updateCitaStatus(selectedCita.id, 'confirmada')}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl text-sm font-semibold"
                  >
                    Confirmar cita
                  </button>
                )}
                {selectedCita.estado === 'confirmada' && (
                  <button
                    type="button"
                    onClick={() => updateCitaStatus(selectedCita.id, 'en_proceso')}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl text-sm font-semibold"
                  >
                    Marcar en proceso
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDetails}
                  className="flex-1 bg-zinc-800/70 hover:bg-zinc-700/70 border border-zinc-700/50 text-white py-3 rounded-xl text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {statsModalType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-zinc-700/40 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Citas{' '}
                {statsModalType === 'total'
                  ? 'del día'
                  : getStatsStatusMeta(statsModalType)?.label ?? ''}
              </h2>
              <button type="button" onClick={closeStatsModal} className="text-white/60 hover:text-red-400">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {filteredForStatsModal.length === 0 ? (
                <div className="text-center py-12 text-white/70">No hay citas para esta categoría</div>
              ) : (
                filteredForStatsModal.map((cita) => (
                  <div key={cita.id} className="bg-zinc-900/40 border border-zinc-700/30 rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-white font-semibold">{cita.clienteNombre}</h3>
                        <p className="text-white/60 text-sm">{cita.servicioNombre}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className={`px-3 py-1 rounded-full border border-zinc-700/50 ${STATUS_META[cita.estado].badgeClass}`}>
                          {STATUS_META[cita.estado].label}
                        </span>
                        <span className="text-white/80">{cita.horaDisplay}</span>
                        <span className="text-green-400 font-medium">{formatCurrency(cita.precio)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-zinc-700/40 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Historial completo</h2>
              <button type="button" onClick={closeHistoryModal} className="text-white/60 hover:text-red-400">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {historyLoading ? (
                <div className="text-center py-12 text-white/70">Cargando historial...</div>
              ) : historyGrouped.length === 0 ? (
                <div className="text-center py-12 text-white/70">Aún no hay historial disponible.</div>
              ) : (
                historyGrouped.map(([fecha, citasDelDia]) => (
                  <div key={fecha} className="bg-zinc-900/40 border border-zinc-700/30 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-zinc-700/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{formatDateLabel(fecha)}</h3>
                        <p className="text-white/60 text-sm">{citasDelDia.length} citas registradas</p>
                      </div>
                      <div className="flex gap-4 text-sm text-white/70">
                        <span>
                          Completadas:{' '}
                          <span className="text-green-400 font-semibold">
                            {citasDelDia.filter((cita) => cita.estado === 'completada').length}
                          </span>
                        </span>
                        <span>
                          Ingresos:{' '}
                          <span className="text-green-400 font-semibold">
                            {formatCurrency(
                              citasDelDia
                                .filter((cita) => cita.estado === 'completada')
                                .reduce((sum, cita) => sum + cita.precio, 0),
                            )}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      {citasDelDia
                        .slice()
                        .sort((a, b) => a.hora24.localeCompare(b.hora24))
                        .map((cita) => (
                          <div
                            key={cita.id}
                            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-zinc-900/30 border border-zinc-700/20 rounded-xl p-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white font-semibold">
                                {cita.clienteNombre
                                  .split(' ')
                                  .filter(Boolean)
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>
                              <div>
                                <p className="text-white font-medium">{cita.clienteNombre}</p>
                                <p className="text-white/60 text-sm">
                                  {cita.horaDisplay} · {cita.servicioNombre}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className={`px-3 py-1 rounded-full border border-zinc-700/40 ${STATUS_META[cita.estado].badgeClass}`}>
                                {STATUS_META[cita.estado].label}
                              </span>
                              <span className="text-green-400 font-medium">{formatCurrency(cita.precio)}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ModalComponent />
    </div>
  );
};

export default Citas;