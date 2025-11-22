import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../../lib/barberoAuth';
import { finalizarCitaConVenta } from '../../../../../services/citaManagementService';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type FinalizarPayload = {
  metodoPago?: string;
  notas?: string;
  serviciosExtra?: Array<{ servicioId?: string; cantidad?: number }>;
  productos?: Array<{ productoId?: string; cantidad?: number }>;
};

const sanitizeServiciosExtra = (
  extras: FinalizarPayload['serviciosExtra'],
): { servicioId: string; cantidad?: number }[] => {
  if (!Array.isArray(extras)) {
    return [];
  }

  return extras
    .map((extra) => ({
      servicioId: typeof extra?.servicioId === 'string' ? extra.servicioId : '',
      cantidad: typeof extra?.cantidad === 'number' ? extra.cantidad : undefined,
    }))
    .filter((extra) => Boolean(extra.servicioId));
};

const sanitizeProductos = (
  productos: FinalizarPayload['productos'],
): { productoId: string; cantidad: number }[] => {
  if (!Array.isArray(productos)) {
    return [];
  }

  return productos
    .map((producto) => ({
      productoId: typeof producto?.productoId === 'string' ? producto.productoId : '',
      cantidad: typeof producto?.cantidad === 'number' && producto.cantidad > 0 ? producto.cantidad : 1,
    }))
    .filter((producto) => Boolean(producto.productoId));
};

const isMetodoPagoValido = (metodo: string): metodo is 'efectivo' | 'transferencia' | 'fiado' => {
  return metodo === 'efectivo' || metodo === 'transferencia' || metodo === 'fiado';
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const citaId = params.id;
    if (!citaId) {
      return jsonResponse({ success: false, message: 'ID de cita requerido' }, 400);
    }

    const body = (await request.json().catch(() => null)) as FinalizarPayload | null;

    if (!body || typeof body.metodoPago !== 'string' || !isMetodoPagoValido(body.metodoPago)) {
      return jsonResponse({ success: false, message: 'metodoPago inválido' }, 400);
    }

    const session = await requireBarberoSession(cookies);

    const resultado = await finalizarCitaConVenta({
      citaId,
      barberoId: session.barbero.id,
      metodoPago: body.metodoPago,
      notas: typeof body.notas === 'string' ? body.notas.trim() : undefined,
      serviciosExtra: sanitizeServiciosExtra(body.serviciosExtra),
      productos: sanitizeProductos(body.productos),
    });

    return jsonResponse({ success: true, ...resultado });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/citas/:id/finalizar] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
