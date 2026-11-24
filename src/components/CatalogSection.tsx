import { useState, useMemo } from 'react';
import {
  FileImage,
  Search,
  X,
  Info,
  Check,
  Plus,
  Minus,
  MessageCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { PRODUCTS, CATEGORY_LABELS } from '@/data/catalog';
import type { Product, ProductCategory, ProductVariant } from '@/types/catalog';
import { formatPriceARS } from '@/config/business';
import { MediaImage } from '@/components/MediaImage';
import { buildDirectProductUrl, buildHalfKgInquiryUrl } from '@/utils/whatsapp';
import { ProductInfoModal } from '@/components/ProductInfoModal';
import { PriceListModal } from '@/components/PriceListModal';
import { useOrder } from '@/context/OrderContext';
import { buildOrderItemKey } from '@/types/order';

interface CatalogSectionProps {
  onAddToCart?: (product: Product, variant: ProductVariant, flavor?: string) => void;
}

interface ProductCardProps {
  product: Product;
  onOpenInfo: (product: Product) => void;
  onAddToCart?: (product: Product, variant: ProductVariant, flavor?: string) => void;
}

function ProductCard({ product, onOpenInfo, onAddToCart }: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(
    product.flavorOptions?.[0]
  );
  const [isRecentlyAdded, setIsRecentlyAdded] = useState(false);

  const { addItem, incrementItem, decrementItem, getItemQuantity } = useOrder();

  const itemKey = buildOrderItemKey(product.id, selectedVariant.id, selectedFlavor);
  const currentQuantity = getItemQuantity(itemKey);

  const categoryLabel = CATEGORY_LABELS[product.category] || 'Sin TACC';

  const handleAdd = () => {
    if (selectedVariant.price === null) return;

    addItem({
      itemKey,
      type: 'product',
      id: product.id,
      name: product.name,
      variantLabel: selectedVariant.label,
      flavor: selectedFlavor,
      unitPrice: selectedVariant.price,
      quantity: 1,
      image: product.image,
    });

    setIsRecentlyAdded(true);
    onAddToCart?.(product, selectedVariant, selectedFlavor);

    setTimeout(() => {
      setIsRecentlyAdded(false);
    }, 1500);
  };

  const directProductUrl = buildDirectProductUrl(
    product.name,
    selectedVariant.label,
    selectedFlavor ? `Sabor: ${selectedFlavor}` : undefined
  );

  const halfKgUrl = buildHalfKgInquiryUrl(product.name);

  return (
    <article className="bg-cream-50 border border-cream-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      {/* Parte Superior: Imagen, Badges, Título, Variantes y Sabores */}
      <div>
        {/* Foto a sangre con relación 4/3 */}
        <div className="relative overflow-hidden bg-espresso-900">
          <MediaImage
            src={product.image}
            alt={product.name}
            aspectRatioClass="aspect-4/3"
            fallbackTitle={product.name}
            categoryLabel={categoryLabel}
            className="group-hover:scale-103 transition-transform duration-500 ease-out"
          />

          {/* Badge del producto si existe */}
          {product.badge && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-terracotta-600 text-cream-50 shadow-xs">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                <span>{product.badge}</span>
              </span>
            </div>
          )}

          {/* Etiqueta discreta Sin TACC */}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-cream-50/90 text-sintacc-red border border-sintacc-red/20 shadow-2xs backdrop-blur-xs">
              Sin TACC
            </span>
          </div>

          {/* Overlay si no está disponible */}
          {!product.available && (
            <div className="absolute inset-0 bg-espresso-950/70 backdrop-blur-2xs flex items-center justify-center p-4">
              <span className="px-3 py-1.5 rounded-full bg-cream-50 text-ink-900 text-xs font-semibold shadow-md border border-cream-200 text-center">
                Sin stock hoy — Consultar próxima tanda
              </span>
            </div>
          )}
        </div>

        {/* Contenido textual de la Card */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-olive-600 block mb-1">
              {categoryLabel}
            </span>
            <h3 className="font-serif italic font-bold text-xl sm:text-2xl text-ink-900 leading-tight">
              {product.name}
            </h3>
            <p className="font-sans text-xs sm:text-sm text-ink-600 mt-1.5 leading-relaxed line-clamp-2">
              {product.shortDescription}
            </p>
          </div>

          {/* Selector táctil de variantes (ej. Media docena | Docena) */}
          {product.variants.length > 1 && (
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-ink-600 block uppercase tracking-wider">
                Seleccioná cantidad:
              </label>
              <div
                role="radiogroup"
                aria-label={`Variantes de ${product.name}`}
                className="flex items-center gap-1.5 p-1 rounded-xl bg-cream-100/80 border border-cream-200"
              >
                {product.variants.map((v) => {
                  const isSelected = selectedVariant.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedVariant(v)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 text-center ${
                        isSelected
                          ? 'bg-cream-50 text-ink-900 shadow-2xs border border-cream-200/60'
                          : 'text-ink-600 hover:text-ink-900'
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selector de sabores cuando existen flavorOptions (ej. Empanadas) */}
          {product.flavorOptions && product.flavorOptions.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-ink-600 block uppercase tracking-wider">
                Sabor:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {product.flavorOptions.map((flavor) => {
                  const isSelected = selectedFlavor === flavor;
                  return (
                    <button
                      key={flavor}
                      type="button"
                      onClick={() => setSelectedFlavor(flavor)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-terracotta-600 text-cream-50 border-terracotta-600 font-semibold shadow-2xs'
                          : 'bg-cream-50 text-ink-600 border-cream-200 hover:border-ink-900/30'
                      }`}
                    >
                      {flavor}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parte Inferior: Fila de Precio, Botón (i), Acciones y Micro-línea 500g */}
      <div className="p-5 sm:p-6 pt-0 space-y-3.5 border-t border-cream-200/50 mt-auto">
        {/* Fila de precio + botón circular (i) */}
        <div className="pt-3.5 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-ink-600 block leading-tight">
              {product.variants.length > 1
                ? selectedVariant.label
                : selectedVariant.label}
            </span>
            {selectedVariant.price !== null ? (
              <span className="font-sans font-bold tabular-nums text-xl sm:text-2xl text-ink-900 leading-tight">
                {formatPriceARS(selectedVariant.price)}
              </span>
            ) : (
              <span className="font-serif italic font-semibold text-lg text-ink-900 leading-tight">
                Consultar precio
              </span>
            )}
          </div>

          {/* Botón circular (i) de información detallada */}
          <button
            type="button"
            onClick={() => onOpenInfo(product)}
            aria-label={`Más detalles sobre ${product.name}`}
            title="Ver modo de cocción y conservación"
            className="w-9 h-9 rounded-full bg-cream-100 border border-cream-200 text-ink-600 hover:text-terracotta-600 hover:border-terracotta-600 flex items-center justify-center transition-colors shadow-2xs active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
          >
            <Info className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Acciones principales */}
        <div className="space-y-2">
          {!product.available ? (
            <a
              href={directProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 border border-cream-200 bg-cream-100 hover:bg-cream-200/60 text-ink-900 font-semibold px-4 py-2.5 rounded-full text-xs sm:text-sm transition-all"
            >
              <MessageCircle className="w-4 h-4 text-terracotta-600" aria-hidden="true" />
              <span>Consultar próxima tanda</span>
            </a>
          ) : selectedVariant.price === null ? (
            /* Producto con price: null (Pan Integral, Roulet y Pollo Relleno) */
            <a
              href={directProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold px-4 py-2.5 rounded-full text-xs sm:text-sm transition-all shadow-xs active:scale-95 text-center"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>Consultar por WhatsApp</span>
            </a>
          ) : (
            /* Producto con precio fijo: Selector compacto (- qty +) si ya está en pedido, o Botón Agregar */
            <div className="space-y-1.5">
              {currentQuantity > 0 ? (
                <div
                  className="w-full flex items-center justify-between bg-cream-100 border border-terracotta-600/40 rounded-full p-1 shadow-xs transition-all duration-200"
                  data-testid={`quantity-selector-${product.id}`}
                >
                  <button
                    type="button"
                    onClick={() => decrementItem(itemKey)}
                    aria-label={`Disminuir cantidad de ${product.name}`}
                    className="w-8 h-8 rounded-full bg-cream-50 hover:bg-cream-200/70 text-ink-900 border border-cream-200 flex items-center justify-center transition-all active:scale-90 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <span className="font-serif italic font-bold text-xs sm:text-sm text-ink-900 px-2 select-none">
                    {currentQuantity} en tu pedido
                  </span>

                  <button
                    type="button"
                    onClick={() => incrementItem(itemKey)}
                    aria-label={`Aumentar cantidad de ${product.name}`}
                    className="w-8 h-8 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 flex items-center justify-center transition-all active:scale-90 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-terracotta-600"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  data-testid={`add-to-cart-${product.id}`}
                  className={`w-full inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-full text-xs sm:text-sm transition-all duration-200 active:scale-95 shadow-xs ${
                    isRecentlyAdded
                      ? 'bg-olive-600 text-cream-50'
                      : 'bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 shadow-terracotta-600/20'
                  }`}
                >
                  {isRecentlyAdded ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      <span>¡Agregado al pedido!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>Agregar al pedido</span>
                    </>
                  )}
                </button>
              )}

              <div className="text-center">
                <a
                  href={directProductUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-ink-600 hover:text-terracotta-600 transition-colors py-0.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* Micro-línea pack 500g si soporta fraccionamiento */}
          {product.supportsHalfKgInquiry && (
            <div className="pt-2 text-center border-t border-cream-200/50">
              <a
                href={halfKgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-olive-600 hover:text-terracotta-600 transition-colors inline-flex items-center gap-1"
              >
                <span>¿Preferís pack de 500g? Consultanos →</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function CatalogSection({ onAddToCart }: CatalogSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPriceListOpen, setIsPriceListOpen] = useState<boolean>(false);
  const [selectedProductForInfo, setSelectedProductForInfo] = useState<Product | null>(null);

  // Lista de categorías para las pestañas
  const categoryKeys = useMemo(
    () => Object.keys(CATEGORY_LABELS) as ProductCategory[],
    []
  );

  // Filtrado de productos por categoría y búsqueda
  const filteredProducts = useMemo(() => {
    let list = PRODUCTS;

    if (selectedCategory !== 'todos') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[p.category] &&
            CATEGORY_LABELS[p.category].toLowerCase().includes(q))
      );
    }

    return list;
  }, [selectedCategory, searchQuery]);

  return (
    <section
      id="menu"
      aria-label="Menú completo de platos caseros"
      className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20"
    >
      {/* Cabecera de la Sección con Título y Botón Ver Lista en Imagen */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12 border-b border-cream-200 pb-6 sm:pb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-600 block mb-1">
            Carta Completa Sin TACC
          </span>
          <h2 className="font-serif italic font-bold text-3xl sm:text-4xl lg:text-5xl text-ink-900 tracking-tight">
            Explorá todo el menú
          </h2>
          <p className="font-sans text-sm sm:text-base text-ink-600 mt-2 max-w-xl leading-relaxed">
            Elaboraciones caseras congeladas, sin conservantes y listas para cocinar en minutos en tu hogar.
          </p>
        </div>

        {/* Botón Ver lista en imagen (PriceListModal) */}
        <button
          type="button"
          onClick={() => setIsPriceListOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-cream-50 hover:bg-cream-100 text-ink-900 border border-cream-200 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95 shrink-0"
        >
          <FileImage className="w-4 h-4 text-terracotta-600" aria-hidden="true" />
          <span>Ver lista en imagen</span>
        </button>
      </div>

      {/* Controles de Navegación: Pestañas de Categoría y Buscador */}
      <div className="space-y-4 mb-8 sm:mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Barra de pestañas minimalistas con scroll horizontal suave en móvil */}
          <nav
            aria-label="Pestañas de categorías"
            className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 text-sm"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('todos')}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-xs sm:text-sm transition-all duration-150 ${
                selectedCategory === 'todos'
                  ? 'bg-ink-900 text-cream-50 font-semibold shadow-xs'
                  : 'bg-cream-50 text-ink-600 hover:text-ink-900 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              Todos ({PRODUCTS.length})
            </button>

            {categoryKeys.map((catKey) => {
              const isSelected = selectedCategory === catKey;
              const label = CATEGORY_LABELS[catKey];
              const count = PRODUCTS.filter((p) => p.category === catKey).length;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-xs sm:text-sm transition-all duration-150 ${
                    isSelected
                      ? 'bg-terracotta-600 text-cream-50 font-semibold shadow-xs'
                      : 'bg-cream-50 text-ink-600 hover:text-ink-900 hover:bg-cream-100 border border-cream-200'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </nav>

          {/* Buscador liviano */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-ink-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plato o ingrediente..."
              aria-label="Buscar plato en el catálogo"
              className="w-full bg-cream-50 border border-cream-200 rounded-full pl-9 pr-9 py-2 text-xs sm:text-sm text-ink-900 placeholder:text-ink-600/60 focus:outline-hidden focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600 hover:text-ink-900 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grilla Responsive de Cards */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenInfo={setSelectedProductForInfo}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        /* Estado vacío si la búsqueda no arroja platos */
        <div className="text-center py-16 px-4 bg-cream-50 border border-cream-200 rounded-2xl sm:rounded-3xl max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center text-ink-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif italic font-bold text-xl text-ink-900">
              No encontramos platos con "{searchQuery}"
            </h3>
            <p className="text-xs sm:text-sm text-ink-600 mt-1">
              Probá buscar con otra palabra clave o restablecé los filtros.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('todos');
            }}
            className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-cream-50 font-semibold text-xs sm:text-sm transition-all"
          >
            Ver todo el menú
          </button>
        </div>
      )}

      {/* Modal de Información Nutricional / Cocción (i) */}
      <ProductInfoModal
        product={selectedProductForInfo}
        onClose={() => setSelectedProductForInfo(null)}
      />

      {/* Modal de Lista de Precios en Imagen */}
      <PriceListModal
        isOpen={isPriceListOpen}
        onClose={() => setIsPriceListOpen(false)}
      />
    </section>
  );
}

export default CatalogSection;
