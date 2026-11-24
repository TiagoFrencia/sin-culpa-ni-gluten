export type OrderIntentStatus = 'pendiente' | 'confirmado' | 'cancelado';
export type OrderIntentSource = 'carrito' | 'consulta_directa';

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
}

export type MetricType = 'visits' | 'cart_adds' | 'pricelist_opens' | 'whatsapp_clicks';

export interface DailyMetric {
  metric_date: string;
  visits: number;
  cart_adds: number;
  pricelist_opens: number;
  whatsapp_clicks: number;
}

export type AnalyticsPeriod = '7d' | 'this_month' | 'last_month' | 'all';
