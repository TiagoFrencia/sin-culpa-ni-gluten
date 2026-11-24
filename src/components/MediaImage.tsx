import { useState, type ImgHTMLAttributes } from 'react';
import { UtensilsCrossed } from 'lucide-react';

export interface MediaImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  aspectRatioClass?: string;
  fallbackTitle?: string;
  categoryLabel?: string;
  containerClassName?: string;
  compact?: boolean;
}

export function MediaImage({
  src,
  alt,
  className = '',
  aspectRatioClass = 'aspect-4/3',
  fallbackTitle,
  categoryLabel = 'Sin TACC • Artesanal',
  containerClassName = '',
  compact = false,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: MediaImageProps) {
  const [hasError, setHasError] = useState(!src);
  const [isLoaded, setIsLoaded] = useState(false);

  const titleToDisplay = fallbackTitle || alt;

  return (
    <div
      className={`relative overflow-hidden bg-espresso-900 ${aspectRatioClass} ${containerClassName}`}
    >
      {/* Fallback elegante en tonos espresso y terracota cuando la imagen no existe o falla */}
      {hasError ? (
        compact ? (
          <div className="absolute inset-0 flex items-center justify-center bg-espresso-900 border border-cream-200/10 select-none">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-espresso-950/80 border border-terracotta-600/30 flex items-center justify-center text-terracotta-600 shadow-inner">
              <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.75]" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-b from-espresso-900 via-espresso-950 to-espresso-950 border border-cream-200/10">
            {/* Resplandor cálido sutil de fondo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(166,75,42,0.18)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 w-12 h-12 rounded-full bg-espresso-900 border border-terracotta-600/30 flex items-center justify-center text-terracotta-600 mb-3 shadow-inner">
              <UtensilsCrossed className="w-5 h-5 stroke-[1.5]" />
            </div>

            <span className="relative z-10 text-[10px] uppercase tracking-widest text-olive-600 font-semibold mb-1">
              {categoryLabel}
            </span>

            <p className="relative z-10 font-serif italic text-base sm:text-lg text-cream-50 font-medium max-w-[85%] line-clamp-2">
              {titleToDisplay}
            </p>

            <span className="relative z-10 mt-2 text-[11px] text-cream-200/60 font-sans tracking-tight">
              Cocina artesanal Río Cuarto
            </span>
          </div>
        )
      ) : (
        <>
          {/* Skeleton o fondo base mientras carga */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-espresso-900 animate-pulse flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-cream-200/20" />
            </div>
          )}

          <img
            src={src}
            alt={alt}
            loading={loading}
            decoding={decoding}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
            {...props}
          />
        </>
      )}
    </div>
  );
}

export default MediaImage;
