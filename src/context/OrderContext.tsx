import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { OrderItem, OrderContextValue } from '@/types/order';
import { buildOrderItemKey } from '@/types/order';

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
  const [items, setItems] = useState<OrderItem[]>(loadInitialItems);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
