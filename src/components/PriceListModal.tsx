import { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  UtensilsCrossed,
  Sparkles,
  PackageCheck,
} from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import { formatPriceARS } from '@/config/business';
import { exportPriceListFlyer } from '@/utils/priceListExport';
import { trackMetric } from '@/utils/analytics';
import type { Product, Combo, ProductCategory } from '@/types/catalog';
import type { BusinessConfig } from '@/config/business';

interface PriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_SECTIONS: { category: ProductCategory; label: string; icon: string }[] = [
  { category: 'milanesas', label: 'Milanesas Caseras', icon: '🥩' },
  { category: 'hamburguesas', label: 'Hamburguesas', icon: '🍔' },
  { category: 'empanadas', label: 'Empanadas', icon: '🥟' },
  { category: 'pizzas', label: 'Pizzas & Prepizzas', icon: '🍕' },
  { category: 'panaderia', label: 'Panadería', icon: '🥖' },
  { category: 'especiales', label: 'Platos Especiales', icon: '✨' },
];

function generatePlainTextList(
  products: Product[],
  combos: Combo[],
  business: BusinessConfig
): string {
  const activeProducts = products.filter((p) => p.available !== false);
  const activeCombos = combos.filter((c) => c.available !== false);

  let text = `🌱 ${business.brandName} - Lista Oficial de Precios\n`;
  text += `100% Libre de Gluten / Sin TACC • ${business.city}\n`;
  text += `¡Envío a domicilio sin cargo en Río Cuarto!\n\n`;

  for (const sec of CATEGORY_SECTIONS) {
    const prods = activeProducts.filter((p) => p.category === sec.category);
    if (prods.length === 0) continue;
    text += `${sec.icon} ${sec.label}:\n`;
    for (const p of prods) {
      const variantsText = p.variants
        .map((v) => `${v.label}: ${v.price !== null ? formatPriceARS(v.price) : 'Consultar'}`)
        .join(' | ');
      text += `  • ${p.name} → ${variantsText}\n`;
    }
    text += `\n`;
  }

  if (activeCombos.length > 0) {
    text += `📦 Combos para Freezer (Envío Gratis Incluido):\n`;
    for (const c of activeCombos) {
      const price = c.promoPrice ?? c.regularPrice;
      text += `  • ${c.name}: ${formatPriceARS(price)} (${c.subtitle})\n`;
    }
    text += `\n`;
  }

  const phone = business.whatsappDisplay || business.whatsappPhone;
  text += `📲 Pedidos y Consultas por WhatsApp: ${phone}\n`;
  text += `📸 Instagram: ${business.instagramHandle}\n`;
  text += `🌐 Tienda: https://sin-culpa-ni-gluten.vercel.app`;

  return text;
}

function getCurrentDateFormatted(): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function PriceListModal({ isOpen, onClose }: PriceListModalProps) {
  const { products, combos, business } = useCatalog();
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isDownloadingFlyer, setIsDownloadingFlyer] = useState(false);
  const [fechaActual] = useState(getCurrentDateFormatted);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Instrumentación silenciosa de analítica: apertura de lista de precios
    trackMetric('pricelist_opens');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeProducts = products.filter((p) => p.available !== false);
  const activeCombos = combos.filter((c) => c.available !== false);

  const handleCopyText = async () => {
    const text = generatePlainTextList(products, combos, business);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.warn('Error al copiar texto:', err);
    }
  };

  const handleDownloadFlyer = async () => {
    try {
      setIsDownloadingFlyer(true);
      await exportPriceListFlyer(products, combos, business);
    } catch (err) {
      console.error('Error al descargar flyer:', err);
    } finally {
      setIsDownloadingFlyer(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Lista de Precios - ${business.brandName}`,
      text: `Mirá la lista de precios en vivo de comidas caseras 100% Sin TACC de ${business.brandName} (${business.city}):`,
      url: window.location.href,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          window.open(
            `https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`,
            '_blank'
          );
        }
      }
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`,
        '_blank'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-list-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-espresso-950/85 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor Modal */}
      <div className="relative w-full max-w-2xl bg-cream-50 rounded-2xl sm:rounded-3xl border border-cream-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 fade-in duration-200">
        {/* Barra superior editorial */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-cream-200 bg-cream-100/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-terracotta-600/10 border border-terracotta-600/20 flex items-center justify-center text-terracotta-600 shrink-0">
              <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="price-list-modal-title"
                className="font-serif italic font-bold text-lg sm:text-xl text-ink-900 leading-tight truncate"
              >
                Carta y Lista de Precios en Vivo
              </h2>
              <p className="text-[11px] text-ink-600 truncate">
                100% Sin TACC • Elaboración casera en {business.city}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar lista de precios"
            className="p-2 rounded-full text-ink-600 hover:text-ink-900 hover:bg-cream-200/50 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600 shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido scrolleable: Carta editorial generada en vivo */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 bg-cream-50/50 text-ink-900">
          {/* Banner de Envío Gratis */}
          <div className="bg-olive-600/10 border border-olive-600/20 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-olive-600 shrink-0" />
              <span className="text-xs font-semibold text-olive-900">
                ¡Envíos gratis en todo Río Cuarto! Precios vigentes sincronizados en directo.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-olive-700 bg-olive-600/20 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block">
              En Vivo
            </span>
          </div>

          {/* Categorías de Productos */}
          <div className="space-y-6">
            {CATEGORY_SECTIONS.map((sec) => {
              const catProducts = activeProducts.filter((p) => p.category === sec.category);
              if (catProducts.length === 0) return null;

              return (
                <div key={sec.category} className="space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-cream-200 pb-1.5">
                    <span className="text-base" aria-hidden="true">
                      {sec.icon}
                    </span>
                    <h3 className="font-serif italic font-bold text-base sm:text-lg text-ink-900">
                      {sec.label}
                    </h3>
                  </div>

                  <div className="divide-y divide-cream-200/60 bg-white rounded-xl border border-cream-200 shadow-2xs overflow-hidden">
                    {catProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-cream-100/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-bold text-xs sm:text-sm text-ink-900">
                              {prod.name}
                            </h4>
                            {prod.badge && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-terracotta-600/10 text-terracotta-600">
                                {prod.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-600 line-clamp-1 mt-0.5">
                            {prod.shortDescription}
                          </p>
                        </div>

                        {/* Variantes y Precios */}
                        <div className="flex items-center gap-2 flex-wrap sm:justify-end shrink-0 pt-1 sm:pt-0">
                          {prod.variants.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center gap-1.5 text-xs bg-cream-100 px-2.5 py-1 rounded-lg border border-cream-200"
                            >
                              <span className="text-ink-600 text-[11px]">{v.label}:</span>
                              <strong className="text-ink-900 font-bold tabular-nums">
                                {v.price !== null ? formatPriceARS(v.price) : 'Consultar'}
                              </strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sección de Combos para Freezer */}
          {activeCombos.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b border-cream-200 pb-1.5">
                <Sparkles className="w-4 h-4 text-terracotta-600" />
                <h3 className="font-serif italic font-bold text-base sm:text-lg text-ink-900">
                  Combos para Freezer
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCombos.map((combo) => {
                  const finalPrice = combo.promoPrice ?? combo.regularPrice;
                  return (
                    <div
                      key={combo.id}
                      className="bg-white rounded-xl border border-cream-200 p-3.5 shadow-2xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif font-bold text-sm text-ink-900 leading-snug">
                            {combo.name}
                          </h4>
                          {combo.badge && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-olive-600/15 text-olive-700 shrink-0">
                              {combo.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-600 line-clamp-2">
                          {combo.subtitle}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-cream-100 flex items-baseline justify-between">
                        <span className="text-[11px] text-olive-600 font-semibold">
                          Envío gratis
                        </span>
                        <div className="text-right">
                          {combo.promoPrice && (
                            <span className="text-[11px] text-ink-600/60 line-through mr-1.5">
                              {formatPriceARS(combo.regularPrice)}
                            </span>
                          )}
                          <span className="font-sans font-bold tabular-nums text-sm sm:text-base text-terracotta-700">
                            {formatPriceARS(finalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pie de Nota con Fecha de Actualización */}
          <div className="pt-4 border-t border-cream-200 text-center space-y-1">
            <p className="text-[11px] text-ink-600">
              Precios vigentes y actualizados al <strong>{fechaActual}</strong>.
            </p>
            <p className="text-[11px] text-ink-600">
              Los pedidos se coordinan y confirman vía WhatsApp con entregas programadas.
            </p>
          </div>
        </div>

        {/* Barra Inferior de Acciones */}
        <div className="px-4 sm:px-6 py-3.5 bg-cream-100/80 border-t border-cream-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Botón Copiar como texto */}
          <button
            type="button"
            onClick={handleCopyText}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-cream-200 bg-white hover:bg-cream-100 text-ink-900 font-semibold px-3 py-2 rounded-xl text-xs transition-all shadow-2xs active:scale-95"
            title="Copiar lista de precios en formato texto para pegar en WhatsApp"
          >
            {copySuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#A64B2A]" />
                <span>Copiar lista como texto</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Botón Descargar Flyer para Estados / IG */}
            <button
              type="button"
              onClick={handleDownloadFlyer}
              disabled={isDownloadingFlyer}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-[#A64B2A]/40 bg-white hover:bg-amber-50/50 text-[#A64B2A] font-semibold px-3.5 py-2 rounded-xl text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50"
              title="Generar y descargar imagen vertical 1080x1920 para Estados de WhatsApp e Historias de Instagram"
            >
              <Download className="w-3.5 h-3.5 text-[#A64B2A]" />
              <span>{isDownloadingFlyer ? 'Generando imagen...' : 'Descargar flyer para Estados / IG'}</span>
            </button>

            {/* Botón Compartir enlace */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-1.5 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-3.5 py-2 rounded-xl text-xs transition-all shadow-2xs active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{shareSuccess ? '¡Enviado!' : 'Compartir'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PriceListModal;
