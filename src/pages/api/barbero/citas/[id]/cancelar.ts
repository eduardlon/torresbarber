import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../../lib/barberoAuth';
import { cancelarCita } from '../../../../../services/citaManagementService';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const citaId = params.id;
    if (!citaId) {
      return jsonResponse({ success: false, message: 'ID de cita requerido' }, 400);
    }

    const body = (await request.json().catch(() => null)) as { motivo?: string } | null;
    const motivo = body?.motivo?.trim();

    const session = await requireBarberoSession(cookies);
    const cita = await cancelarCita({ citaId, barberoId: session.barbero.id, motivo });

    return jsonResponse({ success: true, cita });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/citas/:id/cancelar] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
