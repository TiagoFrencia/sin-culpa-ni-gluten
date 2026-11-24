import type { Product, Combo, ProductCategory } from '@/types/catalog';
import type { BusinessConfig } from '@/config/business';
import { formatPriceARS } from '@/config/business';

const CATEGORY_TITLES: Record<ProductCategory, string> = {
  milanesas: 'Milanesas Caseras',
  hamburguesas: 'Hamburguesas',
  empanadas: 'Empanadas',
  pizzas: 'Pizzas & Prepizzas',
  panaderia: 'Panadería',
  especiales: 'Platos Especiales',
};

/**
 * Genera y descarga un flyer editorial vertical de 1080x1920 (WhatsApp Status / Instagram Story)
 * con la lista completa de precios y combos vigentes.
 */
export async function exportPriceListFlyer(
  products: Product[],
  combos: Combo[],
  business: BusinessConfig
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el motor de renderizado de imagen.');
  }

  // 1. Fondo Crema Editorial
  ctx.fillStyle = '#F4EFE6';
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Bordes decorativos dobles
  ctx.strokeStyle = '#D8CDBA';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, 1000, 1840);

  ctx.strokeStyle = '#E5DCCB';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, 50, 980, 1820);

  // 3. Encabezado Editorial
  // Badge Superior
  ctx.textAlign = 'center';
  ctx.fillStyle = '#A64B2A';
  ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('100% LIBRE DE GLUTEN • COCINA SEGURA SIN GLUTEN', 540, 95);

  // Título Principal
  ctx.fillStyle = '#1D120D';
  ctx.font = 'italic bold 56px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(business.brandName, 540, 160);

  // Subtítulo
  ctx.fillStyle = '#6B574B';
  ctx.font = '500 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`Lista Oficial de Precios • ${business.city}`, 540, 198);

  // Línea divisoria central con detalle
  ctx.strokeStyle = '#D8CDBA';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 222);
  ctx.lineTo(960, 222);
  ctx.stroke();

  ctx.fillStyle = '#A64B2A';
  ctx.beginPath();
  ctx.arc(540, 222, 4, 0, Math.PI * 2);
  ctx.fill();

  // 4. Filtrar productos y combos con disponibilidad activa
  const activeProducts = products.filter((p) => p.available !== false);
  const activeCombos = combos.filter((c) => c.available !== false);

  // Distribuir en 2 columnas equilibradas
  // Columna Izquierda: Milanesas, Hamburguesas, Empanadas
  // Columna Derecha: Pizzas, Panadería/Especiales, Combos
  const leftCategories: ProductCategory[] = ['milanesas', 'hamburguesas', 'empanadas'];
  const rightCategories: ProductCategory[] = ['pizzas', 'panaderia', 'especiales'];

  const renderProductCategory = (
    cat: ProductCategory,
    startX: number,
    startY: number,
    colWidth: number
  ): number => {
    const catProducts = activeProducts.filter((p) => p.category === cat);
    if (catProducts.length === 0) return startY;

    let currentY = startY;

    // Título de la categoría
    ctx.textAlign = 'left';
    ctx.fillStyle = '#A64B2A';
    ctx.font = 'bold 21px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(CATEGORY_TITLES[cat].toUpperCase(), startX, currentY);

    // Pequeño subrayado de categoría
    ctx.strokeStyle = '#A64B2A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, currentY + 6);
    ctx.lineTo(startX + 120, currentY + 6);
    ctx.stroke();

    currentY += 34;

    // Renderizar cada producto de la categoría
    for (const prod of catProducts) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1D120D';
      ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';

      // Truncar nombre si fuera excesivamente largo
      let displayName = prod.name;
      if (ctx.measureText(displayName).width > colWidth - 20) {
        while (ctx.measureText(displayName + '...').width > colWidth - 20 && displayName.length > 5) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      ctx.fillText(displayName, startX, currentY);
      currentY += 22;

      // Variantes con precio
      for (const v of prod.variants) {
        ctx.fillStyle = '#6B574B';
        ctx.font = '500 17px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(`• ${v.label}`, startX + 12, currentY);

        ctx.textAlign = 'right';
        ctx.fillStyle = v.price !== null ? '#1D120D' : '#A64B2A';
        ctx.font = 'bold 18px "Plus Jakarta Sans", system-ui, sans-serif';
        const priceText = v.price !== null ? formatPriceARS(v.price) : 'Consultar';
        ctx.fillText(priceText, startX + colWidth, currentY);

        ctx.textAlign = 'left';
        currentY += 22;
      }

      currentY += 10;
    }

    return currentY + 14;
  };

  // Renderizar Columna Izquierda (x = 75, ancho = 440)
  let leftY = 260;
  for (const cat of leftCategories) {
    leftY = renderProductCategory(cat, 75, leftY, 440);
  }

  // Renderizar Columna Derecha (x = 565, ancho = 440)
  let rightY = 260;
  for (const cat of rightCategories) {
    rightY = renderProductCategory(cat, 565, rightY, 440);
  }

  // Sección Combos en la Columna Derecha o abajo
  if (activeCombos.length > 0) {
    let comboY = rightY;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#5A653E';
    ctx.font = 'bold 21px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('COMBOS PARA FREEZER', 565, comboY);

    ctx.strokeStyle = '#5A653E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(565, comboY + 6);
    ctx.lineTo(565 + 160, comboY + 6);
    ctx.stroke();

    comboY += 34;

    for (const combo of activeCombos) {
      // Recuadro sutil para el combo
      ctx.fillStyle = '#FAF7F2';
      ctx.strokeStyle = '#E5DCCB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(565, comboY - 18, 440, 80, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1D120D';
      ctx.font = 'bold 19px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(combo.name, 578, comboY + 6);

      ctx.fillStyle = '#6B574B';
      ctx.font = '500 14px "Plus Jakarta Sans", system-ui, sans-serif';
      const sub = combo.subtitle.length > 38 ? combo.subtitle.slice(0, 36) + '...' : combo.subtitle;
      ctx.fillText(sub, 578, comboY + 28);

      // Precio final
      const finalPrice = combo.promoPrice ?? combo.regularPrice;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#A64B2A';
      ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(formatPriceARS(finalPrice), 565 + 425, comboY + 12);

      ctx.fillStyle = '#5A653E';
      ctx.font = 'bold 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('ENVÍO GRATIS', 565 + 425, comboY + 32);

      comboY += 92;
    }
  }

  // 5. Pie Editorial Fijo al fondo (y = 1710 a 1840)
  ctx.fillStyle = '#1D120D';
  ctx.beginPath();
  ctx.roundRect(65, 1710, 950, 130, 16);
  ctx.fill();

  // Textos del Pie
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F4EFE6';
  ctx.font = 'italic bold 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('¡Envío a domicilio sin cargo en Río Cuarto!', 540, 1750);

  ctx.fillStyle = '#E5DCCB';
  ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
  const whatsappDisplay = business.whatsappDisplay || business.whatsappPhone;
  ctx.fillText(
    `WhatsApp: ${whatsappDisplay}   •   Instagram: ${business.instagramHandle}`,
    540,
    1790
  );

  const fechaActual = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  ctx.fillStyle = '#A64B2A';
  ctx.font = 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    `Precios vigentes al mes de ${fechaActual.toUpperCase()} • Pedidos online: sin-culpa-ni-gluten.vercel.app`,
    540,
    1820
  );

  // 6. Descargar el archivo
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar la imagen para descargar.'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lista-precios-sin-culpa-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      },
      'image/png',
      1.0
    );
  });
}
