import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  ShoppingBag,
  Eye,
  ShoppingCart,
  MessageCircle,
  FileText,
  Trash2,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import { formatPriceARS } from '@/config/business';
import type {
  OrderIntent,
  OrderIntentStatus,
  DailyMetric,
  AnalyticsPeriod,
} from '@/types/analytics';
import {
  fetchOrderIntents,
  fetchDailyMetrics,
  updateOrderIntentStatus,
  updateOrderIntentNote,
  deleteOrderIntent,
  filterOrdersByPeriod,
  filterMetricsByPeriod,
  exportOrderIntentsToCSV,
  recordOrderIntent,
} from '@/utils/analytics';

interface AnalyticsTabProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type RankingMetric = 'revenue' | 'units';
type RankingFilter = 'confirmed_only' | 'all';

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ showToast }) => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');
  const [orders, setOrders] = useState<OrderIntent[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Estados de filtros secundarios
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('revenue');
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>('confirmed_only');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'all' | OrderIntentStatus>('all');

  // Modal / Edición de Nota Interna
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Confirmación de Borrado de Pedido de Prueba
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Expansión de detalles de ítems en móviles
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Cargar datos
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [fetchedOrders, fetchedMetrics] = await Promise.all([
        fetchOrderIntents(),
        fetchDailyMetrics(),
      ]);
      setOrders(fetchedOrders);
      setDailyMetrics(fetchedMetrics);
    } catch (err) {
      console.warn('[AnalyticsTab] Error al cargar analíticas:', err);
      showToast('No se pudieron actualizar las métricas', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadData();
  }, [loadData]);

  // Filtrar pedidos y métricas diarias por el período seleccionado
  const filteredOrders = useMemo(() => {
    return filterOrdersByPeriod(orders, period);
  }, [orders, period]);

  const filteredMetrics = useMemo(() => {
    return filterMetricsByPeriod(dailyMetrics, period);
  }, [dailyMetrics, period]);

  // ---------------------------------------------------------------------------
  // KPI CONTABLES CALCULADOS
  // ---------------------------------------------------------------------------

  // 1. Ventas Confirmadas (Caja Real)
  const confirmedOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'confirmado');
  }, [filteredOrders]);

  const confirmedSalesARS = useMemo(() => {
    return confirmedOrders.reduce((acc, o) => acc + o.total_ars, 0);
  }, [confirmedOrders]);

  const confirmedOrdersCount = confirmedOrders.length;

  // 2. Pendientes / Por Confirmar (Iniciados pero no cerrados)
  const pendingOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'pendiente');
  }, [filteredOrders]);

  const pendingSalesARS = useMemo(() => {
    return pendingOrders.reduce((acc, o) => acc + o.total_ars, 0);
  }, [pendingOrders]);

  const pendingOrdersCount = pendingOrders.length;

  // 3. Ticket Promedio (Calculado sobre confirmados; fallback a iniciados con aviso)
  const averageTicketData = useMemo(() => {
    if (confirmedOrdersCount > 0) {
      return {
        amount: Math.round(confirmedSalesARS / confirmedOrdersCount),
        isConfirmedOnly: true,
      };
    }
    if (pendingOrdersCount > 0) {
      return {
        amount: Math.round(pendingSalesARS / pendingOrdersCount),
        isConfirmedOnly: false,
      };
    }
    return {
      amount: 0,
      isConfirmedOnly: true,
    };
  }, [confirmedOrdersCount, confirmedSalesARS, pendingOrdersCount, pendingSalesARS]);

  // 4. Embudo de Tienda
  const funnel = useMemo(() => {
    const visits = filteredMetrics.reduce((acc, m) => acc + (m.visits || 0), 0);
    const cartAdds = filteredMetrics.reduce((acc, m) => acc + (m.cart_adds || 0), 0);
    const pricelistOpens = filteredMetrics.reduce((acc, m) => acc + (m.pricelist_opens || 0), 0);
    const whatsappClicks = filteredMetrics.reduce((acc, m) => acc + (m.whatsapp_clicks || 0), 0);
    const totalOrderIntents = filteredOrders.length;

    // Pedidos a WhatsApp: usar el mayor entre clicks registrados y pedidos recibidos
    const effectiveWhatsAppOrders = Math.max(whatsappClicks, totalOrderIntents);

    const cartAddRate = visits > 0 ? ((cartAdds / visits) * 100).toFixed(1) : '0.0';
    const conversionRate = visits > 0 ? ((effectiveWhatsAppOrders / visits) * 100).toFixed(1) : '0.0';

    return {
      visits,
      cartAdds,
      pricelistOpens,
      whatsappOrders: effectiveWhatsAppOrders,
      cartAddRate,
      conversionRate,
    };
  }, [filteredMetrics, filteredOrders]);

  // ---------------------------------------------------------------------------
  // RANKING DE PRODUCTOS Y COMBOS
  // ---------------------------------------------------------------------------

  const ranking = useMemo(() => {
    const ordersToRank = rankingFilter === 'confirmed_only' ? confirmedOrders : filteredOrders;

    const itemMap = new Map<
      string,
      {
        id: string;
        name: string;
        variant: string;
        type: 'product' | 'combo';
        units: number;
        revenue: number;
      }
    >();

    for (const order of ordersToRank) {
      for (const item of order.items) {
        const key = `${item.id}__${item.variant || ''}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.units += item.qty;
          existing.revenue += item.subtotal;
        } else {
          itemMap.set(key, {
            id: item.id,
            name: item.name,
            variant: item.variant || '',
            type: item.type,
            units: item.qty,
            revenue: item.subtotal,
          });
        }
      }
    }

    const items = Array.from(itemMap.values());

    if (rankingMetric === 'revenue') {
      items.sort((a, b) => b.revenue - a.revenue);
    } else {
      items.sort((a, b) => b.units - a.units);
    }

    const maxVal = items.length > 0
      ? rankingMetric === 'revenue'
        ? items[0].revenue
        : items[0].units
      : 1;

    return { items, maxVal };
  }, [rankingFilter, confirmedOrders, filteredOrders, rankingMetric]);

  // ---------------------------------------------------------------------------
  // LISTA DE PEDIDOS RECIENTES CON FILTRO
  // ---------------------------------------------------------------------------

  const displayedOrders = useMemo(() => {
    if (ordersStatusFilter === 'all') return filteredOrders;
    return filteredOrders.filter((o) => o.status === ordersStatusFilter);
  }, [filteredOrders, ordersStatusFilter]);

  // Manejo de cambio de estado de pedido
  const handleStatusChange = async (orderId: string, nextStatus: OrderIntentStatus) => {
    const previousOrders = [...orders];
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    const success = await updateOrderIntentStatus(orderId, nextStatus);
    if (success) {
      showToast(`Pedido marcado como "${nextStatus}"`, 'success');
    } else {
      setOrders(previousOrders);
      showToast('Error al actualizar estado', 'error');
    }
  };

  // Manejo de guardado de nota
  const handleSaveNote = async () => {
    if (!editingNoteOrderId) return;
    setIsSavingNote(true);

    const cleanNote = editingNoteValue.trim() || null;
    const success = await updateOrderIntentNote(editingNoteOrderId, cleanNote);

    if (success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === editingNoteOrderId ? { ...o, note: cleanNote } : o))
      );
      showToast('Nota interna actualizada', 'success');
      setEditingNoteOrderId(null);
    } else {
      showToast('No se pudo guardar la nota', 'error');
    }
    setIsSavingNote(false);
  };

  // Manejo de borrado de pedido
  const handleDeleteOrder = async () => {
    if (!deletingOrderId) return;
    const orderToDelete = deletingOrderId;
    setDeletingOrderId(null);

    const success = await deleteOrderIntent(orderToDelete);
    if (success) {
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
      showToast('Pedido de prueba eliminado', 'info');
    } else {
      showToast('No se pudo eliminar el pedido', 'error');
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('No hay pedidos para exportar en este período', 'info');
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = `pedidos-sin-culpa-${period}-${todayStr}.csv`;
    exportOrderIntentsToCSV(filteredOrders, filename);
    showToast('Archivo CSV generado para Excel', 'success');
  };

  // Crear un pedido de prueba rápido (para socia / demo)
  const handleCreateMockOrder = () => {
    const mockItems = [
      {
        itemKey: 'milanesas-pollo__1kg__default',
        type: 'product' as const,
        id: 'milanesas-pollo',
        name: 'Milanesas de Suprema de Pollo',
        variantLabel: '1 kg',
        unitPrice: 16500,
        quantity: 1,
        image: '/images/products/milanesas-pollo.jpg',
      },
      {
        itemKey: 'combo-semanal__default__default',
        type: 'combo' as const,
        id: 'combo-semanal',
        name: 'Combo Semanal Variado',
        variantLabel: 'Combo',
        unitPrice: 24500,
        quantity: 1,
        image: '/images/combos/combo-semanal.jpg',
      },
    ];

    recordOrderIntent({
      items: mockItems,
      totalArs: 41000,
      itemsCount: 2,
      source: 'carrito',
      note: 'Pedido de prueba interno',
    });

    showToast('Pedido de prueba creado', 'success');
    setTimeout(() => {
      loadData(true);
    }, 400);
  };

  const toggleOrderExpand = (id: string) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden min-w-0">
      {/* ------------------------------------------------------------------- */}
      {/* 1. BARRA SUPERIOR: SELECTOR DE PERÍODO + ACCIONES */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#A64B2A]/10 text-[#A64B2A]">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h2 className="font-serif font-bold text-base sm:text-lg text-[#1D120D] leading-tight">
                Métricas del Negocio
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
              Criterio contable honesto para control de pedidos, caja real y conversión.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#A64B2A]' : ''}`} />
              <span className="hidden min-[380px]:inline">Actualizar</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors active:scale-95 cursor-pointer"
              title="Descargar archivo CSV compatible con Microsoft Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Selector de Período con Segmented Control touch-friendly */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          {(
            [
              { id: '7d', label: '7 días' },
              { id: 'this_month', label: 'Este mes' },
              { id: 'last_month', label: 'Mes anterior' },
              { id: 'all', label: 'Todo' },
            ] as const
          ).map((p) => {
            const isActive = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`flex-1 min-h-[38px] py-1.5 px-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1D120D] text-white shadow-xs'
                    : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. TARJETAS KPI CON CRITERIO CONTABLE */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* KPI 1: Ventas Confirmadas (Caja Real) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Ventas Confirmadas
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">Caja real cobrada o en entrega</p>
            </div>
            <span className="text-xs font-bold text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-full shrink-0">
              {confirmedOrdersCount} {confirmedOrdersCount === 1 ? 'venta' : 'ventas'}
            </span>
          </div>

          <div className="mt-3">
            <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-emerald-800 leading-tight block">
              {formatPriceARS(confirmedSalesARS)}
            </span>
          </div>

          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>Solo pedidos en estado Confirmado</span>
            <span className="font-semibold text-emerald-700">100% verificado</span>
          </div>
        </div>

        {/* KPI 2: Pendientes / Por Confirmar */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Por Confirmar
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">Iniciados en WhatsApp pendientes</p>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full shrink-0">
              {pendingOrdersCount} {pendingOrdersCount === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          <div className="mt-3">
            <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-amber-800 leading-tight block">
              {formatPriceARS(pendingSalesARS)}
            </span>
          </div>

          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>En gestión por WhatsApp</span>
            <span className="font-semibold text-amber-700">Pendiente de pago</span>
          </div>
        </div>

        {/* KPI 3: Ticket Promedio */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#A64B2A] flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                Ticket Promedio
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {averageTicketData.isConfirmedOnly
                  ? 'Calculado sobre pedidos confirmados'
                  : 'Calculado sobre iniciados (sin confirmados aún)'}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-[#1D120D] leading-tight block">
              {formatPriceARS(averageTicketData.amount)}
            </span>
          </div>

          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 border-t border-stone-100 pt-2">
            {!averageTicketData.isConfirmedOnly ? (
              <span className="text-amber-700 font-medium">
                * Estimación provisional basada en intenciones iniciadas.
              </span>
            ) : (
              <span>Gasto promedio por compra efectiva.</span>
            )}
          </div>
        </div>

        {/* KPI 4: Aperturas de Lista de Precios & Consultas */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                Lista de Precios
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">Aperturas del flyer digital interactivo</p>
            </div>
            <span className="text-xs font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-full shrink-0">
              {funnel.pricelistOpens} aperturas
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-sans font-bold text-2xl sm:text-3xl tabular-nums text-[#1D120D] leading-tight">
              {funnel.pricelistOpens}
            </span>
            <span className="text-xs text-stone-500">veces consultada</span>
          </div>

          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 border-t border-stone-100 pt-2 flex items-center justify-between">
            <span>Interés directo en precios</span>
            <span className="text-stone-700 font-medium">{period === '7d' ? 'Últimos 7 días' : 'En el período'}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. EMBUDO DE TIENDA PÚBLICA */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D]">
              Embudo de Conversión de la Tienda
            </h3>
            <p className="text-[11px] text-stone-500">
              Trayecto desde la visita inicial hasta el envío del pedido por WhatsApp.
            </p>
          </div>
          <span className="text-xs font-bold text-[#A64B2A] bg-[#A64B2A]/10 px-2.5 py-1 rounded-full shrink-0">
            {funnel.conversionRate}% conversión
          </span>
        </div>

        {/* Pasos del Embudo en fila o cuadrícula */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {/* Paso 1: Visitas */}
          <div className="bg-stone-50 p-2.5 sm:p-3 rounded-xl border border-stone-200/70">
            <div className="flex items-center justify-center text-stone-500 mb-1">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-stone-600 block uppercase">
              1. Visitas
            </span>
            <span className="font-sans font-bold text-base sm:text-xl tabular-nums text-stone-900 mt-0.5 block">
              {funnel.visits}
            </span>
            <span className="text-[9px] sm:text-[10px] text-stone-400">100%</span>
          </div>

          {/* Paso 2: Agregados al carrito */}
          <div className="bg-amber-50/70 p-2.5 sm:p-3 rounded-xl border border-amber-200/70">
            <div className="flex items-center justify-center text-amber-700 mb-1">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 block uppercase">
              2. Carrito
            </span>
            <span className="font-sans font-bold text-base sm:text-xl tabular-nums text-amber-900 mt-0.5 block">
              {funnel.cartAdds}
            </span>
            <span className="text-[9px] sm:text-[10px] text-amber-700 font-semibold">
              {funnel.cartAddRate}% visitas
            </span>
          </div>

          {/* Paso 3: WhatsApp (Pedidos Iniciados) */}
          <div className="bg-emerald-50/70 p-2.5 sm:p-3 rounded-xl border border-emerald-200/70">
            <div className="flex items-center justify-center text-emerald-700 mb-1">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 block uppercase">
              3. WhatsApp
            </span>
            <span className="font-sans font-bold text-base sm:text-xl tabular-nums text-emerald-900 mt-0.5 block">
              {funnel.whatsappOrders}
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold">
              {funnel.conversionRate}% final
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. RANKING DE PRODUCTOS Y COMBOS (CSS Puro, cero librerías pesadas) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D]">
              Ranking de Platos y Combos
            </h3>
            <p className="text-[11px] text-stone-500">
              Desglose de demanda para planificación de cocina y stock de freezer.
            </p>
          </div>

          {/* Controles del Ranking: Facturación vs Unidades + Filtro Confirmados */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Toggle Métrica */}
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

            {/* Toggle Filtro Confirmados vs Todos */}
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

        {/* Lista con barras horizontales limpias en CSS */}
        {ranking.items.length === 0 ? (
          <div className="py-8 text-center bg-stone-50/60 rounded-xl border border-stone-200/50">
            <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-stone-600">
              No hay ítems registrados en este período{' '}
              {rankingFilter === 'confirmed_only' ? '(con estado confirmado)' : ''}.
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Probá cambiando el período a &quot;Todo&quot; o creá un pedido de prueba.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ranking.items.map((it, idx) => {
              const currentVal = rankingMetric === 'revenue' ? it.revenue : it.units;
              const percent = Math.min(100, Math.max(8, Math.round((currentVal / ranking.maxVal) * 100)));

              return (
                <div
                  key={`${it.id}-${it.variant}`}
                  className="p-2.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-sans font-bold text-[11px] text-stone-500 w-4 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-stone-900 truncate">
                        {it.name}
                      </span>
                      {it.variant && (
                        <span className="text-[10px] text-stone-500 bg-stone-200/70 px-1.5 py-0.2 rounded shrink-0">
                          {it.variant}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-sans font-bold tabular-nums text-stone-900">
                        {rankingMetric === 'revenue' ? formatPriceARS(it.revenue) : `${it.units} u.`}
                      </span>
                      <span className="text-[10px] text-stone-400 ml-1.5 tabular-nums">
                        ({rankingMetric === 'revenue' ? `${it.units} u.` : formatPriceARS(it.revenue)})
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso CSS pura */}
                  <div className="w-full bg-stone-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        idx === 0
                          ? 'bg-[#A64B2A]'
                          : idx === 1
                          ? 'bg-amber-600'
                          : 'bg-stone-500'
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

      {/* ------------------------------------------------------------------- */}
      {/* 5. REGISTRO DE PEDIDOS RECIENTES (CONCILIACIÓN RÁPIDA) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D]">
                Conciliación de Pedidos Web
              </h3>
              <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                {displayedOrders.length} {displayedOrders.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Controlá el estado de cada pedido iniciado desde la tienda pública.
            </p>
          </div>

          {/* Filtros de Estado */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'pendiente', label: 'Pendientes' },
                { id: 'confirmado', label: 'Confirmados' },
                { id: 'cancelado', label: 'Cancelados' },
              ] as const
            ).map((st) => {
              const isActive = ordersStatusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setOrdersStatusFilter(st.id)}
                  className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-stone-900 text-white font-bold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listado de Pedidos */}
        {isLoading ? (
          <div className="py-10 text-center">
            <div className="w-6 h-6 border-2 border-[#A64B2A]/30 border-t-[#A64B2A] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-500">Cargando registro de pedidos...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="py-8 text-center bg-stone-50/60 rounded-xl border border-stone-200/50 space-y-2">
            <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-medium text-stone-600">
              No hay pedidos registrados en este período con el filtro aplicado.
            </p>
            <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
              Cuando un cliente toque &quot;Enviar pedido por WhatsApp&quot; en la tienda, aparecerá aquí al instante para conciliar con el mensaje recibido.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateMockOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 shadow-2xs active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#A64B2A]" />
                <span>Crear pedido de prueba</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedOrders.map((order) => {
              const isExpanded = Boolean(expandedOrders[order.id]);
              const d = new Date(order.created_at);
              const formattedDate = !isNaN(d.getTime())
                ? d.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : order.created_at;

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-stone-200/90 bg-white p-3 sm:p-3.5 shadow-2xs space-y-2.5 transition-all"
                >
                  {/* Cabecera del pedido: Fecha, ID corto y Total */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-900 tabular-nums">
                          {formattedDate}
                        </span>
                        <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                          #{order.id.slice(0, 8)}
                        </span>
                        {order.source === 'consulta_directa' && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-semibold">
                            Consulta directa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {order.items_count} {order.items_count === 1 ? 'ítem' : 'ítems'} en la orden
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-sans font-bold tabular-nums text-base sm:text-lg text-[#1D120D] block leading-tight">
                        {formatPriceARS(order.total_ars)}
                      </span>
                    </div>
                  </div>

                  {/* Resumen de Ítems */}
                  <div className="bg-stone-50/80 rounded-lg p-2 text-xs text-stone-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                      <span>Detalle de productos:</span>
                      <button
                        type="button"
                        onClick={() => toggleOrderExpand(order.id)}
                        className="text-[10px] text-[#A64B2A] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                      >
                        {isExpanded ? (
                          <>
                            Menos <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Ver todos ({order.items.length}) <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Vista contraída o expandida */}
                    {isExpanded ? (
                      <div className="divide-y divide-stone-200/60 pt-1 space-y-1">
                        {order.items.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="pt-1 flex items-center justify-between text-[11px]"
                          >
                            <span className="text-stone-700">
                              <strong className="text-stone-900">{item.qty}x</strong> {item.name}
                              {item.variant && ` (${item.variant})`}
                            </span>
                            <span className="font-sans font-semibold tabular-nums text-stone-900">
                              {formatPriceARS(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-700 truncate leading-snug">
                        {order.items
                          .map((it) => `${it.qty}x ${it.name}${it.variant ? ` (${it.variant})` : ''}`)
                          .join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Nota interna administrativa */}
                  {order.note && (
                    <div className="text-[11px] text-stone-600 bg-amber-50/60 border border-amber-200/60 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                      <span className="font-bold text-amber-900 shrink-0">Nota:</span>
                      <span className="italic">{order.note}</span>
                    </div>
                  )}

                  {/* Acciones de Conciliación: Selector de Estado Táctil + Botones */}
                  <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-2 pt-1 border-t border-stone-100">
                    {/* Selector de Estado táctil (Segmented control) */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, 'pendiente')}
                        className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          order.status === 'pendiente'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-300/40 shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Pendiente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, 'confirmado')}
                        className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          order.status === 'confirmado'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-1 ring-emerald-300/40 shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Confirmado</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, 'cancelado')}
                        className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          order.status === 'cancelado'
                            ? 'bg-red-100 text-red-900 border border-red-300 ring-1 ring-red-300/40 shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <XCircle className="w-3 h-3 text-red-700" />
                        <span>Cancelado</span>
                      </button>
                    </div>

                    {/* Acciones Secundarias: Editar Nota y Eliminar prueba */}
                    <div className="flex items-center gap-1 self-end min-[480px]:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteOrderId(order.id);
                          setEditingNoteValue(order.note || '');
                        }}
                        className="min-h-[34px] px-2 py-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      >
                        {order.note ? 'Editar nota' : '+ Nota'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingOrderId(order.id)}
                        className="min-h-[34px] p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar pedido de prueba"
                        aria-label="Eliminar pedido"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: EDITAR NOTA INTERNA */}
      {/* ------------------------------------------------------------------- */}
      {editingNoteOrderId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-xl border border-stone-200 space-y-3">
            <h4 className="font-serif font-bold text-base text-[#1D120D]">
              Nota Interna del Pedido
            </h4>
            <p className="text-xs text-stone-500">
              Solo visible para el admin y la socia contadora. No guarda datos personales de clientes.
            </p>

            <textarea
              rows={3}
              value={editingNoteValue}
              onChange={(e) => setEditingNoteValue(e.target.value)}
              placeholder="Ej. Pagó por transferencia Galicia / Retira a las 19 hs..."
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#A64B2A] focus:border-transparent"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingNoteOrderId(null)}
                className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="min-h-[38px] px-3.5 py-1.5 bg-[#A64B2A] hover:bg-[#8B3E22] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingNote ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: CONFIRMAR BORRADO DE PEDIDO */}
      {/* ------------------------------------------------------------------- */}
      {deletingOrderId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-xl border border-stone-200 space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>

            <h4 className="font-serif font-bold text-base text-[#1D120D]">
              ¿Eliminar este pedido?
            </h4>
            <p className="text-xs text-stone-500">
              Esta acción es permanente. Útil para limpiar pedidos de prueba antes de entregar informes a contabilidad.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOrderId(null)}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                className="min-h-[38px] px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
