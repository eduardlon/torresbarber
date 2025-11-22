import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../lib/barberoAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

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
    const barberoId = session.barbero.id;
    const fecha = url.searchParams.get('fecha') ?? todayISODate();

    const { data, error } = await supabaseAdmin
      .from('turnos_diarios')
      .select(`
        *,
        servicio:servicio_id (
          id,
          nombre,
          precio,
          duracion_minutos
        ),
        cliente:cliente_id (
          id,
          nombre,
          apellido,
          telefono
        ),
        invitado:invitado_id (
          id,
          nombre,
          telefono
        )
      `)
      .eq('barbero_id', barberoId)
      .eq('fecha', fecha)
      .order('numero_turno', { ascending: true });

    if (error) {
      console.error('[api/barbero/turnos] Error obteniendo turnos:', error);
      return jsonResponse({ success: false, message: 'Error al obtener turnos' }, 500);
    }

    return jsonResponse({ success: true, turnos: data || [] });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/turnos] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireBarberoSession(cookies);
    const barberoId = session.barbero.id;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return jsonResponse({ success: false, message: 'Cuerpo inválido' }, 400);
    }

    const servicioId = typeof body.servicio_id === 'number' ? body.servicio_id : null;
    const clienteId = typeof body.cliente_id === 'number' ? body.cliente_id : null;
    const invitadoId = typeof body.invitado_id === 'number' ? body.invitado_id : null;
    const clienteNombre = typeof body.cliente_nombre === 'string' ? body.cliente_nombre.trim() : null;
    const clienteTelefono = typeof body.cliente_telefono === 'string' ? body.cliente_telefono.trim() : null;
    const notas = typeof body.notas === 'string' ? body.notas.trim() : null;
    const fecha = typeof body.fecha === 'string' ? body.fecha : todayISODate();

    if (!servicioId) {
      return jsonResponse({ success: false, message: 'servicio_id es requerido' }, 400);
    }

    if (!clienteId && !invitadoId && !clienteNombre) {
      return jsonResponse(
        { success: false, message: 'Debe proporcionar cliente_id, invitado_id o cliente_nombre' },
        400
      );
    }

    // Obtener el siguiente número de turno para el día
    const { data: maxTurno } = await supabaseAdmin
      .from('turnos_diarios')
      .select('numero_turno')
      .eq('barbero_id', barberoId)
      .eq('fecha', fecha)
      .order('numero_turno', { ascending: false })
      .limit(1)
      .single();

    const numeroTurno = (maxTurno?.numero_turno ?? 0) + 1;

    // Crear el turno
    const turnoData: Record<string, unknown> = {
      barbero_id: barberoId,
      servicio_id: servicioId,
      fecha,
      numero_turno: numeroTurno,
      estado: 'en_cola',
      notas,
    };

    if (clienteId) {
      turnoData.cliente_id = clienteId;
      turnoData.tipo_cliente = 'cliente';
    } else if (invitadoId) {
      turnoData.invitado_id = invitadoId;
      turnoData.tipo_cliente = 'invitado';
    } else {
      turnoData.cliente_nombre = clienteNombre;
      turnoData.cliente_telefono = clienteTelefono;
      turnoData.tipo_cliente = 'walk_in';
    }

    const { data: turno, error } = await supabaseAdmin
      .from('turnos_diarios')
      .insert([turnoData])
      .select(`
        *,
        servicio:servicio_id (
          id,
          nombre,
          precio,
          duracion_minutos
        )
      `)
      .single();

    if (error) {
      console.error('[api/barbero/turnos] Error creando turno:', error);
      return jsonResponse({ success: false, message: 'Error al crear turno' }, 500);
    }

    return jsonResponse({ success: true, turno });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/turnos] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
