import React, { useState, useEffect } from 'react';
import { requestBarberoApi } from '../../utils/barbero-api-request';
import { supabase } from '../../lib/supabase';

type MetodoPago = 'efectivo' | 'transferencia' | 'fiado';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock_actual: number;
  categoria?: string;
}

interface Servicio {
  id: string;
  nombre: string;
  precio: number;
}

interface ItemVenta {
  tipo: 'servicio' | 'producto';
  id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  removable?: boolean;
  isPrincipal?: boolean;
}

interface ModalFinalizarVentaProps {
  cita: {
    id: string;
    cliente_nombre: string;
    cliente_telefono?: string;
    servicio_id?: string;
  };
  barberoId: string;
  onClose: () => void;
  onSuccess: () => void;
  servicioInicial?: Servicio | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const capitalize = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';

const buildPrincipalItem = (servicio: Servicio): ItemVenta => ({
  tipo: 'servicio',
  id: servicio.id,
  nombre: servicio.nombre,
  cantidad: 1,
  precio_unitario: servicio.precio ?? 0,
  subtotal: servicio.precio ?? 0,
  removable: false,
  isPrincipal: true,
});

const ModalFinalizarVenta: React.FC<ModalFinalizarVentaProps> = ({
  cita,
  barberoId,
  onClose,
  onSuccess,
  servicioInicial,
}) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioPrincipal, setServicioPrincipal] = useState<Servicio | null>(null);
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barberoConfig, setBarberoConfig] = useState<{ comision: number; periodo: string }>({
    comision: 0,
    periodo: 'mensual',
  });
  const [hasFreeCutBonus, setHasFreeCutBonus] = useState(false);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [infoResponse, serviciosResponse, productosResponse] = await Promise.all([
        requestBarberoApi<{ barbero: { comision_porcentaje?: number | null; periodo_pago?: string | null } }>(
          '/api/barbero/info'
        ),
        requestBarberoApi<{ servicios: Servicio[] }>('/api/barbero/servicios'),
        requestBarberoApi<{ productos: Producto[] }>('/api/barbero/productos?stock=true'),
      ]);

      const comision = infoResponse.barbero?.comision_porcentaje ?? 0;
      const periodo = infoResponse.barbero?.periodo_pago ?? 'mensual';
      setBarberoConfig({ comision, periodo });

      setServicios(serviciosResponse.servicios || []);
      setProductos(productosResponse.productos || []);

      const servicioBase =
        servicioInicial || serviciosResponse.servicios?.find((svc) => svc.id === cita.servicio_id) || null;

      if (servicioBase) {
        setServicioPrincipal(servicioBase);
        setItems([buildPrincipalItem(servicioBase)]);
      } else {
        setItems([]);
      }

      // Verificar si el cliente asociado a la cita tiene bonos de cortes gratis disponibles
      // y si esta cita fue marcada explícitamente para usar un bono de fidelización
      try {
        const { data: citaRow, error: citaError } = await supabase
          .from('citas')
          .select('cliente_id, usar_bono_fidelizacion')
          .eq('id', cita.id)
          .maybeSingle();

        if (!citaError && citaRow?.cliente_id) {
          const { data: clienteRow, error: clienteError } = await supabase
            .from('clientes')
            .select('cortes_gratis_disponibles')
            .eq('id', citaRow.cliente_id)
            .maybeSingle();

          if (!clienteError && clienteRow && typeof clienteRow.cortes_gratis_disponibles === 'number') {
            const tieneBonos = clienteRow.cortes_gratis_disponibles > 0;
            const citaMarcadaParaUsarBono = Boolean(citaRow.usar_bono_fidelizacion);
            setHasFreeCutBonus(tieneBonos && citaMarcadaParaUsarBono);
          } else {
            setHasFreeCutBonus(false);
          }
        } else {
          setHasFreeCutBonus(false);
        }
      } catch (lookupError) {
        console.error('Error verificando bonos de cortes gratis del cliente:', lookupError);
        setHasFreeCutBonus(false);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No pudimos cargar los datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const actualizarCantidad = (itemId: string, tipo: 'servicio' | 'producto', nuevaCantidad: number) => {
    const target = items.find((item) => item.id === itemId && item.tipo === tipo);
    if (!target) return;

    if (target.removable === false && nuevaCantidad < 1) {
      setError('El servicio principal no puede eliminarse.');
      return;
    }

    if (nuevaCantidad < 1) {
      eliminarItem(itemId, tipo);
      return;
    }

    if (tipo === 'producto') {
      const producto = productos.find((p) => p.id === itemId);
      if (producto && nuevaCantidad > producto.stock_actual) {
        setError(`Stock insuficiente de ${producto.nombre}`);
        return;
      }
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId && item.tipo === tipo
          ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precio_unitario }
          : item
      )
    );
  };

  const eliminarItem = (itemId: string, tipo: 'servicio' | 'producto') => {
    const target = items.find((item) => item.id === itemId && item.tipo === tipo);
    if (target?.removable === false) {
      setError('No puedes eliminar el servicio principal.');
      return;
    }
    setItems((prev) => prev.filter((item) => !(item.id === itemId && item.tipo === tipo)));
  };

  const agregarServicio = (servicio: Servicio) => {
    if (!servicioPrincipal) {
      setServicioPrincipal(servicio);
      setItems([buildPrincipalItem(servicio)]);
      return;
    }

    if (servicio.id === servicioPrincipal.id) {
      setError('El servicio principal ya está agregado.');
      return;
    }

    setItems((prev) => {
      const existente = prev.find((item) => item.tipo === 'servicio' && item.id === servicio.id);
      if (existente) {
        return prev.map((item) =>
          item.id === servicio.id && item.tipo === 'servicio'
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
            : item
        );
      }

      return [
        ...prev,
        {
          tipo: 'servicio',
          id: servicio.id,
          nombre: servicio.nombre,
          cantidad: 1,
          precio_unitario: servicio.precio ?? 0,
          subtotal: servicio.precio ?? 0,
          removable: true,
        },
      ];
    });
  };

  const agregarProducto = (producto: Producto) => {
    setItems((prev) => {
      const existente = prev.find((item) => item.tipo === 'producto' && item.id === producto.id);
      if (existente) {
        if (existente.cantidad >= producto.stock_actual) {
          setError(`Stock insuficiente de ${producto.nombre}`);
          return prev;
        }
        return prev.map((item) =>
          item.id === producto.id && item.tipo === 'producto'
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
            : item
        );
      }

      return [
        ...prev,
        {
          tipo: 'producto',
          id: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          precio_unitario: producto.precio,
          subtotal: producto.precio,
          removable: true,
        },
      ];
    });
  };

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Comisión siempre se calcula sobre el valor bruto de la venta
    const gananciaBarbero = (subtotal * barberoConfig.comision) / 100;

    // Si el cliente tiene un bono de corte gratis disponible, se aplica un bono fijo sobre el subtotal
    // El backend aplica la misma lógica usando FREE_CUT_BONUS_AMOUNT.
    const aplicaBono = hasFreeCutBonus;
    const BONO_MONTO = 15000;
    const descuentoBono = aplicaBono ? Math.min(subtotal, BONO_MONTO) : 0;
    const totalCobrar = Math.max(0, subtotal - descuentoBono);

    return { subtotal, gananciaBarbero, aplicaBono, descuentoBono, totalCobrar };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Debe agregar al menos un servicio o producto.');
      return;
    }

    try {
      setSubmitting(true);
      const extras = items.filter((item) => item.tipo === 'servicio' && !item.isPrincipal);
      const productosSeleccionados = items.filter((item) => item.tipo === 'producto');

      await requestBarberoApi(`/api/barbero/citas/${cita.id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodoPago,
          notas: notas ? notas.trim() : undefined,
          serviciosExtra: extras.map((extra) => ({
            servicioId: extra.id,
            cantidad: extra.cantidad,
          })),
          productos: productosSeleccionados.map((producto) => ({
            productoId: producto.id,
            cantidad: producto.cantidad,
          })),
        }),
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error al finalizar venta:', err);
      setError(err.message || 'No se pudo registrar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  const { subtotal, gananciaBarbero, aplicaBono, descuentoBono, totalCobrar } = calcularTotales();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-white rounded-2xl w-full max-w-5xl max-h-[92vh] border border-zinc-800 shadow-2xl overflow-hidden">
        <div className="sticky top-0 z-10 bg-zinc-900/95 px-6 py-5 border-b border-zinc-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-400">Venta para</p>
            <h2 className="text-2xl font-semibold">{cita.cliente_nombre}</h2>
            {cita.cliente_telefono && <p className="text-sm text-zinc-500">{cita.cliente_telefono}</p>}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-sm font-medium">
              Comisión: {barberoConfig.comision}%
            </div>
            <div className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-200 text-sm">
              Periodo: {capitalize(barberoConfig.periodo)}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-full border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center"
            >
              <span className="sr-only">Cerrar</span>
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(92vh-96px)]">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
              <p className="mt-4">Cargando catálogo y configuración...</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Detalle de la venta</h3>
                    {!servicioPrincipal && (
                      <span className="text-xs text-amber-400">Selecciona un servicio principal para continuar</span>
                    )}
                  </div>
                  {items.length === 0 ? (
                    <p className="text-sm text-zinc-500">Aún no agregas servicios ni productos.</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={`${item.tipo}-${item.id}`}
                          className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 md:flex-row md:items-center"
                        >
                          <div className="flex flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-full ${
                                  item.tipo === 'servicio'
                                    ? 'bg-sky-500/20 text-sky-200'
                                    : 'bg-emerald-500/20 text-emerald-200'
                                }`}
                              >
                                {item.tipo}
                              </span>
                              {item.isPrincipal && (
                                <span className="text-[11px] uppercase tracking-wide text-amber-300">Principal</span>
                              )}
                            </div>
                            <p className="text-base font-medium text-white">{item.nombre}</p>
                            <p className="text-sm text-zinc-400">{formatCurrency(item.precio_unitario)} c/u</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1">
                              <button
                                type="button"
                                onClick={() => actualizarCantidad(item.id, item.tipo, item.cantidad - 1)}
                                className="h-7 w-7 text-lg text-white/70 disabled:text-zinc-600"
                                disabled={item.isPrincipal && item.cantidad === 1}
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => actualizarCantidad(item.id, item.tipo, item.cantidad + 1)}
                                className="h-7 w-7 text-lg text-white/70"
                              >
                                +
                              </button>
                            </div>
                            <p className="w-28 text-right text-base font-semibold text-white">
                              {formatCurrency(item.subtotal)}
                            </p>
                            {item.removable !== false && (
                              <button
                                type="button"
                                onClick={() => eliminarItem(item.id, item.tipo)}
                                className="text-sm text-red-400 hover:text-red-300"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <label className="text-sm font-medium text-zinc-300">Método de pago</label>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          { value: 'efectivo', label: 'Efectivo', icon: '💵' },
                          { value: 'transferencia', label: 'Transferencia', icon: '🏦' },
                          { value: 'fiado', label: 'Fiado', icon: '📝' },
                        ] as { value: MetodoPago; label: string; icon: string }[]
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMetodoPago(option.value)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition ${
                            metodoPago === option.value
                              ? 'border-emerald-400 bg-emerald-500/10 text-white'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-emerald-400/40'
                          }`}
                        >
                          <span className="text-lg">{option.icon}</span>
                          <span className="text-sm font-semibold">{option.label}</span>
                        </button>
                      ))}
                    </div>
                    {metodoPago === 'fiado' && (
                      <p className="mt-3 text-xs text-amber-300">
                        Esta venta quedará marcada como pendiente de pago.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <label className="text-sm font-medium text-zinc-300">Notas para esta venta</label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-emerald-400 focus:ring-0"
                      placeholder="Ej: Cliente solicita seguimiento en 15 días..."
                    />
                  </div>

                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                    <h3 className="text-lg font-semibold text-white">Resumen</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between text-zinc-300">
                        <span>Subtotal</span>
                        <span className="font-medium text-white">{formatCurrency(subtotal)}</span>
                      </div>

                      {aplicaBono && (
                        <div className="flex justify-between text-emerald-300">
                          <span>Bono corte gratis</span>
                          <span className="font-semibold">- {formatCurrency(descuentoBono)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-emerald-300">
                        <span>Ganancia ({barberoConfig.comision}%)</span>
                        <span className="font-semibold">{formatCurrency(gananciaBarbero)}</span>
                      </div>

                      <div className="flex justify-between border-t border-emerald-500/30 pt-3 text-base font-bold">
                        <span>Total a cobrar</span>
                        <span>{formatCurrency(totalCobrar)}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">Servicios</h3>
                    <span className="text-xs text-zinc-500">Selecciona adicionales</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {servicios.length === 0 && (
                      <p className="text-sm text-zinc-500">No hay servicios disponibles.</p>
                    )}
                    {servicios.map((servicio) => (
                      <button
                        key={servicio.id}
                        type="button"
                        onClick={() => agregarServicio(servicio)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left hover:border-emerald-400/60"
                      >
                        <p className="text-sm font-semibold text-white">{servicio.nombre}</p>
                        <p className="text-xs text-zinc-500">{formatCurrency(servicio.precio)}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <h3 className="mb-3 text-base font-semibold">Productos</h3>
                  <div className="grid gap-3 max-h-64 overflow-y-auto pr-1 md:grid-cols-2">
                    {productos.length === 0 && (
                      <p className="text-sm text-zinc-500">No hay productos con stock.</p>
                    )}
                    {productos.map((producto) => (
                      <button
                        key={producto.id}
                        type="button"
                        onClick={() => agregarProducto(producto)}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left hover:border-emerald-400/60"
                      >
                        <p className="text-sm font-semibold text-white">{producto.nombre}</p>
                        <p className="text-xs text-zinc-500">{formatCurrency(producto.precio)}</p>
                        <p className="text-xs text-zinc-500">Stock: {producto.stock_actual}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {!loading && (
            <div className="mt-6 flex flex-col gap-3 border-t border-zinc-800 pt-4 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 md:w-auto"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {submitting ? 'Registrando...' : 'Finalizar venta'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ModalFinalizarVenta;
