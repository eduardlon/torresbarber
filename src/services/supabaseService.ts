import { supabase } from '../lib/supabase';

export interface LoginResponse {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

export interface Appointment {
  id?: string;
  cliente_nombre: string;
  cliente_id?: string;
  invitado_id?: string;
  fecha_hora: string;
  servicio_id: string;
  barbero_id: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  clientes?: any;
  servicios?: any;
  barberos?: any;
}

export interface Turn {
  id?: string;
  turn_number: number;
  turn_date: string;
  client_id?: string;
  guest_name?: string;
  service_id: string;
  barber_id?: string;
  status?: string;
  called_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  clientes?: any;
  servicios?: any;
  barberos?: any;
}

export interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  duracion_minutos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  experiencia_anos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  fecha_nacimiento?: string;
  direccion?: string;
  cortes_realizados: number;
  cortes_gratis_disponibles: number;
  puntos_experiencia: number;
  nivel_actual: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

class SupabaseService {
  // Authentication methods
  async loginCliente(credentials: { email: string; password: string }): Promise<LoginResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Get client data
      const { data: clientData, error: clientError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      if (clientError) {
        return { success: false, error: 'Cliente no encontrado' };
      }

      return { 
        success: true, 
        user: { ...data.user, clientData },
        session: data.session 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async loginBarbero(credentials: { email: string; password: string }): Promise<LoginResponse> {
    try {
      // Autenticar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Verificar que el usuario existe en la tabla barberos
      const { data: barberoData, error: barberoError } = await supabase
        .from('barberos')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      if (barberoError || !barberoData) {
        await supabase.auth.signOut();
        return { success: false, error: 'No tienes permisos de barbero' };
      }

      // Verificar que el barbero esté activo
      if (!barberoData.activo) {
        await supabase.auth.signOut();
        return { success: false, error: 'Tu cuenta de barbero está inactiva' };
      }

      return {
        success: true,
        user: { ...data.user, ...barberoData },
        session: data.session
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async loginAdmin(credentials: { email: string; password: string }): Promise<LoginResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Verify admin role
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', data.user?.id)
        .single();

      const allowedRoles = ['admin', 'super_admin'];

      if (userError || !userData || !allowedRoles.includes(userData.role)) {
        await supabase.auth.signOut();
        return { success: false, error: 'No tienes permisos de administrador' };
      }

      return { 
        success: true, 
        user: data.user,
        session: data.session 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  // Barber methods
  async getBarberos(): Promise<{ data: Barber[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('barberos')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      return { data: data || [], error: error?.message || null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async getBarbero(id: string): Promise<{ data: Barber | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('barberos')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error: error?.message || null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Service methods
  async getServicios(): Promise<{ data: Service[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      return { data: data || [], error: error?.message || null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async getServicio(id: string): Promise<{ data: Service | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error: error?.message || null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Appointment methods
  async getCitas(filters?: { barbero_id?: string; fecha?: string }): Promise<{ data: Appointment[]; error: string | null }> {
    try {
      let query = supabase
        .from('citas')
        .select(`
          *,
          clientes(*),
          servicios(*),
          barberos(*)
        `)
        .order('fecha_hora', { ascending: true });

      if (filters?.barbero_id) {
        query = query.eq('barbero_id', filters.barbero_id);
      }

      if (filters?.fecha) {
        query = query.gte('fecha_hora', filters.fecha).lt('fecha_hora', filters.fecha + 'T23:59:59');
      } else {
        // Default to today and future appointments
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('fecha_hora', today);
      }

      const { data, error } = await query;

      return { data: data || [], error: error?.message || null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async getCita(id: string): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          clientes(*),
          servicios(*),
          barberos(*)
        `)
        .eq('id', id)
        .single();

      return { data, error: error?.message || null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async crearCita(data: Omit<Appointment, 'id'>): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      const { data: appointment, error } = await supabase
        .from('citas')
        .insert(data)
        .select()
        .single();

      return { data: appointment, error: error?.message || null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async actualizarCita(id: string, data: Partial<Appointment>): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      const { data: appointment, error } = await supabase
        .from('citas')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      return { data: appointment, error: error?.message || null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async cancelarCita(id: string): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      const { data: appointment, error } = await supabase
        .from('citas')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      return { data: appointment, error: error?.message || null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Queue methods
  async getColaPublica(): Promise<{ data: Turn[]; error: string | null }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_turns')
        .select(`
          *,
          clientes(*),
          servicios(*),
          barberos(*)
        `)
        .eq('turn_date', today)
        .order('turn_number', { ascending: true });

      return { data: data || [], error: error?.message || null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  async crearTurno(data: { cliente_nombre: string; cliente_telefono: string; cliente_email?: string; barbero_id: string; servicio_id?: string }): Promise<{ data: Turn | null; error: string | null }> {
    try {
      const { data: turn, error } = await supabase
        .from('daily_turns')
        .insert(data)
        .select()
        .single();

      return { data: turn, error: error?.message || null };
    } catch (error: any) {
      return { data: null, error: error.message };
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
          servicios(*),
          barberos(*)
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

      const appointmentData = {
        ...data,
        cliente_id: user.id,
        cliente_nombre: user.email || 'Cliente',
        status: 'scheduled'
      };

      return await this.crearCita(appointmentData);
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
}

export const supabaseService = new SupabaseService();