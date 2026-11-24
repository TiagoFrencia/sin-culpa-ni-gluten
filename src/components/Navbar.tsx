import { useState, useEffect, useRef } from 'react';
import { Menu, X, MessageCircle, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { BUSINESS_CONFIG } from '@/config/business';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';
import { useOrder } from '@/context/OrderContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const { totalItems, openDrawer } = useOrder();

  // Detección de scroll para transición de transparencia a crema sólido
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cierre accesible con tecla Escape y bloqueo de scroll de fondo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen]);

  const handleAnchorClick = () => {
    setIsMobileOpen(false);
  };

  const navLinks = [
    { label: 'Combos', href: '#combos' },
    { label: 'Menú', href: '#menu' },
    { label: 'Cocina Segura', href: '#cocina-segura' },
    { label: 'Preguntas', href: '#faq' },
  ];

  const whatsappUrl = buildGeneralInquiryUrl();

  return (
    <nav
      aria-label="Navegación principal"
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-cream-100/95 backdrop-blur-md border-b border-cream-200 shadow-xs py-3'
          : 'bg-transparent border-b border-transparent py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Logo y Nombre de Marca */}
          <a
            href="#"
            className="flex items-center gap-3 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600 rounded-lg p-0.5"
          >
            {/* Medallón circular limpio */}
            <div className="w-10 h-10 rounded-full bg-cream-50 border border-cream-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105">
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="Sin Culpa Ni Gluten"
                  width={40}
                  height={40}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover p-0.5"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-serif italic font-bold text-terracotta-600 text-lg leading-none select-none tracking-tight">
                  SC
                </span>
              )}
            </div>

            {/* Texto de Marca */}
            <div className="flex flex-col">
              <span
                className={`font-serif text-lg sm:text-xl font-bold tracking-tight leading-tight transition-colors duration-200 ${
                  isScrolled
                    ? 'text-ink-900 group-hover:text-terracotta-600'
                    : 'text-cream-50 group-hover:text-cream-200'
                }`}
              >
                {BUSINESS_CONFIG.brandName}
              </span>
              <span
                className={`text-[10px] tracking-widest uppercase font-sans font-semibold transition-colors duration-200 ${
                  isScrolled ? 'text-ink-600' : 'text-cream-200/80'
                }`}
              >
                100% Sin TACC • Río Cuarto
              </span>
            </div>
          </a>

          {/* Links de navegación desktop */}
          <div className="hidden md:flex items-center gap-7 lg:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 relative py-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600 rounded-sm ${
                  isScrolled
                    ? 'text-ink-900 hover:text-terracotta-600'
                    : 'text-cream-100 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Acciones a la derecha: Botón Pedido/Carrito + Botón WhatsApp + Botón Menú Móvil */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón Carrito / Pedido con Badge */}
            <button
              type="button"
              onClick={openDrawer}
              data-testid="navbar-cart-btn"
              aria-label={
                totalItems > 0
                  ? `Ver mi pedido (${totalItems} ${totalItems === 1 ? 'ítem' : 'ítems'})`
                  : 'Ver mi pedido'
              }
              className={`relative p-2.5 rounded-full border transition-all active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600 ${
                isScrolled
                  ? 'bg-cream-50 hover:bg-cream-100 border-cream-200 text-ink-900 shadow-2xs'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-cream-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              {totalItems > 0 && (
                <span
                  data-testid="navbar-order-badge"
                  className="absolute -top-1 -right-1 bg-terracotta-600 text-cream-50 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center leading-tight shadow-xs"
                >
                  {totalItems}
                </span>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Consultar por WhatsApp"
              className="inline-flex items-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xs transition-all active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600 focus-visible:ring-offset-2"
            >
              <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Pedir por WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>

            {/* Botón Hamburguesa Móvil */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-drawer"
              aria-label={isMobileOpen ? 'Cerrar menú' : 'Abrir menú principal'}
              className={`md:hidden p-2 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600 ${
                isScrolled
                  ? 'text-ink-900 hover:bg-cream-200/50'
                  : 'text-cream-50 hover:bg-white/10'
              }`}
            >
              {isMobileOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil desplegable con foco accesible y backdrop */}
      {isMobileOpen && (
        <div
          id="mobile-drawer"
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-[100] md:hidden flex flex-col justify-start"
        >
          {/* Backdrop con desenfoque suave */}
          <div
            className="absolute inset-0 bg-espresso-950/75 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Panel del menú móvil */}
          <div className="relative bg-cream-50 border-b border-cream-200 shadow-2xl px-6 py-5 space-y-5 animate-in slide-in-from-top-3 duration-200">
            {/* Header del drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center">
                  <span className="font-serif italic font-bold text-terracotta-600 text-base">
                    SC
                  </span>
                </div>
                <div>
                  <p className="font-serif font-bold text-ink-900 text-base leading-tight">
                    {BUSINESS_CONFIG.brandName}
                  </p>
                  <p className="text-[10px] tracking-widest uppercase font-semibold text-ink-600">
                    100% Sin TACC • Río Cuarto
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-lg text-ink-900 hover:bg-cream-200/50"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Links del menú móvil */}
            <div className="space-y-1 divide-y divide-cream-200/60">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={handleAnchorClick}
                  className="flex items-center justify-between text-base font-medium text-ink-900 hover:text-terracotta-600 py-3 transition-colors"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-ink-600" aria-hidden="true" />
                </a>
              ))}
            </div>

            {/* CTA WhatsApp, Pedido y garantía en el menú móvil */}
            <div className="pt-2 border-t border-cream-200 space-y-3">
              {totalItems > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    openDrawer();
                  }}
                  className="w-full flex items-center justify-between bg-cream-100 hover:bg-cream-200/70 border border-terracotta-600/30 text-ink-900 font-semibold py-3 px-4 rounded-xl shadow-2xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-terracotta-600 shrink-0" />
                    <span>Ver mi pedido</span>
                  </div>
                  <span className="bg-terracotta-600 text-cream-50 text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
                  </span>
                </button>
              )}

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAnchorClick}
                className="w-full flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold py-3 px-4 rounded-xl shadow-xs transition-colors"
              >
                <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>Escribinos al WhatsApp</span>
              </a>

              <div className="flex items-center justify-center gap-2 text-xs text-ink-600 pt-1">
                <ShieldCheck className="w-4 h-4 text-olive-600 shrink-0" />
                <span>100% Sin Contaminación Cruzada • Río Cuarto</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
