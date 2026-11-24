import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// 0. VALIDACIÓN ESTÁTICA DE JSON-LD EN INDEX.HTML
// ---------------------------------------------------------------------------
function validateJsonLd() {
  console.log('--- 0. Verificación Estática: JSON-LD en index.html ---');
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  if (!jsonLdMatch) {
    throw new Error('No se encontró el bloque <script type="application/ld+json"> en index.html');
  }

  let data;
  try {
    data = JSON.parse(jsonLdMatch[1].trim());
  } catch (err) {
    throw new Error(`El JSON-LD no es JSON válido: ${err.message}`);
  }

  console.log('JSON-LD parseado exitosamente.');
  console.log('  @type:', data['@type']);
  console.log('  name:', data.name);
  console.log('  telephone:', data.telephone);
  console.log('  servesCuisine:', data.servesCuisine);
  console.log('  areaServed:', data.areaServed?.name);

  if (!data.name || data.name !== 'Sin Culpa Ni Gluten') {
    throw new Error(`name incorrecto en JSON-LD: ${data.name}`);
  }
  if (!Array.isArray(data['@type']) || !data['@type'].includes('FoodEstablishment')) {
    throw new Error(`@type debe incluir FoodEstablishment: ${JSON.stringify(data['@type'])}`);
  }
  if (!Array.isArray(data.servesCuisine) || !data.servesCuisine.includes('Sin TACC')) {
    throw new Error(`servesCuisine debe incluir 'Sin TACC'`);
  }
  if (data.telephone !== '+54-9-358-572-8550') {
    throw new Error(`telephone incorrecto: ${data.telephone}`);
  }

  console.log('✓ Validación de JSON-LD completada con éxito.\n');
}

async function runVerification() {
  validateJsonLd();

  console.log('=== Iniciando Verificación UI Fase 5 (Multi-Viewport & Auditoría Final) ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const consoleErrors = [];

  try {
    const page = await browser.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`[Page Error] ${err.toString()}`);
    });

    const VIEWPORTS = [
      { name: 'android-small', width: 360, height: 800, label: '360x800 (Android chico)' },
      { name: 'mobile-standard', width: 390, height: 844, label: '390x844 (móvil estándar)' },
      { name: 'tablet', width: 768, height: 1024, label: '768x1024 (tablet)' },
      { name: 'desktop', width: 1440, height: 900, label: '1440x900 (desktop)' },
    ];

    // =========================================================================
    // 1. EVALUACIÓN MULTI-VIEWPORT (0 SCROLL HORIZONTAL EN TODAS LAS RESOLUCIONES)
    // =========================================================================
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Evaluando Viewport: ${vp.label} ---`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

      // Limpiar pedido previo en localStorage
      await page.evaluate(() => {
        window.localStorage.removeItem('scng_order_v1');
      });
      await page.reload({ waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 400));

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          innerWidth: window.innerWidth,
          hasHorizontalOverflow: root.scrollWidth > window.innerWidth,
        };
      });

      console.log(`  Medición de ancho: scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`);
      if (overflow.hasHorizontalOverflow) {
        throw new Error(
          `¡Desborde horizontal detectado en ${vp.label}! scrollWidth (${overflow.scrollWidth}) > innerWidth (${overflow.innerWidth})`
        );
      }
      console.log(`  ✓ 0 Scroll horizontal confirmado en ${vp.label}`);

      // Captura de pantalla de la vista completa
      const shotPath = path.join(OUTPUT_DIR, `phase5-${vp.name}-overview.png`);
      await page.screenshot({ path: shotPath });
      console.log(`  Captura guardada: ${path.basename(shotPath)}`);
    }

    // =========================================================================
    // 2. AUDITORÍA EXHAUSTIVA DE ENLACES DE WHATSAPP EN EL DOM
    // =========================================================================
    console.log('\n--- 2. Auditoría Exhaustiva de Enlaces WhatsApp en el DOM ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    const whatsappLinksAudit = await page.evaluate(() => {
      const allAnchors = Array.from(document.querySelectorAll('a'));
      const waAnchors = allAnchors.filter((a) => a.href.includes('wa.me'));

      const results = waAnchors.map((a, idx) => ({
        index: idx,
        text: a.textContent?.trim().slice(0, 40) || a.getAttribute('aria-label') || 'Sin texto',
        href: a.href,
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
        correctPhone: a.href.startsWith('https://wa.me/5493585728550'),
        hasOldPhone: a.href.includes('3584330638'),
      }));

      // Buscar si existe el número viejo en cualquier parte del DOM (texto o atributos)
      const bodyHtml = document.body.innerHTML;
      const oldPhoneInDom = bodyHtml.includes('3584330638');

      return {
        totalWaLinks: waAnchors.length,
        results,
        oldPhoneInDom,
      };
    });

    console.log(`Total de enlaces WhatsApp encontrados en el DOM inicial: ${whatsappLinksAudit.totalWaLinks}`);
    console.log('¿Existe el número viejo (3584330638) en el HTML del DOM?', whatsappLinksAudit.oldPhoneInDom);

    if (whatsappLinksAudit.oldPhoneInDom) {
      throw new Error('Se encontró el número viejo 3584330638 en el DOM');
    }

    for (const link of whatsappLinksAudit.results) {
      console.log(`  [Link ${link.index}] "${link.text}" -> ${link.href.slice(0, 50)}...`);
      if (!link.correctPhone) {
        throw new Error(`Enlace no apunta a https://wa.me/5493585728550: ${link.href}`);
      }
      if (link.target !== '_blank') {
        throw new Error(`Enlace no tiene target="_blank": ${link.href}`);
      }
      if (!link.rel || !link.rel.includes('noopener')) {
        throw new Error(`Enlace no tiene rel="noopener noreferrer": ${link.href}`);
      }
    }
    console.log('✓ Todos los enlaces WhatsApp apuntan a 5493585728550 con target="_blank" y rel seguro.\n');

    // =========================================================================
    // 3. VALIDACIÓN DE ACORDEÓN FAQ Y EDICIÓN DE PREGUNTA 6 (SIN 48 HS)
    // =========================================================================
    console.log('--- 3. Verificación de FAQ y Copy Fiel en Pregunta 6 ---');
    await page.evaluate(() => {
      document.getElementById('faq')?.scrollIntoView({ behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 400));

    // Abrir pregunta 5 (la sexta pregunta, índice 5)
    await page.evaluate(() => {
      const btn5 = document.querySelector('button[data-testid="faq-button-5"]');
      btn5?.click();
    });
    await new Promise((r) => setTimeout(r, 350));

    const faq6Data = await page.evaluate(() => {
      const answerEl = document.querySelector('div[data-testid="faq-answer-5"]');
      const text = answerEl?.textContent?.trim() || '';
      return {
        text,
        has48hs: text.includes('48 horas') || text.includes('48 hs'),
        hasConsultanosAnticipacion: text.includes('consultanos con anticipación por WhatsApp para coordinar fecha de entrega'),
      };
    });

    console.log('Texto de FAQ 6:', faq6Data.text);
    if (faq6Data.has48hs) {
      throw new Error('La pregunta 6 de FAQ todavía contiene la mención de 48 hs');
    }
    if (!faq6Data.hasConsultanosAnticipacion) {
      throw new Error('La pregunta 6 de FAQ no contiene la redacción fiel esperada');
    }
    console.log('✓ Pregunta 6 de FAQ validada: libre de "48 hs" y con redacción fiel.\n');

    // =========================================================================
    // 4. VALIDACIÓN DE FAVICON Y LINK APPLE-TOUCH-ICON EN EL DOM
    // =========================================================================
    console.log('--- 4. Verificación de Favicon e Íconos en Head ---');
    const headIcons = await page.evaluate(() => {
      const icon = document.querySelector('link[rel="icon"]')?.getAttribute('href');
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');
      return { icon, appleIcon };
    });
    console.log('Iconos en Head:', headIcons);
    if (headIcons.icon !== '/favicon.svg') {
      throw new Error(`Favicon no apunta a /favicon.svg: ${headIcons.icon}`);
    }
    if (headIcons.appleIcon !== '/favicon.svg') {
      throw new Error(`apple-touch-icon no apunta a /favicon.svg: ${headIcons.appleIcon}`);
    }
    console.log('✓ Favicon y apple-touch-icon correctamente configurados.\n');

    // =========================================================================
    // 5. VALIDACIÓN DE FLUJO DEL PEDIDO Y DRAWER EN RESOLUCIÓN MÓVIL (390x844)
    // =========================================================================
    console.log('--- 5. Verificación de Flujo de Pedido, Carrito y Modal en Móvil ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    // Sumar un combo al pedido
    await page.evaluate(() => {
      const addBtn = document.querySelector('button[data-testid="add-to-cart-combo-semana-practica"]');
      addBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Abrir OrderDrawer
    await page.evaluate(() => {
      const openBtn = document.querySelector('button[data-testid="navbar-cart-btn"]');
      openBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Verificar contenido del Drawer y enlace final de WhatsApp
    const drawerAudit = await page.evaluate(() => {
      const drawer = document.getElementById('order-drawer-content');
      const orderCta = document.querySelector('a[data-testid="whatsapp-order-cta"]');
      return {
        foundDrawer: !!drawer,
        ctaHref: orderCta?.getAttribute('href') || '',
        ctaTarget: orderCta?.getAttribute('target'),
        ctaRel: orderCta?.getAttribute('rel'),
      };
    });
    console.log('Estado de OrderDrawer:', drawerAudit);

    if (!drawerAudit.foundDrawer) {
      throw new Error('OrderDrawer no se abrió al hacer clic en el carrito');
    }
    if (!drawerAudit.ctaHref.startsWith('https://wa.me/5493585728550')) {
      throw new Error(`CTA de pedido en OrderDrawer no apunta a https://wa.me/5493585728550: ${drawerAudit.ctaHref}`);
    }
    if (drawerAudit.ctaTarget !== '_blank' || !drawerAudit.ctaRel?.includes('noopener')) {
      throw new Error('CTA de pedido en OrderDrawer no tiene target="_blank" o rel seguro');
    }

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'phase5-mobile-drawer-open.png') });
    console.log('Captura guardada: phase5-mobile-drawer-open.png');

    // Probar tecla Escape para cerrar OrderDrawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 350));

    const drawerClosed = await page.evaluate(() => {
      const drawer = document.getElementById('order-drawer-content');
      return !drawer || drawer.closest('.fixed')?.classList.contains('pointer-events-none');
    });
    console.log('¿OrderDrawer cerrado con tecla Escape?', drawerClosed);
    if (!drawerClosed) {
      throw new Error('OrderDrawer no se cerró correctamente al presionar Escape');
    }

    // =========================================================================
    // 6. VERIFICACIÓN DE CONSOLA Y ERRORES DE PÁGINA
    // =========================================================================
    console.log('\n--- 6. Verificación de Errores de Consola ---');
    console.log(`Total errores capturados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Errores:', consoleErrors);
      throw new Error(`Se detectaron ${consoleErrors.length} errores de consola: ${consoleErrors.join('; ')}`);
    }
    console.log('✓ 0 Errores de consola registrados en todas las pruebas.');

    console.log('\n============================================================');
    console.log('🎉 ¡AUDITORÍA DE FASE 5 COMPLETADA CON ÉXITO ABSOLUTO!');
    console.log('0 errores de consola, 0 scroll horizontal en 4 viewports.');
    console.log('============================================================\n');
  } finally {
    await browser.close();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ Falló la verificación de Fase 5:', err);
  process.exit(1);
});
