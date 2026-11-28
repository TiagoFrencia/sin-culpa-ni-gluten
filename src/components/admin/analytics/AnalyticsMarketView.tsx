import React, { useMemo } from 'react';
import {
  Sparkles,
  Scale,
  AlertTriangle,
  Share2,
  Clock,
  CalendarDays,
  PackageSearch,
} from 'lucide-react';
import { formatPriceARS } from '@/config/business';
import type {
  OrderIntent,
  DailyChannelMetric,
  DailyProductSignal,
  DailyHourlyMetric,
} from '@/types/analytics';
import { computeMarketPulse } from '@/utils/analyticsCalculations';

interface AnalyticsMarketViewProps {
  signals: DailyProductSignal[];
  channelMetrics: DailyChannelMetric[];
  hourlyMetrics: DailyHourlyMetric[];
  orders: OrderIntent[];
}

export const AnalyticsMarketView: React.FC<AnalyticsMarketViewProps> = ({
  signals,
  channelMetrics,
  hourlyMetrics,
  orders,
}) => {
  const pulse = useMemo(
    () =>
      computeMarketPulse({
        signals,
        channelMetrics,
        hourlyMetrics,
        orders,
      }),
    [signals, channelMetrics, hourlyMetrics, orders]
  );

  const maxSlotVisits = Math.max(1, ...pulse.timeSlotHeatmap.map((s) => s.visits));
  const maxDayOrders = Math.max(1, ...pulse.weekdayHeatmap.map((d) => d.ordersCount));

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      {/* 1. RANKING DE PRÓXIMAMENTE: "QUÉ QUIEREN QUE LANCEMOS" */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#A64B2A]" />
              Qué quieren que lancemos (Próximamente)
            </h3>
            <p className="text-[11px] text-stone-500">
              Clics en &quot;Avisame cuando salga&quot; para priorizar las próximas recetas sin gluten.
            </p>
          </div>
        </div>

        {pulse.upcomingRanking.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center bg-stone-50 rounded-xl border border-stone-100">
            Aún no hay clics registrados en &quot;Avisame cuando salga&quot; en este período.
          </p>
        ) : (
          <div className="space-y-2">
            {pulse.upcomingRanking.map((item, idx) => {
              const maxCount = Math.max(1, pulse.upcomingRanking[0].count);
              const pct = Math.max(10, Math.round((item.count / maxCount) * 100));
              return (
                <div key={item.itemKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-stone-800 truncate">
                      #{idx + 1} {item.itemName}
                    </span>
                    <span className="font-sans font-bold tabular-nums text-[#A64B2A] shrink-0">
                      {item.count} {item.count === 1 ? 'pedido de aviso' : 'pedidos de aviso'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#A64B2A] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SENSIBILIDAD DE PRECIOS (CARRITO VS ABANDONO) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D] flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-[#A64B2A]" />
            Sensibilidad de Precios (Carrito vs. Abandono)
          </h3>
          <p className="text-[11px] text-stone-500">
            Compara cuántas veces agregan vs. quitan del carrito antes de confirmar por WhatsApp.
          </p>
        </div>

        {pulse.priceSensitivity.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center bg-stone-50 rounded-xl border border-stone-100">
            Sin movimientos de carrito registrados en este período aún.
          </p>
        ) : (
          <div className="space-y-2">
            {pulse.priceSensitivity.slice(0, 8).map((row) => (
              <div
                key={row.itemKey}
                className="p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/70 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-stone-900 truncate">{row.itemName}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                      row.abandonRatePct >= 40
                        ? 'bg-red-100 text-red-800'
                        : row.abandonRatePct >= 20
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {row.abandonRatePct}% retiro
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-600 tabular-nums">
                  <span>
                    Agregados: <strong className="text-stone-900">{row.cartAdds}</strong>
                  </span>
                  <span>
                    Quitados: <strong className="text-red-700">{row.cartRemoves}</strong>
                  </span>
                  <span className="text-right">
                    Pedidos: <strong className="text-emerald-700">{row.closedUnits} u.</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. DEMANDA INSATISFECHA (500G + SIN STOCK) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-2.5">
          <h3 className="font-serif font-bold text-sm text-[#1D120D] flex items-center gap-1.5">
            <PackageSearch className="w-4 h-4 text-amber-700" />
            Consultas 500g / Precio a consultar
          </h3>
          {pulse.consult500gRanking.length === 0 ? (
            <p className="text-[11px] text-stone-400 py-3">Sin clics de consulta registrados aún.</p>
          ) : (
            <div className="space-y-1.5">
              {pulse.consult500gRanking.slice(0, 6).map((r) => (
                <div
                  key={r.itemKey}
                  className="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-0 gap-2"
                >
                  <span className="text-stone-800 truncate">{r.itemName}</span>
                  <span className="font-sans font-bold tabular-nums text-amber-800 shrink-0">
                    {r.count} {r.count === 1 ? 'clic' : 'clics'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-2.5">
          <h3 className="font-serif font-bold text-sm text-[#1D120D] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            Quiebres de Stock (&quot;Avisame cuando vuelva&quot;)
          </h3>
          {pulse.outOfStockRanking.length === 0 ? (
            <p className="text-[11px] text-stone-400 py-3">Sin avisos por falta de stock aún.</p>
          ) : (
            <div className="space-y-1.5">
              {pulse.outOfStockRanking.slice(0, 6).map((r) => (
                <div
                  key={r.itemKey}
                  className="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-0 gap-2"
                >
                  <span className="text-stone-800 truncate">{r.itemName}</span>
                  <span className="font-sans font-bold tabular-nums text-red-800 shrink-0">
                    {r.count} {r.count === 1 ? 'aviso' : 'avisos'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. ATRIBUCIÓN DE CANALES */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D] flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-[#A64B2A]" />
            Atribución de Canales
          </h3>
          <p className="text-[11px] text-stone-500">
            Rendimiento por origen de visita (links con ?utm_source=instagram / whatsapp).
          </p>
        </div>

        <div className="space-y-2">
          {pulse.channelAttribution.map((ch) => (
            <div
              key={ch.channel}
              className="p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/70 flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <span className="font-bold text-stone-900 block">{ch.label}</span>
                <span className="text-[11px] text-stone-500 tabular-nums">
                  {ch.visits} visitas · {ch.ordersCount} pedidos
                </span>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <span className="font-sans font-bold text-stone-900 block">
                  {formatPriceARS(ch.confirmedRevenue)}
                </span>
                <span className="text-[10px] font-semibold text-[#A64B2A]">
                  {ch.conversionPct.toFixed(1)}% conv.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. MAPA DE FRANJAS HORARIAS Y DÍAS CALIENTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-2.5">
          <h3 className="font-serif font-bold text-sm text-[#1D120D] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#A64B2A]" />
            Franjas Horarias (Hora AR)
          </h3>
          <div className="space-y-2">
            {pulse.timeSlotHeatmap.map((slot) => {
              const pct = Math.max(4, Math.round((slot.visits / maxSlotVisits) * 100));
              return (
                <div key={slot.slot} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-stone-800">
                      {slot.label} <span className="text-[10px] text-stone-400">({slot.range})</span>
                    </span>
                    <span className="font-sans text-[11px] tabular-nums text-stone-700 shrink-0">
                      <strong>{slot.visits}</strong> vis. · <strong>{slot.ordersCount}</strong> ped.
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#A64B2A] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-2.5">
          <h3 className="font-serif font-bold text-sm text-[#1D120D] flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-[#A64B2A]" />
            Días Calientes de Pedidos
          </h3>
          <div className="space-y-2">
            {pulse.weekdayHeatmap.map((day) => {
              const pct =
                day.ordersCount > 0 ? Math.max(8, Math.round((day.ordersCount / maxDayOrders) * 100)) : 2;
              return (
                <div key={day.dayIndex} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-stone-800 w-9">{day.dayLabel}</span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          day.ordersCount > 0 ? 'bg-emerald-700' : 'bg-stone-200'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-sans text-[11px] tabular-nums text-stone-700 shrink-0 w-24 text-right">
                      {day.ordersCount} ped.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
