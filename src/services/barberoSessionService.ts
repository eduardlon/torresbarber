import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const SESSION_TABLE = 'barbero_sessions';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 horas

export const BARBERO_SESSION_COOKIE = 'barbero_session_token';

export type BarberoSessionBarber = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  usuario: string | null;
  activo?: boolean | null;
  comision_porcentaje?: number | null;
  periodo_pago?: string | null;
};

export type BarberoSession = {
  token: string;
  expiresAt: string;
  remainingSeconds: number;
  barbero: BarberoSessionBarber;
};

export const createBarberoSession = async (params: {
  barberoId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ token: string; expiresAt: string; maxAgeSeconds: number }> => {
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  const { error } = await supabaseAdmin.from(SESSION_TABLE).insert({
    token,
    barbero_id: params.barberoId,
    expires_at: expiresAt.toISOString(),
    last_used_at: now.toISOString(),
    user_agent: params.userAgent ?? null,
    ip_address: params.ipAddress ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    maxAgeSeconds: SESSION_TTL_SECONDS,
  };
};

const ensureSingleBarbero = (raw: unknown): BarberoSessionBarber | null => {
  if (!raw) {
    return null;
  }

  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate) {
    return null;
  }

  const {
    id,
    nombre,
    apellido,
    email,
    telefono,
    usuario,
    activo,
    comision_porcentaje,
    periodo_pago,
  } = candidate as Record<string, unknown>;

  if (!id || typeof id !== 'string') {
    return null;
  }

  return {
    id,
    nombre: typeof nombre === 'string' ? nombre : null,
    apellido: typeof apellido === 'string' ? apellido : null,
    email: typeof email === 'string' ? email : null,
    telefono: typeof telefono === 'string' ? telefono : null,
    usuario: typeof usuario === 'string' ? usuario : null,
    activo: typeof activo === 'boolean' ? activo : true,
    comision_porcentaje:
      typeof comision_porcentaje === 'number'
        ? comision_porcentaje
        : comision_porcentaje != null
        ? Number(comision_porcentaje)
        : null,
    periodo_pago: typeof periodo_pago === 'string' ? periodo_pago : null,
  };
};

export const getBarberoSession = async (token: string): Promise<BarberoSession | null> => {
  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from(SESSION_TABLE)
    .select(
      `token, expires_at,
       barbero:barbero_id(
         id, nombre, apellido, email, telefono, usuario, activo, comision_porcentaje, periodo_pago
       )`
    )
    .eq('token', token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const barbero = ensureSingleBarbero(data?.barbero);

  if (!data || !barbero) {
    return null;
  }

  const now = Date.now();
  const expiresAt = new Date(data.expires_at ?? now);

  if (expiresAt.getTime() <= now) {
    await deleteBarberoSession(token);
    return null;
  }

  const remainingSeconds = Math.max(
    Math.floor((expiresAt.getTime() - now) / 1000),
    0,
  );

  await supabaseAdmin
    .from(SESSION_TABLE)
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', token);

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    remainingSeconds,
    barbero,
  };
};

export const deleteBarberoSession = async (token: string): Promise<void> => {
  if (!token) {
    return;
  }

  await supabaseAdmin.from(SESSION_TABLE).delete().eq('token', token);
};
