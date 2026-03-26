import { useEffect, useState, type ReactNode } from 'react';
import { apiClient, auth } from '@/integrations/api/client';
import { AuthContext, type AuthUser } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [therapistId, setTherapistId] = useState<string | null>(null);

  useEffect(() => {
    const token = auth.getToken();
    const savedUser = auth.getUser() as AuthUser | null;

    if (token && savedUser) {
      setSession({ token });
      setUser(savedUser);
      if (savedUser.roles && savedUser.roles.length > 0) {
        setUserRole(savedUser.roles[0].name);
      }
      if (savedUser.therapist_id) {
        setTherapistId(savedUser.therapist_id);
      }
    }

    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.login({
        username: email,
        password: password
      });

      if (response && 'data' in response && response.data) {
        const responseData = response.data as { token: string; refresh_token?: string; user: AuthUser };
        const { token, refresh_token, user: userData } = responseData;

        auth.setToken(token);
        if (refresh_token) auth.setRefreshToken(refresh_token);
        auth.setUser(userData);

        setSession({ token });
        setUser(userData);
        if (userData.roles && userData.roles.length > 0) {
          const roleName = userData.roles[0].name;
          setUserRole(roleName);
        }
        if (userData.therapist_id) setTherapistId(userData.therapist_id);

        return { error: null };
      }

      return { error: new Error('Respuesta inválida del servidor') };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: new Error(message) };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const response = await apiClient.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName
      } as { email: string; password: string; first_name: string; last_name: string });

      if (response && 'data' in response && response.data) {
        const responseData = response.data as { token?: string; refresh_token?: string; user?: AuthUser };
        if (!responseData.token || !responseData.user) {
          return { error: new Error('Respuesta inválida: faltan token o usuario') };
        }

        const { token, refresh_token, user: userData } = responseData;
        auth.setToken(token);
        if (refresh_token) auth.setRefreshToken(refresh_token);
        auth.setUser(userData);

        setSession({ token });
        setUser(userData);
        if (userData.roles && userData.roles.length > 0) {
          setUserRole(userData.roles[0].name);
        }
        if (userData.therapist_id) setTherapistId(userData.therapist_id);

        return { error: null };
      }

      return { error: new Error('Respuesta inválida del servidor') };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: new Error(message) };
    }
  };

  const googleLogin = async (idToken: string) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://backend.mentelivre.org/';
      const response = await fetch(`${baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en autenticación con Google');
      }

      if (data.success && data.data) {
        const { token, refresh_token, user: userData } = data.data;

        auth.setToken(token);
        if (refresh_token) auth.setRefreshToken(refresh_token);
        auth.setUser(userData);

        setSession({ token });
        setUser(userData);
        if (userData.roles && userData.roles.length > 0) {
          setUserRole(userData.roles[0].name);
        }
        if (userData.therapist_id) setTherapistId(userData.therapist_id);

        return { error: null };
      }

      return { error: new Error('Respuesta inválida del servidor') };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: new Error(message) };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      auth.removeToken();
      auth.removeRefreshToken();
      auth.removeUser();
      setUser(null);
      setSession(null);
      setUserRole(null);
      setTherapistId(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      userRole,
      therapistId,
      signIn,
      signUp,
      googleLogin,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}
