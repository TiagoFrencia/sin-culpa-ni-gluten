import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
];

async function verifyAdmin() {
  console.log('=== Iniciando Verificación Fase 7/8: Panel Admin Mobile-First (360px & 390px) ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const consoleErrors = [];

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      // Simular tablas de analíticas vacías si aún no se corrió la migración V3 en la nube
      if (url.includes('/rest/v1/order_intents') || url.includes('/rest/v1/daily_metrics')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          body: JSON.stringify([]),
        });
      } else {
        req.continue();
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()} (${msg.location()?.url || 'no-url'})`);
      }
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        console.log(`  [HTTP ${res.status()}] ${res.url()}`);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`[Page Error] ${err.toString()}`);
    });

    // Helper para verificar scroll horizontal
    const checkOverflow = async (contextName) => {
      const data = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      console.log(`  [Overflow Check] ${contextName} (${data.innerWidth}px): scrollWidth=${data.scrollWidth}px -> ${data.overflow ? 'FALLA' : 'OK (0px desborde)'}`);
      if (data.overflow) {
        throw new Error(`Desborde horizontal detectado en ${contextName}: scrollWidth (${data.scrollWidth}px) > innerWidth (${data.innerWidth}px)`);
      }
      return data;
    };

    // Helper para verificar que un elemento no se corta a la derecha
    const checkElementWithinBounds = async (selector, elementName) => {
      const isWithin = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { found: false, right: 0, innerWidth: window.innerWidth };
        const rect = el.getBoundingClientRect();
        return {
          found: true,
          right: Math.round(rect.right),
          innerWidth: window.innerWidth,
          within: rect.right <= window.innerWidth + 1, // 1px tolerancia de redondeo
        };
      }, selector);

      if (!isWithin.found) {
        console.warn(`  [Bounds Check] Elemento no encontrado: ${elementName} (${selector})`);
        return;
      }

      console.log(`  [Bounds Check] ${elementName}: right=${isWithin.right}px <= innerWidth=${isWithin.innerWidth}px -> ${isWithin.within ? 'OK' : 'RECORTADO'}`);
      if (!isWithin.within) {
        throw new Error(`Elemento ${elementName} se corta a la derecha: right (${isWithin.right}px) > innerWidth (${isWithin.innerWidth}px)`);
      }
    };

    // -------------------------------------------------------------------------
    // 1. CARGA INICIAL Y LOGIN EN 360x800
    // -------------------------------------------------------------------------
    console.log('--- 1. Carga de /admin en 360x800 y Login ---');
    await page.setViewport({ width: 360, height: 800 });
    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });

    // Limpiar sesión previa
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    await checkOverflow('Login 360x800');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-360-01-login.png') });
    console.log('  ✓ Captura guardada: admin-360-01-login.png');

    // Iniciar sesión
    await page.type('#admin-email', 'admin@sinculpanigluten.com');
    await page.type('#admin-password', 'SinCulpaAdmin2026!#Segura');
    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) throw new Error('No se encontró el botón de inicio de sesión');
    await submitBtn.click();

    await page.waitForFunction(
      () => document.body.innerText.includes('Precios y Stock') && Boolean(document.querySelector('button[title="Cerrar sesión"]')),
      { timeout: 12000 }
    );
    await new Promise((r) => setTimeout(r, 1000));
    console.log('  ✓ Autenticación exitosa.');

    // -------------------------------------------------------------------------
    // ITERAR AMBAS RESOLUCIONES (360x800 y 390x844)
    // -------------------------------------------------------------------------
    for (const vp of VIEWPORTS) {
      console.log(`\n=============================================================`);
      console.log(`>>> VALIDANDO RESOLUCIÓN: ${vp.name} (${vp.width} x ${vp.height}) <<<`);
      console.log(`=============================================================`);

      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise((r) => setTimeout(r, 400));

      // 1. Verificación del Header
      console.log(`\n--- [${vp.name}] Header Superior y Botón Salir ---`);
      await checkOverflow(`Header ${vp.name}`);
      await checkElementWithinBounds('button[title="Cerrar sesión"]', 'Botón Salir');

      // 2. Tab 1: Precios y Stock
      console.log(`\n--- [${vp.name}] Tab 1: Precios y Stock ---`);
      await page.evaluate(() => {
        const navButtons = Array.from(document.querySelectorAll('nav button'));
        const tabBtn = navButtons.find((b) => b.innerText.includes('Precios y Stock'));
        if (tabBtn) tabBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      await checkOverflow(`Tab 1 ${vp.name}`);

      // Comprobar nombres completos sin truncamiento a "Milanesas de Ter..."
      const namesCheck = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasNalga: text.includes('Milanesas de Ternera (Nalga)'),
          hasCuadrada: text.includes('Milanesas de Ternera (Cuadrada)'),
          hasPollo: text.includes('Milanesas de Suprema de Pollo'),
          hasTruncatedTer: text.includes('Milanesas de Ter...'),
        };
      });
      console.log(`  [Names Check] Nalga: ${namesCheck.hasNalga}, Cuadrada: ${namesCheck.hasCuadrada}, Pollo: ${namesCheck.hasPollo}`);
      if (!namesCheck.hasNalga || !namesCheck.hasCuadrada) {
        throw new Error('Los nombres de las milanesas de ternera no se cargaron correctamente');
      }
      if (namesCheck.hasTruncatedTer) {
        throw new Error('Se detectó nombre truncado como "Milanesas de Ter..."');
      }

      // Comprobar inputMode="numeric" en inputs de precio
      const inputsModeCheck = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
        const priceInputs = inputs.filter((i) => i.placeholder === '0' || i.className.includes('font-bold'));
        return priceInputs.every((i) => i.inputMode === 'numeric');
      });
      console.log(`  [InputMode Check] Todos los inputs de precio tienen inputMode="numeric": ${inputsModeCheck}`);

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-02-express.png`) });
      console.log(`  ✓ Captura guardada: admin-${vp.width}-02-express.png`);

      // 3. Tab 2: Productos
      console.log(`\n--- [${vp.name}] Tab 2: Productos ---`);
      await page.evaluate(() => {
        const navButtons = Array.from(document.querySelectorAll('nav button'));
        const tabBtn = navButtons.find((b) => b.innerText.includes('Productos'));
        if (tabBtn) tabBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      await checkOverflow(`Tab 2 ${vp.name}`);

      // Comprobar botón Editar y Eliminar compacto
      const buttonsCheck = await page.evaluate(() => {
        const editButtons = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('Editar'));
        const deleteButtons = Array.from(document.querySelectorAll('button[aria-label="Eliminar producto"]'));
        return {
          hasEdit: editButtons.length > 0,
          hasDelete: deleteButtons.length > 0,
        };
      });
      console.log(`  [Product Actions Check] Editar: ${buttonsCheck.hasEdit}, Eliminar icono: ${buttonsCheck.hasDelete}`);
      if (!buttonsCheck.hasEdit || !buttonsCheck.hasDelete) {
        throw new Error('No se encontraron los botones de Editar y Eliminar en Tab 2');
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-03-products.png`) });

      // Abrir Modal "+ Nuevo Producto"
      console.log(`  Abriendo Modal "+ Nuevo Producto"...`);
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const newBtn = buttons.find((b) => b.innerText.includes('+ Nuevo Producto'));
        if (newBtn) newBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      await checkOverflow(`Modal Nuevo Producto ${vp.name}`);
      await checkElementWithinBounds('button[aria-label="Cerrar modal"]', 'Modal Producto: Botón Cerrar (X)');
      await checkElementWithinBounds('input[placeholder="Ej. Milanesas de Suprema de Pollo"]', 'Modal Producto: Input Nombre');

      // Verificar que Descripción Corta y Tip de Cocción son textareas
      const isCookingTipTextarea = await page.evaluate(() => {
        const textareas = Array.from(document.querySelectorAll('textarea'));
        const hasDesc = textareas.some((t) => t.placeholder && t.placeholder.includes('Tiernas milanesas'));
        const hasTip = textareas.some((t) => t.placeholder && t.placeholder.includes('Al horno directo'));
        return hasDesc && hasTip;
      });
      console.log(`  [Modal Form Check] Tip de Cocción es textarea: ${isCookingTipTextarea}`);
      if (!isCookingTipTextarea) {
        throw new Error('El tip de cocción en modal de Producto debe ser un <textarea>');
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-04-product-modal.png`) });
      console.log(`  ✓ Captura guardada: admin-${vp.width}-04-product-modal.png`);

      // Cerrar modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Cerrar modal"]');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));

      // 4. Tab 3: Combos
      console.log(`\n--- [${vp.name}] Tab 3: Combos ---`);
      await page.evaluate(() => {
        const navButtons = Array.from(document.querySelectorAll('nav button'));
        const tabBtn = navButtons.find((b) => b.innerText.includes('Combos'));
        if (tabBtn) tabBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      await checkOverflow(`Tab 3 ${vp.name}`);

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-05-combos.png`) });

      // Abrir Modal "+ Nuevo Combo"
      console.log(`  Abriendo Modal "+ Nuevo Combo"...`);
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const newBtn = buttons.find((b) => b.innerText.includes('+ Nuevo Combo'));
        if (newBtn) newBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      await checkOverflow(`Modal Nuevo Combo ${vp.name}`);
      await checkElementWithinBounds('button[aria-label="Cerrar modal"]', 'Modal Combo: Botón Cerrar (X)');

      // Verificar botón "+ Agregar" y campos de precio
      const comboModalBounds = await page.evaluate(() => {
        const addBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('+ Agregar'));
        const inputs = Array.from(document.querySelectorAll('input'));
        const regularPrice = inputs.find((i) => i.className.includes('font-bold') && i.type === 'text');
        const textareas = Array.from(document.querySelectorAll('textarea'));
        const hasSubtitleTextarea = textareas.some((t) => t.placeholder && t.placeholder.includes('Abastecé tu freezer'));

        const addRect = addBtn ? Math.round(addBtn.getBoundingClientRect().right) : null;
        const regRect = regularPrice ? Math.round(regularPrice.getBoundingClientRect().right) : null;

        return {
          hasSubtitleTextarea,
          addBtnRight: addRect,
          regularPriceRight: regRect,
          innerWidth: window.innerWidth,
          addBtnWithin: addRect !== null ? addRect <= window.innerWidth : false,
          regularPriceWithin: regRect !== null ? regRect <= window.innerWidth : false,
        };
      });
      console.log(`  [Combo Modal Check] Subtítulo es textarea: ${comboModalBounds.hasSubtitleTextarea}`);
      console.log(`  [Combo Modal Check] Botón + Agregar right: ${comboModalBounds.addBtnRight}px <= ${comboModalBounds.innerWidth}px -> ${comboModalBounds.addBtnWithin ? 'OK' : 'RECORTADO'}`);
      console.log(`  [Combo Modal Check] Input Precio Regular right: ${comboModalBounds.regularPriceRight}px <= ${comboModalBounds.innerWidth}px -> ${comboModalBounds.regularPriceWithin ? 'OK' : 'RECORTADO'}`);

      if (!comboModalBounds.hasSubtitleTextarea || !comboModalBounds.addBtnWithin || !comboModalBounds.regularPriceWithin) {
        throw new Error('Falla en los límites del modal de Combo');
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-06-combo-modal.png`) });
      console.log(`  ✓ Captura guardada: admin-${vp.width}-06-combo-modal.png`);

      // Cerrar modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Cerrar modal"]');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));

      // 5. Tab 4: Negocio
      console.log(`\n--- [${vp.name}] Tab 4: Negocio ---`);
      await page.evaluate(() => {
        const navButtons = Array.from(document.querySelectorAll('nav button'));
        const tabBtn = navButtons.find((b) => b.innerText.includes('Negocio'));
        if (tabBtn) tabBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      await checkOverflow(`Tab 4 ${vp.name}`);

      // Comprobar campos simplificados de WhatsApp e Instagram
      const bizCheck = await page.evaluate(() => {
        const text = document.body.innerText;
        const inputs = Array.from(document.querySelectorAll('input')).map((i) => ({
          value: i.value,
          placeholder: i.placeholder,
        }));

        const hasFriendlyWhatsApp = text.includes('Número de WhatsApp (con código de área, sin 0 ni 15)');
        const hasLiveWaLink = text.includes('Link de pedidos activo:') && text.includes('wa.me/549');
        const hasFriendlyInstagram = text.includes('Usuario de Instagram');
        const hasLiveIgLink = text.includes('Perfil enlazado:') && text.includes('instagram.com/');

        return {
          hasFriendlyWhatsApp,
          hasLiveWaLink,
          hasFriendlyInstagram,
          hasLiveIgLink,
          inputsCount: inputs.length,
        };
      });
      console.log(`  [Business Settings Check] WhatsApp amigable: ${bizCheck.hasFriendlyWhatsApp}, Link en vivo: ${bizCheck.hasLiveWaLink}`);
      console.log(`  [Business Settings Check] Instagram amigable: ${bizCheck.hasFriendlyInstagram}, Link en vivo: ${bizCheck.hasLiveIgLink}`);

      if (!bizCheck.hasFriendlyWhatsApp || !bizCheck.hasLiveWaLink || !bizCheck.hasFriendlyInstagram || !bizCheck.hasLiveIgLink) {
        throw new Error('Los campos simplificados de WhatsApp e Instagram en Tab Negocio no cumplen con los requisitos');
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-07-business.png`) });
      console.log(`  ✓ Captura guardada: admin-${vp.width}-07-business.png`);

      // 5. Tab 5: Métricas del Negocio (Fase 10)
      console.log(`\n--- [${vp.name}] Tab 5: Métricas del Negocio ---`);
      await page.evaluate(() => {
        const navButtons = Array.from(document.querySelectorAll('nav button'));
        const tabBtn = navButtons.find((b) => b.innerText.includes('Métricas'));
        if (tabBtn) tabBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      await checkOverflow(`Tab 5 Métricas ${vp.name}`);

      // Comprobar elementos clave de analíticas y contabilidad
      const analyticsCheck = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return {
          hasHeader: text.includes('métricas del negocio'),
          hasConfirmedSales: text.includes('ventas confirmadas'),
          hasPending: text.includes('por confirmar'),
          hasTicket: text.includes('ticket promedio'),
          hasFunnel: text.includes('embudo de conversión') || text.includes('visitas'),
          hasRanking: text.includes('ranking de platos'),
          hasReconciliation: text.includes('conciliación de pedidos'),
          hasExportCSV: Boolean(
            document.querySelector('button[title*="CSV"]') ||
            Array.from(document.querySelectorAll('button')).some((b) => b.innerText.toLowerCase().includes('exportar csv'))
          ),
        };
      });

      console.log(`  [Analytics Tab Check] Header: ${analyticsCheck.hasHeader}, Ventas Confirmadas: ${analyticsCheck.hasConfirmedSales}, Ticket: ${analyticsCheck.hasTicket}, Embudo: ${analyticsCheck.hasFunnel}, Ranking: ${analyticsCheck.hasRanking}, Export CSV: ${analyticsCheck.hasExportCSV}`);

      if (
        !analyticsCheck.hasHeader ||
        !analyticsCheck.hasConfirmedSales ||
        !analyticsCheck.hasPending ||
        !analyticsCheck.hasTicket ||
        !analyticsCheck.hasRanking ||
        !analyticsCheck.hasExportCSV
      ) {
        throw new Error('La pestaña Métricas no contiene todos los módulos contables requeridos');
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-08-analytics.png`) });
      console.log(`  ✓ Captura guardada: admin-${vp.width}-08-analytics.png`);
    }

    // -------------------------------------------------------------------------
    // AUDITORÍA DE ERRORES DE CONSOLA
    // -------------------------------------------------------------------------
    console.log('\n--- Auditoría Final de Errores de Consola ---');
    console.log(`Total de errores capturados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Errores:', consoleErrors);
      throw new Error(`Se detectaron ${consoleErrors.length} errores de consola durante la prueba.`);
    }

    console.log('\n=============================================================================');
    console.log('🎉 ¡TODAS LAS VALIDACIONES DE RESPONSIVIDAD (360px & 390px) PASARON CON ÉXITO!');
    console.log('=============================================================================');
  } finally {
    await browser.close();
  }
}

verifyAdmin().catch((err) => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN:', err);
  process.exit(1);
});
