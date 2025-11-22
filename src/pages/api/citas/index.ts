import type { APIRoute } from 'astro';
import { createCita, getReservedSlots } from '../../../services/citaManagementService';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const parseFechaHora = (payload: Record<string, unknown>) => {
  const fechaHora = typeof payload.fechaHora === 'string' ? payload.fechaHora : null;
  if (fechaHora) {
    return fechaHora;
  }

  const fecha = typeof payload.fecha === 'string' ? payload.fecha : null;
  const hora = typeof payload.hora === 'string' ? payload.hora : null;

  if (fecha && hora) {
    return `${fecha}T${hora}`;
  }

  return null;
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const barberoId = url.searchParams.get('barberoId');
    const date = url.searchParams.get('date');

    if (!barberoId || !date) {
      return jsonResponse({ success: false, message: 'barberoId y date son obligatorios' }, 400);
    }

    const slots = await getReservedSlots({ barberoId, date });
    return jsonResponse({ success: true, slots });
  } catch (error) {
    console.error('[api/citas] Error obteniendo slots:', error);
    return jsonResponse({ success: false, message: 'Error interno al consultar disponibilidad' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return jsonResponse({ success: false, message: 'Cuerpo inválido' }, 400);
    }

    const barberoId = typeof body.barberoId === 'string' ? body.barberoId : null;
    const servicioId = typeof body.servicioId === 'string' ? body.servicioId : null;
    const fechaHora = parseFechaHora(body);
    const clienteNombre = typeof body.clienteNombre === 'string' ? body.clienteNombre.trim() : '';
    const clienteTelefono = typeof body.clienteTelefono === 'string' ? body.clienteTelefono.trim() : null;
    const clienteEmail = typeof body.clienteEmail === 'string' ? body.clienteEmail.trim() : null;
    const notas = typeof body.notas === 'string' ? body.notas.trim() : undefined;

    if (!barberoId || !servicioId || !fechaHora || !clienteNombre) {
      return jsonResponse(
        {
          success: false,
          message: 'barberoId, servicioId, fecha/hora y clienteNombre son obligatorios',
        },
        400,
      );
    }

    const cita = await createCita({
      barberoId,
      servicioId,
      fechaHora,
      notas,
      cliente: {
        nombre: clienteNombre,
        telefono: clienteTelefono || undefined,
        email: clienteEmail || undefined,
        id: typeof body.clienteId === 'string' ? body.clienteId : undefined,
      },
      usarBonoFidelizacion: body && typeof (body as any).usarBonoFidelizacion === 'boolean'
        ? (body as any).usarBonoFidelizacion
        : false,
    });

    return jsonResponse({ success: true, cita });
  } catch (error) {
    console.error('[api/citas] Error creando cita:', error);
    const message = error instanceof Error ? error.message : 'Error interno al crear la cita';
    return jsonResponse({ success: false, message }, 400);
  }
};
