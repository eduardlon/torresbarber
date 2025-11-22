import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Mode = 'login' | 'register';

interface StatusMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  confirmPassword: string;
}

const redirectToPanel = (delay = 1200) => {
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get('redirect') || '/panel-cliente';
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, delay);
};

const ClienteAuthForm: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryMode = params.get('mode');
    if (queryMode === 'login' || queryMode === 'register') {
      setMode(queryMode);
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        redirectToPanel(400);
      }
    };

    checkSession();
  }, []);

  const ensureClienteProfile = async (userId: string, payload?: Partial<RegisterForm>) => {
    try {
      const { data: clienteExistente, error: fetchError } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (clienteExistente) {
        return clienteExistente;
      }

      const insertPayload = {
        user_id: userId,
        nombre: payload?.nombre || payload?.email?.split('@')[0] || 'Cliente',
        apellido: payload?.apellido || '',
        email: payload?.email || null,
        telefono: payload?.telefono || null
      };

      const { data: clienteCreado, error: insertError } = await supabase
        .from('clientes')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: clienteActualizado, error: upsertError } = await supabase
            .from('clientes')
            .upsert(insertPayload, { onConflict: 'user_id' })
            .select('*')
            .maybeSingle();

          if (upsertError) {
            throw upsertError;
          }

          return clienteActualizado;
        }

        throw insertError;
      }

      return clienteCreado;
    } catch (error) {
      console.error('Error asegurando perfil de cliente:', error);
      throw error instanceof Error
        ? error
        : new Error('No se pudo garantizar el perfil de cliente.');
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }

      const userId = authData?.user?.id;

      if (!userId) {
        setMessage({ type: 'error', text: 'No fue posible obtener los datos del cliente. Intenta nuevamente.' });
        return;
      }

      const metadata = authData.user?.user_metadata as Record<string, string | undefined> | undefined;
      await ensureClienteProfile(userId, {
        nombre: metadata?.nombre,
        apellido: metadata?.apellido,
        email: authData.user?.email ?? loginForm.email,
        telefono: metadata?.telefono
      });

      setMessage({ type: 'success', text: '¡Bienvenido de nuevo! Redirigiendo…' });
      redirectToPanel();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Error desconocido al iniciar sesión';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      setLoading(false);
      return;
    }

    try {
      // Paso 1: Crear usuario en Supabase Auth con metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            nombre: registerForm.nombre,
            apellido: registerForm.apellido,
            telefono: registerForm.telefono,
            role: 'cliente',
            acepta_marketing: true
          },
          emailRedirectTo: `${window.location.origin}/panel-cliente`
        }
      });

      if (authError) {
        setMessage({ type: 'error', text: authError.message });
        return;
      }

      const user = authData.user;
      if (!user) {
        setMessage({
          type: 'info',
          text: 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.'
        });
        setMode('login');
        return;
      }

      // Paso 2: Crear registro en tabla clientes
      // IMPORTANTE: Esto debe hacerse SIEMPRE, no hay trigger automático
      const clientePayload: RegisterForm = {
        nombre: registerForm.nombre || user.email?.split('@')[0] || 'Cliente',
        apellido: registerForm.apellido || '',
        email: registerForm.email,
        telefono: registerForm.telefono || '',
        password: '',
        confirmPassword: ''
      };

      const clienteData = await ensureClienteProfile(user.id, clientePayload);

      console.log('✅ Cliente disponible:', clienteData);
      setMessage({ type: 'success', text: '¡Cuenta creada exitosamente! Redirigiendo…' });
      redirectToPanel();

    } catch (error) {
      console.error('Error en registro:', error);
      const text = error instanceof Error ? error.message : 'Error desconocido al registrarse';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';
  const title = isLogin ? 'Inicia sesión en JP Barber' : 'Crea tu cuenta en JP Barber';
  const subtitle = isLogin
    ? 'Accede a tu historial, beneficios y preferencias personalizadas.'
    : 'Regístrate para gestionar tus citas, recompensas y cola virtual.';

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-zinc-950 text-white">
      {/* Botón de retroceso */}
      <div className="absolute top-6 left-6 z-50">
        <a 
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-medium text-white transition-all duration-300 backdrop-blur-sm hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al inicio
        </a>
      </div>
      
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.25)_0,_transparent_55%)]" />
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-red-600/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center px-4 py-16 lg:flex-row lg:justify-between lg:py-24">
        <header className="max-w-xl space-y-6 text-center lg:text-left">
          <p className="text-sm uppercase tracking-[0.4em] text-red-200/70">Programa Elite</p>
          <h1 className="font-montserrat text-4xl font-black sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="text-lg text-zinc-300 sm:text-xl">{subtitle}</p>
          <div className="grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
              <p className="font-semibold text-red-200">Reservas inteligentes</p>
              <p className="text-sm text-zinc-300">Gestiona citas, espera virtual y recordatorios desde un mismo lugar.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
              <p className="font-semibold text-red-200">Recompensas reales</p>
              <p className="text-sm text-zinc-300">Suma puntos, canjea cortes y sigue tu progreso con nuestro sistema VIP.</p>
            </div>
          </div>
        </header>

        <div className="mt-12 w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl lg:mt-0">
          <div className="flex rounded-full border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                isLogin ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
              }`}
              disabled={loading}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                !isLogin ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
              }`}
              disabled={loading}
            >
              Registrarse
            </button>
          </div>

          <div className="mt-8">
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-sm font-medium text-zinc-200">
                    Correo electrónico
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={loginForm.email}
                    onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-medium text-zinc-200">
                    Contraseña
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Procesando…' : 'Acceder'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="register-nombre" className="text-sm font-medium text-zinc-200">
                      Nombre
                    </label>
                    <input
                      id="register-nombre"
                      type="text"
                      required
                      value={registerForm.nombre}
                      onChange={(event) => setRegisterForm({ ...registerForm, nombre: event.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                      placeholder="Juan"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-apellido" className="text-sm font-medium text-zinc-200">
                      Apellido
                    </label>
                    <input
                      id="register-apellido"
                      type="text"
                      value={registerForm.apellido}
                      onChange={(event) => setRegisterForm({ ...registerForm, apellido: event.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                      placeholder="Torres"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-email" className="text-sm font-medium text-zinc-200">
                    Correo electrónico
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                    placeholder="cliente@jpbarber.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-telefono" className="text-sm font-medium text-zinc-200">
                    Teléfono de contacto
                  </label>
                  <input
                    id="register-telefono"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={registerForm.telefono}
                    onChange={(event) => setRegisterForm({ ...registerForm, telefono: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                    placeholder="300 000 0000"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="register-password" className="text-sm font-medium text-zinc-200">
                      Contraseña
                    </label>
                    <input
                      id="register-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-confirm" className="text-sm font-medium text-zinc-200">
                      Confirmar contraseña
                    </label>
                    <input
                      id="register-confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={registerForm.confirmPassword}
                      onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-inner outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/40"
                      placeholder="Repite tu contraseña"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Procesando…' : 'Crear cuenta'}
                </button>
              </form>
            )}

            {message && (
              <div
                className={`mt-6 rounded-2xl border px-4 py-3 text-sm transition ${
                  message.type === 'success'
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                    : message.type === 'error'
                    ? 'border-red-400/40 bg-red-500/10 text-red-200'
                    : 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <p className="mt-6 text-center text-xs text-zinc-400">
              Al continuar aceptas nuestros{' '}
              <a href="/terminos" className="text-red-300 underline-offset-2 hover:underline">
                Términos y condiciones
              </a>{' '}
              y la{' '}
              <a href="/politicas" className="text-red-300 underline-offset-2 hover:underline">
                Política de privacidad
              </a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClienteAuthForm;
