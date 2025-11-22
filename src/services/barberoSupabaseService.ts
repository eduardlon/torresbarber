// Servicio para operaciones del barbero usando Supabase directamente
import { supabase } from '../db/supabase.js';

// Obtener estadísticas del barbero
export const getBarberoStats = async (barberoId: string | number) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Ventas del día
    const { data: ventasHoy } = await supabase
      .from('ventas')
      .select('total')
      .eq('barbero_id', barberoId)
      .gte('created_at', hoy.toISOString());

    // Ventas de la semana
    const { data: ventasSemana } = await supabase
      .from('ventas')
      .select('total')
      .eq('barbero_id', barberoId)
      .gte('created_at', inicioSemana.toISOString());

    // Ventas del mes
    const { data: ventasMes } = await supabase
      .from('ventas')
      .select('total')
      .eq('barbero_id', barberoId)
      .gte('created_at', inicioMes.toISOString());

    // Citas del día
    const { data: citasHoy } = await supabase
      .from('citas')
      .select('id')
      .eq('barbero_id', barberoId)
      .gte('fecha_hora', hoy.toISOString());

    // Citas pendientes
    const { data: citasPendientes } = await supabase
      .from('citas')
      .select('id')
      .eq('barbero_id', barberoId)
      .in('status', ['pending', 'scheduled', 'confirmed'])
      .eq('aceptada_por_barbero', false);

    return {
      success: true,
      stats: {
        ganancias_dia: ventasHoy?.reduce((sum, v) => sum + (v.total || 0), 0) || 0,
        ganancias_semana: ventasSemana?.reduce((sum, v) => sum + (v.total || 0), 0) || 0,
        ganancias_mes: ventasMes?.reduce((sum, v) => sum + (v.total || 0), 0) || 0,
        citas_dia: citasHoy?.length || 0,
        citas_pendientes: citasPendientes?.length || 0,
        ventas_dia: ventasHoy?.length || 0,
        ventas_semana: ventasSemana?.length || 0,
        ventas_mes: ventasMes?.length || 0
      }
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      success: false,
      error: 'Error al cargar estadísticas',
      stats: {
        ganancias_dia: 0,
        ganancias_semana: 0,
        ganancias_mes: 0,
        citas_dia: 0,
        citas_pendientes: 0,
        ventas_dia: 0,
        ventas_semana: 0,
        ventas_mes: 0
      }
    };
  }
};

// Obtener servicios
export const getServicios = async () => {
  try {
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return {
      success: true,
      servicios: data || []
    };
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    return {
      success: false,
      error: 'Error al cargar servicios',
      servicios: []
    };
  }
};

// Obtener productos
export const getProductos = async () => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return {
      success: true,
      productos: data || []
    };
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return {
      success: false,
      error: 'Error al cargar productos',
      productos: []
    };
  }
};

// Obtener ventas del barbero
export const getVentas = async (barberoId: string | number) => {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        cliente:cliente_id (
          nombre,
          apellido,
          telefono
        )
      `)
      .eq('barbero_id', barberoId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return {
      success: true,
      ventas: data || []
    };
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return {
      success: false,
      error: 'Error al cargar ventas',
      ventas: []
    };
  }
};

// Crear nueva venta
export const createVenta = async (ventaData: any) => {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .insert([ventaData])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      venta: data
    };
  } catch (error) {
    console.error('Error al crear venta:', error);
    return {
      success: false,
      error: 'Error al registrar la venta'
    };
  }
};

// Obtener citas del barbero
export const getCitas = async (barberoId: string | number) => {
  try {
    const { data, error } = await supabase
      .from('citas')
      .select(`
        *,
        servicio:servicio_id (
          nombre,
          duracion_minutos,
          precio
        )
      `)
      .eq('barbero_id', barberoId)
      .order('fecha_hora', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      citas: data || []
    };
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return {
      success: false,
      error: 'Error al cargar citas',
      citas: []
    };
  }
};
