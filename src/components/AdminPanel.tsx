import React, { useState, useEffect } from 'react';
import Dashboard from './admin/Dashboard';
import Barberos from './admin/Barberos';
import Productos from './admin/Productos';
import Citas from './admin/Citas';
import GorrasCortes from './admin/GorrasCortes';
import Historial from './admin/Historial';

// Tipos para el componente
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
}

interface ModalConfig {
  type: string;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
}

type SectionType = 'dashboard' | 'barberos' | 'productos' | 'citas' | 'galeria' | 'historial';

const AdminPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ 
    type: '', 
    title: '', 
    message: '', 
    onConfirm: null 
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Verificar autenticación
  useEffect(() => {
    const authToken = localStorage.getItem('auth_token');
    const adminInfo = localStorage.getItem('admin_info');
    
    if (!authToken || !adminInfo) {
      console.warn('[AdminPanel] No hay sesión activa, redirigiendo al login');
      window.location.replace('/login-admin');
      return;
    }

    try {
      const admin = JSON.parse(adminInfo);
      if (!admin.role || !['admin', 'super_admin', 'administrador'].includes(admin.role)) {
        console.warn('[AdminPanel] Usuario no autorizado');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('admin_info');
        window.location.replace('/login-admin');
        return;
      }
      
      setIsAuthenticated(true);
      console.log('✅ Sesión admin válida');
    } catch (error) {
      console.error('[AdminPanel] Error al verificar sesión:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('admin_info');
      window.location.replace('/login-admin');
    }
  }, []);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'barberos', label: 'Barberos', icon: '✂️' },
    { id: 'productos', label: 'Productos', icon: '🛍️' },
    { id: 'citas', label: 'Citas', icon: '📅' },
    { id: 'galeria', label: 'Gorras y Cortes', icon: '🧢' },
    { id: 'historial', label: 'Historial', icon: '📋' }
  ];

  const showConfirmModal = (title: string, message: string, onConfirm: () => void): void => {
    setModalConfig({ type: 'confirm', title, message, onConfirm });
    setShowModal(true);
  };

  const hideModal = (): void => {
    setShowModal(false);
    setModalConfig({ type: '', title: '', message: '', onConfirm: null });
  };

  const handleLogout = (): void => {
    showConfirmModal(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      () => {
        // Limpiar localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('admin_info');
        
        // Redirigir al login
        window.location.replace('/login-admin');
      }
    );
  };

  // Mostrar loading mientras se verifica la autenticación
  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(220, 38, 38, 0.3)',
            borderTop: '4px solid #dc2626',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const handleSectionChange = (section: string): void => {
    setActiveSection(section as SectionType);
  };

  const renderCurrentSection = (): React.ReactNode => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'barberos':
        return <Barberos />;
      case 'productos':
        return <Productos />;
      case 'citas':
        return <Citas />;
      case 'galeria':
        return <GorrasCortes />;
      case 'historial':
        return <Historial />;
      default:
        return (
          <div className="section-content">
            <h1 className="section-title">Sección no encontrada</h1>
            <p className="section-description">La sección solicitada no existe</p>
          </div>
        );
    }
  };

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
          background: radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 40% 80%, rgba(220, 38, 38, 0.12) 0%, transparent 50%),
                      radial-gradient(circle at 60% 30%, rgba(239, 68, 68, 0.05) 0%, transparent 40%);
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
          filter: drop-shadow(0 0 10px rgba(220, 38, 38, 0.5));
        }

        .brand-text {
          font-size: 1.5rem;
          font-weight: bold;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(220, 38, 38, 0.3);
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
          border: 1px solid rgba(220, 38, 38, 0.3);
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
          background: linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.2), transparent);
          transition: left 0.5s;
        }

        .nav-item:hover {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(239, 68, 68, 0.3));
          border-color: rgba(220, 38, 38, 0.6);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3), 0 0 20px rgba(220, 38, 38, 0.2);
        }

        .nav-item:hover::before {
          left: 100%;
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.4), rgba(239, 68, 68, 0.5));
          border-color: rgba(220, 38, 38, 0.8);
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.4), 0 8px 25px rgba(220, 38, 38, 0.3);
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
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(239, 68, 68, 0.3));
          border: 1px solid rgba(220, 38, 38, 0.4);
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
          background: linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.3), transparent);
          transition: left 0.5s;
        }

        .logout-btn:hover {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.4), rgba(239, 68, 68, 0.5));
          border-color: rgba(220, 38, 38, 0.7);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4), 0 0 20px rgba(220, 38, 38, 0.3);
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
          background: radial-gradient(circle at 30% 20%, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(239, 68, 68, 0.02) 0%, transparent 50%);
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
          border-top: 2px solid rgba(220, 38, 38, 0.5);
          backdrop-filter: blur(20px);
          padding: 0;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.8), 0 -4px 20px rgba(220, 38, 38, 0.3);
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
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(239, 68, 68, 0.2));
          opacity: 0;
          transition: opacity 0.3s;
        }

        .mobile-nav-item:hover::before,
        .mobile-nav-item.active::before {
          opacity: 1;
        }

        .mobile-nav-item.active {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(239, 68, 68, 0.4));
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
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
          background: linear-gradient(135deg, #dc2626, #ef4444, #f87171);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
          text-shadow: 0 0 30px rgba(220, 38, 38, 0.4);
          filter: drop-shadow(0 0 10px rgba(220, 38, 38, 0.3));
        }

        .section-description {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <div className="flex flex-col h-screen">
        {/* Desktop Navigation Header */}
        {!isMobile && (
          <header className="bg-gradient-to-r from-black/95 via-zinc-900/95 to-black/95 border-b border-red-600/40 px-6 py-4 backdrop-blur-xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/8 via-transparent to-red-600/8 pointer-events-none"></div>
            <div className="relative flex items-center justify-between">
              <div className="desktop-nav">
                <span className="brand-icon">
                  <svg width="48" height="48" viewBox="0 0 120 120" className="inline-block">
                    {/* Sombra del poste */}
                    <ellipse cx="62" cy="108" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
                    
                    {/* Cilindro principal más delgado */}
                    <rect x="48" y="20" width="24" height="80" rx="12" fill="#f8f9fa" stroke="#2d3748" strokeWidth="1.5"/>
                    
                    {/* Patrón de rayas espirales más definido */}
                    <defs>
                      <pattern id="barberStripes" patternUnits="userSpaceOnUse" width="24" height="12" patternTransform="rotate(25)">
                        <rect width="24" height="4" fill="#dc2626"/>
                        <rect y="4" width="24" height="4" fill="#ffffff"/>
                        <rect y="8" width="24" height="4" fill="#1d4ed8"/>
                      </pattern>
                      <linearGradient id="cylinderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
                        <stop offset="30%" stopColor="rgba(255,255,255,0.1)"/>
                        <stop offset="70%" stopColor="rgba(0,0,0,0.05)"/>
                        <stop offset="100%" stopColor="rgba(0,0,0,0.15)"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Aplicar rayas al cilindro */}
                    <rect x="48" y="25" width="24" height="70" rx="12" fill="url(#barberStripes)"/>
                    
                    {/* Efecto cilíndrico */}
                    <rect x="48" y="25" width="24" height="70" rx="12" fill="url(#cylinderGradient)" opacity="0.7"/>
                    
                    {/* Tapa superior negra */}
                    <ellipse cx="60" cy="25" rx="14" ry="7" fill="#1a202c"/>
                    <ellipse cx="60" cy="23" rx="12" ry="5" fill="#2d3748"/>
                    <ellipse cx="60" cy="21" rx="10" ry="3" fill="#4a5568"/>
                    
                    {/* Tapa inferior negra */}
                    <ellipse cx="60" cy="95" rx="14" ry="7" fill="#1a202c"/>
                    <ellipse cx="60" cy="93" rx="12" ry="5" fill="#2d3748"/>
                    <ellipse cx="60" cy="91" rx="10" ry="3" fill="#4a5568"/>
                    
                    {/* Reflejo en el cilindro */}
                    <rect x="50" y="25" width="4" height="70" rx="2" fill="rgba(255,255,255,0.3)" opacity="0.6"/>
                    
                    {/* Detalles metálicos en tapas */}
                    <ellipse cx="60" cy="21" rx="6" ry="2" fill="#718096" opacity="0.8"/>
                    <ellipse cx="60" cy="91" rx="6" ry="2" fill="#718096" opacity="0.8"/>
                  </svg>
                </span>
                <span className="brand-text">JP Barber</span>
              </div>
              
              <div className="nav-items">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                  </button>
                ))}
              </div>
              
              <button onClick={handleLogout} className="logout-btn">
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </header>
        )}

        {/* Mobile Header */}
        {isMobile && (
          <header className="bg-gradient-to-r from-black/95 via-zinc-900/95 to-black/95 border-b border-red-600/40 px-4 py-4 backdrop-blur-xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/8 via-transparent to-red-600/8 pointer-events-none"></div>
            <div className="relative flex items-center justify-between">
              <div className="desktop-nav">
                <span className="brand-icon">
                  <svg width="42" height="42" viewBox="0 0 120 120" className="inline-block">
                    {/* Sombra del poste */}
                    <ellipse cx="62" cy="108" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
                    
                    {/* Cilindro principal más delgado */}
                    <rect x="48" y="20" width="24" height="80" rx="12" fill="#f8f9fa" stroke="#2d3748" strokeWidth="1.5"/>
                    
                    {/* Patrón de rayas espirales más definido */}
                    <defs>
                      <pattern id="barberStripesMobile" patternUnits="userSpaceOnUse" width="24" height="12" patternTransform="rotate(25)">
                        <rect width="24" height="4" fill="#dc2626"/>
                        <rect y="4" width="24" height="4" fill="#ffffff"/>
                        <rect y="8" width="24" height="4" fill="#1d4ed8"/>
                      </pattern>
                      <linearGradient id="cylinderGradientMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
                        <stop offset="30%" stopColor="rgba(255,255,255,0.1)"/>
                        <stop offset="70%" stopColor="rgba(0,0,0,0.05)"/>
                        <stop offset="100%" stopColor="rgba(0,0,0,0.15)"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Aplicar rayas al cilindro */}
                    <rect x="48" y="25" width="24" height="70" rx="12" fill="url(#barberStripesMobile)"/>
                    
                    {/* Efecto cilíndrico */}
                    <rect x="48" y="25" width="24" height="70" rx="12" fill="url(#cylinderGradientMobile)" opacity="0.7"/>
                    
                    {/* Tapa superior negra */}
                    <ellipse cx="60" cy="25" rx="14" ry="7" fill="#1a202c"/>
                    <ellipse cx="60" cy="23" rx="12" ry="5" fill="#2d3748"/>
                    <ellipse cx="60" cy="21" rx="10" ry="3" fill="#4a5568"/>
                    
                    {/* Tapa inferior negra */}
                    <ellipse cx="60" cy="95" rx="14" ry="7" fill="#1a202c"/>
                    <ellipse cx="60" cy="93" rx="12" ry="5" fill="#2d3748"/>
                    <ellipse cx="60" cy="91" rx="10" ry="3" fill="#4a5568"/>
                    
                    {/* Reflejo en el cilindro */}
                    <rect x="50" y="25" width="4" height="70" rx="2" fill="rgba(255,255,255,0.3)" opacity="0.6"/>
                    
                    {/* Detalles metálicos en tapas */}
                    <ellipse cx="60" cy="21" rx="6" ry="2" fill="#718096" opacity="0.8"/>
                    <ellipse cx="60" cy="91" rx="6" ry="2" fill="#718096" opacity="0.8"/>
                  </svg>
                </span>
                <span className="brand-text">JP Barber</span>
              </div>
              
              <button onClick={handleLogout} className="logout-btn">
                <span>🚪</span>
              </button>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`main-content ${isMobile ? 'pb-20' : ''}`}>
          <div className="content-area relative">
            <div className="relative z-10">
              {renderCurrentSection()}
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="mobile-nav">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={`mobile-nav-item ${activeSection === item.id ? 'active' : ''}`}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-text">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Modal personalizado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[1000]">
          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 border border-red-600/40 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
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
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl border border-red-500/50 transition-all duration-300 font-medium shadow-lg hover:shadow-red-500/25"
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

export default AdminPanel;