import { supabase } from '../db/supabase.js';
import bcrypt from 'bcryptjs';
import type {
  Appointment,
  Barber,
  DailyTurn,
  DashboardAppointment,
  DashboardSale,
  Producto,
  Service,
} from '../types/index';
import type { RealtimeChannel, Session, User } from '@supabase/supabase-js';

export type GaleriaItemTipo = 'gorra' | 'corte' | 'vape';

export interface GaleriaItem {
  id: string;
  tipo: GaleriaItemTipo;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagenes: string[];
  colores: string[] | null;
  sabores: string[] | null;
  nicotina_mg: number | null;
  stock: number | null;
  tags: string[];
  destacado: boolean;
  activo: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type GaleriaItemPayload = {
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  imagenes?: string[];
  colores?: string[] | null;
  sabores?: string[] | null;
  nicotina_mg?: number | null;
  stock?: number | null;
  tags?: string[];
  destacado?: boolean;
  activo?: boolean;
  metadata?: Record<string, unknown> | null;
};

const normalizeGaleriaItemTipo = (tipo: string | null | undefined): GaleriaItemTipo => {
  switch ((tipo ?? '').toLowerCase()) {
    case 'gorra':
    case 'gorras':
      return 'gorra';
    case 'corte':
    case 'cortes':
      return 'corte';
    case 'vape':
    case 'vapes':
      return 'vape';
    default:
      return 'gorra';
  }
};

type BarberoAuthRow = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  usuario?: string | null;
  password?: string | null;
  activo?: boolean | null;
};

export type BarberoCita = {
  id: number;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  fecha_hora: string;
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'completada' | 'cancelada';
  servicio_nombre: string;
  precio?: number | null;
  notas?: string | null;
  duracion_estimada?: number | null;
};

const mapSupabaseError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Error desconocido en Supabase';
};

const unwrapRelation = <T>(relation: T | T[] | null | undefined): T | null => {
  if (relation === null || relation === undefined) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
};

const ADMIN_ROLE_ALIASES = new Set(['admin', 'super_admin', 'superadmin', 'administrador', 'administrator']);

const DAILY_TURN_SELECT = `
  *,
  appointment:citas(
    *,
    servicios:servicio_id(
      id,
      nombre,
      duracion_minutos,
      precio
    ),
    barberos:barbero_id(
      id,
      nombre,
      apellido
    )
  ),
  barber:barberos(
    id,
    nombre,
    apellido,
    email,
    telefono,
    foto
  ),
  service:servicios(
    id,
    nombre,
    duracion_minutos,
    precio
  ),
  cliente:clientes(
    id,
    nombre,
    telefono,
    email
  )
`;

class SupabaseService {
  private getDateRangeForDay(date?: string) {
    const baseDate = date ? new Date(date) : new Date();
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      dateISO: start.toISOString().split('T')[0],
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private generateBarberoSessionToken() {
    const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
    const token = globalCrypto?.randomUUID
      ? globalCrypto.randomUUID()
      : `barbero-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

    return {
      access_token: token,
      token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 horas
    };
  }

  async getBarberoProfile(id: string): Promise<{ data: Barber | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('barberos')
        .select('id, nombre, apellido, email, telefono, usuario, activo, especialidad, descripcion, foto, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: (data as Barber) ?? null, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async getBarberos(): Promise<{ data: Barber[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('barberos')
        .select('id, nombre, apellido, email, telefono, activo, especialidad, descripcion, foto, created_at, updated_at, usuario, role')
        .order('nombre', { ascending: true });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data ?? []) as Barber[], error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  private buildAuthUser(user: User | null | undefined, roleOverride?: string | null) {
    if (!user) {
      return null;
    }

    const role = (roleOverride ?? user.user_metadata?.role ?? user.app_metadata?.role) as string | undefined;

    return {
      id: user.id,
      email: user.email ?? null,
      role: role ?? null,
      nombre: (user.user_metadata?.nombre as string | undefined) ?? user.email ?? null,
      telefono: (user.user_metadata?.telefono as string | undefined) ?? null,
      metadata: user.user_metadata ?? {}
    };
  }

  private async resolveRoleByEmail(
    email: string | null | undefined,
    expectedRole?: 'admin' | 'barbero' | 'cliente'
  ): Promise<string | undefined> {
    if (!email) {
      return undefined;
    }

    try {
      switch (expectedRole) {
        case 'admin': {
          const { data } = await supabase
            .from('usuarios')
            .select('role, activo')
            .eq('email', email)
            .maybeSingle();

          if (data?.activo === false) {
            return 'inactive_admin';
          }

          if (data?.role) {
            return (data.role as string).trim();
          }
          break;
        }
        case 'barbero': {
          const { data } = await supabase
            .from('barberos')
            .select('id, activo')
            .eq('email', email)
            .maybeSingle();

          if (data?.id) {
            if (data.activo === false) {
              return 'inactive_barbero';
            }
            return 'barbero';
          }
          break;
        }
        case 'cliente': {
          const { data } = await supabase
            .from('clientes')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (data?.id) {
            return 'cliente';
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.warn('No fue posible resolver el rol desde la base de datos:', error);
    }

    return undefined;
  }

  private async loginWithRole(
    credentials: { email: string; password: string },
    role?: 'admin' | 'barbero' | 'cliente'
  ): Promise<{
    success: boolean;
    session: Session | null;
    user: ReturnType<SupabaseService['buildAuthUser']>;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        return { success: false, session: null, user: null, error: error.message };
      }

      const { session, user } = data;

      if (!session || !user) {
        return { success: false, session: null, user: null, error: 'Sesión no disponible' };
      }

      let userRole = (user.user_metadata?.role ?? user.app_metadata?.role) as string | undefined;

      if (!userRole) {
        const resolvedRole = await this.resolveRoleByEmail(user.email, role);
        if (resolvedRole && !resolvedRole.startsWith('inactive_')) {
          userRole = resolvedRole;
        }
        if (resolvedRole?.startsWith('inactive_')) {
          await supabase.auth.signOut();
          return {
            success: false,
            session: null,
            user: null,
            error: 'La cuenta asociada está inactiva. Contacta al administrador.'
          };
        }
      }

      const normalizedRole = userRole ? userRole.trim().toLowerCase() : undefined;
      const expectedRole = role ? role.toLowerCase() : role;
      const isAllowedRole = normalizedRole ? ADMIN_ROLE_ALIASES.has(normalizedRole) : false;

      if (expectedRole) {
        const roleMatches = normalizedRole === expectedRole || (expectedRole === 'admin' && isAllowedRole);
        if (!roleMatches) {
          await supabase.auth.signOut();
          return {
            success: false,
            session: null,
            user: null,
            error: 'No tienes permisos para acceder con este tipo de usuario'
          };
        }
      }

      return {
        success: true,
        session,
        user: this.buildAuthUser(user, normalizedRole && isAllowedRole ? 'admin' : normalizedRole)
      };
    } catch (error) {
      return {
        success: false,
        session: null,
        user: null,
        error: mapSupabaseError(error)
      };
    }
  }

  private getDateRange(filter: 'today' | 'week' | 'month' | 'year') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'week':
        start.setDate(start.getDate() - 6);
        break;
      case 'month':
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0, 1);
        break;
      default:
        break;
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  private formatTime(isoString: string | null | undefined) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private mapEstado(status: string | null | undefined) {
    switch (status) {
      case 'confirmed':
        return 'confirmada';
      case 'completed':
        return 'completada';
      case 'cancelled':
        return 'cancelada';
      case 'no_show':
        return 'no_asistio';
      case 'in_progress':
        return 'en_proceso';
      default:
        return 'pendiente';
    }
  }

  // ----------------------
  // Productos
  // ----------------------
  async getProductos(): Promise<{ data: Producto[]; error: string | null }> {
    try {
      const res = await fetch('/api/admin/productos');
      const json = await res.json().catch(() => null) as { success?: boolean; productos?: any[]; message?: string } | null;

      if (!res.ok || !json || json.success === false) {
        return { data: [], error: json?.message || 'Error al obtener productos' };
      }

      const data = (json.productos || []) as Producto[];
      return { data, error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getServicios(): Promise<{ data: Service[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre, descripcion, precio, duracion_minutos, activo')
        .order('nombre', { ascending: true });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data ?? []) as Service[], error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async createProducto(payload: Partial<Producto>): Promise<{ data: Producto | null; error: string | null }> {
    try {
      const res = await fetch('/api/admin/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null) as { success?: boolean; producto?: any; message?: string } | null;

      if (!res.ok || !json || json.success === false) {
        return { data: null, error: json?.message || 'Error al crear producto' };
      }

      return { data: json.producto as Producto, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async createServicio(payload: Partial<Service>): Promise<{ data: Service | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .insert(payload)
        .select('id, nombre, descripcion, precio, duracion_minutos, activo')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: (data as Service) ?? null, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateProducto(
    id: string | number,
    payload: Partial<Producto>,
  ): Promise<{ data: Producto | null; error: string | null }> {
    try {
      const url = `/api/admin/productos?id=${encodeURIComponent(String(id))}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null) as { success?: boolean; producto?: any; message?: string } | null;

      if (!res.ok || !json || json.success === false) {
        return { data: null, error: json?.message || 'Error al actualizar producto' };
      }

      return { data: json.producto as Producto, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateProductoStock(id: string | number, stock: number | null): Promise<{ error: string | null }> {
    try {
      const url = `/api/admin/productos?id=${encodeURIComponent(String(id))}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_actual: stock }),
      });
      const json = await res.json().catch(() => null) as { success?: boolean; message?: string } | null;

      if (!res.ok || !json || json.success === false) {
        return { error: json?.message || 'Error al actualizar stock' };
      }

      return { error: null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async updateServicio(id: string, payload: Partial<Service>): Promise<{ data: Service | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .update(payload)
        .eq('id', id)
        .select('id, nombre, descripcion, precio, duracion_minutos, activo')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: (data as Service) ?? null, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteServicio(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.from('servicios').delete().eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async toggleServicioStatus(id: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('activo')
        .eq('id', id)
        .single();

      if (error) {
        return { error: error.message };
      }

      const { error: updateError } = await supabase
        .from('servicios')
        .update({ activo: !data?.activo })
        .eq('id', id);

      return { error: updateError?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async searchInvitados(term: string): Promise<{ data: any[]; error: string | null }> {
    try {
      const normalized = `%${term}%`;
      const { data, error } = await supabase
        .from('invitados')
        .select('id, nombre, telefono, email')
        .or(`nombre.ilike.${normalized},telefono.ilike.${normalized}`)
        .order('nombre', { ascending: true })
        .limit(20);

      return { data: data ?? [], error: error?.message ?? null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async deleteProducto(id: string | number): Promise<{ error: string | null }> {
    try {
      const url = `/api/admin/productos?id=${encodeURIComponent(String(id))}`;
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json().catch(() => null) as { success?: boolean; message?: string } | null;

      if (!res.ok || !json || json.success === false) {
        return { error: json?.message || 'Error al eliminar producto' };
      }

      return { error: null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async toggleProductoStatus(id: string | number): Promise<{ error: string | null }> {
    try {
      // Primero obtener el estado actual desde la API admin
      const listRes = await fetch('/api/admin/productos');
      const listJson = await listRes.json().catch(() => null) as { success?: boolean; productos?: any[] } | null;
      const current = listJson?.productos?.find?.((p: any) => String(p.id) === String(id));
      const nextActivo = current ? !current.activo : true;

      const url = `/api/admin/productos?id=${encodeURIComponent(String(id))}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nextActivo }),
      });
      const json = await res.json().catch(() => null) as { success?: boolean; message?: string } | null;

      if (!res.ok || !json || json.success === false) {
        return { error: json?.message || 'Error al cambiar estado del producto' };
      }

      return { error: null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async getDashboardStats(filter: 'today' | 'week' | 'month' | 'year' = 'today'): Promise<{ data: any; error: string | null }> {
    try {
      const { start, end } = this.getDateRange(filter);

      const [ventas, gastos, citas, productos] = await Promise.all([
        supabase
          .from('ventas')
          .select('total_final, created_at')
          .gte('created_at', start)
          .lte('created_at', end),
        supabase
          .from('gastos')
          .select('monto, fecha_gasto')
          .gte('fecha_gasto', start.split('T')[0])
          .lte('fecha_gasto', end.split('T')[0]),
        supabase
          .from('citas')
          .select('id, status, fecha_hora')
          .gte('fecha_hora', start)
          .lte('fecha_hora', end),
        supabase
          .from('ventas_productos')
          .select('cantidad')
          .gte('created_at', start)
          .lte('created_at', end),
      ]);

      const ingresos = (ventas.data || []).reduce((acc, venta) => acc + Number(venta.total_final || 0), 0);
      const gastosTotales = (gastos.data || []).reduce((acc, gasto) => acc + Number(gasto.monto || 0), 0);
      const productosVendidos = (productos.data || []).reduce((acc, producto) => acc + Number(producto.cantidad || 0), 0);

      const citasData = citas.data || [];
      const citasDelDia = citasData.length;
      const citasPendientes = citasData.filter((cita) => cita.status !== 'completed').length;

      return {
        data: {
          ingresos,
          gastos: gastosTotales,
          ganancias: ingresos - gastosTotales,
          productosVendidos,
          citasDelDia,
          citasPendientes,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async getTodayAppointments(params: { onlyToday?: boolean } = {}): Promise<{ data: DashboardAppointment[]; error: string | null }> {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      let query = supabase
        .from('citas')
        .select(
          `id, cliente_nombre, fecha_hora, status, colafinal,
           servicio:servicio_id(nombre),
           barbero:barbero_id(nombre, apellido)`
        )
        .order('fecha_hora', { ascending: true });

      if (params.onlyToday !== false) {
        query = query
          .gte('fecha_hora', start.toISOString())
          .lte('fecha_hora', end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      type CitaRow = {
        id: string;
        cliente_nombre?: string | null;
        fecha_hora?: string | null;
        status?: string | null;
        colafinal?: string | null;
        servicios?: { nombre?: string | null } | null;
        barberos?: { nombre?: string | null; apellido?: string | null } | null;
      };

      const appointments = (data ?? []).map((row: CitaRow): DashboardAppointment => {
        const hora = row.fecha_hora
          ? new Date(row.fecha_hora).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '--:--';

        const barberoNombre = [row.barberos?.nombre, row.barberos?.apellido]
          .filter(Boolean)
          .join(' ')
          .trim();

        let estadoNormalizado = (row.status ?? 'pending').toString().toLowerCase();

        // Si la cita tiene un resultado final explícito en colafinal, priorizarlo
        const colafinal = (row.colafinal ?? '').toString().toLowerCase();
        if (colafinal === 'rechazada') {
          estadoNormalizado = 'cancelled';
        } else if (colafinal === 'completado') {
          estadoNormalizado = 'completed';
        }

        return {
          id: String(row.id ?? ''),
          cliente: row.cliente_nombre ?? 'Cliente',
          servicio: row.servicios?.nombre ?? 'Servicio',
          barbero: barberoNombre || 'Barbero',
          hora,
          estado: estadoNormalizado,
        };
      });

      return { data: appointments, error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getRecentSales(limit = 10): Promise<{ data: DashboardSale[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          id,
          total_final,
          created_at,
          clientes:clientes(nombre),
          citas:citas(
            fecha_hora,
            servicios:servicios(nombre)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: [], error: error.message };
      }

      type VentaRow = {
        id: number;
        total_final: number | null;
        created_at: string | null;
        clientes?: { nombre?: string | null } | null;
        citas?: { servicios?: { nombre?: string | null }[] | null } | null;
      };

      const ventas = ((data ?? []) as VentaRow[]).map((venta) => ({
        id: venta.id,
        cliente: venta.clientes?.nombre ?? 'Cliente',
        servicio: unwrapRelation<{ nombre?: string | null }>(venta.citas?.servicios)?.nombre ?? 'Servicio',
        monto: Number(venta.total_final ?? 0),
        hora: this.formatTime(venta.created_at ?? ''),
      }));

      return { data: ventas, error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getCitasByBarbero(params: {
    barberoId: string | number;
    date?: string;
  }): Promise<{ data: BarberoCita[]; error: string | null }> {
    try {
      const { barberoId, date } = params;

      if (!barberoId && barberoId !== 0) {
        return { data: [], error: 'ID de barbero no proporcionado' };
      }

      const normalizedId = typeof barberoId === 'number' ? barberoId : String(barberoId);

      let query = supabase
        .from('citas')
        .select(`
          id,
          cliente_nombre,
          fecha_hora,
          status,
          notas,
          duracion_estimada,
          precio_cobrado,
          servicio:servicio_id(nombre)
        `)
        .eq('barbero_id', normalizedId)
        .order('fecha_hora', { ascending: true });

      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        query = query
          .gte('fecha_hora', start.toISOString())
          .lt('fecha_hora', end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      type CitaRow = {
        id: string | number;
        cliente_nombre?: string | null;
        cliente_telefono?: string | null;
        fecha_hora?: string | null;
        status?: string | null;
        notas?: string | null;
        duracion_estimada?: number | null;
        precio_cobrado?: number | null;
        servicios?: { nombre?: string | null } | null;
      };

      const statusMap: Record<string, BarberoCita['estado']> = {
        pendiente: 'pendiente',
        pending: 'pendiente',
        confirmada: 'confirmada',
        confirmed: 'confirmada',
        en_proceso: 'en_proceso',
        'in_progress': 'en_proceso',
        completada: 'completada',
        completed: 'completada',
        finalizada: 'completada',
        cancelada: 'cancelada',
        cancelled: 'cancelada',
        canceled: 'cancelada'
      };

      const citas = (data ?? []).map((row: CitaRow): BarberoCita => {
        const rawStatus = (row.status ?? '').toString().trim().toLowerCase();
        const estado = statusMap[rawStatus] ?? (this.mapEstado(row.status) as BarberoCita['estado']) ?? 'pendiente';

        return {
          id: row.id,
          cliente_nombre: row.cliente_nombre ?? 'Cliente',
          cliente_telefono: row.cliente_telefono ?? null,
          fecha_hora: row.fecha_hora ?? new Date().toISOString(),
          estado,
          servicio_nombre: row.servicios?.nombre ?? 'Servicio',
          precio: row.precio_cobrado ?? null,
          notas: row.notas ?? null,
          duracion_estimada: row.duracion_estimada ?? null
        };
      });

      return { data: citas, error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async addCitaToQueue(params: {
    barberId: string | number;
    appointmentId: number;
    priority?: number;
    clienteNombre?: string | null;
    clienteTelefono?: string | null;
  }): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!params.barberId) {
        return { success: false, error: 'ID de barbero no proporcionado' };
      }

      const payload: Partial<DailyTurn> = {
        barber_id:
          typeof params.barberId === 'number'
            ? params.barberId
            : params.barberId
              ? String(params.barberId)
              : undefined,
        appointment_id: params.appointmentId,
        client_type: 'cliente',
        type: 'cita',
        status: 'en_espera',
        priority: params.priority ?? 1,
        turn_date: new Date().toISOString().split('T')[0],
        client_name: params.clienteNombre ?? undefined,
        client_phone: params.clienteTelefono ?? undefined
      };

      const { error } = await supabase.from('daily_turns').insert(payload);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error) };
    }
  }

  async getBarberoStats(barberoId: string): Promise<{
    success: boolean;
    stats: {
      ventas_hoy: number;
      ventas_semana: number;
      citas_hoy: number;
      citas_semana: number;
      citas_pendientes: number;
    };
    error?: string;
  }> {
    try {
      if (!barberoId) {
        return {
          success: false,
          stats: {
            ventas_hoy: 0,
            ventas_semana: 0,
            citas_hoy: 0,
            citas_semana: 0,
            citas_pendientes: 0
          },
          error: 'ID de barbero no proporcionado'
        };
      }

      const { start: todayStart, end: todayEnd } = this.getDateRange('today');
      const { start: weekStart, end: weekEnd } = this.getDateRange('week');

      const [ventasHoyRes, ventasSemanaRes, citasHoyRes, citasSemanaRes, citasPendientesRes] = await Promise.all([
        supabase
          .from('ventas')
          .select('total_final')
          .eq('barbero_id', barberoId)
          .gte('fecha_venta', todayStart)
          .lte('fecha_venta', todayEnd),
        supabase
          .from('ventas')
          .select('total_final')
          .eq('barbero_id', barberoId)
          .gte('fecha_venta', weekStart)
          .lte('fecha_venta', weekEnd),
        supabase
          .from('citas')
          .select('id')
          .eq('barbero_id', barberoId)
          .gte('fecha_hora', todayStart)
          .lte('fecha_hora', todayEnd),
        supabase
          .from('citas')
          .select('id')
          .eq('barbero_id', barberoId)
          .gte('fecha_hora', weekStart)
          .lte('fecha_hora', weekEnd),
        supabase
          .from('citas')
          .select('id, status')
          .eq('barbero_id', barberoId)
          .not('status', 'in', '("completed","cancelled","no_show")')
      ]);

      const sumVentas = (rows?: { total_final?: number | null }[] | null) =>
        (rows ?? []).reduce((acc, venta) => acc + Number(venta.total_final ?? 0), 0);

      const stats = {
        ventas_hoy: sumVentas(ventasHoyRes.data as { total_final?: number | null }[] | null),
        ventas_semana: sumVentas(ventasSemanaRes.data as { total_final?: number | null }[] | null),
        citas_hoy: (citasHoyRes.data ?? []).length,
        citas_semana: (citasSemanaRes.data ?? []).length,
        citas_pendientes: (citasPendientesRes.data ?? []).length
      };

      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        stats: {
          ventas_hoy: 0,
          ventas_semana: 0,
          citas_hoy: 0,
          citas_semana: 0,
          citas_pendientes: 0
        },
        error: mapSupabaseError(error)
      };
    }
  }

  async createBarbero(payload: Partial<Barber>): Promise<{ data: Barber | null; error: string | null }> {
    try {
      const sanitizedPayload: Partial<Barber> & { password?: string | null } = {
        ...payload,
        usuario: payload.usuario?.trim() || null,
        role: payload.role ? payload.role.trim().toLowerCase() : 'barbero'
      };

      if (sanitizedPayload.password && typeof sanitizedPayload.password === 'string') {
        sanitizedPayload.password = await this.hashPassword(sanitizedPayload.password);
      }

      const { data, error } = await supabase.from('barberos').insert(sanitizedPayload).select().single();
      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateBarbero(id: string, payload: Partial<Barber>): Promise<{ data: Barber | null; error: string | null }> {
    try {
      const sanitizedPayload: Partial<Barber> & { password?: string | null } = {
        ...payload,
        usuario: payload.usuario === undefined ? undefined : payload.usuario?.trim() || null,
        role: payload.role === undefined ? undefined : payload.role?.trim().toLowerCase() || 'barbero'
      };

      if (sanitizedPayload.password && typeof sanitizedPayload.password === 'string') {
        sanitizedPayload.password = await this.hashPassword(sanitizedPayload.password);
      }

      const { data, error } = await supabase.from('barberos').update(sanitizedPayload).eq('id', id).select().single();
      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteBarbero(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.from('barberos').delete().eq('id', id);
      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async toggleBarberoStatus(id: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase.from('barberos').select('activo').eq('id', id).single();
      if (error) return { error: error.message };

      const { error: updateError } = await supabase
        .from('barberos')
        .update({ activo: !data?.activo })
        .eq('id', id);

      return { error: updateError?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async getCitas({ from, to }: { from?: string; to?: string } = {}): Promise<{ data: Appointment[]; error: string | null }> {
    try {
      let query = supabase
        .from('citas')
        .select(`
          *,
          servicio:servicio_id(nombre),
          barbero:barbero_id(nombre, apellido)
        `)
        .order('fecha_hora', { ascending: true });

      if (from) {
        query = query.gte('fecha_hora', from);
      }

      if (to) {
        query = query.lte('fecha_hora', to);
      }

      const { data, error } = await query;

      return { data: (data ?? []) as Appointment[], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getCitasHistory(limit = 200): Promise<{ data: Appointment[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          servicio:servicio_id(nombre),
          barbero:barbero_id(nombre, apellido)
        `)
        .order('fecha_hora', { ascending: false })
        .limit(limit);

      return { data: (data ?? []) as Appointment[], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getCitasByDate(fecha: string): Promise<{ data: Appointment[]; error: string | null }> {
    try {
      if (!fecha) {
        return { data: [], error: 'Fecha no proporcionada' };
      }

      // Usar el string de fecha directamente para evitar problemas de zona horaria
      const start = `${fecha}T00:00:00`;
      const end = `${fecha}T23:59:59.999`;

      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          servicio:servicio_id(nombre),
          barbero:barbero_id(nombre, apellido)
        `)
        .gte('fecha_hora', start)
        .lt('fecha_hora', end)
        .order('fecha_hora', { ascending: true });

      return { data: (data ?? []) as Appointment[], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async createCita(payload: Partial<Appointment>): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('citas')
        .insert(payload)
        .select()
        .single();

      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateCita(id: string, payload: Partial<Appointment>): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('citas')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteCita(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async updateCitaStatus(
    id: string,
    status: string,
    extra: Partial<Appointment> = {}
  ): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      const updatePayload: Partial<Appointment> = {
        ...extra,
        status
      };

      const { data, error } = await supabase
        .from('citas')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          *,
          servicio:servicio_id(nombre),
          barbero:barbero_id(nombre, apellido)
        `)
        .single();

      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async getClientes(): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      return { data: data || [], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async searchClientes(term: string): Promise<{ data: any[]; error: string | null }> {
    try {
      const normalized = `%${term}%`;
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, email')
        .or(`nombre.ilike.${normalized},telefono.ilike.${normalized}`)
        .order('nombre', { ascending: true })
        .limit(20);

      return { data: data ?? [], error: error?.message ?? null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async createCliente(payload: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single();

      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateCliente(id: string, payload: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteCliente(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async getVentas(): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha_venta', { ascending: false });

      return { data: data || [], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async createVenta(data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: venta, error } = await supabase
        .from('ventas')
        .insert(data)
        .select()
        .single();

      return { data: venta, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateVenta(id: string, data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: venta, error } = await supabase
        .from('ventas')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      return { data: venta, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteVenta(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async getGastos(): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .order('fecha_gasto', { ascending: false });

      return { data: data || [], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async createGasto(data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: gasto, error } = await supabase
        .from('gastos')
        .insert(data)
        .select()
        .single();

      return { data: gasto, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateGasto(id: string, data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: gasto, error } = await supabase
        .from('gastos')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      return { data: gasto, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteGasto(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async getVentasProductos(): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ventas_productos')
        .select('*')
        .order('created_at', { ascending: false });

      return { data: data || [], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async createVentaProducto(data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: ventaProducto, error } = await supabase
        .from('ventas_productos')
        .insert(data)
        .select()
        .single();

      return { data: ventaProducto, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateVentaProducto(id: string, data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: ventaProducto, error } = await supabase
        .from('ventas_productos')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      return { data: ventaProducto, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteVentaProducto(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('ventas_productos')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  private mapDailyTurn(raw: any): DailyTurn {
    const appointment = unwrapRelation(raw.appointment);
    const barber = unwrapRelation(raw.barber);
    const service = unwrapRelation(raw.service);
    const cliente = unwrapRelation(raw.cliente);
    const invitado = unwrapRelation(raw.invitado);

    const resolveTurnDate = (): string => {
      if (raw.turn_date) return raw.turn_date;
      if (raw.created_at) return String(raw.created_at).split('T')[0];
      return new Date().toISOString().split('T')[0];
    };

    return {
      id: raw.id,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      turn_number: raw.turn_number ?? raw.turnNumber ?? raw.numero_turno ?? 0,
      appointment_id: raw.appointment_id ?? appointment?.id ?? undefined,
      client_type: raw.client_type ?? (raw.appointment_id ? 'cliente' : 'invitado'),
      cliente_id: raw.cliente_id ?? appointment?.cliente_id ?? cliente?.id ?? undefined,
      invitado_id: raw.invitado_id ?? invitado?.id ?? undefined,
      service_id: raw.service_id ?? appointment?.servicio_id ?? service?.id ?? undefined,
      barber_id: raw.barber_id ?? barber?.id ?? 0,
      type: raw.type ?? (raw.appointment_id ? 'cita' : 'sin_cita'),
      status: (raw.status ?? 'en_espera') as DailyTurn['status'],
      priority: raw.priority ?? raw.prioridad ?? undefined,
      scheduled_time: raw.scheduled_time ?? appointment?.fecha_hora ?? undefined,
      estimated_duration:
        raw.estimated_duration ??
        appointment?.estimated_duration ??
        appointment?.duracion ??
        service?.duracion_minutos ??
        undefined,
      start_time: raw.start_time ?? undefined,
      end_time: raw.end_time ?? undefined,
      called_at: raw.called_at ?? undefined,
      actual_duration: raw.actual_duration ?? undefined,
      notes: raw.notes ?? appointment?.notas ?? undefined,
      turn_date: resolveTurnDate(),
      line_options: raw.line_options ?? undefined,
      descuento_aplicado: raw.descuento_aplicado ?? undefined,
      tipo_descuento: raw.tipo_descuento ?? undefined,
      barber: barber ?? undefined,
      service: service ?? undefined,
      appointment: appointment ?? undefined,
      cliente: cliente ?? undefined,
      invitado: invitado ?? undefined,
      client_name:
        raw.client_name ??
        cliente?.nombre ??
        invitado?.nombre ??
        appointment?.cliente_nombre ??
        undefined,
      client_phone:
        raw.client_phone ??
        cliente?.telefono ??
        invitado?.telefono ??
        appointment?.cliente_telefono ??
        undefined,
      client_email:
        raw.client_email ??
        cliente?.email ??
        invitado?.email ??
        appointment?.cliente_email ??
        undefined,
      estimated_wait_time: raw.estimated_wait_time ?? undefined,
      status_text: raw.status_text ?? undefined,
      service_name: raw.service_name ?? service?.nombre ?? undefined,
      service_price: raw.service_price ?? service?.precio ?? undefined,
      service_duration: raw.service_duration ?? service?.duracion_minutos ?? undefined,
      price_estimate: raw.price_estimate ?? undefined,
    };
  }

  async getDailyTurns(params: {
    barberId?: string | number;
    date?: string;
    status?: DailyTurn['status'];
    limit?: number;
  } = {}): Promise<{ data: DailyTurn[]; error: string | null }> {
    try {
      let query = supabase
        .from('daily_turns')
        .select(DAILY_TURN_SELECT)
        .order('priority', { ascending: true, nullsFirst: true })
        .order('turn_number', { ascending: true });

      if (params.barberId !== undefined) {
        const barberId = typeof params.barberId === 'string'
          ? Number(params.barberId) || params.barberId
          : params.barberId;
        query = query.eq('barber_id', barberId);
      }

      if (params.date) {
        query = query.eq('turn_date', params.date);
      }

      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.limit !== undefined) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data ?? []).map((row) => this.mapDailyTurn(row)), error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getBarberQueueData(params: {
    barberId: number | string;
    date?: string;
  }): Promise<{ data: { pendingAppointments: Appointment[]; activeTurns: DailyTurn[] } | null; error: string | null }> {
    try {
      const { startISO, endISO, dateISO } = this.getDateRangeForDay(params.date);
      const barberId = typeof params.barberId === 'string'
        ? Number(params.barberId) || params.barberId
        : params.barberId;

      const pendingStatusFilters = ['pending', 'confirmed', 'pendiente', 'confirmada'];

      const { data: citas, error: citasError } = await supabase
        .from('citas')
        .select(`
          *,
          servicios:servicio_id(
            id,
            nombre,
            duracion_minutos,
            precio
          )
        `)
        .eq('barbero_id', barberId)
        .gte('fecha_hora', startISO)
        .lt('fecha_hora', endISO)
        .in('status', pendingStatusFilters)
        .order('fecha_hora', { ascending: true });

      if (citasError) {
        return { data: null, error: citasError.message };
      }

      const { data: turns, error: turnsError } = await supabase
        .from('daily_turns')
        .select(DAILY_TURN_SELECT)
        .eq('barber_id', barberId)
        .eq('turn_date', dateISO)
        .not('status', 'in', '("completed","completado","cancelled","cancelado","no_show")')
        .order('priority', { ascending: true, nullsFirst: true })
        .order('turn_number', { ascending: true });

      if (turnsError) {
        return { data: null, error: turnsError.message };
      }

      return {
        data: {
          pendingAppointments: (citas ?? []) as Appointment[],
          activeTurns: (turns ?? []).map((row) => this.mapDailyTurn(row)),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async getDailyTurnById(id: string | number): Promise<{ data: DailyTurn | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('daily_turns')
        .select(DAILY_TURN_SELECT)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data ? this.mapDailyTurn(data) : null, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async createDailyTurn(payload: Partial<DailyTurn>): Promise<{ data: DailyTurn | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('daily_turns')
        .insert(payload)
        .select(DAILY_TURN_SELECT)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data ? this.mapDailyTurn(data) : null, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateDailyTurn(
    id: string | number,
    payload: Partial<DailyTurn>,
  ): Promise<{ data: DailyTurn | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('daily_turns')
        .update(payload)
        .eq('id', id)
        .select(DAILY_TURN_SELECT)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data ? this.mapDailyTurn(data) : null, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateDailyTurnStatus(
    id: string | number,
    status: DailyTurn['status'],
    extra: Partial<DailyTurn> = {},
  ): Promise<{ data: DailyTurn | null; error: string | null }> {
    return this.updateDailyTurn(id, { status, ...extra });
  }

  async deleteDailyTurn(id: string | number): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('daily_turns')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async linkTurnToAppointment(
    turnId: string | number,
    appointmentId: number,
  ): Promise<{ data: DailyTurn | null; error: string | null }> {
    return this.updateDailyTurn(turnId, { appointment_id: appointmentId, type: 'cita' });
  }

  async checkClientInQueue(params: {
    barberId: number;
    clientType: 'cliente' | 'invitado';
    clientId?: number | null;
    invitadoId?: number | null;
  }): Promise<{ data: { in_queue: boolean; turn?: DailyTurn } | null; error: string | null }> {
    try {
      let query = supabase
        .from('daily_turns')
        .select(DAILY_TURN_SELECT)
        .eq('barber_id', params.barberId)
        .eq('turn_date', new Date().toISOString().split('T')[0])
        .not('status', 'in', '("completado","cancelado","no_show")')
        .limit(1);

      if (params.clientType === 'cliente') {
        if (!params.clientId) {
          return { data: { in_queue: false }, error: null };
        }
        query = query.eq('cliente_id', params.clientId);
      } else {
        const invitadoId = params.invitadoId ?? params.clientId;
        if (!invitadoId) {
          return { data: { in_queue: false }, error: null };
        }
        query = query.eq('invitado_id', invitadoId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        return { data: null, error: error.message };
      }

      if (!data) {
        return { data: { in_queue: false }, error: null };
      }

      return { data: { in_queue: true, turn: this.mapDailyTurn(data) }, error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async getHistorial(): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('historial_admin')
        .select('*')
        .order('created_at', { ascending: false });

      return { data: data || [], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getOrdenes(): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ordenes')
        .select(`
          *,
          clientes:clientes(*),
          barberos:barberos(*),
          servicios:servicios(*),
          productos:productos(*)
        `)
        .order('created_at', { ascending: false });

      return { data: data || [], error: error?.message || null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async getOrden(id: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ordenes')
        .select(`
          *,
          clientes:clientes(*),
          barberos:barberos(*),
          servicios:servicios(*),
          productos:productos(*)
        `)
        .eq('id', id)
        .single();

      return { data, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async createOrden(data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: orden, error } = await supabase
        .from('ordenes')
        .insert(data)
        .select()
        .single();

      return { data: orden, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateOrden(id: string, data: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: orden, error } = await supabase
        .from('ordenes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      return { data: orden, error: error?.message || null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteOrden(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  private toGaleriaPublicUrl(path: string): string {
    if (!path) {
      return '';
    }

    if (/^data:/i.test(path) || /^blob:/i.test(path)) {
      return path;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const baseUrl = (typeof window !== 'undefined' && (window as typeof window & { PUBLIC_SUPABASE_URL?: string }).PUBLIC_SUPABASE_URL)
      || import.meta.env.PUBLIC_SUPABASE_URL
      || process.env.PUBLIC_SUPABASE_URL
      || '';

    if (!baseUrl) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/storage/v1/object/public/galeria/${normalizedPath}`;
  }

  async uploadGaleriaImages(files: File[], tipo: GaleriaItemTipo): Promise<{ data: string[]; error: string | null }> {
    if (!files || files.length === 0) {
      return { data: [], error: null };
    }

    try {
      const bucket = supabase.storage.from('galeria');
      const tipoNormalizado = normalizeGaleriaItemTipo(tipo);

      const uploads = await Promise.all(
        files.map(async (file) => {
          const extension = (file.name?.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
          const uniqueId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          const storagePath = `${tipoNormalizado}/${uniqueId}.${extension}`;

          const { error: uploadError } = await bucket.upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'image/*',
          });

          if (uploadError) {
            if (uploadError.message?.toLowerCase().includes('bucket not found')) {
              throw new Error('GALERIA_BUCKET_NOT_FOUND');
            }
            throw uploadError;
          }

          const { data: publicData } = bucket.getPublicUrl(storagePath);
          return publicData?.publicUrl ?? this.toGaleriaPublicUrl(storagePath);
        })
      );

      return { data: uploads, error: null };
    } catch (error) {
      if (error instanceof Error && error.message === 'GALERIA_BUCKET_NOT_FOUND') {
        return { data: [], error: 'GALERIA_BUCKET_NOT_FOUND' };
      }
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  private mapGaleriaItem(row: Record<string, unknown>): GaleriaItem {
    const ensureStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string');
      }
      return [];
    };

    return {
      id: String(row.id ?? ''),
      tipo: (row.tipo as GaleriaItemTipo) ?? 'gorra',
      nombre: (row.nombre as string) ?? 'Item',
      descripcion: typeof row.descripcion === 'string' ? row.descripcion : null,
      precio: Number(row.precio ?? 0),
      imagenes: ensureStringArray(row.imagenes).map((imagen) => this.toGaleriaPublicUrl(imagen)),
      colores: ensureStringArray(row.colores ?? []),
      sabores: ensureStringArray(row.sabores ?? []),
      nicotina_mg: typeof row.nicotina_mg === 'number' ? row.nicotina_mg : null,
      stock: typeof row.stock === 'number' ? row.stock : null,
      tags: ensureStringArray(row.tags),
      destacado: Boolean(row.destacado),
      activo: row.activo === undefined ? true : Boolean(row.activo),
      metadata: (row.metadata as Record<string, unknown>) ?? null,
      created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
    };
  }

  async getGaleriaItems(tipo: GaleriaItemTipo): Promise<{ data: GaleriaItem[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('galeria_items')
        .select('*')
        .eq('tipo', normalizeGaleriaItemTipo(tipo))
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      const mapped = (data ?? []).map((row) => this.mapGaleriaItem(row as Record<string, unknown>)).filter((item) => item.id);
      return { data: mapped, error: null };
    } catch (error) {
      return { data: [], error: mapSupabaseError(error) };
    }
  }

  async createGaleriaItem(tipo: GaleriaItemTipo, payload: GaleriaItemPayload): Promise<{ data: GaleriaItem | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('galeria_items')
        .insert({
          tipo: normalizeGaleriaItemTipo(tipo),
          nombre: payload.nombre,
          descripcion: payload.descripcion ?? null,
          precio: payload.precio ?? 0,
          imagenes: payload.imagenes ?? [],
          colores: tipo === 'gorra' ? payload.colores ?? [] : null,
          sabores: tipo === 'vape' ? payload.sabores ?? [] : null,
          nicotina_mg: tipo === 'vape' ? payload.nicotina_mg ?? null : null,
          stock: tipo === 'vape' ? payload.stock ?? 0 : null,
          tags: payload.tags ?? [],
          destacado: payload.destacado ?? false,
          activo: payload.activo ?? true,
          metadata: payload.metadata ?? null,
        })
        .select('*')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: this.mapGaleriaItem(data as Record<string, unknown>), error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async updateGaleriaItem(id: string, payload: GaleriaItemPayload): Promise<{ data: GaleriaItem | null; error: string | null }> {
    try {
      const updates: Record<string, unknown> = {};

      if (payload.nombre !== undefined) {
        updates.nombre = payload.nombre;
      }

      if (payload.descripcion !== undefined) {
        updates.descripcion = payload.descripcion ?? null;
      }

      if (payload.precio !== undefined) {
        updates.precio = payload.precio ?? 0;
      }

      if (payload.imagenes !== undefined) {
        updates.imagenes = payload.imagenes ?? [];
      }

      if (payload.tags !== undefined) {
        updates.tags = payload.tags ?? [];
      }

      if (payload.destacado !== undefined) {
        updates.destacado = payload.destacado;
      }

      if (payload.activo !== undefined) {
        updates.activo = payload.activo;
      }

      if (payload.metadata !== undefined) {
        updates.metadata = payload.metadata ?? null;
      }

      if (payload.colores !== undefined) {
        updates.colores = payload.colores;
      }

      if (payload.sabores !== undefined) {
        updates.sabores = payload.sabores;
      }

      if (payload.nicotina_mg !== undefined) {
        updates.nicotina_mg = payload.nicotina_mg;
      }

      if (payload.stock !== undefined) {
        updates.stock = payload.stock;
      }

      const { data, error } = await supabase
        .from('galeria_items')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: this.mapGaleriaItem(data as Record<string, unknown>), error: null };
    } catch (error) {
      return { data: null, error: mapSupabaseError(error) };
    }
  }

  async deleteGaleriaItem(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('galeria_items')
        .delete()
        .eq('id', id);

      return { error: error?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  async toggleGaleriaItemStatus(id: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('galeria_items')
        .select('activo')
        .eq('id', id)
        .single();

      if (error) {
        return { error: error.message };
      }

      const { error: updateError } = await supabase
        .from('galeria_items')
        .update({ activo: !data?.activo })
        .eq('id', id);

      return { error: updateError?.message || null };
    } catch (error) {
      return { error: mapSupabaseError(error) };
    }
  }

  // Client methods
  async getClientePanel(clienteId: string): Promise<{ data: any; error: string | null }> {
    try {
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteError) {
        return { data: null, error: clienteError.message };
      }

      const { data: citas, error: citasError } = await supabase
        .from('citas')
        .select(`
          *,
          servicio:servicio_id(nombre),
          barbero:barbero_id(nombre, apellido)
        `)
        .eq('cliente_id', clienteId)
        .order('fecha_hora', { ascending: false })
        .limit(10);

      if (citasError) {
        return { data: null, error: citasError.message };
      }

      return { 
        data: { 
          cliente, 
          citas: citas || [] 
        }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async agendarCita(data: { barbero_id: string; servicio_id: string; fecha_hora: string; notas?: string }): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      // Obtener el usuario autenticado de Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { data: null, error: 'Usuario no autenticado' };
      }

      const appointmentData: Partial<Appointment> = {
        ...data,
        barbero_id: Number(data.barbero_id),
        servicio_id: data.servicio_id ? Number(data.servicio_id) : undefined,
        cliente_id: user.id,
        cliente_nombre: user.email || 'Cliente',
        estado: 'pendiente',
        fecha_hora: data.fecha_hora,
        notas: data.notas,
      };

      return await this.createCita(appointmentData);
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Real-time subscriptions
  subscribeToAppointments(callback: (payload: any) => void) {
    return supabase
      .channel('appointments-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'citas' },
        callback
      )
      .subscribe();
  }

  subscribeToQueue(callback: (payload: any) => void) {
    return supabase
      .channel('queue-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'daily_turns' },
        callback
      )
      .subscribe();
  }

  subscribeToBarberQueue(barberId: number | string, callback: (payload: any) => void): RealtimeChannel {
    const filterValue = typeof barberId === 'string' ? barberId : String(barberId);

    return supabase
      .channel(`barber-queue-${filterValue}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_turns', filter: `barber_id=eq.${filterValue}` },
        callback
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas', filter: `barbero_id=eq.${filterValue}` },
        callback
      )
      .subscribe();
  }

  subscribeToDashboard(callback: (payload: any) => void) {
    const channel = supabase
      .channel('dashboard-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_productos' }, callback)
      .subscribe();

    return channel;
  }

  subscribeToBarberos(callback: (payload: any) => void) {
    const channel = supabase
      .channel('barberos-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barberos' }, callback)
      .subscribe();

    return channel;
  }

  async loginAdmin(credentials: { email: string; password: string }) {
    try {
      const email = credentials.email?.trim();
      const password = credentials.password?.trim() ?? '';

      if (!email || !password) {
        return {
          success: false,
          session: null,
          user: null,
          error: 'Email y contraseña son obligatorios'
        };
      }

      // Buscar admin en la tabla usuarios
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nombre, password, role, activo')
        .eq('email', email)
        .in('role', ['admin', 'super_admin', 'administrador'])
        .maybeSingle();

      if (error) {
        return {
          success: false,
          session: null,
          user: null,
          error: error.message
        };
      }

      if (!data) {
        return {
          success: false,
          session: null,
          user: null,
          error: 'Credenciales incorrectas'
        };
      }

      if (data.activo === false) {
        return {
          success: false,
          session: null,
          user: null,
          error: 'Tu cuenta está inactiva. Contacta al administrador.'
        };
      }

      if (!data.password) {
        return {
          success: false,
          session: null,
          user: null,
          error: 'La cuenta no tiene una contraseña válida configurada'
        };
      }

      // Verificar contraseña con bcrypt
      const passwordMatches = await bcrypt.compare(password, data.password);

      if (!passwordMatches) {
        return {
          success: false,
          session: null,
          user: null,
          error: 'Credenciales incorrectas'
        };
      }

      // Generar token de sesión
      const session = this.generateBarberoSessionToken();

      const user = {
        id: data.id,
        email: data.email,
        nombre: data.nombre ?? '',
        role: 'admin' as const
      };

      return {
        success: true,
        session,
        user
      };
    } catch (error) {
      return {
        success: false,
        session: null,
        user: null,
        error: mapSupabaseError(error)
      };
    }
  }

  async loginBarbero(credentials: { usuario: string; password: string }) {
    try {
      const usuario = credentials.usuario?.trim();
      const password = credentials.password?.trim() ?? '';

      console.log('🔍 [loginBarbero] Intentando login con:', { usuario, passwordLength: password.length });

      if (!usuario || !password) {
        console.error('❌ [loginBarbero] Credenciales vacías');
        return {
          success: false,
          session: null,
          user: null,
          error: 'Usuario y contraseña son obligatorios'
        };
      }

      const { data, error } = await supabase
        .from('barberos')
        .select('id, nombre, apellido, email, telefono, usuario, password, activo')
        .ilike('usuario', usuario)
        .maybeSingle();

      console.log('🔍 [loginBarbero] Resultado de búsqueda:', { found: !!data, error: error?.message });

      if (error) {
        console.error('❌ [loginBarbero] Error en query:', error);
        return {
          success: false,
          session: null,
          user: null,
          error: error.message
        };
      }

      if (!data) {
        console.error('❌ [loginBarbero] Usuario no encontrado:', usuario);
        return {
          success: false,
          session: null,
          user: null,
          error: 'Credenciales incorrectas'
        };
      }

      const barbero = data as BarberoAuthRow;

      if (barbero.activo === false) {
        return {
          success: false,
          session: null,
          user: null,
          error: 'Tu cuenta está inactiva. Contacta al administrador.'
        };
      }

      if (!barbero.password) {
        return {
          success: false,
          session: null,
          user: null,
          error: 'La cuenta no tiene una contraseña válida configurada'
        };
      }

      console.log('🔍 [loginBarbero] Verificando contraseña...');
      const passwordMatches = await bcrypt.compare(password, barbero.password);
      console.log('🔍 [loginBarbero] Contraseña coincide:', passwordMatches);

      if (!passwordMatches) {
        console.error('❌ [loginBarbero] Contraseña incorrecta');
        return {
          success: false,
          session: null,
          user: null,
          error: 'Credenciales incorrectas'
        };
      }

      const session = this.generateBarberoSessionToken();

      const user = {
        id: barbero.id,
        nombre: barbero.nombre ?? '',
        apellido: barbero.apellido ?? '',
        email: barbero.email ?? null,
        telefono: barbero.telefono ?? null,
        usuario: barbero.usuario ?? usuario,
        role: 'barbero' as const
      };

      return {
        success: true,
        session,
        user
      };
    } catch (error) {
      return {
        success: false,
        session: null,
        user: null,
        error: mapSupabaseError(error)
      };
    }
  }

  async loginCliente(credentials: { email: string; password: string }) {
    return this.loginWithRole(credentials, 'cliente');
  }

  async logout(): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase.auth.signOut();
    return { success: !error, error: error?.message ?? null };
  }
}

export const supabaseService = new SupabaseService();