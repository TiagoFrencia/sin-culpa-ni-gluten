export type OrderIntentStatus = 'pendiente' | 'confirmado' | 'cancelado';
export type OrderIntentSource = 'carrito' | 'consulta_directa';

export type TrafficChannel = 'instagram' | 'whatsapp' | 'google' | 'directo' | 'otro';
export type PaymentMethod = 'transferencia' | 'efectivo' | 'mercadopago' | 'tarjeta';
export type CustomerType = 'nuevo' | 'recurrente';
export type TimeSlot = 'manana' | 'mediodia' | 'tarde' | 'noche';
export type ProductSignalType =
  | 'cart_add'
  | 'cart_remove'
  | 'consult_500g'
  | 'out_of_stock'
  | 'upcoming_notify';

export interface OrderIntentItem {
  id: string;
  name: string;
  variant: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  type: 'product' | 'combo';
}

export interface OrderIntent {
  id: string;
  created_at: string;
  items: OrderIntentItem[];
  items_count: number;
  total_ars: number;
  status: OrderIntentStatus;
  source: OrderIntentSource;
  note?: string | null;
  channel?: TrafficChannel | null;
  payment_method?: PaymentMethod | null;
  neighborhood?: string | null;
  customer_type?: CustomerType | null;
  time_slot?: TimeSlot | null;
}

export type MetricType = 'visits' | 'cart_adds' | 'pricelist_opens' | 'whatsapp_clicks';

export interface DailyMetric {
  metric_date: string;
  visits: number;
  cart_adds: number;
  pricelist_opens: number;
  whatsapp_clicks: number;
}

export interface ProductCost {
  item_key: string;
  item_type: 'product' | 'combo';
  item_name: string;
  unit_cost_ars: number;
  updated_at?: string;
}

export interface DailyChannelMetric {
  metric_date: string;
  channel: TrafficChannel;
  visits: number;
  whatsapp_clicks: number;
}

export interface DailyProductSignal {
  metric_date: string;
  item_key: string;
  item_name: string;
  signal_type: ProductSignalType;
  count: number;
}

export interface DailyHourlyMetric {
  metric_date: string;
  time_slot: TimeSlot;
  visits: number;
  whatsapp_clicks: number;
}

export type AnalyticsPeriod = '7d' | 'this_month' | 'last_month' | 'all';

export const NEIGHBORHOOD_OPTIONS = [
  'Centro',
  'Banda Norte',
  'Alberdi',
  'Oeste',
  'Las Higueras',
  'Otro',
] as const;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  mercadopago: 'Mercado Pago',
  tarjeta: 'Tarjeta',
};

export const CHANNEL_LABELS: Record<TrafficChannel, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  google: 'Google',
  directo: 'Directo',
  otro: 'Otro',
};

export const CHANNEL_SHORT_BADGES: Record<TrafficChannel, string> = {
  instagram: 'IG',
  whatsapp: 'WSP',
  google: 'Google',
  directo: 'Directo',
  otro: 'Otro',
};

export const TIME_SLOT_LABELS: Record<TimeSlot, { label: string; range: string }> = {
  manana: { label: 'Mañana', range: '06–11 hs' },
  mediodia: { label: 'Mediodía', range: '12–15 hs' },
  tarde: { label: 'Tarde', range: '16–20 hs' },
  noche: { label: 'Noche', range: '21–05 hs' },
};
