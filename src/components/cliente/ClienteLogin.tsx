import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  passwordConfirm: string;
  codigoReferido?: string;
  acceptMarketing: boolean;
}

interface BiometricSupport {
  available: boolean;
  type: 'fingerprint' | 'face' | 'voice' | null;
}

const ClienteLogin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [biometricSupport, setBiometricSupport] = useState<BiometricSupport>({ available: false, type: null });
  const [showBiometric, setShowBiometric] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginFormData>({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    passwordConfirm: '',
    codigoReferido: '',
    acceptMarketing: false
  });

  useEffect(() => {
    // Verificar si ya está autenticado
    const token = localStorage.getItem('cliente_token');
    if (token) {
      window.location.href = '/panel-cliente';
      return;
    }

    // Verificar soporte biométrico
    checkBiometricSupport();

    // Solicitar permisos de notificación
    requestNotificationPermission();
  }, []);

  const checkBiometricSupport = async () => {
    if ('PublicKeyCredential' in window) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          setBiometricSupport({ available: true, type: 'fingerprint' });
          setShowBiometric(true);
        }
      } catch (error) {
        console.log('Biometric not supported:', error);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleBiometricLogin = async () => {
    if (!biometricSupport.available) return;

    try {
      setIsLoading(true);
      
      // Simular autenticación biométrica
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "JP Barber" },
          user: {
            id: new Uint8Array(16),
            name: "cliente@jpbarber.com",
            displayName: "Cliente JP Barber"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          }
        }
      });

      if (credential) {
        // Verificar con el servidor
        const response = await fetch('/api/cliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'biometric_login',
            credential: credential.id
          })
        });

        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('cliente_token', data.token);
          localStorage.setItem('cliente_data', JSON.stringify(data.cliente));
          showMessage('success', '¡Autenticación biométrica exitosa!');
          setTimeout(() => window.location.href = '/panel-cliente', 1500);
        } else {
          showMessage('error', data.message || 'Error en autenticación biométrica');
        }
      }
    } catch (error) {
      showMessage('error', 'Error en autenticación biométrica');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginForm.email,
          password: loginForm.password
        })
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('cliente_token', data.token);
        localStorage.setItem('cliente_data', JSON.stringify(data.cliente));
        
        // Mostrar notificación de bienvenida
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('¡Bienvenido a JP Barber!', {
            body: `Hola ${data.cliente.nombre}, ¡es genial tenerte de vuelta!`,
            icon: '/favicon.ico'
          });
        }
        
        showMessage('success', '¡Inicio de sesión exitoso!');
        
        // Verificar si hay una URL de redirección guardada
        const redirectUrl = localStorage.getItem('redirect_after_login');
        if (redirectUrl) {
          localStorage.removeItem('redirect_after_login');
          setTimeout(() => window.location.href = redirectUrl, 1500);
        } else {
          setTimeout(() => window.location.href = '/panel-cliente', 1500);
        }
      } else {
        showMessage('error', data.message || 'Error en el inicio de sesión');
      }
    } catch (error) {
      showMessage('error', 'Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.passwordConfirm) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }

    if (registerForm.password.length < 6) {
      showMessage('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...registerForm
        })
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('cliente_token', data.token);
        localStorage.setItem('cliente_data', JSON.stringify(data.cliente));
        
        // Mostrar notificación de bienvenida
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('¡Bienvenido a JP Barber!', {
            body: `¡Hola ${data.cliente.nombre}! Tu cuenta ha sido creada exitosamente.`,
            icon: '/favicon.ico'
          });
        }
        
        showMessage('success', '¡Registro exitoso! Bienvenido a JP Barber.');
        
        // Verificar si hay una URL de redirección guardada
        const redirectUrl = localStorage.getItem('redirect_after_login');
        if (redirectUrl) {
          localStorage.removeItem('redirect_after_login');
          setTimeout(() => window.location.href = redirectUrl, 1500);
        } else {
          setTimeout(() => window.location.href = '/panel-cliente', 1500);
        }
      } else {
        showMessage('error', data.message || 'Error en el registro');
      }
    } catch (error) {
      showMessage('error', 'Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Logo y título */}
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-2xl">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">JP Barber</h2>
          <p className="text-gray-300">Panel de Cliente</p>
        </motion.div>

        {/* Formulario de login/registro */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-white/20"
        >
          {/* Tabs */}
          <div className="flex mb-6">
            <button 
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-l-lg transition-all ${
                activeTab === 'login' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-r-lg transition-all ${
                activeTab === 'register' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              Registrarse
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLogin} 
                className="space-y-6"
              >
                <div>
                  <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-200 mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    id="loginEmail"
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-200 mb-2">
                    Contraseña
                  </label>
                  <input
                    id="loginPassword"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Iniciando sesión...
                    </div>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>

                {/* Autenticación biométrica */}
                {showBiometric && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    Acceso Biométrico
                  </motion.button>
                )}
              </motion.form>
            ) : (
              <motion.form 
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleRegister} 
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="registerNombre" className="block text-sm font-medium text-gray-200 mb-2">
                      Nombre
                    </label>
                    <input
                      id="registerNombre"
                      type="text"
                      required
                      value={registerForm.nombre}
                      onChange={(e) => setRegisterForm({ ...registerForm, nombre: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label htmlFor="registerApellido" className="block text-sm font-medium text-gray-200 mb-2">
                      Apellido
                    </label>
                    <input
                      id="registerApellido"
                      type="text"
                      required
                      value={registerForm.apellido}
                      onChange={(e) => setRegisterForm({ ...registerForm, apellido: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-200 mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    id="registerEmail"
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="registerTelefono" className="block text-sm font-medium text-gray-200 mb-2">
                    Teléfono
                  </label>
                  <input
                    id="registerTelefono"
                    type="tel"
                    required
                    value={registerForm.telefono}
                    onChange={(e) => setRegisterForm({ ...registerForm, telefono: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-200 mb-2">
                      Contraseña
                    </label>
                    <input
                      id="registerPassword"
                      type="password"
                      required
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label htmlFor="registerPasswordConfirm" className="block text-sm font-medium text-gray-200 mb-2">
                      Confirmar
                    </label>
                    <input
                      id="registerPasswordConfirm"
                      type="password"
                      required
                      value={registerForm.passwordConfirm}
                      onChange={(e) => setRegisterForm({ ...registerForm, passwordConfirm: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="registerCodigoReferido" className="block text-sm font-medium text-gray-200 mb-2">
                    Código de Referido (Opcional)
                  </label>
                  <input
                    id="registerCodigoReferido"
                    type="text"
                    value={registerForm.codigoReferido}
                    onChange={(e) => setRegisterForm({ ...registerForm, codigoReferido: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="JP123456"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="acceptMarketing"
                    type="checkbox"
                    checked={registerForm.acceptMarketing}
                    onChange={(e) => setRegisterForm({ ...registerForm, acceptMarketing: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="acceptMarketing" className="ml-2 block text-sm text-gray-300">
                    Acepto recibir promociones y ofertas especiales
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Registrando...
                    </div>
                  ) : (
                    'Registrarse'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Mensajes */}
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-4 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-500/20 border border-green-500/30 text-green-200'
                    : message.type === 'error'
                    ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                    : 'bg-blue-500/20 border border-blue-500/30 text-blue-200'
                }`}
              >
                <div className="flex items-center">
                  {message.type === 'success' && (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                  {message.type === 'error' && (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  )}
                  {message.type === 'info' && (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  )}
                  {message.text}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Enlaces adicionales */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center space-y-2"
        >
          <a href="/" className="text-gray-300 hover:text-white transition-colors">
            ← Volver al inicio
          </a>
        </motion.div>
      </motion.div>
    </main>
  );
};

export default ClienteLogin;