import type { APIRoute } from 'astro';
import { requireBarberoSession } from '../../../../lib/barberoAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ cookies }) => {
  try {
    await requireBarberoSession(cookies);

    const { data, error } = await supabaseAdmin
      .from('servicios')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[api/barbero/servicios] Error obteniendo servicios:', error);
      return jsonResponse({ success: false, message: 'Error al obtener servicios' }, 500);
    }

    return jsonResponse({ success: true, servicios: data || [] });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/servicios] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
