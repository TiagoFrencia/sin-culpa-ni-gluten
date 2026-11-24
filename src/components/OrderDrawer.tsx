import { useState, useEffect, useRef } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Truck,
  Store,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { formatPriceARS } from '@/config/business';
import { buildCartOrderUrl } from '@/utils/whatsapp';
import { trackMetric, recordOrderIntent } from '@/utils/analytics';
import { MediaImage } from '@/components/MediaImage';
import type { DeliveryMethod } from '@/types/order';

export function OrderDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    incrementItem,
    decrementItem,
    removeItem,
    clearOrder,
    totalItems,
    subtotal,
    isEmpty,
  } = useOrder();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('envio');
  const [addressOrZone, setAddressOrZone] = useState('');
  const [note, setNote] = useState('');

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Bloqueo de scroll y listener de Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };

    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      // Auto-focus accesible en botón de cierre
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) {
    return null;
  }

  const orderWhatsAppUrl = buildCartOrderUrl(items, {
    deliveryMethod,
    addressOrZone,
    note,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop con desenfoque suave y cierre por clic */}
      <div
        className="fixed inset-0 bg-espresso-950/70 backdrop-blur-xs transition-opacity duration-300 motion-reduce:transition-none"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Panel Deslizable (Full-height en desktop max-w-md, bottom-sheet/full-screen en móvil) */}
      <div
        ref={drawerRef}
        id="order-drawer-content"
        data-testid="order-drawer-panel"
        className="relative w-full max-w-md bg-cream-50 h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-cream-200 transition-transform duration-300 ease-out motion-reduce:transition-none animate-in slide-in-from-right"
      >
        {/* Cabecera del Drawer */}
        <header className="p-4 sm:p-5 border-b border-cream-200 bg-cream-100/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-terracotta-600/15 border border-terracotta-600/30 flex items-center justify-center text-terracotta-600">
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="order-drawer-title"
                className="font-serif italic font-bold text-xl sm:text-2xl text-ink-900 leading-tight"
              >
                Tu Pedido
              </h2>
              <span className="text-[11px] font-semibold text-ink-600 uppercase tracking-wider block">
                {totalItems} {totalItems === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEmpty && (
              <button
                type="button"
                onClick={clearOrder}
                title="Vaciar todo el pedido"
                className="text-xs text-ink-600 hover:text-sintacc-red transition-colors px-2 py-1 rounded-md hover:bg-cream-200/50"
              >
                Vaciar
              </button>
            )}

            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDrawer}
              aria-label="Cerrar pedido"
              className="w-9 h-9 rounded-full bg-cream-50 border border-cream-200 text-ink-600 hover:text-ink-900 hover:bg-cream-100 flex items-center justify-center transition-colors shadow-2xs active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {isEmpty ? (
            /* Estado Vacío */
            <div className="text-center py-16 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-cream-200/60 border border-cream-200 flex items-center justify-center text-ink-600 mx-auto">
                <ShoppingBag className="w-8 h-8 opacity-60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif italic font-bold text-xl text-ink-900">
                  Tu pedido está vacío
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 max-w-xs mx-auto leading-relaxed">
                  Sumá tus platos caseros favoritos o elegí un combo conveniente para llenar tu freezer.
                </p>
              </div>
              <a
                href="#menu"
                onClick={closeDrawer}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95"
              >
                Explorar el menú
              </a>
            </div>
          ) : (
            <>
              {/* Lista de Ítems */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                  <span>Productos ({totalItems})</span>
                  <span>Subtotal</span>
                </div>

                <div className="divide-y divide-cream-200/80 border-y border-cream-200/80">
                  {items.map((item) => {
                    const itemTotal = item.unitPrice * item.quantity;
                    return (
                      <div
                        key={item.itemKey}
                        className="py-3.5 flex items-start gap-3 justify-between"
                      >
                        {/* Miniatura del producto */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-espresso-900 border border-cream-200 shrink-0">
                          <MediaImage
                            src={item.image}
                            alt={item.name}
                            fallbackTitle={item.name}
                            aspectRatioClass="aspect-square"
                            compact
                          />
                        </div>

                        {/* Detalle y controles */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-sm text-ink-900 leading-snug truncate">
                            {item.name}
                          </h4>

                          <p className="text-xs text-ink-600 leading-tight mt-0.5">
                            {item.type === 'combo' || item.variantLabel === 'Combo'
                              ? 'Pack combo'
                              : item.variantLabel}
                            {item.flavor && (
                              <span className="font-medium text-terracotta-600 ml-1">
                                • {item.flavor}
                              </span>
                            )}
                          </p>

                          <div className="flex items-center gap-3 mt-2.5">
                            {/* Selector compacto de cantidad - qty + */}
                            <div className="inline-flex items-center rounded-lg bg-cream-100 border border-cream-200 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => decrementItem(item.itemKey)}
                                aria-label={`Disminuir cantidad de ${item.name}`}
                                className="w-7 h-7 flex items-center justify-center text-ink-600 hover:text-ink-900 hover:bg-cream-200/60 rounded-l-lg transition-colors active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-ink-900 select-none">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementItem(item.itemKey)}
                                aria-label={`Aumentar cantidad de ${item.name}`}
                                className="w-7 h-7 flex items-center justify-center text-ink-600 hover:text-ink-900 hover:bg-cream-200/60 rounded-r-lg transition-colors active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Botón eliminar individual */}
                            <button
                              type="button"
                              onClick={() => removeItem(item.itemKey)}
                              aria-label={`Eliminar ${item.name} del pedido`}
                              title="Eliminar del pedido"
                              className="text-ink-600 hover:text-sintacc-red transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Subtotal por línea */}
                        <div className="text-right shrink-0">
                          <span className="font-sans font-semibold tabular-nums text-sm sm:text-base text-ink-900 block">
                            {formatPriceARS(itemTotal)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] font-sans tabular-nums text-ink-600/80 block">
                              {formatPriceARS(item.unitPrice)} c/u
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selector Táctil de Modalidad de Entrega */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-semibold text-ink-600 uppercase tracking-wider block">
                  Modalidad de entrega en Río Cuarto:
                </label>

                <div
                  role="radiogroup"
                  aria-label="Modalidad de entrega"
                  className="grid grid-cols-2 gap-2"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={deliveryMethod === 'envio'}
                    onClick={() => setDeliveryMethod('envio')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 ${
                      deliveryMethod === 'envio'
                        ? 'bg-cream-100/90 border-terracotta-600 ring-1 ring-terracotta-600 shadow-xs'
                        : 'bg-cream-50 border-cream-200 hover:border-ink-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Truck
                        className={`w-4 h-4 ${
                          deliveryMethod === 'envio' ? 'text-terracotta-600' : 'text-ink-600'
                        }`}
                      />
                      <span className="text-[10px] font-bold uppercase text-olive-600 bg-olive-600/10 px-1.5 py-0.5 rounded-full">
                        Gratis
                      </span>
                    </div>
                    <span className="font-serif font-bold text-xs sm:text-sm text-ink-900 block leading-tight">
                      Envío a domicilio
                    </span>
                    <span className="text-[10px] text-ink-600 mt-0.5">En todo Río Cuarto</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={deliveryMethod === 'retiro'}
                    onClick={() => setDeliveryMethod('retiro')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 ${
                      deliveryMethod === 'retiro'
                        ? 'bg-cream-100/90 border-terracotta-600 ring-1 ring-terracotta-600 shadow-xs'
                        : 'bg-cream-50 border-cream-200 hover:border-ink-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Store
                        className={`w-4 h-4 ${
                          deliveryMethod === 'retiro' ? 'text-terracotta-600' : 'text-ink-600'
                        }`}
                      />
                      <span className="text-[10px] font-bold uppercase text-ink-600 bg-cream-200/50 px-1.5 py-0.5 rounded-full">
                        Coordinar
                      </span>
                    </div>
                    <span className="font-serif font-bold text-xs sm:text-sm text-ink-900 block leading-tight">
                      Retiro en punto
                    </span>
                    <span className="text-[10px] text-ink-600 mt-0.5">Horario a acordar</span>
                  </button>
                </div>

                {/* Input condicional: Dirección / Barrio para envío */}
                {deliveryMethod === 'envio' && (
                  <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                    <label
                      htmlFor="address-input"
                      className="text-[11px] font-medium text-ink-600 block"
                    >
                      Barrio o dirección (opcional):
                    </label>
                    <input
                      id="address-input"
                      type="text"
                      value={addressOrZone}
                      onChange={(e) => setAddressOrZone(e.target.value)}
                      placeholder="Ej: Banda Norte, Centro, Alberdi..."
                      className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-ink-900 placeholder:text-ink-600/50 focus:outline-hidden focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Campo opcional de aclaraciones */}
              <div className="space-y-1 pt-1">
                <label
                  htmlFor="notes-input"
                  className="text-[11px] font-medium text-ink-600 block"
                >
                  Aclaraciones o consultas (opcional):
                </label>
                <textarea
                  id="notes-input"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Quisiera sumar un pan integral o consultar por pack de 500g"
                  className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-ink-900 placeholder:text-ink-600/50 focus:outline-hidden focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 shadow-2xs resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Fijo en la parte inferior del Drawer */}
        {!isEmpty && (
          <footer className="p-3.5 sm:p-4 border-t border-cream-200 bg-cream-100/95 shadow-lg space-y-2.5 shrink-0">
            {/* Resumen de costos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-ink-600">
                <span>Subtotal ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})</span>
                <span className="font-sans font-semibold tabular-nums text-ink-900">{formatPriceARS(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-600">
                  {deliveryMethod === 'envio' ? 'Envío en Río Cuarto' : 'Retiro acordado'}
                </span>
                <span className="font-semibold text-olive-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gratis
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-cream-200">
                <span className="font-serif italic font-bold text-base text-ink-900">
                  Total estimado
                </span>
                <span className="font-sans font-bold tabular-nums text-xl sm:text-2xl text-terracotta-700">
                  {formatPriceARS(subtotal)}
                </span>
              </div>
            </div>

            {/* Nota de transparencia celíaca y operativa */}
            <p className="text-[11px] text-ink-600 text-center leading-snug px-1">
              No se cobra nada en la web. Confirmamos stock, horario y medio de pago directo por WhatsApp.
            </p>

            {/* CTA Principal Ancho Completo */}
            <a
              href={orderWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-order-cta"
              onClick={() => {
                trackMetric('whatsapp_clicks');
                recordOrderIntent({
                  items,
                  totalArs: subtotal,
                  itemsCount: totalItems,
                  source: 'carrito',
                });
              }}
              className="w-full inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold py-3 sm:py-3.5 px-4 rounded-full text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-98 text-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
            >
              <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Enviar pedido por WhatsApp</span>
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}

export default OrderDrawer;
