import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../lib/barberoAuth';
import { getBarberoCitasForDay } from '../../../../services/citaManagementService';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const todayISODate = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const session = await requireBarberoSession(cookies);
    const date = url.searchParams.get('date') ?? todayISODate();

    const citas = await getBarberoCitasForDay({
      barberoId: session.barbero.id,
      date,
    });

    return jsonResponse({ success: true, citas });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/citas] Error obteniendo citas:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
