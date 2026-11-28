import { supabase } from '@/lib/supabase';
import type { OrderItem } from '@/types/order';
import type {
  MetricType,
  OrderIntent,
  OrderIntentItem,
  OrderIntentStatus,
  OrderIntentSource,
  DailyMetric,
  AnalyticsPeriod,
  TrafficChannel,
  PaymentMethod,
  CustomerType,
  TimeSlot,
  ProductSignalType,
  ProductCost,
  DailyChannelMetric,
  DailyProductSignal,
  DailyHourlyMetric,
} from '@/types/analytics';

const SESSION_VISIT_KEY = 'scng_visited_session';
const SESSION_CHANNEL_VISIT_KEY = 'scng_channel_visited_session';
const SESSION_CHANNEL_KEY = 'scng_channel';
const SESSION_V3_RPC_MISSING_KEY = 'scng_v3_rpc_missing';
const SESSION_V6_RPC_MISSING_KEY = 'scng_v6_rpc_missing';

function isRpcMissing(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markRpcMissing(key: string, message?: string): void {
  if (!message) return;
  const lower = message.toLowerCase();
  if (lower.includes('could not find the function') || lower.includes('pgrst202') || lower.includes('404')) {
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // Silencio
    }
  }
}

const LOCAL_ORDERS_KEY = 'scng_local_order_intents_v1';
const LOCAL_METRICS_KEY = 'scng_local_daily_metrics_v1';
const LOCAL_COSTS_KEY = 'scng_local_product_costs_v1';
const LOCAL_CHANNEL_METRICS_KEY = 'scng_local_channel_metrics_v1';
const LOCAL_PRODUCT_SIGNALS_KEY = 'scng_local_product_signals_v1';
const LOCAL_HOURLY_METRICS_KEY = 'scng_local_hourly_metrics_v1';

// ---------------------------------------------------------------------------
// Helpers de claves, fecha Argentina, canal y franja horaria
// ---------------------------------------------------------------------------

/**
 * Construye una clave estable para costos y señales de producto/combo:
 * - product:${productId}:${variantLabel}
 * - combo:${comboId}
 */
export function buildCostItemKey(
  type: 'product' | 'combo',
  id: string,
  variantLabel?: string
): string {
  if (type === 'combo') {
    return `combo:${id}`;
  }
  const cleanVariant = (variantLabel || 'default').trim();
  return `product:${id}:${cleanVariant}`;
}

/**
 * Fecha YYYY-MM-DD en zona horaria de Argentina.
 */
export function toArgentinaYmd(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Calcula la franja horaria actual en horario de Argentina:
 * - manana: 06-11
 * - mediodia: 12-15
 * - tarde: 16-20
 * - noche: 21-05
 */
export function getCurrentTimeSlotAR(date: Date = new Date()): TimeSlot {
  let hour = date.getHours();
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: 'numeric',
      hour12: false,
    }).format(date);
    const parsed = parseInt(hourStr, 10);
    if (!isNaN(parsed)) {
      hour = parsed === 24 ? 0 : parsed;
    }
  } catch {
    // Fallback a hora local del navegador
  }

  if (hour >= 6 && hour <= 11) return 'manana';
  if (hour >= 12 && hour <= 15) return 'mediodia';
  if (hour >= 16 && hour <= 20) return 'tarde';
  return 'noche';
}

function classifyChannelFromInputs(utmSource: string, referrer: string): TrafficChannel {
  const utm = utmSource.trim().toLowerCase();
  if (utm) {
    if (utm.includes('instagram') || utm === 'ig' || utm.includes('insta')) return 'instagram';
    if (utm.includes('whatsapp') || utm === 'wsp' || utm === 'wa') return 'whatsapp';
    if (utm.includes('google') || utm.includes('gads')) return 'google';
    if (utm.includes('direct')) return 'directo';
    return 'otro';
  }

  const ref = referrer.trim().toLowerCase();
  if (!ref) return 'directo';
  if (ref.includes('instagram.com')) return 'instagram';
  if (ref.includes('whatsapp.com') || ref.includes('wa.me')) return 'whatsapp';
  if (ref.includes('google.')) return 'google';

  try {
    if (typeof window !== 'undefined') {
      const refHost = new URL(ref).hostname;
      if (refHost === window.location.hostname) return 'directo';
    }
  } catch {
    // Referrer inválido
  }

  return 'otro';
}

/**
 * Detecta y persiste en sessionStorage el canal de origen del visitante
 * (excluyendo /admin). Mantiene atribución durante toda la sesión.
 */
export function getSessionChannel(): TrafficChannel {
  if (typeof window === 'undefined') return 'directo';

  try {
    if (window.location.pathname.startsWith('/admin')) {
      return 'directo';
    }

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || '';

    if (utmSource.trim()) {
      const classified = classifyChannelFromInputs(utmSource, document.referrer || '');
      sessionStorage.setItem(SESSION_CHANNEL_KEY, classified);
      return classified;
    }

    const cached = sessionStorage.getItem(SESSION_CHANNEL_KEY) as TrafficChannel | null;
    if (
      cached &&
      (cached === 'instagram' ||
        cached === 'whatsapp' ||
        cached === 'google' ||
        cached === 'directo' ||
        cached === 'otro')
    ) {
      return cached;
    }

    const detected = classifyChannelFromInputs('', document.referrer || '');
    sessionStorage.setItem(SESSION_CHANNEL_KEY, detected);
    return detected;
  } catch {
    return 'directo';
  }
}

// ---------------------------------------------------------------------------
// Captura silenciosa en la tienda pública (fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * Registra una métrica diaria v3 de forma silenciosa y en segundo plano.
 * Jamás bloquea la interfaz de usuario ni propaga errores al cliente si falla.
 */
export function trackMetric(metric: MetricType): void {
  if (typeof window === 'undefined') return;

  if (metric === 'visits') {
    try {
      if (sessionStorage.getItem(SESSION_VISIT_KEY)) {
        return;
      }
      sessionStorage.setItem(SESSION_VISIT_KEY, '1');
    } catch {
      // Ignorar restricciones de sessionStorage
    }
  }

  incrementLocalMetric(metric);

  if (!supabase || isRpcMissing(SESSION_V3_RPC_MISSING_KEY)) return;

  void (async () => {
    try {
      const { error } = await supabase.rpc('increment_daily_metric', { p_metric: metric });
      if (error) {
        markRpcMissing(SESSION_V3_RPC_MISSING_KEY, error.message);
        console.debug('[Analytics] Falló trackMetric en Supabase (operando con fallback):', error.message);
      }
    } catch (err) {
      console.debug('[Analytics] Excepción en trackMetric:', err);
    }
  })();
}

/**
 * Registra visita o clic de WhatsApp por canal de origen y franja horaria (V6).
 * En 'visits', utiliza guardia única por sesión independiente de trackMetric.
 */
export function trackChannelAndSlot(event: 'visits' | 'whatsapp_clicks'): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/admin')) return;

  if (event === 'visits') {
    try {
      if (sessionStorage.getItem(SESSION_CHANNEL_VISIT_KEY)) {
        return;
      }
      sessionStorage.setItem(SESSION_CHANNEL_VISIT_KEY, '1');
    } catch {
      // Ignorar restricciones de sessionStorage
    }
  }

  const channel = getSessionChannel();
  const timeSlot = getCurrentTimeSlotAR();

  incrementLocalChannelAndSlot(channel, timeSlot, event);

  if (!supabase || isRpcMissing(SESSION_V6_RPC_MISSING_KEY)) return;

  void (async () => {
    try {
      const { error } = await supabase.rpc('track_channel_and_slot', {
        p_channel: channel,
        p_event: event,
      });
      if (error) {
        markRpcMissing(SESSION_V6_RPC_MISSING_KEY, error.message);
        console.debug('[Analytics] RPC track_channel_and_slot no disponible aún:', error.message);
      }
    } catch (err) {
      console.debug('[Analytics] Excepción en trackChannelAndSlot:', err);
    }
  })();
}

/**
 * Registra una señal de producto o próximo ingreso (V6) en segundo plano.
 */
export function trackProductSignal(
  itemKey: string,
  itemName: string,
  signalType: ProductSignalType
): void {
  if (typeof window === 'undefined') return;

  const cleanKey = itemKey.trim().slice(0, 120);
  const cleanName = itemName.trim().slice(0, 120);
  if (!cleanKey || !cleanName) return;

  incrementLocalProductSignal(cleanKey, cleanName, signalType);

  if (!supabase || isRpcMissing(SESSION_V6_RPC_MISSING_KEY)) return;

  void (async () => {
    try {
      const { error } = await supabase.rpc('track_product_signal', {
        p_item_key: cleanKey,
        p_item_name: cleanName,
        p_signal_type: signalType,
      });
      if (error) {
        markRpcMissing(SESSION_V6_RPC_MISSING_KEY, error.message);
        console.debug('[Analytics] RPC track_product_signal no disponible aún:', error.message);
      }
    } catch (err) {
      console.debug('[Analytics] Excepción en trackProductSignal:', err);
    }
  })();
}

/**
 * Guarda una intención de pedido en segundo plano al pulsar "Enviar pedido por WhatsApp".
 * Incluye canal y franja horaria con fallback automático a columnas V3 si V6 no fue migrada.
 */
export function recordOrderIntent(params: {
  items: OrderItem[];
  totalArs: number;
  itemsCount: number;
  source?: OrderIntentSource;
  note?: string;
  channel?: TrafficChannel;
  timeSlot?: TimeSlot;
}): void {
  if (typeof window === 'undefined' || params.items.length === 0) return;

  const cleanItems: OrderIntentItem[] = params.items.map((it) => {
    const variantStr = it.flavor
      ? `${it.variantLabel} (${it.flavor})`
      : it.variantLabel && it.variantLabel !== 'Combo'
      ? it.variantLabel
      : '';

    return {
      id: it.id,
      name: it.name,
      variant: variantStr,
      qty: it.quantity,
      unit_price: it.unitPrice,
      subtotal: it.unitPrice * it.quantity,
      type: it.type,
    };
  });

  const channel = params.channel || getSessionChannel();
  const timeSlot = params.timeSlot || getCurrentTimeSlotAR();

  const intentPayload: Omit<OrderIntent, 'id' | 'created_at'> = {
    items: cleanItems,
    items_count: params.itemsCount,
    total_ars: params.totalArs,
    status: 'pendiente',
    source: params.source || 'carrito',
    note: params.note || null,
    channel,
    time_slot: timeSlot,
    payment_method: null,
    neighborhood: null,
    customer_type: null,
  };

  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const localOrder: OrderIntent = {
    ...intentPayload,
    id: localId,
    created_at: new Date().toISOString(),
  };
  saveLocalOrderIntent(localOrder);

  if (!supabase) return;

  void (async () => {
    try {
      const v3Payload = {
        items: cleanItems,
        items_count: params.itemsCount,
        total_ars: params.totalArs,
        status: 'pendiente' as const,
        source: params.source || ('carrito' as const),
        note: params.note || null,
      };

      const { error } = await supabase.from('order_intents').insert({
        ...v3Payload,
        channel,
        time_slot: timeSlot,
      });

      if (error) {
        // Fallback automático: si las columnas V6 aún no existen en Supabase remoto, reintentar con V3 puro
        const { error: fallbackError } = await supabase.from('order_intents').insert(v3Payload);
        if (fallbackError) {
          console.debug('[Analytics] Falló recordOrderIntent en Supabase (guardado localmente):', fallbackError.message);
        }
      }
    } catch (err) {
      console.debug('[Analytics] Excepción en recordOrderIntent:', err);
    }
  })();
}

// ---------------------------------------------------------------------------
// Helpers de lectura y escritura para el Panel Admin (/admin - Pestaña Métricas)
// ---------------------------------------------------------------------------

export async function fetchOrderIntents(): Promise<OrderIntent[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('order_intents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        if (data.length > 0) return data as OrderIntent[];
        const local = getLocalOrderIntents();
        return local.length > 0 ? local : [];
      }
    } catch (err) {
      console.warn('[Analytics] Error consultando Supabase order_intents:', err);
    }
  }

  return getLocalOrderIntents();
}

export async function fetchDailyMetrics(): Promise<DailyMetric[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (!error && data) {
        if (data.length > 0) return data as DailyMetric[];
        return getLocalDailyMetrics();
      }
    } catch (err) {
      console.warn('[Analytics] Error consultando Supabase daily_metrics:', err);
    }
  }

  return getLocalDailyMetrics();
}

export async function fetchProductCosts(): Promise<ProductCost[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('product_costs')
        .select('*')
        .order('item_name', { ascending: true });

      if (!error && data) {
        if (data.length > 0) return data as ProductCost[];
        return getLocalProductCosts();
      }
    } catch (err) {
      console.warn('[Analytics] product_costs no disponible aún:', err);
    }
  }

  return getLocalProductCosts();
}

export async function upsertProductCosts(
  costs: ProductCost[]
): Promise<{ ok: boolean; localOnly?: boolean }> {
  saveLocalProductCosts(costs);

  if (supabase && costs.length > 0) {
    try {
      const payload = costs.map((c) => ({
        item_key: c.item_key,
        item_type: c.item_type,
        item_name: c.item_name,
        unit_cost_ars: Math.max(0, Math.round(c.unit_cost_ars || 0)),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('product_costs')
        .upsert(payload, { onConflict: 'item_key' });

      if (!error) {
        return { ok: true, localOnly: false };
      }
      console.warn('[Analytics] Error guardando product_costs en Supabase:', error.message);
      return { ok: true, localOnly: true };
    } catch (err) {
      console.warn('[Analytics] Excepción guardando product_costs:', err);
      return { ok: true, localOnly: true };
    }
  }

  return { ok: true, localOnly: true };
}

export async function fetchDailyChannelMetrics(): Promise<DailyChannelMetric[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_channel_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (!error && data) {
        if (data.length > 0) return data as DailyChannelMetric[];
        return getLocalChannelMetrics();
      }
    } catch (err) {
      console.warn('[Analytics] daily_channel_metrics no disponible aún:', err);
    }
  }

  return getLocalChannelMetrics();
}

export async function fetchDailyProductSignals(): Promise<DailyProductSignal[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_product_signals')
        .select('*')
        .order('metric_date', { ascending: false });

      if (!error && data) {
        if (data.length > 0) return data as DailyProductSignal[];
        return getLocalProductSignals();
      }
    } catch (err) {
      console.warn('[Analytics] daily_product_signals no disponible aún:', err);
    }
  }

  return getLocalProductSignals();
}

export async function fetchDailyHourlyMetrics(): Promise<DailyHourlyMetric[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_hourly_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (!error && data) {
        if (data.length > 0) return data as DailyHourlyMetric[];
        return getLocalHourlyMetrics();
      }
    } catch (err) {
      console.warn('[Analytics] daily_hourly_metrics no disponible aún:', err);
    }
  }

  return getLocalHourlyMetrics();
}

export async function updateOrderIntentStatus(id: string, status: OrderIntentStatus): Promise<boolean> {
  if (supabase && !id.startsWith('local-')) {
    try {
      const { error } = await supabase
        .from('order_intents')
        .update({ status })
        .eq('id', id);

      if (!error) {
        updateLocalOrderField(id, { status });
        return true;
      }
    } catch (err) {
      console.warn('[Analytics] Error actualizando estado en Supabase:', err);
    }
  }

  updateLocalOrderField(id, { status });
  return true;
}

export async function updateOrderIntentNote(id: string, note: string | null): Promise<boolean> {
  if (supabase && !id.startsWith('local-')) {
    try {
      const { error } = await supabase
        .from('order_intents')
        .update({ note: note || null })
        .eq('id', id);

      if (!error) {
        updateLocalOrderField(id, { note: note || null });
        return true;
      }
    } catch (err) {
      console.warn('[Analytics] Error actualizando nota en Supabase:', err);
    }
  }

  updateLocalOrderField(id, { note: note || null });
  return true;
}

/**
 * Actualiza medio de pago, barrio/zona o tipo de cliente de un pedido.
 * Aislado con try/catch por si las columnas V6 aún no fueron migradas en Supabase remoto.
 */
export async function updateOrderIntentDetails(
  id: string,
  details: {
    payment_method?: PaymentMethod | null;
    neighborhood?: string | null;
    customer_type?: CustomerType | null;
  }
): Promise<{ ok: boolean; localOnly?: boolean }> {
  updateLocalOrderField(id, details);

  if (supabase && !id.startsWith('local-')) {
    try {
      const { error } = await supabase
        .from('order_intents')
        .update(details)
        .eq('id', id);

      if (!error) {
        return { ok: true, localOnly: false };
      }
      console.warn('[Analytics] Error actualizando detalles del pedido en Supabase:', error.message);
      return { ok: true, localOnly: true };
    } catch (err) {
      console.warn('[Analytics] Excepción actualizando detalles del pedido:', err);
      return { ok: true, localOnly: true };
    }
  }

  return { ok: true, localOnly: true };
}

export async function deleteOrderIntent(id: string): Promise<boolean> {
  if (supabase && !id.startsWith('local-')) {
    try {
      const { error } = await supabase
        .from('order_intents')
        .delete()
        .eq('id', id);

      if (!error) {
        deleteLocalOrder(id);
        return true;
      }
    } catch (err) {
      console.warn('[Analytics] Error eliminando orden en Supabase:', err);
    }
  }

  deleteLocalOrder(id);
  return true;
}

// ---------------------------------------------------------------------------
// Filtros por Período (Actual y Período Anterior para variaciones %)
// ---------------------------------------------------------------------------

interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  startYmd: string;
  endYmd: string;
}

export function getPeriodBounds(period: AnalyticsPeriod): DateRangeBounds | null {
  if (period === 'all') return null;

  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  if (period === '7d') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'this_month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else if (period === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else {
    return null;
  }

  return {
    startDate,
    endDate,
    startYmd: toArgentinaYmd(startDate),
    endYmd: toArgentinaYmd(endDate),
  };
}

export function getPreviousPeriodBounds(period: AnalyticsPeriod): DateRangeBounds | null {
  if (period === 'all') return null;

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === '7d') {
    endDate = new Date(now);
    endDate.setDate(now.getDate() - 8);
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 15);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'this_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
  } else {
    return null;
  }

  return {
    startDate,
    endDate,
    startYmd: toArgentinaYmd(startDate),
    endYmd: toArgentinaYmd(endDate),
  };
}

export function filterOrdersByBounds(orders: OrderIntent[], bounds: DateRangeBounds | null): OrderIntent[] {
  if (!bounds) return orders;
  return orders.filter((o) => {
    const orderDate = new Date(o.created_at);
    return orderDate >= bounds.startDate && orderDate <= bounds.endDate;
  });
}

export function filterOrdersByPeriod(orders: OrderIntent[], period: AnalyticsPeriod): OrderIntent[] {
  return filterOrdersByBounds(orders, getPeriodBounds(period));
}

export function filterDateRecordsByBounds<T extends { metric_date: string }>(
  records: T[],
  bounds: DateRangeBounds | null
): T[] {
  if (!bounds) return records;
  return records.filter((r) => r.metric_date >= bounds.startYmd && r.metric_date <= bounds.endYmd);
}

export function filterMetricsByPeriod(metrics: DailyMetric[], period: AnalyticsPeriod): DailyMetric[] {
  return filterDateRecordsByBounds(metrics, getPeriodBounds(period));
}

// ---------------------------------------------------------------------------
// Exportación a CSV para Excel (BOM UTF-8, delimitador ';')
// ---------------------------------------------------------------------------

export function exportOrderIntentsToCSV(orders: OrderIntent[], filename = 'pedidos-sin-culpa.csv'): void {
  const headers = [
    'Fecha',
    'Hora',
    'Estado',
    'Canal',
    'Medio Pago',
    'Barrio',
    'Cliente',
    'Cantidad Items',
    'Detalle Productos',
    'Total ARS',
    'Origen',
    'Nota',
  ];

  const rows = orders.map((order) => {
    const d = new Date(order.created_at);
    const fecha = !isNaN(d.getTime()) ? d.toLocaleDateString('es-AR') : order.created_at;
    const hora = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
    const estado = order.status;
    const canal = order.channel || 'directo';
    const pago = order.payment_method || '';
    const barrio = (order.neighborhood || '').replace(/"/g, '""');
    const cliente = order.customer_type || '';
    const cantItems = order.items_count;

    const detalle = order.items
      .map((it) => `${it.qty}x ${it.name}${it.variant ? ` (${it.variant})` : ''}`)
      .join(' + ')
      .replace(/"/g, '""');

    const totalArs = order.total_ars;
    const origen = order.source;
    const nota = (order.note || '').replace(/"/g, '""');

    return [
      `"${fecha}"`,
      `"${hora}"`,
      `"${estado}"`,
      `"${canal}"`,
      `"${pago}"`,
      `"${barrio}"`,
      `"${cliente}"`,
      cantItems,
      `"${detalle}"`,
      totalArs,
      `"${origen}"`,
      `"${nota}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Almacenamiento Local (Fallback / Offline)
// ---------------------------------------------------------------------------

function getLocalOrderIntents(): OrderIntent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOrderIntent(intent: OrderIntent): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalOrderIntents();
    const next = [intent, ...current];
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next.slice(0, 200)));
  } catch {
    // Silencio
  }
}

function updateLocalOrderField(id: string, patch: Partial<OrderIntent>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalOrderIntents();
    const next = current.map((o) => (o.id === id ? { ...o, ...patch } : o));
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
  } catch {
    // Silencio
  }
}

function deleteLocalOrder(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalOrderIntents();
    const next = current.filter((o) => o.id !== id);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
  } catch {
    // Silencio
  }
}

function getLocalDailyMetrics(): DailyMetric[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_METRICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function incrementLocalMetric(metric: MetricType): void {
  if (typeof window === 'undefined') return;
  try {
    const today = toArgentinaYmd();
    const metrics = getLocalDailyMetrics();
    const foundIdx = metrics.findIndex((m) => m.metric_date === today);

    if (foundIdx >= 0) {
      metrics[foundIdx][metric] = (metrics[foundIdx][metric] || 0) + 1;
    } else {
      metrics.unshift({
        metric_date: today,
        visits: metric === 'visits' ? 1 : 0,
        cart_adds: metric === 'cart_adds' ? 1 : 0,
        pricelist_opens: metric === 'pricelist_opens' ? 1 : 0,
        whatsapp_clicks: metric === 'whatsapp_clicks' ? 1 : 0,
      });
    }

    localStorage.setItem(LOCAL_METRICS_KEY, JSON.stringify(metrics.slice(0, 90)));
  } catch {
    // Silencio
  }
}

function getLocalProductCosts(): ProductCost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_COSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProductCosts(costs: ProductCost[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_COSTS_KEY, JSON.stringify(costs));
  } catch {
    // Silencio
  }
}

function getLocalChannelMetrics(): DailyChannelMetric[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CHANNEL_METRICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getLocalHourlyMetrics(): DailyHourlyMetric[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_HOURLY_METRICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getLocalProductSignals(): DailyProductSignal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCT_SIGNALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function incrementLocalChannelAndSlot(
  channel: TrafficChannel,
  timeSlot: TimeSlot,
  event: 'visits' | 'whatsapp_clicks'
): void {
  if (typeof window === 'undefined') return;
  try {
    const today = toArgentinaYmd();

    const chList = getLocalChannelMetrics();
    const chIdx = chList.findIndex((r) => r.metric_date === today && r.channel === channel);
    if (chIdx >= 0) {
      chList[chIdx][event] = (chList[chIdx][event] || 0) + 1;
    } else {
      chList.unshift({
        metric_date: today,
        channel,
        visits: event === 'visits' ? 1 : 0,
        whatsapp_clicks: event === 'whatsapp_clicks' ? 1 : 0,
      });
    }
    localStorage.setItem(LOCAL_CHANNEL_METRICS_KEY, JSON.stringify(chList.slice(0, 180)));

    const hrList = getLocalHourlyMetrics();
    const hrIdx = hrList.findIndex((r) => r.metric_date === today && r.time_slot === timeSlot);
    if (hrIdx >= 0) {
      hrList[hrIdx][event] = (hrList[hrIdx][event] || 0) + 1;
    } else {
      hrList.unshift({
        metric_date: today,
        time_slot: timeSlot,
        visits: event === 'visits' ? 1 : 0,
        whatsapp_clicks: event === 'whatsapp_clicks' ? 1 : 0,
      });
    }
    localStorage.setItem(LOCAL_HOURLY_METRICS_KEY, JSON.stringify(hrList.slice(0, 180)));
  } catch {
    // Silencio
  }
}

function incrementLocalProductSignal(
  itemKey: string,
  itemName: string,
  signalType: ProductSignalType
): void {
  if (typeof window === 'undefined') return;
  try {
    const today = toArgentinaYmd();
    const list = getLocalProductSignals();
    const idx = list.findIndex(
      (r) => r.metric_date === today && r.item_key === itemKey && r.signal_type === signalType
    );

    if (idx >= 0) {
      list[idx].count = (list[idx].count || 0) + 1;
      list[idx].item_name = itemName;
    } else {
      list.unshift({
        metric_date: today,
        item_key: itemKey,
        item_name: itemName,
        signal_type: signalType,
        count: 1,
      });
    }

    localStorage.setItem(LOCAL_PRODUCT_SIGNALS_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {
    // Silencio
  }
}
