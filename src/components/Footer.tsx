import { useState } from 'react';
import { MessageCircle, Truck, ShieldCheck, ArrowUp } from 'lucide-react';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';
import { useCatalog } from '@/context/CatalogContext';

const CURRENT_YEAR = new Date().getFullYear();

function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Footer() {
  const { business } = useCatalog();
  const [logoError, setLogoError] = useState(false);
  const whatsappUrl = buildGeneralInquiryUrl(undefined, business.whatsappPhone);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Combos para Freezer', href: '#combos' },
    { label: 'Menú Completo', href: '#menu' },
    { label: 'Cocina Segura Sin TACC', href: '#cocina-segura' },
    { label: 'Preguntas Frecuentes', href: '#faq' },
  ];

  return (
    <footer
      data-testid="main-footer"
      className="bg-espresso-950 text-cream-50 border-t border-espresso-900 pt-16 pb-36 sm:pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Fondo decorativo sutil */}
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-terracotta-600/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        {/* Grilla Principal de 3 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Columna 1: Marca y Propuesta (5 cols en desktop) */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              {/* Medallón circular del logo con fallback elegante */}
              <div className="w-12 h-12 rounded-full overflow-hidden border border-cream-200/30 bg-espresso-900 flex items-center justify-center shrink-0 shadow-md">
                {!logoError ? (
                  <img
                    src="/logo.png"
                    alt={business.brandName}
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover p-0.5"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="font-serif italic font-bold text-terracotta-600 text-xl leading-none select-none">
                    SC
                  </span>
                )}
              </div>

              <div>
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-cream-50 block leading-tight">
                  {business.brandName}
                </span>
                <span className="text-[11px] font-sans font-semibold tracking-wider uppercase text-olive-600">
                  100% Libre de Gluten • Familiar
                </span>
              </div>
            </div>

            <p className="font-sans text-sm text-cream-200/80 leading-relaxed max-w-sm">
              {business.slogan} Comidas caseras pensadas para tener en el freezer y resolver tus días con sabor auténtico y seguridad celíaca absoluta.
            </p>

            <div className="flex items-center gap-2 text-xs text-cream-200/70 pt-1">
              <span className="w-2 h-2 rounded-full bg-olive-600 inline-block animate-pulse" />
              <span>{business.city}, {business.country}</span>
            </div>
          </div>

          {/* Columna 2: Navegación Rápida (3 cols en desktop) */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="font-serif font-bold text-lg text-cream-50 tracking-wide">
              Navegación
            </h3>
            <ul className="space-y-2.5 text-sm font-sans">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-cream-200/75 hover:text-terracotta-600 transition-colors inline-flex items-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-terracotta-600 rounded-sm"
                  >
                    <span className="text-terracotta-600/60 font-serif text-xs">›</span>
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Contacto Directo y Envíos (4 cols en desktop) */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="font-serif font-bold text-lg text-cream-50 tracking-wide">
              Contacto y Pedidos
            </h3>

            {/* Badge destacado de Envío Gratis */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-olive-600/20 border border-olive-600/30 text-xs font-semibold text-cream-50 shadow-2xs">
              <Truck className="w-4 h-4 text-olive-600 shrink-0" aria-hidden="true" />
              <span>{business.deliveryHighlight}</span>
            </div>

            <div className="space-y-3 pt-1">
              {/* Botón WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-4 py-2.5 rounded-full text-xs sm:text-sm transition-all active:scale-95 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>WhatsApp: {business.whatsappDisplay}</span>
              </a>

              {/* Botón Instagram */}
              <a
                href={business.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-espresso-900 hover:bg-espresso-900/80 text-cream-100 border border-cream-200/20 font-medium px-4 py-2.5 rounded-full text-xs sm:text-sm transition-all hover:border-terracotta-600/40"
              >
                <InstagramIcon className="w-4 h-4 text-terracotta-600" />
                <span>Instagram: {business.instagramHandle}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Separador inferior con botón Volver Arriba */}
        <div className="pt-8 border-t border-cream-200/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-cream-200/60 font-sans">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-olive-600 shrink-0" aria-hidden="true" />
            <p>
              © {CURRENT_YEAR} {business.brandName} • Elaboración casera 100% Sin TACC • Imágenes ilustrativas.
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Volver arriba de la página"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-espresso-900 border border-cream-200/10 hover:border-cream-200/30 text-cream-200/80 hover:text-cream-50 transition-colors text-xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-terracotta-600"
          >
            <span>Volver arriba</span>
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
