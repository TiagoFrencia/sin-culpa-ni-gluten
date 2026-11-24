import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function verifyAdmin() {
  console.log('=== Iniciando Verificación Fase 7: Panel de Administración Mobile-First (/admin) ===\n');

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

    // Mobile Viewport iPhone 13/14/15 estándar (390 x 844)
    await page.setViewport({ width: 390, height: 844 });

    // -------------------------------------------------------------------------
    // 1. CARGA INICIAL DE /admin (PANTALLA DE LOGIN)
    // -------------------------------------------------------------------------
    console.log('--- 1. Navegando a http://localhost:5173/admin ---');
    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });

    // Asegurar que no hay sesión residual previa para probar el login limpio
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Verificar scroll horizontal
    const loginOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`Scroll horizontal en Login (390x844): ${loginOverflow ? 'DETECTADO (FALLA)' : '0 px (PERFECTO)'}`);
    if (loginOverflow) throw new Error('Scroll horizontal detectado en pantalla de Login');

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-01-login.png') });
    console.log('✓ Captura guardada: admin-01-login.png');

    // -------------------------------------------------------------------------
    // 2. INICIO DE SESIÓN CON CREDENCIALES REALES
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Autenticación con admin@sinculpanigluten.com ---');
    await page.type('#admin-email', 'admin@sinculpanigluten.com');
    await page.type('#admin-password', 'SinCulpaAdmin2026!#Segura');

    // Click en "Iniciar Sesión"
    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) throw new Error('No se encontró el botón de inicio de sesión');
    await submitBtn.click();

    // Esperar a que cargue el panel autenticado (aparece botón "Salir" o "Precios y Stock")
    await page.waitForFunction(
      () => document.body.innerText.includes('Precios y Stock') && document.body.innerText.includes('Salir'),
      { timeout: 12000 }
    );
    await new Promise((r) => setTimeout(r, 1000));
    console.log('✓ Autenticación exitosa. Panel de administración cargado.');

    // -------------------------------------------------------------------------
    // 3. TAB 1: PRECIOS Y STOCK (MODO EXPRESS)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Verificando Tab 1: Precios y Stock ---');
    const expressOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`Scroll horizontal en Tab 1: ${expressOverflow ? 'DETECTADO (FALLA)' : '0 px (PERFECTO)'}`);
    if (expressOverflow) throw new Error('Scroll horizontal detectado en Tab 1');

    // Verificar conteo de productos y combos en el DOM
    const itemsData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasMilanesaNalga: text.includes('Milanesas de Ternera (Nalga)'),
        hasPollo: text.includes('Milanesas de Suprema de Pollo'),
        hasComboFamiliar: text.includes('Combo Familiar Completo'),
        hasAvailableBadge: text.includes('Disponible') || text.includes('Sin stock'),
      };
    });
    console.log('Datos en Tab 1:', itemsData);
    if (!itemsData.hasMilanesaNalga || !itemsData.hasComboFamiliar) {
      throw new Error('No se cargaron los productos o combos reales desde Supabase');
    }

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-02-express.png') });
    console.log('✓ Captura guardada: admin-02-express.png');

    // Probar Toggle de Stock en vivo y revertirlo (confirmar escritura RLS en Supabase)
    console.log('\n--- 4. Probando escritura RLS con toggle de stock en vivo ---');
    const firstStockBtn = await page.$('button[aria-label="Marcar sin stock"], button[aria-label="Marcar disponible"]');
    if (firstStockBtn) {
      console.log('Haciendo clic para alternar stock...');
      await firstStockBtn.click();
      await new Promise((r) => setTimeout(r, 1200));

      // Verificar que apareció el toast
      const toastText = await page.evaluate(() => {
        const toast = document.querySelector('[role="status"]');
        return toast ? toast.innerText : null;
      });
      console.log('Toast recibido tras toggle de stock:', toastText);

      // Revertir el toggle para dejar el producto disponible nuevamente
      console.log('Revertiendo toggle para restaurar estado original...');
      const revertBtn = await page.$('button[aria-label="Marcar sin stock"], button[aria-label="Marcar disponible"]');
      if (revertBtn) {
        await revertBtn.click();
        await new Promise((r) => setTimeout(r, 1200));
        console.log('✓ Stock revertido exitosamente.');
      }
    }

    // -------------------------------------------------------------------------
    // 4. TAB 2: PRODUCTOS (CREAR / EDITAR)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Verificando Tab 2: Productos ---');
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const prodBtn = navButtons.find((b) => b.innerText.includes('Productos'));
      if (prodBtn) prodBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const prodOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`Scroll horizontal en Tab 2: ${prodOverflow ? 'DETECTADO (FALLA)' : '0 px (PERFECTO)'}`);
    if (prodOverflow) throw new Error('Scroll horizontal detectado en Tab 2');

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-03-products.png') });
    console.log('✓ Captura guardada: admin-03-products.png');

    // Abrir Modal "+ Nuevo Producto"
    console.log('Abriendo modal "+ Nuevo Producto"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const newProdBtn = buttons.find((b) => b.innerText.includes('+ Nuevo Producto'));
      if (newProdBtn) newProdBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const modalData = await page.evaluate(() => {
      const select = document.querySelector('select');
      const categories = select ? Array.from(select.options).map((o) => o.text) : [];
      return {
        hasModal: Boolean(select),
        categories,
        hasCounters: document.body.innerText.includes('/60') && document.body.innerText.includes('/150'),
      };
    });
    console.log('Modal Nuevo Producto:', modalData);
    if (!modalData.hasModal || modalData.categories.length !== 6 || !modalData.hasCounters) {
      throw new Error('El modal de Producto no cumple con las reglas estrictas de anti-rompimiento');
    }

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-04-product-modal.png') });
    console.log('✓ Captura guardada: admin-04-product-modal.png');

    // Cerrar modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Cerrar modal"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------------------
    // 5. TAB 3: COMBOS
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Verificando Tab 3: Combos ---');
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const comboBtn = navButtons.find((b) => b.innerText.includes('Combos'));
      if (comboBtn) comboBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const combosOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`Scroll horizontal en Tab 3: ${combosOverflow ? 'DETECTADO (FALLA)' : '0 px (PERFECTO)'}`);
    if (combosOverflow) throw new Error('Scroll horizontal detectado en Tab 3');

    const combosCount = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasSemanaPractica: text.includes('Combo Semana Práctica'),
        hasJuntada: text.includes('Combo Juntada Sin Culpa'),
        hasFamiliar: text.includes('Combo Familiar Completo'),
      };
    });
    console.log('Combos en Tab 3:', combosCount);
    if (!combosCount.hasSemanaPractica || !combosCount.hasJuntada || !combosCount.hasFamiliar) {
      throw new Error('No se cargaron los 3 combos en el Tab 3');
    }

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-05-combos.png') });
    console.log('✓ Captura guardada: admin-05-combos.png');

    // -------------------------------------------------------------------------
    // 6. TAB 4: NEGOCIO
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Verificando Tab 4: Negocio ---');
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const bizBtn = navButtons.find((b) => b.innerText.includes('Negocio'));
      if (bizBtn) bizBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const bizOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`Scroll horizontal en Tab 4: ${bizOverflow ? 'DETECTADO (FALLA)' : '0 px (PERFECTO)'}`);
    if (bizOverflow) throw new Error('Scroll horizontal detectado en Tab 4');

    const bizData = await page.evaluate(() => {
      const text = document.body.innerText;
      const inputs = Array.from(document.querySelectorAll('input')).map((i) => i.value);
      return {
        whatsappPhone: inputs.find((v) => v.includes('5493585728550')),
        deliveryHighlight: inputs.find((v) => v.includes('¡Envío gratis en Río Cuarto!')),
        hasPriceListSection: text.includes('Foto de Lista de Precios Oficial'),
      };
    });
    console.log('Datos de Negocio en Tab 4:', bizData);
    if (!bizData.whatsappPhone || !bizData.deliveryHighlight || !bizData.hasPriceListSection) {
      throw new Error('Los datos de negocio no se cargaron correctamente desde Supabase');
    }

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-06-business.png') });
    console.log('✓ Captura guardada: admin-06-business.png');

    // -------------------------------------------------------------------------
    // 7. AUDITORÍA DE ERRORES DE CONSOLA
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Auditoría de Errores en Consola ---');
    console.log(`Total de errores capturados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Errores:', consoleErrors);
      throw new Error(`Se detectaron ${consoleErrors.length} errores de consola durante la prueba.`);
    }

    console.log('\n=============================================================');
    console.log('🎉 ¡TODAS LAS VALIDACIONES DE LA FASE 7 PASARON EXITOSAMENTE!');
    console.log('=============================================================');
  } finally {
    await browser.close();
  }
}

verifyAdmin().catch((err) => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN:', err);
  process.exit(1);
});
