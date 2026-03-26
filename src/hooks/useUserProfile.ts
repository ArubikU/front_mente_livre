import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiClient } from '@/integrations/api/client';
import type { AccountType } from '@/lib/emailClassification';
import type { User } from '@/api/types';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  account_type: AccountType | null;
  email_domain: string | null;
  is_university_verified: boolean | null;
  graduate_recent: boolean | null;
  graduate_until: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading, error } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Consultar el backend para obtener los datos completos del usuario, incluyendo email_classification
      try {
        const response = await apiClient.getuser(user.id);

        if (response && 'data' in response && response.data) {
          const userData = response.data as User & {
            is_university_verified?: boolean;
            graduate_recent?: boolean;
            graduate_until?: string | null;
          };

          const userProfile: UserProfile = {
            id: userData.id || user.id,
            email: userData.email || user.email,
            full_name: userData.full_name || user.full_name || null,
            first_name: userData.first_name || user.first_name || null,
            last_name: userData.last_name || user.last_name || null,
            account_type: (userData.email_classification as AccountType) || null,
            email_domain: (user.email ?? '').split('@')[1] || null,
            is_university_verified: userData.is_university_verified ?? false,
            graduate_recent: userData.graduate_recent ?? false,
            graduate_until: userData.graduate_until ?? null,
            created_at: userData.created_at || new Date().toISOString(),
            updated_at: userData.updated_at || new Date().toISOString()
          };

          console.log('[useUserProfile] ✅ Perfil construido:', {
            account_type: userProfile.account_type,
            is_university_verified: userProfile.is_university_verified
          });

          return userProfile;
        }
      } catch (error) {
        console.error('Error fetching user profile from backend:', error);
      }

      // Fallback: construir perfil desde datos del usuario en sesión
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        full_name: user.full_name || null,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        account_type: null,
        email_domain: user.email.split('@')[1] || null,
        is_university_verified: false,
        graduate_recent: false,
        graduate_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return userProfile;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profile,
    isLoading: authLoading || profileLoading,
    error,
    isAuthenticated: !!user,
    accountType: profile?.account_type ?? null,
  };
}
