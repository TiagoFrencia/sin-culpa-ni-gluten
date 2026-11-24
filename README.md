# Sin Culpa Ni Gluten 🌾✨
### Catálogo Digital y Carrito de Pedidos para WhatsApp — Río Cuarto, Córdoba

Sitio web oficial y catálogo digital gastronómico de **Sin Culpa Ni Gluten**, emprendimiento familiar dedicado a la elaboración artesanal de comidas caseras congeladas 100% libres de gluten y sin contaminación cruzada en Río Cuarto, Córdoba, Argentina.

Desarrollado con **React 19**, **TypeScript**, **Tailwind CSS v4** y **Vite**.

---

## 📋 Índice
1. [Configuración del Número de WhatsApp](#1-configuración-del-número-de-whatsapp)
2. [Gestión del Catálogo y Precios](#2-gestión-del-catálogo-y-precios)
3. [Guía y Tabla de Imágenes](#3-guía-y-tabla-de-imágenes)
4. [Recordatorio Post-Deploy (SEO y Open Graph)](#4-recordatorio-post-deploy-seo-y-open-graph)
5. [Paso a Paso de Deploy en Vercel (Gratuito)](#5-paso-a-paso-de-deploy-en-vercel-gratuito)
6. [Comandos de Desarrollo Local](#6-comandos-de-desarrollo-local)

---

## 1. Configuración del Número de WhatsApp

El número de WhatsApp es el canal principal de venta y contacto. Se configura centralizadamente mediante variables de entorno y archivo de configuración:

### A. Para Entorno Local (`.env`)
En la raíz del proyecto, el archivo `.env` define la variable:
```bash
VITE_WHATSAPP_NUMBER=5493585728550
```
*Formato:* Código de país (`54`), código de móvil (`9`), característica sin cero (`358`) y número (`5728550`). Solo números, sin espacios ni guiones.

### B. Para Producción en Vercel
1. Ingresá a tu proyecto en [vercel.com](https://vercel.com).
2. Ve a **Settings** → **Environment Variables**.
3. Añadí la variable:
   - **Key:** `VITE_WHATSAPP_NUMBER`
   - **Value:** `5493585728550` (o el número deseado).
4. Guardá y realizá un nuevo deploy (Redeploy).

### C. Formato Visual y Datos de Marca (`src/config/business.ts`)
En [src/config/business.ts](file:///c:/Users/tiago/Sin%20Culpa%20Ni%20Gluten/src/config/business.ts) podés editar el número legible en pantalla y las redes:
```typescript
export const businessConfig = {
  brandName: "Sin Culpa Ni Gluten",
  slogan: "Comer rico y sin gluten ya no es un problema.",
  city: "Río Cuarto, Córdoba",
  country: "Argentina",
  whatsappPhone: (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || "5493585728550",
  whatsappDisplay: "358 572-8550", // Formato estético visible al usuario
  instagramHandle: "@sinculpa.nigluten",
  instagramUrl: "https://www.instagram.com/sinculpa.nigluten/",
  deliveryHighlight: "¡Envío gratis en Río Cuarto!",
  trustBadge: "100% Libre de Contaminación Cruzada",
} as const;
```

---

## 2. Gestión del Catálogo y Precios

Todo el catálogo y los combos están centralizados en un único archivo: [src/data/catalog.ts](file:///c:/Users/tiago/Sin%20Culpa%20Ni%20Gluten/src/data/catalog.ts).

### A. Cómo actualizar un precio
Buscá el producto en el array `products` y modificá el valor numérico en `price`:
```typescript
{
  id: 'milanesas-nalga',
  name: 'Milanesas de Ternera (Nalga)',
  variants: [
    { id: '1kg', label: '1 kg', price: 25000 }, // Cambiar a nuevo valor
  ],
  // ...
}
```

### B. Cómo marcar un producto "Sin stock" o "Agotado"
Cambiá la propiedad `available: true` a `false`:
```typescript
{
  id: 'milanesas-nalga',
  // ...
  available: false, // Deshabilita el botón de compra y muestra "Consultar próxima tanda"
}
```
Esto deshabilita la suma al carrito y activa un botón accesible de consulta por WhatsApp directo para encargar la próxima tanda.

### C. Productos especiales por encargo (precio a consultar)
Para productos cuyo precio varía según el peso o cotización (como Pan de Molde o Pollo Relleno), asigná `price: null`:
```typescript
{
  id: 'pan-integral',
  variants: [
    { id: 'molde-entero', label: 'Molde entero', price: null },
  ],
}
```
El sistema mostrará automáticamente **"Consultar precio"** y un botón directo a WhatsApp.

---

## 3. Guía y Tabla de Imágenes

El proyecto cuenta con un sistema de **fallback gastronómico elegante** (`MediaImage.tsx`). Si una imagen aún no existe o falla, el usuario ve una tarjeta de marca con el nombre del plato, categoría y sello de cocina artesanal sin errores rotos.

Para mostrar las fotografías reales de los platos, colocá los archivos en las siguientes rutas respetando los nombres:

### Archivos de Marca y Raíz (`public/`)
| Archivo | Ubicación | Proporción | Tamaño Recomendado | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `logo.png` | `public/logo.png` | 1:1 (cuadrado/circular) | 512x512 px (PNG transparente) | Logo oficial visible en barra de navegación y pie de página |
| `favicon.svg` | `public/favicon.svg` | 1:1 (vectorial) | Escalable (SVG) | Ícono de pestaña del navegador y web-app |

### Fotos de Platos y Documentos (`public/images/`)
Todas las fotografías de platos deben utilizar formato moderno **WebP** y proporción **4:3**:

| Archivo | Ubicación | Proporción | Tamaño Recomendado | Producto / Uso |
| :--- | :--- | :--- | :--- | :--- |
| `lista-precios.jpg` | `public/images/lista-precios.jpg` | Variable / Vertical | 1080x1920 px (JPG) | Flyer/foto de lista completa para el modal digital y Open Graph |
| `milanesas-nalga.webp` | `public/images/milanesas-nalga.webp` | 4:3 | 800x600 o 1200x900 px | Milanesas de Ternera (Nalga) |
| `milanesas-cuadrada.webp` | `public/images/milanesas-cuadrada.webp` | 4:3 | 800x600 o 1200x900 px | Milanesas de Ternera (Cuadrada) |
| `milanesas-pollo.webp` | `public/images/milanesas-pollo.webp` | 4:3 | 800x600 o 1200x900 px | Milanesas de Suprema de Pollo |
| `hamburguesas-carne-verdura.webp` | `public/images/hamburguesas-carne-verdura.webp` | 4:3 | 800x600 o 1200x900 px | Hamburguesas 50% Carne / 50% Verdura |
| `hamburguesas-carne.webp` | `public/images/hamburguesas-carne.webp` | 4:3 | 800x600 o 1200x900 px | Hamburguesas 100% Carne Especial |
| `hamburguesas-pollo.webp` | `public/images/hamburguesas-pollo.webp` | 4:3 | 800x600 o 1200x900 px | Hamburguesas Caseras de Pollo |
| `empanadas-arabes.webp` | `public/images/empanadas-arabes.webp` | 4:3 | 800x600 o 1200x900 px | Empanadas Árabes Sin TACC (Especialidad Hero) |
| `empanadas-clasicas.webp` | `public/images/empanadas-clasicas.webp` | 4:3 | 800x600 o 1200x900 px | Empanadas Caseras Dulces y Saladas |
| `pizza-especial.webp` | `public/images/pizza-especial.webp` | 4:3 | 800x600 o 1200x900 px | Pizza Especial Congelada |
| `pizza-muzzarella.webp` | `public/images/pizza-muzzarella.webp` | 4:3 | 800x600 o 1200x900 px | Pizza de Muzzarella Congelada |
| `prepizza-salsa.webp` | `public/images/prepizza-salsa.webp` | 4:3 | 800x600 o 1200x900 px | Prepizza con Salsa |
| `pan-integral.webp` | `public/images/pan-integral.webp` | 4:3 | 800x600 o 1200x900 px | Pan Integral Sin TACC con Semillas |
| `pollo-relleno.webp` | `public/images/pollo-relleno.webp` | 4:3 | 800x600 o 1200x900 px | Roulet y Pollo Relleno por Encargo |

---

## 4. Recordatorio Post-Deploy (SEO y Open Graph)

Cuando compartas el enlace por WhatsApp, Facebook o Instagram, estas plataformas leen las etiquetas `<meta property="og:...">` en `index.html`. Para que la miniatura y el enlace se previsualicen correctamente con la tarjeta de la marca:

1. Una vez desplegado en Vercel, obtené tu URL final de producción (por ejemplo: `https://sin-culpa-ni-gluten.vercel.app` o tu dominio personalizado `https://sinculpanigluten.com.ar`).
2. Abrí [index.html](file:///c:/Users/tiago/Sin%20Culpa%20Ni%20Gluten/index.html).
3. Asegurate de que `og:image` y `twitter:image` apunten a la URL absoluta:
   ```html
   <meta property="og:image" content="https://tu-dominio.vercel.app/images/lista-precios.jpg" />
   <meta name="twitter:image" content="https://tu-dominio.vercel.app/images/lista-precios.jpg" />
   ```
4. En el bloque Schema.org JSON-LD de `index.html`:
   ```json
   "image": "https://tu-dominio.vercel.app/images/lista-precios.jpg",
   "url": "https://tu-dominio.vercel.app"
   ```

---

## 5. Paso a Paso de Deploy en Vercel (Gratuito)

Desplegar el proyecto es 100% gratuito utilizando el plan Hobby de Vercel y GitHub:

1. **Subir el código a GitHub:**
   ```bash
   git add .
   git commit -m "feat: produccion lista y auditada"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/sin-culpa-ni-gluten.git
   git push -u origin main
   ```

2. **Conectar en Vercel:**
   - Creá una cuenta o iniciá sesión en [vercel.com](https://vercel.com) con tu cuenta de GitHub.
   - Hacé clic en **"Add New..."** → **"Project"**.
   - Seleccioná tu repositorio `sin-culpa-ni-gluten` y clickeá en **"Import"**.

3. **Configuración de Proyecto:**
   - **Framework Preset:** Vite (detectado automáticamente).
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Variables de Entorno (Environment Variables):**
   - Agregá:
     - `VITE_WHATSAPP_NUMBER` = `5493585728550`

5. **Deploy:**
   - Clickeá en **"Deploy"**. En ~40 segundos el sitio estará online con SSL automático, CDN global y headers de seguridad configurados en `vercel.json`.

---

## 6. Comandos de Desarrollo Local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con Hot Module Replacement (HMR)
npm run dev

# Verificación de tipos TypeScript
npx tsc --noEmit

# Linter ultra-rápido Oxlint
npm run lint

# Build de producción optimizado
npm run build

# Previsualizar el build de producción localmente
npm run preview

# Suite de verificación UI con Puppeteer (multi-viewport)
node scripts/verify-ui.mjs
```
