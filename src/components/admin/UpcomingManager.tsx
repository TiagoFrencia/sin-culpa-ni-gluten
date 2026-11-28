import React, { useState } from 'react';
import type { UpcomingItem } from '@/types/catalog';
import { supabase } from '@/lib/supabase';
import { compressAndUploadImage, deleteOldCatalogImage } from '@/utils/imageUpload';
import {
  Edit2,
  Trash2,
  Camera,
  X,
  Check,
  AlertTriangle,
  Upload,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ImageOff,
} from 'lucide-react';

interface UpcomingManagerProps {
  items: UpcomingItem[];
  onRefresh: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface UpcomingFormData {
  title: string;
  badge: string;
  description: string;
  active: boolean;
  imageUrl: string | null;
  sortOrder: number;
}

const BADGE_SUGGESTIONS = ['Próximamente', 'Muy pronto', 'En desarrollo', 'Nuevo ingreso'];

const DEFAULT_UPCOMING_FORM: UpcomingFormData = {
  title: '',
  badge: 'Próximamente',
  description: '',
  active: true,
  imageUrl: null,
  sortOrder: 10,
};

export const UpcomingManager: React.FC<UpcomingManagerProps> = ({
  items,
  onRefresh,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UpcomingItem | null>(null);
  const [formData, setFormData] = useState<UpcomingFormData>(DEFAULT_UPCOMING_FORM);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<UpcomingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreate = () => {
    const nextOrder =
      items.length > 0 ? Math.max(...items.map((i) => i.sortOrder ?? 0)) + 10 : 10;
    setEditingItem(null);
    setFormData({
      ...DEFAULT_UPCOMING_FORM,
      sortOrder: nextOrder,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: UpcomingItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      badge: item.badge || 'Próximamente',
      description: item.description || '',
      active: Boolean(item.active),
      imageUrl: item.imageUrl ?? null,
      sortOrder: item.sortOrder ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleToggleVisible = async (item: UpcomingItem) => {
    if (!supabase || togglingId) return;
    const nextActive = !item.active;

    try {
      setTogglingId(item.id);
      const { error } = await supabase
        .from('upcoming_items')
        .update({ active: nextActive })
        .eq('id', item.id);

      if (error) throw error;
      showToast(
        nextActive
          ? `"${item.title}" ahora está visible en la tienda`
          : `"${item.title}" ocultado de la tienda`,
        nextActive ? 'success' : 'info'
      );
      await onRefresh();
    } catch (err) {
      showToast(`Error al cambiar visibilidad: ${(err as Error).message}`, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!supabase) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[index];
    const target = items[targetIndex];

    try {
      setIsReordering(true);
      let currentOrder = current.sortOrder ?? index * 10;
      let targetOrder = target.sortOrder ?? targetIndex * 10;
      if (currentOrder === targetOrder) {
        currentOrder = index * 10;
        targetOrder = targetIndex * 10;
      }

      const [resA, resB] = await Promise.all([
        supabase.from('upcoming_items').update({ sort_order: targetOrder }).eq('id', current.id),
        supabase.from('upcoming_items').update({ sort_order: currentOrder }).eq('id', target.id),
      ]);

      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      showToast(`Posición de "${current.title}" actualizada`, 'success');
      await onRefresh();
    } catch (err) {
      showToast(`Error al reordenar: ${(err as Error).message}`, 'error');
    } finally {
      setIsReordering(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      showToast('Comprimiendo y optimizando imagen WebP 4:3...', 'info');
      const publicUrl = await compressAndUploadImage(file, 'upcoming');
      setFormData((prev) => ({ ...prev, imageUrl: publicUrl }));
      showToast('Foto cargada y comprimida exitosamente', 'success');
    } catch (err) {
      showToast(`Error al subir imagen: ${(err as Error).message}`, 'error');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      showToast('El nombre del próximo ingreso es obligatorio.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        title: trimmedTitle,
        badge: formData.badge.trim() || 'Próximamente',
        description: formData.description.trim(),
        active: formData.active,
        image_url: formData.imageUrl || null,
        sort_order: formData.sortOrder,
      };

      if (editingItem) {
        if (editingItem.imageUrl && editingItem.imageUrl !== formData.imageUrl) {
          await deleteOldCatalogImage(editingItem.imageUrl);
        }

        const { error } = await supabase
          .from('upcoming_items')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        showToast(`"${trimmedTitle}" actualizado`, 'success');
      } else {
        const { error } = await supabase.from('upcoming_items').insert(payload);

        if (error) throw error;
        showToast(`"${trimmedTitle}" agregado a Próximamente`, 'success');
      }

      await onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      showToast(`Error al guardar: ${(err as Error).message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !supabase) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('upcoming_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      if (itemToDelete.imageUrl) {
        await deleteOldCatalogImage(itemToDelete.imageUrl);
      }

      showToast(`"${itemToDelete.title}" eliminado`, 'success');
      setItemToDelete(null);
      await onRefresh();
    } catch (err) {
      showToast(`Error al eliminar: ${(err as Error).message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-16 min-w-0">
      {/* Cabecera y botón principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E5DCCB] min-w-0">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#1D120D]">Próximamente · Nuevos ingresos</h2>
          <p className="text-xs text-[#6B574B] mt-0.5">
            Adelantá nuevos platos Sin Gluten sin cargar precio ni foto obligatoria.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0"
        >
          <span>+ Agregar próximo ingreso</span>
        </button>
      </div>

      {/* Lista de Próximos Ingresos */}
      {items.length === 0 ? (
        <div className="bg-white border border-[#E5DCCB] rounded-2xl p-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#E5DCCB] text-[#A64B2A] flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#1D120D]">No hay próximos ingresos cargados</h3>
          <p className="text-xs text-[#6B574B] max-w-sm mx-auto leading-relaxed">
            Cuando no hay ítems visibles, la sección desaparece automáticamente de la tienda. Tocá el botón para anunciar una novedad.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isToggling = togglingId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white border border-[#E5DCCB] rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col gap-2.5 min-w-0"
              >
                {/* Fila 1: Etiqueta a la izquierda, Switch Visible / Oculto a la derecha */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64B2A] bg-[#A64B2A]/10 px-2 py-0.5 rounded-md truncate max-w-[55%]">
                    {item.badge || 'Próximamente'}
                  </span>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.active}
                    aria-label={`${item.title}: ${item.active ? 'Visible' : 'Oculto'}`}
                    disabled={isToggling}
                    onClick={() => handleToggleVisible(item)}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors shrink-0 active:scale-95 disabled:opacity-60 ${
                      item.active
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-stone-100 border-stone-300 text-stone-600'
                    }`}
                  >
                    <span
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                        item.active ? 'bg-emerald-600 justify-end' : 'bg-stone-400 justify-start'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                    </span>
                    <span>{item.active ? 'Visible' : 'Oculto'}</span>
                  </button>
                </div>

                {/* Fila 2: Miniatura opcional + Nombre completo + Descripción */}
                <div className="flex items-start gap-3 min-w-0">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#E5DCCB] shrink-0 bg-[#FAF7F2]"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#1D120D] line-clamp-2 leading-snug break-words">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="text-xs text-[#6B574B] line-clamp-2 mt-0.5 break-words">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#6B574B]/70 italic mt-0.5">
                        Sin descripción breve
                      </p>
                    )}
                  </div>
                </div>

                {/* Fila 3: Editar, Reordenar (↑ / ↓) y Eliminar compacto */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-[#E5DCCB]/60">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="flex-1 min-h-[44px] px-2.5 py-2 rounded-xl border border-[#E5DCCB] bg-white hover:bg-[#FAF7F2] text-xs font-bold text-[#1D120D] flex items-center justify-center gap-1 transition-colors shadow-2xs active:scale-98 min-w-0"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#A64B2A] shrink-0" />
                    <span className="truncate">Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveOrder(idx, 'up')}
                    disabled={idx === 0 || isReordering}
                    aria-label={`Subir posición de ${item.title}`}
                    title="Subir posición"
                    className="w-10 h-11 shrink-0 rounded-xl border border-[#E5DCCB] bg-white hover:bg-[#FAF7F2] text-[#1D120D] flex items-center justify-center transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveOrder(idx, 'down')}
                    disabled={idx === items.length - 1 || isReordering}
                    aria-label={`Bajar posición de ${item.title}`}
                    title="Bajar posición"
                    className="w-10 h-11 shrink-0 rounded-xl border border-[#E5DCCB] bg-white hover:bg-[#FAF7F2] text-[#1D120D] flex items-center justify-center transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToDelete(item)}
                    className="w-10 h-11 shrink-0 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 flex items-center justify-center transition-colors active:scale-95"
                    aria-label="Eliminar próximo ingreso"
                    title={`Eliminar ${item.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Mobile-First Crear / Editar Próximo Ingreso */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF7F2] w-full max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[92dvh] rounded-2xl border border-[#E5DCCB] shadow-2xl flex flex-col overflow-x-hidden mx-auto my-auto min-w-0 animate-in fade-in zoom-in-95">
            {/* Header del Modal */}
            <div className="p-3.5 sm:p-4 border-b border-[#E5DCCB] flex items-center justify-between bg-white min-w-0 gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-[#1D120D] truncate">
                  {editingItem ? 'Editar Próximo Ingreso' : 'Nuevo Próximo Ingreso'}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#6B574B] truncate">
                  Adelantá novedades 100% Sin Gluten (sin precio requerido)
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

            {/* Formulario */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-4 text-xs min-w-0"
            >
              {/* Nombre (requerido) */}
              <div className="space-y-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Nombre *
                  </label>
                  <span className="text-[11px] font-semibold text-[#6B574B] shrink-0">
                    {formData.title.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej. Tarta de Pollo"
                  required
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2.5 text-sm text-[#1D120D] focus:outline-none focus:ring-2 focus:ring-[#A64B2A]"
                />
              </div>

              {/* Etiqueta corta */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Etiqueta corta
                  </label>
                  <span className="text-[11px] font-semibold text-[#6B574B] shrink-0">
                    {formData.badge.length}/24
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={24}
                  value={formData.badge}
                  onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                  placeholder="Ej. Próximamente, Muy pronto, Nuevo ingreso"
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D] focus:outline-none focus:ring-2 focus:ring-[#A64B2A]"
                />
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, badge: suggestion }))}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        formData.badge === suggestion
                          ? 'bg-[#A64B2A] text-white border-[#A64B2A]'
                          : 'bg-white text-[#6B574B] border-[#E5DCCB] hover:text-[#1D120D]'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción corta */}
              <div className="space-y-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Descripción corta
                  </label>
                  <span className="text-[11px] font-semibold text-[#6B574B] shrink-0">
                    {formData.description.length}/160
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={160}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej. Masa casera 100% Sin Gluten con relleno cremoso de pollo y vegetales."
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-sm text-[#1D120D] focus:outline-none focus:ring-2 focus:ring-[#A64B2A]"
                />
              </div>

              {/* Switch Visible */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E5DCCB] min-w-0">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[#1D120D] text-xs block">
                    Visible en la tienda
                  </span>
                  <p className="text-[11px] text-[#6B574B]">
                    Si lo ocultás, no aparece en la web pública.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.active}
                  aria-label="Visible en la tienda"
                  onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold transition-colors shrink-0 ${
                    formData.active
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-stone-100 border-stone-300 text-stone-600'
                  }`}
                >
                  <span
                    className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                      formData.active ? 'bg-emerald-600 justify-end' : 'bg-stone-400 justify-start'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  </span>
                  <span>{formData.active ? 'Visible' : 'Oculto'}</span>
                </button>
              </div>

              {/* Foto OPCIONAL (WebP 4:3) */}
              <div className="space-y-2 pt-2 border-t border-[#E5DCCB] min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Foto (Opcional · Aspecto 4:3)
                  </label>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: null }))}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Quitar foto</span>
                    </button>
                  )}
                </div>

                {formData.imageUrl ? (
                  <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-[#E5DCCB] bg-white group">
                    <img
                      src={formData.imageUrl}
                      alt="Preview próximo ingreso"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 sm:transition-opacity flex items-center justify-center p-4">
                      <label className="cursor-pointer bg-white text-[#1D120D] px-4 py-2 rounded-xl font-bold shadow-md flex items-center gap-2 hover:bg-[#FAF7F2]">
                        <Upload className="w-4 h-4 text-[#A64B2A]" />
                        <span>Cambiar foto</span>
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
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-[#E5DCCB] bg-white p-4 text-center space-y-1">
                    <ImageOff className="w-6 h-6 text-[#6B574B]/70 mx-auto" />
                    <p className="text-xs font-semibold text-[#1D120D]">
                      Sin foto (opcional)
                    </p>
                    <p className="text-[11px] text-[#6B574B]">
                      Si no subís foto, se mostrará como una tarjeta editorial limpia.
                    </p>
                  </div>
                )}

                <label className="w-full cursor-pointer min-h-[44px] bg-white border border-[#E5DCCB] text-[#1D120D] px-4 py-2.5 rounded-xl font-bold text-center flex items-center justify-center gap-2 hover:bg-[#FAF7F2] active:scale-98">
                  <Camera className="w-4 h-4 text-[#A64B2A] shrink-0" />
                  <span>
                    {isUploadingImage
                      ? 'Comprimiendo WebP...'
                      : formData.imageUrl
                      ? 'Reemplazar foto'
                      : 'Subir foto opcional'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={isUploadingImage}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Botón Guardar */}
              <div className="pt-3 border-t border-[#E5DCCB] sticky bottom-0 bg-[#FAF7F2] pb-1 shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] shadow-sm disabled:opacity-60 flex items-center justify-center gap-2 active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Guardando en Supabase...'
                      : editingItem
                      ? 'Guardar Cambios'
                      : 'Guardar Próximo Ingreso'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación de Eliminación */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] w-full max-w-sm rounded-2xl border border-red-200 p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[#1D120D] break-words">
                  ¿Eliminar "{itemToDelete.title}"?
                </h4>
                <p className="text-xs text-[#6B574B] mt-1 leading-relaxed">
                  Si solo querés ocultarlo por unos días, podés desactivar el switch Visible en la tarjeta.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E5DCCB]">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors flex items-center justify-center gap-2"
              >
                <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar definitivamente'}</span>
              </button>

              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="w-full py-2 text-xs font-semibold text-[#6B574B] hover:text-[#1D120D]"
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
