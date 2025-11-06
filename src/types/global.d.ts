// Declaraciones de tipos globales para JP Barber

declare global {
  interface Window {
    API_BASE_URL?: string;
    authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>;
    getAuthToken?: () => string | null;
    getBarberoAuthToken?: () => string | null;
    barberoAuthenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response | undefined>;
    barberoLogout?: () => Promise<void>;
    logoutBarbero?: () => Promise<void>;
    removeBarberoAuthToken?: () => void;
    verifyBarberoToken?: () => Promise<boolean>;
    getBarberoInfo?: () => Promise<any>;
    getBarberoStats?: () => Promise<any>;
    getBarberoCitas?: (fecha: string) => Promise<any>;
    getCitasByBarberoAndDate?: (barberoId: number, fecha: string) => Promise<any>;
    addWalkInToQueue?: (walkInData: any) => Promise<any>;
    updateCitaStatus?: (citaId: number, estado: string) => Promise<any>;
    barberoLogin?: (usuario: string, password: string) => Promise<any>;
    GLOBAL_IS_LOCALHOST?: boolean;
  }
}

export {};