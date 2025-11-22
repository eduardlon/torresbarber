import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../db/supabase.js';

type Service = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  duracion_minutos?: number | null;
  activo?: boolean | null;
};

interface AgendarCitaDesdeColaProps {
  barberoId: string | number | null | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

const HOURS_SOURCE = Array.from({ length: 31 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const label = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  return { value, label };
});

const formatCurrency = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

const AgendarCitaDesdeCola: React.FC<AgendarCitaDesdeColaProps> = ({ barberoId, onClose, onSuccess }) => {
  const [servicios, setServicios] = useState<Service[]>([]);
  const [selectedServicio, setSelectedServicio] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [horasReservadas, setHorasReservadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizedBarberoId = barberoId != null ? String(barberoId) : null;

  useEffect(() => {
    let cancelled = false;

    const loadServicios = async () => {
      setLoading(true);
      try {
        const { data, error: serviceError } = await supabase
          .from('servicios')
          .select('id, nombre, descripcion, precio, duracion_minutos, activo')
          .order('nombre', { ascending: true });

        if (serviceError) throw serviceError;

        if (!cancelled) {
          setServicios((data ?? []).filter((item) => item.activo !== false));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error cargando servicios para barbero:', err);
          setError('No pudimos cargar los servicios. Intenta nuevamente.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadServicios();

    return () => {
      cancelled = false;
    };
  }, []);

  const fetchReservedHours = useCallback(async () => {
    if (!normalizedBarberoId || !fecha) {
      setHorasReservadas(new Set());
      return;
    }

    try {
      const response = await fetch(`/api/citas?barberoId=${normalizedBarberoId}&date=${fecha}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener la disponibilidad');
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.message || 'Respuesta inválida del servidor');
      }

      const reserved = new Set<string>();
      (data.slots ?? []).forEach((slot: string) => {
        if (!slot) return;
        const dateValue = new Date(slot);
        const hours = dateValue.getHours().toString().padStart(2, '0');
        const minutes = dateValue.getMinutes().toString().padStart(2, '0');
        reserved.add(`${hours}:${minutes}`);
      });

      setHorasReservadas(reserved);

      if (hora && reserved.has(hora)) {
        setHora('');
      }
    } catch (err) {
      console.error('Error cargando horas reservadas:', err);
      setError('No pudimos verificar la disponibilidad. Intenta nuevamente.');
    }
  }, [normalizedBarberoId, fecha, hora]);

  useEffect(() => {
    void fetchReservedHours();
  }, [fetchReservedHours]);

  const horasDisponibles = useMemo(() => {
    if (!fecha) return [];

    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];

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
    setSelectedServicio(null);
    setFecha('');
    setHora('');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteEmail('');
    setNotas('');
    setHorasReservadas(new Set());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!normalizedBarberoId || !selectedServicio || !fecha || !hora || !clienteNombre || !clienteTelefono) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    try {
      setSubmitting(true);

      const fechaHora = `${fecha}T${hora}:00`;
      const slotDate = new Date(fechaHora);
      if (slotDate.getTime() <= Date.now()) {
        setError('Solo puedes agendar fechas y horas futuras.');
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
          barberoId: normalizedBarberoId,
          servicioId: selectedServicio,
          fechaHora,
          clienteNombre: clienteNombre.trim(),
          clienteTelefono: clienteTelefono.trim(),
          clienteEmail: clienteEmail ? clienteEmail.trim() : undefined,
          notas: notas ? notas.trim() : undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo agendar la cita');
      }

      setSuccess('Cita agendada correctamente.');
      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Error al agendar cita desde panel de barbero:', err);
      setError(err instanceof Error ? err.message : 'No pudimos guardar la cita. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 sm:p-6 shadow-2xl my-6 mx-3 sm:mx-4 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <header className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">Agendar cita</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Crear cita para cliente</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Usa este formulario para agendar una cita en el calendario oficial. Se sincroniza con cola virtual y pantalla de turnos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-600 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-400 hover:text-white"
          >
            Cerrar
          </button>
        </header>

        {(error || success) && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {error || success}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center text-zinc-300">
            Cargando servicios...
          </div>
        ) : !normalizedBarberoId ? (
          <div className="text-sm text-red-300">
            No se encontró la información del barbero. Cierra el modal e intenta nuevamente.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-4">
              <div className="rounded-xl border border-zinc-700 bg-black/40 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Servicio</h3>
                <p className="mt-1 text-xs text-zinc-500">Selecciona el servicio que se va a realizar.</p>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {servicios.map((servicio) => {
                    const isActive = selectedServicio === servicio.id;
                    return (
                      <button
                        key={servicio.id}
                        type="button"
                        onClick={() => setSelectedServicio(servicio.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? 'border-yellow-400 bg-yellow-500/15 text-yellow-50'
                            : 'border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-yellow-400/80 hover:bg-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{servicio.nombre}</p>
                          {servicio.descripcion && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">{servicio.descripcion}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs">
                          <span className="rounded-full border border-zinc-600 bg-black/60 px-2 py-0.5 font-semibold text-yellow-300">
                            {formatCurrency(servicio.precio ?? null)}
                          </span>
                          {servicio.duracion_minutos != null && (
                            <span className="text-[10px] text-zinc-400">{servicio.duracion_minutos} min</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {servicios.length === 0 && (
                    <p className="text-xs text-red-300">
                      No hay servicios activos configurados en Supabase.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-black/40 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Datos del cliente</h3>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs text-zinc-400">
                    Nombre completo
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(event) => setClienteNombre(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                      required
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Teléfono
                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(event) => setClienteTelefono(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                      required
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Email (opcional)
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(event) => setClienteEmail(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Notas (opcional)
                    <textarea
                      value={notas}
                      onChange={(event) => setNotas(event.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-xl border border-zinc-700 bg-black/40 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Fecha y hora</h3>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs text-zinc-400">
                    Fecha
                    <input
                      type="date"
                      value={fecha}
                      min={new Date().toLocaleDateString('en-CA')}
                      onChange={(event) => setFecha(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                      required
                    />
                  </label>

                  <div className="text-xs text-zinc-400">
                    Hora disponible
                    <div className="mt-1 grid max-h-48 grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-1 text-[13px]">
                      {horasDisponibles.length === 0 && (
                        <p className="col-span-full text-[11px] text-red-300">
                          Selecciona fecha para ver horarios disponibles.
                        </p>
                      )}
                      {horasDisponibles.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setHora(value)}
                          className={`rounded-lg border px-2 py-1.5 font-medium transition ${
                            hora === value
                              ? 'border-yellow-400 bg-yellow-500/30 text-black'
                              : 'border-zinc-700 bg-black/60 text-zinc-200 hover:border-yellow-400 hover:bg-zinc-800'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-zinc-700 bg-black/40 p-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black shadow-lg transition hover:bg-yellow-400 disabled:opacity-60"
                >
                  {submitting ? 'Agendando cita...' : 'Agendar cita'}
                </button>
                <p className="text-[11px] text-zinc-500">
                  Esta cita se guardará en el sistema central y actualizará en tiempo real cola virtual, pantalla de turnos y paneles.
                </p>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
};

export default AgendarCitaDesdeCola;
