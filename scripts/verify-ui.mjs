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
  if (!Array.isArray(data.servesCuisine) || !data.servesCuisine.includes('Sin Gluten')) {
    throw new Error(`servesCuisine debe incluir 'Sin Gluten'`);
  }
  if (data.telephone !== '+54-9-358-572-8550') {
    throw new Error(`telephone incorrecto: ${data.telephone}`);
  }

  console.log('✓ Validación de JSON-LD completada con éxito.\n');
}

async function runVerification() {
  validateJsonLd();

  console.log('=== Iniciando Verificación UI Fase 5 (Mobile Polish & Auditoría Final) ===\n');

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

      // Guardar captura
      const shotPath = path.join(OUTPUT_DIR, `phase5-${vp.name}-overview.png`);
      await page.screenshot({ path: shotPath });
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
    // 3. REVISIÓN DE NAVBAR COMPACTO EN MÓVIL (390x844)
    // =========================================================================
    console.log('--- 3. Verificación de Navbar Móvil Compacto (390x844) ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    const navbarMetrics = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      const rect = nav ? nav.getBoundingClientRect() : null;
      const brandSpan = nav?.querySelector('span.whitespace-nowrap');
      const subtitle = nav?.querySelector('span.hidden.sm\\:inline-block');
      const desktopWaBtn = nav?.querySelector('a.hidden.sm\\:inline-flex');
      return {
        height: rect ? Math.round(rect.height) : 0,
        hasWhitespaceNowrap: !!brandSpan,
        subtitleHiddenOnMobile: !!subtitle,
        waButtonHiddenOnMobile: !!desktopWaBtn,
      };
    });

    console.log('Métricas de Navbar móvil:', navbarMetrics);
    if (navbarMetrics.height > 76) {
      throw new Error(`Navbar móvil supera el límite compacto: ${navbarMetrics.height}px > 76px`);
    }
    if (!navbarMetrics.hasWhitespaceNowrap) {
      throw new Error('El título de marca en Navbar no tiene whitespace-nowrap');
    }
    console.log(`✓ Altura de Navbar en móvil = ${navbarMetrics.height}px (<= 76px, 1 sola línea).\n`);

    // =========================================================================
    // 4. VERIFICACIÓN DE BADGES EN STORYSECTION EN MÓVIL (360x800 Y 390x844)
    // =========================================================================
    console.log('--- 4. Verificación de Badges en StorySection (sin superposición) ---');
    await page.evaluate(() => {
      document.getElementById('cocina-segura')?.scrollIntoView({ behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 400));

    const storyBadges = await page.evaluate(() => {
      const section = document.getElementById('cocina-segura');
      const badgesContainer = section?.querySelector('.flex-wrap');
      const badges = section?.querySelectorAll('.bg-sintacc-red, .bg-espresso-950\\/85');
      const b1 = badges?.[0]?.getBoundingClientRect();
      const b2 = badges?.[1]?.getBoundingClientRect();

      let overlap = false;
      if (b1 && b2) {
        overlap = !(b1.right <= b2.left || b1.left >= b2.right || b1.bottom <= b2.top || b1.top >= b2.bottom);
      }

      return {
        hasFlexWrap: !!badgesContainer,
        badge1Text: badges?.[0]?.textContent?.trim(),
        badge2Text: badges?.[1]?.textContent?.trim(),
        overlap,
      };
    });

    console.log('Badges en StorySection:', storyBadges);
    if (!storyBadges.hasFlexWrap) {
      throw new Error('El contenedor de badges en StorySection no tiene flex-wrap');
    }
    if (storyBadges.overlap) {
      throw new Error('Los badges de StorySection se superponen');
    }
    console.log('✓ Badges de StorySection renderizan correctamente sin recortarse ni pisarse.\n');

    // =========================================================================
    // 5. VERIFICACIÓN DE FALLBACK COMPACTO Y FOOTER EN ORDERDRAWER
    // =========================================================================
    console.log('--- 5. Verificación de OrderDrawer (Fallback Compacto, Precios y Footer) ---');

    // Sumar 2 combos para probar subtotal y precio por unidad ("c/u")
    await page.evaluate(() => {
      const comboBtn = document.querySelector('button[data-testid="add-to-cart-combo-semana-practica"]');
      comboBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 350));

    // Aumentar a 2 unidades para que aparezca "c/u"
    await page.evaluate(() => {
      const incBtn = document.querySelector('[data-testid="quantity-selector-combo-semana-practica"] button:last-child');
      incBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 350));

    // Sumar 1 producto sin foto para probar el fallback compacto (ej: prepizza-salsa)
    await page.evaluate(() => {
      const article = Array.from(document.querySelectorAll('article')).find((a) =>
        a.textContent?.includes('Prepizza')
      );
      const addBtn = article?.querySelector('button:not([aria-label*="detalles"])');
      addBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 350));

    // Abrir OrderDrawer
    await page.evaluate(() => {
      const openBtn = document.querySelector('button[data-testid="navbar-cart-btn"]');
      openBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 450));

    const drawerChecks = await page.evaluate(() => {
      const drawer = document.getElementById('order-drawer-content');
      if (!drawer) return { foundDrawer: false };

      // 1. Verificar "Pack combo" en vez de redundante "Combo"
      const comboLabel = Array.from(drawer.querySelectorAll('p')).find((p) =>
        p.textContent?.includes('Pack combo')
      );

      // 2. Verificar que aparezca "c/u" en el combo (qty 2) y no en el producto de qty 1
      const perUnitElements = Array.from(drawer.querySelectorAll('span')).filter((s) =>
        s.textContent?.includes('c/u')
      );

      // 3. Verificar que las miniaturas fallback sean compactas sin texto
      const thumbnails = drawer.querySelectorAll('.w-14 .bg-espresso-900');
      let fallbackHasText = false;
      thumbnails.forEach((t) => {
        // Si hay fallback (sin img cargada o con error), no debe contener textos de títulos o categorías
        const txt = t.textContent?.trim();
        if (txt && txt.length > 5) {
          fallbackHasText = true;
        }
      });

      // 4. Verificar clases tabular-nums en los precios
      const tabularPrices = drawer.querySelectorAll('.tabular-nums');

      return {
        foundDrawer: true,
        foundPackCombo: !!comboLabel,
        perUnitCount: perUnitElements.length,
        fallbackHasText,
        tabularPricesCount: tabularPrices.length,
      };
    });

    console.log('Resultados de auditoría de OrderDrawer:', drawerChecks);

    if (!drawerChecks.foundDrawer) {
      throw new Error('OrderDrawer no se abrió');
    }
    if (!drawerChecks.foundPackCombo) {
      throw new Error('No se encontró "Pack combo" en el ítem de combo del Drawer');
    }
    if (drawerChecks.perUnitCount !== 1) {
      throw new Error(`Se esperaba exactamente 1 elemento con "c/u" (para cantidad > 1), se encontraron: ${drawerChecks.perUnitCount}`);
    }
    if (drawerChecks.fallbackHasText) {
      throw new Error('El fallback compacto en miniatura contiene texto largo');
    }
    if (drawerChecks.tabularPricesCount === 0) {
      throw new Error('Los precios del Drawer no tienen la clase tabular-nums');
    }
    console.log('✓ OrderDrawer verificado: Pack combo, precios tabulares, condicional "c/u" y miniatura compacta.\n');

    // Cerrar OrderDrawer con Escape
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 300));

    // =========================================================================
    // 6. VERIFICACIÓN DE CONSOLA Y ERRORES DE PÁGINA
    // =========================================================================
    console.log('--- 6. Verificación de Errores de Consola ---');
    console.log(`Total errores capturados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Errores:', consoleErrors);
      throw new Error(`Se detectaron ${consoleErrors.length} errores de consola: ${consoleErrors.join('; ')}`);
    }
    console.log('✓ 0 Errores de consola registrados.');

    console.log('\n============================================================');
    console.log('🎉 ¡TODAS LAS CORRECCIONES DE FASE 5 PASARON AL 100%!');
    console.log('============================================================\n');
  } finally {
    await browser.close();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ Falló la verificación:', err);
  process.exit(1);
});
