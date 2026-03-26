import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import type { ExtendedTherapist, TherapistFieldVisibility } from '@/types/therapist-profile';
import { DEFAULT_FIELD_VISIBILITY } from '@/types/therapist-profile';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/api/types';
import type { Therapist } from '@/api/types';

// Helper to safely parse field_visibility from DB
const parseFieldVisibility = (data: Json | null | string): TherapistFieldVisibility => {
  // Si es null o undefined, devolver defaults
  if (!data) {
    return DEFAULT_FIELD_VISIBILITY;
  }
  
  // Si es un string, intentar parsearlo como JSON
  let parsed: Record<string, unknown>;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data) as Record<string, unknown>;
    } catch (e) {
      console.error('Error parsing field_visibility JSON:', e);
      return DEFAULT_FIELD_VISIBILITY;
    }
  } else if (typeof data === 'object' && !Array.isArray(data)) {
    parsed = data as Record<string, unknown>;
  } else {
    return DEFAULT_FIELD_VISIBILITY;
  }
  
  // Merge with defaults to ensure all fields exist
  const result = { ...DEFAULT_FIELD_VISIBILITY };
  
  for (const key of Object.keys(DEFAULT_FIELD_VISIBILITY) as Array<keyof TherapistFieldVisibility>) {
    if (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) {
      result[key] = {
        ...DEFAULT_FIELD_VISIBILITY[key],
        ...(parsed[key] as object),
      };
    }
  }
  
  return result;
};

// Helper to convert to Json for DB storage
const toJson = (visibility: TherapistFieldVisibility): Json => {
  return JSON.parse(JSON.stringify(visibility)) as Json;
};

export function useTherapistProfile(therapistId: string | null) {
  return useQuery({
    queryKey: ['therapist-profile', therapistId],
    queryFn: async () => {
      if (!therapistId) return null;
      
      try {
        const response = await apiClient.gettherapist(therapistId);
        
        if (response && 'data' in response && response.data) {
          type TherapistPhoto = { photo_url?: string | null; photo_type?: string | null; photo_position?: string | null };
          const therapist = response.data as Therapist & { field_visibility?: Json; photos?: TherapistPhoto[]; photo_url?: string | null; photo_position?: string | null };
          
          // Extraer photo_url y photo_position del array de photos si existe
          let photo_url: string | null = null;
          let photo_position: string | null = null;
          
          if (therapist.photos && therapist.photos.length > 0) {
            // Buscar foto de perfil primero, si no existe usar la primera
            const profilePhoto = therapist.photos.find((p) => p.photo_type === 'profile') ?? therapist.photos[0];
            photo_url = profilePhoto?.photo_url ?? null;
            photo_position = profilePhoto?.photo_position ?? null;
          }
          
          const finalPhotoUrl = photo_url ?? therapist.photo_url ?? null;
          const finalPhotoPosition = photo_position ?? therapist.photo_position ?? null;
          
          const result = {
            ...therapist,
            photo_url: finalPhotoUrl,
            photo_position: finalPhotoPosition,
            field_visibility: parseFieldVisibility(therapist.field_visibility || null),
          } as ExtendedTherapist;
          
          return result;
        }
        return null;
      } catch (error) {
        console.error('Error fetching therapist profile:', error);
        throw error;
      }
    },
    enabled: !!therapistId,
  });
}

export function useUpdateTherapistProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      therapistId, 
      updates 
    }: { 
      therapistId: string; 
      updates: Partial<Omit<ExtendedTherapist, 'id' | 'created_at' | 'updated_at' | 'field_visibility'>> & { field_visibility?: TherapistFieldVisibility }
    }) => {
      // Build database-safe updates object
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.field_visibility) {
        dbUpdates.field_visibility = toJson(updates.field_visibility);
      }
      
      const response = await apiClient.updatetherapist(therapistId, dbUpdates);
      
      // El backend puede devolver:
      // - { data: { ... }, message: "..." } (con el terapeuta actualizado)
      // - { message: "..." } (actualización exitosa sin datos - caso legacy)
      
      // Si hay data con el terapeuta, lo retornamos
      if (response && typeof response === 'object' && 'data' in response && response.data) {
        // Si response.data es un objeto con el terapeuta (tiene 'id')
        if (typeof response.data === 'object' && !Array.isArray(response.data) && 'id' in response.data) {
          const therapist = response.data as Therapist & { field_visibility?: Json };
          return {
            ...therapist,
            field_visibility: parseFieldVisibility(therapist.field_visibility || null),
          } as ExtendedTherapist;
        }
      }
      
      // Si la respuesta es exitosa (200 OK) pero no tiene data con el terapeuta,
      // la actualización fue exitosa. El terapeuta se recargará automáticamente
      // por la invalidación de queries en onSuccess.
      // Retornamos un objeto vacío para cumplir con el tipo, pero onSuccess no lo usará
      return {} as ExtendedTherapist;
    },
    onSuccess: (_, variables) => {
      // Actualizar optimísticamente el terapeuta en la lista de terapeutas (admin-all-therapists)
      queryClient.setQueryData(['admin-all-therapists'], (old: ExtendedTherapist[] | undefined) => {
        if (!old) return old;
        return old.map(t => 
          t.id === variables.therapistId 
            ? { ...t, ...variables.updates }
            : t
        );
      });
      
      // Invalidar queries para refetch en background
      queryClient.invalidateQueries({ queryKey: ['therapist-profile', variables.therapistId] });
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-therapists'] });
      
      toast({
        title: 'Perfil actualizado',
        description: 'Los cambios se han guardado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios.',
        variant: 'destructive',
      });
      console.error('Error updating therapist profile:', error);
    },
  });
}

export function useUpdateFieldVisibility() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      therapistId, 
      fieldVisibility 
    }: { 
      therapistId: string; 
      fieldVisibility: TherapistFieldVisibility 
    }) => {
      const response = await apiClient.updatetherapist(therapistId, { field_visibility: toJson(fieldVisibility) } as import('@/api/types').TherapistUpdate);
      // El backend puede devolver:
      // - { message: "..." } (actualización exitosa sin datos)
      // - { data: { ... } } (con el terapeuta actualizado)
      // - { success: true, data: { ... }, message: "..." } (formato ApiResponse)
      
      // Si hay data con el terapeuta, lo retornamos
      if (response && typeof response === 'object' && 'data' in response && response.data) {
        // Si response.data es un objeto con el terapeuta (tiene 'id')
        if (typeof response.data === 'object' && !Array.isArray(response.data) && 'id' in response.data) {
          const therapist = response.data as Therapist & { field_visibility?: Json };
          return {
            ...therapist,
            field_visibility: parseFieldVisibility(therapist.field_visibility || null),
          } as ExtendedTherapist;
        }
      }
      
      // Si la respuesta es exitosa (200 OK) pero no tiene data con el terapeuta,
      // la actualización fue exitosa. El terapeuta se recargará automáticamente
      // por la invalidación de queries en onSuccess.
      // Retornamos un objeto vacío para cumplir con el tipo, pero onSuccess no lo usará
      return {} as ExtendedTherapist;
    },
    onSuccess: (updatedTherapist, variables) => {
      // Actualizar optimísticamente el terapeuta en la lista de terapeutas (admin-all-therapists)
      // Esto se hace PRIMERO para que el UI se actualice inmediatamente
      queryClient.setQueryData(['admin-all-therapists'], (old: ExtendedTherapist[] | undefined) => {
        if (!old) return old;
        return old.map(t => 
          t.id === variables.therapistId 
            ? { ...t, field_visibility: variables.fieldVisibility }
            : t
        );
      });
      
      // Actualizar optimísticamente el terapeuta individual
      if (updatedTherapist && 'id' in updatedTherapist) {
        queryClient.setQueryData(['therapist-profile', variables.therapistId], updatedTherapist);
      }
      
      // Invalidar queries para refetch en background (esto actualizará con datos del servidor)
      // Pero la actualización optimista ya está aplicada, así que el UI se mantiene actualizado
      queryClient.invalidateQueries({ queryKey: ['therapist-profile', variables.therapistId] });
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      // No invalidar admin-all-therapists inmediatamente para mantener la actualización optimista
      // Se invalidará cuando el usuario refresque o cuando se haga otra operación
      
      toast({
        title: 'Visibilidad actualizada',
        description: 'Los cambios de visibilidad se han guardado.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la visibilidad.',
        variant: 'destructive',
      });
      console.error('Error updating field visibility:', error);
    },
  });
}

// Hook for admins to manage any therapist profile
export function useAdminTherapistManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateLockStatus = useMutation({
    mutationFn: async ({ 
      therapistId, 
      fieldName, 
      locked 
    }: { 
      therapistId: string; 
      fieldName: keyof TherapistFieldVisibility; 
      locked: boolean 
    }) => {
      // First get current visibility
      const therapistResponse = await apiClient.gettherapist(therapistId);
      if (!therapistResponse || !('data' in therapistResponse) || !therapistResponse.data) {
        throw new Error('Terapeuta no encontrado');
      }
      
      const therapist = therapistResponse.data as Therapist & { field_visibility?: Json };
      const currentVisibility = parseFieldVisibility(therapist.field_visibility || null);
      const updatedVisibility: TherapistFieldVisibility = {
        ...currentVisibility,
        [fieldName]: {
          ...currentVisibility[fieldName],
          locked_by_admin: locked,
        },
      };
      
      const response = await apiClient.updatetherapist(therapistId, { field_visibility: toJson(updatedVisibility) } as import('@/api/types').TherapistUpdate);
      if (response && 'data' in response && response.data) {
        return response.data;
      }
      throw new Error('No se pudo actualizar el estado del campo');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['therapist-profile', variables.therapistId] });
      toast({
        title: variables.locked ? 'Campo bloqueado' : 'Campo desbloqueado',
        description: variables.locked 
          ? 'El psicólogo no podrá modificar este campo.' 
          : 'El psicólogo ahora puede modificar este campo.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del campo.',
        variant: 'destructive',
      });
    },
  });

  return { updateLockStatus };
}
