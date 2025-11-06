import React, { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Dashboard from './Dashboard.tsx';
import Citas from './Citas.tsx';
import SmartQueue from './ColaInteligenteMejorada.tsx';
import Ventas from './Ventas.tsx';
import Rendimiento from './Rendimiento.tsx';
import ModalVenta from './ModalVentaMejorado.tsx';
import CustomNotification from '../admin/CustomNotification.tsx';
import { supabaseService } from '../../services/supabaseService';

interface BarberoInfo {
  id: number;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  usuario?: string;
  especialidad?: string;
  descripcion?: string;
  activo?: boolean;
  fechaIngreso?: string;
}

interface Notification {
  mensaje: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
}

interface ModalConfig {
  type: string;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
}

interface Cita {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string;
  servicio?: string;
  servicio_id?: number;
  fecha_hora: string;
  estado: string;
  notas?: string;
  tipo?: string;
}

interface ModalVenta {
  isOpen: boolean;
  cita: Cita | null;
}

const PanelBarbero = () => {
  const [seccionActual, setSeccionActual] = useState('dashboard');
  const [barberoInfo, setBarberoInfo] = useState<BarberoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ usuario: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [modalVenta, setModalVenta] = useState<ModalVenta>({ isOpen: false, cita: null });
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ type: '', title: '', message: '', onConfirm: null });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    verificarAutenticacion();
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const verificarAutenticacion = async () => {
    try {
      const barberoSession = getCookie('barbero_session');
      const authToken = getCookie('auth_token');
      
      if (barberoSession === 'authenticated' && authToken) {
        setIsAuthenticated(true);
        await cargarInfoBarbero();
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      // Usar Supabase para autenticación de barbero
      const result = await supabaseService.loginBarbero({
        email: loginData.usuario,
        password: loginData.password
      });

      if (result.success && result.session) {
        const accessToken = result.session.access_token;

        // Establecer cookies de sesión
        const expires = new Date();
        expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
        const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

        document.cookie = `auth_token=${accessToken}; ${cookieOptions}`;
        document.cookie = `barbero_session=authenticated; ${cookieOptions}`;
        document.cookie = `barbero_id=${result.user.id}; ${cookieOptions}`;
        document.cookie = `barbero_data=${encodeURIComponent(JSON.stringify(result.user))}; ${cookieOptions}`;

        // Guardar en localStorage también
        if (accessToken) {
          localStorage.setItem('auth_token', accessToken);
        }

        setBarberoInfo(result.user);
        setIsAuthenticated(true);
        mostrarNotificacion(`Bienvenido ${result.user.nombre || result.user.email}`, 'success');

        // Redireccionar al panel del barbero después del login exitoso
        setTimeout(() => {
          window.location.href = '/panel-barbero';
        }, 1500);
      } else {
        mostrarNotificacion(result.error || 'Usuario o contraseña incorrectos', 'error');
      }
    } catch (error) {
      console.error('Error en login con Supabase:', error);
      mostrarNotificacion('Error de conexión con Supabase. Intenta nuevamente.', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const cargarInfoBarbero = async () => {
    try {
      // Intentar obtener datos del barbero de la cookie
      const barberoDataCookie = getCookie('barbero_data');
      
      if (barberoDataCookie) {
        try {
          const barberoData = JSON.parse(decodeURIComponent(barberoDataCookie));
          setBarberoInfo(barberoData);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing barbero data from cookie:', e);
        }
      }
      
      // Si no hay cookie, intentar obtener del servidor
      const authToken = getCookie('auth_token');
      if (authToken) {
        const response = await fetch('/api/barbero/me', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBarberoInfo(data.data);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar información del barbero:', error);
      mostrarNotificacion('Error al cargar información del barbero', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ type: 'confirm', title, message, onConfirm });
    setShowModal(true);
  };

  const hideModal = () => {
    setShowModal(false);
    setModalConfig({ type: '', title: '', message: '', onConfirm: null });
  };

  const cerrarSesion = async () => {
    showConfirmModal(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      async () => {
        try {
          const authToken = getCookie('auth_token');
          if (authToken) {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            });
          }
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
        } finally {
          // Limpiar todas las cookies
          document.cookie = 'barbero_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'barbero_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'barbero_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          window.location.href = '/login-barbero';
        }
      }
    );
  };

  const mostrarNotificacion = (mensaje: string, tipo: Notification['tipo'] = 'info') => {
    setNotification({ mensaje, tipo });
    setTimeout(() => setNotification(null), 5000);
  };

  const abrirModalVenta = (cita: Cita) => {
    setModalVenta({ isOpen: true, cita });
  };

  const cerrarModalVenta = () => {
    setModalVenta({ isOpen: false, cita: null });
  };

  const completarVenta = async (ventaData: any) => {
    try {
      const authToken = getCookie('auth_token');
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ventaData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        mostrarNotificacion('Venta registrada exitosamente', 'success');
        cerrarModalVenta();
        // Recargar datos si estamos en dashboard
        if (seccionActual === 'dashboard') {
          window.location.reload();
        }
      } else {
        mostrarNotificacion(data.message || 'Error al registrar venta', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión al registrar venta', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando panel de barbero...</p>
        </div>
      </div>
    );
  }

  const secciones = [
    { id: 'dashboard', nombre: 'Dashboard', icono: '📊' },
    { id: 'citas', nombre: 'Citas', icono: '📅' },
    { id: 'cola-inteligente', nombre: 'Cola Inteligente', icono: '🧠' },
    { id: 'ventas', nombre: 'Ventas', icono: '💰' },
    { id: 'rendimiento', nombre: 'Rendimiento', icono: '📈' }
  ];

  const renderSeccion = () => {
    switch (seccionActual) {
      case 'dashboard':
        return <Dashboard barberoInfo={barberoInfo} mostrarNotificacion={mostrarNotificacion} />;
      case 'citas':
        return <Citas barberoInfo={barberoInfo} mostrarNotificacion={mostrarNotificacion} abrirModalVenta={abrirModalVenta} />;
      case 'cola-inteligente':
        return <SmartQueue barberoInfo={barberoInfo} mostrarNotificacion={mostrarNotificacion} />;
      case 'ventas':
        return <Ventas barberoInfo={barberoInfo} mostrarNotificacion={mostrarNotificacion} />;
      case 'rendimiento':
        return <Rendimiento barberoInfo={barberoInfo} mostrarNotificacion={mostrarNotificacion} />;
      default:
        return <Dashboard barberoInfo={barberoInfo} mostrarNotificacion={mostrarNotificacion} />;
    }
  };

  // Renderizar login si no está autenticado
  if (!isAuthenticated) {
    return (
      <>
        <style>{`
          /* Reset y base */
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          
          .login-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%);
            background-image: 
              radial-gradient(circle at 25% 25%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(239, 68, 68, 0.05) 0%, transparent 50%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            position: relative;
            overflow: hidden;
          }
          
          .login-particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
          }
          
          .particle {
            position: absolute;
            background: rgba(239, 68, 68, 0.2);
            border-radius: 50%;
            animation: float 6s ease-in-out infinite;
          }
          
          .particle:nth-child(1) {
            top: 25%;
            left: 25%;
            width: 8px;
            height: 8px;
            animation-delay: 0s;
          }
          
          .particle:nth-child(2) {
            top: 75%;
            right: 25%;
            width: 4px;
            height: 4px;
            animation-delay: 2s;
          }
          
          .particle:nth-child(3) {
            top: 50%;
            left: 75%;
            width: 12px;
            height: 12px;
            animation-delay: 4s;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); opacity: 0.3; }
            50% { transform: translateY(-20px); opacity: 0.8; }
          }
          
          .login-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 1.5rem;
            padding: 2rem;
            width: 100%;
            max-width: 28rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            position: relative;
            z-index: 10;
          }
          
          .login-logo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 5rem;
            height: 5rem;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            border-radius: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          
          .login-title {
            font-size: 1.875rem;
            font-weight: 700;
            color: white;
            margin-bottom: 0.5rem;
          }
          
          .login-subtitle {
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 2rem;
          }
          
          .form-group {
            margin-bottom: 1.5rem;
          }
          
          .form-label {
            display: block;
            color: white;
            font-weight: 500;
            margin-bottom: 0.5rem;
          }
          
          .input-container {
            position: relative;
          }
          
          .input-icon {
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.4);
            width: 1.25rem;
            height: 1.25rem;
            pointer-events: none;
          }
          
          .form-input {
            width: 100%;
            padding: 0.75rem 0.75rem 0.75rem 2.5rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.75rem;
            color: white;
            font-size: 1rem;
            transition: all 0.3s ease;
          }
          
          .form-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }
          
          .form-input:focus {
            outline: none;
            border-color: #ef4444;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
          }
          
          .password-toggle {
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.4);
            cursor: pointer;
            padding: 0;
            width: 1.25rem;
            height: 1.25rem;
            transition: color 0.3s ease;
          }
          
          .password-toggle:hover {
            color: rgba(255, 255, 255, 0.6);
          }
          
          .login-button {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
            border: none;
            border-radius: 0.75rem;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }
          
          .login-button:hover {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            transform: scale(1.02);
            box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.25);
          }
          
          .login-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          
          .loading-spinner {
            width: 1.25rem;
            height: 1.25rem;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .login-links {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
          }
          
          .login-link {
            color: #f87171;
            text-decoration: none;
            font-size: 0.875rem;
            transition: color 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .login-link:hover {
            color: #fca5a5;
          }
        `}</style>
        
        <div className="login-container">
          <div className="login-particles">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
          </div>
          
          <div className="login-card">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="login-logo">
                <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <h1 className="login-title">JP Barber</h1>
              <p className="login-subtitle">Portal de Barberos</p>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="usuario" className="form-label">Usuario</label>
                <div className="input-container">
                  <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <input
                    type="text"
                    id="usuario"
                    name="usuario"
                    value={loginData.usuario}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Ingresa tu usuario"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">Contraseña</label>
                <div className="input-container">
                  <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={loginData.password}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Ingresa tu contraseña"
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                      </svg>
                    ) : (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loginLoading}
                className="login-button"
              >
                {loginLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                    </svg>
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>
            
            <div className="login-links">
              <a href="/" className="login-link">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
        
        {/* Notificaciones */}
        {notification && (
          <CustomNotification
            isOpen={true}
            title={notification.tipo === 'success' ? 'Éxito' : notification.tipo === 'error' ? 'Error' : 'Información'}
            message={notification.mensaje}
            type={notification.tipo}
            onClose={() => setNotification(null)}
            autoClose={true}
            duration={3000}
          />
        )}
      </>
    );
  }

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #000000 0%, #0f0f0f 25%, #1a0a0a 50%, #0f0f0f 75%, #000000 100%);
          color: #ffffff;
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
        }

        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 20% 50%, rgba(234, 179, 8, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(234, 179, 8, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 40% 80%, rgba(234, 179, 8, 0.12) 0%, transparent 50%),
                      radial-gradient(circle at 60% 30%, rgba(251, 191, 36, 0.05) 0%, transparent 40%);
          pointer-events: none;
          z-index: -1;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .brand-icon {
          font-size: 2rem;
          filter: drop-shadow(0 0 10px rgba(234, 179, 8, 0.5));
        }

        .brand-text {
          font-size: 1.5rem;
          font-weight: bold;
          background: linear-gradient(135deg, #eab308, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(234, 179, 8, 0.3);
          letter-spacing: 0.5px;
        }

        .nav-items {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(39, 39, 42, 0.5);
          border: 1px solid rgba(234, 179, 8, 0.3);
          border-radius: 1rem;
          color: #ffffff;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(8px);
        }

        .nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.2), transparent);
          transition: left 0.5s;
        }

        .nav-item:hover {
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(251, 191, 36, 0.3));
          border-color: rgba(234, 179, 8, 0.6);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(234, 179, 8, 0.3), 0 0 20px rgba(234, 179, 8, 0.2);
        }

        .nav-item:hover::before {
          left: 100%;
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(251, 191, 36, 0.5));
          border-color: rgba(234, 179, 8, 0.8);
          box-shadow: 0 0 30px rgba(234, 179, 8, 0.4), 0 8px 25px rgba(234, 179, 8, 0.3);
        }

        .nav-icon {
          font-size: 1.2rem;
        }

        .nav-text {
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(251, 191, 36, 0.3));
          border: 1px solid rgba(234, 179, 8, 0.4);
          border-radius: 1rem;
          color: #ffffff;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 1;
          overflow: hidden;
          backdrop-filter: blur(8px);
        }

        .logout-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.3), transparent);
          transition: left 0.5s;
        }

        .logout-btn:hover {
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(251, 191, 36, 0.5));
          border-color: rgba(234, 179, 8, 0.7);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(234, 179, 8, 0.4), 0 0 20px rgba(234, 179, 8, 0.3);
        }

        .logout-btn:hover::before {
          left: 100%;
        }

        .main-content {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .content-area {
          min-height: calc(100vh - 140px);
          padding: 2rem;
          position: relative;
        }

        .content-area::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 30% 20%, rgba(234, 179, 8, 0.03) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(251, 191, 36, 0.02) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        @media (min-width: 1024px) {
          .content-area {
            min-height: calc(100vh - 100px);
          }
        }

        .mobile-nav {
          display: flex;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(39, 39, 42, 0.9));
          border-top: 2px solid rgba(234, 179, 8, 0.5);
          backdrop-filter: blur(20px);
          padding: 0;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.8), 0 -4px 20px rgba(234, 179, 8, 0.3);
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          min-height: 60px;
          align-items: stretch;
        }

        .mobile-nav::-webkit-scrollbar {
          display: none;
        }

        .mobile-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.25rem;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          min-width: 60px;
          gap: 0.25rem;
        }

        .mobile-nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(251, 191, 36, 0.2));
          opacity: 0;
          transition: opacity 0.3s;
        }

        .mobile-nav-item:hover::before,
        .mobile-nav-item.active::before {
          opacity: 1;
        }

        .mobile-nav-item.active {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.3), rgba(251, 191, 36, 0.4));
          box-shadow: 0 0 20px rgba(234, 179, 8, 0.4);
        }

        .mobile-nav-icon {
          font-size: 1.2rem;
          position: relative;
          z-index: 1;
        }

        .mobile-nav-text {
          font-size: 0.65rem;
          font-weight: 500;
          position: relative;
          z-index: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .section-content {
          position: relative;
          z-index: 1;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: bold;
          background: linear-gradient(135deg, #eab308, #fbbf24, #fde047);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
          text-shadow: 0 0 30px rgba(234, 179, 8, 0.4);
          filter: drop-shadow(0 0 10px rgba(234, 179, 8, 0.3));
        }

        .section-description {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        /* Ocultar navegación móvil cuando el modal está abierto */
        body.modal-open .mobile-nav {
          display: none !important;
        }

        body.modal-open .main-content {
          padding-bottom: 0 !important;
        }
      `}</style>

      <div className="flex flex-col h-screen">
        {/* Desktop Navigation Header */}
        {!isMobile && (
          <header className="bg-gradient-to-r from-black/95 via-zinc-900/95 to-black/95 border-b border-yellow-600/40 px-6 py-4 backdrop-blur-xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/8 via-transparent to-yellow-600/8 pointer-events-none"></div>
            <div className="relative flex items-center justify-between">
              <div className="desktop-nav">
                <span className="brand-icon">✂️</span>
                <span className="brand-text">JP Barber - Barbero</span>
              </div>
              
              <div className="nav-items">
                {secciones.map((seccion) => (
                  <button
                    key={seccion.id}
                    onClick={() => setSeccionActual(seccion.id)}
                    className={`nav-item ${seccionActual === seccion.id ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{seccion.icono}</span>
                    <span className="nav-text">{seccion.nombre}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-white font-medium">{barberoInfo?.nombre ? `${barberoInfo.nombre} ${barberoInfo.apellido || ''}`.trim() : 'Barbero'}</span>
                  <p className="text-zinc-400 text-sm">Sesión activa</p>
                </div>
                <button onClick={cerrarSesion} className="logout-btn">
                  <span>🚪</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Mobile Header */}
        {isMobile && (
          <header className="bg-gradient-to-r from-black/95 via-zinc-900/95 to-black/95 border-b border-yellow-600/40 px-4 py-4 backdrop-blur-xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/8 via-transparent to-yellow-600/8 pointer-events-none"></div>
            <div className="relative flex items-center justify-between">
              <div className="desktop-nav">
                <span className="brand-icon">✂️</span>
                <span className="brand-text">JP Barber</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <span className="text-white font-medium text-sm">{barberoInfo?.nombre ? `${barberoInfo.nombre}`.trim() : 'Barbero'}</span>
                </div>
                <button onClick={cerrarSesion} className="logout-btn">
                  <span>🚪</span>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`main-content ${isMobile ? 'pb-20' : ''}`}>
          <div className="content-area relative">
            <div className="relative z-10">
              {renderSeccion()}
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="mobile-nav">
            {secciones.map((seccion) => (
              <button
                key={seccion.id}
                onClick={() => setSeccionActual(seccion.id)}
                className={`mobile-nav-item ${seccionActual === seccion.id ? 'active' : ''}`}
              >
                <span className="mobile-nav-icon">{seccion.icono}</span>
                <span className="mobile-nav-text">{seccion.nombre}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Modal de Venta */}
      {modalVenta.isOpen && (
        <ModalVenta
          isOpen={modalVenta.isOpen}
          onClose={cerrarModalVenta}
          cliente={modalVenta.cita ? {
            nombre: modalVenta.cita.cliente_nombre,
            telefono: modalVenta.cita.cliente_telefono
          } : undefined}
          barberoId={barberoInfo?.id || 0}
          onVentaCompletada={(mensaje, tipo) => {
            mostrarNotificacion(mensaje, tipo as Notification['tipo']);
            if (tipo === 'success') {
              cerrarModalVenta();
              if (seccionActual === 'dashboard') {
                window.location.reload();
              }
            }
          }}
        />
      )}

      {/* Notificaciones */}
      {notification && (
        <CustomNotification
          isOpen={true}
          title={notification.tipo === 'success' ? 'Éxito' : notification.tipo === 'error' ? 'Error' : 'Información'}
          message={notification.mensaje}
          type={notification.tipo}
          onClose={() => setNotification(null)}
          autoClose={true}
          duration={3000}
        />
      )}

      {/* Modal personalizado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[1000]">
          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 border border-yellow-600/40 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4"/>
                  <path d="m12 17 .01 0"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{modalConfig.title}</h3>
              <p className="text-white/70">{modalConfig.message}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={hideModal}
                className="px-6 py-3 bg-zinc-700/50 text-white rounded-xl border border-zinc-600/50 hover:bg-zinc-700/70 hover:border-zinc-500/50 transition-all duration-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  modalConfig.onConfirm?.();
                  hideModal();
                }}
                className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-xl border border-yellow-500/50 transition-all duration-300 font-medium shadow-lg hover:shadow-yellow-500/25"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { PanelBarbero };
export default PanelBarbero;
