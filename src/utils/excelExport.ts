import type * as XLSXType from 'xlsx';
import type { Product } from '@/types/catalog';
import { CATEGORY_LABELS } from '@/data/catalog';
import type {
  OrderIntent,
  DailyMetric,
  DailyChannelMetric,
  DailyProductSignal,
  DailyHourlyMetric,
  AnalyticsPeriod,
} from '@/types/analytics';
import {
  PAYMENT_METHOD_LABELS,
  CHANNEL_LABELS,
  TIME_SLOT_LABELS,
} from '@/types/analytics';
import { toArgentinaYmd, getCurrentTimeSlotAR } from '@/utils/analytics';
import {
  computeKpiSummary,
  computePaymentBreakdown,
  computeCustomerTypeBreakdown,
  computeNeighborhoodBreakdown,
  computeOrderMargin,
  findUnitCostForOrderItem,
  computeProductRanking,
  computeBasketPairs,
  computeMarketPulse,
} from '@/utils/analyticsCalculations';

export interface ExcelExportParams {
  period: AnalyticsPeriod;
  orders: OrderIntent[];
  prevOrders: OrderIntent[];
  dailyMetrics: DailyMetric[];
  prevDailyMetrics: DailyMetric[];
  channelMetrics: DailyChannelMetric[];
  productSignals: DailyProductSignal[];
  hourlyMetrics: DailyHourlyMetric[];
  costMap: Map<string, number>;
  products: Product[];
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7d': 'Últimos 7 días',
  this_month: 'Este mes',
  last_month: 'Mes anterior',
  all: 'Historial completo',
};

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ARS_FMT = '$ #,##0';
const PCT_FMT = '0.0%';

function colLetter(colIdxZeroBased: number): string {
  let n = colIdxZeroBased + 1;
  let s = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - mod) / 26);
  }
  return s;
}

function autoFitColumns(rows: (string | number | boolean | null | undefined)[][], minW = 10, maxW = 46) {
  if (rows.length === 0) return [];
  const colCount = Math.max(...rows.map((r) => r.length));
  const widths: { wch: number }[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = minW;
    for (const row of rows) {
      const val = row[c];
      if (val !== null && val !== undefined) {
        const len = String(val).length + 3;
        if (len > maxLen) maxLen = len;
      }
    }
    widths.push({ wch: Math.min(maxW, maxLen) });
  }
  return widths;
}

function applyCellFormat(
  ws: XLSXType.WorkSheet,
  rowIdxZero: number,
  colIdxZero: number,
  numFmt: string
) {
  const ref = `${colLetter(colIdxZero)}${rowIdxZero + 1}`;
  const cell = ws[ref];
  if (cell && cell.t === 'n') {
    cell.z = numFmt;
  }
}

function setFormulaCell(
  ws: XLSXType.WorkSheet,
  rowIdxZero: number,
  colIdxZero: number,
  formula: string,
  numFmt?: string
) {
  const ref = `${colLetter(colIdxZero)}${rowIdxZero + 1}`;
  ws[ref] = {
    t: 'n',
    f: formula,
    ...(numFmt ? { z: numFmt } : {}),
  };
}

export function buildAnalyticsWorkbook(
  XLSX: typeof XLSXType,
  params: ExcelExportParams
): XLSXType.WorkBook {
  const {
    period,
    orders,
    prevOrders,
    dailyMetrics,
    prevDailyMetrics,
    channelMetrics,
    productSignals,
    hourlyMetrics,
    costMap,
    products,
  } = params;

  const wb = XLSX.utils.book_new();
  const todayAr = toArgentinaYmd();
  const generatedAt = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const productCategoryMap = new Map<string, string>();
  for (const p of products) {
    productCategoryMap.set(p.id, CATEGORY_LABELS[p.category] || p.category);
  }

  // Cálculos compartidos
  const kpi = computeKpiSummary({
    orders,
    prevOrders,
    dailyMetrics,
    prevDailyMetrics,
    costMap,
    period,
  });
  const paymentRows = computePaymentBreakdown(orders);
  const customerRows = computeCustomerTypeBreakdown(orders);
  const neighborhoodRows = computeNeighborhoodBreakdown(orders);
  const ranking = computeProductRanking({
    orders,
    costMap,
    metric: 'revenue',
    confirmedOnly: false,
  });
  const basketPairs = computeBasketPairs(orders, 10);
  const pulse = computeMarketPulse({
    signals: productSignals,
    channelMetrics,
    hourlyMetrics,
    orders,
  });

  // =========================================================================
  // HOJA 1: 1_Resumen_Ejecutivo
  // =========================================================================
  const s1Rows: (string | number)[][] = [
    ['Sin Culpa Ni Gluten — Reporte Contable y de Mercado', '', ''],
    ['Período analizado', PERIOD_LABELS[period], ''],
    ['Fecha de generación', generatedAt, ''],
    ['', '', ''],
    ['INDICADORES CLAVE (KPIs)', 'Valor', 'Detalle / Observación'],
    ['Ventas Confirmadas (Caja Real ARS)', kpi.confirmedSalesARS, `${kpi.confirmedOrdersCount} pedidos confirmados`],
    ['Pedidos Pendientes por Confirmar (ARS)', kpi.pendingSalesARS, `${kpi.pendingOrdersCount} pedidos pendientes`],
    ['Pedidos Cancelados (Cantidad)', kpi.cancelledOrdersCount, 'Excluidos de caja real'],
    ['Tasa de Cierre (Confirmados / Iniciados)', kpi.closeRatePct / 100, 'Porcentaje de pedidos concretados'],
    ['Ticket Promedio (ARS)', kpi.averageTicketARS, kpi.isTicketConfirmedOnly ? 'Sobre confirmados' : 'Provisional sobre iniciados'],
    ['CMV Total Estimado (ARS)', kpi.totalCmvARS, 'Costo de mercadería vendida (confirmados)'],
    ['Ganancia Bruta Estimada (ARS)', kpi.grossProfitARS, 'Ventas confirmadas menos CMV'],
    ['Margen Bruto Global (%)', kpi.grossMarginPct / 100, kpi.hasAnyCosts ? 'Calculado con costos privados' : 'Cargar costos en Admin para exactitud'],
    ['Visitas a la Tienda', kpi.funnel.visits, 'Sesiones únicas registradas'],
    ['Agregados al Carrito', kpi.funnel.cartAdds, `${kpi.funnel.cartAddRatePct.toFixed(1)}% de las visitas`],
    ['Aperturas Lista de Precios', kpi.funnel.pricelistOpens, 'Consultas al flyer interactivo'],
    ['Pedidos / Clics WhatsApp', kpi.funnel.whatsappOrders, 'Intenciones de compra enviadas'],
    ['Conversión Final Tienda (%)', kpi.funnel.conversionRatePct / 100, 'WhatsApp / Visitas'],
    ['', '', ''],
    ['DESGLOSE POR MEDIO DE PAGO', 'Cantidad', 'Monto ARS'],
  ];

  const s1PayStart = s1Rows.length;
  for (const p of paymentRows) {
    s1Rows.push([p.label, p.count, p.totalARS]);
  }
  if (paymentRows.length === 0) {
    s1Rows.push(['Sin datos etiquetados aún', 0, 0]);
  }

  s1Rows.push(['', '', '']);
  s1Rows.push(['DESGLOSE POR BARRIO / ZONA', 'Cantidad', 'Monto ARS']);
  const s1NbStart = s1Rows.length;
  for (const nb of neighborhoodRows) {
    s1Rows.push([nb.label, nb.count, nb.totalARS]);
  }
  if (neighborhoodRows.length === 0) {
    s1Rows.push(['Sin barrios cargados aún', 0, 0]);
  }

  s1Rows.push(['', '', '']);
  s1Rows.push(['TIPO DE CLIENTE', 'Cantidad', 'Monto ARS']);
  const s1CustStart = s1Rows.length;
  for (const c of customerRows) {
    s1Rows.push([c.label, c.count, c.totalARS]);
  }
  if (customerRows.length === 0) {
    s1Rows.push(['Sin etiquetar aún', 0, 0]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
  [5, 6, 9, 10, 11].forEach((r) => applyCellFormat(ws1, r, 1, ARS_FMT));
  [8, 12, 17].forEach((r) => applyCellFormat(ws1, r, 1, PCT_FMT));
  for (let r = s1PayStart; r < s1PayStart + Math.max(1, paymentRows.length); r++) {
    applyCellFormat(ws1, r, 2, ARS_FMT);
  }
  for (let r = s1NbStart; r < s1NbStart + Math.max(1, neighborhoodRows.length); r++) {
    applyCellFormat(ws1, r, 2, ARS_FMT);
  }
  for (let r = s1CustStart; r < s1CustStart + Math.max(1, customerRows.length); r++) {
    applyCellFormat(ws1, r, 2, ARS_FMT);
  }
  ws1['!cols'] = autoFitColumns(s1Rows, 14, 48);
  XLSX.utils.book_append_sheet(wb, ws1, '1_Resumen_Ejecutivo');

  // =========================================================================
  // HOJA 2: 2_Libro_Pedidos
  // =========================================================================
  const s2Headers = [
    'ID Corto',
    'Fecha',
    'Día Semana',
    'Hora',
    'Franja',
    'Estado',
    'Canal',
    'Medio Pago',
    'Barrio',
    'Tipo Cliente',
    'Cant. Ítems',
    'Total Venta ARS',
    'Costo Est. ARS',
    'Ganancia Est. ARS',
    'Margen %',
    'Detalle Resumido',
    'Nota Interna',
  ];
  const s2Rows: (string | number)[][] = [s2Headers];

  for (const order of orders) {
    const d = new Date(order.created_at);
    const valid = !isNaN(d.getTime());
    const fecha = valid ? toArgentinaYmd(d) : order.created_at;
    const diaSemana = valid ? WEEKDAY_NAMES[d.getDay()] : '';
    const hora = valid
      ? d.toLocaleTimeString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const slotKey = order.time_slot || (valid ? getCurrentTimeSlotAR(d) : 'tarde');
    const franja = TIME_SLOT_LABELS[slotKey]?.label || slotKey;
    const canal = CHANNEL_LABELS[order.channel || 'directo'] || 'Directo';
    const pago = order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method] : 'Sin especificar';
    const barrio = order.neighborhood || 'Sin especificar';
    const cliente =
      order.customer_type === 'nuevo'
        ? 'Nuevo'
        : order.customer_type === 'recurrente'
        ? 'Recurrente'
        : 'Sin especificar';

    const margin = computeOrderMargin(order, costMap);
    const detalle = order.items
      .map((it) => `${it.qty}x ${it.name}${it.variant ? ` (${it.variant})` : ''}`)
      .join(' + ');

    s2Rows.push([
      `#${order.id.slice(0, 8)}`,
      fecha,
      diaSemana,
      hora,
      franja,
      order.status,
      canal,
      pago,
      barrio,
      cliente,
      order.items_count,
      order.total_ars,
      margin.totalCostArs,
      margin.grossProfitArs,
      margin.grossMarginPct / 100,
      detalle,
      order.note || '',
    ]);
  }

  const s2LastDataRow = s2Rows.length; // 1-based Excel row index of last data row = s2LastDataRow
  const s2TotalsRowIdx = s2Rows.length; // 0-based index of totals row
  s2Rows.push([
    'TOTALES',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    0,
    0,
    0,
    0,
    `${orders.length} pedidos en período`,
    '',
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
  for (let r = 1; r < s2TotalsRowIdx; r++) {
    applyCellFormat(ws2, r, 11, ARS_FMT);
    applyCellFormat(ws2, r, 12, ARS_FMT);
    applyCellFormat(ws2, r, 13, ARS_FMT);
    applyCellFormat(ws2, r, 14, PCT_FMT);
  }
  if (orders.length > 0) {
    setFormulaCell(ws2, s2TotalsRowIdx, 10, `SUM(K2:K${s2LastDataRow})`);
    setFormulaCell(ws2, s2TotalsRowIdx, 11, `SUM(L2:L${s2LastDataRow})`, ARS_FMT);
    setFormulaCell(ws2, s2TotalsRowIdx, 12, `SUM(M2:M${s2LastDataRow})`, ARS_FMT);
    setFormulaCell(ws2, s2TotalsRowIdx, 13, `SUM(N2:N${s2LastDataRow})`, ARS_FMT);
    const totExcelRow = s2TotalsRowIdx + 1;
    setFormulaCell(
      ws2,
      s2TotalsRowIdx,
      14,
      `IF(L${totExcelRow}>0,N${totExcelRow}/L${totExcelRow},0)`,
      PCT_FMT
    );
  }
  ws2['!autofilter'] = { ref: `A1:Q${Math.max(2, s2LastDataRow)}` };
  ws2['!cols'] = autoFitColumns(s2Rows, 10, 44);
  XLSX.utils.book_append_sheet(wb, ws2, '2_Libro_Pedidos');

  // =========================================================================
  // HOJA 3: 3_Detalle_Items (para Tablas Dinámicas)
  // =========================================================================
  const s3Headers = [
    'ID Pedido',
    'Fecha',
    'Mes',
    'Estado Pedido',
    'Canal',
    'Barrio',
    'Tipo',
    'Categoría',
    'Producto',
    'Variante',
    'Cantidad',
    'Precio Unit. ARS',
    'Subtotal ARS',
    'Costo Unit. ARS',
    'Costo Total ARS',
    'Ganancia Línea ARS',
  ];
  const s3Rows: (string | number)[][] = [s3Headers];

  for (const order of orders) {
    const d = new Date(order.created_at);
    const valid = !isNaN(d.getTime());
    const fecha = valid ? toArgentinaYmd(d) : order.created_at;
    const mes = valid ? fecha.slice(0, 7) : '';
    const canal = CHANNEL_LABELS[order.channel || 'directo'] || 'Directo';
    const barrio = order.neighborhood || 'Sin especificar';

    for (const item of order.items) {
      const unitCost = findUnitCostForOrderItem(item, costMap);
      const totalCost = unitCost * item.qty;
      const lineProfit = item.subtotal - totalCost;
      const category =
        item.type === 'combo'
          ? 'Combos Freezer'
          : productCategoryMap.get(item.id) || 'Catálogo';

      s3Rows.push([
        `#${order.id.slice(0, 8)}`,
        fecha,
        mes,
        order.status,
        canal,
        barrio,
        item.type === 'combo' ? 'Combo' : 'Producto',
        category,
        item.name,
        item.variant || (item.type === 'combo' ? 'Combo' : 'Única'),
        item.qty,
        item.unit_price,
        item.subtotal,
        unitCost,
        totalCost,
        lineProfit,
      ]);
    }
  }

  const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
  for (let r = 1; r < s3Rows.length; r++) {
    [11, 12, 13, 14, 15].forEach((c) => applyCellFormat(ws3, r, c, ARS_FMT));
  }
  ws3['!autofilter'] = { ref: `A1:P${Math.max(2, s3Rows.length)}` };
  ws3['!cols'] = autoFitColumns(s3Rows, 10, 38);
  XLSX.utils.book_append_sheet(wb, ws3, '3_Detalle_Items');

  // =========================================================================
  // HOJA 4: 4_Ranking_y_Margen
  // =========================================================================
  const s4Headers = [
    'Producto',
    'Variante',
    'Tipo',
    'Unidades Pedidas',
    'Unidades Confirmadas',
    'Facturación Confirmada ARS',
    '% Participación',
    '% Acumulado Pareto',
    'Costo Unit. ARS',
    'CMV Total ARS',
    'Ganancia Bruta ARS',
    'Margen %',
  ];
  const s4Rows: (string | number)[][] = [s4Headers];

  for (const it of ranking.items) {
    s4Rows.push([
      it.name,
      it.variant || (it.type === 'combo' ? 'Combo' : 'Única'),
      it.type === 'combo' ? 'Combo' : 'Producto',
      it.units,
      it.confirmedUnits,
      it.confirmedRevenue,
      it.revenueSharePct / 100,
      it.cumulativeRevenuePct / 100,
      it.unitCost,
      it.totalCost,
      it.profit,
      it.marginPct / 100,
    ]);
  }

  const s4RankEnd = s4Rows.length;
  s4Rows.push(['', '', '', '', '', '', '', '', '', '', '', '']);
  s4Rows.push(['PARES FRECUENTES (ANÁLISIS DE CANASTA)', '', '', '', '', '', '', '', '', '', '', '']);
  s4Rows.push(['Posición', 'Producto / Combo A', 'Producto / Combo B', 'Veces Juntos', '% de Pedidos', '', '', '', '', '', '', '']);
  const s4BasketStart = s4Rows.length;
  if (basketPairs.length === 0) {
    s4Rows.push([1, 'Sin combinaciones suficientes aún', '', 0, 0, '', '', '', '', '', '', '']);
  } else {
    basketPairs.forEach((p, idx) => {
      s4Rows.push([idx + 1, p.itemAName, p.itemBName, p.count, p.pctOfOrders / 100, '', '', '', '', '', '', '']);
    });
  }

  const ws4 = XLSX.utils.aoa_to_sheet(s4Rows);
  for (let r = 1; r < s4RankEnd; r++) {
    [5, 8, 9, 10].forEach((c) => applyCellFormat(ws4, r, c, ARS_FMT));
    [6, 7, 11].forEach((c) => applyCellFormat(ws4, r, c, PCT_FMT));
  }
  for (let r = s4BasketStart; r < s4Rows.length; r++) {
    applyCellFormat(ws4, r, 4, PCT_FMT);
  }
  ws4['!autofilter'] = { ref: `A1:L${Math.max(2, s4RankEnd)}` };
  ws4['!cols'] = autoFitColumns(s4Rows, 10, 40);
  XLSX.utils.book_append_sheet(wb, ws4, '4_Ranking_y_Margen');

  // =========================================================================
  // HOJA 5: 5_Trafico_y_Canales
  // =========================================================================
  const s5Rows: (string | number)[][] = [
    ['SERIE CRONOLÓGICA DIARIA', '', '', '', '', '', ''],
    ['Fecha', 'Día', 'Visitas', 'Agregados Carrito', 'Lista Precios', 'Pedidos WhatsApp', '% Conversión'],
  ];

  const sortedMetrics = [...dailyMetrics].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  const s5DailyStart = s5Rows.length;
  for (const m of sortedMetrics) {
    const d = new Date(`${m.metric_date}T12:00:00`);
    const dayName = !isNaN(d.getTime()) ? WEEKDAY_NAMES[d.getDay()] : '';
    const conv = m.visits > 0 ? m.whatsapp_clicks / m.visits : 0;
    s5Rows.push([
      m.metric_date,
      dayName,
      m.visits || 0,
      m.cart_adds || 0,
      m.pricelist_opens || 0,
      m.whatsapp_clicks || 0,
      conv,
    ]);
  }
  if (sortedMetrics.length === 0) {
    s5Rows.push([todayAr, WEEKDAY_NAMES[new Date().getDay()], 0, 0, 0, 0, 0]);
  }
  const s5DailyEnd = s5Rows.length;

  s5Rows.push(['', '', '', '', '', '', '']);
  s5Rows.push(['CONSOLIDADO POR CANAL DE ORIGEN', '', '', '', '', '', '']);
  s5Rows.push(['Canal', 'Visitas', 'Clics WhatsApp', 'Pedidos Registrados', 'Facturación Confirmada ARS', '% Conversión', '']);
  const s5ChanStart = s5Rows.length;
  for (const ch of pulse.channelAttribution) {
    s5Rows.push([
      ch.label,
      ch.visits,
      ch.whatsappClicks,
      ch.ordersCount,
      ch.confirmedRevenue,
      ch.conversionPct / 100,
      '',
    ]);
  }

  const ws5 = XLSX.utils.aoa_to_sheet(s5Rows);
  for (let r = s5DailyStart; r < s5DailyEnd; r++) {
    applyCellFormat(ws5, r, 6, PCT_FMT);
  }
  for (let r = s5ChanStart; r < s5Rows.length; r++) {
    applyCellFormat(ws5, r, 4, ARS_FMT);
    applyCellFormat(ws5, r, 5, PCT_FMT);
  }
  ws5['!cols'] = autoFitColumns(s5Rows, 12, 32);
  XLSX.utils.book_append_sheet(wb, ws5, '5_Trafico_y_Canales');

  // =========================================================================
  // HOJA 6: 6_Pulso_Mercado
  // =========================================================================
  const s6Rows: (string | number)[][] = [
    ['1. INTERÉS EN PRÓXIMAMENTE ("AVISAME CUANDO SALGA")', '', '', '', ''],
    ['Producto Futuro', 'Clics de Interés', '', '', ''],
  ];
  if (pulse.upcomingRanking.length === 0) {
    s6Rows.push(['Sin clics registrados aún', 0, '', '', '']);
  } else {
    for (const u of pulse.upcomingRanking) {
      s6Rows.push([u.itemName, u.count, '', '', '']);
    }
  }

  s6Rows.push(['', '', '', '', '']);
  s6Rows.push(['2. SENSIBILIDAD DE PRECIOS (CARRITO VS. ABANDONO)', '', '', '', '']);
  s6Rows.push(['Producto / Combo', 'Agregados al Carrito', 'Quitados del Carrito', 'Unidades Pedidas', 'Tasa Abandono %']);
  const s6SensStart = s6Rows.length;
  if (pulse.priceSensitivity.length === 0) {
    s6Rows.push(['Sin movimientos registrados aún', 0, 0, 0, 0]);
  } else {
    for (const ps of pulse.priceSensitivity) {
      s6Rows.push([ps.itemName, ps.cartAdds, ps.cartRemoves, ps.closedUnits, ps.abandonRatePct / 100]);
    }
  }
  const s6SensEnd = s6Rows.length;

  s6Rows.push(['', '', '', '', '']);
  s6Rows.push(['3. CONSULTAS PACK 500G / PRECIO A CONSULTAR', '', '', '', '']);
  s6Rows.push(['Producto', 'Clics de Consulta', '', '', '']);
  if (pulse.consult500gRanking.length === 0) {
    s6Rows.push(['Sin consultas registradas aún', 0, '', '', '']);
  } else {
    for (const c of pulse.consult500gRanking) {
      s6Rows.push([c.itemName, c.count, '', '', '']);
    }
  }

  s6Rows.push(['', '', '', '', '']);
  s6Rows.push(['4. QUIEBRES DE STOCK ("AVISAME CUANDO VUELVA")', '', '', '', '']);
  s6Rows.push(['Producto', 'Clics de Reposición', '', '', '']);
  if (pulse.outOfStockRanking.length === 0) {
    s6Rows.push(['Sin avisos de falta de stock aún', 0, '', '', '']);
  } else {
    for (const o of pulse.outOfStockRanking) {
      s6Rows.push([o.itemName, o.count, '', '', '']);
    }
  }

  s6Rows.push(['', '', '', '', '']);
  s6Rows.push(['5. DEMANDA POR FRANJA HORARIA (HORA ARGENTINA)', '', '', '', '']);
  s6Rows.push(['Franja', 'Horario', 'Visitas', 'Clics WhatsApp', 'Pedidos']);
  for (const sl of pulse.timeSlotHeatmap) {
    s6Rows.push([sl.label, sl.range, sl.visits, sl.whatsappClicks, sl.ordersCount]);
  }

  const ws6 = XLSX.utils.aoa_to_sheet(s6Rows);
  for (let r = s6SensStart; r < s6SensEnd; r++) {
    applyCellFormat(ws6, r, 4, PCT_FMT);
  }
  ws6['!cols'] = autoFitColumns(s6Rows, 14, 42);
  XLSX.utils.book_append_sheet(wb, ws6, '6_Pulso_Mercado');

  return wb;
}

/**
 * Carga `xlsx` de forma diferida (lazy import) exclusivamente al hacer clic en exportar
 * dentro de /admin, manteniendo 0 KB extra en el bundle inicial de la tienda pública.
 */
export async function exportAnalyticsToExcel(params: ExcelExportParams): Promise<string> {
  const XLSX = await import('xlsx');
  const wb = buildAnalyticsWorkbook(XLSX, params);
  const todayStr = toArgentinaYmd();
  const filename = `SinCulpaNiGluten_Reporte_${todayStr}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
