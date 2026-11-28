import { useState } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import type { UpcomingItem } from '@/types/catalog';
import { useCatalog } from '@/context/CatalogContext';
import { buildUpcomingNotifyUrl } from '@/utils/whatsapp';
import { trackProductSignal } from '@/utils/analytics';

interface UpcomingCardProps {
  item: UpcomingItem;
  whatsappPhone: string;
}

function UpcomingCard({ item, whatsappPhone }: UpcomingCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imgError;
  const badgeLabel = item.badge?.trim() || 'Próximamente';
  const notifyUrl = buildUpcomingNotifyUrl(item.title, whatsappPhone);

  return (
    <article className="bg-[#FAF7F2] border border-[#E5DCCB] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      {showImage ? (
        <>
          <div>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1D120D]">
              <img
                src={item.imageUrl!}
                alt={item.title}
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
              />
              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#A64B2A] text-[#FAF7F2] shadow-xs">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  <span>{badgeLabel}</span>
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FAF7F2]/90 text-[#A64B2A] border border-[#E5DCCB] backdrop-blur-xs">
                  Sin Gluten
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-2">
              <h3 className="font-serif italic font-bold text-2xl text-[#1D120D] leading-tight">
                {item.title}
              </h3>
              {item.description && (
                <p className="font-sans text-xs sm:text-sm text-[#6B574B] leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="p-6 sm:p-7 flex-1 flex flex-col space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#A64B2A]/10 text-[#A64B2A] border border-[#A64B2A]/20">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              <span>{badgeLabel}</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A653E]">
              100% Sin Gluten
            </span>
          </div>

          <div className="pt-3 border-t border-[#E5DCCB]/80 space-y-2">
            <h3 className="font-serif italic font-bold text-2xl sm:text-[26px] text-[#1D120D] leading-tight">
              {item.title}
            </h3>
            {item.description && (
              <p className="font-sans text-xs sm:text-sm text-[#6B574B] leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-[#E5DCCB]/60 mt-auto">
        <a
          href={notifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackProductSignal(`upcoming:${item.id}`, item.title, 'upcoming_notify')}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#E5DCCB] bg-white hover:bg-[#A64B2A] hover:border-[#A64B2A] text-[#1D120D] hover:text-[#FAF7F2] font-semibold px-4 py-2.5 text-xs sm:text-sm transition-all duration-200 active:scale-95 shadow-2xs"
        >
          <Bell className="w-3.5 h-3.5 text-[#A64B2A] group-hover:text-current transition-colors" aria-hidden="true" />
          <span>Avisame cuando salga</span>
        </a>
      </div>
    </article>
  );
}

export function UpcomingSection() {
  const { upcomingItems, business } = useCatalog();
  const activeItems = upcomingItems.filter((item) => item.active === true);

  if (activeItems.length === 0) {
    return null;
  }

  const gridColsClass =
    activeItems.length === 1
      ? 'grid-cols-1 max-w-md mx-auto'
      : activeItems.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id="proximamente"
      aria-labelledby="upcoming-section-title"
      className="bg-[#F4EFE6] text-[#1D120D] py-14 sm:py-18 lg:py-20 px-4 sm:px-6 lg:px-8 border-t border-[#E5DCCB] scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#A64B2A]/10 text-[#A64B2A] border border-[#A64B2A]/20">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Próximamente · Nuevos ingresos</span>
          </div>

          <h2
            id="upcoming-section-title"
            className="font-serif italic font-bold text-3xl sm:text-4xl lg:text-5xl text-[#1D120D] tracking-tight leading-tight"
          >
            Nuevos sabores en preparación
          </h2>

          <p className="font-sans text-sm sm:text-base text-[#6B574B] leading-relaxed">
            Estamos desarrollando nuevas recetas artesanales 100% Sin Gluten. Si querés probar alguna
            apenas salga la primera tanda, pedinos que te avisemos.
          </p>
        </div>

        <div className={`grid ${gridColsClass} gap-6 sm:gap-8 items-stretch`}>
          {activeItems.map((item) => (
            <UpcomingCard
              key={item.id}
              item={item}
              whatsappPhone={business.whatsappPhone}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default UpcomingSection;
