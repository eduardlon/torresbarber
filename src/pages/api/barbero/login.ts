import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  BARBERO_SESSION_COOKIE,
  createBarberoSession,
} from '../../../services/barberoSessionService';

export const prerender = false;

const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true,
  secure: import.meta.env.PROD,
};

const sanitizeBarbero = (row: Record<string, unknown>) => ({
  id: row.id,
  nombre: row.nombre ?? null,
  apellido: row.apellido ?? null,
  email: row.email ?? null,
  telefono: row.telefono ?? null,
  usuario: row.usuario ?? null,
});

const getClientIp = (request: Request): string | null => {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }

  return request.headers.get('x-real-ip') ?? null;
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const usuario = body?.usuario?.trim();
    const password = body?.password ?? '';

    if (!usuario || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Usuario y contraseña son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('barberos')
      .select('id, nombre, apellido, email, telefono, usuario, password, activo')
      .ilike('usuario', usuario)
      .maybeSingle();

    if (error) {
      console.error('[barbero login] Error consultando barberos:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Error interno al validar credenciales' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, message: 'Credenciales incorrectas' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (data.activo === false) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tu cuenta está inactiva. Contacta al administrador.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const passwordMatches = await bcrypt.compare(password, data.password ?? '');

    if (!passwordMatches) {
      return new Response(
        JSON.stringify({ success: false, message: 'Credenciales incorrectas' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const session = await createBarberoSession({
      barberoId: data.id,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress: getClientIp(request) ?? undefined,
    });

    cookies.set(BARBERO_SESSION_COOKIE, session.token, {
      ...COOKIE_OPTIONS,
      maxAge: session.maxAgeSeconds,
    });

    return new Response(
      JSON.stringify({
        success: true,
        barbero: sanitizeBarbero(data),
        expiresAt: session.expiresAt,
        sessionToken: session.token,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[barbero login] Error inesperado:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Error interno en el servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
