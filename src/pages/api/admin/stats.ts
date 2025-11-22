import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ url }) => {
  try {
    const periodo = url.searchParams.get('periodo') || 'today'; // today, week, month, year
    
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    
    // Calcular rango de fechas según el período
    switch (periodo) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // Obtener todas las ventas del período
    const { data: ventas, error: ventasError } = await supabaseAdmin
      .from('ventas')
      .select('total_final, descuento, created_at, barbero_id, estado')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (ventasError) {
      console.error('Error obteniendo ventas:', ventasError);
    }

    // Filtrar solo ventas completadas
    const ventasCompletadas = (ventas || []).filter(v => 
      !v.estado || v.estado === 'completed'
    );

    // Calcular ingresos totales
    const ingresosTotales = ventasCompletadas.reduce((sum, v) => 
      sum + (Number(v.total_final) || 0), 0
    );

    // Calcular descuentos totales
    const descuentosTotales = ventasCompletadas.reduce((sum, v) => 
      sum + (Number(v.descuento) || 0), 0
    );

    // Obtener items de venta para contar productos vendidos
    const { data: itemsVenta } = await supabaseAdmin
      .from('items_venta')
      .select('cantidad, tipo, venta_id, ventas!inner(created_at)')
      .gte('ventas.created_at', startDate.toISOString())
      .lte('ventas.created_at', endDate.toISOString());

    const productosVendidos = (itemsVenta || [])
      .filter(item => item.tipo === 'producto')
      .reduce((sum, item) => sum + (item.cantidad || 0), 0);

    // Obtener citas del período
    const { data: citas } = await supabaseAdmin
      .from('citas')
      .select('id, status, colafinal, fecha_hora')
      .gte('fecha_hora', startDate.toISOString())
      .lte('fecha_hora', endDate.toISOString());

    const totalCitas = citas?.length || 0;
    const citasCompletadas = (citas || []).filter(c => c.colafinal === 'completado').length;
    const citasCanceladas = (citas || []).filter(c => c.colafinal === 'rechazada').length;
    
    // Citas pendientes (todas las futuras sin colafinal)
    const { data: citasPendientes } = await supabaseAdmin
      .from('citas')
      .select('id')
      .gte('fecha_hora', now.toISOString())
      .is('colafinal', null);

    // Obtener estadísticas por barbero
    const { data: barberos } = await supabaseAdmin
      .from('barberos')
      .select('id, nombre, apellido, activo')
      .eq('activo', true);

    // Obtener todos los pagos a barberos (gastos con categoria 'barber_payment')
    const { data: gastosBarberos } = await supabaseAdmin
      .from('gastos')
      .select('barbero_id, fecha_gasto, categoria')
      .eq('categoria', 'barber_payment');

    const ultimoPagoPorBarbero: Record<string, string> = {};
    (gastosBarberos || []).forEach((row: any) => {
      if (!row.barbero_id || !row.fecha_gasto) return;
      const key = String(row.barbero_id);
      const fecha = String(row.fecha_gasto);
      if (!ultimoPagoPorBarbero[key] || fecha > ultimoPagoPorBarbero[key]) {
        ultimoPagoPorBarbero[key] = fecha;
      }
    });

    const barberosStats = await Promise.all(
      (barberos || []).map(async (barbero) => {
        const ventasBarbero = ventasCompletadas.filter(v => v.barbero_id === barbero.id);
        const gananciasBarbero = ventasBarbero.reduce((sum, v) => 
          sum + (Number(v.total_final) || 0), 0
        );

        const { data: citasBarbero } = await supabaseAdmin
          .from('citas')
          .select('id, colafinal')
          .eq('barbero_id', barbero.id)
          .gte('fecha_hora', startDate.toISOString())
          .lte('fecha_hora', endDate.toISOString());

        const ultimoPago = ultimoPagoPorBarbero[barbero.id] ?? null;

        return {
          id: barbero.id,
          nombre: `${barbero.nombre} ${barbero.apellido || ''}`.trim(),
          ganancias: gananciasBarbero,
          citas: citasBarbero?.length || 0,
          citasCompletadas: (citasBarbero || []).filter(c => c.colafinal === 'completado').length,
          ultimoPago,
        };
      })
    );

    // Ordenar barberos por ganancias
    barberosStats.sort((a, b) => b.ganancias - a.ganancias);

    // Calcular ganancias netas (sin gastos aún)
    const gananciasNetas = ingresosTotales;

    // Obtener servicios más vendidos
    const { data: serviciosMasVendidos } = await supabaseAdmin
      .from('items_venta')
      .select(`
        nombre,
        cantidad,
        subtotal,
        venta:ventas!items_venta_venta_id_fkey!inner(created_at, barbero_id)
      `)
      .eq('tipo', 'servicio')
      .gte('venta.created_at', startDate.toISOString())
      .lte('venta.created_at', endDate.toISOString());

    // Agrupar servicios
    const serviciosMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
    (serviciosMasVendidos || []).forEach((item: any) => {
      const existing = serviciosMap.get(item.nombre) || { nombre: item.nombre, cantidad: 0, total: 0 };
      existing.cantidad += item.cantidad || 1;
      existing.total += item.subtotal || 0;
      serviciosMap.set(item.nombre, existing);
    });

    const topServicios = Array.from(serviciosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    return jsonResponse({
      success: true,
      stats: {
        ingresos: ingresosTotales,
        gastos: 0, // Por implementar
        ganancias: gananciasNetas,
        descuentos: descuentosTotales,
        productosVendidos,
        citasDelDia: periodo === 'today' ? totalCitas : 0,
        citasDelPeriodo: totalCitas,
        citasTotales: totalCitas,
        citasCompletadas,
        citasCanceladas,
        citasPendientes: citasPendientes?.length || 0,
        ventasTotales: ventasCompletadas.length,
        promedioVenta: ventasCompletadas.length > 0 ? 
          Math.round(ingresosTotales / ventasCompletadas.length) : 0,
        barberosActivos: barberos?.length || 0,
        barberosStats,
        topBarberos: barberosStats.slice(0, 5),
        topServicios,
      },
      periodo,
    });
  } catch (error) {
    console.error('[api/admin/stats] Error:', error);
    return jsonResponse(
      { success: false, message: (error as Error).message },
      500
    );
  }
};
