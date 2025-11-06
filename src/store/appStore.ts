import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tipos para el estado global de la aplicación
interface User {
  id: number;
  name: string;
  email: string;
  type: 'cliente' | 'barbero' | 'admin';
  phone?: string;
  avatar?: string;
}

interface Barbero {
  id: number;
  nombre: string;
  especialidad?: string;
  disponible: boolean;
  avatar?: string;
}

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  duracion: number; // en minutos
  descripcion?: string;
}

interface Cita {
  id: number;
  cliente_id: number;
  barbero_id: number;
  servicio_id: number;
  fecha_hora: string;
  estado: 'pendiente' | 'confirmada' | 'en_progreso' | 'completada' | 'cancelada';
  notas?: string;
}

interface Turno {
  id: number;
  cliente_nombre: string;
  barbero_id: number;
  numero_turno: number;
  estado: 'en_espera' | 'en_progreso' | 'completado' | 'cancelado';
  tipo: 'cita' | 'walk-in';
  hora_llegada: string;
  tiempo_estimado?: number;
}

interface AppState {
  // Estado de autenticación
  user: User | null;
  isAuthenticated: boolean;
  
  // Datos de la aplicación
  barberos: Barbero[];
  servicios: Servicio[];
  citas: Cita[];
  turnos: Turno[];
  
  // Estado de la UI
  loading: boolean;
  error: string | null;
  
  // Configuración
  apiBaseUrl: string;
  
  // Acciones
  setUser: (user: User | null) => void;
  setBarberos: (barberos: Barbero[]) => void;
  setServicios: (servicios: Servicio[]) => void;
  setCitas: (citas: Cita[]) => void;
  setTurnos: (turnos: Turno[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User) => void;
  logout: () => void;
  clearError: () => void;
  
  // Acciones específicas
  addCita: (cita: Cita) => void;
  updateCita: (id: number, updates: Partial<Cita>) => void;
  removeCita: (id: number) => void;
  addTurno: (turno: Turno) => void;
  updateTurno: (id: number, updates: Partial<Turno>) => void;
  removeTurno: (id: number) => void;
}

// Configuración de la API basada en el entorno
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiHost = isLocalhost ? 'localhost' : window.location.hostname;
    return `http://${apiHost}:8001/api`;
  }
  return 'http://localhost:8001/api';
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      isAuthenticated: false,
      barberos: [],
      servicios: [],
      citas: [],
      turnos: [],
      loading: false,
      error: null,
      apiBaseUrl: getApiBaseUrl(),
      
      // Acciones básicas
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setBarberos: (barberos) => set({ barberos }),
      setServicios: (servicios) => set({ servicios }),
      setCitas: (citas) => set({ citas }),
      setTurnos: (turnos) => set({ turnos }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // Autenticación
      login: (user) => set({ user, isAuthenticated: true, error: null }),
      logout: () => set({ user: null, isAuthenticated: false, citas: [], turnos: [] }),
      
      // Gestión de citas
      addCita: (cita) => set((state) => ({ citas: [...state.citas, cita] })),
      updateCita: (id, updates) => set((state) => ({
        citas: state.citas.map(cita => cita.id === id ? { ...cita, ...updates } : cita)
      })),
      removeCita: (id) => set((state) => ({
        citas: state.citas.filter(cita => cita.id !== id)
      })),
      
      // Gestión de turnos
      addTurno: (turno) => set((state) => ({ turnos: [...state.turnos, turno] })),
      updateTurno: (id, updates) => set((state) => ({
        turnos: state.turnos.map(turno => turno.id === id ? { ...turno, ...updates } : turno)
      })),
      removeTurno: (id) => set((state) => ({
        turnos: state.turnos.filter(turno => turno.id !== id)
      })),
    }),
    {
      name: 'jpbarber-app-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hooks personalizados para acceder a partes específicas del estado
export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAppStore();
  return { user, isAuthenticated, login, logout };
};

export const useBarberos = () => {
  const { barberos, setBarberos } = useAppStore();
  return { barberos, setBarberos };
};

export const useServicios = () => {
  const { servicios, setServicios } = useAppStore();
  return { servicios, setServicios };
};

export const useCitas = () => {
  const { citas, setCitas, addCita, updateCita, removeCita } = useAppStore();
  return { citas, setCitas, addCita, updateCita, removeCita };
};

export const useTurnos = () => {
  const { turnos, setTurnos, addTurno, updateTurno, removeTurno } = useAppStore();
  return { turnos, setTurnos, addTurno, updateTurno, removeTurno };
};

export const useUI = () => {
  const { loading, error, setLoading, setError, clearError } = useAppStore();
  return { loading, error, setLoading, setError, clearError };
};