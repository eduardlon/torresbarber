import type { APIRoute } from 'astro';
import {
  BARBERO_SESSION_COOKIE,
  deleteBarberoSession,
  getBarberoSession,
} from '../../../services/barberoSessionService';

export const prerender = false;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get(BARBERO_SESSION_COOKIE)?.value;

    if (!token) {
      return jsonResponse({ success: false, message: 'No hay sesión activa' }, 401);
    }

    const session = await getBarberoSession(token);

    if (!session) {
      cookies.delete(BARBERO_SESSION_COOKIE, { path: '/' });
      return jsonResponse({ success: false, message: 'Sesión expirada' }, 401);
    }

    return jsonResponse({
      success: true,
      barbero: session.barbero,
      expiresAt: session.expiresAt,
      remainingSeconds: session.remainingSeconds,
    });
  } catch (error) {
    console.error('[barbero session] Error obteniendo sesión:', error);
    return jsonResponse({ success: false, message: 'Error interno' }, 500);
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get(BARBERO_SESSION_COOKIE)?.value;
    if (token) {
      await deleteBarberoSession(token);
      cookies.delete(BARBERO_SESSION_COOKIE, { path: '/' });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[barbero session] Error al eliminar sesión:', error);
    return jsonResponse({ success: false, message: 'Error interno' }, 500);
  }
};
