import React, { useState, useMemo } from 'react';
import { Save, Search, Lock, DollarSign } from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import { formatPriceARS } from '@/config/business';
import type { ProductCost } from '@/types/analytics';
import { buildCatalogCostRows } from '@/utils/analyticsCalculations';

interface AnalyticsCostsViewProps {
  costMap: Map<string, number>;
  onSaveCosts: (costs: ProductCost[]) => Promise<void>;
  isSaving: boolean;
}

export const AnalyticsCostsView: React.FC<AnalyticsCostsViewProps> = ({
  costMap,
  onSaveCosts,
  isSaving,
}) => {
  const { products, combos } = useCatalog();
  const [search, setSearch] = useState('');

  // Estado local de inputs editables por itemKey
  const [draftCosts, setDraftCosts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [k, v] of costMap.entries()) {
      init[k] = v > 0 ? String(v) : '';
    }
    return init;
  });

  const rows = useMemo(
    () => buildCatalogCostRows(products, combos, costMap),
    [products, combos, costMap]
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        r.variantLabel.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleCostChange = (itemKey: string, rawVal: string) => {
    const digitsOnly = rawVal.replace(/\D/g, '');
    setDraftCosts((prev) => ({ ...prev, [itemKey]: digitsOnly }));
  };

  const handleSaveAll = async () => {
    const payload: ProductCost[] = rows.map((r) => {
      const draftStr = draftCosts[r.itemKey];
      const numericCost =
        draftStr !== undefined
          ? parseInt(draftStr || '0', 10)
          : r.unitCostARS;

      return {
        item_key: r.itemKey,
        item_type: r.itemType,
        item_name:
          r.itemType === 'product'
            ? `${r.itemName} (${r.variantLabel})`
            : r.itemName,
        unit_cost_ars: isNaN(numericCost) ? 0 : Math.max(0, numericCost),
      };
    });

    await onSaveCosts(payload);
  };

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#A64B2A]" />
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1D120D]">
                Costos Privados y Márgenes
              </h3>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Solo visible para ustedes en /admin. Los clientes nunca ven estos costos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#A64B2A] hover:bg-[#8B3E22] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar costos'}</span>
          </button>
        </div>

        {/* Buscador rápido */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar producto o combo..."
            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-[#A64B2A]"
          />
        </div>
      </div>

      {/* Listado de productos y combos con cálculo instantáneo de ganancia y margen */}
      <div className="space-y-2.5">
        {filteredRows.map((row) => {
          const currentInput =
            draftCosts[row.itemKey] !== undefined
              ? draftCosts[row.itemKey]
              : row.unitCostARS > 0
              ? String(row.unitCostARS)
              : '';
          const parsedCost = parseInt(currentInput || '0', 10) || 0;
          const salePrice = row.salePriceARS;
          const profit = salePrice !== null ? salePrice - parsedCost : null;
          const marginPct =
            salePrice !== null && salePrice > 0 && parsedCost > 0
              ? ((salePrice - parsedCost) / salePrice) * 100
              : null;

          const marginBadgeClass =
            marginPct === null
              ? 'bg-stone-100 text-stone-500'
              : marginPct < 25
              ? 'bg-red-100 text-red-800'
              : marginPct <= 40
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800';

          return (
            <div
              key={row.itemKey}
              className="bg-white rounded-xl p-3 border border-stone-200/80 shadow-2xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs sm:text-sm text-stone-900 leading-snug">
                      {row.itemName}
                    </span>
                    <span className="text-[10px] font-medium text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                      {row.variantLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                    Precio venta:{' '}
                    <strong className="text-stone-800">
                      {salePrice !== null ? formatPriceARS(salePrice) : 'Consultar'}
                    </strong>
                  </p>
                </div>

                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${marginBadgeClass}`}
                >
                  {marginPct !== null ? `${marginPct.toFixed(1)}%` : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-1.5 flex-1 max-w-[170px]">
                  <span className="text-xs font-bold text-stone-500 flex items-center">
                    <DollarSign className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentInput}
                    onChange={(e) => handleCostChange(row.itemKey, e.target.value)}
                    placeholder="Costo unit."
                    aria-label={`Costo unitario de ${row.itemName} ${row.variantLabel}`}
                    className="w-full min-h-[36px] text-xs font-bold tabular-nums bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#A64B2A]"
                  />
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <span className="text-[10px] text-stone-500 block">Ganancia unit.</span>
                  <span
                    className={`font-sans font-bold text-xs sm:text-sm ${
                      profit === null || parsedCost === 0
                        ? 'text-stone-400'
                        : profit >= 0
                        ? 'text-emerald-800'
                        : 'text-red-700'
                    }`}
                  >
                    {profit !== null && parsedCost > 0 ? formatPriceARS(profit) : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón inferior de guardado cómodo en móvil */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#A64B2A] hover:bg-[#8B3E22] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Guardando costos...' : 'Guardar costos'}</span>
        </button>
      </div>
    </div>
  );
};
