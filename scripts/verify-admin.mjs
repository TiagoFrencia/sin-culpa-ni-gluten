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
      const corsHeaders = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      };
      // Simular tablas de analíticas V3 y V6 vacías si aún no se corrió la migración en la nube
      if (
        url.includes('/rest/v1/order_intents') ||
        url.includes('/rest/v1/daily_metrics') ||
        url.includes('/rest/v1/product_costs') ||
        url.includes('/rest/v1/daily_channel_metrics') ||
        url.includes('/rest/v1/daily_product_signals') ||
        url.includes('/rest/v1/daily_hourly_metrics')
      ) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify([]),
        });
      } else if (
        url.includes('/rest/v1/rpc/track_channel_and_slot') ||
        url.includes('/rest/v1/rpc/track_product_signal') ||
        url.includes('/rest/v1/rpc/increment_daily_metric')
      ) {
        req.respond({
          status: 204,
          contentType: 'application/json',
          headers: corsHeaders,
          body: '',
        });
      } else if (url.includes('/rest/v1/upcoming_items')) {
        // Simular tabla upcoming_items si aún no se corrió la migración V5 en la nube
        const mockUpcoming = [
          {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'Tarta de Pollo',
            description: 'Masa casera 100% Sin Gluten con relleno cremoso de pollo y vegetales.',
            badge: 'Muy pronto',
            image_url: null,
            active: true,
            sort_order: 1,
            created_at: '2026-11-28T00:00:00.000Z',
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            title: 'Tarta de Acelga',
            description: 'Acelga fresca, queso y masa artesanal lista para hornear.',
            badge: 'Próximamente',
            image_url: null,
            active: true,
            sort_order: 2,
            created_at: '2026-11-28T00:00:00.000Z',
          },
          {
            id: '33333333-3333-3333-3333-333333333333',
            title: 'Ñoquis Caseros',
            description: 'Ñoquis artesanales de papa 100% Sin Gluten, suaves y listos en minutos.',
            badge: 'En desarrollo',
            image_url: null,
            active: false,
            sort_order: 3,
            created_at: '2026-11-28T00:00:00.000Z',
          },
        ];
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify(req.method() === 'GET' ? mockUpcoming : []),
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

      // 3b. Sub-pestaña Próximamente en Tab 2 (Fase 11)
      console.log(`\n--- [${vp.name}] Tab 2b: Sub-pestaña Próximamente ---`);
      const upcomingTabClicked = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
        const upcomingTab = tabs.find((b) => b.innerText.includes('Próximamente'));
        if (upcomingTab) {
          upcomingTab.click();
          return true;
        }
        return false;
      });
      if (!upcomingTabClicked) {
        throw new Error('No se encontró el botón selector "Próximamente" en ProductosTab');
      }
      await new Promise((r) => setTimeout(r, 500));
      await checkOverflow(`Tab 2 Próximamente ${vp.name}`);

      const upcomingListCheck = await page.evaluate(() => {
        const text = document.body.innerText;
        const switches = document.querySelectorAll('button[role="switch"]');
        const deleteBtns = document.querySelectorAll('button[aria-label="Eliminar próximo ingreso"]');
        const addBtn = Array.from(document.querySelectorAll('button')).find((b) =>
          b.innerText.includes('+ Agregar próximo ingreso')
        );
        return {
          hasTitle: text.includes('Tarta de Pollo') && text.includes('Ñoquis Caseros'),
          hasSwitches: switches.length >= 3,
          hasDeleteBtns: deleteBtns.length >= 3,
          hasAddBtn: Boolean(addBtn),
        };
      });
      console.log(`  [Upcoming List Check] Títulos: ${upcomingListCheck.hasTitle}, Switches: ${upcomingListCheck.hasSwitches}, Eliminar: ${upcomingListCheck.hasDeleteBtns}, +Agregar: ${upcomingListCheck.hasAddBtn}`);
      if (!upcomingListCheck.hasTitle || !upcomingListCheck.hasSwitches || !upcomingListCheck.hasDeleteBtns || !upcomingListCheck.hasAddBtn) {
        throw new Error('Falla en la lista o controles de la sub-pestaña Próximamente');
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-03b-upcoming.png`) });
      console.log(`  ✓ Captura guardada: admin-${vp.width}-03b-upcoming.png`);

      // Abrir Modal "+ Agregar próximo ingreso"
      console.log(`  Abriendo Modal "+ Agregar próximo ingreso"...`);
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find((b) => b.innerText.includes('+ Agregar próximo ingreso'));
        if (addBtn) addBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));

      await checkOverflow(`Modal Próximo Ingreso ${vp.name}`);
      await checkElementWithinBounds('button[aria-label="Cerrar modal"]', 'Modal Próximo Ingreso: Botón Cerrar (X)');
      await checkElementWithinBounds('input[placeholder="Ej. Tarta de Pollo"]', 'Modal Próximo Ingreso: Input Nombre');

      const upcomingModalCheck = await page.evaluate(() => {
        const hasTitleInput = Boolean(document.querySelector('input[placeholder="Ej. Tarta de Pollo"]'));
        const hasBadgeInput = Boolean(document.querySelector('input[placeholder*="Próximamente"]'));
        const hasDescTextarea = Boolean(document.querySelector('textarea[rows="2"]'));
        const hasVisibleSwitch = Boolean(document.querySelector('button[aria-label="Visible en la tienda"]'));
        return { hasTitleInput, hasBadgeInput, hasDescTextarea, hasVisibleSwitch };
      });
      console.log(`  [Upcoming Modal Check] Nombre: ${upcomingModalCheck.hasTitleInput}, Etiqueta: ${upcomingModalCheck.hasBadgeInput}, Descripción textarea: ${upcomingModalCheck.hasDescTextarea}, Switch Visible: ${upcomingModalCheck.hasVisibleSwitch}`);
      if (!upcomingModalCheck.hasTitleInput || !upcomingModalCheck.hasBadgeInput || !upcomingModalCheck.hasDescTextarea || !upcomingModalCheck.hasVisibleSwitch) {
        throw new Error('El modal de Próximo Ingreso no contiene todos los campos requeridos');
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-04b-upcoming-modal.png`) });
      console.log(`  ✓ Captura guardada: admin-${vp.width}-04b-upcoming-modal.png`);

      // Cerrar modal y volver a Catálogo
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Cerrar modal"]');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 300));
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
        const catalogTab = tabs.find((b) => b.innerText.includes('Catálogo'));
        if (catalogTab) catalogTab.click();
      });
      await new Promise((r) => setTimeout(r, 300));

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

      // 5. Tab 5: Métricas del Negocio (Fase 12: 4 sub-vistas + Excel)
      console.log(`\n--- [${vp.name}] Tab 5: Métricas del Negocio (4 Sub-vistas) ---`);
      await page.evaluate(() => {
        const navButtons = Array.from(document.querySelectorAll('nav button'));
        const tabBtn = navButtons.find((b) => b.innerText.includes('Métricas'));
        if (tabBtn) tabBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));
      await checkOverflow(`Tab 5 Métricas Resumen ${vp.name}`);

      // Sub-vista 1: Resumen
      const analyticsSummaryCheck = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return {
          hasHeader: text.includes('métricas del negocio'),
          hasConfirmedSales: text.includes('ventas confirmadas'),
          hasPending: text.includes('por confirmar'),
          hasTicket: text.includes('ticket promedio'),
          hasMargin: text.includes('margen bruto'),
          hasFunnel: text.includes('embudo de conversión'),
          hasRanking: text.includes('ranking de platos'),
          hasBasket: text.includes('se compran juntos'),
          hasExportExcel: Array.from(document.querySelectorAll('button')).some((b) =>
            b.innerText.toLowerCase().includes('exportar excel')
          ),
          hasExportCSV: Array.from(document.querySelectorAll('button')).some((b) =>
            b.innerText.trim().toLowerCase() === 'csv'
          ),
        };
      });

      console.log(`  [Analytics Resumen Check]`, analyticsSummaryCheck);
      if (
        !analyticsSummaryCheck.hasHeader ||
        !analyticsSummaryCheck.hasConfirmedSales ||
        !analyticsSummaryCheck.hasPending ||
        !analyticsSummaryCheck.hasTicket ||
        !analyticsSummaryCheck.hasMargin ||
        !analyticsSummaryCheck.hasRanking ||
        !analyticsSummaryCheck.hasBasket ||
        !analyticsSummaryCheck.hasExportExcel ||
        !analyticsSummaryCheck.hasExportCSV
      ) {
        throw new Error('La sub-vista Resumen de Métricas no contiene todos los módulos requeridos');
      }
      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-08a-analytics-resumen.png`) });

      // Sub-vista 2: Pedidos
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
        const ordersTab = tabs.find((b) => b.innerText.includes('Pedidos'));
        if (ordersTab) ordersTab.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await checkOverflow(`Tab 5 Métricas Pedidos ${vp.name}`);
      const ordersViewOk = await page.evaluate(() =>
        document.body.innerText.toLowerCase().includes('conciliación de pedidos')
      );
      if (!ordersViewOk) throw new Error('Falla en sub-vista Pedidos');
      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-08b-analytics-pedidos.png`) });

      // Sub-vista 3: Mercado
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
        const marketTab = tabs.find((b) => b.innerText.includes('Mercado'));
        if (marketTab) marketTab.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await checkOverflow(`Tab 5 Métricas Mercado ${vp.name}`);
      const marketViewOk = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('qué quieren que lancemos') && t.includes('sensibilidad de precios') && t.includes('atribución de canales');
      });
      if (!marketViewOk) throw new Error('Falla en sub-vista Mercado');
      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-08c-analytics-mercado.png`) });

      // Sub-vista 4: Costos
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
        const costsTab = tabs.find((b) => b.innerText.includes('Costos'));
        if (costsTab) costsTab.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await checkOverflow(`Tab 5 Métricas Costos ${vp.name}`);
      const costsViewOk = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('costos privados y márgenes') && t.includes('guardar costos');
      });
      if (!costsViewOk) throw new Error('Falla en sub-vista Costos');
      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin-${vp.width}-08d-analytics-costos.png`) });
      console.log(`  ✓ Capturas guardadas de las 4 sub-vistas de Métricas (${vp.width}px)`);

      if (vp.width === 390) {
        // Probar exportación Excel (.xlsx) con lazy import en el navegador
        console.log(`  Probando generación de Excel (.xlsx) multi-hoja...`);
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) =>
            b.innerText.toLowerCase().includes('exportar excel')
          );
          if (btn) btn.click();
        });
        await page.waitForFunction(
          () => document.body.innerText.includes('Excel generado: SinCulpaNiGluten_Reporte_'),
          { timeout: 10000 }
        );
        console.log('  ✓ Exportación Excel (.xlsx) ejecutada con éxito sin errores.');
      }
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
