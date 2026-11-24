import { ShieldCheck, Sparkles, Snowflake, Heart, MessageCircle } from 'lucide-react';
import { MediaImage } from '@/components/MediaImage';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';

export function StorySection() {
  const whatsappUrl = buildGeneralInquiryUrl(
    '¡Hola Flor y Fabrizio! Estuve leyendo sobre su cocina 100% libre de gluten y quisiera hacerles una consulta sobre los productos.'
  );

  const guarantees = [
    {
      icon: ShieldCheck,
      title: 'Hogar exclusivo Sin TACC',
      description: 'Cero harinas con gluten en el espacio de elaboración. Sin riesgos de contaminación cruzada.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-600/10',
      borderColor: 'border-olive-600/20',
    },
    {
      icon: Sparkles,
      title: 'Materias primas certificadas',
      description: 'Insumos seleccionados con sello oficial Sin TACC y trazabilidad garantizada desde el origen.',
      color: 'text-terracotta-600',
      bgColor: 'bg-terracotta-600/10',
      borderColor: 'border-terracotta-600/20',
    },
    {
      icon: Snowflake,
      title: 'Comida real y casera',
      description: 'Hecha para guardar en tu freezer y disfrutar sin culpa en 10 a 15 minutos en cualquier día de la semana.',
      color: 'text-olive-600',
      bgColor: 'bg-olive-600/10',
      borderColor: 'border-olive-600/20',
    },
  ];

  return (
    <section
      id="cocina-segura"
      aria-labelledby="cocina-segura-title"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20"
    >
      <div className="bg-cream-50 rounded-3xl border border-cream-200 p-6 sm:p-10 lg:p-14 shadow-sm relative overflow-hidden">
        {/* Glow sutil en esquinas */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-olive-600/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-terracotta-600/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
          {/* Columna Narrativa (7 columnas en desktop) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Eyebrow en verde oliva */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-olive-600/10 border border-olive-600/20 text-xs font-semibold tracking-wider uppercase text-olive-600">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>NUESTRA COCINA • 100% LIBRE DE GLUTEN</span>
            </div>

            {/* Título en Cormorant Garamond italic */}
            <h2
              id="cocina-segura-title"
              className="font-serif italic font-bold text-3xl sm:text-4xl lg:text-5xl text-ink-900 tracking-tight leading-tight"
            >
              No es un menú aparte. Es nuestra cocina de todos los días.
            </h2>

            {/* Narrativa auténtica y cercana */}
            <div className="space-y-4 font-sans text-sm sm:text-base text-ink-600 leading-relaxed">
              <p>
                Flor y Fabrizio arrancamos <strong className="text-ink-900 font-semibold">Sin Culpa Ni Gluten</strong> en
                Río Cuarto a partir de un diagnóstico de celiaquía hace 3 años. Lo que empezó como un desafío cotidiano
                para reencontrarnos con platos ricos, tiernos y seguros se convirtió en nuestra vocación.
              </p>
              <p>
                Desde ese día transformamos nuestro hogar en una cocina <strong className="text-ink-900 font-semibold">100% libre de gluten</strong>.
                No compartimos mesadas, utensilios ni alacenas con harinas tradicionales: eliminamos el riesgo de contaminación
                cruzada de raíz porque en esta casa se come seguro todos los días.
              </p>
              <p>
                Cada producto se elabora de manera casera con <strong className="text-ink-900 font-semibold">ingredientes certificados</strong>,
                pensado para resolver las comidas de quienes buscan opciones deliciosas, prácticas y listas para tener en el
                freezer y llevar a la mesa en minutos.
              </p>
            </div>

            {/* Bloque de 3 garantías concretas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-cream-200">
              {guarantees.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="p-4 rounded-2xl bg-cream-100/60 border border-cream-200/80 hover:border-olive-600/30 transition-colors duration-200"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${item.bgColor} ${item.borderColor} border flex items-center justify-center ${item.color} mb-3`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-serif font-bold text-base text-ink-900 mb-1 leading-snug">
                      {item.title}
                    </h3>
                    <p className="font-sans text-xs text-ink-600 leading-normal">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Visual Destacada (5 columnas en desktop) */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Marco fotográfico editorial con sombra suave */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-cream-200 bg-espresso-950 shadow-xl group">
                <MediaImage
                  src="/images/pan-integral.webp"
                  alt="Pan casero integral libre de gluten recién elaborado en Río Cuarto"
                  aspectRatioClass="aspect-4/3 sm:aspect-16/10 lg:aspect-4/3"
                  fallbackTitle="Pan Casero Libre de Gluten"
                  categoryLabel="Cocina 100% Sin TACC • Río Cuarto"
                  className="group-hover:scale-102 transition-transform duration-700 ease-out"
                />

                {/* Sello de Confianza Flotante */}
                <div className="absolute top-3.5 left-3.5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sintacc-red text-white text-xs font-bold tracking-wide shadow-md">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  <span>100% Sin TACC</span>
                </div>

                {/* Badge de Elaboración Familiar */}
                <div className="absolute top-3.5 right-3.5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-espresso-950/80 backdrop-blur-md border border-cream-200/20 text-cream-50 text-xs font-medium shadow-md">
                  <Heart className="w-3.5 h-3.5 text-terracotta-600 fill-terracotta-600" aria-hidden="true" />
                  <span>Río Cuarto, Cba.</span>
                </div>

                {/* Franja de Pie de Foto Editorial */}
                <div className="p-5 sm:p-6 bg-gradient-to-t from-espresso-950 via-espresso-950 to-espresso-900 border-t border-cream-200/10 text-cream-50">
                  <p className="font-serif italic text-base sm:text-lg text-cream-100 leading-relaxed">
                    «Cocinamos con el mismo cuidado y exigencia con el que preparamos el almuerzo de nuestra propia familia.»
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-cream-200/70 border-t border-cream-200/10 pt-3">
                    <span className="font-medium text-cream-100">Flor & Fabrizio</span>
                    <span className="text-olive-600 font-medium">Fundadores</span>
                  </div>
                </div>
              </div>

              {/* Enlace directo para conversar con los elaboradores */}
              <div className="mt-4 text-center">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-ink-900 hover:text-terracotta-600 transition-colors py-1 group"
                >
                  <MessageCircle className="w-4 h-4 text-olive-600 group-hover:text-terracotta-600 transition-colors" aria-hidden="true" />
                  <span>¿Querés consultarnos sobre ingredientes o elaboración? Escribinos</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StorySection;
