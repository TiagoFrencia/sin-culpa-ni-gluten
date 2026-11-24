-- Seed de datos iniciales para Sin Culpa Ni Gluten
-- Extraído fielmente de src/config/business.ts y src/data/catalog.ts

-- 1. BUSINESS SETTINGS
INSERT INTO public.business_settings (
  id,
  brand_name,
  slogan,
  city,
  whatsapp_phone,
  whatsapp_display,
  instagram_handle,
  instagram_url,
  delivery_highlight,
  price_list_image_url
) VALUES (
  1,
  'Sin Culpa Ni Gluten',
  'Comer rico y sin gluten ya no es un problema.',
  'Río Cuarto, Córdoba',
  '5493585728550',
  '358 572-8550',
  '@sinculpa.nigluten',
  'https://www.instagram.com/sinculpa.nigluten/',
  '¡Envío gratis en Río Cuarto!',
  '/images/lista-precios.jpg'
)
ON CONFLICT (id) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  slogan = EXCLUDED.slogan,
  city = EXCLUDED.city,
  whatsapp_phone = EXCLUDED.whatsapp_phone,
  whatsapp_display = EXCLUDED.whatsapp_display,
  instagram_handle = EXCLUDED.instagram_handle,
  instagram_url = EXCLUDED.instagram_url,
  delivery_highlight = EXCLUDED.delivery_highlight,
  price_list_image_url = EXCLUDED.price_list_image_url;

-- 2. PRODUCTS (13 productos exactos)
INSERT INTO public.products (
  id,
  name,
  category,
  short_description,
  image_url,
  variants,
  supports_half_kg_inquiry,
  flavor_options,
  cooking_tip,
  freezer_duration,
  featured,
  available,
  badge,
  sort_order
) VALUES
-- 1. Milanesas Nalga
(
  'milanesas-nalga',
  'Milanesas de Ternera (Nalga)',
  'milanesas',
  'Tiernas milanesas de nalga de ternera rebozadas con mezcla 100% libre de gluten.',
  '/images/milanesas-nalga.webp',
  '[{"id": "1kg", "label": "1 kg", "price": 25000}]'::jsonb,
  true,
  NULL,
  'Cocinar directo del freezer en horno bien caliente con un toque de aceite o en sartén.',
  'Hasta 3 meses en freezer (-18°C)',
  true,
  true,
  'Corte Premium',
  1
),
-- 2. Milanesas Cuadrada
(
  'milanesas-cuadrada',
  'Milanesas de Ternera (Cuadrada)',
  'milanesas',
  'Milanesas caseras de pulpa cuadrada seleccionada con rebozado crocante sin gluten.',
  '/images/milanesas-cuadrada.webp',
  '[{"id": "1kg", "label": "1 kg", "price": 21500}]'::jsonb,
  true,
  NULL,
  'Cocinar en horno precalentado a 200°C vuelta y vuelta hasta dorar.',
  'Hasta 3 meses en freezer (-18°C)',
  false,
  true,
  NULL,
  2
),
-- 3. Milanesas Pollo
(
  'milanesas-pollo',
  'Milanesas de Suprema de Pollo',
  'milanesas',
  'Filetes de pura pechuga de pollo marinadas y rebozadas sin gluten. Súper tiernas.',
  '/images/milanesas-pollo.webp',
  '[{"id": "1kg", "label": "1 kg", "price": 16000}]'::jsonb,
  true,
  NULL,
  'Horno medio-alto 15-20 minutos directo sin descongelar con leve pincelada de aceite.',
  'Hasta 3 meses en freezer (-18°C)',
  true,
  true,
  'Más Pedidas',
  3
),
-- 4. Hamburguesas Carne Verdura
(
  'hamburguesas-carne-verdura',
  'Hamburguesas 50% Carne / 50% Verdura',
  'hamburguesas',
  'Equilibrio perfecto entre carne vacuna magra y vegetales frescos seleccionados.',
  '/images/hamburguesas-carne-verdura.webp',
  '[{"id": "1kg", "label": "1 kg", "price": 16000}]'::jsonb,
  true,
  NULL,
  'Cocinar a la plancha o sartén bien caliente directo del freezer con fuego medio.',
  'Hasta 3 meses en freezer (-18°C)',
  true,
  true,
  'Favoritas',
  4
),
-- 5. Hamburguesas Carne
(
  'hamburguesas-carne',
  'Hamburguesas 100% Carne Especial',
  'hamburguesas',
  'Medallones artesanales de pura carne vacuna condimentada sin conservantes ni gluten.',
  '/images/hamburguesas-carne.webp',
  '[{"id": "1kg", "label": "1 kg", "price": 20500}]'::jsonb,
  true,
  NULL,
  'Sellar de ambos lados en plancha caliente unos 4-5 minutos por lado.',
  'Hasta 3 meses en freezer (-18°C)',
  false,
  true,
  NULL,
  5
),
-- 6. Hamburguesas Pollo
(
  'hamburguesas-pollo',
  'Hamburguesas Caseras de Pollo',
  'hamburguesas',
  'Medallones de pechuga de pollo picada fresca, suaves y sabrosas para toda la familia.',
  '/images/hamburguesas-pollo.webp',
  '[{"id": "1kg", "label": "1 kg", "price": 14000}]'::jsonb,
  true,
  NULL,
  'Cocinar en horno o sartén con unas gotas de aceite hasta que estén bien cocidas.',
  'Hasta 3 meses en freezer (-18°C)',
  false,
  true,
  NULL,
  6
),
-- 7. Empanadas Arabes
(
  'empanadas-arabes',
  'Empanadas Árabes Sin Gluten',
  'empanadas',
  'Masa artesanal sin gluten rellena de carne picada sazonada con limón y especias tradicionales.',
  '/images/empanadas-arabes.webp',
  '[{"id": "media-docena", "label": "Media docena (6 u.)", "price": 12000}, {"id": "docena", "label": "Docena (12 u.)", "price": 24000}]'::jsonb,
  false,
  NULL,
  'Llevar a horno bien caliente (220°C) directo del freezer durante 12-15 minutos.',
  'Hasta 3 meses en freezer (-18°C)',
  true,
  true,
  'Especialidad',
  7
),
-- 8. Empanadas Clásicas
(
  'empanadas-clasicas',
  'Empanadas Caseras (Dulces / Saladas)',
  'empanadas',
  'Empanadas tradicionales de carne con masa suave y hojaldrada 100% libre de gluten.',
  '/images/empanadas-clasicas.webp',
  '[{"id": "media-docena", "label": "Media docena (6 u.)", "price": 11500}, {"id": "docena", "label": "Docena (12 u.)", "price": 22000}]'::jsonb,
  false,
  ARRAY['Saladas', 'Dulces', 'Surtidas'],
  'Pintar con huevo si se desea y hornear a 200°C hasta que la masa quede dorada.',
  'Hasta 3 meses en freezer (-18°C)',
  false,
  true,
  NULL,
  8
),
-- 9. Pizza Especial
(
  'pizza-especial',
  'Pizza Especial Congelada',
  'pizzas',
  'Masa esponjosa sin gluten, salsa casera de tomate, abundante muzzarella, jamón cocido y morrones.',
  '/images/pizza-especial.webp',
  '[{"id": "grande-8-porciones", "label": "Grande (8 porciones)", "price": 13000}]'::jsonb,
  false,
  NULL,
  'Colocar directamente sobre la rejilla o pizzera en horno a 220°C por 10-12 min hasta fundir el queso.',
  'Hasta 3 meses en freezer (-18°C)',
  true,
  true,
  NULL,
  9
),
-- 10. Pizza Muzzarella
(
  'pizza-muzzarella',
  'Pizza de Muzzarella Congelada',
  'pizzas',
  'Clásica pizza artesanal sin gluten con base crocante, salsa suave y generosa muzzarella.',
  '/images/pizza-muzzarella.webp',
  '[{"id": "grande-8-porciones", "label": "Grande (8 porciones)", "price": 11000}]'::jsonb,
  false,
  NULL,
  'Hornear directamente a 220°C hasta que la base esté crocante y la muzzarella gratinada.',
  'Hasta 3 meses en freezer (-18°C)',
  false,
  true,
  NULL,
  10
),
-- 11. Prepizza Salsa
(
  'prepizza-salsa',
  'Prepizza con Salsa',
  'pizzas',
  'Base de pizza precocida sin gluten lista para armar con tus ingredientes favoritos.',
  '/images/prepizza-salsa.webp',
  '[{"id": "unidad", "label": "Unidad grande", "price": 6000}]'::jsonb,
  false,
  NULL,
  'Agregar queso y toppings a gusto, llevar a horno fuerte 8-10 minutos.',
  'Hasta 3 meses en freezer (-18°C)',
  false,
  true,
  NULL,
  11
),
-- 12. Pan Integral
(
  'pan-integral',
  'Pan Integral Sin Gluten con Semillas',
  'panaderia',
  'Pan de molde artesanal sin gluten enriquecido con semillas de girasol, lino y chía.',
  '/images/pan-integral.webp',
  '[{"id": "molde-entero", "label": "Molde entero", "price": null}]'::jsonb,
  false,
  NULL,
  'Conservar en rebanadas en el freezer y tostar directo para disfrutarlo como recién horneado.',
  'Hasta 3 meses en freezer (-18°C) o 4 días a temperatura ambiente.',
  true,
  true,
  'Recién Horneado',
  12
),
-- 13. Roulet y Pollo Relleno
(
  'pollo-relleno',
  'Roulet y Pollo Relleno',
  'especiales',
  'Plato gourmet elaborado por encargo con ingredientes seleccionados y relleno sabroso 100% libre de gluten.',
  '/images/pollo-relleno.webp',
  '[{"id": "por-encargo", "label": "Por encargo (consultar)", "price": null}]'::jsonb,
  false,
  NULL,
  'Descongelar en heladera antes de hornear a fuego moderado según indicaciones personalizadas.',
  'Hasta 3 meses en freezer (-18°C)',
  false,
  true,
  'Por Encargo',
  13
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  short_description = EXCLUDED.short_description,
  image_url = EXCLUDED.image_url,
  variants = EXCLUDED.variants,
  supports_half_kg_inquiry = EXCLUDED.supports_half_kg_inquiry,
  flavor_options = EXCLUDED.flavor_options,
  cooking_tip = EXCLUDED.cooking_tip,
  freezer_duration = EXCLUDED.freezer_duration,
  featured = EXCLUDED.featured,
  available = EXCLUDED.available,
  badge = EXCLUDED.badge,
  sort_order = EXCLUDED.sort_order;

-- 3. COMBOS (3 combos exactos)
INSERT INTO public.combos (
  id,
  name,
  subtitle,
  items_included,
  regular_price,
  promo_price,
  badge,
  image_url,
  available,
  sort_order
) VALUES
-- Combo 1
(
  'combo-semana-practica',
  'Combo Semana Práctica',
  'Ideal para resolver almuerzos y cenas rápidas, ricas y saludables.',
  ARRAY['1 kg Milanesas de Suprema de Pollo', '1 kg Hamburguesas 50% Carne / 50% Verdura', '1 Pizza de Muzzarella Congelada'],
  43000,
  NULL,
  'Ahorro Semanal',
  '/images/milanesas-pollo.webp',
  true,
  1
),
-- Combo 2
(
  'combo-juntada-sin-culpa',
  'Combo Juntada Sin Culpa',
  'La opción perfecta para compartir con amigos o familia sin preocupaciones.',
  ARRAY['1 Docena Empanadas Árabes Sin Gluten', '1 Pizza Especial Congelada', '1 Pizza de Muzzarella Congelada'],
  48000,
  NULL,
  'Para Compartir',
  '/images/empanadas-arabes.webp',
  true,
  2
),
-- Combo 3
(
  'combo-familiar-completo',
  'Combo Familiar Completo',
  'Surtido completo de freezer para toda la familia.',
  ARRAY['1 kg Milanesas de Ternera (Cuadrada)', '1 kg Hamburguesas 100% Carne Especial', '1 Docena Empanadas Caseras (Dulces o Saladas)'],
  64000,
  NULL,
  'Familiar',
  '/images/milanesas-cuadrada.webp',
  true,
  3
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  items_included = EXCLUDED.items_included,
  regular_price = EXCLUDED.regular_price,
  promo_price = EXCLUDED.promo_price,
  badge = EXCLUDED.badge,
  image_url = EXCLUDED.image_url,
  available = EXCLUDED.available,
  sort_order = EXCLUDED.sort_order;
