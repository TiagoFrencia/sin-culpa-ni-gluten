import { useEffect, useRef } from 'react';
import { X, Flame, Snowflake, MessageCircle, Scale, Sparkles } from 'lucide-react';
import type { Product } from '@/types/catalog';
import { CATEGORY_LABELS } from '@/data/catalog';
import { MediaImage } from '@/components/MediaImage';
import { buildDirectProductUrl, buildHalfKgInquiryUrl } from '@/utils/whatsapp';

interface ProductInfoModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductInfoModal({ product, onClose }: ProductInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Manejo de Escape y bloqueo de scroll
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    // Auto-foco accesible al abrir
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const categoryName = CATEGORY_LABELS[product.category] || 'Especialidad';
  const whatsappProductUrl = buildDirectProductUrl(product.name);
  const whatsappHalfKgUrl = buildHalfKgInquiryUrl(product.name);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-espresso-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-cream-50 rounded-2xl sm:rounded-3xl border border-cream-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Cabecera con imagen grande y botón de cierre flotante */}
        <div className="relative">
          <MediaImage
            src={product.image}
            alt={product.name}
            aspectRatioClass="aspect-16/9 sm:aspect-2/1"
            fallbackTitle={product.name}
            categoryLabel={categoryName}
            className="w-full object-cover"
          />

          {/* Botón de cierre accesible */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalles del producto"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-cream-50/90 text-ink-900 hover:bg-cream-100 flex items-center justify-center shadow-md backdrop-blur-xs transition-transform active:scale-90 border border-cream-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Badge del producto si tiene */}
          {product.badge && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-espresso-950/85 text-cream-100 border border-cream-200/20 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-terracotta-600" aria-hidden="true" />
                <span>{product.badge}</span>
              </span>
            </div>
          )}
        </div>

        {/* Cuerpo del Modal con scroll interno cómodo */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Etiquetas y Título */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-olive-600 bg-olive-600/10 px-2.5 py-0.5 rounded-full border border-olive-600/20">
                {categoryName}
              </span>

              {/* Badge oficial Sin TACC sutil */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sintacc-red/10 text-sintacc-red border border-sintacc-red/20">
                <span className="w-2 h-2 rounded-full bg-sintacc-red" aria-hidden="true" />
                <span>100% Sin TACC</span>
              </span>
            </div>

            <h2
              id="product-modal-title"
              className="font-serif italic font-bold text-2xl sm:text-3xl text-ink-900 leading-tight"
            >
              {product.name}
            </h2>

            <p className="font-sans text-sm sm:text-base text-ink-600 mt-2 leading-relaxed">
              {product.shortDescription}
            </p>
          </div>

          {/* Cómo cocinarlo desde el freezer */}
          <div className="p-4 rounded-xl bg-cream-100/70 border border-cream-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-terracotta-600 font-semibold text-xs sm:text-sm">
              <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Cómo cocinarlo directo del freezer</span>
            </div>
            <p className="text-xs sm:text-sm text-ink-600 pl-6 leading-relaxed">
              {product.cookingTip}
            </p>
          </div>

          {/* Conservación */}
          <div className="p-4 rounded-xl bg-cream-100/70 border border-cream-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-olive-600 font-semibold text-xs sm:text-sm">
              <Snowflake className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Conservación en freezer</span>
            </div>
            <p className="text-xs sm:text-sm text-ink-600 pl-6 leading-relaxed">
              {product.freezerDuration}
            </p>
          </div>

          {/* Aclaración de pack de 500g si corresponde */}
          {product.supportsHalfKgInquiry && (
            <div className="p-3.5 rounded-xl bg-olive-600/10 border border-olive-600/20 flex items-start gap-3">
              <Scale className="w-5 h-5 text-olive-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-ink-900">
                <strong className="font-semibold block text-ink-900 mb-0.5">
                  ¿Preferís una cantidad menor?
                </strong>
                <span>
                  Consultanos por WhatsApp disponibilidad y precio fraccionado por pack de 500g.{' '}
                </span>
                <a
                  href={whatsappHalfKgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-terracotta-600 hover:underline inline-block mt-1"
                >
                  Consultar pack 500g →
                </a>
              </div>
            </div>
          )}

          {/* Opciones de sabor si existen */}
          {product.flavorOptions && product.flavorOptions.length > 0 && (
            <div className="text-xs text-ink-600">
              <span className="font-medium text-ink-900">Sabores disponibles: </span>
              <span>{product.flavorOptions.join(' • ')}</span>
            </div>
          )}
        </div>

        {/* Footer con CTA directo a WhatsApp */}
        <div className="p-4 sm:p-5 bg-cream-100/60 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-ink-600 hover:text-ink-900 hover:bg-cream-200/50 transition-colors order-2 sm:order-1 text-center"
          >
            Cerrar ventana
          </button>

          <a
            href={whatsappProductUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-5 py-2.5 rounded-full shadow-xs transition-all active:scale-95 text-xs sm:text-sm order-1 sm:order-2 text-center"
          >
            <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Consultar este plato por WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default ProductInfoModal;
