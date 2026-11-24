import React, { useState } from 'react';
import type { Combo } from '@/types/catalog';
import { supabase } from '@/lib/supabase';
import { compressAndUploadImage } from '@/utils/imageUpload';
import {
  Plus,
  Edit2,
  Trash2,
  Camera,
  X,
  Check,
  AlertTriangle,
  Upload,
  Package,
} from 'lucide-react';

interface CombosTabProps {
  combos: Combo[];
  onRefresh: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface ComboFormData {
  id: string;
  name: string;
  subtitle: string;
  itemsIncluded: string[];
  regularPrice: number;
  promoPrice: number | null;
  badge: string;
  image: string;
  available: boolean;
  sortOrder: number;
}

const DEFAULT_COMBO_FORM: ComboFormData = {
  id: '',
  name: '',
  subtitle: '',
  itemsIncluded: ['1 kg Milanesas de Carne', '1 docena Empanadas'],
  regularPrice: 20000,
  promoPrice: null,
  badge: 'Ahorro Especial',
  image: '/images/combo-familiar-completo.webp',
  available: true,
  sortOrder: 1,
};

function generateSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return clean || `combo-${Date.now()}`;
}

function formatPriceARS(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Consultar';
  return `$ ${price.toLocaleString('es-AR')}`;
}

export const CombosTab: React.FC<CombosTabProps> = ({
  combos,
  onRefresh,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [formData, setFormData] = useState<ComboFormData>(DEFAULT_COMBO_FORM);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nuevo item temporal para agregar a itemsIncluded
  const [newItemText, setNewItemText] = useState('');

  // Confirmación de eliminación
  const [comboToDelete, setComboToDelete] = useState<Combo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreate = () => {
    setEditingCombo(null);
    setFormData({
      ...DEFAULT_COMBO_FORM,
      id: '',
      sortOrder: combos.length + 1,
    });
    setNewItemText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (combo: Combo) => {
    setEditingCombo(combo);
    setFormData({
      id: combo.id,
      name: combo.name,
      subtitle: combo.subtitle,
      itemsIncluded: Array.isArray(combo.itemsIncluded) ? [...combo.itemsIncluded] : [],
      regularPrice: combo.regularPrice,
      promoPrice: combo.promoPrice,
      badge: combo.badge || '',
      image: combo.image,
      available: Boolean(combo.available),
      sortOrder: combo.sortOrder ?? 0,
    });
    setNewItemText('');
    setIsModalOpen(true);
  };

  // Subir imagen WebP 4:3
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      showToast('Comprimiendo y optimizando foto del combo...', 'info');
      const publicUrl = await compressAndUploadImage(file, 'combos');
      setFormData((prev) => ({ ...prev, image: publicUrl }));
      showToast('Foto del combo cargada exitosamente', 'success');
    } catch (err) {
      showToast(`Error al subir imagen: ${(err as Error).message}`, 'error');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Items incluidos en el combo
  const handleAddItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    setFormData((prev) => ({
      ...prev,
      itemsIncluded: [...prev.itemsIncluded, trimmed],
    }));
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itemsIncluded: prev.itemsIncluded.filter((_, i) => i !== index),
    }));
  };

  // Submit Combo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      showToast('El nombre del combo es obligatorio.', 'error');
      return;
    }

    if (formData.itemsIncluded.length === 0) {
      showToast('Agregá al menos un ítem incluido en el combo.', 'error');
      return;
    }

    if (!formData.regularPrice || formData.regularPrice <= 0) {
      showToast('El precio regular debe ser mayor a 0.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: trimmedName,
        subtitle: formData.subtitle.trim(),
        items_included: formData.itemsIncluded,
        regular_price: formData.regularPrice,
        promo_price: formData.promoPrice !== null && formData.promoPrice > 0 ? formData.promoPrice : null,
        badge: formData.badge.trim() || null,
        image_url: formData.image,
        available: formData.available,
        sort_order: formData.sortOrder,
      };

      if (editingCombo) {
        const { error } = await supabase
          .from('combos')
          .update(payload)
          .eq('id', editingCombo.id);

        if (error) throw error;
        showToast(`Combo "${trimmedName}" actualizado`, 'success');
      } else {
        let targetId = generateSlug(trimmedName);
        if (combos.some((c) => c.id === targetId)) {
          targetId = `${targetId}-${Math.floor(Math.random() * 1000)}`;
        }

        const { error } = await supabase.from('combos').insert({
          id: targetId,
          ...payload,
        });

        if (error) throw error;
        showToast(`Combo "${trimmedName}" creado con éxito`, 'success');
      }

      await onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      showToast(`Error al guardar combo: ${(err as Error).message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminación o Pausa
  const handleConfirmDelete = async () => {
    if (!comboToDelete || !supabase) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('combos').delete().eq('id', comboToDelete.id);
      if (error) throw error;
      showToast(`Combo "${comboToDelete.name}" eliminado`, 'success');
      setComboToDelete(null);
      await onRefresh();
    } catch (err) {
      showToast(`Error al eliminar: ${(err as Error).message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePauseInsteadOfDelete = async () => {
    if (!comboToDelete || !supabase) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('combos')
        .update({ available: false })
        .eq('id', comboToDelete.id);
      if (error) throw error;
      showToast(`Combo "${comboToDelete.name}" pausado (Sin stock)`, 'info');
      setComboToDelete(null);
      await onRefresh();
    } catch (err) {
      showToast(`Error al pausar: ${(err as Error).message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Botón Prominente + Nuevo Combo */}
      <div className="flex items-center justify-between gap-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E5DCCB]">
        <div>
          <h2 className="text-sm font-bold text-[#1D120D]">Combos para Freezer</h2>
          <p className="text-xs text-[#6B574B]">
            {combos.length} combos activos para abastecer el freezer de tus clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Combo</span>
        </button>
      </div>

      {/* Lista de Combos */}
      <div className="space-y-3">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="bg-white border border-[#E5DCCB] rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col gap-2.5 min-w-0"
          >
            {/* Fila 1: Categoría y Badge a la izquierda, Estado a la derecha */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A653E] bg-[#5A653E]/10 px-2 py-0.5 rounded-md">
                  Combo Especial
                </span>
                {combo.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                    {combo.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                  combo.available
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {combo.available ? 'Disponible' : 'Sin stock'}
              </span>
            </div>

            {/* Fila 2: Miniatura junto a Nombre Completo y Subtítulo */}
            <div className="flex items-start gap-3 min-w-0">
              <img
                src={combo.image}
                alt={combo.name}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#E5DCCB] shrink-0 bg-[#FAF7F2]"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[#1D120D] line-clamp-2 leading-snug break-words">
                  {combo.name}
                </h3>
                <p className="text-xs text-[#6B574B] line-clamp-2 mt-0.5 break-words">
                  {combo.subtitle}
                </p>
              </div>
            </div>

            {/* Ítems incluidos preview */}
            <div className="text-xs text-[#6B574B] pt-2 border-t border-[#E5DCCB]/60 space-y-1">
              <span className="font-semibold text-[#1D120D] text-[11px]">Incluye:</span>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {combo.itemsIncluded?.map((item, idx) => (
                  <li key={idx} className="truncate">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Precios formateados con formatPriceARS */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#E5DCCB]/60 text-xs">
              <div>
                <span className="text-[11px] text-[#6B574B]">Precio regular: </span>
                <strong className={combo.promoPrice ? 'line-through text-stone-400' : 'text-[#1D120D]'}>
                  {formatPriceARS(combo.regularPrice)}
                </strong>
              </div>
              {combo.promoPrice && (
                <div>
                  <span className="text-[11px] text-[#A64B2A] font-bold">Promo: </span>
                  <strong className="text-emerald-700 font-bold text-sm">
                    {formatPriceARS(combo.promoPrice)}
                  </strong>
                </div>
              )}
            </div>

            {/* Botones de Acción: Editar protagonista (flex-1) y Eliminar compacto (w-11) */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#E5DCCB]/60">
              <button
                type="button"
                onClick={() => handleOpenEdit(combo)}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-[#E5DCCB] bg-white hover:bg-[#FAF7F2] text-xs font-bold text-[#1D120D] flex items-center justify-center gap-1.5 transition-colors shadow-2xs active:scale-98"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#A64B2A]" />
                <span>Editar combo</span>
              </button>
              <button
                type="button"
                onClick={() => setComboToDelete(combo)}
                className="w-11 h-11 shrink-0 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Eliminar combo"
                title={`Eliminar combo ${combo.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Formulario Crear / Editar Combo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF7F2] w-full max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[92dvh] rounded-2xl border border-[#E5DCCB] shadow-2xl flex flex-col overflow-x-hidden mx-auto my-auto min-w-0 animate-in fade-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-[#E5DCCB] flex items-center justify-between bg-white min-w-0 gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-[#1D120D] truncate">
                  {editingCombo ? 'Editar Combo' : 'Nuevo Combo'}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#6B574B] truncate">
                  Configurá foto, ítems y precios promocionales
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 sm:p-2 rounded-xl text-[#6B574B] hover:text-[#1D120D] hover:bg-black/5 shrink-0"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-4 text-xs min-w-0">
              {/* Foto 4:3 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                  Foto del Combo (Aspecto 4:3)
                </label>
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border-2 border-dashed border-[#E5DCCB] bg-white flex flex-col items-center justify-center group">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Preview combo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-[#6B574B]" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center p-4">
                    <label className="cursor-pointer bg-white text-[#1D120D] px-4 py-2 rounded-xl font-bold shadow-md flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#A64B2A]" />
                      <span>Elegir nueva foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={isUploadingImage}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <label className="w-full cursor-pointer min-h-[44px] bg-white border border-[#E5DCCB] text-[#1D120D] px-4 py-2.5 rounded-xl font-bold text-center flex items-center justify-center gap-2 hover:bg-[#FAF7F2]">
                  <Camera className="w-4 h-4 text-[#A64B2A]" />
                  <span>{isUploadingImage ? 'Comprimiendo WebP...' : 'Tomar foto o subir de galería'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={isUploadingImage}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Nombre */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Nombre del Combo *
                  </label>
                  <span className="text-[11px] text-[#6B574B]">{formData.name.length}/60</span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Combo Familiar Completo"
                  required
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2.5 text-sm text-[#1D120D]"
                />
              </div>

              {/* Subtítulo */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                  Subtítulo Descriptivo *
                </label>
                <textarea
                  rows={2}
                  value={formData.subtitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Ej. Abastecé tu freezer con los favoritos de la casa"
                  required
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D] resize-none"
                />
              </div>

              {/* Lista de Ítems Incluidos */}
              <div className="space-y-2 pt-2 border-t border-[#E5DCCB]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                  Ítems Incluidos en el Combo
                </label>

                <div className="space-y-1.5">
                  {formData.itemsIncluded.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E5DCCB] min-w-0"
                    >
                      <span className="text-xs text-[#1D120D] break-words min-w-0 flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Input para agregar ítem */}
                <div className="flex items-center gap-2 pt-1 min-w-0">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    placeholder="Ej. 1 kg Milanesas de Pollo"
                    className="flex-1 min-w-0 bg-white border border-[#E5DCCB] rounded-xl px-3 py-2 text-xs text-[#1D120D]"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="min-h-[38px] px-3 py-2 rounded-xl bg-[#5A653E] text-white font-bold text-xs shrink-0"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Precios: Regular y Promo opcional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#E5DCCB] items-end min-w-0">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E] block truncate">
                    Precio Regular ($) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.regularPrice}
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/\D/g, ''), 10);
                      setFormData((prev) => ({ ...prev, regularPrice: isNaN(num) ? 0 : num }));
                    }}
                    required
                    className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3 py-2 text-sm font-bold text-[#1D120D]"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A64B2A] block truncate">
                    Precio Promo ($ Opcional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Dejar vacío si no hay"
                    value={formData.promoPrice === null ? '' : formData.promoPrice}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === '') {
                        setFormData((prev) => ({ ...prev, promoPrice: null }));
                      } else {
                        const num = parseInt(val.replace(/\D/g, ''), 10);
                        setFormData((prev) => ({ ...prev, promoPrice: isNaN(num) ? null : num }));
                      }
                    }}
                    className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3 py-2 text-sm font-bold text-[#1D120D]"
                  />
                </div>
              </div>

              {/* Badge y Toggle Disponible */}
              <div className="space-y-3 pt-2 border-t border-[#E5DCCB]">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#3E271E]">
                    Badge promocional (ej. Ahorrás 15%)
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="Ej. Más Elegido, Ahorro 15%"
                    className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3 py-2 text-xs text-[#1D120D]"
                  />
                </div>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#E5DCCB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData((prev) => ({ ...prev, available: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#A64B2A] accent-[#A64B2A]"
                  />
                  <span className="font-bold text-[#1D120D] text-xs">Combo Disponible en la tienda</span>
                </label>
              </div>

              {/* Botón submit */}
              <div className="pt-4 border-t border-[#E5DCCB] sticky bottom-0 bg-[#FAF7F2] pb-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Guardando...'
                      : editingCombo
                      ? 'Guardar Cambios del Combo'
                      : 'Crear Nuevo Combo'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Eliminación de Combo */}
      {comboToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] w-full max-w-sm rounded-2xl border border-red-200 p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1D120D]">
                  ¿Eliminar "{comboToDelete.name}"?
                </h4>
                <p className="text-xs text-[#6B574B] mt-1 leading-relaxed">
                  Sugerimos pausar el stock para conservar la configuración del combo.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E5DCCB]">
              <button
                type="button"
                onClick={handlePauseInsteadOfDelete}
                disabled={isDeleting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
              >
                Pausar stock en su lugar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
              </button>

              <button
                type="button"
                onClick={() => setComboToDelete(null)}
                disabled={isDeleting}
                className="w-full py-2 text-xs font-semibold text-[#6B574B]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
