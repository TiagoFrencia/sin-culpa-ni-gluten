import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = process.cwd();
const HTML_OUTPUT_PATH = path.resolve(ROOT_DIR, 'GUIA_CLIENTE.html');
const PDF_OUTPUT_PATH = path.resolve(ROOT_DIR, 'GUIA_CLIENTE_SIN_CULPA.pdf');
const PUBLIC_HTML_OUTPUT_PATH = path.resolve(ROOT_DIR, 'public', 'guia-cliente.html');
const PUBLIC_PDF_OUTPUT_PATH = path.resolve(ROOT_DIR, 'public', 'guia-cliente.pdf');

const htmlContent = `<!DOCTYPE html>
<html lang="es-AR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guía del Panel de Control — Sin Culpa Ni Gluten</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-primary: #A64B2A;
      --color-primary-dark: #8C3D21;
      --color-dark: #1D120D;
      --color-brown-subtle: #6B574B;
      --color-bg-sand: #FAF7F2;
      --color-border: #E5DCCB;
      --color-border-subtle: #F0EAE1;
      --color-emerald: #059669;
      --color-emerald-bg: #ECFDF5;
      --color-emerald-border: #A7F3D0;
      --color-amber: #D97706;
      --color-amber-bg: #FFFBEB;
      --color-amber-border: #FDE68A;
      --color-rose: #E11D48;
      --color-rose-bg: #FFF1F2;
      --color-rose-border: #FECDD3;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--color-dark);
      background-color: var(--color-bg-sand);
      line-height: 1.55;
      font-size: 13.5px;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 24px;
    }

    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: 20px;
      padding: 36px 40px;
      box-shadow: 0 10px 30px rgba(29, 18, 13, 0.04);
    }

    /* Portada / Header */
    .header {
      border-bottom: 2px solid var(--color-border);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FAF7F2;
      border: 1px solid var(--color-border);
      color: var(--color-primary);
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }

    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 34px;
      font-weight: 700;
      color: var(--color-dark);
      line-height: 1.15;
      margin-bottom: 8px;
    }

    .lead {
      font-size: 14.5px;
      color: var(--color-brown-subtle);
      line-height: 1.5;
    }

    .greeting-box {
      margin-top: 14px;
      background: #FAF7F2;
      border-left: 4px solid var(--color-primary);
      padding: 12px 16px;
      border-radius: 0 12px 12px 0;
      font-size: 13px;
      color: var(--color-dark);
    }

    /* Secciones */
    .section {
      margin-bottom: 32px;
      page-break-inside: auto;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--color-dark);
      border-bottom: 1.5px solid var(--color-border);
      padding-bottom: 8px;
      margin-bottom: 18px;
    }

    .section-title .icon {
      font-size: 22px;
    }

    .subsection-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-dark);
      margin: 16px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    p {
      margin-bottom: 10px;
      color: #33241C;
    }

    /* Tarjetas y Contenedores */
    .card {
      background: #FAF7F2;
      border: 1px solid var(--color-border);
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 14px;
      break-inside: avoid;
    }

    .card-white {
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 14px;
      break-inside: avoid;
    }

    .card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
      break-inside: avoid;
    }

    @media (max-width: 600px) {
      .card-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Badges y Botones visuales */
    .btn-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid transparent;
      vertical-align: middle;
    }

    .badge-green {
      background: var(--color-emerald-bg);
      color: var(--color-emerald);
      border-color: var(--color-emerald-border);
    }

    .badge-red {
      background: var(--color-rose-bg);
      color: var(--color-rose);
      border-color: var(--color-rose-border);
    }

    .badge-amber {
      background: var(--color-amber-bg);
      color: var(--color-amber);
      border-color: var(--color-amber-border);
    }

    .badge-primary {
      background: #FAF7F2;
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    .badge-filled-primary {
      background: var(--color-primary);
      color: #FFFFFF;
    }

    .badge-dark {
      background: var(--color-dark);
      color: #FFFFFF;
    }

    /* Links estilizados */
    a.link-box {
      display: block;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 10px 14px;
      margin: 6px 0 10px 0;
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      word-break: break-all;
    }

    /* Listas numeradas y con viñetas */
    ol, ul {
      margin-left: 20px;
      margin-bottom: 12px;
    }

    li {
      margin-bottom: 6px;
      color: #33241C;
    }

    /* Pasos grandes */
    .step-list {
      list-style: none;
      margin-left: 0;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }

    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-content {
      flex: 1;
    }

    /* Callouts / Avisos */
    .callout {
      background: #FFFDF9;
      border: 1px dashed var(--color-primary);
      border-radius: 12px;
      padding: 12px 16px;
      margin: 12px 0;
      font-size: 12.5px;
      break-inside: avoid;
    }

    .callout-title {
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .code-pill {
      font-family: monospace;
      background: #F3ECE2;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 12px;
      color: var(--color-dark);
      border: 1px solid var(--color-border);
    }

    /* Tabla */
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 12.5px;
      break-inside: avoid;
    }

    .table-custom th, .table-custom td {
      border: 1px solid var(--color-border);
      padding: 8px 12px;
      text-align: left;
    }

    .table-custom th {
      background: #FAF7F2;
      font-weight: 700;
      color: var(--color-dark);
    }

    .footer {
      border-top: 2px solid var(--color-border);
      padding-top: 18px;
      margin-top: 28px;
      text-align: center;
      font-size: 12px;
      color: var(--color-brown-subtle);
    }

    @media print {
      body {
        padding: 0;
        background: #FFFFFF;
      }
      .container {
        border: none;
        padding: 0;
        box-shadow: none;
        max-width: 100%;
      }
      .section {
        page-break-inside: auto;
      }
      .card, .card-white, .table-custom, .callout {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- Encabezado / Portada -->
    <header class="header">
      <div class="brand-badge">🌾 Sin Culpa Ni Gluten • Río Cuarto, Córdoba</div>
      <h1>Guía Práctica del Panel de Control</h1>
      <p class="lead">Manual operativo de uso diario para <strong>Flor y Fabrizio</strong>. Todo lo que necesitan para administrar precios, stock, fotos y pedidos desde el celular.</p>
      <div class="greeting-box">
        ✨ <strong>Tranquilidad absoluta:</strong> El sistema está blindado para que nada se rompa ni se desconfigure por error. Pueden usarlo con total confianza desde la cocina o mientras preparan los envíos.
      </div>
    </header>

    <!-- SECCIÓN 1 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">📱</span> 1. Accesos y cómo instalar el panel en el celular</h2>
      
      <div class="card">
        <p><strong>Enlaces oficiales:</strong></p>
        <p>🛒 <strong>Tienda pública (lo que ven sus clientes):</strong><br>
          <a class="link-box" href="https://sin-culpa-ni-gluten.vercel.app" target="_blank">👉 https://sin-culpa-ni-gluten.vercel.app</a>
        </p>
        <p>🔐 <strong>Panel de administración (exclusivo para ustedes):</strong><br>
          <a class="link-box" href="https://sin-culpa-ni-gluten.vercel.app/admin" target="_blank">👉 https://sin-culpa-ni-gluten.vercel.app/admin</a>
        </p>
        
        <div style="background: white; border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; margin-top: 10px;">
          <p style="margin: 0;"><strong>Datos de ingreso iniciales:</strong></p>
          <p style="margin: 4px 0 0 0;">• <strong>Usuario:</strong> <span class="code-pill">admin@sinculpanigluten.com</span><br>
          • <strong>Contraseña inicial:</strong> <span class="code-pill">SinCulpaAdmin2026!#Segura</span><br>
          <span style="font-size: 11.5px; color: var(--color-brown-subtle);">(Pueden cambiarla cuando quieran por una propia desde la pestaña <em>Negocio</em>).</span></p>
        </div>
      </div>

      <div class="card-white">
        <h3 class="subsection-title">💡 Guardar como ícono en el celular (Como una App)</h3>
        <p>Para no tener que escribir la dirección cada vez que quieran entrar:</p>
        
        <div class="card-grid">
          <div style="border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; background: #FAF7F2;">
            <p><strong>🤖 En Android (Google Chrome):</strong></p>
            <ol style="margin-left: 16px; margin-bottom: 0;">
              <li>Abran el link del panel <span class="code-pill">/admin</span>.</li>
              <li>Toquen los <strong>3 puntitos</strong> arriba a la derecha.</li>
              <li>Elijan <strong>"Agregar a pantalla principal"</strong> (o "Instalar app").</li>
              <li>Confirmen tocando <strong>"Agregar"</strong>.</li>
            </ol>
          </div>

          <div style="border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; background: #FAF7F2;">
            <p><strong>🍏 En iPhone (Safari):</strong></p>
            <ol style="margin-left: 16px; margin-bottom: 0;">
              <li>Abran el link del panel <span class="code-pill">/admin</span>.</li>
              <li>Toquen el botón de compartir abajo (el <strong>cuadradito con la flecha</strong>).</li>
              <li>Elijan <strong>"Agregar a pantalla de inicio"</strong>.</li>
              <li>Toquen <strong>"Agregar"</strong> arriba a la derecha.</li>
            </ol>
          </div>
        </div>
        <p style="margin: 0; font-size: 12px; color: var(--color-brown-subtle);">¡Listo! Les queda un ícono directo con el logo de Sin Culpa Ni Gluten en su pantalla de inicio.</p>
      </div>
    </section>

    <!-- SECCIÓN 2 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">⚡</span> 2. Pestaña "Precios y Stock" (Uso diario en 10 seg)</h2>
      
      <p>Es la primera pantalla que verán al entrar. Diseñada especialmente para resolver cualquier urgencia en pocos segundos:</p>

      <div class="card">
        <h3 class="subsection-title">🟢 Pausar o reactivar stock con un toque</h3>
        <p>Al lado de cada producto o combo tienen un botón táctil grande:</p>
        <div style="display: flex; gap: 10px; margin: 10px 0; flex-wrap: wrap;">
          <span class="btn-badge badge-green" style="font-size: 12px; padding: 6px 12px;">🟢 Disponible</span>
          <span class="btn-badge badge-red" style="font-size: 12px; padding: 6px 12px;">🔴 Sin stock</span>
        </div>
        <ul style="margin-bottom: 0;">
          <li><strong>Si tocan "Sin stock":</strong> se pausa al instante en la web, bloquea el carrito para ese producto y <strong>lo quita automáticamente de la lista de precios</strong> para que nadie encargue algo que se agotó.</li>
          <li><strong>Si tocan "Disponible":</strong> vuelve a estar activo para la venta de inmediato.</li>
        </ul>
      </div>

      <div class="card-white">
        <h3 class="subsection-title">💵 Modificar un precio puntual</h3>
        <ul class="step-list">
          <li class="step-item">
            <span class="step-num">1</span>
            <div class="step-content">Escriban el nuevo importe en el casillero con el signo <strong>$</strong> de la variante elegida (ej. en <em>1 kg</em> o <em>Docena</em>).</div>
          </li>
          <li class="step-item">
            <span class="step-num">2</span>
            <div class="step-content">Si prefieren que los clientes pregunten el precio por privado, toquen el botón <strong>"Consultar"</strong>.</div>
          </li>
          <li class="step-item">
            <span class="step-num">3</span>
            <div class="step-content">Toquen <strong>"Guardar"</strong> en la tarjeta (o el botón flotante negro abajo que dice <em>"Guardar todo"</em>).</div>
          </li>
        </ul>
      </div>

      <div class="card">
        <h3 class="subsection-title">📈 Aumento masivo en porcentaje (<span class="btn-badge badge-primary">Ajustar precios en %</span>)</h3>
        <p>Cuando aumente la materia prima o haya inflación, ya no tienen que cambiar producto por producto:</p>
        <ul class="step-list">
          <li class="step-item">
            <span class="step-num">1</span>
            <div class="step-content">Toquen el botón blanco <strong>"Ajustar precios en %"</strong> arriba a la izquierda.</div>
          </li>
          <li class="step-item">
            <span class="step-num">2</span>
            <div class="step-content">Elijan el porcentaje rápido (<span class="btn-badge badge-filled-primary">+5%</span>, <span class="btn-badge badge-filled-primary">+10%</span>, <span class="btn-badge badge-filled-primary">+15%</span>) o escriban el porcentaje libre.</div>
          </li>
          <li class="step-item">
            <span class="step-num">3</span>
            <div class="step-content"><strong>Alcance:</strong> elijan si aplica a <em>Todo</em>, <em>Solo productos</em> o <em>Solo combos</em>.</div>
          </li>
          <li class="step-item">
            <span class="step-num">4</span>
            <div class="step-content"><strong>Redondeo:</strong> elijan <em>Múltiplo de $100</em> (ej. $14.800) o <em>Múltiplo de $500</em> (ideal para cambio justo en billetes, ej. $15.000).</div>
          </li>
          <li class="step-item">
            <span class="step-num">5</span>
            <div class="step-content"><strong>Vista previa:</strong> verán la tabla comparativa con <strong>Precio actual ➔ Precio nuevo</strong> antes de confirmar. <em>(Los ítems con precio "Consultar" nunca se modifican)</em>.</div>
          </li>
          <li class="step-item">
            <span class="step-num">6</span>
            <div class="step-content">Toquen <strong>"Aplicar ajuste"</strong> y todo el catálogo se actualiza en 1 segundo.</div>
          </li>
        </ul>
      </div>

      <div class="card-white" style="border-left: 4px solid var(--color-primary);">
        <h3 class="subsection-title">📲 Flyer vertical automático para Estados de WhatsApp e Instagram</h3>
        <p>¡Ya no hace falta armar diseños en Canva ni Photoshop cuando cambian un precio!</p>
        <p>• <strong>La web genera la lista de precios oficial en vivo:</strong> siempre muestra los productos que tienen en stock y los precios del día.<br>
        • <strong>Botón <span class="btn-badge badge-filled-primary">Descargar lista para Estados / IG</span>:</strong> tocan el botón marrón arriba a la derecha y en 2 segundos se descarga en su celular la imagen vertical en alta definición (1080x1920 px), con su logo, diseño y datos de contacto, lista para publicar en sus Estados o Historias.</p>
      </div>
    </section>

    <!-- SECCIÓN 3 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">🥐</span> 3. Pestaña "Productos" y Pestaña "Combos"</h2>
      
      <div class="card">
        <h3 class="subsection-title">Crear o editar productos y combos</h3>
        <p>• <strong>Productos:</strong> toquen <span class="btn-badge badge-filled-primary">+ Nuevo Producto</span>. Ingresan nombre, categoría, presentaciones (1 kg, docena, etc.), precios y tips de cocción.<br>
        • <strong>Combos para Freezer:</strong> en la pestaña <em>Combos</em> pueden cargar los ítems incluidos línea por línea, el precio de lista y un <strong>Precio Promocional opcional</strong> (ej. Regular $25.000 / Promo $22.500) que se muestra tachado con un cartel de descuento.</p>
      </div>

      <div class="card-white" style="border-left: 4px solid var(--color-primary);">
        <h3 class="subsection-title">🚀 Sub-pestaña "Próximamente" (Adelantar nuevos ingresos)</h3>
        <p>Dentro de la pestaña <em>Productos</em>, arriba tienen el selector <strong>Próximamente</strong> para anticipar platos que están desarrollando (como tartas o pastas) antes de sacarlos a la venta:</p>
        <ul style="margin-bottom: 0;">
          <li>Toquen <strong>Próximamente</strong> y luego <span class="btn-badge badge-filled-primary">+ Agregar próximo ingreso</span>.</li>
          <li>Carguen el <strong>Nombre</strong>, una <strong>Etiqueta corta</strong> (ej. <em>Muy pronto</em>, <em>En desarrollo</em>) y una <strong>Descripción breve</strong>. No hace falta precio ni foto (la foto es opcional).</li>
          <li>Con el interruptor <strong>Visible / Oculto</strong> eligen al instante si se muestra en la web. Si no hay ninguno activo, la sección desaparece sola.</li>
          <li>En la tienda, sus clientes ven un botón <strong>"Avisame cuando salga"</strong> que les abre WhatsApp listo para pedirles aviso.</li>
        </ul>
      </div>

      <div class="card-white">
        <h3 class="subsection-title">📸 Subir fotos desde el celular (Cámara o Galería)</h3>
        <p>Al editar o crear un producto/combo, toquen el botón de la cámara. <strong>El sistema hace todo el trabajo técnico por ustedes:</strong></p>
        <ul>
          <li><strong>Recorta en proporción 4:3</strong> automáticamente para que ninguna foto quede deformada ni estirada.</li>
          <li><strong>Comprime el peso</strong> para que la tienda cargue volando sin consumir datos a los clientes.</li>
          <li><strong>Limpia la foto anterior:</strong> si cambian una foto vieja, la borra del servidor automáticamente para no ocupar espacio de más.</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="subsection-title">↕️ Cambiar el orden de aparición (<span class="btn-badge badge-dark">↑</span> / <span class="btn-badge badge-dark">↓</span>)</h3>
        <p>Al lado de cada comida tienen flechas <strong>Subir (↑)</strong> y <strong>Bajar (↓)</strong>. Con un toque mueven un producto más arriba o más abajo para darle más protagonismo a lo que más les interese vender esa semana.</p>
      </div>

      <div class="callout">
        <div class="callout-title">💡 Consejo de oro</div>
        Si se quedan sin ingredientes para un plato, <strong>usen siempre el botón "Sin stock" en vez de borrar el producto</strong>. Así no pierden la foto, la descripción ni los precios cargados, y lo reactivan cuando vuelvan a cocinarlo.
      </div>
    </section>

    <!-- SECCIÓN 4 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">⚙️</span> 4. Pestaña "Negocio" (Control de agenda y datos)</h2>

      <div class="card-white" style="border: 1.5px solid var(--color-amber-border); background: var(--color-amber-bg);">
        <h3 class="subsection-title" style="color: var(--color-dark);">⏸️ Pausar pedidos por agenda completa o vacaciones</h3>
        <p>Si tienen un feriado, viajan o alcanzaron el límite de pedidos que pueden cocinar:</p>
        <ol style="margin-left: 18px;">
          <li>Toquen el botón <strong>"⏸️ Pausado (Pedidos pausados)"</strong>.</li>
          <li>Escriban el mensaje para los clientes (ej. <em>"Agenda completa por hoy. Volvemos a tomar pedidos el martes a las 9 hs."</em>).</li>
          <li><strong>Efecto en la tienda:</strong> aparece un aviso destacado arriba de todo y <strong>se bloquea el botón de enviar pedido en el carrito</strong>, impidiendo que les lleguen encargos que no pueden atender.</li>
          <li>Cuando vuelvan a cocinar, tocan <strong>"🟢 Activo"</strong> y la tienda reabre al instante.</li>
        </ol>
      </div>

      <div class="card">
        <h3 class="subsection-title">📞 Teléfono de WhatsApp, Instagram y Barra Superior</h3>
        <ul>
          <li><strong>WhatsApp de recepción:</strong> escriban el teléfono con código de área pero <strong>sin el 0 ni el 15</strong> (ej. <span class="code-pill">358 572-8550</span>). El sistema le agrega el prefijo 549 y genera los enlaces de compra de forma automática.</li>
          <li><strong>Instagram:</strong> solo escriban su usuario (ej. <span class="code-pill">@sinculpa.nigluten</span>).</li>
          <li><strong>Barra Superior:</strong> pueden cambiar el anuncio de arriba (ej. <em>"¡Envío gratis en Río Cuarto!"</em>).</li>
        </ul>
      </div>

      <div class="card-white">
        <h3 class="subsection-title">🔐 Cambiar la contraseña del panel</h3>
        <p>Al final de la pestaña <em>Negocio</em> tienen la sección de seguridad: escriben su nueva clave personal (mínimo 8 caracteres), la confirman y tocan <strong>"Actualizar Contraseña"</strong>.</p>
      </div>
    </section>

    <!-- SECCIÓN 5 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">📊</span> 5. Pestaña "Métricas" (Control contable, márgenes y mercado)</h2>

      <div class="card">
        <h3 class="subsection-title">📅 Filtro de tiempo y las 4 sub-vistas</h3>
        <p>Arriba pueden elegir el período tocando: <span class="btn-badge badge-dark">7 días</span> <span class="btn-badge badge-dark">Este mes</span> <span class="btn-badge badge-dark">Mes anterior</span> <span class="btn-badge badge-dark">Todo</span>, y alternar entre 4 sub-vistas limpias:</p>
        <ol style="margin-bottom: 0;">
          <li><strong>Resumen (Contabilidad y Crecimiento):</strong> muestra <strong>Ventas Confirmadas</strong> (caja real), <strong>Por Confirmar</strong>, <strong>Ticket Promedio</strong> y <strong>Margen Bruto Estimado (CMV)</strong>, con variación % respecto al período anterior. También incluye medios de pago, clientes nuevos vs. recurrentes, top barrios, ranking con etiqueta <span class="btn-badge badge-primary">80/20</span> (los platos que concentran el 80% de ingresos) y <strong>"Se compran juntos"</strong>.</li>
          <li><strong>Pedidos (Conciliación rápida):</strong> cambien el estado con un toque (<span class="btn-badge badge-green">Confirmado</span>, <span class="btn-badge badge-amber">Pendiente</span>, <span class="btn-badge badge-red">Cancelado</span>). Tocando <em>"Detalle y pago"</em> pueden etiquetar <strong>Medio de pago</strong> (Transferencia, Efectivo, Mercado Pago, Tarjeta), <strong>Barrio / Zona</strong> y <strong>Cliente Nuevo o Recurrente</strong>, además de anotar comentarios internos o borrar pruebas.</li>
          <li><strong>Mercado (Pulso y Demanda):</strong> muestra qué piden en <em>Próximamente</em>, <strong>sensibilidad de precios</strong> (agregados vs. quitados del carrito), consultas por 500g / sin stock, atribución por canal, franjas horarias y días calientes.</li>
          <li><strong>Costos (100% privado para ustedes):</strong> carguen el <strong>costo unitario ($)</strong> de cada producto y combo y toquen <strong>"Guardar costos"</strong> para ver en vivo la ganancia ($) y el margen (%) en verde (&gt;40%), amarillo (25-40%) o rojo (&lt;25%).</li>
        </ol>
      </div>

      <div class="card-white" style="border-left: 4px solid var(--color-emerald);">
        <h3 class="subsection-title">📑 Exportar Excel Profesional (.xlsx de 6 hojas) y CSV</h3>
        <p>• Botón verde <span class="btn-badge badge-green">Exportar Excel (.xlsx)</span>: descarga un libro llamado <span class="code-pill">SinCulpaNiGluten_Reporte_YYYY-MM-DD.xlsx</span> con <strong>6 hojas listas para contabilidad y tablas dinámicas</strong>:</p>
        <ul>
          <li><strong>1_Resumen_Ejecutivo:</strong> KPIs, márgenes, medios de pago, barrios y clientes.</li>
          <li><strong>2_Libro_Pedidos:</strong> 1 pedido por fila con costos, ganancia y fila de totales con fórmulas <em>SUM</em>.</li>
          <li><strong>3_Detalle_Items:</strong> cada producto desagregado por línea listo para Tablas Dinámicas.</li>
          <li><strong>4_Ranking_y_Margen:</strong> participación % Pareto 80/20, CMV, ganancia y pares frecuentes.</li>
          <li><strong>5_Trafico_y_Canales:</strong> evolución diaria y consolidado por canal de origen.</li>
          <li><strong>6_Pulso_Mercado:</strong> interés en Próximamente, sensibilidad de precios, 500g, sin stock y horarios.</li>
        </ul>
        <p style="margin-bottom: 0;">• Al lado tienen el botón <span class="btn-badge badge-dark">CSV</span> como respaldo rápido en texto plano.</p>
      </div>

      <div class="callout">
        <div class="callout-title">🔗 Tip práctico para medir Instagram y WhatsApp</div>
        Usen enlaces con etiqueta al compartir su tienda para que la vista <strong>Mercado</strong> y el Excel midan automáticamente cada canal:<br>
        • <strong>Bio / Historias de Instagram:</strong> <span class="code-pill">https://sin-culpa-ni-gluten.vercel.app/?utm_source=instagram</span><br>
        • <strong>Estados / Mensajes de WhatsApp:</strong> <span class="code-pill">https://sin-culpa-ni-gluten.vercel.app/?utm_source=whatsapp</span>
      </div>
    </section>

    <!-- SECCIÓN 6 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">💬</span> 6. Consejos rápidos para WhatsApp Business</h2>

      <div class="callout" style="border-color: var(--color-rose); background: var(--color-rose-bg);">
        <div class="callout-title" style="color: var(--color-rose);">⚠️ Muy importante: No usar el catálogo interno de WhatsApp</div>
        No carguen productos en la herramienta de "Catálogo" de WhatsApp. Ese catálogo no se actualiza solo y van a quedar precios viejos. Su tienda web (<a href="https://sin-culpa-ni-gluten.vercel.app" style="color: var(--color-primary); font-weight: bold;">sin-culpa-ni-gluten.vercel.app</a>) es la <strong>única lista oficial y actualizada</strong>.
      </div>

      <div class="card">
        <h3 class="subsection-title">🏷️ Etiquetas sugeridas para ordenar sus chats</h3>
        <p>En WhatsApp Business pueden etiquetar las conversaciones con colores:</p>
        <p>🟡 <strong>1. Pedido nuevo</strong> (recién llegó el carrito desde la web)<br>
        🔵 <strong>2. Confirmado</strong> (acordaron día y horario de entrega)<br>
        🟢 <strong>3. Pagado</strong> (tienen el comprobante o pagan en mano)<br>
        🟣 <strong>4. Entregado</strong> (pedido completado)</p>
      </div>

      <div class="card-white">
        <h3 class="subsection-title">⚡ Atajos de teclado para responder rápido</h3>
        <p>En WhatsApp Business (<em>Ajustes de empresa > Respuestas rápidas</em>) pueden configurar:</p>
        <div style="background: #FAF7F2; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--color-border);">
          <strong>Escribiendo <span class="code-pill">/web</span>:</strong><br>
          <em>"¡Hola! Podés ver nuestro menú completo, combos para freezer y precios del día en nuestra web: https://sin-culpa-ni-gluten.vercel.app/ Armás tu pedido ahí y nos llega directo para coordinar. 🥐🌾"</em>
        </div>
        <div style="background: #FAF7F2; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
          <strong>Escribiendo <span class="code-pill">/alias</span>:</strong><br>
          <em>"Para confirmar tu pedido podés transferir a nuestro alias: sin.culpa.gluten (a nombre de ...). ¡Avisanos cuando esté listo para agendarlo!"</em>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>🌾 <strong>Sin Culpa Ni Gluten</strong> — Alimentos 100% Libres de Gluten en Río Cuarto, Córdoba.<br>
      Hecho con cariño para potenciar las ventas de Flor y Fabrizio. ❤️</p>
    </footer>

  </div>
</body>
</html>
`;

async function generatePdf() {
  console.log('1. Guardando archivos HTML interactivos...');
  fs.writeFileSync(HTML_OUTPUT_PATH, htmlContent, 'utf-8');
  fs.mkdirSync(path.dirname(PUBLIC_HTML_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(PUBLIC_HTML_OUTPUT_PATH, htmlContent, 'utf-8');
  console.log(`✓ HTML guardado en: ${HTML_OUTPUT_PATH} y ${PUBLIC_HTML_OUTPUT_PATH}`);

  console.log('2. Iniciando Chrome con Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium'],
  });

  try {
    const page = await browser.newPage();
    console.log('3. Cargando contenido HTML...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    console.log('4. Generando PDF con calidad de imprenta...');
    await page.pdf({
      path: PDF_OUTPUT_PATH,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '14mm',
        bottom: '14mm',
        left: '12mm',
        right: '12mm',
      },
    });
    fs.copyFileSync(PDF_OUTPUT_PATH, PUBLIC_PDF_OUTPUT_PATH);

    const stats = fs.statSync(PDF_OUTPUT_PATH);
    console.log(`🎉 ¡PDF generado exitosamente!`);
    console.log(`📁 Archivos PDF: ${PDF_OUTPUT_PATH} y ${PUBLIC_PDF_OUTPUT_PATH}`);
    console.log(`📏 Tamaño: ${(stats.size / 1024).toFixed(1)} KB`);
  } finally {
    await browser.close();
  }
}

generatePdf().catch((err) => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});
