import React, { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import CustomNotification from '../admin/CustomNotification.tsx';

interface Notification {
  mensaje: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
}

const BarberoLogin: React.FC = () => {
  const [loginData, setLoginData] = useState({ usuario: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const response = await fetch('/api/barbero/session', { headers: { Accept: 'application/json' } });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.success) {
          window.location.href = '/panel';
        }
      } catch (error) {
        console.error('Error verificando sesión activa:', error);
      }
    };

    verificarSesion();
  }, []);

  const mostrarNotificacion = (mensaje: string, tipo: Notification['tipo'] = 'info') => {
    setNotification({ mensaje, tipo });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const response = await fetch('/api/barbero/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          usuario: loginData.usuario.trim(),
          password: loginData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        mostrarNotificacion(data?.message || 'Usuario o contraseña incorrectos', 'error');
        return;
      }

      mostrarNotificacion(`¡Bienvenido ${data.barbero?.nombre ?? ''}!`, 'success');
      setTimeout(() => {
        window.location.href = '/panel';
      }, 600);
    } catch (error) {
      console.error('❌ Error en login:', error);
      mostrarNotificacion('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <style>{`
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
        .form-group { margin-bottom: 1.5rem; }
        .form-label {
          display: block;
          color: white;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .input-container { position: relative; }
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
        .form-input::placeholder { color: rgba(255, 255, 255, 0.4); }
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
        .password-toggle:hover { color: rgba(255, 255, 255, 0.6); }
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
        .login-link:hover { color: #fca5a5; }
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

            <button type="submit" disabled={loginLoading} className="login-button">
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
};

export default BarberoLogin;
