import { createServerClient } from '@supabase/ssr';
import type { AstroGlobal } from 'astro';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

type AstroCookieOptions = Parameters<AstroGlobal['cookies']['set']>[2];

type SupabaseSetCookie = {
  name: string;
  value: string;
  options?: AstroCookieOptions;
};

const resolveSupabaseUrl = () =>
  import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;

const resolveSupabaseKey = () =>
  import.meta.env.SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const buildCookieOptions = (options?: AstroCookieOptions): AstroCookieOptions => ({
  path: '/',
  sameSite: 'lax',
  secure: import.meta.env.PROD,
  httpOnly: options?.httpOnly ?? true,
  ...options,
});

const resolveProjectRef = () => {
  const supabaseUrl = resolveSupabaseUrl();
  if (!supabaseUrl) {
    return undefined;
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0];
  } catch (error) {
    console.warn('No se pudo determinar el project ref de Supabase:', error);
    return undefined;
  }
};

export function createSupabaseServerClient(
  Astro: Pick<AstroGlobal, 'cookies' | 'request'>,
): SupabaseClient {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = resolveSupabaseKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL o ANON KEY no configurados en las variables de entorno.');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const value = Astro.cookies.get(name)?.value;
        return value;
      },
      set(name: string, value: string, options?: AstroCookieOptions) {
        Astro.cookies.set(name, value, buildCookieOptions(options));
      },
      remove(name: string, options?: AstroCookieOptions) {
        Astro.cookies.delete(name, buildCookieOptions(options));
      },
    },
  });
}

interface RequireAdminResult {
  session: Session | null;
  supabase: SupabaseClient | null;
  redirect: Response | null;
}

export async function requireAdminSession(
  Astro: Pick<AstroGlobal, 'redirect' | 'cookies' | 'request'>,
): Promise<RequireAdminResult> {
  const supabase = createSupabaseServerClient(Astro);

  const initialSessionResponse = await supabase.auth.getSession();
  let session = initialSessionResponse.data.session;
  let error = initialSessionResponse.error;

  if (import.meta.env.DEV) {
    console.info('[requireAdminSession] getSession response:', { error, session });
  }

  if ((!session || error) && typeof Astro.cookies !== 'undefined') {
    const projectRef = resolveProjectRef();
    const tokenNames = (base: string) =>
      projectRef ? [`sb-${projectRef}-${base}`, `sb-${base}`] : [`sb-${base}`];

    const accessToken = tokenNames('access-token')
      .map((name) => Astro.cookies.get(name)?.value)
      .find((value): value is string => Boolean(value));

    const refreshToken = tokenNames('refresh-token')
      .map((name) => Astro.cookies.get(name)?.value)
      .find((value): value is string => Boolean(value));

    if (accessToken && refreshToken) {
      const { data, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!setSessionError && data.session) {
        session = data.session;
        error = null;
        if (import.meta.env.DEV) {
          console.info('[requireAdminSession] Sesión restaurada desde cookies');
        }
      } else if (import.meta.env.DEV) {
        console.warn('[requireAdminSession] No se pudo restaurar sesión con tokens', setSessionError);
      }
    }
  }

  if (error || !session) {
    if (import.meta.env.DEV) {
      console.warn('[requireAdminSession] No session available, redirecting to /login-admin');
    }
    return { session: null, supabase: null, redirect: Astro.redirect('/login-admin') };
  }

  let role = (session.user.user_metadata?.role ?? session.user.app_metadata?.role) as string | undefined;

  if (import.meta.env.DEV) {
    console.info('[requireAdminSession] Role from metadata:', role);
  }

  if (!role && session.user.email) {
    const { data, error: roleError } = await supabase
      .from('usuarios')
      .select('role, activo')
      .eq('email', session.user.email)
      .maybeSingle();

    if (roleError) {
      console.warn('No se pudo obtener el rol del usuario desde la base de datos:', roleError);
    }

    if (data?.activo === false) {
      if (import.meta.env.DEV) {
        console.warn('[requireAdminSession] Usuario inactivo en tabla usuarios');
      }
      return { session: null, supabase: null, redirect: Astro.redirect('/login-admin') };
    }

    role = data?.role ?? undefined;

    if (import.meta.env.DEV) {
      console.info('[requireAdminSession] Rol recuperado desde tabla usuarios:', role);
    }
  }

  const normalizedRole = role ? role.toLowerCase() : undefined;
  const isAdminRole = normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'superadmin';

  if (!isAdminRole) {
    if (import.meta.env.DEV) {
      console.warn('[requireAdminSession] Rol no autorizado:', { normalizedRole });
    }
    return { session: null, supabase: null, redirect: Astro.redirect('/login-admin') };
  }

  if (import.meta.env.DEV) {
    console.info('[requireAdminSession] Sesión válida para admin');
  }

  return { session, supabase, redirect: null };
}
