import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

// Tipos para el hook de login
interface LoginFormData {
  email: string;
  password: string;
}

interface UseLoginReturn {
  formData: LoginFormData;
  loading: boolean;
  error: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}

// Declaración de tipos para window
declare global {
  interface Window {
    isAuthenticated?: () => boolean;
    login?: (email: string, password: string) => Promise<boolean>;
  }
}

// Hook personalizado para manejar la lógica de login
export const useLogin = (): UseLoginReturn => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Verificar si ya está autenticado
    if (window.isAuthenticated && window.isAuthenticated()) {
      window.location.href = '/admin';
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await window.login?.(formData.email, formData.password);
      if (success) {
        window.location.href = '/admin';
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    error,
    handleInputChange,
    handleSubmit
  };
};

// Función auxiliar para toggle de contraseña
export const usePasswordToggle = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const togglePassword = (): void => setShowPassword(!showPassword);
  
  return { showPassword, togglePassword };
};

// Componente vacío por compatibilidad (no se renderiza)
const Login: React.FC = () => {
  return null;
};

export default Login;