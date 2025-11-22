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
    const session = await requireBarberoSession(cookies);
    const barberoId = session.barbero.id;

    const fechaInicio = url.searchParams.get('fecha_inicio');
    const fechaFin = url.searchParams.get('fecha_fin');

    let query = supabaseAdmin
      .from('ventas')
      .select(`
        id,
        total,
        total_final,
        descuento,
        metodo_pago,
        estado,
        notas,
        fecha_venta,
        created_at,
        cliente:cliente_id (
          nombre,
          apellido,
          telefono
        )
      `)
      .eq('barbero_id', barberoId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fechaInicio) {
      query = query.gte('created_at', fechaInicio);
    }

    if (fechaFin) {
      query = query.lte('created_at', fechaFin);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[api/barbero/ventas] Error obteniendo ventas:', error);
      return jsonResponse({ success: false, message: 'Error al obtener ventas' }, 500);
    }

    // Obtener items de cada venta
    const ventasConItems = await Promise.all(
      (data || []).map(async (venta) => {
        const { data: items } = await supabaseAdmin
          .from('items_venta')
          .select('tipo, nombre, cantidad, precio_unitario, subtotal, servicio_id, producto_id')
          .eq('venta_id', venta.id);

        const servicios = (items || [])
          .filter((item) => item.tipo === 'servicio')
          .map((item) => ({
            id: item.servicio_id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio_unitario,
          }));

        const productos = (items || [])
          .filter((item) => item.tipo === 'producto')
          .map((item) => ({
            id: item.producto_id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio_unitario,
          }));

        const cliente = Array.isArray(venta.cliente) ? venta.cliente[0] : venta.cliente;
        
        return {
          ...venta,
          cliente_nombre: cliente?.nombre || 'Cliente',
          servicios,
          productos,
        };
      })
    );

    return jsonResponse({ success: true, ventas: ventasConItems });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/ventas] Error:', error);
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

    const clienteNombre = typeof body.cliente_nombre === 'string' ? body.cliente_nombre.trim() : '';
    const clienteTelefono = typeof body.cliente_telefono === 'string' ? body.cliente_telefono.trim() : null;
    const metodoPago = typeof body.metodo_pago === 'string' ? body.metodo_pago : 'efectivo';
    const notas = typeof body.notas === 'string' ? body.notas.trim() : null;
    const total = typeof body.total === 'number' ? body.total : 0;
    const servicios = Array.isArray(body.servicios) ? body.servicios : [];
    const productos = Array.isArray(body.productos) ? body.productos : [];

    if (!clienteNombre) {
      return jsonResponse({ success: false, message: 'Nombre del cliente es requerido' }, 400);
    }

    if (total <= 0) {
      return jsonResponse({ success: false, message: 'El total debe ser mayor a 0' }, 400);
    }

    // Crear venta
    const ventaData = {
      barbero_id: barberoId,
      total: total,
      total_final: total,
      descuento: 0,
      metodo_pago: metodoPago,
      estado: 'completed' as const,
      notas,
      fecha_venta: new Date().toISOString(),
    };

    const { data: venta, error: ventaError } = await supabaseAdmin
      .from('ventas')
      .insert([ventaData])
      .select()
      .single();

    if (ventaError) {
      console.error('[api/barbero/ventas] Error creando venta:', ventaError);
      return jsonResponse({ success: false, message: 'Error al registrar la venta' }, 500);
    }

    // Crear items de venta (servicios y productos)
    const items: any[] = [];

    // Agregar servicios
    servicios.forEach((servicio: any) => {
      items.push({
        venta_id: venta.id,
        tipo: 'servicio',
        servicio_id: servicio.id,
        producto_id: null,
        nombre: servicio.nombre,
        cantidad: servicio.cantidad || 1,
        precio_unitario: servicio.precio || 0,
        subtotal: (servicio.precio || 0) * (servicio.cantidad || 1),
      });
    });

    // Agregar productos
    productos.forEach((producto: any) => {
      items.push({
        venta_id: venta.id,
        tipo: 'producto',
        servicio_id: null,
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: producto.cantidad || 1,
        precio_unitario: producto.precio || 0,
        subtotal: (producto.precio || 0) * (producto.cantidad || 1),
      });
    });

    // Insertar items si hay
    if (items.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('items_venta')
        .insert(items);

      if (itemsError) {
        console.error('[api/barbero/ventas] Error creando items de venta:', itemsError);
      }

      // Actualizar stock de productos
      for (const producto of productos) {
        if (producto.id) {
          try {
            // Obtener stock actual
            const { data: productoData } = await supabaseAdmin
              .from('productos')
              .select('stock_actual')
              .eq('id', producto.id)
              .single();

            if (productoData && productoData.stock_actual !== null) {
              const nuevoStock = (productoData.stock_actual || 0) - (producto.cantidad || 1);
              await supabaseAdmin
                .from('productos')
                .update({ stock_actual: Math.max(0, nuevoStock) })
                .eq('id', producto.id);
            }
          } catch (error) {
            console.error('[api/barbero/ventas] Error actualizando stock:', error);
          }
        }
      }
    }

    return jsonResponse({ success: true, venta: { ...venta, servicios, productos } });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
    console.error('[api/barbero/ventas] Error:', error);
    return jsonResponse({ success: false, message: (error as Error).message }, status);
  }
};
