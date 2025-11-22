import type { APIRoute } from 'astro';
import {
  BARBERO_SESSION_COOKIE,
  deleteBarberoSession,
} from '../../../services/barberoSessionService';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get(BARBERO_SESSION_COOKIE)?.value;
    if (token) {
      await deleteBarberoSession(token);
      cookies.delete(BARBERO_SESSION_COOKIE, { path: '/' });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[barbero logout] Error al cerrar sesión:', error);
    return jsonResponse({ success: false, message: 'Error interno' }, 500);
  }
};
