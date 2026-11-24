import React, { useState } from 'react';
import type { Product, Combo, ProductCategory, ProductVariant } from '@/types/catalog';
import { supabase } from '@/lib/supabase';
import { Search, Save, Check, RefreshCw, AlertCircle } from 'lucide-react';

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
  onRefresh: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const PriceStockTab: React.FC<PriceStockTabProps> = ({
  products,
  combos,
  onRefresh,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Estado local para edición de precios antes de persistir
  // Key: `prod-${id}` o `combo-${id}`
  const [productVariantsEdit, setProductVariantsEdit] = useState<Record<string, ProductVariant[]>>({});
  const [comboPricesEdit, setComboPricesEdit] = useState<Record<string, { regular: number; promo: number | null }>>({});
  
  // Estados de guardado / loading por ítem
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [stockUpdatingIds, setStockUpdatingIds] = useState<Record<string, boolean>>({});

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

  // 2. Modificación de precios de variantes de Producto
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
      // Activar precio numérico por defecto 0 para que puedan tipear
      updated[variantIndex] = { ...updated[variantIndex], price: 0 };
    } else {
      // Marcar como consultar
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
      // Limpiar estado de edición pendiente de este producto
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

  // 3. Modificación de precios de Combo
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

      showToast(`Precios del "${combo.name}" actualizados`, 'success');
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

  // Filtrado
  const query = search.toLowerCase().trim();

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || selectedCategory === p.category;
    const matchQuery = !query || p.name.toLowerCase().includes(query) || p.shortDescription.toLowerCase().includes(query);
    return matchCategory && matchQuery;
  });

  const showCombos = selectedCategory === 'all' || selectedCategory === 'combos';
  const filteredCombos = showCombos
    ? combos.filter((c) => !query || c.name.toLowerCase().includes(query) || c.subtitle.toLowerCase().includes(query))
    : [];

  const pendingChangesCount =
    Object.keys(productVariantsEdit).length + Object.keys(comboPricesEdit).length;

  return (
    <div className="space-y-4 pb-16">
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
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#E5DCCB] shrink-0 bg-[#FAF7F2]"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64B2A]">
                      {CATEGORY_LABELS[product.category] || product.category}
                    </span>
                    <h3 className="text-sm font-bold text-[#1D120D] truncate leading-tight">
                      {product.name}
                    </h3>
                  </div>
                </div>

                {/* Toggle Táctil Grande de Stock */}
                <button
                  type="button"
                  onClick={() => handleToggleProductStock(product)}
                  disabled={isStockUpdating}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
                    product.available
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                  }`}
                  aria-label={product.available ? 'Marcar sin stock' : 'Marcar disponible'}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      product.available ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  />
                  <span>{product.available ? 'Disponible' : 'Sin stock'}</span>
                </button>
              </div>

              {/* Variantes y Precios */}
              <div className="space-y-2 pt-2 border-t border-[#E5DCCB]/60">
                <p className="text-[11px] font-semibold text-[#6B574B] uppercase tracking-wider">
                  Variantes y Precios:
                </p>

                {variants.map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5DCCB]/70"
                  >
                    <div className="text-xs font-medium text-[#1D120D] min-w-[80px]">
                      {v.label}
                    </div>

                    <div className="flex items-center gap-2">
                      {v.price === null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold px-2 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                            Consultar
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleConsultPrice(product.id, variants, idx)}
                            className="text-[11px] text-[#A64B2A] hover:underline font-semibold p-1"
                          >
                            Poner precio
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-xs font-bold text-[#6B574B]">
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={v.price}
                              onChange={(e) =>
                                handleVariantPriceChange(product.id, variants, idx, e.target.value)
                              }
                              className="w-24 bg-white border border-[#E5DCCB] rounded-lg pl-6 pr-2 py-1 text-sm font-bold text-[#1D120D] focus:outline-none focus:ring-1 focus:ring-[#A64B2A]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleConsultPrice(product.id, variants, idx)}
                            className="text-[10px] text-[#6B574B] hover:text-[#A64B2A] p-1 font-medium"
                            title="Cambiar a consultar por WhatsApp"
                          >
                            Consultar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón Guardar Cambios por Fila */}
              {isModified && (
                <div className="mt-3 pt-2 flex items-center justify-between bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="text-xs text-amber-800 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Precios modificados sin guardar
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

        {/* Sección de Combos si corresponde */}
        {filteredCombos.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A64B2A] px-1">
              Combos para Freezer ({filteredCombos.length})
            </h3>

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
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={combo.image}
                        alt={combo.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#E5DCCB] shrink-0 bg-[#FAF7F2]"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A653E]">
                          Combo Especial
                        </span>
                        <h4 className="text-sm font-bold text-[#1D120D] truncate leading-tight">
                          {combo.name}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleComboStock(combo)}
                      disabled={isStockUpdating}
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
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

      {/* Barra fija inferior si hay cambios masivos sin guardar */}
      {pendingChangesCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1D120D] text-white py-3 px-4 shadow-xl border-t border-black/20 flex items-center justify-between max-w-lg mx-auto">
          <div className="text-xs">
            <p className="font-bold">Hay {pendingChangesCount} ítems con precios editados</p>
            <p className="text-white/70 text-[11px]">Guardá antes de salir</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              // Guardar todos los productos pendientes
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
    </div>
  );
};
