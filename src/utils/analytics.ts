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
} from '@/types/analytics';

const SESSION_VISIT_KEY = 'scng_visited_session';
const LOCAL_ORDERS_KEY = 'scng_local_order_intents_v1';
const LOCAL_METRICS_KEY = 'scng_local_daily_metrics_v1';

/**
 * Registra una métrica de forma silenciosa y en segundo plano (fire-and-forget).
 * Jamás bloquea la interfaz de usuario ni propaga errores al cliente si falla.
 */
export function trackMetric(metric: MetricType): void {
  // En SSR o entornos sin window
  if (typeof window === 'undefined') return;

  // 1. Visitas: contar máximo 1 visita por sesión del navegador para no inflar recargas
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

  // Actualizar fallback local
  incrementLocalMetric(metric);

  // 2. Si Supabase está disponible, llamar a la función RPC con SECURITY DEFINER
  if (!supabase) return;

  // Fire-and-forget: ejecutar en background sin await
  void (async () => {
    try {
      const { error } = await supabase.rpc('increment_daily_metric', { p_metric: metric });
      if (error) {
        console.debug('[Analytics] Falló trackMetric en Supabase (operando con fallback):', error.message);
      }
    } catch (err) {
      console.debug('[Analytics] Excepción en trackMetric:', err);
    }
  })();
}

/**
 * Guarda una intención de pedido en segundo plano al pulsar "Enviar pedido por WhatsApp".
 * No demora la navegación ni la apertura de wa.me.
 */
export function recordOrderIntent(params: {
  items: OrderItem[];
  totalArs: number;
  itemsCount: number;
  source?: OrderIntentSource;
  note?: string;
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

  const intentPayload: Omit<OrderIntent, 'id' | 'created_at'> = {
    items: cleanItems,
    items_count: params.itemsCount,
    total_ars: params.totalArs,
    status: 'pendiente',
    source: params.source || 'carrito',
    note: params.note || null,
  };

  // Guardar en fallback local
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const localOrder: OrderIntent = {
    ...intentPayload,
    id: localId,
    created_at: new Date().toISOString(),
  };
  saveLocalOrderIntent(localOrder);

  // Si Supabase está activo, registrar en la tabla order_intents
  if (!supabase) return;

  void (async () => {
    try {
      const { error } = await supabase
        .from('order_intents')
        .insert({
          items: cleanItems,
          items_count: params.itemsCount,
          total_ars: params.totalArs,
          status: 'pendiente',
          source: params.source || 'carrito',
          note: params.note || null,
        });

      if (error) {
        console.debug('[Analytics] Falló recordOrderIntent en Supabase (guardado localmente):', error.message);
      }
    } catch (err) {
      console.debug('[Analytics] Excepción en recordOrderIntent:', err);
    }
  })();
}

// ---------------------------------------------------------------------------
// Helpers para el Panel Admin (/admin - Pestaña Métricas)
// ---------------------------------------------------------------------------

/**
 * Obtiene todas las intenciones de pedido desde Supabase con fallback a localStorage.
 */
export async function fetchOrderIntents(): Promise<OrderIntent[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('order_intents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as OrderIntent[];
      }
    } catch (err) {
      console.warn('[Analytics] Error consultando Supabase order_intents:', err);
    }
  }

  return getLocalOrderIntents();
}

/**
 * Obtiene las métricas diarias acumuladas.
 */
export async function fetchDailyMetrics(): Promise<DailyMetric[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as DailyMetric[];
      }
    } catch (err) {
      console.warn('[Analytics] Error consultando Supabase daily_metrics:', err);
    }
  }

  return getLocalDailyMetrics();
}

/**
 * Actualiza el estado de un pedido (pendiente / confirmado / cancelado).
 */
export async function updateOrderIntentStatus(id: string, status: OrderIntentStatus): Promise<boolean> {
  let updatedInSupabase = false;

  if (supabase && !id.startsWith('local-')) {
    try {
      const { error } = await supabase
        .from('order_intents')
        .update({ status })
        .eq('id', id);

      if (!error) {
        updatedInSupabase = true;
      }
    } catch (err) {
      console.warn('[Analytics] Error actualizando estado en Supabase:', err);
    }
  }

  // Actualizar también copia local
  updateLocalOrderStatus(id, status);
  return updatedInSupabase || true;
}

/**
 * Actualiza la nota interna administrativa de un pedido.
 */
export async function updateOrderIntentNote(id: string, note: string | null): Promise<boolean> {
  if (supabase && !id.startsWith('local-')) {
    try {
      const { error } = await supabase
        .from('order_intents')
        .update({ note: note || null })
        .eq('id', id);

      if (!error) return true;
    } catch (err) {
      console.warn('[Analytics] Error actualizando nota en Supabase:', err);
    }
  }

  updateLocalOrderNote(id, note);
  return true;
}

/**
 * Elimina una orden (para borrar pedidos de prueba).
 */
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
// Filtros por Período
// ---------------------------------------------------------------------------

export function filterOrdersByPeriod(orders: OrderIntent[], period: AnalyticsPeriod): OrderIntent[] {
  if (period === 'all') return orders;

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
    return orders;
  }

  return orders.filter((o) => {
    const orderDate = new Date(o.created_at);
    return orderDate >= startDate && orderDate <= endDate;
  });
}

export function filterMetricsByPeriod(metrics: DailyMetric[], period: AnalyticsPeriod): DailyMetric[] {
  if (period === 'all') return metrics;

  const now = new Date();
  let startStr: string;
  let endStr: string = now.toISOString().slice(0, 10);

  if (period === '7d') {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    startStr = d.toISOString().slice(0, 10);
  } else if (period === 'this_month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    startStr = d.toISOString().slice(0, 10);
  } else if (period === 'last_month') {
    const dStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const dEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    startStr = dStart.toISOString().slice(0, 10);
    endStr = dEnd.toISOString().slice(0, 10);
  } else {
    return metrics;
  }

  return metrics.filter((m) => m.metric_date >= startStr && m.metric_date <= endStr);
}

// ---------------------------------------------------------------------------
// Exportación a CSV para Excel (BOM UTF-8, delimitador ';')
// ---------------------------------------------------------------------------

export function exportOrderIntentsToCSV(orders: OrderIntent[], filename = 'pedidos-sin-culpa.csv'): void {
  const headers = ['Fecha', 'Hora', 'Estado', 'Cantidad Items', 'Detalle Productos', 'Total ARS', 'Origen', 'Nota'];

  const rows = orders.map((order) => {
    const d = new Date(order.created_at);
    const fecha = !isNaN(d.getTime()) ? d.toLocaleDateString('es-AR') : order.created_at;
    const hora = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
    const estado = order.status;
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
    // Conservar máximo 200 intenciones locales
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next.slice(0, 200)));
  } catch {
    // Silencio
  }
}

function updateLocalOrderStatus(id: string, status: OrderIntentStatus): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalOrderIntents();
    const next = current.map((o) => (o.id === id ? { ...o, status } : o));
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
  } catch {
    // Silencio
  }
}

function updateLocalOrderNote(id: string, note: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalOrderIntents();
    const next = current.map((o) => (o.id === id ? { ...o, note } : o));
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
    const today = new Date().toISOString().slice(0, 10);
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
