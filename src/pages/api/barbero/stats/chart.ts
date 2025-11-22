import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../lib/barberoAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const session = await requireBarberoSession(cookies);
    const barberoId = session.barbero.id;
    const periodo = url.searchParams.get('periodo') || 'semana';

    let labels: string[] = [];
    let ganancias: number[] = [];
    let citas: number[] = [];

    const now = new Date();

    if (periodo === 'dia') {
      // Últimas 24 horas por hora
      const horasData = new Map<number, { ganancias: number; citas: number }>();
      
      // Inicializar todas las horas
      for (let i = 0; i < 24; i++) {
        horasData.set(i, { ganancias: 0, citas: 0 });
        labels.push(`${i}:00`);
      }

      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      // Obtener ventas del día
      const { data: ventasHoy } = await supabaseAdmin
        .from('ventas')
        .select('total_final, created_at')
        .eq('barbero_id', barberoId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      // Obtener citas del día
      const { data: citasHoy } = await supabaseAdmin
        .from('citas')
        .select('id, fecha_hora')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', startOfDay.toISOString())
        .lte('fecha_hora', endOfDay.toISOString());

      // Agrupar por hora
      (ventasHoy || []).forEach((venta: any) => {
        const hora = new Date(venta.created_at).getHours();
        const data = horasData.get(hora)!;
        data.ganancias += venta.total_final || 0;
        horasData.set(hora, data);
      });

      (citasHoy || []).forEach((cita: any) => {
        const hora = new Date(cita.fecha_hora).getHours();
        const data = horasData.get(hora)!;
        data.citas += 1;
        horasData.set(hora, data);
      });

      // Convertir a arrays
      for (let i = 0; i < 24; i++) {
        const data = horasData.get(i)!;
        ganancias.push(data.ganancias);
        citas.push(data.citas);
      }

    } else if (periodo === 'semana') {
      // Últimos 7 días
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const diasData = new Map<string, { ganancias: number; citas: number }>();

      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(now);
        fecha.setDate(fecha.getDate() - i);
        fecha.setHours(0, 0, 0, 0);
        
        const diaKey = fecha.toISOString().split('T')[0];
        const diaLabel = dias[fecha.getDay()];
        
        diasData.set(diaKey, { ganancias: 0, citas: 0 });
        labels.push(diaLabel);
      }

      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      // Obtener ventas de la semana
      const { data: ventasSemana } = await supabaseAdmin
        .from('ventas')
        .select('total_final, created_at')
        .eq('barbero_id', barberoId)
        .gte('created_at', start.toISOString())
        .lte('created_at', now.toISOString());

      // Obtener citas de la semana
      const { data: citasSemana } = await supabaseAdmin
        .from('citas')
        .select('id, fecha_hora')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', start.toISOString())
        .lte('fecha_hora', now.toISOString());

      // Agrupar por día
      (ventasSemana || []).forEach((venta: any) => {
        const diaKey = new Date(venta.created_at).toISOString().split('T')[0];
        const data = diasData.get(diaKey);
        if (data) {
          data.ganancias += venta.total_final || 0;
        }
      });

      (citasSemana || []).forEach((cita: any) => {
        const diaKey = new Date(cita.fecha_hora).toISOString().split('T')[0];
        const data = diasData.get(diaKey);
        if (data) {
          data.citas += 1;
        }
      });

      // Convertir a arrays en orden
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(now);
        fecha.setDate(fecha.getDate() - i);
        fecha.setHours(0, 0, 0, 0);
        const diaKey = fecha.toISOString().split('T')[0];
        const data = diasData.get(diaKey)!;
        ganancias.push(data.ganancias);
        citas.push(data.citas);
      }

    } else {
      // Últimos 30 días (mes)
      const diasData = new Map<string, { ganancias: number; citas: number }>();

      for (let i = 29; i >= 0; i--) {
        const fecha = new Date(now);
        fecha.setDate(fecha.getDate() - i);
        fecha.setHours(0, 0, 0, 0);
        
        const diaKey = fecha.toISOString().split('T')[0];
        diasData.set(diaKey, { ganancias: 0, citas: 0 });
        labels.push(fecha.getDate().toString());
      }

      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);

      // Obtener ventas del mes
      const { data: ventasMes } = await supabaseAdmin
        .from('ventas')
        .select('total_final, created_at')
        .eq('barbero_id', barberoId)
        .gte('created_at', start.toISOString())
        .lte('created_at', now.toISOString());

      // Obtener citas del mes
      const { data: citasMes } = await supabaseAdmin
        .from('citas')
        .select('id, fecha_hora')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', start.toISOString())
        .lte('fecha_hora', now.toISOString());

      // Agrupar por día
      (ventasMes || []).forEach((venta: any) => {
        const diaKey = new Date(venta.created_at).toISOString().split('T')[0];
        const data = diasData.get(diaKey);
        if (data) {
          data.ganancias += venta.total_final || 0;
        }
      });

      (citasMes || []).forEach((cita: any) => {
        const diaKey = new Date(cita.fecha_hora).toISOString().split('T')[0];
        const data = diasData.get(diaKey);
        if (data) {
          data.citas += 1;
        }
      });

      // Convertir a arrays en orden
      for (let i = 29; i >= 0; i--) {
        const fecha = new Date(now);
        fecha.setDate(fecha.getDate() - i);
        fecha.setHours(0, 0, 0, 0);
        const diaKey = fecha.toISOString().split('T')[0];
        const data = diasData.get(diaKey)!;
        ganancias.push(data.ganancias);
        citas.push(data.citas);
      }
    }

    return jsonResponse({
      success: true,
      chartData: {
        labels,
        ganancias,
        citas,
      },
    });
  } catch (error) {
    console.error('[api/barbero/stats/chart] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};
