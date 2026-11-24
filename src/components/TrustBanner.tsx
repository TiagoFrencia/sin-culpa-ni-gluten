import { ShieldCheck, MessageCircle, ArrowRight } from 'lucide-react';
import { buildGeneralInquiryUrl } from '@/utils/whatsapp';

export function TrustBanner() {
  const whatsappUrl = buildGeneralInquiryUrl(
    '¡Hola! Estuve leyendo sobre su cocina segura libre de contaminación cruzada y quisiera hacerles una consulta.'
  );

  return (
    <section
      aria-label="Compromiso de cocina segura"
      className="border-y border-[#E5DCCB] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ backgroundColor: '#EAE1D2' }}
    >
      <div className="max-w-4xl mx-auto text-center space-y-5">
        {/* Badge distintivo */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream-50 border border-[#E5DCCB] text-xs font-semibold text-ink-900 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-olive-600" aria-hidden="true" />
          <span>Garantía de Seguridad Celíaca</span>
        </div>

        {/* Título Serif Editorial */}
        <h2 className="font-serif italic font-bold text-2xl sm:text-3xl lg:text-4xl text-ink-900 tracking-tight leading-tight">
          Cocina 100% libre de contaminación cruzada
        </h2>

        {/* Bajada empática y clara */}
        <p className="font-sans text-sm sm:text-base lg:text-lg text-ink-600 max-w-2xl mx-auto leading-relaxed">
          Cada elaboración se prepara en un hogar exclusivo Sin Gluten con ingredientes certificados,
          para que comas rico y seguro todos los días.
        </p>

        {/* 2 Accesos equilibrados */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          {/* Ancla a la historia */}
          <a
            href="#cocina-segura"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-cream-50 hover:bg-cream-100 text-ink-900 border border-[#E5DCCB] font-semibold px-6 py-2.5 rounded-full text-xs sm:text-sm transition-all active:scale-95 shadow-2xs text-center"
          >
            <span>Conocé nuestra historia</span>
            <ArrowRight className="w-4 h-4 text-ink-600" aria-hidden="true" />
          </a>

          {/* Consulta directa por WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-6 py-2.5 rounded-full text-xs sm:text-sm transition-all active:scale-95 shadow-xs text-center"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            <span>Hacenos una consulta</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default TrustBanner;
