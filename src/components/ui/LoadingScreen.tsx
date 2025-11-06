import React, { useState, useEffect } from 'react';

// Tipos para las props del componente
interface LoadingScreenProps {
  isLoading?: boolean;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  onComplete?: (() => void) | null;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  isLoading = true, 
  message = 'Cargando...', 
  progress = 0,
  showProgress = false,
  onComplete = null 
}) => {
  const [dots, setDots] = useState('');
  const [currentMessage, setCurrentMessage] = useState(message);

  // Animación de puntos
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Actualizar mensaje
  useEffect(() => {
    setCurrentMessage(message);
  }, [message]);

  // Callback cuando termina la carga
  useEffect(() => {
    if (!isLoading && onComplete) {
      const timer = setTimeout(onComplete, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onComplete]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Fondo con patrón */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-transparent to-red-600/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 text-center">
        {/* Logo animado */}
        <div className="mb-8">
          <div className="relative">
            {/* Círculo de fondo */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-2xl flex items-center justify-center animate-pulse">
              {/* Icono de barbería */}
              <svg width="48" height="48" viewBox="0 0 120 120" className="text-white">
                {/* Sombra del poste */}
                <ellipse cx="62" cy="108" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
                
                {/* Cilindro principal */}
                <rect x="48" y="20" width="24" height="80" rx="12" fill="#f8f9fa" stroke="#2d3748" strokeWidth="1.5"/>
                
                {/* Patrón de rayas espirales */}
                <defs>
                  <pattern id="barberStripesLoading" patternUnits="userSpaceOnUse" width="24" height="12" patternTransform="rotate(25)">
                    <rect width="24" height="4" fill="#dc2626"/>
                    <rect y="4" width="24" height="4" fill="#ffffff"/>
                    <rect y="8" width="24" height="4" fill="#1d4ed8"/>
                  </pattern>
                  <linearGradient id="cylinderGradientLoading" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
                    <stop offset="30%" stopColor="rgba(255,255,255,0.1)"/>
                    <stop offset="70%" stopColor="rgba(0,0,0,0.05)"/>
                    <stop offset="100%" stopColor="rgba(0,0,0,0.15)"/>
                  </linearGradient>
                </defs>
                
                {/* Aplicar rayas al cilindro */}
                <rect x="48" y="25" width="24" height="70" rx="12" fill="url(#barberStripesLoading)"/>
                
                {/* Efecto cilíndrico */}
                <rect x="48" y="25" width="24" height="70" rx="12" fill="url(#cylinderGradientLoading)" opacity="0.7"/>
                
                {/* Tapas */}
                <ellipse cx="60" cy="25" rx="14" ry="7" fill="#1a202c"/>
                <ellipse cx="60" cy="23" rx="12" ry="5" fill="#2d3748"/>
                <ellipse cx="60" cy="21" rx="10" ry="3" fill="#4a5568"/>
                
                <ellipse cx="60" cy="95" rx="14" ry="7" fill="#1a202c"/>
                <ellipse cx="60" cy="93" rx="12" ry="5" fill="#2d3748"/>
                <ellipse cx="60" cy="91" rx="10" ry="3" fill="#4a5568"/>
                
                {/* Reflejo */}
                <rect x="50" y="25" width="4" height="70" rx="2" fill="rgba(255,255,255,0.3)" opacity="0.6"/>
              </svg>
            </div>
            
            {/* Anillo de carga giratorio */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-400 animate-spin"></div>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-4xl font-bold text-white mb-2 font-montserrat">
          JP Barber
        </h1>
        
        {/* Subtítulo */}
        <p className="text-red-400 text-lg mb-8 font-roboto">
          Sistema de Gestión Profesional
        </p>

        {/* Mensaje de carga */}
        <div className="mb-6">
          <p className="text-white text-lg font-medium">
            {currentMessage}{dots}
          </p>
        </div>

        {/* Barra de progreso */}
        {showProgress && (
          <div className="w-64 mx-auto mb-6">
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm mt-2">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Indicador de carga alternativo */}
        {!showProgress && (
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}

        {/* Mensaje adicional */}
        <div className="mt-8 text-gray-400 text-sm max-w-md mx-auto">
          <p>Configurando conexión y servicios...</p>
        </div>
      </div>

      {/* Efectos de fondo adicionales */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/50 to-transparent"></div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/50 to-transparent"></div>
    </div>
  );
};

// Componente de carga específico para inicialización de la app
export const AppInitializationLoader: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  const steps = [
    'Inicializando aplicación...',
    'Configurando red...',
    'Verificando autenticación...',
    'Cargando servicios...',
    'Preparando interfaz...',
    'Finalizando...'
  ];

  useEffect(() => {
    // Simular progreso de inicialización
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    // Cambiar mensajes
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 800);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <LoadingScreen
      isLoading={progress < 100}
      message={steps[currentStep]}
      progress={progress}
      showProgress={true}
    />
  );
};

// Tipos para el hook de loading state
interface UseLoadingStateReturn {
  isLoading: boolean;
  message: string;
  progress: number;
  startLoading: (msg?: string) => void;
  updateProgress: (newProgress: number, msg?: string | null) => void;
  finishLoading: () => void;
  setMessage: (message: string) => void;
}

// Hook para manejar estados de carga
export const useLoadingState = (initialState: boolean = false): UseLoadingStateReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(initialState);
  const [message, setMessage] = useState<string>('Cargando...');
  const [progress, setProgress] = useState<number>(0);

  const startLoading = (msg: string = 'Cargando...'): void => {
    setMessage(msg);
    setProgress(0);
    setIsLoading(true);
  };

  const updateProgress = (newProgress: number, msg: string | null = null): void => {
    setProgress(newProgress);
    if (msg) setMessage(msg);
  };

  const finishLoading = (): void => {
    setProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 300);
  };

  return {
    isLoading,
    message,
    progress,
    startLoading,
    updateProgress,
    finishLoading,
    setMessage
  };
};

export default LoadingScreen;