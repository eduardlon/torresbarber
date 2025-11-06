import React, { useState } from 'react';
import { ArrowRight, LogIn, Eye, Ticket, Scissors, Calendar, Users, Clock, UserPlus, List } from 'lucide-react';
import PublicQueueSystem from '../public/PublicQueueSystem';
// import Chatbot from '../Chatbot'; // Temporalmente deshabilitado

// Función para verificar autenticación del cliente
const isClientAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  const clienteSession = document.cookie.split(';').find(row => row.trim().startsWith('cliente_session='));
  const authToken = document.cookie.split(';').find(row => row.trim().startsWith('auth_token='));
  return clienteSession && authToken;
};

// Función para manejar navegación con autenticación (solo para panel de cliente)
const handleAuthenticatedNavigation = (href: string) => {
  if (isClientAuthenticated()) {
    window.location.href = href;
  } else {
    // Guardar la URL de destino para redirigir después del login
    localStorage.setItem('redirect_after_login', href);
    window.location.href = '/login-cliente';
  }
};

// --- Componente de Botón Principal (Call to Action) ---
const PrimaryButton = ({ title, href, requiresAuth = false }: { title: string; href: string; requiresAuth?: boolean }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (requiresAuth) {
      e.preventDefault();
      handleAuthenticatedNavigation(href);
    }
  };
  
  return (
    <a
      href={href}
      onClick={handleClick}
      className="
        group flex items-center justify-center w-full max-w-xs px-6 py-4 
        bg-red-700 text-white font-bold text-lg uppercase tracking-wider
        rounded-xl shadow-lg shadow-red-900/40
        transition-all duration-300 ease-in-out
        hover:bg-red-600 hover:shadow-xl hover:shadow-red-800/50 hover:-translate-y-1
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-red-500
        active:scale-95
        cursor-pointer
        no-underline
      "
    >
      {title}
      <ArrowRight className="ml-3 transition-transform duration-300 group-hover:translate-x-1" />
    </a>
  );
};

// --- Componente de Botón Secundario (Galería/Productos) Mejorado ---
const SecondaryButton = ({ title, href, requiresAuth = false }: { title: string; href: string; requiresAuth?: boolean }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (requiresAuth) {
      e.preventDefault();
      handleAuthenticatedNavigation(href);
    }
  };
  
  return (
    <a
        href={href}
        onClick={handleClick}
        className="
            group relative flex items-center justify-center w-full max-w-xs px-6 py-4
            border-2 border-zinc-700 rounded-xl
            text-white/80
            transition-all duration-300 overflow-hidden
            active:scale-95
            cursor-pointer
            no-underline
        "
    >
        <span className="absolute left-0 top-0 h-full w-0 bg-red-700/20 transition-all duration-300 group-hover:w-full"></span>
        <span className="relative flex items-center z-10">
            <Eye className="mr-3 transition-transform duration-300 group-hover:scale-110" size={20} />
            {title}
        </span>
    </a>
  );
};

// --- Componente de Botón para Turnos ---
const TurnButton = ({ title, href }: { title: string; href: string }) => (
     <a
        href={href}
        className="
            group flex items-center justify-center w-full max-w-xs px-6 py-4
            bg-transparent text-red-500 font-bold text-lg
            border-2 border-red-700 rounded-xl
            transition-all duration-300 ease-in-out
            hover:bg-red-700 hover:text-white
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-red-500
            active:scale-95
        "
     >
        <Ticket className="mr-3 transition-transform duration-300 group-hover:rotate-12" />
        {title}
    </a>
);

// --- Componente de Botón de Acceso (Header) ---
const LoginButton = ({ title, href }: { title: string; href: string }) => (
    <a
        href={href}
        className="
            group flex items-center gap-2 rounded-full px-4 py-2
            text-sm text-zinc-400
            bg-zinc-900/50 border border-zinc-800
            transition-all duration-300
            hover:bg-zinc-800 hover:text-white hover:border-zinc-700
        "
    >
        <LogIn size={16} className="transition-transform duration-300 group-hover:scale-110" />
        {title}
    </a>
);

// --- Pantalla Principal ---
export default function HomeScreen() {
  const [showQueueSystem, setShowQueueSystem] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header para accesos de personal */}
      <header className="absolute top-0 left-0 w-full p-4 z-10">
          <div className="container mx-auto flex justify-end gap-x-3">
              <LoginButton title="Acceso Barbero" href="/login-barbero" />
              <LoginButton title="Acceso Admin" href="/login-admin" />
          </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <img
          src="/images/logo-barberia.png"
          alt="Logo de JP Barber"
          width={160}
          height={160}
          className="mb-4"
        />
        <h1 className="text-4xl md:text-6xl text-white font-semibold tracking-wide mt-4 leading-tight">
          JP Barber
        </h1>
        <p className="text-lg text-white/70 mt-2 max-w-md">
          Tu estilo, nuestra pasión. La mejor experiencia en barbería, ahora a un clic de distancia.
        </p>

        {/* Sección de Acciones */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-center items-center w-full max-w-4xl mx-auto">
          <PrimaryButton
            title="Agendar Cita"
            href="/agendar"
            requiresAuth={false}
          />
          
          <button
            onClick={() => setShowQueueSystem(!showQueueSystem)}
            className="
              group flex items-center justify-center w-full max-w-xs px-6 py-4
              bg-transparent text-blue-500 font-bold text-lg
              border-2 border-blue-700 rounded-xl
              transition-all duration-300 ease-in-out
              hover:bg-blue-700 hover:text-white
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500
              active:scale-95
            "
          >
            <List className="mr-3 transition-transform duration-300 group-hover:rotate-12" size={20} />
            {showQueueSystem ? 'Ocultar Cola' : 'Cola Inteligente'}
          </button>
          
          <TurnButton
            title="Ver Turnos"
            href="/pantalla-turnos"
          />
          
          <SecondaryButton
            title="Productos y Cortes"
            href="/productos-servicios"
            requiresAuth={false}
          />
          
          {/* Botón adicional para acceso de cliente */}
          <a
            href="/login-cliente"
            className="
              group flex items-center justify-center w-full max-w-xs px-6 py-4
              bg-gradient-to-r from-zinc-800 to-zinc-900 text-white font-semibold
              border border-zinc-700 rounded-xl
              transition-all duration-300 ease-in-out
              hover:from-zinc-700 hover:to-zinc-800 hover:border-zinc-600
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-zinc-500
              active:scale-95
            "
          >
            <Users className="mr-3 transition-transform duration-300 group-hover:scale-110" size={20} />
            Acceso Cliente
          </a>
        </div>

        {/* Sistema de Cola Inteligente */}
        {showQueueSystem && (
          <div className="mt-12 w-full max-w-6xl mx-auto px-4">
            <div className="bg-gradient-to-br from-zinc-900/95 to-black/95 border border-yellow-600/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <span className="text-yellow-500">🎯</span>
                  Sistema de Cola Inteligente
                </h2>
                <button
                  onClick={() => setShowQueueSystem(false)}
                  className="text-zinc-400 hover:text-white transition-colors p-2"
                >
                  ✕
                </button>
              </div>
              <PublicQueueSystem onNotification={showNotification} />
            </div>
          </div>
        )}
      </main>

       {/* Footer */}
       <footer className="w-full p-4 text-center">
         <p className="text-zinc-500 text-sm">
           © {new Date().getFullYear()} JP Barber. Todos los derechos reservados.
         </p>
       </footer>
       
       {/* Chatbot - Temporalmente deshabilitado para debugging */}
       {/* <Chatbot apiBaseUrl="http://localhost:8001/api" /> */}

       {/* Sistema de Notificaciones */}
       {notification && (
         <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
           notification.type === 'success' ? 'bg-green-600 text-white' :
           notification.type === 'error' ? 'bg-red-600 text-white' :
           notification.type === 'warning' ? 'bg-yellow-600 text-black' :
           'bg-blue-600 text-white'
         }`}>
           <div className="flex items-center justify-between">
             <span className="font-medium">{notification.message}</span>
             <button
               onClick={() => setNotification(null)}
               className="ml-3 text-current opacity-70 hover:opacity-100"
             >
               ✕
             </button>
           </div>
         </div>
       )}
    </div>
  );
}