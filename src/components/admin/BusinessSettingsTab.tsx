import React, { useState } from 'react';
import type { BusinessConfig } from '@/config/business';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  Phone,
  Megaphone,
  Check,
  ExternalLink,
  Power,
  Lock,
  KeyRound,
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

  // Quitar el 15 de celular si está después de la característica
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
  // Estado operativo: Recibiendo pedidos / Pausado
  const [isAcceptingOrders, setIsAcceptingOrders] = useState<boolean>(
    business.isAcceptingOrders ?? true
  );
  const [pauseMessage, setPauseMessage] = useState<string>(
    business.pauseMessage || 'Estamos con agenda completa por hoy. Volvemos a tomar pedidos muy pronto.'
  );

  const [formData, setFormData] = useState({
    brandName: business.brandName,
    slogan: business.slogan,
    deliveryHighlight: business.deliveryHighlight,
  });

  const [whatsappRaw, setWhatsappRaw] = useState(
    business.whatsappDisplay || business.whatsappPhone || '358 572-8550'
  );
  const [instagramRaw, setInstagramRaw] = useState(
    business.instagramHandle || '@sinculpa.nigluten'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para cambio de contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Previsualizaciones reactivas en vivo
  const liveWhatsApp = processWhatsAppInput(whatsappRaw);
  const liveInstagram = processInstagramInput(instagramRaw);

  // Guardar configuración general del negocio
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
        is_accepting_orders: isAcceptingOrders,
        pause_message: pauseMessage.trim(),
      };

      // Intentar actualizar con las columnas v2 de pedidos
      let { error } = await supabase
        .from('business_settings')
        .update(payload)
        .eq('id', 1);

      // Si falla porque la columna aún no fue migrada en la base remota
      if (error && error.message?.includes('column "is_accepting_orders" of relation "business_settings" does not exist')) {
        const fallbackPayload = {
          brand_name: formData.brandName.trim(),
          slogan: formData.slogan.trim(),
          delivery_highlight: formData.deliveryHighlight.trim(),
          whatsapp_phone: processedPhone.phone,
          whatsapp_display: processedPhone.display,
          instagram_handle: processedIg.handle,
          instagram_url: processedIg.url,
        };
        const fallbackRes = await supabase
          .from('business_settings')
          .update(fallbackPayload)
          .eq('id', 1);

        if (fallbackRes.error) throw fallbackRes.error;

        showToast('Guardado. Ejecutá la migración SQL en Supabase para habilitar el interruptor de pausa.', 'info');
        await onRefresh();
        return;
      }

      if (error) throw error;

      showToast('Configuración del negocio guardada exitosamente', 'success');
      await onRefresh();
    } catch (err) {
      showToast(`Error al guardar: ${(err as Error).message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejo de actualización de contraseña
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (newPassword.length < 8) {
      showToast('La nueva contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas ingresadas no coinciden.', 'error');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      showToast('Contraseña de administrador actualizada con éxito', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(`Error al actualizar contraseña: ${(err as Error).message}`, 'error');
    } finally {
      setIsUpdatingPassword(false);
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
          <h2 className="text-sm font-bold text-[#1D120D]">Datos del Negocio y Operaciones</h2>
          <p className="text-xs text-[#6B574B] mt-0.5 leading-relaxed">
            Controlá el estado de recepción de pedidos, el número receptor de WhatsApp y las redes de contacto.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* =================================================================== */}
        {/* INTERRUPTOR: Recibiendo pedidos / Pedidos pausados                  */}
        {/* =================================================================== */}
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#E5DCCB]/60 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D]">
              <Power className={`w-4 h-4 ${isAcceptingOrders ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>Estado Operativo de Pedidos</span>
            </div>

            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                isAcceptingOrders
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {isAcceptingOrders ? '🟢 Recibiendo pedidos' : '⏸️ Pedidos pausados'}
            </span>
          </div>

          <p className="text-xs text-[#6B574B] leading-relaxed">
            Si estás con agenda completa o fuera de horario, pausá la recepción para informar a los clientes y desactivar el botón de envío en el carrito.
          </p>

          {/* Selector de 2 opciones táctiles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsAcceptingOrders(true)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 min-w-0 ${
                isAcceptingOrders
                  ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
                  : 'bg-[#FAF7F2] border-[#E5DCCB] hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-[#1D120D] truncate">
                  Activo
                </span>
              </div>
              <span className="text-[11px] text-[#6B574B] line-clamp-1">
                Tomando pedidos normalmente
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsAcceptingOrders(false)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 min-w-0 ${
                !isAcceptingOrders
                  ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500 shadow-xs'
                  : 'bg-[#FAF7F2] border-[#E5DCCB] hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-[#1D120D] truncate">
                  Pausado
                </span>
              </div>
              <span className="text-[11px] text-[#6B574B] line-clamp-1">
                Agenda completa por hoy
              </span>
            </button>
          </div>

          {/* Campo editable de pause_message */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#3E271E] block">
              Mensaje al cliente cuando está pausado:
            </label>
            <textarea
              rows={2}
              value={pauseMessage}
              onChange={(e) => setPauseMessage(e.target.value)}
              placeholder="Estamos con agenda completa por hoy. Volvemos a tomar pedidos muy pronto."
              className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1D120D] focus:outline-hidden focus:border-[#A64B2A] focus:ring-1 focus:ring-[#A64B2A]"
            />
            <p className="text-[11px] text-[#6B574B]">
              Se muestra en la barra superior pública y dentro de la ventana del pedido.
            </p>
          </div>
        </div>

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

        {/* Botón Guardar Cambios Generales */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] shadow-sm disabled:opacity-60 flex items-center justify-center gap-2 active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando cambios...' : 'Guardar Configuración del Negocio'}</span>
          </button>
        </div>
      </form>

      {/* =================================================================== */}
      {/* SECCIÓN SEGURIDAD: Cambiar Contraseña de Administrador               */}
      {/* =================================================================== */}
      <div className="bg-white border border-[#E5DCCB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 mt-6">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1D120D] border-b border-[#E5DCCB]/60 pb-2">
          <Lock className="w-4 h-4 text-[#A64B2A]" />
          <span>Seguridad: Cambiar Contraseña de Administrador</span>
        </div>

        <p className="text-xs text-[#6B574B] leading-relaxed">
          Actualizá la clave de acceso al panel de control de `/admin`. Mínimo 8 caracteres.
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#3E271E] block">
              Nueva Contraseña (mínimo 8 caracteres)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2.5 text-sm text-[#1D120D]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#3E271E] block">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-xl px-3.5 py-2.5 text-sm text-[#1D120D]"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword || !confirmPassword}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs text-[#1D120D] bg-stone-100 hover:bg-stone-200 border border-[#E5DCCB] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            <KeyRound className="w-4 h-4 text-[#A64B2A]" />
            <span>{isUpdatingPassword ? 'Actualizando contraseña...' : 'Actualizar Contraseña'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
