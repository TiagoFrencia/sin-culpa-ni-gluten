import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  ShoppingBag,
  Eye,
  ShoppingCart,
  MessageCircle,
  FileText,
  TrendingUp,
  CreditCard,
  MapPin,
  Users,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from 'lucide-react';
import { formatPriceARS } from '@/config/business';
import type { OrderIntent, DailyMetric, AnalyticsPeriod } from '@/types/analytics';
import {
  computeKpiSummary,
  computePaymentBreakdown,
  computeCustomerTypeBreakdown,
  computeNeighborhoodBreakdown,
  computeProductRanking,
  computeBasketPairs,
} from '@/utils/analyticsCalculations';

interface AnalyticsSummaryViewProps {
  orders: OrderIntent[];
  prevOrders: OrderIntent[];
  dailyMetrics: DailyMetric[];
  prevDailyMetrics: DailyMetric[];
  costMap: Map<string, number>;
  period: AnalyticsPeriod;
  onGoToCosts: () => void;
}

type RankingMetric = 'revenue' | 'profit' | 'units';
type RankingFilter = 'confirmed_only' | 'all';

function DeltaBadge({ delta, invertColors = false }: { delta: number | null; invertColors?: boolean }) {
  if (delta === null) return null;
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const isGood = invertColors ? !isPositive : isPositive;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full">
        0% vs. ant.
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
        isGood ? 'text-emerald-800 bg-emerald-100/90' : 'text-red-800 bg-red-100/90'
      }`}
    >
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isPositive ? `+${delta}%` : `${delta}%`} vs. ant.
    </span>
  );
}

export const AnalyticsSummaryView: React.FC<AnalyticsSummaryViewProps> = ({
  orders,
  prevOrders,
  dailyMetrics,
  prevDailyMetrics,
  costMap,
  period,
  onGoToCosts,
}) => {
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('revenue');
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>('confirmed_only');

  const kpi = useMemo(
    () =>
      computeKpiSummary({
        orders,
        prevOrders,
        dailyMetrics,
        prevDailyMetrics,
        costMap,
        period,
      }),
    [orders, prevOrders, dailyMetrics, prevDailyMetrics, costMap, period]
  );

  const paymentRows = useMemo(() => computePaymentBreakdown(orders), [orders]);
  const customerRows = useMemo(() => computeCustomerTypeBreakdown(orders), [orders]);
  const neighborhoodRows = useMemo(() => computeNeighborhoodBreakdown(orders), [orders]);

  const ranking = useMemo(
    () =>
      computeProductRanking({
        orders,
        costMap,
        metric: rankingMetric,
        confirmedOnly: rankingFilter === 'confirmed_only',
      }),
    [orders, costMap, rankingMetric, rankingFilter]
  );

  const basketPairs = useMemo(() => computeBasketPairs(orders, 5), [orders]);

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      {/* 1. TARJETAS KPI PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* KPI 1: Ventas Confirmadas */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Ventas Confirmadas
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">Caja real cobrada o en entrega</p>
            </div>
            <span className="text-xs font-bold text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
              {kpi.confirmedOrdersCount} {kpi.confirmedOrdersCount === 1 ? 'venta' : 'ventas'}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2 flex-wrap">
            <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-emerald-800 leading-tight">
              {formatPriceARS(kpi.confirmedSalesARS)}
            </span>
            <DeltaBadge delta={kpi.deltas.confirmedSalesPct} />
          </div>

          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>Tasa de cierre: {kpi.closeRatePct.toFixed(0)}%</span>
            <span className="font-semibold text-emerald-700">100% verificado</span>
          </div>
        </div>

        {/* KPI 2: Por Confirmar */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Por Confirmar
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">Iniciados en WhatsApp pendientes</p>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
              {kpi.pendingOrdersCount} {kpi.pendingOrdersCount === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2 flex-wrap">
            <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-amber-800 leading-tight">
              {formatPriceARS(kpi.pendingSalesARS)}
            </span>
            <DeltaBadge delta={kpi.deltas.pendingSalesPct} />
          </div>

          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>En gestión por WhatsApp</span>
            <span className="font-semibold text-amber-700">Pendiente de pago</span>
          </div>
        </div>

        {/* KPI 3: Ticket Promedio */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#A64B2A] flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                Ticket Promedio
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {kpi.isTicketConfirmedOnly
                  ? 'Calculado sobre pedidos confirmados'
                  : 'Provisional sobre iniciados'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2 flex-wrap">
            <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-[#1D120D] leading-tight">
              {formatPriceARS(kpi.averageTicketARS)}
            </span>
            <DeltaBadge delta={kpi.deltas.avgTicketPct} />
          </div>

          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 border-t border-stone-100 pt-2">
            {kpi.isTicketConfirmedOnly ? (
              <span>Gasto promedio por compra efectiva.</span>
            ) : (
              <span className="text-amber-700 font-medium">
                * Sin pedidos confirmados aún en el período.
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Margen Bruto Estimado & CMV */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#1D120D] flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#A64B2A] shrink-0" />
                Margen Bruto Estimado
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Ganancia real luego de descontar CMV
              </p>
            </div>
            {kpi.hasAnyCosts && kpi.confirmedSalesARS > 0 && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                  kpi.grossMarginPct < 25
                    ? 'bg-red-100 text-red-800'
                    : kpi.grossMarginPct <= 40
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {kpi.grossMarginPct.toFixed(1)}%
              </span>
            )}
          </div>

          {!kpi.hasAnyCosts ? (
            <div className="mt-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] text-amber-900 leading-snug">
                Cargá el costo unitario de tus platos para ver ganancia real y CMV.
              </p>
              <button
                type="button"
                onClick={onGoToCosts}
                className="shrink-0 min-h-[32px] px-2.5 py-1 rounded-lg bg-[#A64B2A] hover:bg-[#8B3E22] text-white text-[11px] font-bold cursor-pointer transition-colors"
              >
                Cargar costos
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2.5 flex items-baseline justify-between gap-2 flex-wrap">
                <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-[#1D120D] leading-tight">
                  {formatPriceARS(kpi.grossProfitARS)}
                </span>
                <DeltaBadge delta={kpi.deltas.grossProfitPct} />
              </div>

              <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2 tabular-nums">
                <span>CMV Total: {formatPriceARS(kpi.totalCmvARS)}</span>
                <button
                  type="button"
                  onClick={onGoToCosts}
                  className="font-semibold text-[#A64B2A] hover:underline cursor-pointer"
                >
                  Editar costos
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. EMBUDO DE TIENDA PÚBLICA */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D]">
              Embudo de Conversión de la Tienda
            </h3>
            <p className="text-[11px] text-stone-500">
              Trayecto desde la visita inicial hasta el envío por WhatsApp.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-bold text-[#A64B2A] bg-[#A64B2A]/10 px-2.5 py-1 rounded-full tabular-nums">
              {kpi.funnel.conversionRatePct.toFixed(1)}% conv.
            </span>
            <DeltaBadge delta={kpi.deltas.visitsPct} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-stone-50 p-2.5 sm:p-3 rounded-xl border border-stone-200/70">
            <div className="flex items-center justify-center text-stone-500 mb-1">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-stone-600 block uppercase">
              1. Visitas
            </span>
            <span className="font-sans font-bold text-base sm:text-xl tabular-nums text-stone-900 mt-0.5 block">
              {kpi.funnel.visits}
            </span>
            <span className="text-[9px] sm:text-[10px] text-stone-400">100%</span>
          </div>

          <div className="bg-amber-50/70 p-2.5 sm:p-3 rounded-xl border border-amber-200/70">
            <div className="flex items-center justify-center text-amber-700 mb-1">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 block uppercase">
              2. Carrito
            </span>
            <span className="font-sans font-bold text-base sm:text-xl tabular-nums text-amber-900 mt-0.5 block">
              {kpi.funnel.cartAdds}
            </span>
            <span className="text-[9px] sm:text-[10px] text-amber-700 font-semibold tabular-nums">
              {kpi.funnel.cartAddRatePct.toFixed(1)}% visitas
            </span>
          </div>

          <div className="bg-emerald-50/70 p-2.5 sm:p-3 rounded-xl border border-emerald-200/70">
            <div className="flex items-center justify-center text-emerald-700 mb-1">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 block uppercase">
              3. WhatsApp
            </span>
            <span className="font-sans font-bold text-base sm:text-xl tabular-nums text-emerald-900 mt-0.5 block">
              {kpi.funnel.whatsappOrders}
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold tabular-nums">
              {kpi.funnel.conversionRatePct.toFixed(1)}% final
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-600 bg-stone-50 rounded-xl px-3 py-2 border border-stone-200/60">
          <span className="flex items-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5 text-[#A64B2A]" />
            Aperturas de Lista de Precios en vivo
          </span>
          <strong className="font-sans tabular-nums text-stone-900">{kpi.funnel.pricelistOpens}</strong>
        </div>
      </div>

      {/* 3. MEDIO DE PAGO, TIPO DE CLIENTE Y BARRIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Desglose por Medio de Pago */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[#A64B2A]" />
            <h3 className="font-serif font-bold text-sm text-[#1D120D]">Medios de Pago</h3>
          </div>

          {paymentRows.every((r) => r.count === 0) ? (
            <p className="text-[11px] text-stone-400 py-3">
              Etiquetá el medio de pago en la sub-vista <strong>Pedidos</strong> para ver este desglose.
            </p>
          ) : (
            <div className="space-y-2">
              {paymentRows
                .filter((r) => r.count > 0)
                .map((row) => (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-medium text-stone-800 truncate">{row.label}</span>
                      <span className="font-sans font-bold tabular-nums text-stone-900 shrink-0">
                        {formatPriceARS(row.totalARS)}{' '}
                        <span className="text-[10px] text-stone-400 font-normal">({row.count})</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#A64B2A] rounded-full"
                        style={{ width: `${Math.max(4, Math.round(row.sharePct))}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Clientes Nuevos vs Recurrentes + Top Barrios */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#A64B2A]" />
              <h3 className="font-serif font-bold text-sm text-[#1D120D]">Clientes Nuevos vs. Recurrentes</h3>
            </div>

            {customerRows.every((r) => r.count === 0) ? (
              <p className="text-[11px] text-stone-400">Sin pedidos etiquetados aún.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {customerRows
                  .filter((r) => r.count > 0)
                  .map((r) => (
                    <div
                      key={r.key}
                      className="bg-stone-50 rounded-xl p-2 border border-stone-200/70 min-w-0"
                    >
                      <span className="text-[10px] font-bold text-stone-600 block truncate">
                        {r.label}
                      </span>
                      <span className="font-sans font-bold text-base tabular-nums text-stone-900">
                        {r.count}
                      </span>
                      <span className="text-[10px] text-stone-400 ml-1 tabular-nums">
                        ({r.sharePct.toFixed(0)}%)
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#A64B2A]" />
              <h3 className="font-serif font-bold text-sm text-[#1D120D]">Top Barrios de Río Cuarto</h3>
            </div>

            {neighborhoodRows.length === 0 ? (
              <p className="text-[11px] text-stone-400">Sin barrios cargados aún.</p>
            ) : (
              <div className="space-y-1.5">
                {neighborhoodRows.slice(0, 5).map((b) => (
                  <div
                    key={b.key}
                    className="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-0 gap-2"
                  >
                    <span className="font-medium text-stone-800 truncate">{b.label}</span>
                    <span className="font-sans font-bold tabular-nums text-stone-900 shrink-0">
                      {b.count} {b.count === 1 ? 'ped.' : 'peds.'}{' '}
                      <span className="text-[10px] font-normal text-stone-500">
                        ({formatPriceARS(b.totalARS)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. RANKING DE PRODUCTOS Y COMBOS CON PARETO 80/20 */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D]">
                Ranking de Platos y Combos
              </h3>
              <p className="text-[11px] text-stone-500">
                Los productos marcados con <strong>80/20</strong> concentran el 80% de tus ingresos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRankingMetric('revenue')}
                className={`min-h-[32px] px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  rankingMetric === 'revenue'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Facturación ($)
              </button>
              <button
                type="button"
                onClick={() => setRankingMetric('profit')}
                className={`min-h-[32px] px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  rankingMetric === 'profit'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Ganancia Bruta ($)
              </button>
              <button
                type="button"
                onClick={() => setRankingMetric('units')}
                className={`min-h-[32px] px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  rankingMetric === 'units'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Unidades
              </button>
            </div>

            <div className="inline-flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRankingFilter('confirmed_only')}
                className={`min-h-[32px] px-2 py-1 rounded-md transition-all cursor-pointer ${
                  rankingFilter === 'confirmed_only'
                    ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Solo confirmados
              </button>
              <button
                type="button"
                onClick={() => setRankingFilter('all')}
                className={`min-h-[32px] px-2 py-1 rounded-md transition-all cursor-pointer ${
                  rankingFilter === 'all'
                    ? 'bg-stone-800 text-white shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Todos los iniciados
              </button>
            </div>
          </div>
        </div>

        {ranking.items.length === 0 ? (
          <div className="py-8 text-center bg-stone-50/60 rounded-xl border border-stone-200/50">
            <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-stone-600">
              No hay ítems registrados en este período{' '}
              {rankingFilter === 'confirmed_only' ? '(con estado confirmado)' : ''}.
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Probá cambiando el período a &quot;Todo&quot; o creá un pedido de prueba en la pestaña Pedidos.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ranking.items.map((it, idx) => {
              const currentVal =
                rankingMetric === 'revenue'
                  ? it.revenue
                  : rankingMetric === 'profit'
                  ? Math.max(0, it.profit)
                  : it.units;
              const percent = Math.min(100, Math.max(8, Math.round((currentVal / ranking.maxVal) * 100)));

              return (
                <div
                  key={it.key}
                  className="p-2.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-sans font-bold text-[11px] text-stone-500 w-4 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-stone-900 truncate">{it.name}</span>
                      {it.variant && (
                        <span className="text-[10px] text-stone-500 bg-stone-200/70 px-1.5 py-0.2 rounded shrink-0">
                          {it.variant}
                        </span>
                      )}
                      {it.isPareto80 && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider bg-[#A64B2A]/15 text-[#A64B2A] border border-[#A64B2A]/30 px-1.5 py-0.2 rounded-full shrink-0"
                          title="Forma parte del 80% de tus ingresos (Pareto)"
                        >
                          80/20
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-sans font-bold tabular-nums text-stone-900">
                        {rankingMetric === 'revenue'
                          ? formatPriceARS(it.revenue)
                          : rankingMetric === 'profit'
                          ? formatPriceARS(it.profit)
                          : `${it.units} u.`}
                      </span>
                      <span className="text-[10px] text-stone-400 ml-1.5 tabular-nums">
                        {rankingMetric === 'units'
                          ? `(${formatPriceARS(it.revenue)})`
                          : rankingMetric === 'profit' && it.unitCost > 0
                          ? `(${it.marginPct.toFixed(0)}%)`
                          : `(${it.units} u.)`}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        idx === 0 ? 'bg-[#A64B2A]' : idx === 1 ? 'bg-amber-600' : 'bg-stone-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. ANÁLISIS DE CANASTA: "SE COMPRAN JUNTOS" */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#A64B2A]" />
              Se compran juntos (Canasta)
            </h3>
            <p className="text-[11px] text-stone-500">
              Top 5 combinaciones de productos más repetidas para armar nuevos combos.
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-stone-300 shrink-0" />
        </div>

        {basketPairs.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center bg-stone-50 rounded-xl border border-stone-100">
            Se necesitan pedidos con 2 o más platos distintos para detectar combinaciones frecuentes.
          </p>
        ) : (
          <div className="space-y-2">
            {basketPairs.map((pair, idx) => (
              <div
                key={pair.pairKey}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/60 text-xs"
              >
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="font-sans font-bold text-[11px] text-[#A64B2A] shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="text-stone-800 font-medium truncate">
                    {pair.itemAName} <strong className="text-[#A64B2A]">+</strong> {pair.itemBName}
                  </span>
                </div>
                <span className="shrink-0 font-sans font-bold tabular-nums text-stone-900 bg-white border border-stone-200 px-2 py-0.5 rounded-full text-[11px]">
                  {pair.count} {pair.count === 1 ? 'vez' : 'veces'} ({pair.pctOfOrders}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
