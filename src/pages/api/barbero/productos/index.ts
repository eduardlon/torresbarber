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

    const soloConStock = url.searchParams.get('stock') === 'true';

    let query = supabaseAdmin
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (soloConStock) {
      query = query.gt('stock_actual', 0);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[api/barbero/productos] Error obteniendo productos:', error);
      return jsonResponse({ success: false, message: 'Error al obtener productos' }, 500);
    }

    return jsonResponse({ success: true, productos: data || [] });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/productos] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
