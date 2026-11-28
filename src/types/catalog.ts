export type ProductCategory =
  | "milanesas"
  | "hamburguesas"
  | "empanadas"
  | "pizzas"
  | "panaderia"
  | "especiales";

export interface ProductVariant {
  id: string;
  label: string;
  price: number | null; // null = consultar precio por WhatsApp
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  shortDescription: string;
  image: string;
  variants: ProductVariant[];
  supportsHalfKgInquiry?: boolean;
  flavorOptions?: string[];
  cookingTip: string;
  freezerDuration: string;
  featured: boolean;
  available: boolean;
  badge?: string;
  sortOrder?: number;
}

export interface Combo {
  id: string;
  name: string;
  subtitle: string;
  itemsIncluded: string[];
  regularPrice: number;
  promoPrice: number | null;
  badge?: string;
  image: string;
  available: boolean;
  sortOrder?: number;
}

export interface UpcomingItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}
