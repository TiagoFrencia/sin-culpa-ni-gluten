import { useState } from 'react';
import { ChevronDown, MessageCircle, HelpCircle } from 'lucide-react';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';
import { BUSINESS_CONFIG } from '@/config/business';

interface FaqItem {
  question: string;
  answer: string;
  tag?: string;
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      question: '¿Existe algún riesgo de contaminación cruzada?',
      answer:
        'Cero riesgo. Toda nuestra cocina es 100% libre de gluten desde hace 3 años a raíz del diagnóstico de celiaquía en nuestra familia. No entran harinas con gluten ni se comparten utensilios o superficies. Además, trabajamos exclusivamente con insumos y materias primas certificadas con sello oficial Sin TACC.',
      tag: 'Seguridad Celíaca',
    },
    {
      question: '¿Cómo se cocinan los productos congelados?',
      answer:
        'Van directo del freezer a la cocción, sin descongelar previamente. Podés prepararlos en horno fuerte precalentado, plancha bien caliente o freidora de aire (airfryer). La mayoría de los platos (milanesas, hamburguesas, pizzetas y medallones) quedan crocantes y listos en solo 10 a 18 minutos.',
      tag: 'Cocción Rápida',
    },
    {
      question: '¿Cuánto tiempo duran en el freezer?',
      answer:
        'Todos nuestros productos conservan su frescura, textura y sabor original hasta por 3 meses en freezer a -18°C. En el caso del pan integral artesanal, recomendamos conservarlo hasta 2 meses, preferentemente ya rebanado para mandar directo a la tostadora.',
      tag: 'Conservación',
    },
    {
      question: '¿Puedo pedir packs de 500g en milanesas o hamburguesas?',
      answer:
        '¡Sí, por supuesto! Si bien los precios del catálogo están expresados por kilo para facilitar la comparación, podés consultarnos directamente por WhatsApp la disponibilidad de packs fraccionados de 500g en milanesas, hamburguesas o medallones.',
      tag: 'Fraccionado',
    },
    {
      question: '¿Cómo funcionan los envíos y medios de pago en Río Cuarto?',
      answer:
        'El envío dentro de Río Cuarto es completamente gratis. En la web no tenés que ingresar tarjetas ni datos bancarios: al enviar tu pedido por WhatsApp coordinamos la dirección, la franja horaria de entrega y tu forma de pago preferida (efectivo, transferencia bancaria o Mercado Pago).',
      tag: 'Envíos y Pago',
    },
    {
      question: '¿Con cuánta anticipación conviene hacer el pedido?',
      answer:
        'Para los productos estándar de catálogo y combos solemos contar con stock diario para entrega en el día o dentro de las 24 horas. Para platos especiales por encargo (como roulet o pollo relleno), consultanos con anticipación por WhatsApp para coordinar fecha de entrega.',
      tag: 'Anticipación',
    },
  ];

  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const whatsappInquiryUrl = buildGeneralInquiryUrl(
    '¡Hola! Tengo una duda sobre los productos y su cocina libre de gluten.'
  );

  return (
    <section
      id="faq"
      aria-labelledby="faq-section-title"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto scroll-mt-20"
    >
      {/* Cabecera */}
      <div className="text-center space-y-3 mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-terracotta-600/10 border border-terracotta-600/20 text-xs font-semibold tracking-wider uppercase text-terracotta-600">
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
          <span>RESPUESTAS CLARAS</span>
        </div>
        <h2
          id="faq-section-title"
          className="font-serif italic font-bold text-3xl sm:text-4xl text-ink-900 tracking-tight leading-tight"
        >
          Preguntas Frecuentes
        </h2>
        <p className="font-sans text-sm sm:text-base text-ink-600 max-w-xl mx-auto leading-relaxed">
          Todo lo que necesitás saber sobre nuestra cocina segura, tiempos de cocción, conservación y envíos en Río Cuarto.
        </p>
      </div>

      {/* Lista Acordeón Accesible */}
      <div className="space-y-3.5" role="region" aria-label="Acordeón de preguntas frecuentes">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          const questionId = `faq-question-${index}`;
          const answerId = `faq-answer-${index}`;

          return (
            <div
              key={faq.question}
              className={`rounded-2xl border transition-all duration-200 ${
                isOpen
                  ? 'bg-cream-50 border-terracotta-600/40 shadow-xs'
                  : 'bg-cream-50/80 border-cream-200 hover:border-cream-200/90 hover:bg-cream-50'
              }`}
            >
              <button
                type="button"
                id={questionId}
                aria-expanded={isOpen}
                aria-controls={answerId}
                data-testid={`faq-button-${index}`}
                onClick={() => handleToggle(index)}
                className="w-full text-left px-5 sm:px-6 py-4.5 sm:py-5 flex items-center justify-between gap-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600 rounded-2xl cursor-pointer group"
              >
                <div className="space-y-1">
                  {faq.tag && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-olive-600 block">
                      {faq.tag}
                    </span>
                  )}
                  <span className="font-serif font-bold text-base sm:text-lg text-ink-900 group-hover:text-terracotta-600 transition-colors leading-snug">
                    {faq.question}
                  </span>
                </div>

                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen
                      ? 'bg-terracotta-600 border-terracotta-600 text-cream-50 rotate-180'
                      : 'bg-cream-100/70 border-cream-200 text-ink-600 group-hover:text-ink-900 group-hover:border-terracotta-600/30'
                  }`}
                >
                  <ChevronDown className="w-4 h-4 transition-transform duration-300" aria-hidden="true" />
                </div>
              </button>

              {/* Región de Respuesta */}
              <div
                id={answerId}
                role="region"
                aria-labelledby={questionId}
                data-testid={`faq-answer-${index}`}
                hidden={!isOpen}
                className={`overflow-hidden transition-all duration-300 px-5 sm:px-6 ${
                  isOpen ? 'pb-5 sm:pb-6 pt-1' : 'max-h-0'
                }`}
              >
                <p className="font-sans text-sm sm:text-base text-ink-600 leading-relaxed border-t border-cream-200/60 pt-3.5">
                  {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Micro-CTA Limpio al pie de FAQ */}
      <div className="mt-10 sm:mt-12 text-center p-6 rounded-2xl bg-cream-50 border border-cream-200 space-y-3">
        <p className="font-serif italic font-medium text-lg text-ink-900">
          ¿Te quedó alguna otra duda sobre tu pedido o ingredientes?
        </p>
        <p className="text-xs sm:text-sm text-ink-600 max-w-md mx-auto">
          Respondemos personalmente cada consulta para que compres con total tranquilidad.
        </p>
        <div>
          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="faq-whatsapp-cta"
            className="inline-flex items-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-6 py-3 rounded-full text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            <span>Escribinos al {BUSINESS_CONFIG.whatsappDisplay}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
