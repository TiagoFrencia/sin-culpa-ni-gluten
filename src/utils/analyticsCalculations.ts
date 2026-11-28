import type { Product, Combo } from '@/types/catalog';
import type {
  OrderIntent,
  OrderIntentItem,
  DailyMetric,
  ProductCost,
  DailyChannelMetric,
  DailyProductSignal,
  DailyHourlyMetric,
  TrafficChannel,
  PaymentMethod,
  CustomerType,
  TimeSlot,
  AnalyticsPeriod,
} from '@/types/analytics';
import {
  CHANNEL_LABELS,
  PAYMENT_METHOD_LABELS,
  TIME_SLOT_LABELS,
} from '@/types/analytics';
import { buildCostItemKey, getCurrentTimeSlotAR } from '@/utils/analytics';

export function buildCostMap(costs: ProductCost[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of costs) {
    map.set(c.item_key, Math.max(0, Math.round(c.unit_cost_ars || 0)));
  }
  return map;
}

export function findUnitCostForOrderItem(
  item: OrderIntentItem,
  costMap: Map<string, number>
): number {
  if (costMap.size === 0) return 0;

  if (item.type === 'combo') {
    return costMap.get(buildCostItemKey('combo', item.id)) ?? 0;
  }

  const exactKey = buildCostItemKey('product', item.id, item.variant || 'default');
  if (costMap.has(exactKey)) {
    return costMap.get(exactKey) ?? 0;
  }

  // Si la variante incluye sabor entre paréntesis, ej. "Docena (12 u.) (Saladas)",
  // buscamos la clave de costo cuya variante sea prefijo.
  const prefix = `product:${item.id}:`;
  const variantLower = (item.variant || '').trim().toLowerCase();
  let singleCandidate: number | null = null;
  let candidateCount = 0;

  for (const [k, v] of costMap.entries()) {
    if (!k.startsWith(prefix)) continue;
    candidateCount += 1;
    singleCandidate = v;
    const keyVariant = k.slice(prefix.length).trim().toLowerCase();
    if (keyVariant && variantLower.startsWith(keyVariant)) {
      return v;
    }
  }

  if (candidateCount === 1 && singleCandidate !== null) {
    return singleCandidate;
  }

  return 0;
}

export interface OrderMarginSummary {
  totalCostArs: number;
  grossProfitArs: number;
  grossMarginPct: number;
}

export function computeOrderMargin(
  order: OrderIntent,
  costMap: Map<string, number>
): OrderMarginSummary {
  let totalCostArs = 0;
  for (const it of order.items) {
    const unitCost = findUnitCostForOrderItem(it, costMap);
    totalCostArs += unitCost * it.qty;
  }
  const grossProfitArs = order.total_ars - totalCostArs;
  const grossMarginPct =
    order.total_ars > 0 ? (grossProfitArs / order.total_ars) * 100 : 0;

  return {
    totalCostArs,
    grossProfitArs,
    grossMarginPct,
  };
}

export function computeDeltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export interface KpiSummary {
  confirmedOrders: OrderIntent[];
  confirmedSalesARS: number;
  confirmedOrdersCount: number;
  pendingOrders: OrderIntent[];
  pendingSalesARS: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  closeRatePct: number;
  averageTicketARS: number;
  isTicketConfirmedOnly: boolean;
  totalCmvARS: number;
  grossProfitARS: number;
  grossMarginPct: number;
  hasAnyCosts: boolean;
  funnel: {
    visits: number;
    cartAdds: number;
    pricelistOpens: number;
    whatsappOrders: number;
    cartAddRatePct: number;
    conversionRatePct: number;
  };
  deltas: {
    confirmedSalesPct: number | null;
    confirmedCountPct: number | null;
    pendingSalesPct: number | null;
    avgTicketPct: number | null;
    grossProfitPct: number | null;
    visitsPct: number | null;
    conversionPct: number | null;
  };
}

export function computeKpiSummary(params: {
  orders: OrderIntent[];
  prevOrders: OrderIntent[];
  dailyMetrics: DailyMetric[];
  prevDailyMetrics: DailyMetric[];
  costMap: Map<string, number>;
  period: AnalyticsPeriod;
}): KpiSummary {
  const { orders, prevOrders, dailyMetrics, prevDailyMetrics, costMap, period } = params;

  const confirmedOrders = orders.filter((o) => o.status === 'confirmado');
  const pendingOrders = orders.filter((o) => o.status === 'pendiente');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelado');

  const confirmedSalesARS = confirmedOrders.reduce((acc, o) => acc + o.total_ars, 0);
  const confirmedOrdersCount = confirmedOrders.length;
  const pendingSalesARS = pendingOrders.reduce((acc, o) => acc + o.total_ars, 0);
  const pendingOrdersCount = pendingOrders.length;
  const cancelledOrdersCount = cancelledOrders.length;

  const closeRatePct =
    orders.length > 0 ? (confirmedOrdersCount / orders.length) * 100 : 0;

  const isTicketConfirmedOnly = confirmedOrdersCount > 0 || pendingOrdersCount === 0;
  const averageTicketARS =
    confirmedOrdersCount > 0
      ? Math.round(confirmedSalesARS / confirmedOrdersCount)
      : pendingOrdersCount > 0
      ? Math.round(pendingSalesARS / pendingOrdersCount)
      : 0;

  let hasAnyCosts = false;
  for (const val of costMap.values()) {
    if (val > 0) {
      hasAnyCosts = true;
      break;
    }
  }

  let totalCmvARS = 0;
  for (const order of confirmedOrders) {
    totalCmvARS += computeOrderMargin(order, costMap).totalCostArs;
  }
  const grossProfitARS = confirmedSalesARS - totalCmvARS;
  const grossMarginPct =
    confirmedSalesARS > 0 ? (grossProfitARS / confirmedSalesARS) * 100 : 0;

  // Funnel
  const visits = dailyMetrics.reduce((acc, m) => acc + (m.visits || 0), 0);
  const cartAdds = dailyMetrics.reduce((acc, m) => acc + (m.cart_adds || 0), 0);
  const pricelistOpens = dailyMetrics.reduce((acc, m) => acc + (m.pricelist_opens || 0), 0);
  const whatsappClicks = dailyMetrics.reduce((acc, m) => acc + (m.whatsapp_clicks || 0), 0);
  const whatsappOrders = Math.max(whatsappClicks, orders.length);
  const cartAddRatePct = visits > 0 ? (cartAdds / visits) * 100 : 0;
  const conversionRatePct = visits > 0 ? (whatsappOrders / visits) * 100 : 0;

  // Previous period deltas
  const canCompare = period !== 'all';
  const prevConfirmed = prevOrders.filter((o) => o.status === 'confirmado');
  const prevConfirmedSales = prevConfirmed.reduce((acc, o) => acc + o.total_ars, 0);
  const prevPendingSales = prevOrders
    .filter((o) => o.status === 'pendiente')
    .reduce((acc, o) => acc + o.total_ars, 0);
  const prevAvgTicket =
    prevConfirmed.length > 0 ? Math.round(prevConfirmedSales / prevConfirmed.length) : 0;

  let prevCmv = 0;
  for (const o of prevConfirmed) {
    prevCmv += computeOrderMargin(o, costMap).totalCostArs;
  }
  const prevGrossProfit = prevConfirmedSales - prevCmv;

  const prevVisits = prevDailyMetrics.reduce((acc, m) => acc + (m.visits || 0), 0);
  const prevWaClicks = prevDailyMetrics.reduce((acc, m) => acc + (m.whatsapp_clicks || 0), 0);
  const prevWaOrders = Math.max(prevWaClicks, prevOrders.length);
  const prevConversion = prevVisits > 0 ? (prevWaOrders / prevVisits) * 100 : 0;

  return {
    confirmedOrders,
    confirmedSalesARS,
    confirmedOrdersCount,
    pendingOrders,
    pendingSalesARS,
    pendingOrdersCount,
    cancelledOrdersCount,
    closeRatePct,
    averageTicketARS,
    isTicketConfirmedOnly,
    totalCmvARS,
    grossProfitARS,
    grossMarginPct,
    hasAnyCosts,
    funnel: {
      visits,
      cartAdds,
      pricelistOpens,
      whatsappOrders,
      cartAddRatePct,
      conversionRatePct,
    },
    deltas: {
      confirmedSalesPct: canCompare ? computeDeltaPct(confirmedSalesARS, prevConfirmedSales) : null,
      confirmedCountPct: canCompare ? computeDeltaPct(confirmedOrdersCount, prevConfirmed.length) : null,
      pendingSalesPct: canCompare ? computeDeltaPct(pendingSalesARS, prevPendingSales) : null,
      avgTicketPct: canCompare ? computeDeltaPct(averageTicketARS, prevAvgTicket) : null,
      grossProfitPct:
        canCompare && hasAnyCosts ? computeDeltaPct(grossProfitARS, prevGrossProfit) : null,
      visitsPct: canCompare ? computeDeltaPct(visits, prevVisits) : null,
      conversionPct: canCompare ? computeDeltaPct(conversionRatePct, prevConversion) : null,
    },
  };
}

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  totalARS: number;
  sharePct: number;
}

export function computePaymentBreakdown(orders: OrderIntent[]): BreakdownRow[] {
  const confirmed = orders.filter((o) => o.status === 'confirmado');
  const sourceOrders = confirmed.length > 0 ? confirmed : orders.filter((o) => o.status !== 'cancelado');
  const totalSum = sourceOrders.reduce((acc, o) => acc + o.total_ars, 0);

  const keys: (PaymentMethod | 'sin_especificar')[] = [
    'transferencia',
    'efectivo',
    'mercadopago',
    'tarjeta',
    'sin_especificar',
  ];

  const rows: BreakdownRow[] = keys.map((k) => {
    const matching = sourceOrders.filter((o) =>
      k === 'sin_especificar' ? !o.payment_method : o.payment_method === k
    );
    const totalARS = matching.reduce((acc, o) => acc + o.total_ars, 0);
    return {
      key: k,
      label: k === 'sin_especificar' ? 'Sin especificar' : PAYMENT_METHOD_LABELS[k],
      count: matching.length,
      totalARS,
      sharePct: totalSum > 0 ? (totalARS / totalSum) * 100 : 0,
    };
  });

  return rows.filter((r) => r.count > 0 || r.key !== 'sin_especificar');
}

export function computeCustomerTypeBreakdown(orders: OrderIntent[]): BreakdownRow[] {
  const confirmed = orders.filter((o) => o.status === 'confirmado');
  const sourceOrders = confirmed.length > 0 ? confirmed : orders.filter((o) => o.status !== 'cancelado');
  const totalCount = sourceOrders.length;

  const keys: (CustomerType | 'sin_especificar')[] = ['nuevo', 'recurrente', 'sin_especificar'];
  const labels: Record<CustomerType | 'sin_especificar', string> = {
    nuevo: 'Clientes Nuevos',
    recurrente: 'Clientes Recurrentes',
    sin_especificar: 'Sin etiquetar',
  };

  return keys
    .map((k) => {
      const matching = sourceOrders.filter((o) =>
        k === 'sin_especificar' ? !o.customer_type : o.customer_type === k
      );
      const totalARS = matching.reduce((acc, o) => acc + o.total_ars, 0);
      return {
        key: k,
        label: labels[k],
        count: matching.length,
        totalARS,
        sharePct: totalCount > 0 ? (matching.length / totalCount) * 100 : 0,
      };
    })
    .filter((r) => r.count > 0 || r.key !== 'sin_especificar');
}

export function computeNeighborhoodBreakdown(orders: OrderIntent[]): BreakdownRow[] {
  const confirmed = orders.filter((o) => o.status === 'confirmado');
  const sourceOrders = confirmed.length > 0 ? confirmed : orders.filter((o) => o.status !== 'cancelado');
  const totalCount = sourceOrders.length;

  const map = new Map<string, { count: number; totalARS: number }>();
  for (const o of sourceOrders) {
    const label = o.neighborhood?.trim() || 'Sin especificar';
    const curr = map.get(label) || { count: 0, totalARS: 0 };
    curr.count += 1;
    curr.totalARS += o.total_ars;
    map.set(label, curr);
  }

  return Array.from(map.entries())
    .map(([label, val]) => ({
      key: label,
      label,
      count: val.count,
      totalARS: val.totalARS,
      sharePct: totalCount > 0 ? (val.count / totalCount) * 100 : 0,
    }))
    .sort((a, b) => {
      if (a.label === 'Sin especificar') return 1;
      if (b.label === 'Sin especificar') return -1;
      return b.count - a.count || b.totalARS - a.totalARS;
    });
}

export interface ProductRankingItem {
  key: string;
  id: string;
  name: string;
  variant: string;
  type: 'product' | 'combo';
  units: number;
  confirmedUnits: number;
  revenue: number;
  confirmedRevenue: number;
  unitCost: number;
  totalCost: number;
  profit: number;
  marginPct: number;
  revenueSharePct: number;
  cumulativeRevenuePct: number;
  isPareto80: boolean;
}

export function computeProductRanking(params: {
  orders: OrderIntent[];
  costMap: Map<string, number>;
  metric: 'revenue' | 'profit' | 'units';
  confirmedOnly: boolean;
}): { items: ProductRankingItem[]; maxVal: number } {
  const { orders, costMap, metric, confirmedOnly } = params;
  const ordersToRank = confirmedOnly
    ? orders.filter((o) => o.status === 'confirmado')
    : orders.filter((o) => o.status !== 'cancelado');

  const map = new Map<string, ProductRankingItem>();

  for (const order of ordersToRank) {
    const isConfirmed = order.status === 'confirmado';
    for (const item of order.items) {
      const key = `${item.type}__${item.id}__${item.variant || ''}`;
      const unitCost = findUnitCostForOrderItem(item, costMap);
      const lineCost = unitCost * item.qty;
      const lineProfit = item.subtotal - lineCost;

      const existing = map.get(key);
      if (existing) {
        existing.units += item.qty;
        existing.revenue += item.subtotal;
        existing.totalCost += lineCost;
        existing.profit += lineProfit;
        if (isConfirmed) {
          existing.confirmedUnits += item.qty;
          existing.confirmedRevenue += item.subtotal;
        }
      } else {
        map.set(key, {
          key,
          id: item.id,
          name: item.name,
          variant: item.variant || '',
          type: item.type,
          units: item.qty,
          confirmedUnits: isConfirmed ? item.qty : 0,
          revenue: item.subtotal,
          confirmedRevenue: isConfirmed ? item.subtotal : 0,
          unitCost,
          totalCost: lineCost,
          profit: lineProfit,
          marginPct: 0,
          revenueSharePct: 0,
          cumulativeRevenuePct: 0,
          isPareto80: false,
        });
      }
    }
  }

  const items = Array.from(map.values());
  const totalRevenue = items.reduce((acc, it) => acc + it.revenue, 0);

  // Calcular Pareto 80/20 sobre ingresos ordenados de mayor a menor
  const byRevenue = [...items].sort((a, b) => b.revenue - a.revenue);
  let runningRev = 0;
  let reached80 = false;

  for (const it of byRevenue) {
    it.marginPct = it.revenue > 0 ? (it.profit / it.revenue) * 100 : 0;
    it.revenueSharePct = totalRevenue > 0 ? (it.revenue / totalRevenue) * 100 : 0;
    runningRev += it.revenue;
    it.cumulativeRevenuePct = totalRevenue > 0 ? (runningRev / totalRevenue) * 100 : 0;

    if (!reached80 && totalRevenue > 0) {
      it.isPareto80 = true;
      if (it.cumulativeRevenuePct >= 80) {
        reached80 = true;
      }
    }
  }

  if (metric === 'revenue') {
    items.sort((a, b) => b.revenue - a.revenue);
  } else if (metric === 'profit') {
    items.sort((a, b) => b.profit - a.profit);
  } else {
    items.sort((a, b) => b.units - a.units);
  }

  const maxVal =
    items.length > 0
      ? Math.max(
          1,
          metric === 'revenue'
            ? items[0].revenue
            : metric === 'profit'
            ? Math.max(1, items[0].profit)
            : items[0].units
        )
      : 1;

  return { items, maxVal };
}

export interface BasketPair {
  pairKey: string;
  itemAName: string;
  itemBName: string;
  count: number;
  pctOfOrders: number;
}

export function computeBasketPairs(orders: OrderIntent[], limit = 5): BasketPair[] {
  const activeOrders = orders.filter((o) => o.status !== 'cancelado' && o.items.length >= 2);
  if (activeOrders.length === 0) return [];

  const pairCounts = new Map<string, { a: string; b: string; count: number }>();

  for (const order of activeOrders) {
    // Deduplicar productos dentro del mismo pedido
    const uniqueNames = Array.from(
      new Set(
        order.items.map((it) =>
          it.variant ? `${it.name} (${it.variant})` : it.name
        )
      )
    ).sort((a, b) => a.localeCompare(b, 'es'));

    for (let i = 0; i < uniqueNames.length; i++) {
      for (let j = i + 1; j < uniqueNames.length; j++) {
        const a = uniqueNames[i];
        const b = uniqueNames[j];
        const key = `${a}|||${b}`;
        const existing = pairCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          pairCounts.set(key, { a, b, count: 1 });
        }
      }
    }
  }

  return Array.from(pairCounts.entries())
    .map(([pairKey, val]) => ({
      pairKey,
      itemAName: val.a,
      itemBName: val.b,
      count: val.count,
      pctOfOrders: Math.round((val.count / activeOrders.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface MarketPulseSummary {
  upcomingRanking: { itemKey: string; itemName: string; count: number }[];
  priceSensitivity: {
    itemKey: string;
    itemName: string;
    cartAdds: number;
    cartRemoves: number;
    closedUnits: number;
    abandonRatePct: number;
  }[];
  consult500gRanking: { itemKey: string; itemName: string; count: number }[];
  outOfStockRanking: { itemKey: string; itemName: string; count: number }[];
  channelAttribution: {
    channel: TrafficChannel;
    label: string;
    visits: number;
    whatsappClicks: number;
    ordersCount: number;
    confirmedRevenue: number;
    conversionPct: number;
  }[];
  timeSlotHeatmap: {
    slot: TimeSlot;
    label: string;
    range: string;
    visits: number;
    whatsappClicks: number;
    ordersCount: number;
  }[];
  weekdayHeatmap: {
    dayIndex: number;
    dayLabel: string;
    ordersCount: number;
    confirmedRevenue: number;
  }[];
}

const WEEKDAY_ORDER = [
  { dayIndex: 1, dayLabel: 'Lun' },
  { dayIndex: 2, dayLabel: 'Mar' },
  { dayIndex: 3, dayLabel: 'Mié' },
  { dayIndex: 4, dayLabel: 'Jue' },
  { dayIndex: 5, dayLabel: 'Vie' },
  { dayIndex: 6, dayLabel: 'Sáb' },
  { dayIndex: 0, dayLabel: 'Dom' },
];

export function computeMarketPulse(params: {
  signals: DailyProductSignal[];
  channelMetrics: DailyChannelMetric[];
  hourlyMetrics: DailyHourlyMetric[];
  orders: OrderIntent[];
}): MarketPulseSummary {
  const { signals, channelMetrics, hourlyMetrics, orders } = params;

  // 1. Próximamente
  const upcomingMap = new Map<string, { itemName: string; count: number }>();
  const consultMap = new Map<string, { itemName: string; count: number }>();
  const oosMap = new Map<string, { itemName: string; count: number }>();
  const sensitivityMap = new Map<
    string,
    { itemName: string; cartAdds: number; cartRemoves: number; closedUnits: number }
  >();

  for (const s of signals) {
    if (s.signal_type === 'upcoming_notify') {
      const prev = upcomingMap.get(s.item_key) || { itemName: s.item_name, count: 0 };
      prev.count += s.count;
      prev.itemName = s.item_name;
      upcomingMap.set(s.item_key, prev);
    } else if (s.signal_type === 'consult_500g') {
      const prev = consultMap.get(s.item_key) || { itemName: s.item_name, count: 0 };
      prev.count += s.count;
      prev.itemName = s.item_name;
      consultMap.set(s.item_key, prev);
    } else if (s.signal_type === 'out_of_stock') {
      const prev = oosMap.get(s.item_key) || { itemName: s.item_name, count: 0 };
      prev.count += s.count;
      prev.itemName = s.item_name;
      oosMap.set(s.item_key, prev);
    } else if (s.signal_type === 'cart_add' || s.signal_type === 'cart_remove') {
      const prev = sensitivityMap.get(s.item_key) || {
        itemName: s.item_name,
        cartAdds: 0,
        cartRemoves: 0,
        closedUnits: 0,
      };
      if (s.signal_type === 'cart_add') prev.cartAdds += s.count;
      if (s.signal_type === 'cart_remove') prev.cartRemoves += s.count;
      prev.itemName = s.item_name;
      sensitivityMap.set(s.item_key, prev);
    }
  }

  // Sumar unidades pedidas cerradas desde orders
  for (const order of orders) {
    if (order.status === 'cancelado') continue;
    for (const it of order.items) {
      const key = buildCostItemKey(it.type, it.id, it.variant || 'default');
      let targetKey = key;
      if (!sensitivityMap.has(targetKey)) {
        const prefix = `product:${it.id}:`;
        for (const k of sensitivityMap.keys()) {
          if (k.startsWith(prefix)) {
            targetKey = k;
            break;
          }
        }
      }
      const prev = sensitivityMap.get(targetKey) || {
        itemName: it.name,
        cartAdds: 0,
        cartRemoves: 0,
        closedUnits: 0,
      };
      prev.closedUnits += it.qty;
      sensitivityMap.set(targetKey, prev);
    }
  }

  const upcomingRanking = Array.from(upcomingMap.entries())
    .map(([itemKey, v]) => ({ itemKey, itemName: v.itemName, count: v.count }))
    .sort((a, b) => b.count - a.count);

  const consult500gRanking = Array.from(consultMap.entries())
    .map(([itemKey, v]) => ({ itemKey, itemName: v.itemName, count: v.count }))
    .sort((a, b) => b.count - a.count);

  const outOfStockRanking = Array.from(oosMap.entries())
    .map(([itemKey, v]) => ({ itemKey, itemName: v.itemName, count: v.count }))
    .sort((a, b) => b.count - a.count);

  const priceSensitivity = Array.from(sensitivityMap.entries())
    .map(([itemKey, v]) => ({
      itemKey,
      itemName: v.itemName,
      cartAdds: v.cartAdds,
      cartRemoves: v.cartRemoves,
      closedUnits: v.closedUnits,
      abandonRatePct:
        v.cartAdds > 0 ? Math.min(100, Math.round((v.cartRemoves / v.cartAdds) * 100)) : 0,
    }))
    .filter((r) => r.cartAdds > 0 || r.cartRemoves > 0)
    .sort((a, b) => b.cartRemoves - a.cartRemoves || b.cartAdds - a.cartAdds);

  // 2. Canales
  const channels: TrafficChannel[] = ['instagram', 'whatsapp', 'google', 'directo', 'otro'];
  const channelAttribution = channels.map((ch) => {
    const chRows = channelMetrics.filter((m) => m.channel === ch);
    const visits = chRows.reduce((acc, r) => acc + (r.visits || 0), 0);
    const whatsappClicks = chRows.reduce((acc, r) => acc + (r.whatsapp_clicks || 0), 0);
    const chOrders = orders.filter((o) => (o.channel || 'directo') === ch);
    const ordersCount = chOrders.length;
    const confirmedRevenue = chOrders
      .filter((o) => o.status === 'confirmado')
      .reduce((acc, o) => acc + o.total_ars, 0);
    const effective = Math.max(whatsappClicks, ordersCount);
    const conversionPct = visits > 0 ? (effective / visits) * 100 : 0;

    return {
      channel: ch,
      label: CHANNEL_LABELS[ch],
      visits,
      whatsappClicks,
      ordersCount,
      confirmedRevenue,
      conversionPct,
    };
  });

  // 3. Franjas Horarias
  const slots: TimeSlot[] = ['manana', 'mediodia', 'tarde', 'noche'];
  const timeSlotHeatmap = slots.map((slot) => {
    const rows = hourlyMetrics.filter((h) => h.time_slot === slot);
    const visits = rows.reduce((acc, r) => acc + (r.visits || 0), 0);
    const whatsappClicks = rows.reduce((acc, r) => acc + (r.whatsapp_clicks || 0), 0);
    const ordersCount = orders.filter((o) => {
      const orderSlot = o.time_slot || getCurrentTimeSlotAR(new Date(o.created_at));
      return orderSlot === slot;
    }).length;

    return {
      slot,
      label: TIME_SLOT_LABELS[slot].label,
      range: TIME_SLOT_LABELS[slot].range,
      visits,
      whatsappClicks,
      ordersCount,
    };
  });

  // 4. Días calientes
  const weekdayMap = new Map<number, { ordersCount: number; confirmedRevenue: number }>();
  for (const w of WEEKDAY_ORDER) {
    weekdayMap.set(w.dayIndex, { ordersCount: 0, confirmedRevenue: 0 });
  }
  for (const o of orders) {
    const d = new Date(o.created_at);
    if (isNaN(d.getTime())) continue;
    const dayIdx = d.getDay();
    const prev = weekdayMap.get(dayIdx) || { ordersCount: 0, confirmedRevenue: 0 };
    prev.ordersCount += 1;
    if (o.status === 'confirmado') {
      prev.confirmedRevenue += o.total_ars;
    }
    weekdayMap.set(dayIdx, prev);
  }
  const weekdayHeatmap = WEEKDAY_ORDER.map((w) => {
    const val = weekdayMap.get(w.dayIndex) || { ordersCount: 0, confirmedRevenue: 0 };
    return {
      dayIndex: w.dayIndex,
      dayLabel: w.dayLabel,
      ordersCount: val.ordersCount,
      confirmedRevenue: val.confirmedRevenue,
    };
  });

  return {
    upcomingRanking,
    priceSensitivity,
    consult500gRanking,
    outOfStockRanking,
    channelAttribution,
    timeSlotHeatmap,
    weekdayHeatmap,
  };
}

export interface CatalogCostRow {
  itemKey: string;
  itemType: 'product' | 'combo';
  itemName: string;
  variantLabel: string;
  salePriceARS: number | null;
  unitCostARS: number;
}

export function buildCatalogCostRows(
  products: Product[],
  combos: Combo[],
  costMap: Map<string, number>
): CatalogCostRow[] {
  const rows: CatalogCostRow[] = [];

  for (const p of products) {
    const variants =
      p.variants && p.variants.length > 0
        ? p.variants
        : [{ id: 'default', label: 'Unidad', price: null }];

    for (const v of variants) {
      const itemKey = buildCostItemKey('product', p.id, v.label);
      rows.push({
        itemKey,
        itemType: 'product',
        itemName: p.name,
        variantLabel: v.label,
        salePriceARS: v.price,
        unitCostARS: costMap.get(itemKey) ?? 0,
      });
    }
  }

  for (const c of combos) {
    const itemKey = buildCostItemKey('combo', c.id);
    const salePrice = c.promoPrice ?? c.regularPrice;
    rows.push({
      itemKey,
      itemType: 'combo',
      itemName: c.name,
      variantLabel: 'Combo',
      salePriceARS: salePrice,
      unitCostARS: costMap.get(itemKey) ?? 0,
    });
  }

  return rows;
}
