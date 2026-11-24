import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStore?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStore }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor completá tu correo y contraseña.');
      return;
    }

    if (!supabase) {
      setErrorMessage('La conexión con Supabase no está configurada.');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('invalid login credentials') ||
          error.message.toLowerCase().includes('invalid grant')
        ) {
          setErrorMessage('Email o contraseña incorrectos. Por favor verificá tus datos.');
        } else if (error.message.toLowerCase().includes('rate limit')) {
          setErrorMessage('Demasiados intentos fallidos. Por favor esperá unos minutos.');
        } else {
          setErrorMessage(error.message || 'Error al iniciar sesión.');
        }
        return;
      }

      if (data.user) {
        onLoginSuccess();
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Ocurrió un error inesperado al conectar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToStore = () => {
    if (onBackToStore) {
      onBackToStore();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-paper-texture flex flex-col justify-center items-center px-4 py-8 text-[#3E271E]">
      {/* Botón flotante superior para volver */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          type="button"
          onClick={handleReturnToStore}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#6B574B] hover:text-[#A64B2A] transition-colors py-2 px-3 rounded-lg hover:bg-black/5"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la tienda
        </button>
        <span className="text-xs text-[#6B574B] flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Acceso Seguro
        </span>
      </div>

      {/* Tarjeta de Login */}
      <div className="w-full max-w-md bg-[#FAF7F2] border border-[#E5DCCB] rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Header de la marca */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#A64B2A]/10 text-[#A64B2A] mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1D120D] tracking-tight">
            Sin Culpa Ni Gluten
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#A64B2A] font-bold mt-1">
            Panel de Administración
          </p>
          <p className="text-xs text-[#6B574B] mt-2">
            Ingresá con tu cuenta para actualizar precios, stock y productos desde el celular.
          </p>
        </div>

        {/* Alerta de Error */}
        {errorMessage && (
          <div
            className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2 animate-in fade-in"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold uppercase tracking-wider text-[#3E271E] mb-1.5"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B574B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sinculpanigluten.com"
                required
                autoComplete="email"
                autoCapitalize="none"
                className="w-full bg-white border border-[#E5DCCB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1D120D] placeholder:text-[#6B574B]/50 focus:outline-none focus:ring-2 focus:ring-[#A64B2A] focus:border-[#A64B2A] transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold uppercase tracking-wider text-[#3E271E] mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B574B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-white border border-[#E5DCCB] rounded-xl pl-10 pr-11 py-2.5 text-sm text-[#1D120D] placeholder:text-[#6B574B]/50 focus:outline-none focus:ring-2 focus:ring-[#A64B2A] focus:border-[#A64B2A] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#6B574B] hover:text-[#1D120D] transition-colors rounded-lg"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#A64B2A] hover:bg-[#8C3D21] active:bg-[#78341B] shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5DCCB]/60 text-center">
          <p className="text-[11px] text-[#6B574B]">
            Exclusivo para dueños y administradores de Sin Culpa Ni Gluten.
          </p>
        </div>
      </div>
    </div>
  );
};
