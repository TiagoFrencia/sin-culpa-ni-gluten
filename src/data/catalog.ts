import type { Product, Combo, ProductCategory } from '@/types/catalog';

export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'milanesas', label: 'Milanesas' },
  { id: 'hamburguesas', label: 'Hamburguesas' },
  { id: 'empanadas', label: 'Empanadas' },
  { id: 'pizzas', label: 'Pizzas' },
  { id: 'panaderia', label: 'Panadería' },
  { id: 'especiales', label: 'Especiales' },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  milanesas: 'Milanesas',
  hamburguesas: 'Hamburguesas',
  empanadas: 'Empanadas',
  pizzas: 'Pizzas',
  panaderia: 'Panadería',
  especiales: 'Especiales',
};

export const products: Product[] = [
  // --- MILANESAS (x 1 kg, supportsHalfKgInquiry: true) ---
  {
    id: 'milanesas-nalga',
    name: 'Milanesas de Ternera (Nalga)',
    category: 'milanesas',
    shortDescription: 'Tiernas milanesas de nalga de ternera rebozadas con mezcla 100% libre de gluten.',
    image: '/images/milanesas-nalga.webp',
    variants: [
      { id: '1kg', label: '1 kg', price: 25000 },
    ],
    supportsHalfKgInquiry: true,
    cookingTip: 'Cocinar directo del freezer en horno bien caliente con un toque de aceite o en sartén.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: true,
    available: true,
    badge: 'Corte Premium',
  },
  {
    id: 'milanesas-cuadrada',
    name: 'Milanesas de Ternera (Cuadrada)',
    category: 'milanesas',
    shortDescription: 'Milanesas caseras de pulpa cuadrada seleccionada con rebozado crocante sin TACC.',
    image: '/images/milanesas-cuadrada.webp',
    variants: [
      { id: '1kg', label: '1 kg', price: 21500 },
    ],
    supportsHalfKgInquiry: true,
    cookingTip: 'Cocinar en horno precalentado a 200°C vuelta y vuelta hasta dorar.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: false,
    available: true,
  },
  {
    id: 'milanesas-pollo',
    name: 'Milanesas de Suprema de Pollo',
    category: 'milanesas',
    shortDescription: 'Filetes de pura pechuga de pollo marinadas y rebozadas sin gluten. Súper tiernas.',
    image: '/images/milanesas-pollo.webp',
    variants: [
      { id: '1kg', label: '1 kg', price: 16000 },
    ],
    supportsHalfKgInquiry: true,
    cookingTip: 'Horno medio-alto 15-20 minutos directo sin descongelar con leve pincelada de aceite.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: true,
    available: true,
    badge: 'Más Pedidas',
  },

  // --- HAMBURGUESAS (x 1 kg, supportsHalfKgInquiry: true) ---
  {
    id: 'hamburguesas-carne-verdura',
    name: 'Hamburguesas 50% Carne / 50% Verdura',
    category: 'hamburguesas',
    shortDescription: 'Equilibrio perfecto entre carne vacuna magra y vegetales frescos seleccionados.',
    image: '/images/hamburguesas-carne-verdura.webp',
    variants: [
      { id: '1kg', label: '1 kg', price: 16000 },
    ],
    supportsHalfKgInquiry: true,
    cookingTip: 'Cocinar a la plancha o sartén bien caliente directo del freezer con fuego medio.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: true,
    available: true,
    badge: 'Favoritas',
  },
  {
    id: 'hamburguesas-carne',
    name: 'Hamburguesas 100% Carne Especial',
    category: 'hamburguesas',
    shortDescription: 'Medallones artesanales de pura carne vacuna condimentada sin conservantes ni TACC.',
    image: '/images/hamburguesas-carne.webp',
    variants: [
      { id: '1kg', label: '1 kg', price: 20500 },
    ],
    supportsHalfKgInquiry: true,
    cookingTip: 'Sellar de ambos lados en plancha caliente unos 4-5 minutos por lado.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: false,
    available: true,
  },
  {
    id: 'hamburguesas-pollo',
    name: 'Hamburguesas Caseras de Pollo',
    category: 'hamburguesas',
    shortDescription: 'Medallones de pechuga de pollo picada fresca, suaves y sabrosas para toda la familia.',
    image: '/images/hamburguesas-pollo.webp',
    variants: [
      { id: '1kg', label: '1 kg', price: 14000 },
    ],
    supportsHalfKgInquiry: true,
    cookingTip: 'Cocinar en horno o sartén con unas gotas de aceite hasta que estén bien cocidas.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: false,
    available: true,
  },

  // --- EMPANADAS SIN TACC (con variantes) ---
  {
    id: 'empanadas-arabes',
    name: 'Empanadas Árabes Sin TACC',
    category: 'empanadas',
    shortDescription: 'Masa artesanal sin TACC rellena de carne picada sazonada con limón y especias tradicionales.',
    image: '/images/empanadas-arabes.webp',
    variants: [
      { id: 'media-docena', label: 'Media docena (6 u.)', price: 12000 },
      { id: 'docena', label: 'Docena (12 u.)', price: 24000 },
    ],
    cookingTip: 'Llevar a horno bien caliente (220°C) directo del freezer durante 12-15 minutos.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: true,
    available: true,
    badge: 'Especialidad',
  },
  {
    id: 'empanadas-clasicas',
    name: 'Empanadas Caseras (Dulces / Saladas)',
    category: 'empanadas',
    shortDescription: 'Empanadas tradicionales de carne con masa suave y hojaldrada 100% libre de gluten.',
    image: '/images/empanadas-clasicas.webp',
    variants: [
      { id: 'media-docena', label: 'Media docena (6 u.)', price: 11500 },
      { id: 'docena', label: 'Docena (12 u.)', price: 22000 },
    ],
    flavorOptions: ['Saladas', 'Dulces', 'Surtidas'],
    cookingTip: 'Pintar con huevo si se desea y hornear a 200°C hasta que la masa quede dorada.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: false,
    available: true,
  },

  // --- PIZZAS CONGELADAS (Grandes - 8 porciones) ---
  {
    id: 'pizza-especial',
    name: 'Pizza Especial Congelada',
    category: 'pizzas',
    shortDescription: 'Masa esponjosa sin TACC, salsa casera de tomate, abundante muzzarella, jamón cocido y morrones.',
    image: '/images/pizza-especial.webp',
    variants: [
      { id: 'grande-8-porciones', label: 'Grande (8 porciones)', price: 13000 },
    ],
    cookingTip: 'Colocar directamente sobre la rejilla o pizzera en horno a 220°C por 10-12 min hasta fundir el queso.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: true,
    available: true,
  },
  {
    id: 'pizza-muzzarella',
    name: 'Pizza de Muzzarella Congelada',
    category: 'pizzas',
    shortDescription: 'Clásica pizza artesanal sin gluten con base crocante, salsa suave y generosa muzzarella.',
    image: '/images/pizza-muzzarella.webp',
    variants: [
      { id: 'grande-8-porciones', label: 'Grande (8 porciones)', price: 11000 },
    ],
    cookingTip: 'Hornear directamente a 220°C hasta que la base esté crocante y la muzzarella gratinada.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: false,
    available: true,
  },
  {
    id: 'prepizza-salsa',
    name: 'Prepizza con Salsa',
    category: 'pizzas',
    shortDescription: 'Base de pizza precocida sin TACC lista para armar con tus ingredientes favoritos.',
    image: '/images/prepizza-salsa.webp',
    variants: [
      { id: 'unidad', label: 'Unidad grande', price: 6000 },
    ],
    cookingTip: 'Agregar queso y toppings a gusto, llevar a horno fuerte 8-10 minutos.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: false,
    available: true,
  },

  // --- PANADERÍA Y PLATOS ESPECIALES (price: null -> Consultar precio) ---
  {
    id: 'pan-integral',
    name: 'Pan Integral Sin TACC con Semillas',
    category: 'panaderia',
    shortDescription: 'Pan de molde artesanal sin gluten enriquecido con semillas de girasol, lino y chía.',
    image: '/images/pan-integral.webp',
    variants: [
      { id: 'molde-entero', label: 'Molde entero', price: null },
    ],
    cookingTip: 'Conservar en rebanadas en el freezer y tostar directo para disfrutarlo como recién horneado.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C) o 4 días a temperatura ambiente.',
    featured: true,
    available: true,
    badge: 'Recién Horneado',
  },
  {
    id: 'pollo-relleno',
    name: 'Roulet y Pollo Relleno',
    category: 'especiales',
    shortDescription: 'Plato gourmet elaborado por encargo con ingredientes seleccionados y relleno sabroso 100% libre de gluten.',
    image: '/images/pollo-relleno.webp',
    variants: [
      { id: 'por-encargo', label: 'Por encargo (consultar)', price: null },
    ],
    cookingTip: 'Descongelar en heladera antes de hornear a fuego moderado según indicaciones personalizadas.',
    freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
    featured: false,
    available: true,
    badge: 'Por Encargo',
  },
];

export const combos: Combo[] = [
  {
    id: 'combo-semana-practica',
    name: 'Combo Semana Práctica',
    subtitle: 'Ideal para resolver almuerzos y cenas rápidas, ricas y saludables.',
    itemsIncluded: [
      '1 kg Milanesas de Suprema de Pollo',
      '1 kg Hamburguesas 50% Carne / 50% Verdura',
      '1 Pizza de Muzzarella Congelada',
    ],
    regularPrice: 43000,
    promoPrice: null,
    badge: 'Ahorro Semanal',
    image: '/images/milanesas-pollo.webp',
    available: true,
  },
  {
    id: 'combo-juntada-sin-culpa',
    name: 'Combo Juntada Sin Culpa',
    subtitle: 'La opción perfecta para compartir con amigos o familia sin preocupaciones.',
    itemsIncluded: [
      '1 Docena Empanadas Árabes Sin TACC',
      '1 Pizza Especial Congelada',
      '1 Pizza de Muzzarella Congelada',
    ],
    regularPrice: 48000,
    promoPrice: null,
    badge: 'Para Compartir',
    image: '/images/empanadas-arabes.webp',
    available: true,
  },
  {
    id: 'combo-familiar-completo',
    name: 'Combo Familiar Completo',
    subtitle: 'Surtido completo de freezer para toda la familia.',
    itemsIncluded: [
      '1 kg Milanesas de Ternera (Cuadrada)',
      '1 kg Hamburguesas 100% Carne Especial',
      '1 Docena Empanadas Caseras (Dulces o Saladas)',
    ],
    regularPrice: 64000,
    promoPrice: null,
    badge: 'Familiar',
    image: '/images/milanesas-cuadrada.webp',
    available: true,
  },
];

export const PRODUCTS = products;
export const COMBOS = combos;

// Helper functions for easy querying
export const getProductById = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};

export const getProductsByCategory = (category: ProductCategory): Product[] => {
  return products.filter((product) => product.category === category);
};

export const getFeaturedProducts = (): Product[] => {
  return products.filter((product) => product.featured);
};
