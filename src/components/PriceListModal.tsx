import { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, FileImage, MessageCircle, AlertCircle } from 'lucide-react';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';
import { useCatalog } from '@/context/CatalogContext';

interface PriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PriceListModal({ isOpen, onClose }: PriceListModalProps) {
  const { business } = useCatalog();
  const [imageError, setImageError] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const priceListUrl = business.priceListImageUrl || '/images/lista-precios.jpg';

  useEffect(() => {
    if (!isOpen) return;

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

  const handleShare = async () => {
    const shareData = {
      title: `Lista de Precios - ${business.brandName}`,
      text: `Mirá la lista de precios de platos caseros 100% Sin TACC de ${business.brandName} (${business.city}):`,
      url: window.location.href,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (err) {
        // El usuario canceló o hubo error; no forzamos nada si canceló
        if ((err as Error).name !== 'AbortError') {
          window.open(
            `https://wa.me/?text=${encodeURIComponent(
              `${shareData.text} ${shareData.url}`
            )}`,
            '_blank'
          );
        }
      }
    } else {
      // Fallback si no hay Web Share API (desktop tradicional)
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          `${shareData.text} ${shareData.url}`
        )}`,
        '_blank'
      );
    }
  };

  const whatsappInquiryUrl = buildGeneralInquiryUrl(
    `¡Hola! Quería consultar por la lista de precios actualizada de ${business.brandName}.`,
    business.whatsappPhone
  );

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
        {/* Barra superior */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 bg-cream-100/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-terracotta-600/10 border border-terracotta-600/20 flex items-center justify-center text-terracotta-600">
              <FileImage className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="price-list-modal-title"
                className="font-serif italic font-bold text-lg sm:text-xl text-ink-900 leading-tight"
              >
                Lista de Precios en Imagen
              </h2>
              <p className="text-[11px] text-ink-600">
                100% Sin TACC • Elaboración casera Río Cuarto
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar lista de precios"
            className="p-2 rounded-full text-ink-600 hover:text-ink-900 hover:bg-cream-200/50 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido Visual (Imagen o Fallback) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center min-h-[300px] bg-cream-100/30">
          {!imageError ? (
            <div className="relative rounded-xl overflow-hidden shadow-md border border-cream-200 bg-white max-w-full">
              <img
                key={priceListUrl}
                src={priceListUrl}
                alt={`Lista completa de precios de ${business.brandName}`}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-contain max-h-[60vh]"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            /* Fallback elegante cuando el archivo aún no fue copiado a public/images/ */
            <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-cream-50 border border-cream-200 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-terracotta-600/10 border border-terracotta-600/20 flex items-center justify-center text-terracotta-600 mx-auto">
                <AlertCircle className="w-7 h-7" aria-hidden="true" />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-olive-600 bg-olive-600/10 px-2.5 py-0.5 rounded-full border border-olive-600/20">
                  Actualización en curso
                </span>
                <h3 className="font-serif italic font-bold text-xl sm:text-2xl text-ink-900 mt-2">
                  Lista de Precios Digital
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 mt-2 leading-relaxed">
                  Estamos sincronizando la imagen física de la lista. Podés explorar todos los precios
                  actualizados en vivo en nuestro menú interactivo o pedir la lista directa por WhatsApp.
                </p>
              </div>

              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all shadow-xs"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>Pedir lista por WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Acciones del Modal: Descargar y Compartir */}
        <div className="px-5 py-4 bg-cream-100/70 border-t border-cream-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-ink-600 order-3 sm:order-1 w-full sm:w-auto text-center sm:text-left">
            Precios sujetos a disponibilidad de tandas de elaboración.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
            {/* Botón Descargar lista */}
            <a
              href={priceListUrl}
              download="lista-precios-sin-culpa-ni-gluten.jpg"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-cream-200 bg-cream-50 hover:bg-cream-100 text-ink-900 font-semibold px-4 py-2 rounded-full text-xs sm:text-sm transition-all shadow-2xs active:scale-95"
            >
              <Download className="w-4 h-4 text-terracotta-600" aria-hidden="true" />
              <span>Descargar lista</span>
            </a>

            {/* Botón Compartir */}
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-4 py-2 rounded-full text-xs sm:text-sm transition-all shadow-2xs active:scale-95"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>{shareSuccess ? '¡Enlace copiado!' : 'Compartir'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PriceListModal;
