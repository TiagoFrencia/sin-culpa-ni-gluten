import { BUSINESS_CONFIG, formatPriceARS } from '@/config/business';
import type { OrderItem, OrderWhatsAppOptions } from '@/types/order';

let activePhone = BUSINESS_CONFIG.whatsappPhone;

/**
 * Actualiza el teléfono activo de WhatsApp en tiempo de ejecución (ej. sincronizado desde Supabase).
 */
export function updateActiveWhatsAppPhone(phone?: string): void {
  if (phone && phone.trim()) {
    activePhone = phone.trim();
  }
}

export function getCleanPhone(customPhone?: string): string {
  const targetPhone = customPhone || activePhone || BUSINESS_CONFIG.whatsappPhone;
  return targetPhone.replace(/\D/g, '');
}

export function createWhatsAppLink(message: string, customPhone?: string): string {
  const phone = getCleanPhone(customPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Genera un enlace directo a WhatsApp para consultas generales.
 */
export function buildGeneralInquiryUrl(customMessage?: string, customPhone?: string): string {
  const message =
    customMessage ||
    `¡Hola! Quisiera consultar sobre los platos caseros sin gluten y los envíos en Río Cuarto.`;

  return createWhatsAppLink(message, customPhone);
}

/**
 * Genera un enlace directo a WhatsApp para consultar por un producto específico y su variante/nota opcional.
 */
export function buildDirectProductUrl(
  productName: string,
  variantLabel?: string,
  extraNote?: string,
  customPhone?: string
): string {
  const variantPart = variantLabel ? ` (${variantLabel})` : '';
  const notePart = extraNote ? ` - ${extraNote}` : '';
  const message = `¡Hola! Quería consultar por ${productName}${variantPart}${notePart}.`;

  return createWhatsAppLink(message, customPhone);
}

/**
 * Genera un enlace directo a WhatsApp para consultar por el pack de medio kilo (500g).
 */
export function buildHalfKgInquiryUrl(productName: string, customPhone?: string): string {
  const message = `¡Hola! Quería consultar disponibilidad y precio por el pack de 500g de ${productName}.`;

  return createWhatsAppLink(message, customPhone);
}

/**
 * Genera un enlace directo a WhatsApp para consultar o encargar un combo específico.
 */
export function buildComboInquiryUrl(comboName: string, priceLabel: string, customPhone?: string): string {
  const message = `¡Hola! Quería pedir el ${comboName} (${priceLabel}) con envío en Río Cuarto.`;

  return createWhatsAppLink(message, customPhone);
}

/**
 * Genera el enlace directo a WhatsApp con el pedido completo armado desde el OrderDrawer.
 */
export function buildCartOrderUrl(
  items: OrderItem[],
  options: OrderWhatsAppOptions,
  customPhone?: string
): string {
  const lines: string[] = [];

  lines.push('¡Hola Sin Culpa Ni Gluten! Quiero hacer el siguiente pedido:');
  lines.push('');

  let subtotal = 0;
  for (const item of items) {
    const itemTotal = item.unitPrice * item.quantity;
    subtotal += itemTotal;

    const details = item.flavor
      ? ` (${item.variantLabel}, Sabor: ${item.flavor})`
      : item.variantLabel && item.variantLabel !== 'Combo'
      ? ` (${item.variantLabel})`
      : '';

    lines.push(`• ${item.quantity}x ${item.name}${details} — ${formatPriceARS(itemTotal)}`);
  }

  lines.push('');
  lines.push(`Total estimado: ${formatPriceARS(subtotal)}`);
  lines.push('');

  if (options.deliveryMethod === 'envio') {
    const address = options.addressOrZone?.trim();
    if (address) {
      lines.push(`Modalidad: Envío gratis en Río Cuarto (Dirección / Barrio: ${address})`);
    } else {
      lines.push('Modalidad: Envío gratis en Río Cuarto');
    }
  } else {
    lines.push('Modalidad: Retiro a coordinar en Río Cuarto');
  }

  if (options.note && options.note.trim()) {
    lines.push(`Aclaración / Consulta: ${options.note.trim()}`);
  }

  lines.push('');
  lines.push('¿Tienen disponibilidad y a qué hora podríamos coordinar? ¡Muchas gracias!');

  return createWhatsAppLink(lines.join('\n'), customPhone);
}
