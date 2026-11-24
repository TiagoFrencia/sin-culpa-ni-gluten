import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCatalog } from '@/context/CatalogContext';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { PriceStockTab } from '@/components/admin/PriceStockTab';
import { ProductsTab } from '@/components/admin/ProductsTab';
import { CombosTab } from '@/components/admin/CombosTab';
import { BusinessSettingsTab } from '@/components/admin/BusinessSettingsTab';
import { AdminToast, type ToastMessage } from '@/components/admin/AdminToast';
import {
  Zap,
  UtensilsCrossed,
  Layers,
  Store,
  ExternalLink,
  LogOut,
  RefreshCw,
} from 'lucide-react';

type AdminTab = 'express' | 'products' | 'combos' | 'business';

export const AdminPage: React.FC = () => {
  const { products, combos, business, refreshCatalog, isLoading: isCatalogLoading } = useCatalog();

  // Estado de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => (!supabase ? false : null));
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Pestaña activa (Modo Express inicial por defecto)
  const [activeTab, setActiveTab] = useState<AdminTab>('express');

  // Sistema de Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Verificar sesión existente con Supabase
  useEffect(() => {
    if (!supabase) {
      return;
    }

    // Comprobar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || null);
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    });

    // Suscribirse a cambios de estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || null);
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUserEmail(null);
    showToast('Sesión cerrada correctamente', 'info');
  };

  // 1. Pantalla de carga mientras se verifica sesión
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-paper-texture flex flex-col items-center justify-center p-6 text-[#1D120D]">
        <div className="w-8 h-8 border-3 border-[#A64B2A]/30 border-t-[#A64B2A] rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wider uppercase text-[#6B574B]">
          Verificando credenciales...
        </p>
      </div>
    );
  }

  // 2. Pantalla de Login si no está autenticado
  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          showToast('¡Bienvenido al Panel de Administración!', 'success');
        }}
        onBackToStore={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-paper-texture text-[#1D120D] flex flex-col selection:bg-[#A64B2A] selection:text-white">
      {/* Cabecera Fija Móvil-First */}
      <header className="sticky top-0 z-30 bg-[#1D120D] text-[#FAF7F2] border-b border-black/20 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Logo y Badge */}
          <div className="flex items-center gap-2">
            <div>
              <h1 className="font-serif text-sm sm:text-base font-bold tracking-tight text-[#FAF7F2] leading-none">
                Sin Culpa Ni Gluten
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64B2A] bg-black/40 px-1.5 py-0.2 rounded">
                  Admin
                </span>
                <span className="text-[10px] text-stone-400 truncate max-w-[120px] sm:max-w-[200px]">
                  {userEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones de Cabecera: Ver tienda y Cerrar Sesión */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshCatalog()}
              className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Refrescar catálogo"
              aria-label="Refrescar catálogo"
            >
              <RefreshCw className={`w-4 h-4 ${isCatalogLoading ? 'animate-spin text-[#A64B2A]' : ''}`} />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF7F2] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10 active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-terracotta-400" />
              <span className="hidden sm:inline">Ver tienda</span>
              <span className="sm:hidden">Tienda</span>
            </a>

            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-red-800/40 active:scale-95"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* 4 Pestañas Superiores pensadas para el dedo */}
        <nav
          className="max-w-2xl mx-auto px-2 border-t border-white/10 flex items-center justify-between"
          aria-label="Navegación del panel de administración"
        >
          <button
            type="button"
            onClick={() => setActiveTab('express')}
            className={`flex-1 min-h-[44px] py-2.5 px-1 text-center font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'express'
                ? 'border-[#A64B2A] text-white bg-white/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'express' ? 'text-[#A64B2A]' : ''}`} />
            <span className="truncate">Precios y Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex-1 min-h-[44px] py-2.5 px-1 text-center font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'border-[#A64B2A] text-white bg-white/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <UtensilsCrossed className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'products' ? 'text-[#A64B2A]' : ''}`} />
            <span className="truncate">Productos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('combos')}
            className={`flex-1 min-h-[44px] py-2.5 px-1 text-center font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'combos'
                ? 'border-[#A64B2A] text-white bg-white/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'combos' ? 'text-[#A64B2A]' : ''}`} />
            <span className="truncate">Combos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`flex-1 min-h-[44px] py-2.5 px-1 text-center font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'business'
                ? 'border-[#A64B2A] text-white bg-white/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Store className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'business' ? 'text-[#A64B2A]' : ''}`} />
            <span className="truncate">Negocio</span>
          </button>
        </nav>
      </header>

      {/* Contenido Principal con límite de ancho responsivo y sin scroll horizontal */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 overflow-x-hidden">
        {activeTab === 'express' && (
          <PriceStockTab
            products={products}
            combos={combos}
            onRefresh={refreshCatalog}
            showToast={showToast}
          />
        )}

        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            onRefresh={refreshCatalog}
            showToast={showToast}
          />
        )}

        {activeTab === 'combos' && (
          <CombosTab
            combos={combos}
            onRefresh={refreshCatalog}
            showToast={showToast}
          />
        )}

        {activeTab === 'business' && (
          <BusinessSettingsTab
            business={business}
            onRefresh={refreshCatalog}
            showToast={showToast}
          />
        )}
      </main>

      {/* Toasts de feedback táctil */}
      <AdminToast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};

export default AdminPage;
