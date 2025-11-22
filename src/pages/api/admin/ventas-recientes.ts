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
    const limitParam = url.searchParams.get('limit');
    const limit = Number.isFinite(Number(limitParam)) && Number(limitParam) > 0 ? Number(limitParam) : 10;

    const { data, error } = await supabaseAdmin
      .from('ventas')
      .select(
        `id,
         total_final,
         created_at,
         estado,
         cliente:cliente_id(nombre),
         cita:cita_id(
           fecha_hora,
           servicio:servicio_id(nombre)
         )`
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[api/admin/ventas-recientes] Error obteniendo ventas:', error);
      return jsonResponse({ success: false, message: 'Error al obtener ventas recientes' }, 500);
    }

    type VentaRow = {
      id: string;
      total_final: number | string | null;
      created_at: string | null;
      estado?: string | null;
      cliente?: { nombre?: string | null } | null;
      cita?: {
        fecha_hora?: string | null;
        servicio?: { nombre?: string | null } | null;
      } | null;
    };

    const ventas = ((data ?? []) as VentaRow[]).map((venta) => {
      const clienteNombre = venta.cliente?.nombre ?? 'Cliente';
      const servicioNombre = venta.cita?.servicio?.nombre ?? 'Servicio';
      const monto = Number(venta.total_final ?? 0) || 0;

      const createdAt = venta.created_at ?? new Date().toISOString();
      const hora = new Date(createdAt).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const estadoNormalizado = (venta.estado ?? 'completed').toString().toLowerCase();

      return {
        id: venta.id,
        cliente: clienteNombre,
        servicio: servicioNombre,
        monto,
        hora,
        estado: estadoNormalizado,
      };
    });

    return jsonResponse({ success: true, ventas });
  } catch (error) {
    console.error('[api/admin/ventas-recientes] Error inesperado:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};
