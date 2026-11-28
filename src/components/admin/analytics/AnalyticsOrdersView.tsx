import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  Check,
  XCircle,
  Trash2,
  PlusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatPriceARS } from '@/config/business';
import type {
  OrderIntent,
  OrderIntentStatus,
  PaymentMethod,
  CustomerType,
} from '@/types/analytics';
import {
  NEIGHBORHOOD_OPTIONS,
  PAYMENT_METHOD_LABELS,
  CHANNEL_SHORT_BADGES,
} from '@/types/analytics';

interface AnalyticsOrdersViewProps {
  orders: OrderIntent[];
  isLoading: boolean;
  onStatusChange: (orderId: string, nextStatus: OrderIntentStatus) => Promise<void>;
  onUpdateDetails: (
    orderId: string,
    details: {
      payment_method?: PaymentMethod | null;
      neighborhood?: string | null;
      customer_type?: CustomerType | null;
    }
  ) => Promise<void>;
  onOpenNoteModal: (order: OrderIntent) => void;
  onRequestDeleteOrder: (orderId: string) => void;
  onCreateMockOrder: () => void;
}

export const AnalyticsOrdersView: React.FC<AnalyticsOrdersViewProps> = ({
  orders,
  isLoading,
  onStatusChange,
  onUpdateDetails,
  onOpenNoteModal,
  onRequestDeleteOrder,
  onCreateMockOrder,
}) => {
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'all' | OrderIntentStatus>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const displayedOrders = useMemo(() => {
    if (ordersStatusFilter === 'all') return orders;
    return orders.filter((o) => o.status === ordersStatusFilter);
  }, [orders, ordersStatusFilter]);

  const toggleOrderExpand = (id: string) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3.5 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D]">
              Conciliación de Pedidos Web
            </h3>
            <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full tabular-nums">
              {displayedOrders.length} {displayedOrders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Controlá estado, medio de pago, barrio y cliente nuevo o recurrente.
          </p>
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'pendiente', label: 'Pendientes' },
              { id: 'confirmado', label: 'Confirmados' },
              { id: 'cancelado', label: 'Cancelados' },
            ] as const
          ).map((st) => {
            const isActive = ordersStatusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setOrdersStatusFilter(st.id)}
                className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-stone-900 text-white font-bold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center">
          <div className="w-6 h-6 border-2 border-[#A64B2A]/30 border-t-[#A64B2A] rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Cargando registro de pedidos...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="py-8 text-center bg-stone-50/60 rounded-xl border border-stone-200/50 space-y-2">
          <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
          <p className="text-xs font-medium text-stone-600">
            No hay pedidos registrados en este período con el filtro aplicado.
          </p>
          <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
            Cuando un cliente toque &quot;Enviar pedido por WhatsApp&quot; en la tienda, aparecerá aquí al instante.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onCreateMockOrder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 shadow-2xs active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#A64B2A]" />
              <span>Crear pedido de prueba</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order) => {
            const isExpanded = Boolean(expandedOrders[order.id]);
            const d = new Date(order.created_at);
            const formattedDate = !isNaN(d.getTime())
              ? d.toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : order.created_at;

            const channelBadge = CHANNEL_SHORT_BADGES[order.channel || 'directo'] || 'Directo';

            return (
              <div
                key={order.id}
                className="rounded-xl border border-stone-200/90 bg-white p-3 sm:p-3.5 shadow-2xs space-y-2.5 transition-all"
              >
                {/* Cabecera del pedido */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-stone-900 tabular-nums">
                        {formattedDate}
                      </span>
                      <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span
                        className="text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded"
                        title="Canal de origen"
                      >
                        {channelBadge}
                      </span>
                      {order.source === 'consulta_directa' && (
                        <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-semibold">
                          Consulta directa
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-[11px] text-stone-500">
                        {order.items_count} {order.items_count === 1 ? 'ítem' : 'ítems'}
                      </span>
                      {order.payment_method && (
                        <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 rounded">
                          {PAYMENT_METHOD_LABELS[order.payment_method]}
                        </span>
                      )}
                      {order.neighborhood && (
                        <span className="text-[10px] font-medium text-stone-700 bg-stone-100 px-1.5 py-0.2 rounded">
                          {order.neighborhood}
                        </span>
                      )}
                      {order.customer_type && (
                        <span className="text-[10px] font-medium text-[#A64B2A] bg-[#A64B2A]/10 px-1.5 py-0.2 rounded capitalize">
                          {order.customer_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-sans font-bold tabular-nums text-base sm:text-lg text-[#1D120D] block leading-tight">
                      {formatPriceARS(order.total_ars)}
                    </span>
                  </div>
                </div>

                {/* Resumen de Ítems + Etiquetado rápido al expandir */}
                <div className="bg-stone-50/80 rounded-lg p-2 text-xs text-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                    <span>Detalle y datos del pedido:</span>
                    <button
                      type="button"
                      onClick={() => toggleOrderExpand(order.id)}
                      className="text-[10px] text-[#A64B2A] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                    >
                      {isExpanded ? (
                        <>
                          Ocultar <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          Detalle y pago ({order.items.length}) <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="divide-y divide-stone-200/60 space-y-1">
                        {order.items.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="pt-1 flex items-center justify-between text-[11px] gap-2"
                          >
                            <span className="text-stone-700 min-w-0">
                              <strong className="text-stone-900">{item.qty}x</strong> {item.name}
                              {item.variant && ` (${item.variant})`}
                            </span>
                            <span className="font-sans font-semibold tabular-nums text-stone-900 shrink-0">
                              {formatPriceARS(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 3 Selectores compactos de conciliación contable */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-200/80">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                            Medio de pago
                          </label>
                          <select
                            value={order.payment_method || ''}
                            onChange={(e) =>
                              onUpdateDetails(order.id, {
                                payment_method: (e.target.value || null) as PaymentMethod | null,
                              })
                            }
                            className="w-full min-h-[34px] text-xs bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-[#A64B2A]"
                          >
                            <option value="">Sin especificar</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="mercadopago">Mercado Pago</option>
                            <option value="tarjeta">Tarjeta</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                            Barrio / Zona
                          </label>
                          <select
                            value={order.neighborhood || ''}
                            onChange={(e) =>
                              onUpdateDetails(order.id, {
                                neighborhood: e.target.value || null,
                              })
                            }
                            className="w-full min-h-[34px] text-xs bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-[#A64B2A]"
                          >
                            <option value="">Sin especificar</option>
                            {NEIGHBORHOOD_OPTIONS.map((nb) => (
                              <option key={nb} value={nb}>
                                {nb}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                            Cliente
                          </label>
                          <select
                            value={order.customer_type || ''}
                            onChange={(e) =>
                              onUpdateDetails(order.id, {
                                customer_type: (e.target.value || null) as CustomerType | null,
                              })
                            }
                            className="w-full min-h-[34px] text-xs bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-[#A64B2A]"
                          >
                            <option value="">Sin especificar</option>
                            <option value="nuevo">Nuevo</option>
                            <option value="recurrente">Recurrente</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-700 truncate leading-snug">
                      {order.items
                        .map((it) => `${it.qty}x ${it.name}${it.variant ? ` (${it.variant})` : ''}`)
                        .join(', ')}
                    </p>
                  )}
                </div>

                {/* Nota interna administrativa */}
                {order.note && (
                  <div className="text-[11px] text-stone-600 bg-amber-50/60 border border-amber-200/60 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="font-bold text-amber-900 shrink-0">Nota:</span>
                    <span className="italic">{order.note}</span>
                  </div>
                )}

                {/* Acciones de Conciliación */}
                <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-2 pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onStatusChange(order.id, 'pendiente')}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        order.status === 'pendiente'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-300/40 shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>Pendiente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onStatusChange(order.id, 'confirmado')}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        order.status === 'confirmado'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-1 ring-emerald-300/40 shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span>Confirmado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onStatusChange(order.id, 'cancelado')}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        order.status === 'cancelado'
                          ? 'bg-red-100 text-red-900 border border-red-300 ring-1 ring-red-300/40 shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <XCircle className="w-3 h-3 text-red-700" />
                      <span>Cancelado</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 self-end min-[480px]:self-auto">
                    <button
                      type="button"
                      onClick={() => onOpenNoteModal(order)}
                      className="min-h-[34px] px-2 py-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                    >
                      {order.note ? 'Editar nota' : '+ Nota'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRequestDeleteOrder(order.id)}
                      className="min-h-[34px] p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar pedido de prueba"
                      aria-label="Eliminar pedido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
