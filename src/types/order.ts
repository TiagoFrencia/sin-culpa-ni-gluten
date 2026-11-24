export type OrderItemType = "product" | "combo";

export interface OrderItem {
  itemKey: string;
  type: OrderItemType;
  id: string;
  name: string;
  variantLabel: string;
  flavor?: string;
  unitPrice: number;
  quantity: number;
  image: string;
}

export type DeliveryMethod = "envio" | "retiro";

export interface OrderWhatsAppOptions {
  deliveryMethod: DeliveryMethod;
  addressOrZone?: string;
  note?: string;
}

export function buildOrderItemKey(id: string, variantId?: string, flavor?: string): string {
  const v = variantId ? variantId.trim() : 'default';
  const f = flavor ? flavor.trim() : 'default';
  return `${id}__${v}__${f}`;
}

export interface OrderContextValue {
  items: OrderItem[];
  addItem: (item: Omit<OrderItem, 'quantity' | 'itemKey'> & { quantity?: number; itemKey?: string }) => void;
  incrementItem: (itemKey: string) => void;
  decrementItem: (itemKey: string) => void;
  removeItem: (itemKey: string) => void;
  clearOrder: () => void;
  getItemQuantity: (itemKey: string) => number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  totalItems: number;
  subtotal: number;
  isEmpty: boolean;
}
