import { ShoppingBag, MessageCircle, Flame, Truck, ArrowRight } from 'lucide-react';
import { BUSINESS_CONFIG } from '@/config/business';

export function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Elegís tu menú o combo',
      description:
        'Armás tu pedido acá en segundos o tocás para consultar por cualquier producto o pack de 500g. Todo preparado para freezer.',
      icon: ShoppingBag,
      tag: 'Variedad casera',
    },
    {
      number: '02',
      title: 'Nos escribís en un clic',
      description:
        `El pedido se arma solo en WhatsApp (${BUSINESS_CONFIG.whatsappDisplay}) y coordinamos el envío gratis en Río Cuarto o retiro a convenir.`,
      icon: MessageCircle,
      tag: 'Atención personalizada',
    },
    {
      number: '03',
      title: 'Directo del freezer al horno',
      description:
        'Sin descongelar previamente: en 10 a 15 minutos tenés comida casera, rica y 100% segura lista para disfrutar en tu mesa.',
      icon: Flame,
      tag: 'Listo en 15 min',
    },
  ];

  return (
    <section
      aria-labelledby="how-it-works-title"
      className="bg-espresso-950 text-cream-50 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-y border-espresso-900 relative overflow-hidden"
    >
      {/* Resplandor cálido de fondo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-terracotta-600/5 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto relative z-10 space-y-12 sm:space-y-16">
        {/* Cabecera Editorial */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold tracking-widest uppercase text-terracotta-600 block">
            CÓMO FUNCIONA • SIMPLE Y SEGURO
          </span>
          <h2
            id="how-it-works-title"
            className="font-serif italic font-bold text-3xl sm:text-4xl lg:text-5xl text-cream-50 tracking-tight leading-tight"
          >
            Del freezer a tu mesa en 3 pasos
          </h2>
          <p className="font-sans text-sm sm:text-base text-cream-200/80 leading-relaxed">
            Sin complicaciones ni preparaciones eternas. Comida artesanal lista para solucionar tus almuerzos y cenas cotidianas.
          </p>
        </div>

        {/* Grilla de los 3 Pasos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative rounded-2xl sm:rounded-3xl bg-espresso-900/80 border border-cream-200/10 p-6 sm:p-8 hover:border-terracotta-600/40 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Cabecera del paso: Número editorial grande e icono */}
                <div className="flex items-start justify-between mb-6">
                  <span className="font-serif italic font-bold text-4xl sm:text-5xl text-terracotta-600/60 group-hover:text-terracotta-600 transition-colors duration-300 select-none">
                    {step.number}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-espresso-950 border border-cream-200/15 flex items-center justify-center text-cream-100 group-hover:text-terracotta-600 group-hover:border-terracotta-600/30 transition-all duration-300">
                    <Icon className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
                  </div>
                </div>

                {/* Contenido del paso */}
                <div className="space-y-2.5">
                  <div className="inline-block text-[11px] font-semibold uppercase tracking-wider text-olive-600">
                    {step.tag}
                  </div>
                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-cream-50 leading-snug">
                    {step.title}
                  </h3>
                  <p className="font-sans text-sm text-cream-200/75 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Línea decorativa sutil en la base */}
                <div className="mt-6 pt-4 border-t border-cream-200/10 flex items-center text-xs text-cream-200/50 group-hover:text-cream-200/80 transition-colors">
                  <span>Paso {step.number} de 03</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Micro-banner de Compromiso y CTA */}
        <div className="rounded-2xl bg-espresso-900/60 border border-cream-200/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-olive-600/20 border border-olive-600/30 flex items-center justify-center text-olive-600 shrink-0">
              <Truck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif font-bold text-base text-cream-50">
                {BUSINESS_CONFIG.deliveryHighlight}
              </p>
              <p className="font-sans text-xs text-cream-200/70">
                Llegamos a todos los barrios de la ciudad manteniendo intacta la cadena de frío.
              </p>
            </div>
          </div>

          <a
            href="#combos"
            className="inline-flex items-center gap-2 bg-cream-50 hover:bg-cream-100 text-ink-900 font-semibold px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all active:scale-95 shadow-sm shrink-0"
          >
            <span>Ver combos para freezer</span>
            <ArrowRight className="w-4 h-4 text-ink-900" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
