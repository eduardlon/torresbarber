import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../db/supabase.js';

type Barber = {
  id: string;
  nombre: string;
  apellido?: string | null;
  especialidad?: string | null;
  foto?: string | null;
  activo?: boolean | null;
};

type AppointmentInfo = {
  id: string;
  clienteNombre: string;
  clienteTelefono?: string | null;
  fechaHora: string;
  horaDisplay: string;
  status: string;
  servicioNombre: string;
  duracionMinutos?: number | null;
};

type BarberQueue = {
  barber: Barber;
  attending: AppointmentInfo[];
  upcoming: AppointmentInfo[];
};

interface PublicQueueSystemProps {
  onNotification?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ACTIVE_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress', 'pending', 'waiting', 'in_chair']);
const BLOCKED_STATUSES = new Set(['completed', 'cancelled', 'no_show']);
const REFRESH_INTERVAL_MS = 15000;

const normalizeStatus = (status: string | null | undefined): string => {
  if (!status) return 'scheduled';
  const normalized = status.toLowerCase();
  if (normalized === 'pending') return 'scheduled';
  if (normalized === 'canceled') return 'cancelled';
  return normalized;
};

const formatTime = (isoString: string): string => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
};

const PublicQueueSystem: React.FC<PublicQueueSystemProps> = ({ onNotification }) => {
  const [queues, setQueues] = useState<BarberQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQueues = useCallback(async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    try {
      setError(null);

      const [barbersResult, appointmentsResult] = await Promise.all([
        supabase
          .from('barberos')
          .select('id, nombre, apellido, especialidad, foto, activo')
          .order('nombre', { ascending: true }),
        supabase
          .from('citas')
          .select(
            `id, barbero_id, cliente_nombre, cliente_telefono, fecha_hora, status,
             servicios:servicios(nombre, duracion_minutos)`
          )
          .gte('fecha_hora', startOfDay.toISOString())
          .lt('fecha_hora', endOfDay.toISOString())
          .order('fecha_hora', { ascending: true }),
      ]);

      if (barbersResult.error) throw barbersResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const activeBarbers: Barber[] = (barbersResult.data ?? []).filter((barber) => barber.activo !== false);
      const groupedAppointments = new Map<string, AppointmentInfo[]>();
      const nowTs = Date.now();

      for (const appointment of appointmentsResult.data ?? []) {
        const normalizedStatus = normalizeStatus(appointment.status ?? undefined);

        if (!ACTIVE_STATUSES.has(normalizedStatus) || BLOCKED_STATUSES.has(normalizedStatus)) {
          continue;
        }

        const servicioRaw = (appointment as any).servicios;
        const servicioData = Array.isArray(servicioRaw) ? servicioRaw[0] : servicioRaw;

        const info: AppointmentInfo = {
          id: appointment.id,
          clienteNombre: appointment.cliente_nombre,
          clienteTelefono: appointment.cliente_telefono ?? null,
          fechaHora: appointment.fecha_hora,
          horaDisplay: formatTime(appointment.fecha_hora),
          status: normalizedStatus,
          servicioNombre: servicioData?.nombre ?? 'Servicio',
          duracionMinutos: servicioData?.duracion_minutos ?? null,
        };

        const existing = groupedAppointments.get(appointment.barbero_id) ?? [];
        existing.push(info);
        groupedAppointments.set(appointment.barbero_id, existing);
      }

      const nextQueues: BarberQueue[] = activeBarbers.map((barber) => {
        const appointmentsForBarber = groupedAppointments.get(barber.id) ?? [];
        appointmentsForBarber.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

        const attending: AppointmentInfo[] = [];
        const upcoming: AppointmentInfo[] = [];

        for (const appointment of appointmentsForBarber) {
          const appointmentTs = new Date(appointment.fechaHora).getTime();
          const isCurrentlyInChair =
            appointment.status === 'in_progress' ||
            appointment.status === 'in_chair' ||
            (appointment.status === 'confirmed' && appointmentTs <= nowTs);

          if (isCurrentlyInChair) {
            attending.push(appointment);
          } else {
            upcoming.push(appointment);
          }
        }

        return {
          barber,
          attending,
          upcoming,
        };
      });

      setQueues(nextQueues);
      setLastUpdated(new Date());
    } catch (fetchError) {
      console.error('Error al sincronizar la cola virtual:', fetchError);
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'No pudimos sincronizar la cola virtual con Supabase.';
      setError(message);
      onNotification?.(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotification]);

  useEffect(() => {
    fetchQueues();

    const intervalId = window.setInterval(fetchQueues, REFRESH_INTERVAL_MS);

    const channel = supabase
      .channel('public:citas_queue_watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas' },
        () => fetchQueues(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_turns' },
        () => fetchQueues(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'barberos' },
        () => fetchQueues(),
      )
      .subscribe();

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [fetchQueues]);

  const totalUpcoming = useMemo(
    () => queues.reduce((acc, queue) => acc + queue.upcoming.length, 0),
    [queues],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-900 dark:text-white">
        <div className="mr-3 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 dark:border-white/20 border-t-red-500" />
        <span>Sincronizando cola virtual…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-4 text-sm text-gray-700 dark:text-zinc-200 shadow-lg dark:shadow-black/40 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-red-600 dark:text-red-300/80">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500 dark:bg-red-400" />
            JP Barber Live Queue
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-600 dark:text-zinc-400">
              Última actualización {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-zinc-400">
          <span>{queues.length} barberos activos</span>
          <span>•</span>
          <span>{totalUpcoming} clientes en cola</span>
          {error && (
            <span className="text-red-600 dark:text-red-400">{error}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {queues.map(({ barber, attending, upcoming }) => {
          const currentName = attending[0]?.clienteNombre ?? 'Disponible';

          return (
            <div
              key={barber.id}
              className="relative flex h-full flex-col gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white via-gray-50 to-white dark:from-zinc-950/90 dark:via-zinc-900/80 dark:to-zinc-950/90 p-6 shadow-lg dark:shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-colors duration-300"
            >
              <header className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-600 dark:text-red-300/80">Barbero</p>
                  <h3 className="mt-1 font-montserrat text-xl font-semibold text-gray-900 dark:text-white">
                    {barber.nombre} {barber.apellido ?? ''}
                  </h3>
                  {barber.especialidad && (
                    <p className="text-xs text-gray-600 dark:text-zinc-400">{barber.especialidad}</p>
                  )}
                </div>
                {barber.foto && (
                  <img
                    src={barber.foto}
                    alt={barber.nombre}
                    className="h-14 w-14 rounded-lg border border-gray-200 dark:border-white/10 object-cover"
                  />
                )}
              </header>

            <section className="space-y-4">
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 shadow-inner">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-green-600 dark:text-green-300/80">
                  <span>En silla</span>
                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-[11px] text-green-600 dark:text-green-200">
                    {attending.length > 0 ? 'Ocupado' : 'Libre'}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-xl text-gray-900 dark:text-white">
                  {currentName}
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-yellow-600 dark:text-yellow-200/80">
                  <span>En cola</span>
                  <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-700 dark:text-yellow-200">
                    {upcoming.length} turno{upcoming.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {upcoming.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-yellow-500/30 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-200">
                      No hay clientes en espera
                    </p>
                  ) : (
                    upcoming.map((appointment, idx) => (
                      <div
                        key={`${barber.id}-queue-${appointment.id}`}
                        className="flex items-center justify-between rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-gray-900 dark:text-white"
                      >
                        <div>
                          <p className="font-semibold leading-tight">{appointment.clienteNombre}</p>
                          <p className="text-xs text-gray-600 dark:text-zinc-400">
                            {appointment.horaDisplay} • {appointment.servicioNombre}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-200">
                          Turno #{idx + 1}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        );
        })}
      </div>
    </div>
  );
};

export default PublicQueueSystem;
