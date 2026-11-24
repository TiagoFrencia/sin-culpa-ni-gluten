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
    whatsappPhone: business.whatsappPhone,
    whatsappDisplay: business.whatsappDisplay,
    instagramHandle: business.instagramHandle,
    instagramUrl: business.instagramUrl,
    priceListImageUrl: business.priceListImageUrl,
  });

  const [isUploadingPriceList, setIsUploadingPriceList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manejo de subida de lista de precios (manteniendo proporción original)
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

    // Sanitizar número de WhatsApp: solo números
    const cleanPhone = formData.whatsappPhone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      showToast('El número de WhatsApp no parece ser válido.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        brand_name: formData.brandName.trim(),
        slogan: formData.slogan.trim(),
        delivery_highlight: formData.deliveryHighlight.trim(),
        whatsapp_phone: cleanPhone,
        whatsapp_display: formData.whatsappDisplay.trim(),
        instagram_handle: formData.instagramHandle.trim(),
        instagram_url: formData.instagramUrl.trim(),
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
    <div className="space-y-4 pb-16">
      {/* Banner Informativo */}
      <div className="bg-[#FAF7F2] border border-[#E5DCCB] rounded-2xl p-4 shadow-sm flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#A64B2A]/10 text-[#A64B2A] shrink-0 mt-0.5">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#1D120D]">Datos del Negocio y Canales</h2>
          <p className="text-xs text-[#6B574B] mt-0.5">
            Configurá el número de WhatsApp receptor, el anuncio superior de la tienda y la foto de la lista de precios oficial.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sección 1: WhatsApp */}
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D] border-b border-[#E5DCCB]/60 pb-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Canal de WhatsApp (Recepción de Pedidos)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E271E]">
                Número Real (Sanitizado sin símbolos ni espacios) *
              </label>
              <input
                type="text"
                value={formData.whatsappPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, whatsappPhone: e.target.value }))}
                placeholder="5493585728550"
                required
                className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-sm font-bold text-[#1D120D]"
              />
              <p className="text-[11px] text-[#6B574B]">
                Ejemplo Argentina con código país: <strong>5493585728550</strong>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E271E]">
                Formato Visual para el Cliente *
              </label>
              <input
                type="text"
                value={formData.whatsappDisplay}
                onChange={(e) => setFormData((prev) => ({ ...prev, whatsappDisplay: e.target.value }))}
                placeholder="358 572-8550"
                required
                className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-sm font-medium text-[#1D120D]"
              />
              <p className="text-[11px] text-[#6B574B]">
                Así se muestra en el footer y barra de contacto.
              </p>
            </div>
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
              <label className="text-xs font-semibold text-[#3E271E]">
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
              <label className="text-xs font-semibold text-[#3E271E]">
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

        {/* Sección 3: Redes Sociales (Instagram) */}
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D] border-b border-[#E5DCCB]/60 pb-2">
            <InstagramIcon className="w-4 h-4 text-pink-600" />
            <span>Instagram Oficial</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E271E]">Usuario (Handle)</label>
              <input
                type="text"
                value={formData.instagramHandle}
                onChange={(e) => setFormData((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                placeholder="@sinculpa.nigluten"
                className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E271E]">Enlace URL Directo</label>
              <input
                type="url"
                value={formData.instagramUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, instagramUrl: e.target.value }))}
                placeholder="https://www.instagram.com/sinculpa.nigluten/"
                className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D]"
              />
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

          <p className="text-xs text-[#6B574B]">
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
