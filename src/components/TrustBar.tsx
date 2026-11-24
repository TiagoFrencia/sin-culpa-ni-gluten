import type { ElementType } from 'react';
import { ShieldCheck, Award, Snowflake, Truck } from 'lucide-react';

interface TrustPillar {
  icon: ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  description: string;
}

export function TrustBar() {
  const pillars: TrustPillar[] = [
    {
      icon: ShieldCheck,
      iconColor: 'text-olive-600',
      bgColor: 'bg-olive-600/10 border-olive-600/20',
      title: 'Cocina 100% Sin Gluten',
      description: '0% riesgo de contaminación cruzada',
    },
    {
      icon: Award,
      iconColor: 'text-terracotta-600',
      bgColor: 'bg-terracotta-600/10 border-terracotta-600/20',
      title: 'Ingredientes Certificados',
      description: 'Elaboración casera todos los días',
    },
    {
      icon: Snowflake,
      iconColor: 'text-olive-600',
      bgColor: 'bg-olive-600/10 border-olive-600/20',
      title: 'Directo del Freezer',
      description: 'Horno, plancha o airfryer en minutos',
    },
    {
      icon: Truck,
      iconColor: 'text-terracotta-600',
      bgColor: 'bg-terracotta-600/10 border-terracotta-600/20',
      title: 'Envío Gratis',
      description: 'Entregas en todo Río Cuarto',
    },
  ];

  return (
    <section
      aria-label="Pilares de confianza y calidad"
      className="bg-cream-50 border-y border-cream-200 relative z-20 py-8 lg:py-10 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={index}
                className="flex items-center sm:items-start gap-4 p-2 sm:p-0 transition-transform duration-200 hover:-translate-y-0.5"
              >
                {/* Ícono dentro de medallón suave */}
                <div
                  className={`w-12 h-12 rounded-full border ${pillar.bgColor} flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <Icon className={`w-6 h-6 ${pillar.iconColor} stroke-[1.75]`} aria-hidden="true" />
                </div>

                {/* Texto del pilar */}
                <div className="flex flex-col">
                  <h3 className="font-serif font-bold text-ink-900 text-base sm:text-lg leading-tight tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-ink-600 leading-relaxed mt-1">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TrustBar;
