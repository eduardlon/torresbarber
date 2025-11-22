import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gastos')
      .select('*')
      .order('fecha_gasto', { ascending: false });

    if (error) {
      console.error('[api/admin/gastos] Error obteniendo gastos:', error);
      return jsonResponse({ success: false, message: 'Error al obtener gastos' }, 500);
    }

    return jsonResponse({ success: true, gastos: data ?? [] });
  } catch (error) {
    console.error('[api/admin/gastos] Error inesperado (GET):', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return jsonResponse({ success: false, message: 'Cuerpo inválido' }, 400);
    }

    const concepto = typeof body.concepto === 'string' ? body.concepto.trim() : '';
    const monto = typeof body.monto === 'number' ? body.monto : Number(body.monto ?? 0);
    const categoria = typeof body.categoria === 'string' ? body.categoria : 'other';
    const fecha_gasto = typeof body.fecha_gasto === 'string' ? body.fecha_gasto : new Date().toISOString().split('T')[0];
    const notas = typeof body.notas === 'string' ? body.notas.trim() : null;
    const barbero_id = typeof body.barbero_id === 'string' ? body.barbero_id : null;
    const periodo = typeof body.periodo === 'string' ? body.periodo : null;

    if (!concepto) {
      return jsonResponse({ success: false, message: 'El concepto es obligatorio' }, 400);
    }

    if (!monto || Number.isNaN(monto) || monto <= 0) {
      return jsonResponse({ success: false, message: 'El monto debe ser mayor a 0' }, 400);
    }

    const insertData: Record<string, unknown> = {
      concepto,
      monto,
      categoria,
      fecha_gasto,
      notas,
    };

    if (barbero_id) {
      insertData.barbero_id = barbero_id;
    }

    if (periodo) {
      insertData.periodo = periodo;
    }

    const { data, error } = await supabaseAdmin
      .from('gastos')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[api/admin/gastos] Error creando gasto:', error);
      return jsonResponse({ success: false, message: 'Error al crear gasto' }, 500);
    }

    return jsonResponse({ success: true, gasto: data }, 201);
  } catch (error) {
    console.error('[api/admin/gastos] Error inesperado (POST):', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};
