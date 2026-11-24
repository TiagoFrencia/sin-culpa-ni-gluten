import React, { useState } from 'react';
import type { BusinessConfig } from '@/config/business';
import { supabase } from '@/lib/supabase';
import { compressAndUploadImage } from '@/utils/imageUpload';
import {
  Building2,
  Phone,
  Megaphone,
  FileImage,
  Camera,
  Check,
  ExternalLink,
} from 'lucide-react';

function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/**
 * Procesa y sanitiza el número de WhatsApp ingresado por el usuario.
 * Si tiene 10 dígitos (estándar argentino local), agrega prefijo 549 y formatea la visualización.
 */
function processWhatsAppInput(raw: string): { phone: string; display: string } {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return { phone: '', display: '' };

  // Si ya tiene 13 dígitos y empieza con 549
  if (digits.startsWith('549') && digits.length === 13) {
    const local = digits.slice(3);
    return {
      phone: digits,
      display: formatLocalPhone(local),
    };
  }

  // Quitar 54 y 9 si vino incompleto
  if (digits.startsWith('54')) {
    digits = digits.slice(2);
    if (digits.startsWith('9')) {
      digits = digits.slice(1);
    }
  }

  // Quitar 0 inicial si lo tipearón
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Quitar el 15 de celular si está después de la característica (ej. 358 15 5728550 -> 12 dígitos)
  if (digits.length === 12 && digits.slice(3, 5) === '15') {
    digits = digits.slice(0, 3) + digits.slice(5);
  } else if (digits.length === 11 && digits.startsWith('11') && digits.slice(2, 4) === '15') {
    digits = digits.slice(0, 2) + digits.slice(4);
  }

  // Si quedaron 10 dígitos locales
  if (digits.length === 10) {
    return {
      phone: `549${digits}`,
      display: formatLocalPhone(digits),
    };
  }

  // Fallback si ingresó otro formato internacional
  return {
    phone: digits,
    display: raw.trim(),
  };
}

function formatLocalPhone(local10: string): string {
  if (local10.length !== 10) return local10;
  if (local10.startsWith('11')) {
    return `11 ${local10.slice(2, 6)}-${local10.slice(6)}`;
  }
  // Características comunes de 3 dígitos (358, 351, 341, etc.)
  return `${local10.slice(0, 3)} ${local10.slice(3, 6)}-${local10.slice(6)}`;
}

/**
 * Procesa el usuario de Instagram y genera la URL completa automáticamente.
 */
function processInstagramInput(raw: string): { handle: string; url: string } {
  let cleaned = raw.trim();
  if (!cleaned) return { handle: '', url: '' };

  if (cleaned.includes('instagram.com/')) {
    const parts = cleaned.split('instagram.com/');
    const userPart = parts[1]?.split(/[/?#]/)[0] || '';
    cleaned = userPart;
  }

  const username = cleaned.replace(/^@+/, '').trim();
  if (!username) return { handle: '', url: '' };

  return {
    handle: `@${username}`,
    url: `https://www.instagram.com/${username}/`,
  };
}

interface BusinessSettingsTabProps {
  business: BusinessConfig;
  onRefresh: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const BusinessSettingsTab: React.FC<BusinessSettingsTabProps> = ({
  business,
  onRefresh,
  showToast,
}) => {
  const [formData, setFormData] = useState({
    brandName: business.brandName,
    slogan: business.slogan,
    deliveryHighlight: business.deliveryHighlight,
    priceListImageUrl: business.priceListImageUrl,
  });

  const [whatsappRaw, setWhatsappRaw] = useState(
    business.whatsappDisplay || business.whatsappPhone || '358 572-8550'
  );
  const [instagramRaw, setInstagramRaw] = useState(
    business.instagramHandle || '@sinculpa.nigluten'
  );

  const [isUploadingPriceList, setIsUploadingPriceList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Previsualizaciones reactivas en vivo
  const liveWhatsApp = processWhatsAppInput(whatsappRaw);
  const liveInstagram = processInstagramInput(instagramRaw);

  // Manejo de subida de lista de precios (manteniendo proporción original intacta)
  const handlePriceListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPriceList(true);
      showToast('Comprimiendo lista de precios (proporción original intacta)...', 'info');
      const publicUrl = await compressAndUploadImage(file, 'pricelist');
      setFormData((prev) => ({ ...prev, priceListImageUrl: publicUrl }));
      showToast('Lista de precios actualizada y subida a la nube', 'success');
    } catch (err) {
      showToast(`Error al subir imagen: ${(err as Error).message}`, 'error');
    } finally {
      setIsUploadingPriceList(false);
      e.target.value = '';
    }
  };

  // Guardar configuración
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const processedPhone = processWhatsAppInput(whatsappRaw);
    if (!processedPhone.phone || processedPhone.phone.length < 8) {
      showToast('Por favor ingresá un número de WhatsApp válido con código de área (ej. 358 572-8550).', 'error');
      return;
    }

    const processedIg = processInstagramInput(instagramRaw);

    try {
      setIsSubmitting(true);

      const payload = {
        brand_name: formData.brandName.trim(),
        slogan: formData.slogan.trim(),
        delivery_highlight: formData.deliveryHighlight.trim(),
        whatsapp_phone: processedPhone.phone,
        whatsapp_display: processedPhone.display,
        instagram_handle: processedIg.handle,
        instagram_url: processedIg.url,
        price_list_image_url: formData.priceListImageUrl.trim(),
      };

      const { error } = await supabase
        .from('business_settings')
        .update(payload)
        .eq('id', 1);

      if (error) throw error;

      showToast('Configuración del negocio guardada exitosamente', 'success');
      await onRefresh();
    } catch (err) {
      showToast(`Error al guardar: ${(err as Error).message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-16 w-full max-w-full overflow-x-hidden">
      {/* Banner Informativo */}
      <div className="bg-[#FAF7F2] border border-[#E5DCCB] rounded-2xl p-4 shadow-sm flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#A64B2A]/10 text-[#A64B2A] shrink-0 mt-0.5">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#1D120D]">Datos del Negocio y Canales</h2>
          <p className="text-xs text-[#6B574B] mt-0.5 leading-relaxed">
            Configurá el número de WhatsApp receptor, el anuncio superior de la tienda y la foto de la lista de precios oficial.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sección 1: WhatsApp Simplificado */}
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D] border-b border-[#E5DCCB]/60 pb-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Canal de WhatsApp (Recepción de Pedidos)</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#3E271E] block">
              Número de WhatsApp (con código de área, sin 0 ni 15) *
            </label>
            <input
              type="text"
              inputMode="tel"
              value={whatsappRaw}
              onChange={(e) => setWhatsappRaw(e.target.value)}
              placeholder="Ej. 358 572-8550"
              required
              className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#1D120D]"
            />
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5A653E] pt-0.5">
              <span className="font-medium">Link de pedidos activo:</span>
              <span className="font-mono font-bold text-[#1D120D] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                wa.me/{liveWhatsApp.phone || '...'}
              </span>
            </div>
            <p className="text-[11px] text-[#6B574B]">
              Se formatea automáticamente para la web como <strong>{liveWhatsApp.display || '...'}</strong> con prefijo internacional 549.
            </p>
          </div>
        </div>

        {/* Sección 2: Mensajes y Barra Superior */}
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D] border-b border-[#E5DCCB]/60 pb-2">
            <Megaphone className="w-4 h-4 text-[#A64B2A]" />
            <span>Barra Superior y Mensajes Clave</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E271E] block">
                Texto de la Barra Superior de Anuncio *
              </label>
              <input
                type="text"
                value={formData.deliveryHighlight}
                onChange={(e) => setFormData((prev) => ({ ...prev, deliveryHighlight: e.target.value }))}
                placeholder="¡Envío gratis en Río Cuarto!"
                required
                maxLength={80}
                className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-sm font-semibold text-[#1D120D]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E271E] block">
                Slogan de la Marca
              </label>
              <input
                type="text"
                value={formData.slogan}
                onChange={(e) => setFormData((prev) => ({ ...prev, slogan: e.target.value }))}
                placeholder="Comer rico y sin gluten ya no es un problema."
                className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D]"
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Redes Sociales (Instagram Simplificado) */}
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D] border-b border-[#E5DCCB]/60 pb-2">
            <InstagramIcon className="w-4 h-4 text-pink-600" />
            <span>Instagram Oficial</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#3E271E] block">
              Usuario de Instagram *
            </label>
            <input
              type="text"
              value={instagramRaw}
              onChange={(e) => setInstagramRaw(e.target.value)}
              placeholder="Ej. @sinculpa.nigluten"
              className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-sm font-semibold text-[#1D120D]"
            />
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B574B] pt-0.5">
              <span>Perfil enlazado:</span>
              <a
                href={liveInstagram.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[#A64B2A] hover:underline flex items-center gap-1"
              >
                <span>{liveInstagram.url || '...'}</span>
                {liveInstagram.url && <ExternalLink className="w-3 h-3 inline" />}
              </a>
            </div>
          </div>
        </div>

        {/* Sección 4: Imagen de Lista de Precios */}
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5DCCB]/60 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D]">
              <FileImage className="w-4 h-4 text-[#A64B2A]" />
              <span>Foto de Lista de Precios Oficial</span>
            </div>
            {formData.priceListImageUrl && (
              <a
                href={formData.priceListImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#A64B2A] font-bold hover:underline flex items-center gap-1"
              >
                <span>Ver actual</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <p className="text-xs text-[#6B574B] leading-relaxed">
            Esta imagen se abre cuando los clientes tocan "Ver Lista de Precios". La compresión automática preserva la proporción completa del volante para que los textos no se corten.
          </p>

          {/* Preview de la lista */}
          <div className="max-h-60 overflow-hidden rounded-xl border border-[#E5DCCB] bg-[#FAF7F2] flex items-center justify-center p-2">
            {formData.priceListImageUrl ? (
              <img
                src={formData.priceListImageUrl}
                alt="Lista de precios vigente"
                className="max-h-56 w-auto object-contain rounded-lg"
              />
            ) : (
              <p className="text-xs text-[#6B574B] p-6 text-center">No hay imagen cargada</p>
            )}
          </div>

          {/* Botón táctil para subir nueva imagen */}
          <label className="w-full cursor-pointer min-h-[44px] bg-[#FAF7F2] border border-[#E5DCCB] text-[#1D120D] px-4 py-2.5 rounded-xl font-bold text-center flex items-center justify-center gap-2 hover:bg-stone-100 active:scale-98">
            <Camera className="w-4 h-4 text-[#A64B2A]" />
            <span>
              {isUploadingPriceList
                ? 'Comprimiendo y subiendo...'
                : 'Subir nueva foto de Lista de Precios'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePriceListUpload}
              disabled={isUploadingPriceList}
              className="sr-only"
            />
          </label>
        </div>

        {/* Botón Guardar Cambios */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isUploadingPriceList}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando cambios...' : 'Guardar Configuración del Negocio'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
