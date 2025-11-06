/**
 * Servidor de mocks para testing con MSW (Mock Service Worker)
 * Simula las APIs del backend para tests unitarios e integración
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Tipos para las respuestas de la API
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Datos mock
const mockBarbers = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@barberia.com',
    avatar: '/avatars/juan.jpg',
    specialties: ['Corte clásico', 'Barba'],
    rating: 4.8,
    experience: 5,
    available: true,
    schedule: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '16:00' },
      sunday: null,
    },
  },
  {
    id: '2',
    name: 'María González',
    email: 'maria@barberia.com',
    avatar: '/avatars/maria.jpg',
    specialties: ['Corte moderno', 'Coloración'],
    rating: 4.9,
    experience: 8,
    available: true,
    schedule: {
      monday: { start: '10:00', end: '19:00' },
      tuesday: { start: '10:00', end: '19:00' },
      wednesday: { start: '10:00', end: '19:00' },
      thursday: { start: '10:00', end: '19:00' },
      friday: { start: '10:00', end: '19:00' },
      saturday: { start: '09:00', end: '17:00' },
      sunday: null,
    },
  },
];

const mockServices = [
  {
    id: '1',
    name: 'Corte de cabello',
    description: 'Corte profesional personalizado',
    duration: 30,
    price: 25,
    category: 'Cortes',
    active: true,
  },
  {
    id: '2',
    name: 'Corte + Barba',
    description: 'Corte de cabello y arreglo de barba',
    duration: 45,
    price: 35,
    category: 'Combos',
    active: true,
  },
  {
    id: '3',
    name: 'Afeitado clásico',
    description: 'Afeitado tradicional con navaja',
    duration: 25,
    price: 20,
    category: 'Barba',
    active: true,
  },
];

interface MockAppointment {
  id: string;
  [key: string]: any;
}

const mockAppointments: MockAppointment[] = [
  {
    id: '1',
    client_name: 'Carlos García',
    client_email: 'carlos@email.com',
    client_phone: '+1234567890',
    barber_id: '1',
    barber_name: 'Juan Pérez',
    service_id: '1',
    service_name: 'Corte de cabello',
    date: '2024-01-15',
    time: '10:00',
    status: 'confirmed',
    price: 25,
    duration: 30,
    notes: '',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
  {
    id: '2',
    client_name: 'Luis Rodríguez',
    client_email: 'luis@email.com',
    client_phone: '+1234567891',
    barber_id: '2',
    barber_name: 'María González',
    service_id: '2',
    service_name: 'Corte + Barba',
    date: '2024-01-15',
    time: '14:00',
    status: 'pending',
    price: 35,
    duration: 45,
    notes: 'Cliente nuevo',
    created_at: '2024-01-10T11:00:00Z',
    updated_at: '2024-01-10T11:00:00Z',
  },
];

const mockUser = {
  id: '1',
  name: 'Admin User',
  email: 'admin@barberia.com',
  role: 'admin',
  avatar: '/avatars/admin.jpg',
  created_at: '2024-01-01T00:00:00Z',
};

const mockTimeSlots = {
  '2024-01-15': [
    { time: '09:00', available: true, barberId: '1', barberName: 'Juan Pérez' },
    { time: '09:30', available: true, barberId: '1', barberName: 'Juan Pérez' },
    { time: '10:00', available: false, barberId: '1', barberName: 'Juan Pérez' },
    { time: '10:30', available: true, barberId: '1', barberName: 'Juan Pérez' },
    { time: '11:00', available: true, barberId: '2', barberName: 'María González' },
    { time: '11:30', available: true, barberId: '2', barberName: 'María González' },
    { time: '12:00', available: true, barberId: '2', barberName: 'María González' },
    { time: '14:00', available: false, barberId: '2', barberName: 'María González' },
    { time: '14:30', available: true, barberId: '1', barberName: 'Juan Pérez' },
    { time: '15:00', available: true, barberId: '1', barberName: 'Juan Pérez' },
  ],
};

// Utilidades para generar respuestas
const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

const createErrorResponse = (message: string, errors?: Record<string, string[]>): ApiResponse => ({
  success: false,
  message,
  errors,
});

const createPaginatedResponse = <T>(
  data: T[],
  page = 1,
  perPage = 10
): PaginatedResponse<T> => ({
  success: true,
  data,
  meta: {
    current_page: page,
    last_page: Math.ceil(data.length / perPage),
    per_page: perPage,
    total: data.length,
  },
});

// Delay para simular latencia de red
const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

type JsonBody = Parameters<typeof HttpResponse.json>[0];

const jsonResponse = (data: JsonBody, status = 200) => HttpResponse.json(data, { status });

// Handlers de la API
export const handlers = [
  // Autenticación
  http.post('/api/auth/login', async ({ request }) => {
    await delay();
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (email === 'admin@barberia.com' && password === 'password') {
      return jsonResponse(
        createSuccessResponse(
          {
            user: mockUser,
            token: 'mock-jwt-token',
          },
          'Login exitoso'
        )
      );
    }

    return jsonResponse(createErrorResponse('Credenciales inválidas'), 401);
  }),

  http.post('/api/auth/logout', async () => {
    await delay();
    return jsonResponse(createSuccessResponse(null, 'Logout exitoso'));
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await delay();
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.includes('mock-jwt-token')) {
      return jsonResponse(createSuccessResponse(mockUser));
    }

    return jsonResponse(createErrorResponse('No autorizado'), 401);
  }),

  // Barberos
  http.get('/api/barbers', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const perPage = Number(url.searchParams.get('per_page')) || 10;

    return jsonResponse(createPaginatedResponse(mockBarbers, page, perPage));
  }),

  http.get('/api/barbers/:id', async ({ params }) => {
    await delay();
    const { id } = params;
    const barber = mockBarbers.find((b) => b.id === id);

    if (!barber) {
      return jsonResponse(createErrorResponse('Barbero no encontrado'), 404);
    }

    return jsonResponse(createSuccessResponse(barber));
  }),

  // Servicios
  http.get('/api/services', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const perPage = Number(url.searchParams.get('per_page')) || 10;

    return jsonResponse(createPaginatedResponse(mockServices, page, perPage));
  }),

  http.get('/api/services/:id', async ({ params }) => {
    await delay();
    const { id } = params;
    const service = mockServices.find((s) => s.id === id);

    if (!service) {
      return jsonResponse(createErrorResponse('Servicio no encontrado'), 404);
    }

    return jsonResponse(createSuccessResponse(service));
  }),

  // Citas
  http.get('/api/appointments', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const perPage = Number(url.searchParams.get('per_page')) || 10;
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');

    let filteredAppointments = [...mockAppointments];

    if (status) {
      filteredAppointments = filteredAppointments.filter((appointment) => appointment.status === status);
    }

    if (date) {
      filteredAppointments = filteredAppointments.filter((appointment) => appointment.date === date);
    }

    return jsonResponse(createPaginatedResponse(filteredAppointments, page, perPage));
  }),

  http.post('/api/appointments', async ({ request }) => {
    await delay();
    const appointmentData = (await request.json()) as Record<string, any>;

    if (!appointmentData.client_name || !appointmentData.date || !appointmentData.time) {
      return jsonResponse(
        createErrorResponse('Datos requeridos faltantes', {
          client_name: appointmentData.client_name ? [] : ['El nombre es requerido'],
          date: appointmentData.date ? [] : ['La fecha es requerida'],
          time: appointmentData.time ? [] : ['La hora es requerida'],
        }),
        422
      );
    }

    const newAppointment = {
      id: String(mockAppointments.length + 1),
      ...appointmentData,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockAppointments.push(newAppointment);

    return jsonResponse(createSuccessResponse(newAppointment, 'Cita creada exitosamente'), 201);
  }),

  http.put('/api/appointments/:id', async ({ params, request }) => {
    await delay();
    const { id } = params;
    const updateData = (await request.json()) as Record<string, any>;

    const appointmentIndex = mockAppointments.findIndex((appointment) => appointment.id === id);

    if (appointmentIndex === -1) {
      return jsonResponse(createErrorResponse('Cita no encontrada'), 404);
    }

    mockAppointments[appointmentIndex] = {
      ...mockAppointments[appointmentIndex],
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    return jsonResponse(createSuccessResponse(mockAppointments[appointmentIndex], 'Cita actualizada'));
  }),

  http.delete('/api/appointments/:id', async ({ params }) => {
    await delay();
    const { id } = params;

    const appointmentIndex = mockAppointments.findIndex((appointment) => appointment.id === id);

    if (appointmentIndex === -1) {
      return jsonResponse(createErrorResponse('Cita no encontrada'), 404);
    }

    mockAppointments.splice(appointmentIndex, 1);

    return jsonResponse(createSuccessResponse(null, 'Cita eliminada'));
  }),

  // Horarios disponibles
  http.get('/api/availability', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const barberId = url.searchParams.get('barber_id');

    if (!date) {
      return jsonResponse(createErrorResponse('Fecha requerida'), 400);
    }

    let slots = mockTimeSlots[date as keyof typeof mockTimeSlots] || [];

    if (barberId) {
      slots = slots.filter((slot) => slot.barberId === barberId);
    }

    return jsonResponse(createSuccessResponse(slots));
  }),

  // Dashboard/Métricas
  http.get('/api/dashboard/metrics', async () => {
    await delay();

    const metrics = {
      totalRevenue: {
        value: 15420,
        previousValue: 13200,
        change: 16.8,
        changeType: 'increase',
      },
      totalAppointments: {
        value: 156,
        previousValue: 142,
        change: 9.9,
        changeType: 'increase',
      },
      totalClients: {
        value: 89,
        previousValue: 76,
        change: 17.1,
        changeType: 'increase',
      },
      averageRating: {
        value: 4.8,
        previousValue: 4.6,
        change: 4.3,
        changeType: 'increase',
      },
      occupancyRate: {
        value: 78.5,
        previousValue: 72.1,
        change: 8.9,
        changeType: 'increase',
      },
      averageServiceTime: {
        value: 32,
        previousValue: 35,
        change: -8.6,
        changeType: 'decrease',
      },
    };

    return jsonResponse(createSuccessResponse(metrics));
  }),

  // Manejo de errores 404
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return jsonResponse(createErrorResponse('Endpoint no encontrado'), 404);
  }),
];

// Crear el servidor
export const server = setupServer(...handlers);

// Utilidades para tests
export const resetMockData = () => {
  // Resetear datos a su estado inicial si es necesario
  mockAppointments.length = 2; // Mantener solo los primeros 2
};

export const addMockAppointment = (appointment: any) => {
  mockAppointments.push({
    id: String(mockAppointments.length + 1),
    ...appointment,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

export const getMockAppointments = () => [...mockAppointments];
export const getMockBarbers = () => [...mockBarbers];
export const getMockServices = () => [...mockServices];
export const getMockUser = () => ({ ...mockUser });