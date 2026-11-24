export interface BusinessConfig {
  brandName: string;
  slogan: string;
  city: string;
  country: string;
  whatsappPhone: string;
  whatsappDisplay: string;
  instagramHandle: string;
  instagramUrl: string;
  deliveryHighlight: string;
  trustBadge: string;
  priceListImageUrl: string;
  isAcceptingOrders: boolean;
  pauseMessage: string;
}

export const businessConfig: BusinessConfig = {
  brandName: "Sin Culpa Ni Gluten",
  slogan: "Comer rico y sin gluten ya no es un problema.",
  city: "Río Cuarto, Córdoba",
  country: "Argentina",
  whatsappPhone: (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || "5493585728550",
  whatsappDisplay: "358 572-8550",
  instagramHandle: "@sinculpa.nigluten",
  instagramUrl: "https://www.instagram.com/sinculpa.nigluten/",
  deliveryHighlight: "¡Envío gratis en Río Cuarto!",
  trustBadge: "100% Libre de Contaminación Cruzada",
  priceListImageUrl: "/images/lista-precios.jpg",
  isAcceptingOrders: true,
  pauseMessage: "Estamos con agenda completa por hoy. Volvemos a tomar pedidos muy pronto.",
};

export const BUSINESS_CONFIG = businessConfig;

export const formatPriceARS = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
};
