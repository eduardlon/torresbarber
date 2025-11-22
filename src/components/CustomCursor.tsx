import React, { useEffect, useState, useRef, useCallback } from 'react';

interface CursorPosition {
  x: number;
  y: number;
}

interface SparkleParticle {
  x: number;
  y: number;
  id: number;
  size: number;
  opacity: number;
  delay: number;
}

const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const sparkleIdRef = useRef(0);
  const cursorRef = useRef<HTMLDivElement>(null);

  const createSparkle = useCallback((x: number, y: number) => {
    // Crear partículas con tamaños y opacidades variadas para efecto chispeante
    const size = Math.random() * 4 + 2; // 2-6px
    const opacity = Math.random() * 0.5 + 0.5; // 0.5-1.0
    const delay = Math.random() * 0.1;
    
    return {
      x,
      y,
      id: sparkleIdRef.current++,
      size,
      opacity,
      delay,
    };
  }, []);

  useEffect(() => {
    let lastTime = Date.now();
    let throttleTimer: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;

      // Actualizar posición del cursor principal con RAF para mejor rendimiento
      if (!throttleTimer) {
        throttleTimer = requestAnimationFrame(() => {
          setPosition({ x: e.clientX, y: e.clientY });
          throttleTimer = null;
        });
      }

      if (!isVisible) setIsVisible(true);

      // Detectar si está sobre un elemento interactivo
      const target = e.target as HTMLElement;
      const isInteractive = target.matches('a, button, input, textarea, select, [role="button"]');
      setIsHovering(isInteractive);

      // Agregar chispas cada 40ms (optimizado)
      if (deltaTime > 40) {
        setSparkles((prevSparkles) => {
          const newSparkle = createSparkle(e.clientX, e.clientY);
          // Mantener solo las últimas 12 partículas para mejor rendimiento
          const updatedSparkles = [...prevSparkles, newSparkle].slice(-12);
          return updatedSparkles;
        });
        lastTime = currentTime;
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      setSparkles([]);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Limpiar chispas periódicamente para optimización
    const cleanupInterval = setInterval(() => {
      setSparkles((prev) => prev.length > 0 ? prev.slice(1) : []);
    }, 60);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      clearInterval(cleanupInterval);
      if (throttleTimer) cancelAnimationFrame(throttleTimer);
    };
  }, [isVisible, createSparkle]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        * {
          cursor: none !important;
        }

        .modern-cursor-main {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cursor-dot {
          width: 12px;
          height: 12px;
          background: #000000;
          border-radius: 50%;
          position: relative;
          box-shadow: 
            0 0 0 1.5px rgba(239, 68, 68, 0.8),
            0 0 8px rgba(239, 68, 68, 0.4),
            inset 0 0 4px rgba(255, 255, 255, 0.2);
        }

        .cursor-dot::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          filter: blur(1px);
        }

        .cursor-dot.hovering {
          width: 16px;
          height: 16px;
          background: rgba(239, 68, 68, 0.95);
          box-shadow: 
            0 0 0 2px #000000,
            0 0 12px rgba(239, 68, 68, 0.6),
            0 0 20px rgba(239, 68, 68, 0.3);
        }

        .cursor-ring {
          position: absolute;
          width: 28px;
          height: 28px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
        }

        .cursor-ring.hovering {
          width: 36px;
          height: 36px;
          opacity: 1;
          border-color: rgba(239, 68, 68, 0.6);
          animation: pulse-ring 1.5s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.3;
          }
        }

        .sparkle-particle {
          position: fixed;
          pointer-events: none;
          z-index: 9998;
          border-radius: 50%;
          background: radial-gradient(circle, #ef4444, #dc2626);
          transform: translate(-50%, -50%);
          animation: sparkle-fade 0.6s cubic-bezier(0.4, 0, 0.6, 1) forwards;
          box-shadow: 
            0 0 4px rgba(239, 68, 68, 0.8),
            0 0 8px rgba(239, 68, 68, 0.4);
        }

        @keyframes sparkle-fade {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2) rotate(360deg);
          }
        }

        /* Optimización: Usar will-change para elementos animados */
        .modern-cursor-main,
        .sparkle-particle {
          will-change: transform;
        }

        /* Accesibilidad: Respetar preferencias de movimiento reducido */
        @media (prefers-reduced-motion: reduce) {
          .sparkle-particle {
            animation-duration: 0.01ms !important;
          }
          .cursor-ring.hovering {
            animation: none !important;
          }
        }
      `}</style>

      {/* Partículas chispeantes rojas */}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="sparkle-particle"
          style={{
            left: `${sparkle.x}px`,
            top: `${sparkle.y}px`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            opacity: sparkle.opacity,
            animationDelay: `${sparkle.delay}s`,
          }}
        />
      ))}

      {/* Cursor principal moderno */}
      <div
        ref={cursorRef}
        className="modern-cursor-main"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className={`cursor-ring ${isHovering ? 'hovering' : ''}`} />
        <div className={`cursor-dot ${isHovering ? 'hovering' : ''}`} />
      </div>
    </>
  );
};

export default CustomCursor;
