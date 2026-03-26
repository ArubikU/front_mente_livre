// Cliente API para Mente Livre Backend
import { ApiClient as GeneratedApiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/types';

// Instancia del cliente autogenerado
const generatedClient = new GeneratedApiClient();

type ClientMethod = (...args: unknown[]) => Promise<unknown>;

// Wrapper que agrega funcionalidad de refresh automático usando Proxy
class ApiClientWrapper {
  private client: GeneratedApiClient;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = generatedClient;
    
    // Crear un proxy que intercepte todas las llamadas a métodos
    return new Proxy(this, {
      get: (target, prop) => {
        const targetRecord = target as Record<PropertyKey, unknown>;
        const clientRecord = target.client as unknown as Record<PropertyKey, unknown>;
        // Si es un método del wrapper, devolverlo directamente
        if (prop in target && typeof targetRecord[prop] === 'function') {
          return (targetRecord[prop] as ClientMethod).bind(target);
        }
        // Si es un método del cliente autogenerado, interceptarlo
        if (prop in target.client && typeof clientRecord[prop] === 'function') {
          return (...args: unknown[]) =>
            target.interceptRequest(() => (clientRecord[prop] as ClientMethod)(...args));
        }
        // Para propiedades, devolverlas directamente
        return targetRecord[prop];
      }
    }) as this;
  }

  setToken(token: string | null) {
    this.client.setToken(token);
  }

  private async refreshAccessToken(): Promise<string> {
    // Si ya se está refrescando, esperar al proceso actual
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        const newToken = data.data?.access_token || data.data?.token;
        
        if (!newToken) {
          throw new Error('No token in refresh response');
        }

        // Actualizar el token
        localStorage.setItem('auth_token', newToken);
        this.setToken(newToken);
        auth.setToken(newToken);

        return newToken;
      } catch (error) {
        // Si falla el refresh, limpiar todo y redirigir al login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
        this.setToken(null);
        auth.removeToken();
        auth.removeRefreshToken();
        auth.removeUser();
        
        // Redirigir al login
        if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
          window.location.href = '/auth';
        }
        
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Interceptar métodos del cliente autogenerado
  private async interceptRequest<T>(
    requestFn: () => Promise<T>,
    isRetry = false
  ): Promise<T> {
    // Leer el token actualizado de localStorage en cada request
    const currentToken = localStorage.getItem('auth_token');
    if (currentToken) {
      this.setToken(currentToken);
    }

    try {
      return await requestFn();
    } catch (error) {
      // Verificar si es un error 401 (Unauthorized)
      // El error puede venir como:
      // - "Token expirado"
      // - "HTTP 401"
      // - "Unauthorized"
      // - "No autenticado"
      // - O cualquier mensaje que indique un 401
      const errorMessage = error instanceof Error ? error.message : String(error);
      const is401Error = 
        errorMessage.includes('401') ||
        errorMessage.toLowerCase().includes('token expirado') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('no autenticado') ||
        errorMessage.toLowerCase().includes('token inválido') ||
        errorMessage.toLowerCase().includes('token expired') ||
        errorMessage.toLowerCase().includes('token invalido');
      
      // Si es 401 y no es un retry, intentar refrescar el token
      if (
        is401Error &&
        !isRetry &&
        !errorMessage.includes('/auth/')
      ) {
        try {
          await this.refreshAccessToken();
          // Reintentar la petición con el nuevo token
          return this.interceptRequest(requestFn, true);
        } catch {
          // Si falla el refresh, propagar el error
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
      }
      throw error;
    }
  }
}

// Instancia del wrapper
const wrapperInstance = new ApiClientWrapper();

// Exportar como el tipo del cliente autogenerado para que TypeScript reconozca todos los métodos
export const apiClient = wrapperInstance as ApiClientWrapper & GeneratedApiClient;

// Helper para manejar tokens de autenticación
export const auth = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
    apiClient.setToken(token);
  },
  removeToken: () => {
    localStorage.removeItem('auth_token');
    apiClient.setToken(null);
  },
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setRefreshToken: (token: string) => {
    localStorage.setItem('refresh_token', token);
  },
  removeRefreshToken: () => {
    localStorage.removeItem('refresh_token');
  },
  getUser: () => {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },
  setUser: (user: unknown) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
  },
  removeUser: () => {
    localStorage.removeItem('auth_user');
  },
};

// Inicializar token si existe
const token = auth.getToken();
if (token) {
  apiClient.setToken(token);
}
