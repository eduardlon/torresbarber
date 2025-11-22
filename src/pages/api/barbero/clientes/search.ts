import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../lib/barberoAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    await requireBarberoSession(cookies);

    const searchTerm = url.searchParams.get('q');

    if (!searchTerm || searchTerm.trim().length < 2) {
      return jsonResponse({ success: true, clientes: [], invitados: [] });
    }

    const term = searchTerm.trim().toLowerCase();

    // Buscar en clientes
    const { data: clientes, error: clientesError } = await supabaseAdmin
      .from('clientes')
      .select('id, nombre, apellido, telefono, email')
      .or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,telefono.ilike.%${term}%`)
      .limit(10);

    if (clientesError) {
      console.error('[api/barbero/clientes/search] Error buscando clientes:', clientesError);
    }

    // Buscar en invitados
    const { data: invitados, error: invitadosError } = await supabaseAdmin
      .from('invitados')
      .select('id, nombre, telefono, email')
      .or(`nombre.ilike.%${term}%,telefono.ilike.%${term}%`)
      .limit(10);

    if (invitadosError) {
      console.error('[api/barbero/clientes/search] Error buscando invitados:', invitadosError);
    }

    return jsonResponse({
      success: true,
      clientes: clientes || [],
      invitados: invitados || [],
    });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/clientes/search] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
