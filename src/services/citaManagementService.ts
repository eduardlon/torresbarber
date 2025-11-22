import { supabaseAdmin } from '../lib/supabaseAdmin';

type Nullable<T> = T | null;

type ServicioRecord = {
  id: string;
  nombre: Nullable<string>;
  precio: Nullable<number>;
  duracion_minutos: Nullable<number>;
};

type ProductoRecord = {
  id: string;
  nombre: Nullable<string>;
  precio: Nullable<number>;
};

export type CreateCitaInput = {
  barberoId: string;
  servicioId: string;
  fechaHora: string;
  cliente: {
    id?: string;
    nombre: string;
    telefono?: string;
    email?: string;
  };
  notas?: string;
  usarBonoFidelizacion?: boolean;
};

export type FinalizarCitaInput = {
  citaId: string;
  barberoId: string;
  metodoPago: 'efectivo' | 'transferencia' | 'fiado';
  notas?: string;
  serviciosExtra?: { servicioId: string; cantidad?: number }[];
  productos?: { productoId: string; cantidad: number }[];
};

const CITAS_TABLE = 'citas';
const SERVICIOS_TABLE = 'servicios';
const PRODUCTOS_TABLE = 'productos';
const VENTAS_TABLE = 'ventas';
const ITEMS_VENTA_TABLE = 'items_venta';

// Monto fijo del bono por corte gratis (COP)
const FREE_CUT_BONUS_AMOUNT = 15000;

const ACTIVE_APPOINTMENT_STATUSES = [
  'pending',
  'scheduled',
  'confirmed',
  'waiting',
  'in_chair',
  'in_progress',
  'finishing',
];

const ensureDateISO = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Fecha inválida. Usa un formato ISO 8601.');
  }
  return parsed.toISOString();
};

const getDayRange = (date: string) => {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Fecha inválida.');
  }
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const fetchServicio = async (servicioId: string): Promise<ServicioRecord> => {
  const { data, error } = await supabaseAdmin
    .from(SERVICIOS_TABLE)
    .select('id, nombre, precio, duracion_minutos')
    .eq('id', servicioId)
    .maybeSingle();

  if (error) {
    throw new Error('Error al consultar servicios.');
  }

  if (!data) {
    throw new Error('Servicio no encontrado.');
  }

  return {
    id: data.id,
    nombre: data.nombre ?? 'Servicio',
    precio: typeof data.precio === 'number' ? data.precio : Number(data.precio ?? 0),
    duracion_minutos:
      typeof data.duracion_minutos === 'number'
        ? data.duracion_minutos
        : Number(data.duracion_minutos ?? 0),
  };
};

const fetchProductos = async (ids: string[]): Promise<Record<string, ProductoRecord>> => {
  if (ids.length === 0) {
    return {};
  }

  const { data, error } = await supabaseAdmin
    .from(PRODUCTOS_TABLE)
    .select('id, nombre, precio')
    .in('id', ids);

  if (error) {
    throw new Error('Error al consultar productos.');
  }

  return (data ?? []).reduce<Record<string, ProductoRecord>>((acc, producto) => {
    acc[producto.id] = {
      id: producto.id,
      nombre: producto.nombre ?? 'Producto',
      precio: typeof producto.precio === 'number' ? producto.precio : Number(producto.precio ?? 0),
    };
    return acc;
  }, {});
};

const ensureCitaBelongsToBarbero = async (citaId: string, barberoId: string) => {
  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .select(
      `id, barbero_id, status, etapa_cola, cliente_id, cliente_nombre, cliente_telefono,
       cliente_email, servicio_id, precio_cobrado, duracion_estimada, venta_generada,
       hora_llegada, hora_inicio_atencion, hora_finalizacion, usar_bono_fidelizacion`
    )
    .eq('id', citaId)
    .maybeSingle();

  if (error) {
    throw new Error('Error al consultar la cita.');
  }

  if (!data || data.barbero_id !== barberoId) {
    throw new Error('La cita no pertenece al barbero autenticado.');
  }

  return data;
};

export const createCita = async (input: CreateCitaInput) => {
  const servicio = await fetchServicio(input.servicioId);
  const fechaHora = ensureDateISO(input.fechaHora);
  const clienteNombre = input.cliente.nombre?.trim();

  if (!clienteNombre) {
    throw new Error('El nombre del cliente es obligatorio.');
  }

  // Evitar doble agendamiento para el mismo día cuando el cliente está identificado
  if (input.cliente.id) {
    const { start, end } = getDayRange(input.fechaHora);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from(CITAS_TABLE)
      .select('id, status, fecha_hora')
      .eq('cliente_id', input.cliente.id)
      .gte('fecha_hora', start)
      .lt('fecha_hora', end)
      .in('status', ACTIVE_APPOINTMENT_STATUSES)
      .limit(1);

    if (existingError) {
      throw new Error('No fue posible validar si ya tienes una cita para este día. Inténtalo de nuevo más tarde.');
    }

    if (existing && existing.length > 0) {
      throw new Error('Ya tienes una cita activa para este día. No puedes agendar otra desde el panel cliente.');
    }
  }

  if (input.usarBonoFidelizacion && input.cliente.id) {
    const { data: existingFree, error: existingFreeError } = await supabaseAdmin
      .from(CITAS_TABLE)
      .select('id, status')
      .eq('cliente_id', input.cliente.id)
      .eq('usar_bono_fidelizacion', true)
      .in('status', ACTIVE_APPOINTMENT_STATUSES)
      .limit(1);

    if (existingFreeError) {
      throw new Error('No fue posible validar si ya tienes un corte gratis agendado. Inténtalo de nuevo más tarde.');
    }

    if (existingFree && existingFree.length > 0) {
      throw new Error('Ya tienes un corte gratis agendado. Úsalo antes de redimir otro.');
    }
  }

  const payload = {
    barbero_id: input.barberoId,
    servicio_id: input.servicioId,
    fecha_hora: fechaHora,
    status: 'scheduled',
    etapa_cola: 'cola',
    cliente_id: input.cliente.id ?? null,
    cliente_nombre: clienteNombre,
    cliente_telefono: input.cliente.telefono?.trim() || null,
    cliente_email: input.cliente.email?.trim() || null,
    notas: input.notas?.trim() || null,
    duracion_estimada: servicio.duracion_minutos ?? null,
    precio_cobrado: servicio.precio ?? null,
    cola_prioridad: 1,
    usar_bono_fidelizacion: Boolean(input.usarBonoFidelizacion),
  };

  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .insert(payload)
    .select('id, status, fecha_hora, barbero_id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'No fue posible crear la cita.');
  }

  return data;
};

export const getReservedSlots = async (params: { barberoId: string; date: string }) => {
  const { start, end } = getDayRange(params.date);

  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .select('fecha_hora, status')
    .eq('barbero_id', params.barberoId)
    .gte('fecha_hora', start)
    .lt('fecha_hora', end)
    .in('status', ACTIVE_APPOINTMENT_STATUSES);

  if (error) {
    throw new Error('Error al consultar citas reservadas.');
  }

  return (data ?? []).map((row) => row.fecha_hora);
};

export const getBarberoCitasForDay = async (params: { barberoId: string; date: string }) => {
  const { start, end } = getDayRange(params.date);

  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .select(
      `id, status, etapa_cola, etapa_cola_historial, colafinal, colafinal_at, 
       fecha_hora, cliente_nombre, cliente_telefono, cliente_email,
       posicion_cola, hora_llegada, hora_inicio_atencion, hora_finalizacion, notas,
       servicio:servicio_id(id, nombre, precio, duracion_minutos),
       ventas:ventas_cita_id_fkey(id, total_final, metodo_pago)`
    )
    .eq('barbero_id', params.barberoId)
    .gte('fecha_hora', start)
    .lt('fecha_hora', end)
    .order('fecha_hora', { ascending: true });

  if (error) {
    throw new Error('Error al obtener la agenda del barbero.');
  }

  return data ?? [];
};

export const agregarCitaACola = async (params: { citaId: string; barberoId: string }) => {
  const cita = await ensureCitaBelongsToBarbero(params.citaId, params.barberoId);

  if (['waiting', 'in_chair', 'in_progress'].includes(cita.status)) {
    return cita;
  }

  const { count, error: countError } = await supabaseAdmin
    .from(CITAS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('barbero_id', params.barberoId)
    .eq('status', 'waiting');

  if (countError) {
    throw new Error('No fue posible calcular la posición en la cola.');
  }

  const posicion = (count ?? 0) + 1;

  const updates = {
    status: 'waiting',
    etapa_cola: 'cola',
    hora_llegada: new Date().toISOString(),
    posicion_cola: posicion,
  };

  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .update(updates)
    .eq('id', params.citaId)
    .select(
      `id, status, etapa_cola, posicion_cola, hora_llegada, hora_inicio_atencion, cliente_nombre,
       servicio:servicio_id(id, nombre)`
    )
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo actualizar la cola.');
  }

  return data;
};

export const iniciarAtencionCita = async (params: { citaId: string; barberoId: string }) => {
  await ensureCitaBelongsToBarbero(params.citaId, params.barberoId);

  const updates = {
    status: 'in_chair',
    etapa_cola: 'atendiendo',
    hora_inicio_atencion: new Date().toISOString(),
    hora_llegada: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .update(updates)
    .eq('id', params.citaId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo iniciar la atención.');
  }

  return data;
};

export const cancelarCita = async (params: { citaId: string; barberoId: string; motivo?: string }) => {
  await ensureCitaBelongsToBarbero(params.citaId, params.barberoId);

  const now = new Date().toISOString();
  const updates = {
    status: 'cancelled',
    etapa_cola: 'finalizado',
    hora_finalizacion: now,
    colafinal: 'rechazada',
    colafinal_at: now,
    notas: params.motivo ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .update(updates)
    .eq('id', params.citaId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo cancelar la cita.');
  }

  return data;
};

export const marcarNoShow = async (params: { citaId: string; barberoId: string }) => {
  await ensureCitaBelongsToBarbero(params.citaId, params.barberoId);

  const now = new Date().toISOString();
  const updates = {
    status: 'no_show',
    etapa_cola: 'finalizado',
    hora_finalizacion: now,
    colafinal: 'rechazada',
    colafinal_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from(CITAS_TABLE)
    .update(updates)
    .eq('id', params.citaId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo marcar como inasistencia.');
  }

  return data;
};

export const finalizarCitaConVenta = async (input: FinalizarCitaInput) => {
  const cita = await ensureCitaBelongsToBarbero(input.citaId, input.barberoId);

  if (cita.venta_generada) {
    throw new Error('La cita ya tiene una venta registrada.');
  }

  const servicioPrincipal = await fetchServicio(cita.servicio_id);

  type VentaItem = {
    tipo: 'servicio' | 'producto';
    servicio_id?: string | null;
    producto_id?: string | null;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  };

  const items: VentaItem[] = [];

  items.push({
    tipo: 'servicio',
    servicio_id: servicioPrincipal.id,
    producto_id: null,
    nombre: servicioPrincipal.nombre ?? 'Servicio',
    cantidad: 1,
    precio_unitario: servicioPrincipal.precio ?? 0,
    subtotal: servicioPrincipal.precio ?? 0,
  });

  const extras = input.serviciosExtra ?? [];
  if (extras.length) {
    const uniqueServicioIds = [...new Set(extras.map((extra) => extra.servicioId))];
    const servicioMap = await Promise.all(uniqueServicioIds.map((id) => fetchServicio(id)));
    const servicioLookup = servicioMap.reduce<Record<string, ServicioRecord>>((acc, svc) => {
      acc[svc.id] = svc;
      return acc;
    }, {});

    extras.forEach((extra) => {
      const servicio = servicioLookup[extra.servicioId];
      if (!servicio) {
        return;
      }
      const cantidad = Math.max(1, extra.cantidad ?? 1);
      const precio = servicio.precio ?? 0;
      items.push({
        tipo: 'servicio',
        servicio_id: servicio.id,
        producto_id: null,
        nombre: servicio.nombre ?? 'Servicio adicional',
        cantidad,
        precio_unitario: precio,
        subtotal: precio * cantidad,
      });
    });
  }

  const productos = input.productos ?? [];
  if (productos.length) {
    const uniqueProductoIds = [...new Set(productos.map((p) => p.productoId))];
    const productoLookup = await fetchProductos(uniqueProductoIds);

    productos.forEach((producto) => {
      const record = productoLookup[producto.productoId];
      if (!record) {
        return;
      }
      const cantidad = Math.max(1, producto.cantidad);
      const precio = record.precio ?? 0;
      items.push({
        tipo: 'producto',
        servicio_id: null,
        producto_id: record.id,
        nombre: record.nombre ?? 'Producto',
        cantidad,
        precio_unitario: precio,
        subtotal: precio * cantidad,
      });
    });
  }

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  // Programa de fidelización del cliente
  let descuento = 0;
  let totalFinal = total;
  let freeCutRedeemed = false;

  if (cita.cliente_id) {
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('clientes')
      .select(
        'id, cortes_realizados, cortes_gratis_disponibles, puntos_experiencia, nivel_actual, visitas_totales, dinero_gastado_total',
      )
      .eq('id', cita.cliente_id)
      .maybeSingle();

    if (!clienteError && cliente) {
      // Base de cortes realizados: valor persistido en la fila del cliente
      const cortesPrevios = Number(cliente.cortes_realizados ?? 0);
      const cortesGratisPrevios = Number(cliente.cortes_gratis_disponibles ?? 0);
      const xpPrevio = Number(cliente.puntos_experiencia ?? 0);
      const visitasPrevias = Number(cliente.visitas_totales ?? 0);
      const gastoPrevio = Number(cliente.dinero_gastado_total ?? 0);

      let cortesGratis = cortesGratisPrevios;

      // Solo redimir automáticamente si la cita fue marcada para usar bono y el cliente tiene cortes gratis disponibles
      const quiereUsarBono = Boolean((cita as any).usar_bono_fidelizacion);
      if (quiereUsarBono && cortesGratis > 0) {
        freeCutRedeemed = true;
        cortesGratis -= 1;
      }

      if (freeCutRedeemed) {
        // Bono fijo de fidelización: descuenta hasta 15.000 COP del total de la venta
        const rawDiscount = Math.min(total, FREE_CUT_BONUS_AMOUNT);
        descuento = rawDiscount;
        totalFinal = total - rawDiscount;
      } else {
        descuento = 0;
        totalFinal = total;
      }

      // Solo los cortes pagados cuentan para acumular nuevos cortes gratis
      const cortesRealizados = cortesPrevios + (freeCutRedeemed ? 0 : 1);

      // Cada 10 cortes pagados otorga 1 corte gratis
      const recompensasAntes = Math.floor(cortesPrevios / 10);
      const recompensasDespues = Math.floor(cortesRealizados / 10);
      const nuevosCortesGratis = Math.max(0, recompensasDespues - recompensasAntes);
      cortesGratis += nuevosCortesGratis;

      // Experiencia: 10 XP por servicio (servicio principal + extras)
      const serviciosTotales = 1 + (extras ?? []).reduce((sum, extra) => sum + (extra.cantidad ?? 1), 0);
      const xpGanado = Math.max(5, serviciosTotales * 10);
      const xpTotal = xpPrevio + xpGanado;
      const nuevoNivel = Math.max(1, Math.floor(xpTotal / 100) + 1);

      const visitasTotales = visitasPrevias + 1;
      const gastoTotal = gastoPrevio + totalFinal;

      const now = new Date().toISOString();

      const { error: updateClienteError } = await supabaseAdmin
        .from('clientes')
        .update({
          cortes_realizados: cortesRealizados,
          cortes_gratis_disponibles: cortesGratis,
          puntos_experiencia: xpTotal,
          nivel_actual: nuevoNivel,
          visitas_totales: visitasTotales,
          dinero_gastado_total: gastoTotal,
          ultima_visita: now,
        })
        .eq('id', cliente.id);

      if (updateClienteError) {
        // No bloqueamos la venta si falla la actualización de fidelización, solo registramos el error
        console.error('Error actualizando datos de fidelización del cliente:', updateClienteError);
      }
    }
  }

  const { data: venta, error: ventaError } = await supabaseAdmin
    .from(VENTAS_TABLE)
    .insert({
      cita_id: cita.id,
      barbero_id: cita.barbero_id,
      cliente_id: cita.cliente_id,
      total,
      total_final: totalFinal,
      descuento,
      es_corte_gratis: freeCutRedeemed,
      motivo_redencion: freeCutRedeemed ? 'fidelizacion_corte_gratis' : null,
      metodo_pago: input.metodoPago,
      estado: 'completed',
      notas: input.notas ?? null,
    })
    .select('id')
    .maybeSingle();

  if (ventaError || !venta) {
    throw new Error('No fue posible registrar la venta.');
  }

  // Registrar historial de cortes redimidos para auditoría
  if (freeCutRedeemed && cita.cliente_id) {
    const { error: redencionError } = await supabaseAdmin.from('cortes_redimidos').insert({
      cliente_id: cita.cliente_id,
      venta_id: venta.id,
      cita_id: cita.id,
      monto_original: total,
      monto_descuento: descuento,
      total_final: totalFinal,
    });

    if (redencionError) {
      console.error('No se pudo registrar el historial de corte redimido:', redencionError);
    }
  }

  const itemsPayload = items.map((item) => ({
    venta_id: venta.id,
    tipo: item.tipo,
    servicio_id: item.servicio_id ?? null,
    producto_id: item.producto_id ?? null,
    nombre: item.nombre,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
  }));

  const { error: itemsError } = await supabaseAdmin.from(ITEMS_VENTA_TABLE).insert(itemsPayload);

  if (itemsError) {
    throw new Error('La venta fue creada, pero los items no pudieron registrarse.');
  }

  const now = new Date().toISOString();
  const { data: citaActualizada, error: citaUpdateError } = await supabaseAdmin
    .from(CITAS_TABLE)
    .update({
      status: 'completed',
      etapa_cola: 'finalizado',
      hora_finalizacion: now,
      colafinal: 'completado',
      colafinal_at: now,
      venta_generada: true,
    })
    .eq('id', cita.id)
    .select('*')
    .maybeSingle();

  if (citaUpdateError) {
    throw new Error('La venta se registró, pero no se pudo actualizar la cita.');
  }

  return {
    ventaId: venta.id,
    total,
    totalFinal,
    descuento,
    freeCutRedeemed,
    cita: citaActualizada,
  };
};
