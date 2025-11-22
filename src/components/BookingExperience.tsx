import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../db/supabase.js';

type Barber = {
  id: string;
  nombre: string;
  apellido?: string | null;
  especialidad?: string | null;
  foto?: string | null;
  activo?: boolean | null;
};

type Service = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  duracion_minutos?: number | null;
  activo?: boolean | null;
};

type AppointmentPayload = {
  barbero_id: string;
  servicio_id: string;
  fecha_hora: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string | null;
  notas?: string | null;
  cliente_id?: string | null;
};

// Horario de 9:00 AM a 12:30 AM (31 slots de 30 minutos)
const HOURS_SOURCE = Array.from({ length: 31 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30; // Empieza a las 9 AM
  const hours = Math.floor(totalMinutes / 60) % 24; // Módulo 24 para pasar medianoche
  const minutes = totalMinutes % 60;
  const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
  const label = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  return { value, label };
});

const generateRangeBoundaries = (dateIso: string) => {
  const start = new Date(`${dateIso}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

const formatCurrency = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

interface BookingExperienceProps {
  defaultNombre?: string;
  defaultTelefono?: string;
  defaultEmail?: string;
  clienteId?: string;
  isFreeCutMode?: boolean;
  onBookingSuccess?: () => void;
  onBookingError?: (message: string) => void;
}

const BookingExperience: React.FC<BookingExperienceProps> = ({
  defaultNombre,
  defaultTelefono,
  defaultEmail,
  clienteId,
  isFreeCutMode,
  onBookingSuccess,
  onBookingError,
}) => {
  const [barberos, setBarberos] = useState<Barber[]>([]);
  const [servicios, setServicios] = useState<Service[]>([]);
  const [selectedBarbero, setSelectedBarbero] = useState<string | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [clienteNombre, setClienteNombre] = useState(defaultNombre ?? '');
  const [clienteTelefono, setClienteTelefono] = useState(defaultTelefono ?? '');
  const [clienteEmail, setClienteEmail] = useState(defaultEmail ?? '');
  const [notas, setNotas] = useState('');
  const [horasReservadas, setHorasReservadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isClientePanel = Boolean(clienteId);
  const [publicBookingModal, setPublicBookingModal] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const loadSelections = async () => {
      setLoading(true);
      try {
        const [{ data: barberosData, error: barberError }, { data: serviciosData, error: serviceError }] = await Promise.all([
          supabase
            .from('barberos')
            .select('id, nombre, apellido, especialidad, foto, activo')
            .order('nombre', { ascending: true }),
          supabase
            .from('servicios')
            .select('id, nombre, descripcion, precio, duracion_minutos, activo')
            .order('nombre', { ascending: true }),
        ]);

        if (barberError) throw barberError;
        if (serviceError) throw serviceError;

        setBarberos((barberosData ?? []).filter((item) => item.activo !== false));
        setServicios((serviciosData ?? []).filter((item) => item.activo !== false));
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        setMessage({ type: 'error', text: 'No pudimos cargar barberos y servicios. Intenta nuevamente más tarde.' });
      } finally {
        setLoading(false);
      }
    };

    loadSelections();
  }, []);

  // Sincronizar datos del cliente provenientes del panel cuando cambien las props
  useEffect(() => {
    if (defaultNombre && !clienteNombre) {
      setClienteNombre(defaultNombre);
    }
  }, [defaultNombre, clienteNombre]);

  useEffect(() => {
    if (defaultTelefono && !clienteTelefono) {
      setClienteTelefono(defaultTelefono);
    }
  }, [defaultTelefono, clienteTelefono]);

  useEffect(() => {
    if (defaultEmail && !clienteEmail) {
      setClienteEmail(defaultEmail);
    }
  }, [defaultEmail, clienteEmail]);

  const fetchReservedHours = useCallback(async () => {
    if (!selectedBarbero || !fecha) {
      setHorasReservadas(new Set());
      return;
    }

    try {
      const response = await fetch(`/api/citas?barberoId=${selectedBarbero}&date=${fecha}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener la disponibilidad');
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.message || 'Respuesta inválida');
      }

      const reserved = new Set<string>();
      (data.slots ?? []).forEach((slot: string) => {
        if (!slot) return;
        const date = new Date(slot);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        reserved.add(`${hours}:${minutes}`);
      });

      setHorasReservadas(reserved);

      if (hora && reserved.has(hora)) {
        setHora('');
      }
    } catch (error) {
      console.error('Error cargando horas reservadas:', error);
      setMessage({ type: 'error', text: 'No pudimos verificar la disponibilidad. Intenta nuevamente.' });
    }
  }, [selectedBarbero, fecha, hora]);

  useEffect(() => {
    fetchReservedHours();
  }, [fetchReservedHours]);

  const horasDisponibles = useMemo(() => {
    if (!fecha) return [];

    const now = new Date();
    const todayIso = now.toLocaleDateString('en-CA');

    return HOURS_SOURCE.filter(({ value }) => {
      if (horasReservadas.has(value)) {
        return false;
      }

      if (fecha === todayIso) {
        const slotDate = new Date(`${fecha}T${value}:00`);
        if (slotDate.getTime() <= now.getTime()) {
          return false;
        }
      }

      return true;
    });
  }, [fecha, horasReservadas]);

  const resetForm = () => {
    setSelectedBarbero(null);
    setSelectedServicio(null);
    setFecha('');
    setHora('');
    setClienteNombre(defaultNombre ?? '');
    setClienteTelefono(defaultTelefono ?? '');
    setClienteEmail(defaultEmail ?? '');
    setNotas('');
    setHorasReservadas(new Set());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!selectedBarbero || !selectedServicio || !fecha || !hora || !clienteNombre || !clienteTelefono) {
      const text = 'Por favor completa todos los campos obligatorios.';
      if (isClientePanel && onBookingError) {
        onBookingError(text);
      } else {
        setMessage({ type: 'error', text });
        setPublicBookingModal({ type: 'error', text });
      }
      return;
    }

    try {
      setSubmitting(true);

      const fechaHora = `${fecha}T${hora}:00`;
      const slotDate = new Date(fechaHora);
      if (slotDate.getTime() <= Date.now()) {
        const text = 'Solo puedes agendar fechas y horas futuras.';
        if (isClientePanel && onBookingError) {
          onBookingError(text);
        } else {
          setMessage({ type: 'error', text });
          setPublicBookingModal({ type: 'error', text });
        }
        setSubmitting(false);
        return;
      }

      const response = await fetch('/api/citas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          barberoId: selectedBarbero,
          servicioId: selectedServicio,
          fechaHora,
          clienteNombre: clienteNombre.trim(),
          clienteTelefono: clienteTelefono.trim(),
          clienteEmail: clienteEmail ? clienteEmail.trim() : undefined,
          notas: notas ? notas.trim() : undefined,
          clienteId: clienteId ?? undefined,
          usarBonoFidelizacion: Boolean(isFreeCutMode),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo agendar la cita');
      }

      if (isClientePanel && onBookingSuccess) {
        onBookingSuccess();
      } else {
        const text = '¡Tu cita fue agendada! Te contactaremos para confirmar los detalles.';
        setMessage({ type: 'success', text });
        setPublicBookingModal({ type: 'success', text });
      }
      resetForm();
      await fetchReservedHours();
    } catch (error: unknown) {
      console.error('Error al agendar cita:', error);
      const text = error instanceof Error ? error.message : 'No pudimos guardar la cita. Intenta nuevamente.';
      if (isClientePanel && onBookingError) {
        onBookingError(text);
      } else {
        setMessage({ type: 'error', text });
        setPublicBookingModal({ type: 'error', text });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        <p className="text-sm text-gray-600 dark:text-zinc-200/80">Cargando información para tu reserva...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.6em] text-red-600 dark:text-rose-200/70">Agenda tu experiencia</p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.35em] text-gray-900 dark:text-white md:text-5xl">
          JP Barber <span className="text-red-500 dark:text-rose-300">Booking</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-700 dark:text-zinc-300/80 md:text-base">
          Selecciona a tu artista, el servicio perfecto y reserva la hora ideal. Todos los datos se sincronizan automáticamente con Supabase y el panel administrador.
        </p>
      </header>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm md:px-6 md:py-4 ${
            message.type === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
              : 'border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-6 backdrop-blur shadow-lg dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Selecciona tu barbero</h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">Elige al artista que llevará tu look al siguiente nivel.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {barberos.map((barbero) => {
                const fullName = [barbero.nombre, barbero.apellido].filter(Boolean).join(' ');
                const isActive = selectedBarbero === barbero.id;
                return (
                  <button
                    key={barbero.id}
                    type="button"
                    onClick={() => setSelectedBarbero(barbero.id)}
                    className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-red-400 dark:border-rose-400/70 bg-red-50 dark:bg-rose-500/15 shadow-lg dark:shadow-[0_20px_45px_-25px_rgba(244,114,182,0.65)]'
                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 hover:border-red-300 dark:hover:border-rose-400/50 hover:bg-red-50/50 dark:hover:bg-rose-500/10'
                    }`}
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/40">
                      {barbero.foto ? (
                        <img src={barbero.foto} alt={fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">✂️</div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{fullName}</p>
                      {barbero.especialidad && (
                        <p className="text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-zinc-400">{barbero.especialidad}</p>
                      )}
                    </div>
                    {isActive && (
                      <span className="ml-auto rounded-full border border-red-400 dark:border-rose-400/60 bg-red-100 dark:bg-rose-500/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.3em] text-red-600 dark:text-rose-100">
                        Elegido
                      </span>
                    )}
                  </button>
                );
              })}
              {barberos.length === 0 && (
                <p className="col-span-full text-xs text-red-600 dark:text-rose-200/70">
                  No encontramos barberos activos. Valida la tabla <code className="rounded bg-gray-200 dark:bg-black/40 px-1">barberos</code> en Supabase.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-6 backdrop-blur shadow-lg dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. ¿Qué servicio deseas?</h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">Selecciona el ritual ideal. Mostramos únicamente servicios activos.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {servicios.map((servicio) => {
                const isActive = selectedServicio === servicio.id;
                return (
                  <button
                    key={servicio.id}
                    type="button"
                    onClick={() => setSelectedServicio(servicio.id)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      isActive
                        ? 'border-red-400 dark:border-rose-400/70 bg-red-50 dark:bg-rose-500/15 shadow-lg dark:shadow-[0_20px_45px_-25px_rgba(244,114,182,0.65)]'
                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 hover:border-red-300 dark:hover:border-rose-400/50 hover:bg-red-50/50 dark:hover:bg-rose-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{servicio.nombre}</p>
                        {servicio.descripcion && (
                          <p className="mt-2 text-xs text-gray-600 dark:text-zinc-400 line-clamp-3">{servicio.descripcion}</p>
                        )}
                      </div>
                      <span className="rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/40 px-3 py-1 text-xs font-semibold text-red-600 dark:text-rose-200">
                        {isFreeCutMode ? formatCurrency(0) : formatCurrency(servicio.precio)}
                      </span>
                    </div>
                    {(servicio.duracion_minutos ?? null) !== null && (
                      <p className="mt-3 text-[11px] uppercase tracking-[0.35em] text-gray-500 dark:text-zinc-500">
                        Duración aprox. {servicio.duracion_minutos} min
                      </p>
                    )}
                  </button>
                );
              })}
              {servicios.length === 0 && (
                <p className="col-span-full text-xs text-red-600 dark:text-rose-200/70">
                  No encontramos servicios activos. Revisa la tabla <code className="rounded bg-gray-200 dark:bg-black/40 px-1">servicios</code> en Supabase.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-6 backdrop-blur shadow-lg dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Fecha y hora</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-zinc-400">
                Fecha
                <input
                  type="date"
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                  min={new Date().toLocaleDateString('en-CA')}
                  className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 py-3 text-base text-gray-900 dark:text-white outline-none focus:border-red-400 dark:focus:border-rose-400/60"
                  required
                />
              </label>

              <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-zinc-400">
                Hora disponible
                <div className="grid max-h-48 grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-1 text-[13px]">
                  {horasDisponibles.length === 0 && (
                    <p className="col-span-full text-[11px] text-red-600 dark:text-rose-200/70">
                      Selecciona barbero y fecha para ver horarios disponibles.
                    </p>
                  )}
                  {horasDisponibles.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHora(value)}
                      className={`rounded-lg border px-2 py-2 font-medium transition ${
                        hora === value
                          ? 'border-red-400 dark:border-rose-400/70 bg-red-500 dark:bg-rose-500/25 text-white'
                          : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-zinc-200 hover:border-red-300 dark:hover:border-rose-400/50 hover:bg-red-50 dark:hover:bg-rose-500/15'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-6 backdrop-blur shadow-lg dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Datos de contacto</h2>
            <div className="mt-4 grid gap-4">
              <label className="text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-zinc-400">
                Nombre completo
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={isClientePanel ? undefined : (event) => setClienteNombre(event.target.value)}
                  placeholder="Nombre del cliente"
                  readOnly={isClientePanel}
                  className={`mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-red-400 dark:focus:border-rose-400/60 ${
                    isClientePanel ? 'cursor-not-allowed opacity-80' : ''
                  }`}
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-zinc-400">
                  Teléfono
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={isClientePanel ? undefined : (event) => setClienteTelefono(event.target.value)}
                    placeholder="WhatsApp o número de contacto"
                    readOnly={isClientePanel}
                    className={`mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-red-400 dark:focus:border-rose-400/60 ${
                      isClientePanel ? 'cursor-not-allowed opacity-80' : ''
                    }`}
                    required
                  />
                </label>

                <label className="text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-zinc-400">
                  Correo electrónico (opcional)
                  <input
                    type="email"
                    value={clienteEmail}
                    onChange={isClientePanel ? undefined : (event) => setClienteEmail(event.target.value)}
                    placeholder="example@email.com"
                    readOnly={isClientePanel}
                    className={`mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-red-400 dark:focus:border-rose-400/60 ${
                      isClientePanel ? 'cursor-not-allowed opacity-80' : ''
                    }`}
                  />
                </label>
              </div>

              <label className="text-xs uppercase tracking-[0.35em] text-gray-600 dark:text-zinc-400">
                Notas (opcional)
                <textarea
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  placeholder="Detalles adicionales, estilos preferidos o comentarios para el barbero"
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-red-400 dark:focus:border-rose-400/60"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-500 dark:from-rose-500 dark:via-rose-400 dark:to-orange-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.45em] text-white dark:text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
            >
              {submitting ? 'Agendando...' : 'Confirmar cita'}
            </button>
          </div>
        </section>
      </form>

      <footer className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-5 text-center text-xs text-gray-600 dark:text-zinc-400 backdrop-blur shadow-lg dark:shadow-none">
        <p>
          Los datos se almacenan directamente en Supabase (tabla <code className="rounded bg-gray-200 dark:bg-black/40 px-1">citas</code>) y quedan visibles para los módulos administrativos.
        </p>
      </footer>

      {!isClientePanel && publicBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3
              className={`mb-2 text-lg font-bold ${
                publicBookingModal.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {publicBookingModal.type === 'success' ? 'Cita agendada' : 'No se pudo agendar la cita'}
            </h3>
            <p className="mb-4 text-sm text-zinc-100">{publicBookingModal.text}</p>
            <button
              type="button"
              onClick={() => setPublicBookingModal(null)}
              className="mt-2 w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingExperience;
