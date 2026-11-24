import { AnnouncementBar } from '@/components/AnnouncementBar';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { TrustBar } from '@/components/TrustBar';
import { CombosSection } from '@/components/CombosSection';
import { TrustBanner } from '@/components/TrustBanner';
import { CatalogSection } from '@/components/CatalogSection';
import { StorySection } from '@/components/StorySection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { FaqSection } from '@/components/FaqSection';
import { Footer } from '@/components/Footer';
import { FloatingOrderBar } from '@/components/FloatingOrderBar';
import { OrderDrawer } from '@/components/OrderDrawer';
import { OrderProvider } from '@/context/OrderContext';

export function App() {
  return (
    <OrderProvider>
      <div className="min-h-screen flex flex-col bg-paper-texture text-ink-900 selection:bg-terracotta-600 selection:text-cream-50">
        {/* Cabecera Envolvente: AnnouncementBar + Navbar Sticky + Hero Editorial */}
        <header className="bg-espresso-950 text-cream-50 relative">
          <AnnouncementBar />
          <Navbar />
          <Hero />
        </header>

        {/* Banda de Confianza (Garantías rápidas) */}
        <TrustBar />

        <main className="flex-1">
          {/* 1. Combos para Freezer (id="combos" — fondo espresso editorial oscuro) */}
          <CombosSection />

          {/* 2. TrustBanner (Banda horizontal de corte editorial entre Combos y Menú) */}
          <TrustBanner />

          {/* 3. Menú Completo Interactivo (id="menu" — catálogo con tabs, variantes y modales) */}
          <CatalogSection />

          {/* 4. Sección de Confianza y Cocina Segura (id="cocina-segura") */}
          <StorySection />

          {/* 5. Cómo funciona: Del freezer a tu mesa en 3 pasos */}
          <HowItWorksSection />

          {/* 6. Preguntas Frecuentes Celíacas (id="faq") */}
          <FaqSection />
        </main>

        {/* Footer Editorial de Cierre (Fondo espresso-950 con padding para FloatingOrderBar) */}
        <Footer />

        {/* Barra flotante de pedido y Drawer de checkout híbrido */}
        <FloatingOrderBar />
        <OrderDrawer />
      </div>
    </OrderProvider>
  );
}

export default App;
