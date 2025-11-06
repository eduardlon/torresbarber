/**
 * Store global de la aplicación usando Zustand
 * Gestión de estado optimizada para la barbería
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Tipos para el estado de la aplicación
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'barbero' | 'cliente';
  avatar?: string;
}

export interface Turn {
  id: number;
  client_name: string;
  client_phone?: string;
  service: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  estimated_time: number;
  created_at: string;
  barbero_id?: number;
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
  notifications: boolean;
  soundEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // en segundos
}

interface AppState {
  // Estado de autenticación
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Estado de turnos
  turns: Turn[];
  activeTurn: Turn | null;
  turnsLoading: boolean;
  
  // Estado de notificaciones
  notifications: Notification[];
  
  // Configuraciones
  settings: AppSettings;
  
  // Estado de UI
  sidebarOpen: boolean;
  modalOpen: string | null;
  
  // Estado de conexión
  isOnline: boolean;
  lastSync: number;
  
  // Acciones de autenticación
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  
  // Acciones de turnos
  setTurns: (turns: Turn[]) => void;
  addTurn: (turn: Turn) => void;
  updateTurn: (id: number, updates: Partial<Turn>) => void;
  removeTurn: (id: number) => void;
  setActiveTurn: (turn: Turn | null) => void;
  setTurnsLoading: (loading: boolean) => void;
  
  // Acciones de notificaciones
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Acciones de configuración
  updateSettings: (updates: Partial<AppSettings>) => void;
  
  // Acciones de UI
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  
  // Acciones de conexión
  setOnlineStatus: (online: boolean) => void;
  updateLastSync: () => void;
  
  // Acciones de utilidad
  reset: () => void;
}

// Estado inicial
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  turns: [],
  activeTurn: null,
  turnsLoading: false,
  notifications: [],
  settings: {
    theme: 'light' as const,
    language: 'es' as const,
    notifications: true,
    soundEnabled: true,
    autoRefresh: true,
    refreshInterval: 30,
  },
  sidebarOpen: false,
  modalOpen: null,
  isOnline: true,
  lastSync: Date.now(),
};

// Store principal con persistencia
export const useAppStore = create<AppState>()()
  persist(
    immer((set, get) => ({
      ...initialState,
      
      // Acciones de autenticación
      login: (user: User) => {
        set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.isLoading = false;
        });
      },
      
      logout: () => {
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.turns = [];
          state.activeTurn = null;
          state.notifications = [];
        });
      },
      
      updateUser: (updates: Partial<User>) => {
        set((state) => {
          if (state.user) {
            Object.assign(state.user, updates);
          }
        });
      },
      
      setLoading: (loading: boolean) => {
        set((state) => {
          state.isLoading = loading;
        });
      },
      
      // Acciones de turnos
      setTurns: (turns: Turn[]) => {
        set((state) => {
          state.turns = turns;
          state.turnsLoading = false;
        });
      },
      
      addTurn: (turn: Turn) => {
        set((state) => {
          state.turns.unshift(turn);
        });
      },
      
      updateTurn: (id: number, updates: Partial<Turn>) => {
        set((state) => {
          const index = state.turns.findIndex(turn => turn.id === id);
          if (index !== -1) {
            Object.assign(state.turns[index], updates);
          }
          
          // Actualizar turno activo si es el mismo
          if (state.activeTurn?.id === id) {
            Object.assign(state.activeTurn, updates);
          }
        });
      },
      
      removeTurn: (id: number) => {
        set((state) => {
          state.turns = state.turns.filter(turn => turn.id !== id);
          
          // Limpiar turno activo si es el mismo
          if (state.activeTurn?.id === id) {
            state.activeTurn = null;
          }
        });
      },
      
      setActiveTurn: (turn: Turn | null) => {
        set((state) => {
          state.activeTurn = turn;
        });
      },
      
      setTurnsLoading: (loading: boolean) => {
        set((state) => {
          state.turnsLoading = loading;
        });
      },
      
      // Acciones de notificaciones
      addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
        };
        
        set((state) => {
          state.notifications.unshift(newNotification);
          
          // Limitar a 10 notificaciones máximo
          if (state.notifications.length > 10) {
            state.notifications = state.notifications.slice(0, 10);
          }
        });
        
        // Auto-remover notificación después del tiempo especificado
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration);
        }
      },
      
      removeNotification: (id: string) => {
        set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        });
      },
      
      clearNotifications: () => {
        set((state) => {
          state.notifications = [];
        });
      },
      
      // Acciones de configuración
      updateSettings: (updates: Partial<AppSettings>) => {
        set((state) => {
          Object.assign(state.settings, updates);
        });
      },
      
      // Acciones de UI
      toggleSidebar: () => {
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        });
      },
      
      setSidebarOpen: (open: boolean) => {
        set((state) => {
          state.sidebarOpen = open;
        });
      },
      
      openModal: (modalId: string) => {
        set((state) => {
          state.modalOpen = modalId;
        });
      },
      
      closeModal: () => {
        set((state) => {
          state.modalOpen = null;
        });
      },
      
      // Acciones de conexión
      setOnlineStatus: (online: boolean) => {
        set((state) => {
          state.isOnline = online;
        });
      },
      
      updateLastSync: () => {
        set((state) => {
          state.lastSync = Date.now();
        });
      },
      
      // Resetear estado
      reset: () => {
        set(() => ({ ...initialState }));
      },
    })),
    {
      name: 'jpbarber-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
      }),
    }
  );

// Selectores optimizados
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  login: state.login,
  logout: state.logout,
  updateUser: state.updateUser,
  setLoading: state.setLoading,
}));

export const useTurns = () => useAppStore((state) => ({
  turns: state.turns,
  activeTurn: state.activeTurn,
  turnsLoading: state.turnsLoading,
  setTurns: state.setTurns,
  addTurn: state.addTurn,
  updateTurn: state.updateTurn,
  removeTurn: state.removeTurn,
  setActiveTurn: state.setActiveTurn,
  setTurnsLoading: state.setTurnsLoading,
}));

export const useNotifications = () => useAppStore((state) => ({
  notifications: state.notifications,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}));

export const useSettings = () => useAppStore((state) => ({
  settings: state.settings,
  updateSettings: state.updateSettings,
}));

export const useUI = () => useAppStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  modalOpen: state.modalOpen,
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  openModal: state.openModal,
  closeModal: state.closeModal,
}));

export const useConnection = () => useAppStore((state) => ({
  isOnline: state.isOnline,
  lastSync: state.lastSync,
  setOnlineStatus: state.setOnlineStatus,
  updateLastSync: state.updateLastSync,
}));

// Hook para estadísticas derivadas
export const useStats = () => {
  return useAppStore((state) => {
    const waitingTurns = state.turns.filter(turn => turn.status === 'waiting').length;
    const inProgressTurns = state.turns.filter(turn => turn.status === 'in_progress').length;
    const completedTurns = state.turns.filter(turn => turn.status === 'completed').length;
    const totalTurns = state.turns.length;
    
    return {
      waitingTurns,
      inProgressTurns,
      completedTurns,
      totalTurns,
      hasActiveTurn: !!state.activeTurn,
    };
  });
};

// Hook para notificaciones no leídas
export const useUnreadNotifications = () => {
  return useAppStore((state) => {
    const unreadCount = state.notifications.length;
    const hasUnread = unreadCount > 0;
    
    return {
      unreadCount,
      hasUnread,
      latestNotification: state.notifications[0] || null,
    };
  });
};