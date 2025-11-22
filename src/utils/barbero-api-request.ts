export type BarberoApiResponse<T> = {
  success: boolean;
  message?: string;
} & T;

export const requestBarberoApi = async <T,>(endpoint: string, init: RequestInit = {}): Promise<T> => {
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  const response = await fetch(endpoint, { ...init, headers });
  const data = (await response.json().catch(() => null)) as BarberoApiResponse<T> | null;

  if (!response.ok || !data || data.success === false) {
    throw new Error(data?.message || 'Error al comunicar con el servidor');
  }

  return data;
};
