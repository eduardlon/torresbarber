import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../../lib/barberoAuth';
import { agregarCitaACola } from '../../../../../services/citaManagementService';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ params, cookies }) => {
  try {
    const citaId = params.id;
    if (!citaId) {
      return jsonResponse({ success: false, message: 'ID de cita requerido' }, 400);
    }

    const session = await requireBarberoSession(cookies);
    const cita = await agregarCitaACola({ citaId, barberoId: session.barbero.id });

    return jsonResponse({ success: true, cita });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/citas/:id/cola] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
