import { ShoppingBag, ArrowRight, MessageCircle } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { formatPriceARS } from '@/config/business';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';

export function FloatingOrderBar() {
  const { totalItems, subtotal, openDrawer } = useOrder();
  const whatsappUrl = buildGeneralInquiryUrl();

  if (totalItems > 0) {
    return (
      <aside
        aria-label="Resumen de pedido flotante"
        className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none transition-all duration-300"
      >
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="bg-[#1D120D] text-cream-50 border border-cream-200/20 rounded-2xl sm:rounded-full px-4 py-3 sm:px-6 sm:py-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Información del pedido: badge, subtotal y etiqueta de envío */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-terracotta-600/20 border border-terracotta-600/40 flex items-center justify-center text-terracotta-500">
                  <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                </div>
                <span
                  data-testid="floating-order-count"
                  className="absolute -top-1 -right-1 bg-terracotta-600 text-cream-50 text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-[20px] text-center leading-tight shadow-xs"
                >
                  {totalItems}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wider text-cream-200/60 font-semibold hidden sm:inline">
                    Subtotal estimado:
                  </span>
                  <span
                    data-testid="floating-order-subtotal"
                    className="font-serif italic font-bold text-lg sm:text-xl text-cream-50 tracking-tight"
                  >
                    {formatPriceARS(subtotal)}
                  </span>
                </div>
                <span className="text-[11px] text-olive-400 font-medium block leading-tight truncate">
                  Envío gratis en Río Cuarto
                </span>
              </div>
            </div>

            {/* Botón Ver mi pedido */}
            <button
              type="button"
              onClick={openDrawer}
              data-testid="open-order-drawer-btn"
              className="inline-flex items-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm shadow-md transition-all active:scale-95 shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
            >
              <span>Ver mi pedido</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Estado vacío: Botón discreto flotante de WhatsApp en la esquina inferior derecha
  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Consultar por WhatsApp"
        className="inline-flex items-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 p-3 sm:px-4 sm:py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
      >
        <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline text-xs font-semibold tracking-wide">
          Consultas WhatsApp
        </span>
      </a>
    </div>
  );
}

export default FloatingOrderBar;
