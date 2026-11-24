import { Truck, ShieldCheck } from 'lucide-react';
import { BUSINESS_CONFIG } from '@/config/business';

export function AnnouncementBar() {
  return (
    <aside
      aria-label="Aviso destacado"
      className="bg-terracotta-600 text-cream-50 text-xs sm:text-sm font-medium tracking-wide py-2 px-3 sm:px-4 border-b border-terracotta-700/70 relative z-30 select-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-center leading-normal">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Truck className="w-3.5 h-3.5 text-cream-100 shrink-0" aria-hidden="true" />
          <span>{BUSINESS_CONFIG.deliveryHighlight}</span>
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
