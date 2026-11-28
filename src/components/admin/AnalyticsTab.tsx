import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Download,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  BarChart3,
  ClipboardList,
  Radar,
  Calculator,
} from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import type {
  OrderIntent,
  OrderIntentStatus,
  DailyMetric,
  AnalyticsPeriod,
  ProductCost,
  DailyChannelMetric,
  DailyProductSignal,
  DailyHourlyMetric,
  PaymentMethod,
  CustomerType,
} from '@/types/analytics';
import {
  fetchOrderIntents,
  fetchDailyMetrics,
  fetchProductCosts,
  upsertProductCosts,
  fetchDailyChannelMetrics,
  fetchDailyProductSignals,
  fetchDailyHourlyMetrics,
  updateOrderIntentStatus,
  updateOrderIntentNote,
  updateOrderIntentDetails,
  deleteOrderIntent,
  filterOrdersByPeriod,
  filterOrdersByBounds,
  filterMetricsByPeriod,
  filterDateRecordsByBounds,
  getPeriodBounds,
  getPreviousPeriodBounds,
  exportOrderIntentsToCSV,
  recordOrderIntent,
  toArgentinaYmd,
} from '@/utils/analytics';
import { buildCostMap } from '@/utils/analyticsCalculations';
import { AnalyticsSummaryView } from '@/components/admin/analytics/AnalyticsSummaryView';
import { AnalyticsOrdersView } from '@/components/admin/analytics/AnalyticsOrdersView';
import { AnalyticsMarketView } from '@/components/admin/analytics/AnalyticsMarketView';
import { AnalyticsCostsView } from '@/components/admin/analytics/AnalyticsCostsView';

interface AnalyticsTabProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type AnalyticsSubView = 'summary' | 'orders' | 'market' | 'costs';

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ showToast }) => {
  const { products } = useCatalog();
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');
  const [subView, setSubView] = useState<AnalyticsSubView>('summary');

  const [orders, setOrders] = useState<OrderIntent[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [productCosts, setProductCosts] = useState<ProductCost[]>([]);
  const [channelMetrics, setChannelMetrics] = useState<DailyChannelMetric[]>([]);
  const [productSignals, setProductSignals] = useState<DailyProductSignal[]>([]);
  const [hourlyMetrics, setHourlyMetrics] = useState<DailyHourlyMetric[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isSavingCosts, setIsSavingCosts] = useState<boolean>(false);

  // Modal / Edición de Nota Interna
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Confirmación de Borrado
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const [
          fetchedOrders,
          fetchedMetrics,
          fetchedCosts,
          fetchedChannels,
          fetchedSignals,
          fetchedHourly,
        ] = await Promise.all([
          fetchOrderIntents(),
          fetchDailyMetrics(),
          fetchProductCosts(),
          fetchDailyChannelMetrics(),
          fetchDailyProductSignals(),
          fetchDailyHourlyMetrics(),
        ]);
        setOrders(fetchedOrders);
        setDailyMetrics(fetchedMetrics);
        setProductCosts(fetchedCosts);
        setChannelMetrics(fetchedChannels);
        setProductSignals(fetchedSignals);
        setHourlyMetrics(fetchedHourly);
      } catch (err) {
        console.warn('[AnalyticsTab] Error al cargar analíticas:', err);
        showToast('No se pudieron actualizar las métricas', 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadData();
  }, [loadData]);

  // Filtros de período actual y anterior
  const prevBounds = useMemo(() => getPreviousPeriodBounds(period), [period]);
  const currBounds = useMemo(() => getPeriodBounds(period), [period]);

  const filteredOrders = useMemo(() => filterOrdersByPeriod(orders, period), [orders, period]);
  const prevFilteredOrders = useMemo(
    () => (prevBounds ? filterOrdersByBounds(orders, prevBounds) : []),
    [orders, prevBounds]
  );

  const filteredMetrics = useMemo(
    () => filterMetricsByPeriod(dailyMetrics, period),
    [dailyMetrics, period]
  );
  const prevFilteredMetrics = useMemo(
    () => (prevBounds ? filterDateRecordsByBounds(dailyMetrics, prevBounds) : []),
    [dailyMetrics, prevBounds]
  );

  const filteredChannelMetrics = useMemo(
    () => filterDateRecordsByBounds(channelMetrics, currBounds),
    [channelMetrics, currBounds]
  );
  const filteredSignals = useMemo(
    () => filterDateRecordsByBounds(productSignals, currBounds),
    [productSignals, currBounds]
  );
  const filteredHourlyMetrics = useMemo(
    () => filterDateRecordsByBounds(hourlyMetrics, currBounds),
    [hourlyMetrics, currBounds]
  );

  const costMap = useMemo(() => buildCostMap(productCosts), [productCosts]);

  // Handlers de Pedidos
  const handleStatusChange = async (orderId: string, nextStatus: OrderIntentStatus) => {
    const previousOrders = [...orders];
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));

    const success = await updateOrderIntentStatus(orderId, nextStatus);
    if (success) {
      showToast(`Pedido marcado como "${nextStatus}"`, 'success');
    } else {
      setOrders(previousOrders);
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleUpdateOrderDetails = async (
    orderId: string,
    details: {
      payment_method?: PaymentMethod | null;
      neighborhood?: string | null;
      customer_type?: CustomerType | null;
    }
  ) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...details } : o)));
    const res = await updateOrderIntentDetails(orderId, details);
    if (res.localOnly) {
      showToast('Detalle guardado localmente (verificá migración V6)', 'info');
    } else {
      showToast('Pedido actualizado', 'success');
    }
  };

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

  const handleCreateMockOrder = () => {
    const mockItems = [
      {
        itemKey: 'milanesas-pollo__1kg__default',
        type: 'product' as const,
        id: 'milanesas-pollo',
        name: 'Milanesas de Suprema de Pollo',
        variantLabel: '1 kg',
        unitPrice: 16000,
        quantity: 1,
        image: '/images/milanesas-pollo.webp',
      },
      {
        itemKey: 'combo-semana-practica__combo__default',
        type: 'combo' as const,
        id: 'combo-semana-practica',
        name: 'Combo Semana Práctica',
        variantLabel: 'Combo',
        unitPrice: 24500,
        quantity: 1,
        image: '/images/combos/combo-semanal.jpg',
      },
    ];

    recordOrderIntent({
      items: mockItems,
      totalArs: 40500,
      itemsCount: 2,
      source: 'carrito',
      note: 'Pedido de prueba interno',
    });

    showToast('Pedido de prueba creado', 'success');
    setTimeout(() => {
      loadData(true);
    }, 350);
  };

  // Guardar costos privados
  const handleSaveCosts = async (nextCosts: ProductCost[]) => {
    setIsSavingCosts(true);
    try {
      const res = await upsertProductCosts(nextCosts);
      setProductCosts(nextCosts);
      if (res.localOnly) {
        showToast('Costos guardados en este dispositivo (falta migración V6 en Supabase)', 'info');
      } else {
        showToast('Costos y márgenes guardados', 'success');
      }
    } catch {
      showToast('No se pudieron guardar los costos', 'error');
    } finally {
      setIsSavingCosts(false);
    }
  };

  // Exportar Excel (.xlsx) 6 hojas con lazy import
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const { exportAnalyticsToExcel } = await import('@/utils/excelExport');
      const filename = await exportAnalyticsToExcel({
        period,
        orders: filteredOrders,
        prevOrders: prevFilteredOrders,
        dailyMetrics: filteredMetrics,
        prevDailyMetrics: prevFilteredMetrics,
        channelMetrics: filteredChannelMetrics,
        productSignals: filteredSignals,
        hourlyMetrics: filteredHourlyMetrics,
        costMap,
        products,
      });
      showToast(`Excel generado: ${filename}`, 'success');
    } catch (err) {
      console.error('[AnalyticsTab] Error exportando Excel:', err);
      showToast('No se pudo generar el archivo Excel', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Exportar CSV respaldo rápido
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('No hay pedidos para exportar en este período', 'info');
      return;
    }
    const todayStr = toArgentinaYmd();
    const filename = `pedidos-sin-culpa-${period}-${todayStr}.csv`;
    exportOrderIntentsToCSV(filteredOrders, filename);
    showToast('Archivo CSV generado', 'success');
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-full overflow-x-hidden min-w-0">
      {/* 1. BARRA SUPERIOR FIJA DEL MÓDULO */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#A64B2A]/10 text-[#A64B2A] shrink-0">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h2 className="font-serif font-bold text-base sm:text-lg text-[#1D120D] leading-tight truncate">
                Métricas del Negocio
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
              Inteligencia de mercado, márgenes privados y libro contable multi-hoja.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#A64B2A]' : ''}`} />
              <span className="hidden min-[420px]:inline">Actualizar</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
              title="Descargar libro Excel multi-hoja (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>{isExportingExcel ? 'Generando...' : 'Exportar Excel (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95 cursor-pointer"
              title="Descargar respaldo rápido en CSV"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Selector de Período */}
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
                className={`flex-1 min-h-[36px] py-1.5 px-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
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

        {/* Selector Interno de 4 Sub-vistas Compactas */}
        <div
          role="tablist"
          aria-label="Sub-vistas de métricas"
          className="pt-2 border-t border-stone-100 flex items-center gap-1 overflow-x-auto scrollbar-none"
        >
          {(
            [
              { id: 'summary', label: 'Resumen', icon: BarChart3 },
              { id: 'orders', label: `Pedidos (${filteredOrders.length})`, icon: ClipboardList },
              { id: 'market', label: 'Mercado', icon: Radar },
              { id: 'costs', label: 'Costos', icon: Calculator },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = subView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSubView(tab.id)}
                className={`flex-1 min-w-fit min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#A64B2A] text-white shadow-xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CONTENIDO DE LA SUB-VISTA ACTIVA */}
      {subView === 'summary' && (
        <AnalyticsSummaryView
          orders={filteredOrders}
          prevOrders={prevFilteredOrders}
          dailyMetrics={filteredMetrics}
          prevDailyMetrics={prevFilteredMetrics}
          costMap={costMap}
          period={period}
          onGoToCosts={() => setSubView('costs')}
        />
      )}

      {subView === 'orders' && (
        <AnalyticsOrdersView
          orders={filteredOrders}
          isLoading={isLoading}
          onStatusChange={handleStatusChange}
          onUpdateDetails={handleUpdateOrderDetails}
          onOpenNoteModal={(order) => {
            setEditingNoteOrderId(order.id);
            setEditingNoteValue(order.note || '');
          }}
          onRequestDeleteOrder={(id) => setDeletingOrderId(id)}
          onCreateMockOrder={handleCreateMockOrder}
        />
      )}

      {subView === 'market' && (
        <AnalyticsMarketView
          signals={filteredSignals}
          channelMetrics={filteredChannelMetrics}
          hourlyMetrics={filteredHourlyMetrics}
          orders={filteredOrders}
        />
      )}

      {subView === 'costs' && (
        <AnalyticsCostsView
          costMap={costMap}
          onSaveCosts={handleSaveCosts}
          isSaving={isSavingCosts}
        />
      )}

      {/* MODAL: EDITAR NOTA INTERNA */}
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

      {/* MODAL: CONFIRMAR BORRADO DE PEDIDO */}
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
