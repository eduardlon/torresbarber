import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useModal } from '../../hooks/useModal.tsx';
import { supabaseService } from '../../services/supabaseService';

interface AdminBarbero {
  id: string;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  activo?: boolean | null;
  especialidad?: string | null;
  descripcion?: string | null;
  foto?: string | null;
  experiencia_anos?: number | null;
  calificacion_promedio?: number | null;
  total_servicios?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  usuario?: string | null;
  role?: string | null;
  fechaIngreso?: string | null;
  ventasSemana?: number | null;
  ventasHoy?: number | null;
  citasHoy?: number | null;
  ultimoPago?: string | null;
  estadoPago?: string | null;
}

interface BarberoFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  usuario: string;
  password: string;
  activo: boolean;
}

type RawBarbero = Record<string, unknown>;

const normalizeBarbero = (raw: unknown): AdminBarbero => {
  const data: RawBarbero = (raw && typeof raw === 'object') ? (raw as RawBarbero) : {};

  const id = data.id !== undefined && data.id !== null
    ? String(data.id)
    : `temp-${Math.random().toString(36).slice(2)}`;

  const nombre = typeof data.nombre === 'string' ? data.nombre : '';
  const apellido = typeof data.apellido === 'string' ? data.apellido : null;
  const email = typeof data.email === 'string' ? data.email : null;
  const telefono = typeof data.telefono === 'string' ? data.telefono : null;
  const activo = typeof data.activo === 'boolean' ? data.activo : true;
  const createdAt = typeof data.created_at === 'string' ? data.created_at : null;
  const usuario = typeof data.usuario === 'string'
    ? data.usuario
    : email
      ? email.split('@')[0]
      : null;
  const role = typeof data.role === 'string' ? data.role : 'barbero';

  const toNumberOrNull = (value: unknown): number | null => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return null;
  };

  return {
    id,
    nombre,
    apellido,
    email,
    telefono,
    activo,
    especialidad: typeof data.especialidad === 'string' ? data.especialidad : null,
    descripcion: typeof data.descripcion === 'string' ? data.descripcion : null,
    foto: typeof data.foto === 'string' ? data.foto : null,
    experiencia_anos: toNumberOrNull(data.experiencia_anos),
    calificacion_promedio: toNumberOrNull(data.calificacion_promedio),
    total_servicios: toNumberOrNull(data.total_servicios),
    created_at: createdAt,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    usuario,
    role,
    fechaIngreso: typeof data.fechaIngreso === 'string' ? data.fechaIngreso : createdAt,
    ventasSemana: toNumberOrNull(data.ventasSemana) ?? 0,
    ventasHoy: toNumberOrNull(data.ventasHoy) ?? 0,
    citasHoy: toNumberOrNull(data.citasHoy) ?? 0,
    ultimoPago: typeof data.ultimoPago === 'string' ? data.ultimoPago : null,
    estadoPago: typeof data.estadoPago === 'string' ? data.estadoPago : null,
  };
};

const Barberos = () => {
  const [activeTab, setActiveTab] = useState<'gestion' | 'rendimiento'>('gestion');
  const [barberos, setBarberos] = useState<AdminBarbero[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarbero, setEditingBarbero] = useState<AdminBarbero | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccessModal, showConfirmModal, ModalComponent } = useModal();
  const [formData, setFormData] = useState<BarberoFormData>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    usuario: '',
    password: '',
    activo: true
  });

  useEffect(() => {
    loadBarberos();
  }, []);

  const loadBarberos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [barberosResult, statsSemanaResponse, statsHoyResponse] = await Promise.all([
        supabaseService.getBarberos(),
        fetch('/api/admin/stats?periodo=week')
          .then(async (res) => {
            if (!res.ok) return null;
            try {
              return await res.json();
            } catch {
              return null;
            }
          })
          .catch(() => null),
        fetch('/api/admin/stats?periodo=today')
          .then(async (res) => {
            if (!res.ok) return null;
            try {
              return await res.json();
            } catch {
              return null;
            }
          })
          .catch(() => null),
      ]);

      const { data, error } = barberosResult;

      if (error) {
        setError(error);
        return;
      }

      const statsSemanaPorBarbero: Record<string, { ventasSemana: number; ultimoPago?: string | null }> = {};
      const statsHoyPorBarbero: Record<string, { ventasHoy: number; citasHoy: number }> = {};

      const barberosStatsSemana = (statsSemanaResponse?.stats?.barberosStats ?? []) as any[];
      const barberosStatsHoy = (statsHoyResponse?.stats?.barberosStats ?? []) as any[];

      barberosStatsSemana.forEach((stat) => {
        const id = stat.id ?? stat.barbero_id;
        if (id === undefined || id === null) return;
        const key = String(id);
        const ganancias = Number(stat.ganancias ?? 0);
        const ultimoPago = typeof stat.ultimoPago === 'string' ? stat.ultimoPago : null;
        statsSemanaPorBarbero[key] = { ventasSemana: ganancias, ultimoPago };
      });

      barberosStatsHoy.forEach((stat) => {
        const id = stat.id ?? stat.barbero_id;
        if (id === undefined || id === null) return;
        const key = String(id);
        const ventasHoy = Number(stat.ganancias ?? 0);
        const citasHoy = Number(stat.citasCompletadas ?? stat.citas ?? 0);
        statsHoyPorBarbero[key] = { ventasHoy, citasHoy };
      });

      const normalized = (data ?? []).map((item) => {
        const base = normalizeBarbero(item);
        const extraSemana = statsSemanaPorBarbero[base.id];
        const extraHoy = statsHoyPorBarbero[base.id];

        const ultimoPago = extraSemana?.ultimoPago ?? base.ultimoPago;

        let estadoPago = base.estadoPago ?? null;
        if (ultimoPago) {
          const ultimoDate = new Date(ultimoPago);
          if (!Number.isNaN(ultimoDate.getTime())) {
            const ahora = new Date();
            const unaSemana = 7 * 24 * 60 * 60 * 1000;
            estadoPago = (ahora.getTime() - ultimoDate.getTime()) < unaSemana ? 'pagado' : 'pendiente';
          }
        }

        return {
          ...base,
          ventasSemana: extraSemana?.ventasSemana ?? base.ventasSemana,
          ventasHoy: extraHoy?.ventasHoy ?? base.ventasHoy,
          citasHoy: extraHoy?.citasHoy ?? base.citasHoy,
          ultimoPago,
          estadoPago,
        };
      });

      setBarberos(normalized);
    } catch (error) {
      console.error('Error cargando barberos:', error);
      setError('Error al cargar los barberos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value } = target;

    let nextValue: string | boolean = value;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      nextValue = target.checked;
    }

    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const openModal = (barbero: AdminBarbero | null = null) => {
    if (barbero) {
      setEditingBarbero(barbero);
      setFormData({
        nombre: barbero.nombre || '',
        apellido: barbero.apellido || '',
        email: barbero.email || '',
        telefono: barbero.telefono || '',
        usuario: barbero.usuario || '',
        password: '',
        activo: barbero.activo ?? true
      });
    } else {
      setEditingBarbero(null);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        usuario: '',
        password: '',
        activo: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBarbero(null);
  };

  const preparePayload = (data: BarberoFormData, isEditing: boolean) => {
    const sanitized: BarberoFormData = { ...data };

    const stringFields: (keyof Pick<BarberoFormData, 'nombre' | 'apellido' | 'email' | 'telefono' | 'usuario' | 'password'>)[] = [
      'nombre',
      'apellido',
      'email',
      'telefono',
      'usuario',
      'password'
    ];

    stringFields.forEach((field) => {
      const value = sanitized[field];
      if (typeof value === 'string') {
        sanitized[field] = value.trim() as typeof sanitized[typeof field];
      }
    });

    if (!sanitized.nombre) {
      throw new Error('El nombre es obligatorio');
    }

    if (!sanitized.usuario) {
      throw new Error('El usuario es obligatorio');
    }

    const payload: Record<string, unknown> = {
      nombre: sanitized.nombre || '',
      activo: Boolean(sanitized.activo),
    };

    payload.apellido = sanitized.apellido || null;
    payload.email = sanitized.email || null;
    payload.telefono = sanitized.telefono || null;
    payload.usuario = sanitized.usuario || null;

    if (isEditing) {
      if (sanitized.password) {
        payload.password = sanitized.password;
      }
    } else {
      payload.password = sanitized.password;
      payload.role = 'barbero';
    }

    return payload;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setError(null);

      const payload = preparePayload(formData, Boolean(editingBarbero));

      if (!editingBarbero && !payload.password) {
        setError('La contraseña es obligatoria.');
        return;
      }

      if (editingBarbero) {
        // Actualizar barbero existente
        const { error: updateError } = await supabaseService.updateBarbero(editingBarbero.id, payload);

        if (updateError) {
          setError(updateError);
          return;
        }

        await loadBarberos();
        showSuccessModal('Éxito', 'Barbero actualizado exitosamente');
      } else {
        // Crear nuevo barbero
        const { error: createError } = await supabaseService.createBarbero(payload);

        if (createError) {
          setError(createError);
          return;
        }

        await loadBarberos();
        showSuccessModal('Éxito', 'Barbero creado exitosamente');
      }
      
      closeModal();
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setError('Error al procesar la solicitud');
    }
  };

  const handleDelete = (id: string) => {
    const barbero = barberos.find(b => b.id === id);
    showConfirmModal(
      'Eliminar Barbero',
      `¿Estás seguro de que quieres eliminar a ${barbero?.nombre}? Esta acción no se puede deshacer.`,
      async () => {
        try {
          const { error } = await supabaseService.deleteBarbero(id);

          if (error) {
            setError(error);
            return;
          }

          await loadBarberos();
          showSuccessModal('Éxito', 'Barbero eliminado exitosamente');
        } catch (error) {
          console.error('Error eliminando barbero:', error);
          setError('Error al eliminar el barbero');
        }
      }
    );
  };

  const toggleStatus = async (id: string) => {
    try {
      const { error } = await supabaseService.toggleBarberoStatus(id);

      if (error) {
        setError(error);
        return;
      }

      await loadBarberos();
      const barbero = barberos.find(b => b.id === id);
      const nuevoEstadoActivo = !(barbero?.activo ?? false);
      showSuccessModal('Éxito', `Barbero ${nuevoEstadoActivo ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error) {
      console.error('Error cambiando estado del barbero:', error);
      setError('Error al cambiar el estado del barbero');
    }
  };

  const handlePago = (id: string) => {
    const barbero = barberos.find(b => b.id === id);
    if (!barbero) {
      return;
    }

    const ultimoPago = barbero.ultimoPago ? new Date(barbero.ultimoPago) : null;
    const ahora = new Date();
    const unaSemana = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
    
    if (ultimoPago && (ahora.getTime() - ultimoPago.getTime()) < unaSemana) {
      const diasRestantes = Math.ceil((unaSemana - (ahora.getTime() - ultimoPago.getTime())) / (24 * 60 * 60 * 1000));
      showSuccessModal('Pago no disponible', `Debes esperar ${diasRestantes} días más para realizar el próximo pago.`);
      return;
    }

    const montoPago = Number(barbero.ventasSemana ?? 0) || 0;
    if (montoPago <= 0) {
      showSuccessModal('Sin monto a pagar', 'No hay ventas registradas para este periodo.');
      return;
    }

    const hoyISO = new Date().toISOString();
    const fechaGasto = hoyISO.split('T')[0];
    const concepto = `Pago semanal barbero ${barbero.nombre} ${barbero.apellido ?? ''}`.trim();

    showConfirmModal(
      'Confirmar Pago',
      `¿Confirmar pago semanal para ${barbero.nombre} ${barbero.apellido ?? ''}?
Monto: $${montoPago.toFixed(2)}`,
      async () => {
        try {
          const response = await fetch('/api/admin/gastos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              concepto,
              monto: montoPago,
              categoria: 'barber_payment',
              fecha_gasto: fechaGasto,
              notas: 'Pago semanal generado desde el panel admin',
              barbero_id: barbero.id,
              periodo: 'semana',
            }),
          });

          const result = await response.json().catch(() => null);

          if (!response.ok || !result?.success) {
            const message = (result && typeof result.message === 'string')
              ? result.message
              : 'Error al registrar el gasto del pago al barbero';
            setError(message);
            return;
          }

          setBarberos(prev => prev.map(b =>
            b.id === id
              ? {
                  ...b,
                  estadoPago: 'pagado',
                  ultimoPago: fechaGasto,
                  ventasSemana: 0,
                }
              : b
          ));

          showSuccessModal('Éxito', 'Pago procesado y registrado como gasto exitosamente');
        } catch (error) {
          console.error('Error registrando pago de barbero como gasto via API admin:', error);
          setError('No se pudo registrar el gasto del pago al barbero');
        }
      }
    );
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredBarberos = normalizedSearchTerm
    ? barberos.filter((barbero) => {
        const nombre = barbero.nombre?.toLowerCase() ?? '';
        const apellido = (barbero.apellido ?? '').toLowerCase();
        const correo = (barbero.email ?? '').toLowerCase();
        const usuario = (barbero.usuario ?? '').toLowerCase();
        return (
          nombre.includes(normalizedSearchTerm) ||
          apellido.includes(normalizedSearchTerm) ||
          correo.includes(normalizedSearchTerm) ||
          usuario.includes(normalizedSearchTerm)
        );
      })
    : barberos;

  const formatCurrency = (amount: number | null | undefined) => {
    const value = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const canPay = (barbero: AdminBarbero) => {
    if (!barbero.ultimoPago) return true;
    const ultimoPago = new Date(barbero.ultimoPago);
    if (Number.isNaN(ultimoPago.getTime())) return true;
    const ahora = new Date();
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    return ahora.getTime() - ultimoPago.getTime() >= unaSemana;
  };

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Barberos</h1>
          <p className="text-white/60 mt-2">Gestión y rendimiento del equipo</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/60">Cargando barberos...</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl p-2 border border-zinc-700/30 shadow-lg">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('gestion')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'gestion'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25'
                : 'text-white/60 hover:text-white hover:bg-zinc-700/30'
            }`}
          >
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Gestión de Barberos
          </button>
          <button
            onClick={() => setActiveTab('rendimiento')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'rendimiento'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25'
                : 'text-white/60 hover:text-white hover:bg-zinc-700/30'
            }`}
          >
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Rendimiento
          </button>
        </div>
      </div>

      {/* Gestión de Barberos Tab */}
      {activeTab === 'gestion' && !loading && (
        <div className="space-y-6">
          {/* Header con botón agregar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <h2 className="text-2xl font-semibold text-white">Gestión de Barberos</h2>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg shadow-red-500/25"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nuevo Barbero</span>
            </button>
          </div>

          {/* Search */}
          <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/30 shadow-lg">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar barberos por nombre, apellido o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/30 rounded-xl pl-12 pr-4 py-4 text-white placeholder-white/40 focus:outline-none focus:border-red-600/50 focus:ring-2 focus:ring-red-600/20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Barberos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBarberos.map((barbero) => (
              <div key={barbero.id} className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-2xl border border-zinc-700/30 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 hover:border-red-600/30">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                      <span className="text-white font-bold text-lg">
                        {(barbero.nombre?.charAt(0) || '') + (barbero.apellido?.charAt(0) || '')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base">{barbero.nombre} {barbero.apellido}</h3>
                      <p className="text-white/60 text-sm">@{barbero.usuario ?? (barbero.email ? barbero.email.split('@')[0] : 'usuario')}</p>
                    </div>
                  </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-medium ${
                      barbero.activo 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {barbero.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-3 text-sm">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-white/80 truncate">{barbero.email}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-white/80">{barbero.telefono}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-6 0V7" />
                      </svg>
                      <span className="text-white/80">Desde {barbero.fechaIngreso ? new Date(barbero.fechaIngreso).toLocaleDateString('es-ES') : 'N/D'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-center">
                      <p className="text-blue-400 font-bold text-xl">{barbero.citasHoy || 0}</p>
                      <p className="text-white/60 text-xs mt-1">Citas Hoy</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4 text-center">
                      <p className="text-green-400 font-bold text-xl">{formatCurrency(barbero.ventasHoy)}</p>
                      <p className="text-white/60 text-xs mt-1">Ventas Hoy</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => openModal(barbero)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-500/25"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleStatus(barbero.id)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg ${
                        barbero.activo
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-yellow-500/25'
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/25'
                      }`}
                    >
                      {barbero.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(barbero.id)}
                      className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-sm transition-all duration-300 shadow-lg shadow-red-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBarberos.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-12">
                <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <p className="text-white/60 text-xl font-medium">No se encontraron barberos</p>
                <p className="text-white/40 text-sm mt-2">Intenta ajustar tu búsqueda o agrega un nuevo barbero</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rendimiento Tab */}
      {activeTab === 'rendimiento' && (
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold text-white">Rendimiento y Pagos</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {barberos.filter(b => b.activo).map((barbero) => (
              <div key={barbero.id} className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-6 shadow-xl hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 hover:border-red-600/30">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                      <span className="text-white font-bold text-lg">
                        {(barbero.nombre?.charAt(0) || '') + (barbero.apellido?.charAt(0) || '')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base">{barbero.nombre} {barbero.apellido}</h3>
                      <p className="text-white/60 text-sm">Rendimiento semanal</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-medium border ${
                    barbero.estadoPago === 'pagado'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {barbero.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <p className="text-blue-400 font-bold text-xl">{barbero.citasHoy || 0}</p>
                    <p className="text-white/60 text-xs mt-1">Citas Hoy</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-green-400 font-bold text-xl">{formatCurrency(barbero.ventasHoy)}</p>
                    <p className="text-white/60 text-xs mt-1">Ventas Hoy</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-700/50 border border-zinc-700/30 rounded-xl p-5 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white/80 text-sm font-medium">Ventas Semana:</span>
                    <span className="text-green-400 font-bold text-xl">{formatCurrency(barbero.ventasSemana)}</span>
                  </div>
                  {barbero.ultimoPago && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/60">Último pago:</span>
                      <span className="text-white/80">{new Date(barbero.ultimoPago).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handlePago(barbero.id)}
                  disabled={!canPay(barbero) || (barbero.ventasSemana ?? 0) === 0}
                  className={`w-full py-4 rounded-xl font-medium transition-all duration-300 text-sm flex items-center justify-center space-x-2 ${
                    canPay(barbero) && (barbero.ventasSemana ?? 0) > 0
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-500/25'
                      : 'bg-zinc-700/50 text-white/40 cursor-not-allowed border border-zinc-600/30'
                  }`}
                >
                  {canPay(barbero) && (barbero.ventasSemana ?? 0) > 0 && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  )}
                  <span>
                    {!canPay(barbero) ? 'Pago no disponible' : 
                     (barbero.ventasSemana ?? 0) === 0 ? 'Sin ventas' : 
                     `Pagar ${formatCurrency(barbero.ventasSemana)}`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-sm rounded-2xl border border-zinc-700/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-zinc-700/30">
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {editingBarbero ? 'Editar Barbero' : 'Nuevo Barbero'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Información Personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="Nombre"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="Apellido"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="email@ejemplo.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="+1234567890"
                    required
                  />
                </div>
              </div>

              {/* Credenciales de Login */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">Usuario</label>
                  <input
                    type="text"
                    name="usuario"
                    value={formData.usuario}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="usuario.panel"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">
                    Contraseña {editingBarbero && '(dejar vacío para mantener actual)'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                    placeholder="••••••••"
                    required={!editingBarbero}
                  />
                </div>
              </div>

              {/* Estado */}
              <div className="bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 border border-zinc-700/30 rounded-xl p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-red-600 bg-zinc-800/50 border-zinc-700/50 rounded-lg focus:ring-red-500/50 focus:ring-2"
                  />
                  <span className="text-white/80 text-sm font-medium">Barbero activo</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-zinc-700/50 hover:bg-zinc-600/50 text-white/80 py-3 sm:py-4 rounded-xl font-medium transition-all duration-300 border border-zinc-600/30 text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 sm:py-4 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-red-500/25 text-sm sm:text-base"
                >
                  {editingBarbero ? 'Actualizar' : 'Crear'} Barbero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalComponent />
    </div>
  );
};

export default Barberos;