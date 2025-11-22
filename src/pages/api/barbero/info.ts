import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../lib/barberoAuth';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const session = await requireBarberoSession(cookies);
    const barbero = session.barbero;

    return jsonResponse({
      success: true,
      barbero: {
        id: barbero.id,
        nombre: barbero.nombre,
        apellido: barbero.apellido,
        email: barbero.email,
        telefono: barbero.telefono,
        usuario: barbero.usuario,
        activo: barbero.activo,
        comision_porcentaje: barbero.comision_porcentaje,
        periodo_pago: barbero.periodo_pago,
      },
    });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/info] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
