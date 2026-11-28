import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { OrderItem, OrderContextValue } from '@/types/order';
import { buildOrderItemKey } from '@/types/order';
import { trackMetric, trackProductSignal, buildCostItemKey } from '@/utils/analytics';
import { useCatalog } from './useCatalog';

const STORAGE_KEY = 'scng_order_v1';

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

function validateStoredItems(parsed: unknown): OrderItem[] {
  if (!Array.isArray(parsed)) {
    return [];
  }

  const validItems: OrderItem[] = [];

  for (const item of parsed) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.itemKey === 'string' &&
      (item.type === 'product' || item.type === 'combo') &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.variantLabel === 'string' &&
      typeof item.unitPrice === 'number' &&
      !isNaN(item.unitPrice) &&
      item.unitPrice >= 0 &&
      typeof item.quantity === 'number' &&
      !isNaN(item.quantity) &&
      item.quantity > 0 &&
      typeof item.image === 'string'
    ) {
      validItems.push({
        itemKey: item.itemKey,
        type: item.type,
        id: item.id,
        name: item.name,
        variantLabel: item.variantLabel,
        flavor: typeof item.flavor === 'string' ? item.flavor : undefined,
        unitPrice: item.unitPrice,
        quantity: Math.floor(item.quantity),
        image: item.image,
      });
    }
  }

  return validItems;
}

function loadInitialItems(): OrderItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return validateStoredItems(parsed);
  } catch (err) {
    console.warn('[OrderContext] Error al leer localStorage:', err);
    return [];
  }
}

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { products, combos } = useCatalog();
  const [items, setItems] = useState<OrderItem[]>(loadInitialItems);
  const itemsRef = useRef<OrderItem[]>(items);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cartAdjusted, setCartAdjusted] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const clearCartAdjustedNotice = useCallback(() => setCartAdjusted(false), []);

  // Sincronización automática de precios y stock con el catálogo vigente
  useEffect(() => {
    if (products.length === 0 && combos.length === 0) return;

    // oxlint-disable-next-line react/set-state-in-effect
    setItems((prevItems) => {
      if (prevItems.length === 0) return prevItems;

      let changed = false;
      const nextItems: OrderItem[] = [];

      for (const item of prevItems) {
        if (item.type === 'combo') {
          const liveCombo = combos.find((c) => c.id === item.id);
          // Si fue pausado o eliminado del catálogo, remover del carrito
          if (!liveCombo || !liveCombo.available) {
            changed = true;
            continue;
          }

          const currentPrice = liveCombo.promoPrice ?? liveCombo.regularPrice;
          if (
            item.unitPrice !== currentPrice ||
            item.name !== liveCombo.name ||
            item.image !== liveCombo.image
          ) {
            changed = true;
            nextItems.push({
              ...item,
              unitPrice: currentPrice,
              name: liveCombo.name,
              image: liveCombo.image,
            });
          } else {
            nextItems.push(item);
          }
        } else {
          // item.type === 'product'
          const liveProduct = products.find((p) => p.id === item.id);
          // Si fue pausado o eliminado del catálogo, remover del carrito
          if (!liveProduct || !liveProduct.available) {
            changed = true;
            continue;
          }

          // Buscar la variante específica en el producto vigente
          const liveVariant =
            liveProduct.variants.find(
              (v) => v.label.trim().toLowerCase() === item.variantLabel.trim().toLowerCase()
            ) || (liveProduct.variants.length === 1 ? liveProduct.variants[0] : undefined);

          // Si la variante ya no existe o pasó a precio null ("Consultar"), remover del carrito
          if (!liveVariant || liveVariant.price === null) {
            changed = true;
            continue;
          }

          if (
            item.unitPrice !== liveVariant.price ||
            item.name !== liveProduct.name ||
            item.image !== liveProduct.image
          ) {
            changed = true;
            nextItems.push({
              ...item,
              unitPrice: liveVariant.price,
              name: liveProduct.name,
              image: liveProduct.image,
            });
          } else {
            nextItems.push(item);
          }
        }
      }

      if (changed) {
        setCartAdjusted(true);
        return nextItems;
      }

      return prevItems;
    });
  }, [products, combos]);

  // Guardar en localStorage ante cambios en items
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('[OrderContext] Error al escribir en localStorage:', err);
    }
  }, [items]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addItem = useCallback(
    (itemInput: Omit<OrderItem, 'quantity' | 'itemKey'> & { quantity?: number; itemKey?: string }) => {
      // Instrumentación silenciosa de analítica
      trackMetric('cart_adds');
      trackProductSignal(
        buildCostItemKey(itemInput.type, itemInput.id, itemInput.variantLabel),
        itemInput.name,
        'cart_add'
      );

      const generatedKey = itemInput.itemKey || buildOrderItemKey(itemInput.id, itemInput.variantLabel, itemInput.flavor);
      const qtyToAdd = itemInput.quantity && itemInput.quantity > 0 ? itemInput.quantity : 1;

      setItems((prevItems) => {
        const existingIdx = prevItems.findIndex((it) => it.itemKey === generatedKey);
        if (existingIdx >= 0) {
          const next = [...prevItems];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + qtyToAdd,
          };
          return next;
        }

        const newItem: OrderItem = {
          itemKey: generatedKey,
          type: itemInput.type,
          id: itemInput.id,
          name: itemInput.name,
          variantLabel: itemInput.variantLabel,
          flavor: itemInput.flavor,
          unitPrice: itemInput.unitPrice,
          quantity: qtyToAdd,
          image: itemInput.image,
        };
        return [...prevItems, newItem];
      });
    },
    []
  );

  const incrementItem = useCallback((itemKey: string) => {
    setItems((prevItems) =>
      prevItems.map((it) =>
        it.itemKey === itemKey ? { ...it, quantity: it.quantity + 1 } : it
      )
    );
  }, []);

  const decrementItem = useCallback((itemKey: string) => {
    const existingItem = itemsRef.current.find((it) => it.itemKey === itemKey);
    if (existingItem && existingItem.quantity <= 1) {
      trackProductSignal(
        buildCostItemKey(existingItem.type, existingItem.id, existingItem.variantLabel),
        existingItem.name,
        'cart_remove'
      );
    }

    setItems((prevItems) => {
      const existing = prevItems.find((it) => it.itemKey === itemKey);
      if (!existing) return prevItems;

      if (existing.quantity <= 1) {
        return prevItems.filter((it) => it.itemKey !== itemKey);
      }

      return prevItems.map((it) =>
        it.itemKey === itemKey ? { ...it, quantity: it.quantity - 1 } : it
      );
    });
  }, []);

  const removeItem = useCallback((itemKey: string) => {
    const existingItem = itemsRef.current.find((it) => it.itemKey === itemKey);
    if (existingItem) {
      trackProductSignal(
        buildCostItemKey(existingItem.type, existingItem.id, existingItem.variantLabel),
        existingItem.name,
        'cart_remove'
      );
    }

    setItems((prevItems) => prevItems.filter((it) => it.itemKey !== itemKey));
  }, []);

  const clearOrder = useCallback(() => {
    setItems([]);
  }, []);

  const getItemQuantity = useCallback(
    (itemKey: string) => {
      const found = items.find((it) => it.itemKey === itemKey);
      return found ? found.quantity : 0;
    },
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [items]
  );

  const isEmpty = useMemo(() => items.length === 0, [items]);

  const value = useMemo<OrderContextValue>(
    () => ({
      items,
      addItem,
      incrementItem,
      decrementItem,
      removeItem,
      clearOrder,
      getItemQuantity,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      totalItems,
      subtotal,
      isEmpty,
      cartAdjusted,
      clearCartAdjustedNotice,
    }),
    [
      items,
      addItem,
      incrementItem,
      decrementItem,
      removeItem,
      clearOrder,
      getItemQuantity,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      totalItems,
      subtotal,
      isEmpty,
      cartAdjusted,
      clearCartAdjustedNotice,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrder(): OrderContextValue {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder debe usarse dentro de un <OrderProvider>');
  }
  return context;
}
