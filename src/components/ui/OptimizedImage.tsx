/**
 * Componente de imagen optimizada con lazy loading avanzado
 * Soporte para WebP, AVIF, placeholders y responsive images
 */

import React, { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react';
import { useIntersectionObserver } from '@/utils/performance';
import { trackCustomMetric } from '@/utils/analytics';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty' | 'skeleton';
  blurDataURL?: string;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  fallback?: string;
  formats?: ('webp' | 'avif' | 'jpg' | 'png')[];
  breakpoints?: { width: number; quality?: number }[];
}

interface ImageState {
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  currentSrc: string;
}

// Utilidades para generar URLs optimizadas
const generateOptimizedUrl = (
  src: string,
  width?: number,
  height?: number,
  quality = 80,
  format?: string
): string => {
  // Si es una URL externa, devolverla tal como está
  if (src.startsWith('http') || src.startsWith('//'))
    return src;

  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality !== 80) params.set('q', quality.toString());
  if (format) params.set('f', format);
  
  const queryString = params.toString();
  return queryString ? `${src}?${queryString}` : src;
};

const generateSrcSet = (
  src: string,
  breakpoints: { width: number; quality?: number }[],
  format?: string
): string => {
  return breakpoints
    .map(({ width, quality = 80 }) => {
      const url = generateOptimizedUrl(src, width, undefined, quality, format);
      return `${url} ${width}w`;
    })
    .join(', ');
};

const generateSources = (
  src: string,
  formats: string[],
  breakpoints?: { width: number; quality?: number }[],
  sizes?: string
) => {
  if (!breakpoints) return [];
  
  return formats.map(format => ({
    type: `image/${format}`,
    srcSet: generateSrcSet(src, breakpoints, format),
    sizes,
  }));
};

// Componente de placeholder
const ImagePlaceholder: React.FC<{
  width?: number;
  height?: number;
  className?: string;
  type: 'blur' | 'empty' | 'skeleton';
  blurDataURL?: string;
}> = ({ width, height, className, type, blurDataURL }) => {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || 'auto',
    aspectRatio: width && height ? `${width}/${height}` : undefined,
  };

  switch (type) {
    case 'blur':
      return (
        <div
          className={`bg-gray-200 ${className || ''}`}
          style={{
            ...style,
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
          }}
        />
      );
    
    case 'skeleton':
      return (
        <div
          className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse ${className || ''}`}
          style={style}
        >
          <div className="flex items-center justify-center h-full">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      );
    
    default:
      return (
        <div
          className={`bg-gray-100 ${className || ''}`}
          style={style}
        />
      );
  }
};

// Hook para manejo del estado de la imagen
const useImageState = (src: string, priority: boolean = false) => {
  const [state, setState] = useState<ImageState>({
    isLoaded: false,
    isLoading: false,
    hasError: false,
    currentSrc: '',
  });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const isIntersecting = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  const shouldLoad = priority || isIntersecting;

  useEffect(() => {
    if (!shouldLoad || state.isLoaded || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true }));

    const img = new Image();
    const startTime = performance.now();

    img.onload = () => {
      const loadTime = performance.now() - startTime;
      trackCustomMetric('image_load_time', loadTime);
      trackCustomMetric('image_load_success', 1);
      
      setState({
        isLoaded: true,
        isLoading: false,
        hasError: false,
        currentSrc: src,
      });
    };

    img.onerror = () => {
      const loadTime = performance.now() - startTime;
      trackCustomMetric('image_load_time', loadTime);
      trackCustomMetric('image_load_error', 1);
      
      setState({
        isLoaded: false,
        isLoading: false,
        hasError: true,
        currentSrc: '',
      });
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, shouldLoad, state.isLoaded, state.isLoading]);

  return { ...state, imgRef, shouldLoad };
};

// Componente principal
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  priority = false,
  placeholder = 'skeleton',
  blurDataURL,
  sizes,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  className = '',
  fallback,
  formats = ['webp', 'jpg'],
  breakpoints = [
    { width: 640, quality: 75 },
    { width: 768, quality: 80 },
    { width: 1024, quality: 85 },
    { width: 1280, quality: 90 },
  ],
  ...props
}) => {
  const { isLoaded, isLoading, hasError, imgRef, shouldLoad } = useImageState(src, priority);
  
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Manejar errores con reintentos
  const handleError = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      // Forzar recarga después de un delay
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = generateOptimizedUrl(src, width, height, quality);
        }
      }, 1000 * (retryCount + 1));
    } else {
      onError?.();
    }
  };

  const handleLoad = () => {
    setRetryCount(0);
    onLoad?.();
  };

  // Generar sources para diferentes formatos
  const sources = generateSources(src, formats, breakpoints, sizes);
  
  // URL principal (fallback)
  const mainSrc = generateOptimizedUrl(src, width, height, quality);
  const mainSrcSet = generateSrcSet(src, breakpoints);

  // Estilos para la imagen
  const imageStyles: React.CSSProperties = {
    objectFit,
    objectPosition,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
  };

  // Clases CSS
  const imageClasses = `
    ${className}
    ${isLoaded ? 'opacity-100' : 'opacity-0'}
    transition-opacity duration-300 ease-in-out
  `.trim();

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      {/* Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0">
          <ImagePlaceholder
            {...(width !== undefined && { width })}
            {...(height !== undefined && { height })}
            className={className}
            type={placeholder}
            {...(blurDataURL !== undefined && { blurDataURL })}
          />
        </div>
      )}

      {/* Imagen principal */}
      {shouldLoad && (
        <picture className="block w-full h-full">
          {/* Sources para diferentes formatos */}
          {sources.map((source, index) => (
            <source
              key={index}
              type={source.type}
              srcSet={source.srcSet}
              sizes={source.sizes}
            />
          ))}
          
          {/* Imagen fallback */}
          <img
            ref={imgRef}
            src={hasError && fallback ? fallback : mainSrc}
            srcSet={!hasError ? mainSrcSet : undefined}
            sizes={sizes}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            style={imageStyles}
            className={imageClasses}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        </picture>
      )}

      {/* Indicador de error */}
      {hasError && retryCount >= maxRetries && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm">Error al cargar imagen</p>
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
};

// Componente para avatar optimizado
export const OptimizedAvatar: React.FC<{
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: string;
}> = ({ src, alt, size = 'md', className = '', fallback }) => {
  const sizeMap = {
    sm: { width: 32, height: 32, class: 'w-8 h-8' },
    md: { width: 48, height: 48, class: 'w-12 h-12' },
    lg: { width: 64, height: 64, class: 'w-16 h-16' },
    xl: { width: 96, height: 96, class: 'w-24 h-24' },
  };

  const { width, height, class: sizeClass } = sizeMap[size];

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        objectFit="cover"
        placeholder="skeleton"
        fallback={fallback || '/images/default-avatar.jpg'}
        formats={['webp', 'jpg']}
        breakpoints={[
          { width: width, quality: 90 },
          { width: width * 2, quality: 85 }, // Para pantallas retina
        ]}
        className="w-full h-full"
      />
    </div>
  );
};

// Componente para galería de imágenes
export const OptimizedGallery: React.FC<{
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
}> = ({ images, columns = 3, gap = 4, className = '' }) => {
  const gridClass = `grid grid-cols-1 md:grid-cols-${columns} gap-${gap}`;

  return (
    <div className={`${gridClass} ${className}`}>
      {images.map((image, index) => (
        <div key={index} className="group cursor-pointer">
          <div className="aspect-square overflow-hidden rounded-lg">
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              objectFit="cover"
              className="w-full h-full group-hover:scale-105 transition-transform duration-300"
              placeholder="skeleton"
              formats={['webp', 'jpg']}
              breakpoints={[
                { width: 300, quality: 75 },
                { width: 600, quality: 80 },
              ]}
            />
          </div>
          {image.caption && (
            <p className="mt-2 text-sm text-gray-600">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default OptimizedImage;