import { Truck, ShieldCheck } from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';

export function AnnouncementBar() {
  const { business } = useCatalog();

  if (business.isAcceptingOrders === false) {
    return (
      <aside
        aria-label="Aviso de pedidos pausados"
        className="bg-[#A64B2A] text-cream-50 text-xs sm:text-sm font-medium tracking-wide py-2.5 px-3 sm:px-4 border-b border-[#8C3D21] relative z-30 select-none shadow-xs"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center flex-wrap gap-x-2 gap-y-0.5 text-center leading-normal">
          <span className="inline-flex items-center gap-1.5 font-bold bg-black/20 px-2 py-0.5 rounded-full text-[11px] sm:text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
            <span>Agenda Completa</span>
          </span>
          <span className="text-cream-100 font-medium text-xs sm:text-sm">
            {business.pauseMessage || 'Estamos con agenda completa por hoy. Volvemos a tomar pedidos muy pronto.'}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Aviso destacado"
      className="bg-terracotta-600 text-cream-50 text-xs sm:text-sm font-medium tracking-wide py-2 px-3 sm:px-4 border-b border-terracotta-700/70 relative z-30 select-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-center leading-normal">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Truck className="w-3.5 h-3.5 text-cream-100 shrink-0" aria-hidden="true" />
          <span>{business.deliveryHighlight}</span>
        </span>

        <span className="text-cream-200/50 hidden sm:inline" aria-hidden="true">
          •
        </span>

        <span className="inline-flex items-center gap-1.5 text-cream-100/95 text-[11px] sm:text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-cream-100 shrink-0" aria-hidden="true" />
          <span>Cocina 100% libre de contaminación cruzada</span>
        </span>
      </div>
    </aside>
  );
}

export default AnnouncementBar;
