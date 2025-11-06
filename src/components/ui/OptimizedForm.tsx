/**
 * Componentes de formularios optimizados
 * Incluye validación en tiempo real, estados de carga y mejor UX
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, FieldValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

// Tipos base
interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

// Input de texto optimizado
interface OptimizedInputProps extends BaseInputProps {
  type?: 'text' | 'email' | 'tel' | 'url' | 'password';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  maxLength?: number;
  pattern?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const OptimizedInput: React.FC<OptimizedInputProps> = ({
  label,
  error,
  helperText,
  required = false,
  className = '',
  disabled = false,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  autoComplete,
  maxLength,
  pattern,
  icon,
  rightIcon
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(!!value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHasValue(!!newValue);
    onChange?.(newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const inputClasses = `
    w-full px-4 py-3 border rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${icon ? 'pl-12' : ''}
    ${rightIcon ? 'pr-12' : ''}
    ${error 
      ? 'border-error-300 bg-error-50 text-error-900 focus:ring-error-500' 
      : 'border-gray-300 bg-white text-gray-900'
    }
    ${isFocused ? 'shadow-medium' : 'shadow-sm'}
  `;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          ref={inputRef}
          type={type}
          value={value || ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          pattern={pattern}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${label}-error` : undefined}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
        
        {/* Indicador de estado */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <AlertCircle className="h-5 w-5 text-error-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Mensajes de ayuda y error */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-error-600 flex items-center space-x-1"
            id={`${label}-error`}
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.p>
        ) : helperText ? (
          <motion.p
            key="helper"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-gray-600"
          >
            {helperText}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

// Input de contraseña con toggle de visibilidad
interface PasswordInputProps extends Omit<OptimizedInputProps, 'type' | 'rightIcon'> {
  showStrengthIndicator?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showStrengthIndicator = false,
  value,
  onChange,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [strength, setStrength] = React.useState(0);

  // Calcular fuerza de la contraseña
  React.useEffect(() => {
    if (!value || !showStrengthIndicator) return;
    
    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    
    setStrength(score);
  }, [value, showStrengthIndicator]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const strengthColors = {
    0: 'bg-gray-200',
    1: 'bg-error-500',
    2: 'bg-warning-500',
    3: 'bg-yellow-500',
    4: 'bg-success-500',
    5: 'bg-success-600'
  };

  const strengthLabels = {
    0: '',
    1: 'Muy débil',
    2: 'Débil',
    3: 'Regular',
    4: 'Fuerte',
    5: 'Muy fuerte'
  };

  return (
    <div className="space-y-2">
      <OptimizedInput
        {...props}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        rightIcon={
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />
      
      {/* Indicador de fuerza */}
      {showStrengthIndicator && value && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  level <= strength ? strengthColors[strength as keyof typeof strengthColors] : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-600">
            Fuerza: {strengthLabels[strength as keyof typeof strengthLabels]}
          </p>
        </motion.div>
      )}
    </div>
  );
};

// Textarea optimizado
interface OptimizedTextareaProps extends BaseInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
}

export const OptimizedTextarea: React.FC<OptimizedTextareaProps> = ({
  label,
  error,
  helperText,
  required = false,
  className = '',
  disabled = false,
  placeholder,
  value,
  onChange,
  onBlur,
  rows = 4,
  maxLength,
  showCharCount = false,
  autoResize = false
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize functionality
  React.useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  const charCount = value?.length || 0;
  const isNearLimit = maxLength && charCount > maxLength * 0.8;
  const isOverLimit = maxLength && charCount > maxLength;

  const textareaClasses = `
    w-full px-4 py-3 border rounded-lg transition-all duration-200 resize-none
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error 
      ? 'border-error-300 bg-error-50 text-error-900 focus:ring-error-500' 
      : 'border-gray-300 bg-white text-gray-900'
    }
    ${isFocused ? 'shadow-medium' : 'shadow-sm'}
  `;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          disabled={disabled}
          rows={autoResize ? 1 : rows}
          maxLength={maxLength}
          className={textareaClasses}
          aria-invalid={!!error}
        />
      </div>
      
      {/* Contador de caracteres */}
      {showCharCount && maxLength && (
        <div className="flex justify-end">
          <span className={`text-xs ${
            isOverLimit 
              ? 'text-error-600' 
              : isNearLimit 
              ? 'text-warning-600' 
              : 'text-gray-500'
          }`}>
            {charCount}/{maxLength}
          </span>
        </div>
      )}
      
      {/* Mensajes de error y ayuda */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-error-600 flex items-center space-x-1"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.p>
        ) : helperText ? (
          <motion.p
            key="helper"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-gray-600"
          >
            {helperText}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

// Select optimizado
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface OptimizedSelectProps extends BaseInputProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

export const OptimizedSelect: React.FC<OptimizedSelectProps> = ({
  label,
  error,
  helperText,
  required = false,
  className = '',
  disabled = false,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchable = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const selectRef = React.useRef<HTMLDivElement>(null);

  // Filtrar opciones si es searchable
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, searchable]);

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`space-y-2 ${className}`} ref={selectRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-4 py-3 text-left border rounded-lg transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error 
              ? 'border-error-300 bg-error-50 text-error-900 focus:ring-error-500' 
              : 'border-gray-300 bg-white text-gray-900'
            }
            ${isOpen ? 'shadow-medium' : 'shadow-sm'}
          `}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption?.label || placeholder}
          </span>
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        
        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
            >
              {searchable && (
                <div className="p-2 border-b">
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              )}
              
              <div className="py-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      disabled={option.disabled}
                      className={`
                        w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${value === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-900'}
                      `}
                    >
                      {option.label}
                      {value === option.value && (
                        <CheckCircle className="inline h-4 w-4 ml-2" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500 text-sm">
                    No se encontraron opciones
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Mensajes de error y ayuda */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-error-600 flex items-center space-x-1"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.p>
        ) : helperText ? (
          <motion.p
            key="helper"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-gray-600"
          >
            {helperText}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

// Formulario base con validación
interface FormProps<T extends FieldValues> {
  schema: z.ZodType<T>;
  onSubmit: (data: T) => Promise<void> | void;
  children: (methods: any) => React.ReactNode;
  className?: string;
  defaultValues?: Partial<T> | undefined;
}

export function OptimizedForm<T extends FieldValues>({
  schema,
  onSubmit,
  children,
  className = '',
  defaultValues
}: FormProps<T>) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange'
  });
  
  const handleSubmit: SubmitHandler<T> = async (data: T) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form 
      onSubmit={methods.handleSubmit(handleSubmit)}
      className={className}
      noValidate
    >
      {children({ ...methods, isSubmitting })}
    </form>
  );
}