import type { AstroCookies } from 'astro';
import {
  BARBERO_SESSION_COOKIE,
  getBarberoSession,
  type BarberoSession,
} from '../services/barberoSessionService';

export class BarberoAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export const requireBarberoSession = async (cookies: AstroCookies): Promise<BarberoSession> => {
  const token = cookies.get(BARBERO_SESSION_COOKIE)?.value;

  if (!token) {
    throw new BarberoAuthError('No autorizado: inicia sesión nuevamente.', 401);
  }

  const session = await getBarberoSession(token);

  if (!session) {
    cookies.delete(BARBERO_SESSION_COOKIE, { path: '/' });
    throw new BarberoAuthError('Sesión expirada. Inicia sesión nuevamente.', 401);
  }

  if (session.barbero?.activo === false) {
    throw new BarberoAuthError('Tu cuenta fue desactivada. Contacta al administrador.', 403);
  }

  return session;
};
