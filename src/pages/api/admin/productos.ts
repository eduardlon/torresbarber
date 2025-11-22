import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[api/admin/productos] Error obteniendo productos:', error);
      return jsonResponse({ success: false, message: 'Error al obtener productos' }, 500);
    }

    return jsonResponse({ success: true, productos: data || [] });
  } catch (error) {
    console.error('[api/admin/productos] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as any;
    if (!body || typeof body.nombre !== 'string') {
      return jsonResponse({ success: false, message: 'Datos de producto inválidos' }, 400);
    }

    const payload = {
      nombre: body.nombre.trim(),
      descripcion: typeof body.descripcion === 'string' ? body.descripcion.trim() : null,
      precio: Number(body.precio) || 0,
      stock_actual: typeof body.stock_actual === 'number' ? body.stock_actual : null,
      stock_minimo: typeof body.stock_minimo === 'number' ? body.stock_minimo : 0,
      activo: body.activo !== false,
    };

    const { data, error } = await supabaseAdmin
      .from('productos')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin/productos] Error creando producto:', error);
      return jsonResponse({ success: false, message: 'Error al crear producto' }, 500);
    }

    return jsonResponse({ success: true, producto: data }, 201);
  } catch (error) {
    console.error('[api/admin/productos] Error POST:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};

export const PATCH: APIRoute = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ success: false, message: 'ID de producto requerido' }, 400);
    }

    const body = (await request.json().catch(() => null)) as any;
    if (!body || typeof body !== 'object') {
      return jsonResponse({ success: false, message: 'Datos inválidos' }, 400);
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.nombre === 'string') patch.nombre = body.nombre.trim();
    if (typeof body.descripcion === 'string' || body.descripcion === null) patch.descripcion = body.descripcion;
    if (body.precio !== undefined) patch.precio = Number(body.precio) || 0;
    if (body.stock_actual !== undefined) patch.stock_actual = body.stock_actual === null ? null : Number(body.stock_actual);
    if (body.stock_minimo !== undefined) patch.stock_minimo = Number(body.stock_minimo) || 0;
    if (body.activo !== undefined) patch.activo = Boolean(body.activo);

    const { data, error } = await supabaseAdmin
      .from('productos')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin/productos] Error actualizando producto:', error);
      return jsonResponse({ success: false, message: 'Error al actualizar producto' }, 500);
    }

    return jsonResponse({ success: true, producto: data });
  } catch (error) {
    console.error('[api/admin/productos] Error PATCH:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ success: false, message: 'ID de producto requerido' }, 400);
    }

    const { error } = await supabaseAdmin
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/admin/productos] Error eliminando producto:', error);
      return jsonResponse({ success: false, message: 'Error al eliminar producto' }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[api/admin/productos] Error DELETE:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, 500);
  }
};
