import { createContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  roles?: Array<{ id: number; name: string }>;
  therapist_id?: string | null;
  /** Optional metadata (e.g. from auth provider or localStorage) */
  user_metadata?: { full_name?: string };
  /** Optional creation date (e.g. from backend or localStorage) */
  created_at?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: { token: string } | null;
  isLoading: boolean;
  userRole: string | null;
  therapistId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  googleLogin: (idToken: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
