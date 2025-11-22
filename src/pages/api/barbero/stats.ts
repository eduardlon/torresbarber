import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../lib/barberoAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const getRange = (type: 'day' | 'week' | 'month') => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (type === 'week') {
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
  }

  if (type === 'month') {
    start.setDate(1);
  }

  const end = new Date(start);
  if (type === 'day') {
    end.setDate(end.getDate() + 1);
  } else if (type === 'week') {
    end.setDate(end.getDate() + 7);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  return { start: start.toISOString(), end: end.toISOString() };
};

const sumVentas = (rows?: { total_final?: number | null }[] | null) =>
  (rows ?? []).reduce((acc, venta) => acc + Number(venta.total_final ?? 0), 0);

const countRows = (rows?: unknown[] | null) => rows?.length ?? 0;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const session = await requireBarberoSession(cookies);
    const barberoId = session.barbero.id;

    const dayRange = getRange('day');
    const weekRange = getRange('week');
    const monthRange = getRange('month');

    const [
      ventasDiaRes,
      ventasSemanaRes,
      ventasMesRes,
      citasDiaRes,
      citasSemanaRes,
      citasMesRes,
      citasPendientesRes,
      itemsVentaMesRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('ventas')
        .select('total_final')
        .eq('barbero_id', barberoId)
        .gte('created_at', dayRange.start)
        .lt('created_at', dayRange.end),
      supabaseAdmin
        .from('ventas')
        .select('total_final')
        .eq('barbero_id', barberoId)
        .gte('created_at', weekRange.start)
        .lt('created_at', weekRange.end),
      supabaseAdmin
        .from('ventas')
        .select('total_final')
        .eq('barbero_id', barberoId)
        .gte('created_at', monthRange.start)
        .lt('created_at', monthRange.end),
      supabaseAdmin
        .from('citas')
        .select('id, colafinal, fecha_hora, hora_inicio_atencion, hora_finalizacion')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', dayRange.start)
        .lt('fecha_hora', dayRange.end),
      supabaseAdmin
        .from('citas')
        .select('id, colafinal, fecha_hora, hora_inicio_atencion, hora_finalizacion')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', weekRange.start)
        .lt('fecha_hora', weekRange.end),
      supabaseAdmin
        .from('citas')
        .select('id, colafinal, fecha_hora, hora_inicio_atencion, hora_finalizacion')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', monthRange.start)
        .lt('fecha_hora', monthRange.end),
      supabaseAdmin
        .from('citas')
        .select('id')
        .eq('barbero_id', barberoId)
        .not('status', 'in', '("completed","cancelled","no_show")'),
      supabaseAdmin
        .from('items_venta')
        .select(`
          tipo,
          nombre,
          cantidad,
          precio_unitario,
          subtotal,
          venta:ventas!items_venta_venta_id_fkey!inner(barbero_id, created_at)
        `)
        .gte('venta.created_at', monthRange.start)
        .lt('venta.created_at', monthRange.end),
    ]);

    const gananciasHoy = sumVentas(ventasDiaRes.data as { total_final?: number | null }[] | null);
    const gananciasSemana = sumVentas(ventasSemanaRes.data as { total_final?: number | null }[] | null);
    const gananciasMes = sumVentas(ventasMesRes.data as { total_final?: number | null }[] | null);

    const citasDiaRows = (citasDiaRes.data ?? []) as any[];
    const citasSemanaRows = (citasSemanaRes.data ?? []) as any[];
    const citasMesRows = (citasMesRes.data ?? []) as any[];

    const citasHoyTotales = citasDiaRows.length;
    const citasSemanaTotales = citasSemanaRows.length;

    const isCompletada = (cita: any) => cita.colafinal === 'completado';

    const citasHoyCompletadas = citasDiaRows.filter(isCompletada).length;
    const citasSemanaCompletadas = citasSemanaRows.filter(isCompletada).length;
    const citasMesCompletadas = citasMesRows.filter(isCompletada).length;

    const calcularHorasTrabajadas = (rows: any[]) => {
      const totalMs = rows.reduce((acc, cita) => {
        if (!cita.hora_inicio_atencion || !cita.hora_finalizacion) return acc;
        const inicio = new Date(cita.hora_inicio_atencion);
        const fin = new Date(cita.hora_finalizacion);
        const diff = fin.getTime() - inicio.getTime();
        if (Number.isNaN(diff) || diff <= 0) return acc;
        return acc + diff;
      }, 0);

      return totalMs / (1000 * 60 * 60);
    };

    const horasTrabajadasDia = calcularHorasTrabajadas(citasDiaRows.filter(isCompletada));
    const horasTrabajadasSemana = calcularHorasTrabajadas(citasSemanaRows.filter(isCompletada));
    const horasTrabajadasMes = calcularHorasTrabajadas(citasMesRows.filter(isCompletada));

    const citasPendientes = countRows(citasPendientesRes.data);

    const ventasDiaCount = countRows(ventasDiaRes.data);
    const ventasSemanaCount = countRows(ventasSemanaRes.data);
    const ventasMesCount = countRows(ventasMesRes.data);

    // Procesar items de venta para obtener servicios y productos populares
    const itemsData = (itemsVentaMesRes.data || []).filter((item: any) => {
      const venta = Array.isArray(item.venta) ? item.venta[0] : item.venta;
      return venta?.barbero_id === barberoId;
    });

    // Agrupar servicios
    const serviciosMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
    itemsData
      .filter((item: any) => item.tipo === 'servicio')
      .forEach((item: any) => {
        const existing = serviciosMap.get(item.nombre) || { nombre: item.nombre, cantidad: 0, total: 0 };
        existing.cantidad += item.cantidad || 1;
        existing.total += item.subtotal || 0;
        serviciosMap.set(item.nombre, existing);
      });

    // Agrupar productos
    const productosMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
    itemsData
      .filter((item: any) => item.tipo === 'producto')
      .forEach((item: any) => {
        const existing = productosMap.get(item.nombre) || { nombre: item.nombre, cantidad: 0, total: 0 };
        existing.cantidad += item.cantidad || 1;
        existing.total += item.subtotal || 0;
        productosMap.set(item.nombre, existing);
      });

    // Convertir a arrays y ordenar
    const serviciosPopulares = Array.from(serviciosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const productosVendidos = Array.from(productosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Horarios más ocupados (basado en citas completadas del día)
    const horasOcupacionMap = new Map<number, number>();
    citasDiaRows
      .filter(isCompletada)
      .forEach((cita: any) => {
        const baseFecha = cita.hora_inicio_atencion || cita.fecha_hora;
        if (!baseFecha) return;
        const inicio = new Date(baseFecha);
        if (Number.isNaN(inicio.getTime())) return;
        const hora = inicio.getHours();
        horasOcupacionMap.set(hora, (horasOcupacionMap.get(hora) ?? 0) + 1);
      });

    const horasRango = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 a 19:00
    const maxOcupacion = Math.max(
      0,
      ...horasRango.map((hora) => horasOcupacionMap.get(hora) ?? 0),
    );

    const horariosOcupados = horasRango.map((hora) => {
      const cantidad = horasOcupacionMap.get(hora) ?? 0;
      const porcentaje = maxOcupacion > 0 ? Math.round((cantidad / maxOcupacion) * 100) : 0;
      return { hora, porcentaje };
    });

    // Calificación promedio del barbero (clientes con cuenta que han calificado)
    const { data: barberoRow } = await supabaseAdmin
      .from('barberos')
      .select('calificacion_promedio')
      .eq('id', barberoId)
      .maybeSingle();

    const calificacionPromedio =
      barberoRow && barberoRow.calificacion_promedio != null
        ? Number(barberoRow.calificacion_promedio)
        : 0;

    // Último pago registrado para el barbero en gastos
    const { data: pagosRows } = await supabaseAdmin
      .from('gastos')
      .select('monto, fecha_gasto')
      .eq('categoria', 'barber_payment')
      .eq('barbero_id', barberoId)
      .order('fecha_gasto', { ascending: false })
      .limit(1);

    let ultimoPagoFecha: string | null = null;
    let ultimoPagoMonto = 0;

    if (pagosRows && pagosRows.length > 0) {
      const row = pagosRows[0] as any;
      ultimoPagoFecha = row.fecha_gasto ? String(row.fecha_gasto) : null;
      ultimoPagoMonto = Number(row.monto ?? 0) || 0;
    }

    return jsonResponse({
      success: true,
      stats: {
        resumen: {
          gananciasHoy,
          gananciasSemana,
          citasHoy: citasHoyTotales,
          citasSemana: citasSemanaTotales,
          citasPendientes,
        },
        rendimiento: {
          ganancias_dia: gananciasHoy,
          ganancias_semana: gananciasSemana,
          ganancias_mes: gananciasMes,
          citas_dia: citasHoyCompletadas,
          citas_semana: citasSemanaCompletadas,
          citas_mes: citasMesCompletadas,
          ventas_dia: ventasDiaCount,
          ventas_semana: ventasSemanaCount,
          ventas_mes: ventasMesCount,
          servicios_populares: serviciosPopulares,
          productos_vendidos: productosVendidos,
          horarios_ocupados: horariosOcupados,
          horas_trabajadas_dia: horasTrabajadasDia,
          horas_trabajadas_semana: horasTrabajadasSemana,
          horas_trabajadas_mes: horasTrabajadasMes,
          calificacion_promedio: calificacionPromedio,
          ultimo_pago_fecha: ultimoPagoFecha,
          ultimo_pago_monto: ultimoPagoMonto,
        },
      },
    });
  } catch (error) {
    console.error('[api/barbero/stats] Error obteniendo estadísticas:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};
