import React, { useState } from 'react';
import type { Product, ProductCategory, ProductVariant } from '@/types/catalog';
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
  Sparkles,
} from 'lucide-react';

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'milanesas', label: 'Milanesas' },
  { value: 'hamburguesas', label: 'Hamburguesas' },
  { value: 'empanadas', label: 'Empanadas' },
  { value: 'pizzas', label: 'Pizzas' },
  { value: 'panaderia', label: 'Panadería' },
  { value: 'especiales', label: 'Platos Especiales' },
];

interface ProductsTabProps {
  products: Product[];
  onRefresh: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface ProductFormData {
  id: string;
  name: string;
  category: ProductCategory;
  shortDescription: string;
  image: string;
  variants: ProductVariant[];
  supportsHalfKgInquiry: boolean;
  flavorOptionsRaw: string;
  cookingTip: string;
  freezerDuration: string;
  featured: boolean;
  available: boolean;
  badge: string;
  sortOrder: number;
}

const DEFAULT_FORM_DATA: ProductFormData = {
  id: '',
  name: '',
  category: 'milanesas',
  shortDescription: '',
  image: '/images/milanesas-nalga.webp',
  variants: [{ id: 'v1', label: 'x 1 kg', price: 12000 }],
  supportsHalfKgInquiry: false,
  flavorOptionsRaw: '',
  cookingTip: 'Cocinar directo del freezer en horno bien caliente a 200°C con un toque de aceite.',
  freezerDuration: 'Hasta 3 meses en freezer (-18°C)',
  featured: false,
  available: true,
  badge: '',
  sortOrder: 10,
};

function generateSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return clean || `producto-${Date.now()}`;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  onRefresh,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(DEFAULT_FORM_DATA);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Diálogo de confirmación de eliminación
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      ...DEFAULT_FORM_DATA,
      id: '',
      sortOrder: products.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      id: prod.id,
      name: prod.name,
      category: prod.category,
      shortDescription: prod.shortDescription,
      image: prod.image,
      variants: prod.variants && prod.variants.length > 0
        ? JSON.parse(JSON.stringify(prod.variants))
        : [{ id: 'v1', label: 'Unidad', price: 0 }],
      supportsHalfKgInquiry: Boolean(prod.supportsHalfKgInquiry),
      flavorOptionsRaw: Array.isArray(prod.flavorOptions) ? prod.flavorOptions.join(', ') : '',
      cookingTip: prod.cookingTip || '',
      freezerDuration: prod.freezerDuration || 'Hasta 3 meses en freezer (-18°C)',
      featured: Boolean(prod.featured),
      available: Boolean(prod.available),
      badge: prod.badge || '',
      sortOrder: prod.sortOrder ?? 0,
    });
    setIsModalOpen(true);
  };

  // Manejo de subida de imagen con compresión WebP 4:3
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      showToast('Comprimiendo y optimizando imagen WebP 4:3...', 'info');
      const publicUrl = await compressAndUploadImage(file, 'products');
      setFormData((prev) => ({ ...prev, image: publicUrl }));
      showToast('Foto cargada y comprimida exitosamente', 'success');
    } catch (err) {
      showToast(`Error al subir imagen: ${(err as Error).message}`, 'error');
    } finally {
      setIsUploadingImage(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Variantes
  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { id: `v${Date.now()}`, label: 'Nueva variante', price: 0 },
      ],
    }));
  };

  const handleRemoveVariant = (index: number) => {
    if (formData.variants.length <= 1) {
      showToast('El producto debe tener al menos una variante o precio.', 'info');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleVariantChange = (
    index: number,
    field: 'label' | 'price' | 'isConsult',
    value: string | boolean | number
  ) => {
    const next = [...formData.variants];
    if (field === 'label') {
      next[index] = { ...next[index], label: String(value) };
    } else if (field === 'isConsult') {
      next[index] = { ...next[index], price: value ? null : 0 };
    } else if (field === 'price') {
      const num = parseInt(String(value).replace(/\D/g, ''), 10);
      next[index] = { ...next[index], price: isNaN(num) ? 0 : num };
    }
    setFormData((prev) => ({ ...prev, variants: next }));
  };

  // Guardar formulario (Crear o Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      showToast('El nombre del producto es obligatorio.', 'error');
      return;
    }

    if (formData.variants.length === 0) {
      showToast('Debés definir al menos una variante de precio.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const flavorsArray = formData.flavorOptionsRaw
        ? formData.flavorOptionsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

      const payload = {
        name: trimmedName,
        category: formData.category,
        short_description: formData.shortDescription.trim(),
        image_url: formData.image,
        variants: formData.variants,
        supports_half_kg_inquiry: formData.supportsHalfKgInquiry,
        flavor_options: flavorsArray && flavorsArray.length > 0 ? flavorsArray : null,
        cooking_tip: formData.cookingTip.trim(),
        freezer_duration: formData.freezerDuration.trim(),
        featured: formData.featured,
        available: formData.available,
        badge: formData.badge.trim() || null,
        sort_order: formData.sortOrder,
      };

      if (editingProduct) {
        // Actualizar
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);

        if (error) throw error;
        showToast(`Producto "${trimmedName}" actualizado`, 'success');
      } else {
        // Crear nuevo
        let targetId = generateSlug(trimmedName);
        // Verificar colisión
        if (products.some((p) => p.id === targetId)) {
          targetId = `${targetId}-${Math.floor(Math.random() * 1000)}`;
        }

        const { error } = await supabase.from('products').insert({
          id: targetId,
          ...payload,
        });

        if (error) throw error;
        showToast(`Producto "${trimmedName}" creado con éxito`, 'success');
      }

      await onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      showToast(`Error al guardar: ${(err as Error).message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminación o Pausado
  const handleConfirmDelete = async () => {
    if (!productToDelete || !supabase) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (error) throw error;
      showToast(`Producto "${productToDelete.name}" eliminado`, 'success');
      setProductToDelete(null);
      await onRefresh();
    } catch (err) {
      showToast(`Error al eliminar: ${(err as Error).message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePauseInsteadOfDelete = async () => {
    if (!productToDelete || !supabase) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('products')
        .update({ available: false })
        .eq('id', productToDelete.id);
      if (error) throw error;
      showToast(`Producto "${productToDelete.name}" pausado (Sin stock)`, 'info');
      setProductToDelete(null);
      await onRefresh();
    } catch (err) {
      showToast(`Error al pausar: ${(err as Error).message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Botón Prominente + Nuevo Producto */}
      <div className="flex items-center justify-between gap-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E5DCCB]">
        <div>
          <h2 className="text-sm font-bold text-[#1D120D]">Catálogo de Productos</h2>
          <p className="text-xs text-[#6B574B]">
            {products.length} productos registrados. Podés crear nuevos o editar fotos y datos.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Producto</span>
        </button>
      </div>

      {/* Lista de Productos */}
      <div className="space-y-3">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="bg-white border border-[#E5DCCB] rounded-2xl p-4 shadow-xs flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-14 h-14 rounded-xl object-cover border border-[#E5DCCB] shrink-0 bg-[#FAF7F2]"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64B2A]">
                      {CATEGORY_OPTIONS.find((c) => c.value === prod.category)?.label || prod.category}
                    </span>
                    {prod.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                        {prod.badge}
                      </span>
                    )}
                    {prod.featured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5A653E]/10 text-[#5A653E] font-semibold flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> Destacado
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#1D120D] truncate mt-0.5">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-[#6B574B] line-clamp-1 mt-0.5">
                    {prod.shortDescription}
                  </p>
                </div>
              </div>

              {/* Estado */}
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                  prod.available
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {prod.available ? 'Disponible' : 'Sin stock'}
              </span>
            </div>

            {/* Variantes breves */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-[#6B574B] pt-2 border-t border-[#E5DCCB]/60">
              <span className="font-semibold text-[#1D120D]">Precios:</span>
              {prod.variants?.map((v, i) => (
                <span key={i} className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E5DCCB]/60">
                  {v.label}: <strong className="text-[#1D120D]">{v.price !== null ? `$${v.price}` : 'Consultar'}</strong>
                </span>
              ))}
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DCCB]/60">
              <button
                type="button"
                onClick={() => handleOpenEdit(prod)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#E5DCCB] hover:bg-[#FAF7F2] text-xs font-bold text-[#1D120D] flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#A64B2A]" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => setProductToDelete(prod)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-xs font-bold text-red-700 flex items-center gap-1.5 transition-colors"
                aria-label={`Eliminar ${prod.name}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Pantalla Completa Móvil de Edición / Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FAF7F2] w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-2xl border border-[#E5DCCB] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
            {/* Header del Modal */}
            <div className="p-4 border-b border-[#E5DCCB] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-base font-bold text-[#1D120D]">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <p className="text-xs text-[#6B574B]">
                  {editingProduct ? `ID: ${editingProduct.id}` : 'Completá los campos sin riesgo de romper el diseño'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#6B574B] hover:text-[#1D120D] hover:bg-black/5"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable del formulario */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* 1. FOTO: Selector + Preview 4:3 + Compresión WebP */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                  Foto del Producto (Aspecto 4:3)
                </label>
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border-2 border-dashed border-[#E5DCCB] bg-white flex flex-col items-center justify-center group">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Preview del producto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="w-8 h-8 text-[#6B574B] mx-auto mb-1" />
                      <p className="text-xs text-[#6B574B]">Sin foto asignada</p>
                    </div>
                  )}

                  {/* Overlay para cambiar foto */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 sm:transition-opacity flex items-center justify-center p-4">
                    <label className="cursor-pointer bg-white text-[#1D120D] px-4 py-2 rounded-xl font-bold shadow-md flex items-center gap-2 hover:bg-[#FAF7F2]">
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

                {/* Botón táctil móvil directo para cambiar foto */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="w-full cursor-pointer min-h-[44px] bg-white border border-[#E5DCCB] text-[#1D120D] px-4 py-2.5 rounded-xl font-bold text-center flex items-center justify-center gap-2 hover:bg-[#FAF7F2] active:scale-98">
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
                <p className="text-[11px] text-[#6B574B]">
                  Se ajusta y centra automáticamente a proporción 4:3 en formato WebP liviano.
                </p>
              </div>

              {/* 2. NOMBRE: Máx. 60 caracteres con contador */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Nombre del Producto *
                  </label>
                  <span
                    className={`text-[11px] font-semibold ${
                      formData.name.length >= 60 ? 'text-red-600 font-bold' : 'text-[#6B574B]'
                    }`}
                  >
                    {formData.name.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Milanesas de Suprema de Pollo"
                  required
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2.5 text-sm text-[#1D120D] focus:outline-none focus:ring-2 focus:ring-[#A64B2A]"
                />
              </div>

              {/* 3. CATEGORÍA: <select> cerrado con 6 categorías estrictas */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                  Categoría *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value as ProductCategory }))
                  }
                  required
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2.5 text-sm text-[#1D120D] focus:outline-none focus:ring-2 focus:ring-[#A64B2A]"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. DESCRIPCIÓN CORTA: Máx. 150 caracteres con contador */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Descripción Corta *
                  </label>
                  <span
                    className={`text-[11px] font-semibold ${
                      formData.shortDescription.length >= 150 ? 'text-red-600 font-bold' : 'text-[#6B574B]'
                    }`}
                  >
                    {formData.shortDescription.length}/150
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={150}
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
                  }
                  placeholder="Tiernas milanesas rebozadas con mezcla 100% libre de gluten..."
                  required
                  className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-sm text-[#1D120D] focus:outline-none focus:ring-2 focus:ring-[#A64B2A]"
                />
              </div>

              {/* 5. VARIANTES Y PRECIOS: Editor dinámico con checkbox consultar */}
              <div className="space-y-2 pt-2 border-t border-[#E5DCCB]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                    Variantes y Precios
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs font-bold text-[#A64B2A] hover:underline flex items-center gap-1 p-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Agregar variante
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.variants.map((variant, idx) => (
                    <div
                      key={variant.id || idx}
                      className="bg-white p-3 rounded-xl border border-[#E5DCCB] space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={variant.label}
                          onChange={(e) => handleVariantChange(idx, 'label', e.target.value)}
                          placeholder="Etiqueta (ej. x 1 kg, Docena, Unidad)"
                          className="flex-1 bg-[#FAF7F2] border border-[#E5DCCB] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#1D120D]"
                          required
                        />
                        {formData.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Quitar variante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#6B574B]">
                          <input
                            type="checkbox"
                            checked={variant.price === null}
                            onChange={(e) => handleVariantChange(idx, 'isConsult', e.target.checked)}
                            className="w-4 h-4 rounded text-[#A64B2A] accent-[#A64B2A]"
                          />
                          <span>Consultar precio por WhatsApp</span>
                        </label>

                        {variant.price !== null && (
                          <div className="relative flex items-center w-28">
                            <span className="absolute left-2.5 text-xs font-bold text-[#6B574B]">$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={variant.price}
                              onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                              placeholder="0"
                              className="w-full bg-[#FAF7F2] border border-[#E5DCCB] rounded-lg pl-6 pr-2 py-1 text-xs font-bold text-[#1D120D]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. OPCIONES EXTRA */}
              <div className="space-y-3 pt-2 border-t border-[#E5DCCB]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3E271E]">
                  Detalles y Opciones Extra
                </h4>

                {/* Toggle Pack 500g */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5DCCB] cursor-pointer">
                  <div>
                    <span className="font-bold text-[#1D120D] text-xs">Acepta consulta pack 500g</span>
                    <p className="text-[11px] text-[#6B574B]">Muestra en la web botón para consultar por 500 gramos</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.supportsHalfKgInquiry}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, supportsHalfKgInquiry: e.target.checked }))
                    }
                    className="w-5 h-5 rounded text-[#A64B2A] accent-[#A64B2A]"
                  />
                </label>

                {/* Sabores opcionales */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#3E271E]">
                    Sabores disponibles (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={formData.flavorOptionsRaw}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, flavorOptionsRaw: e.target.value }))
                    }
                    placeholder="Ej. Saladas, Dulces, Surtidas"
                    className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D]"
                  />
                </div>

                {/* Tip de cocción */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#3E271E]">Tip de cocción</label>
                  <input
                    type="text"
                    value={formData.cookingTip}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cookingTip: e.target.value }))
                    }
                    placeholder="Al horno directo del freezer a 200°C por 15 min..."
                    className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D]"
                  />
                </div>

                {/* Duración en freezer */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#3E271E]">Duración en freezer</label>
                  <input
                    type="text"
                    value={formData.freezerDuration}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, freezerDuration: e.target.value }))
                    }
                    placeholder="Hasta 3 meses en freezer (-18°C)"
                    className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D]"
                  />
                </div>

                {/* Badge opcional (máx 20 chars) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#3E271E]">Badge opcional</label>
                    <span className="text-[10px] text-[#6B574B]">{formData.badge.length}/20</span>
                  </div>
                  <input
                    type="text"
                    maxLength={20}
                    value={formData.badge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="Ej. Corte Premium, Más Pedido"
                    className="w-full bg-white border border-[#E5DCCB] rounded-xl px-3.5 py-2 text-xs text-[#1D120D]"
                  />
                </div>

                {/* Toggles Destacado y Disponible */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#E5DCCB] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, featured: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-[#A64B2A] accent-[#A64B2A]"
                    />
                    <span className="font-bold text-[#1D120D] text-xs">Destacado</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#E5DCCB] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.available}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, available: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-[#A64B2A] accent-[#A64B2A]"
                    />
                    <span className="font-bold text-[#1D120D] text-xs">Disponible</span>
                  </label>
                </div>
              </div>

              {/* Botón Guardar en modal */}
              <div className="pt-4 border-t border-[#E5DCCB] sticky bottom-0 bg-[#FAF7F2] pb-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Guardando en Supabase...'
                      : editingProduct
                      ? 'Guardar Cambios del Producto'
                      : 'Crear Nuevo Producto'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación de Eliminación */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] w-full max-w-sm rounded-2xl border border-red-200 p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1D120D]">
                  ¿Eliminar "{productToDelete.name}"?
                </h4>
                <p className="text-xs text-[#6B574B] mt-1 leading-relaxed">
                  Te sugerimos <strong>pausar el stock</strong> ("Sin stock") para mantener la foto y los detalles sin que los clientes puedan pedirlo.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E5DCCB]">
              <button
                type="button"
                onClick={handlePauseInsteadOfDelete}
                disabled={isDeleting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors flex items-center justify-center gap-2"
              >
                <span>Pausar stock en su lugar (Recomendado)</span>
              </button>

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
                onClick={() => setProductToDelete(null)}
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
