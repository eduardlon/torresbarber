import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  Scissors,
  Search,
  User,
  UserPlus,
  X
} from 'lucide-react';

import { requestBarberoApi } from '../../utils/barbero-api-request';
import type { DailyTurn, Service } from '../../types';

interface TurnRegistrationModalProps {
  barberoId: number;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;
type ClientType = 'cliente' | 'invitado';
type LineType = 'none' | 'head' | 'eyebrow' | 'both';
type LineSide = 'left' | 'right' | 'both';

interface SearchResult {
  id?: number;
  invitado_id?: number;
  client_type: ClientType;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
}

const today = () => new Date().toISOString().split('T')[0];
const INITIAL_GUEST = { name: '', phone: '', email: '' };
const INITIAL_LINE_OPTIONS: { type: LineType; side: LineSide } = { type: 'none', side: 'both' };

const TurnRegistrationModal: React.FC<TurnRegistrationModalProps> = ({ barberoId, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client search and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SearchResult | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  // Guest client data
  const [guestData, setGuestData] = useState({ ...INITIAL_GUEST });

  // Service selection
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Notes
  const [notes, setNotes] = useState('');
  const [lineOptions, setLineOptions] = useState(INITIAL_LINE_OPTIONS);

  // Duplicate phone modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<{
    type: ClientType;
    data: { nombre: string; telefono?: string | null; email?: string | null };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      try {
        const response = await requestBarberoApi<{ servicios: Service[] }>('/api/barbero/servicios');
        if (!cancelled) {
          setServices(response.servicios ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching services:', err);
          setError(err instanceof Error ? err.message : 'No fue posible cargar los servicios');
        }
      } finally {
        if (!cancelled) {
          setServicesLoading(false);
        }
      }
    };

    loadServices();
    document.body.classList.add('modal-open');

    return () => {
      cancelled = true;
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    if (isGuest) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await requestBarberoApi<{ clientes: any[]; invitados: any[] }>(
          `/api/barbero/clientes/search?q=${encodeURIComponent(term)}`
        );

        if (!active) {
          return;
        }

        const normalizedTerm = term.toLowerCase();

        const clientes = (response.clientes ?? []).map((cliente) => ({
          id: cliente.id,
          client_type: 'cliente' as ClientType,
          nombre: cliente.nombre,
          telefono: cliente.telefono ?? null,
          email: cliente.email ?? null
        }));

        const invitados = (response.invitados ?? []).map((invitado) => ({
          id: invitado.id,
          invitado_id: invitado.id,
          client_type: 'invitado' as ClientType,
          nombre: invitado.nombre,
          telefono: invitado.telefono ?? null,
          email: invitado.email ?? null
        }));

        const merged = [...clientes, ...invitados]
          .filter((entry) => {
            const nombre = entry.nombre.toLowerCase();
            const telefono = entry.telefono?.toLowerCase() ?? '';
            return nombre.includes(normalizedTerm) || telefono.includes(normalizedTerm);
          })
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

        setSearchResults(merged);
      } catch (err) {
        if (active) {
          console.error('Error searching clients:', err);
          setError('No fue posible buscar clientes');
          setSearchResults([]);
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchTerm, isGuest]);

  const validateDuplicatePhone = async (phone: string) => {
    try {
      const trimmed = phone.trim();
      if (!trimmed) {
        return null;
      }

      const response = await requestBarberoApi<{ clientes: any[]; invitados: any[] }>(
        `/api/barbero/clientes/search?q=${encodeURIComponent(trimmed)}`
      );

      const clienteMatch = (response.clientes ?? []).find((cliente) => (cliente.telefono ?? '').trim() === trimmed);
      if (clienteMatch) {
        return {
          type: 'cliente' as ClientType,
          data: {
            nombre: clienteMatch.nombre,
            telefono: clienteMatch.telefono ?? null,
            email: clienteMatch.email ?? null
          }
        };
      }

      const invitadoMatch = (response.invitados ?? []).find((invitado) => (invitado.telefono ?? '').trim() === trimmed);
      if (invitadoMatch) {
        return {
          type: 'invitado' as ClientType,
          data: {
            nombre: invitadoMatch.nombre,
            telefono: invitadoMatch.telefono ?? null,
            email: invitadoMatch.email ?? null
          }
        };
      }

      return null;
    } catch (err) {
      console.error('Error validating phone number:', err);
      return null;
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const resetGuestData = () => setGuestData({ ...INITIAL_GUEST });

  const selectClient = async (client: SearchResult) => {
    // TODO: Implementar verificación de cola con endpoint /api/barbero/turnos/check
    // try {
    //   const response = await requestBarberoApi<{ in_queue: boolean; turno?: any }>(
    //     `/api/barbero/turnos/check?cliente_id=${client.id}&invitado_id=${client.invitado_id}`
    //   );
    //   if (response.in_queue) {
    //     // Mostrar notificación
    //     return;
    //   }
    // } catch (err) {
    //   console.warn('No se pudo verificar el estado del cliente:', err);
    // }

    setSelectedClient(client);
    setSearchTerm(client.nombre);
    setSearchResults([]);
    setIsGuest(false);
    resetGuestData();
    setError(null);
  };

  const selectGuestOption = () => {
    setIsGuest(true);
    setSelectedClient(null);
    setSearchTerm('');
    setSearchResults([]);
    resetGuestData();
  };

  const handleGuestDataChange = (field: keyof typeof guestData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setGuestData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const canProceedToStep2 = () => {
    if (isGuest) {
      return guestData.name.trim() !== '';
    }
    return selectedClient !== null;
  };

  const canProceedToStep3 = () => Boolean(selectedService);

  const goToNextStep = async () => {
    if (step === 1 && isGuest && guestData.phone.trim()) {
      const duplicateResult = await validateDuplicatePhone(guestData.phone.trim());
      if (duplicateResult) {
        setDuplicateData(duplicateResult);
        setShowDuplicateModal(true);
        return;
      }
    }

    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
  };

  const goToPrevStep = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const buildNotes = () => {
    let complete = notes.trim();
    if (lineOptions.type !== 'none') {
      const typeLabel = lineOptions.type === 'head' ? 'cabeza' : lineOptions.type === 'eyebrow' ? 'ceja' : 'cabeza y ceja';
      const sideLabel = lineOptions.side === 'left' ? 'izquierdo' : lineOptions.side === 'right' ? 'derecho' : 'ambos lados';
      const lineNote = `Rayitas en ${typeLabel} - ${sideLabel}`;
      complete = complete ? `${complete}\n\n${lineNote}` : lineNote;
    }
    return complete || null;
  };

  const handleCreateTurn = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isGuest) {
        if (!guestData.name.trim()) {
          throw new Error('El nombre del cliente invitado es requerido');
        }
      } else {
        if (!selectedClient) {
          throw new Error('Debe seleccionar un cliente de la lista');
        }

        if (!selectedClient.id && !selectedClient.invitado_id) {
          throw new Error('El cliente seleccionado no tiene identificador válido');
        }
      }

      if (!selectedService) {
        throw new Error('Debe seleccionar un servicio');
      }

      const payload: Partial<DailyTurn> = {
        barber_id: barberoId,
        service_id: selectedService.id,
        type: 'sin_cita',
        notes: buildNotes(),
        line_options: lineOptions.type !== 'none' ? lineOptions : null,
        turn_date: today(),
        status: 'en_espera',
        turn_number: 0
      };

      if (isGuest) {
        payload.client_type = 'invitado';
        payload.client_name = guestData.name.trim();
        payload.client_phone = guestData.phone.trim() || undefined;
        payload.client_email = guestData.email.trim() || undefined;
      } else if (selectedClient) {
        payload.client_type = selectedClient.client_type;
        payload.client_name = selectedClient.nombre;
        payload.client_phone = selectedClient.telefono ?? undefined;
        payload.client_email = selectedClient.email ?? undefined;

        if (selectedClient.client_type === 'cliente') {
          payload.cliente_id = selectedClient.id;
        } else {
          payload.invitado_id = selectedClient.invitado_id ?? selectedClient.id;
        }
      }

      await requestBarberoApi('/api/barbero/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicio_id: payload.service_id,
          cliente_id: payload.cliente_id,
          invitado_id: payload.invitado_id,
          cliente_nombre: payload.client_name,
          cliente_telefono: payload.client_phone,
          notas: payload.notes,
          fecha: payload.turn_date,
        }),
      });

      if (typeof window !== 'undefined' && (window as any).mostrarNotificacion) {
        (window as any).mostrarNotificacion('Turno agregado a la cola', 'success');
      }

      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear turno';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const stepDescription = useMemo(() => {
    switch (step) {
      case 1:
        return 'Selecciona o registra un cliente';
      case 2:
        return 'Elige el servicio a realizar';
      default:
        return 'Revisa los detalles antes de confirmar';
    }
  }, [step]);

  const renderClientStep = () => (
    <div className="space-y-6">
      <header className="text-center space-y-3">
        <div className="relative inline-flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 opacity-20" />
          <div className="relative rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-4">
            <User className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white">Seleccionar cliente</h3>
        <p className="text-sm text-gray-300">Busca un cliente existente o crea uno nuevo temporal</p>
        <div className="mx-auto flex max-w-sm rounded-xl bg-gray-800/40 p-1">
          <button
            type="button"
            onClick={() => {
              if (isGuest) {
                setIsGuest(false);
                resetGuestData();
              }
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              !isGuest ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            Cliente registrado
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isGuest) {
                setIsGuest(true);
                setSelectedClient(null);
                setSearchTerm('');
              }
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isGuest ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            Cliente invitado
          </button>
        </div>
      </header>

      <section className="grid gap-4">
        <div
          className={`rounded-2xl border p-5 transition-all ${
            !isGuest ? 'border-blue-500/40 bg-blue-500/10 ring-2 ring-blue-500/30' : 'border-gray-700 bg-gray-800/50'
          }`}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className={`rounded-xl p-2 ${!isGuest ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Buscar cliente registrado</h4>
              <p className="text-xs text-gray-400">Mínimo 2 caracteres</p>
            </div>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Nombre, teléfono..."
            disabled={isGuest}
            className="w-full rounded-xl border border-gray-700 bg-gray-900/70 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {!isGuest && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-gray-700/60">
              {searching && <div className="p-3 text-center text-sm text-gray-400">Buscando...</div>}
              {!searching && searchResults.length === 0 && searchTerm.trim().length >= 2 && (
                <div className="p-3 text-center text-sm text-gray-500">Sin resultados</div>
              )}
              {searchResults.map((client) => (
                <button
                  key={`${client.client_type}-${client.id ?? client.invitado_id}`}
                  type="button"
                  onClick={() => selectClient(client)}
                  className="flex w-full items-center justify-between border-b border-gray-700/60 px-4 py-3 text-left hover:bg-blue-500/10"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{client.nombre}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          client.client_type === 'cliente' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {client.client_type === 'cliente' ? 'Registrado' : 'Invitado'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{client.telefono ?? 'Sin teléfono'}</div>
                  </div>
                  <User className="h-4 w-4 text-gray-500" />
                </button>
              ))}
              {selectedClient && (
                <div className="flex items-center justify-between bg-green-500/10 px-4 py-3 text-sm text-green-200">
                  <div>
                    <p className="font-semibold">{selectedClient.nombre}</p>
                    <p className="text-xs text-green-300">Cliente seleccionado</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setSearchTerm('');
                      setSearchResults([]);
                    }}
                    className="rounded-full px-2 py-1 text-xs text-green-100 hover:bg-green-500/20"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl border p-5 transition-all ${
            isGuest ? 'border-purple-500/40 bg-purple-500/10 ring-2 ring-purple-500/30' : 'border-gray-700 bg-gray-800/50'
          }`}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className={`rounded-xl p-2 ${isGuest ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Cliente invitado</h4>
              <p className="text-xs text-gray-400">Ingresa los datos del cliente temporal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={selectGuestOption}
            className={`mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition ${
              isGuest ? 'border-purple-500 text-purple-400' : 'border-gray-600 text-gray-400 hover:border-purple-400 hover:text-purple-300'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Crear cliente temporal
          </button>
          {isGuest && (
            <div className="grid gap-3">
              <label className="text-xs font-medium text-gray-400">
                Nombre *
                <input
                  type="text"
                  value={guestData.name}
                  onChange={handleGuestDataChange('name')}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Nombre del cliente"
                />
              </label>
              <label className="text-xs font-medium text-gray-400">
                Teléfono
                <input
                  type="tel"
                  value={guestData.phone}
                  onChange={handleGuestDataChange('phone')}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Número de contacto"
                />
              </label>
              <label className="text-xs font-medium text-gray-400">
                Email
                <input
                  type="email"
                  value={guestData.email}
                  onChange={handleGuestDataChange('email')}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Correo (opcional)"
                />
              </label>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderServiceStep = () => (
    <div className="space-y-6">
      <header className="text-center space-y-3">
        <div className="relative inline-flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 opacity-20" />
          <div className="relative rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4">
            <Scissors className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white">Seleccionar servicio</h3>
        <p className="text-sm text-gray-300">Elige el servicio que vas a realizar</p>
      </header>

      {servicesLoading ? (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 text-center text-sm text-gray-400">
          Cargando servicios...
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 text-center text-sm text-gray-400">
          No se encontraron servicios definidos.
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => {
            const isSelected = selectedService?.id === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => setSelectedService(service)}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg'
                    : 'border-gray-700 bg-gray-800/60 hover:border-emerald-400 hover:bg-emerald-500/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold text-white">{service.nombre}</h4>
                      {isSelected && <CheckCircle className="h-5 w-5 text-emerald-400" />}
                    </div>
                    <p className="text-sm text-gray-300">
                      {service.descripcion ?? 'Servicio sin descripción'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm text-gray-300">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {service.duracion_minutos ?? service.duracion_estimada ?? '-'} min
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                      ${service.precio}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <header className="text-center space-y-3">
        <div className="relative inline-flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 opacity-20" />
          <div className="relative rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white">Confirmar turno</h3>
        <p className="text-sm text-gray-300">Revisa los datos antes de registrar el turno</p>
      </header>

      <section className="grid gap-4">
        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <User className="h-4 w-4" /> Cliente
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="font-medium text-white">
              {isGuest ? guestData.name : selectedClient?.nombre}
            </div>
            <div>{isGuest ? guestData.phone || 'Sin teléfono' : selectedClient?.telefono ?? 'Sin teléfono'}</div>
            <div>{isGuest ? guestData.email || 'Sin email' : selectedClient?.email ?? 'Sin email'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Scissors className="h-4 w-4" /> Servicio seleccionado
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            <div className="font-medium text-white">{selectedService?.nombre}</div>
            <div className="flex gap-4">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {selectedService?.duracion_minutos ?? selectedService?.duracion_estimada ?? '-'} min
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                <DollarSign className="h-4 w-4" /> ${selectedService?.precio}
              </span>
            </div>
            {selectedService?.descripcion && (
              <p className="rounded-lg border border-gray-700/60 bg-gray-900/60 p-3 text-xs">
                {selectedService.descripcion}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <AlertCircle className="h-4 w-4" /> Opciones adicionales
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400">¿Desea rayitas?</label>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  { value: 'none', label: 'Sin rayitas', icon: '❌' },
                  { value: 'head', label: 'Cabeza', icon: '👤' },
                  { value: 'eyebrow', label: 'Ceja', icon: '👁️' },
                  { value: 'both', label: 'Ambas', icon: '✨' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLineOptions((prev) => ({ ...prev, type: option.value as LineType }))}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      lineOptions.type === option.value
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                        : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-indigo-400 hover:text-indigo-200'
                    }`}
                  >
                    <div className="text-sm">{option.icon}</div>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {lineOptions.type !== 'none' && (
              <div>
                <label className="text-xs font-medium text-gray-400">¿En qué lado?</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { value: 'left', label: 'Izquierdo', icon: '⬅️' },
                    { value: 'right', label: 'Derecho', icon: '➡️' },
                    { value: 'both', label: 'Ambos', icon: '↔️' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLineOptions((prev) => ({ ...prev, side: option.value as LineSide }))}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        lineOptions.side === option.value
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                          : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-indigo-400 hover:text-indigo-200'
                      }`}
                    >
                      <div className="text-sm">{option.icon}</div>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-400">Notas adicionales</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Instrucciones especiales, observaciones..."
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderClientStep();
      case 2:
        return renderServiceStep();
      default:
        return renderConfirmationStep();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-6">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-800/60 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 shadow-2xl">
        <header className="relative flex items-start justify-between gap-3 bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 p-4 text-white">
          <div>
            <h2 className="text-xl font-bold">Registrar nuevo turno</h2>
            <p className="text-xs text-white/80">{stepDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {renderCurrentStep()}
        </div>

        <footer className="flex items-center justify-between border-t border-gray-800/60 bg-gray-900/60 p-4">
          <button
            type="button"
            onClick={goToPrevStep}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Paso {step} de 3</span>
            {step < 3 ? (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={(step === 1 && !canProceedToStep2()) || (step === 2 && !canProceedToStep3())}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-700"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateTurn}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700"
              >
                {loading ? 'Registrando...' : 'Confirmar turno'}
              </button>
            )}
          </div>
        </footer>
      </div>

      {showDuplicateModal && duplicateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-md rounded-2xl border border-yellow-400/40 bg-gray-900/95 p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-yellow-300">Teléfono ya registrado</h3>
            <p className="mt-2 text-sm text-gray-200">
              El teléfono coincide con un {duplicateData.type === 'cliente' ? 'cliente registrado' : 'invitado'}:
            </p>
            <div className="mt-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              <p className="font-semibold">{duplicateData.data.nombre}</p>
              {duplicateData.data.telefono && <p>Teléfono: {duplicateData.data.telefono}</p>}
              {duplicateData.data.email && <p>Email: {duplicateData.data.email}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateData(null);
                }}
                className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm text-yellow-200 hover:bg-yellow-500/20"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateData(null);
                  setIsGuest(false);
                  setSearchTerm('');
                }}
                className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-400"
              >
                Buscar nuevamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnRegistrationModal;
