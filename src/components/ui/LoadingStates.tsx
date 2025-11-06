/**
 * Componentes de estados de carga optimizados
 * Incluye skeleton screens, spinners y estados de carga inteligentes
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/utils/performance';

// Componente base de skeleton
interface SkeletonProps {
  className?: string;
  animate?: boolean;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  animate = true,
  children 
}) => {
  const baseClasses = 'bg-gray-200 rounded';
  const animationClasses = animate ? 'animate-pulse' : '';
  
  return (
    <div className={`${baseClasses} ${animationClasses} ${className}`}>
      {children}
    </div>
  );
};

// Skeleton para texto
interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({ 
  lines = 1, 
  className = '' 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index}
          className={`h-4 ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

// Skeleton para tarjetas
export const CardSkeleton: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  return (
    <div className={`p-6 border rounded-lg ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <TextSkeleton lines={3} />
    </div>
  );
};

// Skeleton para lista
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ 
  items = 5, 
  showAvatar = true,
  className = '' 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton para tabla
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  columns = 4,
  className = '' 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} className="h-6" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`} 
          className="grid gap-4" 
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Spinner animado
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'primary'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  const colorClasses = {
    primary: 'text-primary-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };
  
  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );
};

// Componente de carga con mensaje
interface LoadingMessageProps {
  message?: string;
  submessage?: string;
  showSpinner?: boolean;
  className?: string;
}

export const LoadingMessage: React.FC<LoadingMessageProps> = ({
  message = 'Cargando...',
  submessage,
  showSpinner = true,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      {showSpinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Spinner size="lg" />
        </motion.div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="text-center mt-4"
      >
        <h3 className="text-lg font-medium text-gray-900 mb-1">{message}</h3>
        {submessage && (
          <p className="text-sm text-gray-600">{submessage}</p>
        )}
      </motion.div>
    </div>
  );
};

// Estado de carga para botones
interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  variant = 'primary'
}) => {
  const baseClasses = `
    relative inline-flex items-center justify-center px-4 py-2 rounded-lg
    font-medium transition-all duration-200 focus:outline-none focus:ring-2
    focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const variantClasses = {
    primary: `
      bg-primary-600 text-white hover:bg-primary-700 
      focus:ring-primary-500 shadow-sm
    `,
    secondary: `
      bg-gray-600 text-white hover:bg-gray-700 
      focus:ring-gray-500 shadow-sm
    `,
    outline: `
      border border-gray-300 text-gray-700 hover:bg-gray-50 
      focus:ring-primary-500
    `
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Spinner size="sm" color="white" />
        </motion.div>
      )}
      
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
};

// Indicador de estado de conexión
export const ConnectionStatus: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { isOnline, connectionSpeed } = useNetworkStatus();
  
  if (isOnline) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center space-x-2 text-success-600 ${className}`}
      >
        <Wifi size={16} />
        <span className="text-sm font-medium">
          Conectado {connectionSpeed && `(${connectionSpeed})`}
        </span>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center space-x-2 text-error-600 ${className}`}
    >
      <WifiOff size={16} />
      <span className="text-sm font-medium">Sin conexión</span>
    </motion.div>
  );
};

// Componente de carga progresiva
interface ProgressiveLoadingProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  steps,
  currentStep,
  className = ''
}) => {
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-primary-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      
      {/* Pasos */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0.5 }}
            animate={{ 
              opacity: index <= currentStep ? 1 : 0.5,
              scale: index === currentStep ? 1.02 : 1
            }}
            className={`flex items-center space-x-3 p-2 rounded ${
              index === currentStep ? 'bg-primary-50' : ''
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              index < currentStep 
                ? 'bg-success-500' 
                : index === currentStep 
                ? 'bg-primary-500 animate-pulse' 
                : 'bg-gray-300'
            }`} />
            <span className={`text-sm ${
              index <= currentStep ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {step}
            </span>
            {index === currentStep && <Spinner size="sm" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Hook para manejar estados de carga
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [error, setError] = React.useState<string | null>(null);
  
  const startLoading = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);
  
  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);
  
  const setLoadingError = React.useCallback((errorMessage: string) => {
    setIsLoading(false);
    setError(errorMessage);
  }, []);
  
  const reset = React.useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);
  
  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset
  };
};

// Componente de estado vacío
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-12 ${className}`}
    >
      {icon && (
        <div className="flex justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      
      {description && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      
      {action && (
        <LoadingButton
          onClick={action.onClick}
          variant="primary"
        >
          {action.label}
        </LoadingButton>
      )}
    </motion.div>
  );
};