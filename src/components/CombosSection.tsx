import { useState } from 'react';
import { Check, MessageCircle, ShoppingBag, Sparkles, Plus, Minus } from 'lucide-react';
import { COMBOS } from '@/data/catalog';
import type { Combo } from '@/types/catalog';
import { formatPriceARS } from '@/config/business';
import { MediaImage } from '@/components/MediaImage';
import { buildComboInquiryUrl } from '@/utils/whatsapp';
import { useOrder } from '@/context/OrderContext';
import { buildOrderItemKey } from '@/types/order';

interface CombosSectionProps {
  onAddCombo?: (combo: Combo) => void;
}

export function CombosSection({ onAddCombo }: CombosSectionProps) {
  const [addedComboId, setAddedComboId] = useState<string | null>(null);
  const { addItem, incrementItem, decrementItem, getItemQuantity } = useOrder();

  const handleAdd = (combo: Combo) => {
    const finalPrice = combo.promoPrice ?? combo.regularPrice;
    const comboItemKey = buildOrderItemKey(combo.id, 'combo', undefined);

    addItem({
      itemKey: comboItemKey,
      type: 'combo',
      id: combo.id,
      name: combo.name,
      variantLabel: 'Combo',
      unitPrice: finalPrice,
      quantity: 1,
      image: combo.image,
    });

    setAddedComboId(combo.id);
    onAddCombo?.(combo);

    setTimeout(() => {
      setAddedComboId((current) => (current === combo.id ? null : current));
    }, 1500);
  };

  return (
    <section
      id="combos"
      aria-label="Combos para freezer"
      className="bg-espresso-950 text-cream-50 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden scroll-mt-20"
    >
      {/* Resplandor ambiental de fondo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(166,75,42,0.08)_0%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Encabezado Editorial Centrado */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-terracotta-600/20 text-terracotta-600 border border-terracotta-600/30">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Packs Convenientes</span>
          </div>

          <h2 className="font-serif italic font-bold text-3xl sm:text-4xl lg:text-5xl text-cream-50 tracking-tight">
            Combos para tu Freezer
          </h2>

          <p className="font-sans text-sm sm:text-base lg:text-lg text-cream-200/85 max-w-2xl mx-auto leading-relaxed">
            Resuelven tus comidas de toda la semana con variedad casera, seguridad celíaca y envío
            gratis incluido en Río Cuarto.
          </p>
        </div>

        {/* Grilla de 3 columnas en desktop, 1 columna en móvil */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {COMBOS.map((combo) => {
            const finalPrice = combo.promoPrice ?? combo.regularPrice;
            const priceLabel = formatPriceARS(finalPrice);
            const inquiryUrl = buildComboInquiryUrl(combo.name, priceLabel);
            const isRecentlyAdded = addedComboId === combo.id;
            const comboItemKey = buildOrderItemKey(combo.id, 'combo', undefined);
            const currentQuantity = getItemQuantity(comboItemKey);

            return (
              <article
                key={combo.id}
                className="bg-espresso-900 rounded-2xl sm:rounded-3xl border border-cream-200/15 overflow-hidden flex flex-col justify-between shadow-xl shadow-black/40 hover:border-cream-200/30 transition-all duration-300 group"
              >
                {/* Cabecera con foto a sangre arriba */}
                <div>
                  <div className="relative overflow-hidden">
                    <MediaImage
                      src={combo.image}
                      alt={combo.name}
                      aspectRatioClass="aspect-4/3"
                      fallbackTitle={combo.name}
                      categoryLabel="Combo Freezer"
                      className="group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Badge destacado (oliva o terracota) */}
                    {combo.badge && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-olive-600/90 text-cream-50 border border-cream-200/20 backdrop-blur-xs shadow-xs">
                          {combo.badge}
                        </span>
                      </div>
                    )}

                    {/* Sello Sin TACC */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-espresso-950/85 text-cream-100 border border-cream-200/20 backdrop-blur-xs">
                        Sin TACC
                      </span>
                    </div>
                  </div>

                  {/* Detalle del Combo */}
                  <div className="p-6 sm:p-7 space-y-4">
                    <div>
                      <h3 className="font-serif italic font-bold text-2xl text-cream-50 leading-tight">
                        {combo.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-cream-200/75 mt-1.5 leading-relaxed">
                        {combo.subtitle}
                      </p>
                    </div>

                    {/* Lista con checkmarks de productos incluidos */}
                    <div className="space-y-2 pt-2 border-t border-cream-200/10">
                      <p className="text-xs font-semibold uppercase tracking-wider text-cream-200/50">
                        ¿Qué incluye este combo?
                      </p>
                      <ul className="space-y-2">
                        {combo.itemsIncluded.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-cream-100/90 leading-tight"
                          >
                            <span className="w-4 h-4 rounded-full bg-olive-600/20 border border-olive-600/40 flex items-center justify-center text-olive-600 shrink-0 mt-0.5">
                              <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Precio y Acciones */}
                <div className="p-6 sm:p-7 pt-0 space-y-4 border-t border-cream-200/10 mt-auto">
                  <div className="pt-4 flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-xs text-cream-200/70 block">Precio final</span>
                      <span className="font-serif italic font-bold text-3xl sm:text-4xl text-cream-50">
                        {priceLabel}
                      </span>
                    </div>

                    <span className="text-[11px] font-medium text-olive-600 bg-olive-600/15 border border-olive-600/30 px-2.5 py-1 rounded-full text-right">
                      Envío gratis en Río Cuarto
                    </span>
                  </div>

                  {/* Acciones principales */}
                  <div className="space-y-2.5 pt-1">
                    {/* Botón Principal: Selector compacto (- qty +) si ya está en pedido, o Sumar al pedido */}
                    {currentQuantity > 0 ? (
                      <div
                        className="w-full flex items-center justify-between bg-espresso-950 border border-terracotta-600/50 rounded-full p-1.5 shadow-inner transition-all duration-200"
                        data-testid={`quantity-selector-${combo.id}`}
                      >
                        <button
                          type="button"
                          onClick={() => decrementItem(comboItemKey)}
                          aria-label={`Disminuir cantidad de ${combo.name}`}
                          className="w-9 h-9 rounded-full bg-espresso-900 hover:bg-espresso-800 text-cream-100 border border-cream-200/20 flex items-center justify-center transition-all active:scale-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
                        >
                          <Minus className="w-4 h-4" aria-hidden="true" />
                        </button>

                        <span className="font-serif italic font-bold text-sm sm:text-base text-cream-50 px-3 select-none">
                          {currentQuantity} en tu pedido
                        </span>

                        <button
                          type="button"
                          onClick={() => incrementItem(comboItemKey)}
                          aria-label={`Aumentar cantidad de ${combo.name}`}
                          className="w-9 h-9 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 flex items-center justify-center transition-all active:scale-90 shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
                        >
                          <Plus className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(combo)}
                        data-testid={`add-to-cart-${combo.id}`}
                        className={`w-full inline-flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-full text-sm transition-all duration-200 active:scale-95 shadow-md ${
                          isRecentlyAdded
                            ? 'bg-olive-600 text-cream-50'
                            : 'bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 shadow-terracotta-600/20'
                        }`}
                      >
                        {isRecentlyAdded ? (
                          <>
                            <Check className="w-4 h-4" aria-hidden="true" />
                            <span>¡Sumado a tu pedido!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                            <span>Sumar al pedido</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Botón Secundario: Pedir directo por WhatsApp */}
                    <a
                      href={inquiryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 border border-cream-200/30 hover:border-cream-200 hover:bg-cream-100/10 text-cream-100 font-semibold px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all duration-200 active:scale-95 text-center"
                    >
                      <MessageCircle className="w-4 h-4" aria-hidden="true" />
                      <span>Pedir directo por WhatsApp</span>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CombosSection;
