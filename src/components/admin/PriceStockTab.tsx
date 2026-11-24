import React, { useState } from 'react';
import type { Product, Combo, ProductCategory, ProductVariant } from '@/types/catalog';
import type { BusinessConfig } from '@/config/business';
import { BUSINESS_CONFIG } from '@/config/business';
import { supabase } from '@/lib/supabase';
import { exportPriceListFlyer } from '@/utils/priceListExport';
import {
  Search,
  Save,
  Check,
  RefreshCw,
  AlertCircle,
  Percent,
  Download,
  ArrowRight,
  X,
} from 'lucide-react';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  milanesas: 'Milanesas',
  hamburguesas: 'Hamburguesas',
  empanadas: 'Empanadas',
  pizzas: 'Pizzas',
  panaderia: 'Panadería',
  especiales: 'Platos Especiales',
};

interface PriceStockTabProps {
  products: Product[];
  combos: Combo[];
  business?: BusinessConfig;
  onRefresh: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type BulkScope = 'all' | 'products' | 'combos';
type BulkRounding = 'none' | '100' | '500';

function calculateAdjustedPrice(
  basePrice: number,
  percent: number,
  rounding: BulkRounding
): number {
  const raw = basePrice * (1 + percent / 100);
  if (rounding === '100') {
    return Math.max(0, Math.round(raw / 100) * 100);
  }
  if (rounding === '500') {
    return Math.max(0, Math.round(raw / 500) * 500);
  }
  return Math.max(0, Math.round(raw));
}

export const PriceStockTab: React.FC<PriceStockTabProps> = ({
  products,
  combos,
  business,
  onRefresh,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Estado local para edición de precios antes de persistir
  const [productVariantsEdit, setProductVariantsEdit] = useState<Record<string, ProductVariant[]>>({});
  const [comboPricesEdit, setComboPricesEdit] = useState<Record<string, { regular: number; promo: number | null }>>({});

  // Estados de guardado / loading por ítem
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [stockUpdatingIds, setStockUpdatingIds] = useState<Record<string, boolean>>({});

  // Estado para flyer de estados
  const [isDownloadingFlyer, setIsDownloadingFlyer] = useState(false);

  // Estados para modal de ajuste masivo de precios en %
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<number>(10);
  const [bulkScope, setBulkScope] = useState<BulkScope>('all');
  const [bulkRounding, setBulkRounding] = useState<BulkRounding>('100');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  const activeBusiness = business || BUSINESS_CONFIG;

  // Descarga del flyer para estados
  const handleDownloadFlyer = async () => {
    try {
      setIsDownloadingFlyer(true);
      showToast('Generando flyer de alta resolución (1080x1920)...', 'info');
      await exportPriceListFlyer(products, combos, activeBusiness);
      showToast('Flyer descargado exitosamente', 'success');
    } catch (err) {
      showToast(`Error al generar flyer: ${(err as Error).message}`, 'error');
    } finally {
      setIsDownloadingFlyer(false);
    }
  };

  // 1. Toggle directo de Stock Disponible / Sin Stock
  const handleToggleProductStock = async (product: Product) => {
    if (!supabase) return;
    const nextStatus = !product.available;
    const key = `prod-stock-${product.id}`;

    try {
      setStockUpdatingIds((prev) => ({ ...prev, [key]: true }));
      const { error } = await supabase
        .from('products')
        .update({ available: nextStatus })
        .eq('id', product.id);

      if (error) throw error;

      showToast(
        `${product.name}: ${nextStatus ? '🟢 Disponible' : '⏸️ Sin stock'}`,
        nextStatus ? 'success' : 'info'
      );
      await onRefresh();
    } catch (err) {
      showToast(`Error al cambiar stock: ${(err as Error).message}`, 'error');
    } finally {
      setStockUpdatingIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleToggleComboStock = async (combo: Combo) => {
    if (!supabase) return;
    const nextStatus = !combo.available;
    const key = `combo-stock-${combo.id}`;

    try {
      setStockUpdatingIds((prev) => ({ ...prev, [key]: true }));
      const { error } = await supabase
        .from('combos')
        .update({ available: nextStatus })
        .eq('id', combo.id);

      if (error) throw error;

      showToast(
        `${combo.name}: ${nextStatus ? '🟢 Disponible' : '⏸️ Sin stock'}`,
        nextStatus ? 'success' : 'info'
      );
      await onRefresh();
    } catch (err) {
      showToast(`Error al cambiar stock del combo: ${(err as Error).message}`, 'error');
    } finally {
      setStockUpdatingIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  // 2. Modificación individual de precios de Producto
  const getEditingVariants = (product: Product): ProductVariant[] => {
    return productVariantsEdit[product.id] ?? product.variants;
  };

  const handleVariantPriceChange = (
    productId: string,
    currentVariants: ProductVariant[],
    variantIndex: number,
    newPriceValue: string
  ) => {
    const updated = [...currentVariants];
    const val = newPriceValue.trim();
    if (val === '') {
      updated[variantIndex] = { ...updated[variantIndex], price: null };
    } else {
      const num = parseInt(val.replace(/\D/g, ''), 10);
      updated[variantIndex] = { ...updated[variantIndex], price: isNaN(num) ? null : num };
    }
    setProductVariantsEdit((prev) => ({ ...prev, [productId]: updated }));
  };

  const handleToggleConsultPrice = (
    productId: string,
    currentVariants: ProductVariant[],
    variantIndex: number
  ) => {
    const updated = [...currentVariants];
    const currentPrice = updated[variantIndex].price;
    if (currentPrice === null) {
      updated[variantIndex] = { ...updated[variantIndex], price: 0 };
    } else {
      updated[variantIndex] = { ...updated[variantIndex], price: null };
    }
    setProductVariantsEdit((prev) => ({ ...prev, [productId]: updated }));
  };

  const handleSaveProductPrices = async (product: Product) => {
    if (!supabase) return;
    const variantsToSave = productVariantsEdit[product.id];
    if (!variantsToSave) return;

    try {
      setSavingIds((prev) => ({ ...prev, [product.id]: true }));
      const { error } = await supabase
        .from('products')
        .update({ variants: variantsToSave })
        .eq('id', product.id);

      if (error) throw error;

      showToast(`Precios de "${product.name}" actualizados`, 'success');
      setProductVariantsEdit((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      await onRefresh();
    } catch (err) {
      showToast(`Error al guardar precios: ${(err as Error).message}`, 'error');
    } finally {
      setSavingIds((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  // 3. Modificación individual de precios de Combo
  const getEditingComboPrices = (combo: Combo) => {
    return comboPricesEdit[combo.id] ?? { regular: combo.regularPrice, promo: combo.promoPrice };
  };

  const handleComboPriceChange = (
    comboId: string,
    field: 'regular' | 'promo',
    valString: string
  ) => {
    const current = getEditingComboPrices(combos.find((c) => c.id === comboId)!);
    const cleaned = valString.trim();
    if (cleaned === '') {
      if (field === 'promo') {
        setComboPricesEdit((prev) => ({ ...prev, [comboId]: { ...current, promo: null } }));
      }
    } else {
      const num = parseInt(cleaned.replace(/\D/g, ''), 10);
      const val = isNaN(num) ? 0 : num;
      setComboPricesEdit((prev) => ({
        ...prev,
        [comboId]: { ...current, [field]: field === 'promo' ? (val === 0 ? null : val) : val },
      }));
    }
  };

  const handleSaveComboPrices = async (combo: Combo) => {
    if (!supabase) return;
    const pricesToSave = comboPricesEdit[combo.id];
    if (!pricesToSave) return;

    try {
      setSavingIds((prev) => ({ ...prev, [combo.id]: true }));
      const { error } = await supabase
        .from('combos')
        .update({
          regular_price: pricesToSave.regular,
          promo_price: pricesToSave.promo,
        })
        .eq('id', combo.id);

      if (error) throw error;

      showToast(`Precios del combo "${combo.name}" actualizados`, 'success');
      setComboPricesEdit((prev) => {
        const next = { ...prev };
        delete next[combo.id];
        return next;
      });
      await onRefresh();
    } catch (err) {
      showToast(`Error al guardar combo: ${(err as Error).message}`, 'error');
    } finally {
      setSavingIds((prev) => ({ ...prev, [combo.id]: false }));
    }
  };

  // 4. Cálculo de Vista Previa para Ajuste Masivo en %
  const bulkPreviewList = React.useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      oldPrice: number;
      newPrice: number;
    }[] = [];

    if (bulkScope === 'all' || bulkScope === 'products') {
      for (const prod of products) {
        for (const v of prod.variants) {
          // NUNCA alterar variantes con price: null ("Consultar")
          if (v.price !== null) {
            const next = calculateAdjustedPrice(v.price, bulkPercent, bulkRounding);
            list.push({
              id: `${prod.id}-${v.id}`,
              title: prod.name,
              subtitle: v.label,
              oldPrice: v.price,
              newPrice: next,
            });
          }
        }
      }
    }

    if (bulkScope === 'all' || bulkScope === 'combos') {
      for (const combo of combos) {
        const nextReg = calculateAdjustedPrice(combo.regularPrice, bulkPercent, bulkRounding);
        list.push({
          id: `${combo.id}-reg`,
          title: combo.name,
          subtitle: 'Precio Regular',
          oldPrice: combo.regularPrice,
          newPrice: nextReg,
        });

        if (combo.promoPrice !== null) {
          const nextPromo = calculateAdjustedPrice(combo.promoPrice, bulkPercent, bulkRounding);
          list.push({
            id: `${combo.id}-promo`,
            title: combo.name,
            subtitle: 'Precio Promo',
            oldPrice: combo.promoPrice,
            newPrice: nextPromo,
          });
        }
      }
    }

    return list;
  }, [products, combos, bulkPercent, bulkScope, bulkRounding]);

  // 5. Confirmar y Ejecutar Ajuste Masivo en Supabase
  const handleApplyBulkPriceAdjustment = async () => {
    if (!supabase) return;

    try {
      setIsApplyingBulk(true);

      const productUpdates: PromiseLike<unknown>[] = [];
      const comboUpdates: PromiseLike<unknown>[] = [];

      // Actualizar Productos
      if (bulkScope === 'all' || bulkScope === 'products') {
        for (const prod of products) {
          const hasNumericPrice = prod.variants.some((v) => v.price !== null);
          if (!hasNumericPrice) continue;

          const updatedVariants = prod.variants.map((v) => {
            if (v.price === null) return v; // Respeta variantes con "Consultar"
            return {
              ...v,
              price: calculateAdjustedPrice(v.price, bulkPercent, bulkRounding),
            };
          });

          productUpdates.push(
            supabase
              .from('products')
              .update({ variants: updatedVariants })
              .eq('id', prod.id)
          );
        }
      }

      // Actualizar Combos
      if (bulkScope === 'all' || bulkScope === 'combos') {
        for (const combo of combos) {
          const newReg = calculateAdjustedPrice(combo.regularPrice, bulkPercent, bulkRounding);
          const newPromo =
            combo.promoPrice !== null
              ? calculateAdjustedPrice(combo.promoPrice, bulkPercent, bulkRounding)
              : null;

          comboUpdates.push(
            supabase
              .from('combos')
              .update({ regular_price: newReg, promo_price: newPromo })
              .eq('id', combo.id)
          );
        }
      }

      await Promise.all([...productUpdates, ...comboUpdates]);

      showToast(
        `Precios ajustados (${bulkPercent > 0 ? `+${bulkPercent}%` : `${bulkPercent}%`}) en ${bulkPreviewList.length} ítems`,
        'success'
      );

      // Limpiar estados locales de edición manual para refrescar con los nuevos valores
      setProductVariantsEdit({});
      setComboPricesEdit({});

      await onRefresh();
      setIsBulkModalOpen(false);
    } catch (err) {
      showToast(`Error al aplicar ajuste masivo: ${(err as Error).message}`, 'error');
    } finally {
      setIsApplyingBulk(false);
    }
  };

  // Filtrado reactivo de catálogo
  const normalizedSearch = search.toLowerCase().trim();
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !normalizedSearch ||
      p.name.toLowerCase().includes(normalizedSearch) ||
      p.variants.some((v) => v.label.toLowerCase().includes(normalizedSearch));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCombos = selectedCategory === 'all' || selectedCategory === 'combos'
    ? combos.filter(
        (c) =>
          !normalizedSearch ||
          c.name.toLowerCase().includes(normalizedSearch) ||
          c.subtitle.toLowerCase().includes(normalizedSearch)
      )
    : [];

  const pendingChangesCount =
    Object.keys(productVariantsEdit).length + Object.keys(comboPricesEdit).length;

  return (
    <div className="space-y-4 pb-16 w-full max-w-full overflow-x-hidden">
      {/* Botones de Cabecera Operativa: Ajuste Masivo y Descarga de Flyer */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsBulkModalOpen(true)}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-white border border-[#A64B2A] text-[#A64B2A] hover:bg-[#A64B2A]/5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
        >
          <Percent className="w-4 h-4 shrink-0 text-[#A64B2A]" />
          <span className="truncate">Ajustar precios en %</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadFlyer}
          disabled={isDownloadingFlyer}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-[#A64B2A] hover:bg-[#8C3D21] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {isDownloadingFlyer ? 'Generando...' : 'Descargar lista para Estados / IG'}
          </span>
        </button>
      </div>

      {/* Banner Explicativo Modo Express */}
      <div className="bg-[#FAF7F2] border border-[#E5DCCB] rounded-2xl p-4 shadow-sm flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#A64B2A]/10 text-[#A64B2A] shrink-0 mt-0.5">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#1D120D]">Modo Express: Precios y Stock</h2>
          <p className="text-xs text-[#6B574B] mt-0.5">
            Tocá el botón de stock para pausar o activar al instante. Editá cualquier precio directamente desde el teclado de tu celular y guardá los cambios.
          </p>
        </div>
      </div>

      {/* Buscador y Filtros por Categoría */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B574B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre (ej. Suprema, Docena, Combo)..."
            className="w-full bg-white border border-[#E5DCCB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1D120D] placeholder:text-[#6B574B]/60 focus:outline-none focus:ring-2 focus:ring-[#A64B2A]"
          />
        </div>

        {/* Chips de Categorías deslizables horizontalmente */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#A64B2A] text-white shadow-xs'
                : 'bg-white border border-[#E5DCCB] text-[#6B574B] hover:text-[#1D120D]'
            }`}
          >
            Todos ({products.length + combos.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
            const count = products.filter((p) => p.category === catKey).length;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === catKey
                    ? 'bg-[#A64B2A] text-white shadow-xs'
                    : 'bg-white border border-[#E5DCCB] text-[#6B574B] hover:text-[#1D120D]'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedCategory('combos')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'combos'
                ? 'bg-[#A64B2A] text-white shadow-xs'
                : 'bg-white border border-[#E5DCCB] text-[#6B574B] hover:text-[#1D120D]'
            }`}
          >
            Combos ({combos.length})
          </button>
        </div>
      </div>

      {/* Listado de Productos */}
      <div className="space-y-3">
        {filteredProducts.map((product) => {
          const variants = getEditingVariants(product);
          const isModified = Boolean(productVariantsEdit[product.id]);
          const isSaving = Boolean(savingIds[product.id]);
          const isStockUpdating = Boolean(stockUpdatingIds[`prod-stock-${product.id}`]);

          return (
            <div
              key={product.id}
              className={`bg-white border rounded-2xl p-4 transition-all shadow-xs ${
                isModified
                  ? 'border-[#A64B2A] ring-1 ring-[#A64B2A]/30 bg-amber-50/20'
                  : product.available
                  ? 'border-[#E5DCCB]'
                  : 'border-red-200 bg-red-50/20 opacity-80'
              }`}
            >
              {/* Encabezado del Producto */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64B2A] bg-[#A64B2A]/10 px-2 py-0.5 rounded-md">
                    {CATEGORY_LABELS[product.category] || product.category}
                  </span>
                  {product.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                      {product.badge}
                    </span>
                  )}
                  {product.featured && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5A653E]/10 text-[#5A653E] font-semibold">
                      Destacado
                    </span>
                  )}
                </div>

                {/* Botón táctil grande de Stock */}
                <button
                  type="button"
                  onClick={() => handleToggleProductStock(product)}
                  disabled={isStockUpdating}
                  aria-label={`Cambiar stock de ${product.name}`}
                  className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                    product.available
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      product.available ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  />
                  <span>{product.available ? 'Disponible' : 'Sin stock'}</span>
                </button>
              </div>

              {/* Miniatura junto a Nombre Completo */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-13 h-13 rounded-xl object-cover border border-[#E5DCCB] shrink-0 bg-[#FAF7F2]"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#1D120D] line-clamp-2 leading-snug break-words">
                    {product.name}
                  </h4>
                </div>
              </div>

              {/* Fila de Variantes y Precios Editables */}
              <div className="space-y-2 pt-2 border-t border-[#E5DCCB]/60">
                {variants.map((variant, idx) => {
                  const isConsult = variant.price === null;
                  return (
                    <div
                      key={variant.id || idx}
                      className="flex items-center justify-between gap-2 bg-[#FAF7F2] p-2 sm:p-2.5 rounded-xl border border-[#E5DCCB]/70"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[#1D120D] block truncate">
                          {variant.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleConsultPrice(product.id, variants, idx)}
                          className="text-[10px] text-[#A64B2A] hover:underline block mt-0.5"
                        >
                          {isConsult ? 'Cambiar a precio numérico' : 'Marcar como "Consultar"'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isConsult ? (
                          <span className="text-xs italic text-[#6B574B] px-3 py-1.5 bg-white border border-[#E5DCCB] rounded-lg">
                            Consultar
                          </span>
                        ) : (
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-xs font-bold text-[#6B574B]">$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={variant.price === null ? '' : variant.price}
                              onChange={(e) =>
                                handleVariantPriceChange(product.id, variants, idx, e.target.value)
                              }
                              className="w-24 sm:w-28 bg-white border border-[#E5DCCB] rounded-lg pl-6 pr-2 py-1 text-sm font-bold text-[#1D120D] text-right focus:outline-none focus:border-[#A64B2A] focus:ring-1 focus:ring-[#A64B2A]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón Guardar individual si hubo cambios en este producto */}
              {isModified && (
                <div className="mt-3 pt-2 flex items-center justify-between bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="text-xs text-amber-800 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Cambios sin guardar
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveProductPrices(product)}
                    disabled={isSaving}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Listado de Combos */}
        {filteredCombos.length > 0 && (
          <div className="space-y-3 pt-4 border-t-2 border-[#E5DCCB]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5A653E] bg-[#5A653E]/10 px-2 py-0.5 rounded-md">
                Packs y Combos para Freezer
              </span>
            </div>

            {filteredCombos.map((combo) => {
              const prices = getEditingComboPrices(combo);
              const isModified = Boolean(comboPricesEdit[combo.id]);
              const isSaving = Boolean(savingIds[combo.id]);
              const isStockUpdating = Boolean(stockUpdatingIds[`combo-stock-${combo.id}`]);

              return (
                <div
                  key={combo.id}
                  className={`bg-white border rounded-2xl p-4 transition-all shadow-xs ${
                    isModified
                      ? 'border-[#A64B2A] ring-1 ring-[#A64B2A]/30 bg-amber-50/20'
                      : combo.available
                      ? 'border-[#E5DCCB]'
                      : 'border-red-200 bg-red-50/20 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A653E] bg-[#5A653E]/10 px-2 py-0.5 rounded-md">
                        Combo Freezer
                      </span>
                      {combo.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                          {combo.badge}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleComboStock(combo)}
                      disabled={isStockUpdating}
                      aria-label={`Cambiar stock de combo ${combo.name}`}
                      className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                        combo.available
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          combo.available ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      <span>{combo.available ? 'Disponible' : 'Sin stock'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={combo.image}
                      alt={combo.name}
                      className="w-13 h-13 rounded-xl object-cover border border-[#E5DCCB] shrink-0 bg-[#FAF7F2]"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[#1D120D] line-clamp-2 leading-snug break-words">
                        {combo.name}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5DCCB]/60">
                    <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5DCCB]/70">
                      <label className="block text-[10px] font-bold uppercase text-[#6B574B] mb-1">
                        Precio Regular
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-[#6B574B]">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={prices.regular}
                          onChange={(e) => handleComboPriceChange(combo.id, 'regular', e.target.value)}
                          className="w-full bg-white border border-[#E5DCCB] rounded-lg pl-6 pr-2 py-1 text-sm font-bold text-[#1D120D]"
                        />
                      </div>
                    </div>

                    <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5DCCB]/70">
                      <label className="block text-[10px] font-bold uppercase text-[#A64B2A] mb-1">
                        Promo (Opcional)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-[#6B574B]">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Sin promo"
                          value={prices.promo === null ? '' : prices.promo}
                          onChange={(e) => handleComboPriceChange(combo.id, 'promo', e.target.value)}
                          className="w-full bg-white border border-[#E5DCCB] rounded-lg pl-6 pr-2 py-1 text-sm font-bold text-[#1D120D]"
                        />
                      </div>
                    </div>
                  </div>

                  {isModified && (
                    <div className="mt-3 pt-2 flex items-center justify-between bg-amber-50 p-2 rounded-xl border border-amber-200">
                      <span className="text-xs text-amber-800 font-medium">Precios de combo modificados</span>
                      <button
                        type="button"
                        onClick={() => handleSaveComboPrices(combo)}
                        disabled={isSaving}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filteredProducts.length === 0 && filteredCombos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5DCCB] p-6">
            <p className="text-sm font-semibold text-[#1D120D]">No se encontraron productos ni combos.</p>
            <p className="text-xs text-[#6B574B] mt-1">Probá cambiando el filtro o la búsqueda.</p>
          </div>
        )}
      </div>

      {/* Barra fija inferior si hay cambios masivos pendientes */}
      {pendingChangesCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1D120D] text-white py-3 px-4 shadow-xl border-t border-black/20 flex items-center justify-between max-w-lg mx-auto">
          <div className="text-xs">
            <p className="font-bold">Hay {pendingChangesCount} ítems con precios editados</p>
            <p className="text-white/70 text-[11px]">Guardá antes de salir</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              for (const p of products) {
                if (productVariantsEdit[p.id]) {
                  await handleSaveProductPrices(p);
                }
              }
              for (const c of combos) {
                if (comboPricesEdit[c.id]) {
                  await handleSaveComboPrices(c);
                }
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#A64B2A] hover:bg-[#8C3D21] text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Check className="w-4 h-4" />
            Guardar todo
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL MOBILE-FIRST: Ajuste masivo de precios por porcentaje         */}
      {/* =================================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF7F2] w-full max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[92dvh] rounded-2xl border border-[#E5DCCB] shadow-2xl flex flex-col overflow-x-hidden mx-auto my-auto min-w-0 animate-in fade-in zoom-in-95">
            {/* Cabecera del Modal */}
            <div className="p-3.5 sm:p-4 border-b border-[#E5DCCB] flex items-center justify-between bg-white min-w-0 gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-[#1D120D] truncate">
                  Ajustar Precios por Porcentaje
                </h3>
                <p className="text-[11px] sm:text-xs text-[#6B574B] truncate">
                  Aplica cambios en lote con vista previa antes de guardar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 sm:p-2 rounded-xl text-[#6B574B] hover:text-[#1D120D] hover:bg-black/5 shrink-0"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-4 text-xs min-w-0">
              {/* 1. Porcentaje */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3E271E] block">
                  Porcentaje a aplicar:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B574B]">
                      %
                    </span>
                    <input
                      type="number"
                      value={bulkPercent}
                      onChange={(e) => setBulkPercent(Number(e.target.value))}
                      placeholder="10"
                      className="w-full bg-white border border-[#E5DCCB] rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-[#1D120D]"
                    />
                  </div>
                </div>

                {/* Chips rápidos de porcentaje */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[5, 10, 15, 20, -5, -10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBulkPercent(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        bulkPercent === pct
                          ? 'bg-[#A64B2A] text-white shadow-2xs'
                          : 'bg-white border border-[#E5DCCB] text-[#1D120D] hover:bg-stone-50'
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Alcance */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3E271E] block">
                  Alcance del ajuste:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { key: 'all', label: 'Todo' },
                      { key: 'products', label: 'Solo productos' },
                      { key: 'combos', label: 'Solo combos' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBulkScope(item.key)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                        bulkScope === item.key
                          ? 'bg-[#A64B2A] text-white shadow-2xs'
                          : 'bg-white border border-[#E5DCCB] text-[#6B574B] hover:text-[#1D120D]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Redondeo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3E271E] block">
                  Regla de redondeo:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { key: 'none', label: 'Sin redondeo' },
                      { key: '100', label: 'Múltiplo de $100' },
                      { key: '500', label: 'Múltiplo de $500' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBulkRounding(item.key)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                        bulkRounding === item.key
                          ? 'bg-[#5A653E] text-white shadow-2xs'
                          : 'bg-white border border-[#E5DCCB] text-[#6B574B] hover:text-[#1D120D]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Tabla de Vista Previa */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#3E271E]">
                  <span>Vista previa de cambios ({bulkPreviewList.length} ítems):</span>
                  <span className="text-[10px] text-[#6B574B] font-normal">
                    Variantes con "Consultar" no se alteran
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-[#E5DCCB] bg-white rounded-xl border border-[#E5DCCB] shadow-2xs">
                  {bulkPreviewList.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 sm:p-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#1D120D] truncate">{item.title}</p>
                        <p className="text-[10px] text-[#6B574B] truncate">{item.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                        <span className="line-through text-stone-400 text-[11px]">
                          ${item.oldPrice.toLocaleString('es-AR')}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#A64B2A]" />
                        <span className="font-bold text-[#A64B2A] text-xs sm:text-sm">
                          ${item.newPrice.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="p-3.5 sm:p-4 border-t border-[#E5DCCB] bg-white flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                disabled={isApplyingBulk}
                className="px-4 py-2.5 rounded-xl border border-[#E5DCCB] text-[#1D120D] text-xs font-bold hover:bg-stone-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleApplyBulkPriceAdjustment}
                disabled={isApplyingBulk || bulkPreviewList.length === 0}
                className="px-5 py-2.5 rounded-xl bg-[#A64B2A] hover:bg-[#8C3D21] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isApplyingBulk
                    ? 'Actualizando base de datos...'
                    : `Confirmar y Aplicar a ${bulkPreviewList.length} ítems`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
