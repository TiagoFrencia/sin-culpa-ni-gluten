import { ArrowDown, MessageCircle, Check, Sparkles } from 'lucide-react';
import { BUSINESS_CONFIG } from '@/config/business';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';
import { MediaImage } from '@/components/MediaImage';

export function Hero() {
  const whatsappUrl = buildGeneralInquiryUrl(
    '¡Hola! Estuve viendo la web de Sin Culpa Ni Gluten y me gustaría consultar por los platos caseros congelados.'
  );

  return (
    <section
      aria-label="Presentación principal"
      className="relative bg-espresso-950 text-cream-50 overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24"
    >
      {/* Fondos con gradientes cálidos sutiles para asegurar contraste WCAG AAA en todo momento */}
      <div
        className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(166,75,42,0.14)_0%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(110,120,81,0.12)_0%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Columna izquierda: Narrativa Editorial y Acciones */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6 sm:space-y-7 z-10">
            {/* Eyebrow badge discreto con sello Sin TACC */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-espresso-900/90 border border-cream-200/20 backdrop-blur-xs text-xs sm:text-sm font-medium text-cream-100 shadow-xs">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full bg-sintacc-red text-white text-[10px] font-black shrink-0 tracking-tighter shadow-xs"
                title="Sello Oficial Sin TACC"
                aria-label="Sello Sin TACC"
              >
                ST
              </span>
              <span>100% Libre de Gluten • Río Cuarto</span>
            </div>

            {/* H1 Editorial de Alto Impacto */}
            <h1 className="font-serif italic font-semibold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-cream-50 leading-[1.08] tracking-tight">
              {BUSINESS_CONFIG.slogan}
            </h1>

            {/* Subtítulo claro, humano y empático */}
            <p className="font-sans text-base sm:text-lg lg:text-xl text-cream-200/90 leading-relaxed font-normal max-w-2xl">
              Comidas caseras congeladas, elaboradas con ingredientes certificados en una cocina
              100% libre de contaminación cruzada. Listas para resolver tus comidas directo del
              freezer.
            </p>

            {/* CTAs Jerárquicos */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto pt-2">
              {/* Botón Primario: Sólido Terracota */}
              <a
                href="#menu"
                className="inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-7 py-3.5 rounded-full shadow-lg shadow-terracotta-600/25 transition-all duration-200 active:scale-95 text-base text-center"
              >
                <span>Ver Menú y Precios</span>
                <ArrowDown className="w-4 h-4" aria-hidden="true" />
              </a>

              {/* Botón Secundario: Outline Crema */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-cream-200/40 text-cream-100 hover:bg-cream-100/10 hover:border-cream-100 font-semibold px-6 py-3.5 rounded-full transition-all duration-200 active:scale-95 text-base text-center"
              >
                <MessageCircle className="w-4 h-4 text-cream-100" aria-hidden="true" />
                <span>Consultar por WhatsApp</span>
              </a>
            </div>

            {/* Micro-indicador de confianza y servicio */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-cream-200/75 pt-1">
              <Check className="w-4 h-4 text-olive-600 shrink-0" aria-hidden="true" />
              <span>
                {BUSINESS_CONFIG.deliveryHighlight} • Atención por WhatsApp{' '}
                <strong className="text-cream-100 font-semibold">{BUSINESS_CONFIG.whatsappDisplay}</strong>
              </span>
            </div>
          </div>

          {/* Columna derecha: Visual Gastronómico Asimétrico */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-none">
              {/* Marco exterior con sombra profunda y borde fino */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-cream-200/15 shadow-2xl shadow-black/80 bg-espresso-900 group">
                <MediaImage
                  src="/images/empanadas-arabes.webp"
                  alt="Empanadas Árabes caseras 100% Sin TACC"
                  aspectRatioClass="aspect-4/3 sm:aspect-5/4 lg:aspect-4/3"
                  fallbackTitle="Empanadas Árabes Artesanales"
                  categoryLabel="Especialidad de la casa"
                  loading="eager"
                  fetchPriority="high"
                  className="group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Overlay con gradiente inferior para legibilidad del tag flotante */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-espresso-950/90 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />

                {/* Badge flotante inferior */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 flex items-center justify-between gap-3 p-3 rounded-xl bg-espresso-950/85 backdrop-blur-md border border-cream-200/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-terracotta-600/20 border border-terracotta-600/40 flex items-center justify-center text-terracotta-600 shrink-0">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-cream-50 leading-tight">
                        Elaboración casera
                      </p>
                      <p className="text-[11px] text-cream-200/70 leading-tight">
                        Listas en 10-15 min
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md bg-olive-600/30 text-cream-100 border border-olive-600/40 shrink-0">
                    Sin TACC
                  </span>
                </div>
              </div>

              {/* Elemento decorativo sutil en esquina */}
              <div
                className="absolute -bottom-4 -right-4 -z-10 w-24 h-24 rounded-2xl border border-cream-200/10 hidden sm:block"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
