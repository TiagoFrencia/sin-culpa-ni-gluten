/* oxlint-disable react/only-export-components */
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, Combo, ProductCategory, UpcomingItem } from '@/types/catalog';
import { PRODUCTS, COMBOS } from '@/data/catalog';
import { BUSINESS_CONFIG, type BusinessConfig } from '@/config/business';
import { supabase } from '@/lib/supabase';
import { updateActiveWhatsAppPhone } from '@/utils/whatsapp';

export { useCatalog } from './useCatalog';

const CACHE_KEY = 'scng_catalog_cache_v2';

interface CatalogCacheData {
  products: Product[];
  combos: Combo[];
  business: BusinessConfig;
  upcomingItems?: UpcomingItem[];
  timestamp: number;
}

export interface CatalogContextType {
  products: Product[];
  combos: Combo[];
  upcomingItems: UpcomingItem[];
  business: BusinessConfig;
  isLoading: boolean;
  isLive: boolean; // true si conectó exitosamente a Supabase
  error: string | null;
  refreshCatalog: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: ProductCategory) => Product[];
  getFeaturedProducts: () => Product[];
}

export const CatalogContext = createContext<CatalogContextType | null>(null);

function loadInitialCatalog(): {
  products: Product[];
  combos: Combo[];
  upcomingItems: UpcomingItem[];
  business: BusinessConfig;
} {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CatalogCacheData;
        if (
          Array.isArray(parsed.products) &&
          parsed.products.length > 0 &&
          Array.isArray(parsed.combos) &&
          parsed.combos.length > 0 &&
          parsed.business
        ) {
          updateActiveWhatsAppPhone(parsed.business.whatsappPhone);
          return {
            products: parsed.products,
            combos: parsed.combos,
            upcomingItems: Array.isArray(parsed.upcomingItems) ? parsed.upcomingItems : [],
            business: parsed.business,
          };
        }
      }
    } catch {
      // Fallback a los datos locales predeterminados
    }
  }

  updateActiveWhatsAppPhone(BUSINESS_CONFIG.whatsappPhone);
  return {
    products: PRODUCTS,
    combos: COMBOS,
    upcomingItems: [],
    business: BUSINESS_CONFIG,
  };
}

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initial] = useState(loadInitialCatalog);
  const [products, setProducts] = useState<Product[]>(initial.products);
  const [combos, setCombos] = useState<Combo[]>(initial.combos);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>(initial.upcomingItems);
  const [business, setBusiness] = useState<BusinessConfig>(initial.business);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFromSupabase = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Consulta aislada para upcoming_items: si la tabla aún no existe en remoto,
      // devuelve [] sin interrumpir la carga de products, combos ni business_settings.
      const upcomingPromise = supabase
        .from('upcoming_items')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .then(
          (res) => res,
          (err) => ({ data: null, error: err })
        );

      const [productsRes, combosRes, businessRes, upcomingRes] = await Promise.all([
        supabase.from('products').select('*').order('sort_order', { ascending: true }),
        supabase.from('combos').select('*').order('sort_order', { ascending: true }),
        supabase.from('business_settings').select('*').eq('id', 1).maybeSingle(),
        upcomingPromise,
      ]);

      if (productsRes.error) throw productsRes.error;
      if (combosRes.error) throw combosRes.error;
      if (businessRes.error) throw businessRes.error;

      let nextProducts = products;
      let nextCombos = combos;
      let nextUpcomingItems: UpcomingItem[] = [];
      let nextBusiness = business;

      if (productsRes.data && productsRes.data.length > 0) {
        nextProducts = productsRes.data.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category as ProductCategory,
          shortDescription: row.short_description,
          image: row.image_url,
          variants: Array.isArray(row.variants) ? row.variants : [],
          supportsHalfKgInquiry: Boolean(row.supports_half_kg_inquiry),
          flavorOptions: Array.isArray(row.flavor_options) ? row.flavor_options : undefined,
          cookingTip: row.cooking_tip,
          freezerDuration: row.freezer_duration,
          featured: Boolean(row.featured),
          available: Boolean(row.available),
          badge: row.badge || undefined,
          sortOrder: row.sort_order ?? 0,
        }));
        setProducts(nextProducts);
      }

      if (combosRes.data && combosRes.data.length > 0) {
        nextCombos = combosRes.data.map((row) => ({
          id: row.id,
          name: row.name,
          subtitle: row.subtitle,
          itemsIncluded: Array.isArray(row.items_included) ? row.items_included : [],
          regularPrice: Number(row.regular_price),
          promoPrice: row.promo_price !== null && row.promo_price !== undefined ? Number(row.promo_price) : null,
          badge: row.badge || undefined,
          image: row.image_url,
          available: Boolean(row.available),
          sortOrder: row.sort_order ?? 0,
        }));
        setCombos(nextCombos);
      }

      if (upcomingRes.error) {
        console.warn('[CatalogContext] upcoming_items no disponible aún:', upcomingRes.error.message || upcomingRes.error);
        nextUpcomingItems = [];
        setUpcomingItems([]);
      } else if (Array.isArray(upcomingRes.data)) {
        nextUpcomingItems = upcomingRes.data.map((row) => ({
          id: String(row.id),
          title: String(row.title ?? ''),
          description: String(row.description ?? ''),
          badge: String(row.badge || 'Próximamente'),
          imageUrl: row.image_url ? String(row.image_url) : null,
          active: Boolean(row.active),
          sortOrder: Number(row.sort_order ?? 0),
          createdAt: String(row.created_at ?? ''),
        }));
        setUpcomingItems(nextUpcomingItems);
      } else {
        setUpcomingItems([]);
      }

      if (businessRes.data) {
        const row = businessRes.data;
        nextBusiness = {
          brandName: row.brand_name || BUSINESS_CONFIG.brandName,
          slogan: row.slogan || BUSINESS_CONFIG.slogan,
          city: row.city || BUSINESS_CONFIG.city,
          country: BUSINESS_CONFIG.country,
          whatsappPhone: row.whatsapp_phone || BUSINESS_CONFIG.whatsappPhone,
          whatsappDisplay: row.whatsapp_display || BUSINESS_CONFIG.whatsappDisplay,
          instagramHandle: row.instagram_handle || BUSINESS_CONFIG.instagramHandle,
          instagramUrl: row.instagram_url || BUSINESS_CONFIG.instagramUrl,
          deliveryHighlight: row.delivery_highlight || BUSINESS_CONFIG.deliveryHighlight,
          trustBadge: BUSINESS_CONFIG.trustBadge,
          priceListImageUrl: row.price_list_image_url || BUSINESS_CONFIG.priceListImageUrl,
          isAcceptingOrders: typeof row.is_accepting_orders === 'boolean' ? row.is_accepting_orders : true,
          pauseMessage: row.pause_message || BUSINESS_CONFIG.pauseMessage,
        };
        setBusiness(nextBusiness);
        updateActiveWhatsAppPhone(nextBusiness.whatsappPhone);
      }

      setIsLive(true);

      // Persistir snapshot en localStorage para arranque instantáneo futuro
      if (typeof window !== 'undefined') {
        try {
          const cachePayload: CatalogCacheData = {
            products: nextProducts,
            combos: nextCombos,
            upcomingItems: nextUpcomingItems,
            business: nextBusiness,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
        } catch {
          // Si localStorage está bloqueado o lleno, no afecta la sesión
        }
      }
    } catch (err) {
      console.warn('[CatalogContext] Supabase fetch fallback to local cache:', err);
      setError((err as Error).message || 'Error de conexión con Supabase');
      // Mantiene el estado previo / local sin crashear
    } finally {
      setIsLoading(false);
    }
  }, [products, combos, business]);

  // Carga automática inicial en segundo plano
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void fetchFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener teléfono actualizado
  useEffect(() => {
    updateActiveWhatsAppPhone(business.whatsappPhone);
  }, [business.whatsappPhone]);

  const getProductById = useCallback(
    (id: string): Product | undefined => {
      return products.find((p) => p.id === id);
    },
    [products]
  );

  const getProductsByCategory = useCallback(
    (category: ProductCategory): Product[] => {
      return products.filter((p) => p.category === category);
    },
    [products]
  );

  const getFeaturedProducts = useCallback((): Product[] => {
    return products.filter((p) => p.featured);
  }, [products]);

  const value = useMemo(
    () => ({
      products,
      combos,
      upcomingItems,
      business,
      isLoading,
      isLive,
      error,
      refreshCatalog: fetchFromSupabase,
      getProductById,
      getProductsByCategory,
      getFeaturedProducts,
    }),
    [products, combos, upcomingItems, business, isLoading, isLive, error, fetchFromSupabase, getProductById, getProductsByCategory, getFeaturedProducts]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};
