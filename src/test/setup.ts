/**
 * Configuración global para tests con Vitest
 * Incluye setup de testing-library, mocks y utilidades
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

// Mock para window.API_CONFIG
Object.defineProperty(window, 'API_CONFIG', {
  value: {
    baseURL: 'http://localhost:8001/api',
    timeout: 10000
  },
  writable: true
});

// Mock para document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: ''
});

// Mock para window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:4321',
    origin: 'http://localhost:4321'
  },
  writable: true
});

// Configuración de MSW (Mock Service Worker)
beforeAll(() => {
  // Iniciar el servidor de mocks
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  // Limpiar el DOM después de cada test
  cleanup();
  
  // Resetear los handlers de MSW
  server.resetHandlers();
  
  // Limpiar todos los mocks
  vi.clearAllMocks();
});

afterAll(() => {
  // Cerrar el servidor de mocks
  server.close();
});

// Mock de IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  })),
});

// Mock de ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// Mock de matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock de fetch si no está disponible
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Mock de URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock de navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock de navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn().mockImplementation((success) =>
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
  writable: true,
});

// Mock de console.error para tests más limpios
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Configuración de timezone para tests consistentes
process.env.TZ = 'UTC';

// Mock de framer-motion para tests más rápidos
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    img: 'img',
    svg: 'svg',
    path: 'path',
    circle: 'circle',
    rect: 'rect',
    line: 'line',
    polyline: 'polyline',
    polygon: 'polygon',
    ellipse: 'ellipse',
    text: 'text',
    g: 'g',
    defs: 'defs',
    clipPath: 'clipPath',
    mask: 'mask',
    pattern: 'pattern',
    linearGradient: 'linearGradient',
    radialGradient: 'radialGradient',
    stop: 'stop',
    use: 'use',
    symbol: 'symbol',
    marker: 'marker',
    foreignObject: 'foreignObject',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: any) => ({ get: () => initial, set: vi.fn() }),
  useTransform: () => ({ get: () => 0, set: vi.fn() }),
  useSpring: () => ({ get: () => 0, set: vi.fn() }),
  useScroll: () => ({
    scrollX: { get: () => 0 },
    scrollY: { get: () => 0 },
    scrollXProgress: { get: () => 0 },
    scrollYProgress: { get: () => 0 },
  }),
  useViewportScroll: () => ({
    scrollX: { get: () => 0 },
    scrollY: { get: () => 0 },
    scrollXProgress: { get: () => 0 },
    scrollYProgress: { get: () => 0 },
  }),
  useDragControls: () => ({
    start: vi.fn(),
  }),
  useMotionTemplate: () => '',
  useReducedMotion: () => false,
  domAnimation: {},
  domMax: {},
  LazyMotion: ({ children }: { children: React.ReactNode }) => children,
  m: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    img: 'img',
  },
}));

// Configuración global para tests
declare global {
  namespace Vi {
    interface JestAssertion<T = any>
      extends jest.Matchers<void, T>,
        TestingLibraryMatchers<T, void> {}
  }
}

// Tipos para testing-library
interface TestingLibraryMatchers<R, T> {
  toBeInTheDocument(): R;
  toHaveTextContent(text: string | RegExp): R;
  toHaveAttribute(attr: string, value?: string): R;
  toHaveClass(...classNames: string[]): R;
  toBeVisible(): R;
  toBeDisabled(): R;
  toBeEnabled(): R;
  toHaveValue(value: string | number): R;
  toBeChecked(): R;
  toHaveFocus(): R;
  toBeRequired(): R;
  toBeInvalid(): R;
  toBeValid(): R;
}

// Utilidades de testing personalizadas
export const createMockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

export const createMockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};

export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: Object.keys(store).length,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

// Mock de datos para tests
export const mockBarberData = {
  id: '1',
  name: 'Juan Pérez',
  email: 'juan@barberia.com',
  avatar: '/avatars/juan.jpg',
  specialties: ['Corte clásico', 'Barba'],
  rating: 4.8,
  experience: 5,
};

export const mockServiceData = {
  id: '1',
  name: 'Corte de cabello',
  description: 'Corte profesional personalizado',
  duration: 30,
  price: 25,
  category: 'Cortes',
};

export const mockAppointmentData = {
  id: '1',
  clientName: 'Carlos García',
  barberName: 'Juan Pérez',
  barberId: '1',
  serviceId: '1',
  service: 'Corte de cabello',
  date: '2024-01-15',
  time: '10:00',
  status: 'confirmed' as const,
  price: 25,
  duration: 30,
};

export const mockUserData = {
  id: '1',
  name: 'Carlos García',
  email: 'carlos@email.com',
  phone: '+1234567890',
  avatar: '/avatars/carlos.jpg',
  role: 'client' as const,
};