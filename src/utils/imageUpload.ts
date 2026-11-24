import { supabase } from '@/lib/supabase';

export type UploadFolder = 'products' | 'combos' | 'pricelist';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

function sanitizeSlug(fileName: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const clean = baseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 35);
  return clean || 'imagen';
}

/**
 * Comprime y sube una imagen al bucket 'catalog-images' de Supabase.
 * - products / combos: recorte centrado en proporción 4:3, máx 1000px de ancho.
 * - pricelist: preserva proporción original completa, máx 1000px de ancho.
 * - Exporta en formato WebP con calidad 0.82 (< 150 KB típico).
 */
export async function compressAndUploadImage(
  file: File,
  folder: UploadFolder
): Promise<string> {
  // 1. Validaciones de entrada
  if (!file) {
    throw new Error('No se seleccionó ningún archivo.');
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida (debe ser JPG, PNG, WebP, etc.).');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`La imagen pesa ${sizeInMb} MB y supera el límite de 15 MB. Por favor seleccioná una imagen más liviana.`);
  }

  if (!supabase) {
    throw new Error('El cliente de Supabase no está configurado. Verificá las variables de entorno.');
  }

  // 2. Carga en memoria mediante Image nativa del navegador
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada. Es posible que el archivo esté dañado.'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  if (origW <= 0 || origH <= 0) {
    throw new Error('Dimensiones de imagen inválidas.');
  }

  let finalW: number;
  let finalH: number;
  let cropX = 0;
  let cropY = 0;
  let cropW = origW;
  let cropH = origH;

  if (folder === 'pricelist') {
    // Mantener proporción original intacta para no cortar texto ni listas
    if (origW > 1000) {
      finalW = 1000;
      finalH = Math.round((origH / origW) * 1000);
    } else {
      finalW = origW;
      finalH = origH;
    }
  } else {
    // Para productos y combos: recortar centrado en proporción 4:3
    const targetRatio = 4 / 3;
    const currentRatio = origW / origH;

    if (currentRatio > targetRatio) {
      // Imagen más ancha que 4:3 -> recortar lados izquierdo y derecho
      cropW = Math.round(origH * targetRatio);
      cropH = origH;
      cropX = Math.round((origW - cropW) / 2);
      cropY = 0;
    } else if (currentRatio < targetRatio) {
      // Imagen más alta que 4:3 -> recortar arriba y abajo
      cropW = origW;
      cropH = Math.round(origW / targetRatio);
      cropX = 0;
      cropY = Math.round((origH - cropH) / 2);
    } else {
      // Proporción exacta
      cropW = origW;
      cropH = origH;
      cropX = 0;
      cropY = 0;
    }

    finalW = Math.min(1000, cropW);
    finalH = Math.round(finalW * (3 / 4));
  }

  // 3. Dibujar en canvas con interpolación de alta calidad
  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('El navegador no pudo inicializar el motor de renderizado de imagen.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fondo crema limpio por si hay transparencias
  ctx.fillStyle = '#FAF7F2';
  ctx.fillRect(0, 0, finalW, finalH);

  if (folder === 'pricelist') {
    ctx.drawImage(img, 0, 0, origW, origH, 0, 0, finalW, finalH);
  } else {
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, finalW, finalH);
  }

  // 4. Exportar como Blob WebP (calidad 0.82)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          // Fallback a JPEG si WebP no fuera soportado
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve(jpegBlob);
              else reject(new Error('No se pudo comprimir la imagen.'));
            },
            'image/jpeg',
            0.82
          );
        }
      },
      'image/webp',
      0.82
    );
  });

  // 5. Subida directa a Supabase Storage bucket 'catalog-images'
  const slug = sanitizeSlug(file.name);
  const fileName = `${Date.now()}-${slug}.webp`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('catalog-images')
    .upload(filePath, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    });

  if (uploadError) {
    console.error('[imageUpload] Error en Supabase Storage:', uploadError);
    throw new Error(`Error al subir la imagen a la nube: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('catalog-images')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
