# Especificación de Proyecto: Sin Culpa Ni Gluten

## 1. Resumen Ejecutivo
- **Negocio:** Sin Culpa Ni Gluten (@sinculpa.nigluten)
- **Rubro:** Comidas caseras congeladas 100% Sin Gluten / Libres de Gluten
- **Ubicación:** Río Cuarto, Córdoba, Argentina
- **Teléfono de contacto / WhatsApp:** `+54 9 358 572-8550` (Display: `358 572-8550`)
- **Propuesta de Valor:** "Comer rico y sin gluten ya no es un problema." Platos caseros, seguros, sin contaminación cruzada, congelados al vacío o envasados para conservar frescura y sabor artesanal.

---

## 2. Stack Tecnológico
- **Runtime / Bundler:** Vite 6+
- **Librería UI:** React 19 + TypeScript
- **Estilos:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Iconografía:** `lucide-react`
- **Configuración de rutas / alias:** `@/` apuntando a `./src/`

---

## 3. Arquitectura de Carpetas
```
Sin Culpa Ni Gluten/
├── .agents/
│   └── skills/                 # Skills especializadas del proyecto
├── public/
│   └── images/                 # Assets de productos y combos (.webp)
├── src/
│   ├── config/                 # Configuración de negocio y formato (business.ts)
│   ├── types/                  # Tipado de dominio y catálogo (catalog.ts)
│   ├── data/                   # Fuente de verdad de productos y combos (catalog.ts)
│   ├── context/                # Estado global (ej. CartContext con localStorage)
│   ├── utils/                  # Helpers (whatsapp, cálculo de totales, etc.)
│   ├── components/             # Componentes modulares (UI, catálogo, layout)
│   ├── App.tsx                 # Entrada de la aplicación
│   ├── main.tsx                # Bootstrap de React
│   └── index.css               # Import de Tailwind v4 y estilos base
├── .env.example                # Variables de entorno de ejemplo
├── .env                        # Variables locales activas
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
└── PROJECT_SPEC.md             # Esta especificación
```

---

## 4. Decisiones de Arquitectura y Negocio

### A. Catálogo Desacoplado
- El catálogo de productos y combos se mantiene como una fuente de verdad fuertemente tipada en `src/data/catalog.ts` que implementa las interfaces de `src/types/catalog.ts`.
- **Preparado para migración:** La estructura de datos está desacoplada de la UI, permitiendo una transición inmediata a una API remota, Google Sheets (vía fetch/CSV) o un CMS liviano sin tocar la lógica de renderizado.
- **Precios e Inquiries:**
  * Soporta variantes fijas (ej. $12.000 media docena / $24.000 docena).
  * Soporta variantes con `price: null` que activan el flujo de "Consultar precio por WhatsApp" (ej. Pan Integral en molde o Pollo Relleno por encargo).
  * Soporta la bandera `supportsHalfKgInquiry` para permitir al cliente consultar por medio kilo en WhatsApp sin duplicar SKUs.

### B. Flujo Híbrido de Pedido (Carrito + WhatsApp)
- Carrito persistido en `localStorage` para retención de sesión.
- Generación de mensaje directo formateado para WhatsApp con desglose de items, cantidades, variantes, precio total estimado y dirección/datos de entrega en Río Cuarto.
- Sin pasarelas de pago complejas que aumenten la fricción en esta fase: conversión directa al canal comercial preferido por el cliente local cordobés.

### C. Dirección de Arte y Estética Visual
- **Hero:** Estética editorial oscura y sofisticada (dark moody hero) que transmite calidez gastronómica, calidad artesanal y confianza culinaria.
- **Cuerpo / Contenido:** Papel crema orgánico (`#F4EFE6`) con tipografías cálidas, contrastes suaves y detalles en tonos tierra/dorado cálido, alejándose del típico look de hospital o dietética aburrida.
- **Sellos de Confianza:** "100% Libre de Contaminación Cruzada" y "¡Envío gratis en Río Cuarto!" visibles estratégicamente.

### D. Regla de Fallback de Imágenes (Desarrollo y Producción)
- Durante el desarrollo y hasta que se disponga de las fotos de estudio de todos los productos en `public/images/*.webp`:
  1. Los componentes de imagen implementarán un handler `onError`.
  2. Si la imagen física no existe o falla en cargar, el componente alternará automáticamente a un placeholder elegante con degradado cálido, categoría y el ícono alusivo correspondiente de `lucide-react` (ej. Utensils, Pizza, Beef, Drumstick, Bread).
  3. No se romperá el layout ni se mostrarán íconos de imagen rota.

---

## 5. Skills Habilitadas en el Espacio de Trabajo
- `banner-design`
- `brand`
- `copywriting`
- `cro`
- `design`
- `design-system`
- `frontend-design`
- `schema`
- `slides`
- `ui-styling`
- `ui-ux-pro-max`
- `vercel-react-best-practices`
- `web-design-guidelines`
