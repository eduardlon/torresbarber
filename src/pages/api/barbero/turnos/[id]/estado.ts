import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../../lib/barberoAuth';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ESTADOS_VALIDOS = ['en_cola', 'atendiendo', 'completado', 'cancelado', 'no_show'];

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const turnoId = params.id;
    if (!turnoId) {
      return jsonResponse({ success: false, message: 'ID de turno requerido' }, 400);
    }

    const session = await requireBarberoSession(cookies);
    const barberoId = session.barbero.id;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body || typeof body.estado !== 'string') {
      return jsonResponse({ success: false, message: 'Estado requerido' }, 400);
    }

    const nuevoEstado = body.estado;

    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
      return jsonResponse({ success: false, message: 'Estado inválido' }, 400);
    }

    // Verificar que el turno pertenece al barbero
    const { data: turno, error: turnoError } = await supabaseAdmin
      .from('turnos_diarios')
      .select('id, barbero_id, estado')
      .eq('id', turnoId)
      .single();

    if (turnoError || !turno) {
      return jsonResponse({ success: false, message: 'Turno no encontrado' }, 404);
    }

    if (turno.barbero_id !== barberoId) {
      return jsonResponse({ success: false, message: 'No autorizado' }, 403);
    }

    // Actualizar estado
    const updateData: Record<string, unknown> = {
      estado: nuevoEstado,
    };

    if (nuevoEstado === 'atendiendo') {
      updateData.hora_inicio = new Date().toISOString();
    } else if (nuevoEstado === 'completado') {
      updateData.hora_fin = new Date().toISOString();
    }

    const { data: turnoActualizado, error: updateError } = await supabaseAdmin
      .from('turnos_diarios')
      .update(updateData)
      .eq('id', turnoId)
      .select()
      .single();

    if (updateError) {
      console.error('[api/barbero/turnos/:id/estado] Error actualizando turno:', updateError);
      return jsonResponse({ success: false, message: 'Error al actualizar turno' }, 500);
    }

    return jsonResponse({ success: true, turno: turnoActualizado });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/turnos/:id/estado] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
