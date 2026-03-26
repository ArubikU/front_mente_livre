import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Eye, Lock, Edit, Trash2 } from 'lucide-react';
import { apiClient, auth } from '@/integrations/api/client';
import type { Therapist } from '@/api/types';
import { API_BASE_URL } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { TherapistProfileEditor } from '@/components/therapist/TherapistProfileEditor';
import { TherapistPhotoUploader } from '@/components/admin/TherapistPhotoUploader';
import { CreateTherapistDialog } from '@/components/admin/CreateTherapistDialog';
import type { ExtendedTherapist, TherapistFieldVisibility } from '@/types/therapist-profile';
import { FIELD_LABELS, DEFAULT_FIELD_VISIBILITY } from '@/types/therapist-profile';
import { useUpdateFieldVisibility } from '@/hooks/useTherapistProfile';
import type { Json } from '@/integrations/api/types';
import { toast } from 'sonner';

const isDeleteNotSupportedError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('405') ||
    message.includes('404') ||
    message.includes('method not allowed') ||
    message.includes('cannot delete') ||
    message.includes('not found')
  );
};

// Componente interno para el contenido del modal de visibilidad
function VisibilityControlContent({
  therapistId,
  therapists,
  onVisibilityToggle,
  onLockToggle
}: {
  therapistId: string;
  therapists: ExtendedTherapist[];
  onVisibilityToggle: (therapist: ExtendedTherapist, fieldName: keyof TherapistFieldVisibility) => void;
  onLockToggle: (therapist: ExtendedTherapist, fieldName: keyof TherapistFieldVisibility) => void;
}) {
  // Buscar el terapeuta actualizado del array (esto se actualiza automáticamente cuando cambia la query)
  const therapist = useMemo(() => {
    return therapists.find(t => t.id === therapistId);
  }, [therapists, therapistId]);

  if (!therapist) {
    return <div className="text-center py-4 text-muted-foreground">Terapeuta no encontrado</div>;
  }

  return (
    <div className="space-y-4 mt-4">
      {(Object.keys(FIELD_LABELS) as Array<keyof TherapistFieldVisibility>).map((fieldName) => {
        const field = (therapist.field_visibility ?? DEFAULT_FIELD_VISIBILITY)[fieldName];

        return (
          <div
            key={fieldName}
            className="flex items-center justify-between p-3 rounded-lg border"
          >
            <div>
              <p className="font-medium text-sm">{FIELD_LABELS[fieldName]}</p>
              <div className="flex gap-2 mt-1">
                {field.is_visible && (
                  <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                    Visible
                  </Badge>
                )}
                {field.locked_by_admin && (
                  <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">
                    Bloqueado
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Visible</span>
                <Switch
                  checked={field.is_visible}
                  onCheckedChange={() => onVisibilityToggle(therapist, fieldName)}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Bloquear</span>
                <Switch
                  checked={field.locked_by_admin}
                  onCheckedChange={() => onLockToggle(therapist, fieldName)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper to safely parse field_visibility
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

export function AdminTherapistManager() {
  const [selectedTherapist, setSelectedTherapist] = useState<ExtendedTherapist | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const updateVisibility = useUpdateFieldVisibility();
  const queryClient = useQueryClient();

  // Mutation to toggle therapist active status (show/hide card)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ therapistId, isActive }: { therapistId: string; isActive: boolean }) => {
      await apiClient.updatetherapist(therapistId, { is_active: isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-therapists'] });
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      toast.success(variables.isActive ? 'Terapeuta visible en la página' : 'Terapeuta oculto de la página');
    },
    onError: () => {
      toast.error('Error al cambiar visibilidad del terapeuta');
    },
  });

  const { data: therapists, isLoading, error } = useQuery<ExtendedTherapist[]>({
    queryKey: ['admin-all-therapists'],
    staleTime: 0, // No usar caché
    gcTime: 0, // No guardar en caché (antes cacheTime)
    queryFn: async () => {
      // El backend detecta automáticamente si el usuario es admin y devuelve todos los terapeutas
      const token = auth.getToken();
      const response = await fetch(`${API_BASE_URL}/therapists?include_inactive=true`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && 'data' in data && Array.isArray(data.data)) {
        type TherapistWithVisibility = Therapist & {
          field_visibility?: Json | string | null;
          photos?: any[] | null;
          photo_url?: string | null;
        };
        const therapists = (data.data as TherapistWithVisibility[])
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          .map(t => {
            // Extraer photo_url del array de photos si no viene en el root
            let photo_url = t.photo_url;
            if (!photo_url && t.photos && Array.isArray(t.photos) && t.photos.length > 0) {
              const profilePhoto = (t.photos as any[]).find((p) => p.photo_type === 'profile') || t.photos[0];
              photo_url = profilePhoto?.photo_url ?? null;
            }

            return {
              ...t,
              photo_url,
              // Normalizar is_active a boolean (puede venir como 0/1 desde MySQL)
              is_active: t.is_active === true || (typeof t.is_active === 'number' && t.is_active === 1),
              field_visibility: parseFieldVisibility(t.field_visibility ?? null),
            };
          }) as ExtendedTherapist[];

        return therapists;
      }

      return [];
    },
  });

  const deleteTherapistMutation = useMutation({
    mutationFn: async (therapistId: string) => {
      try {
        await apiClient.delete(`/therapists/${therapistId}`);
        return 'deleted' as const;
      } catch (error) {
        if (isDeleteNotSupportedError(error)) {
          await apiClient.updatetherapist(therapistId, { is_active: false });
          return 'deactivated' as const;
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-therapists'] });
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      queryClient.invalidateQueries({ queryKey: ['therapists-for-linking'] });
      if (result === 'deleted') {
        toast.success('Psicólogo eliminado correctamente');
      } else {
        toast.success('El backend no permite borrar; se desactivó el psicólogo');
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el psicólogo';
      toast.error(message);
    },
  });


  const handleLockToggle = async (
    therapist: ExtendedTherapist,
    fieldName: keyof TherapistFieldVisibility
  ) => {
    const fv = therapist.field_visibility ?? DEFAULT_FIELD_VISIBILITY;
    const currentField = fv[fieldName];
    const newVisibility: TherapistFieldVisibility = {
      ...fv,
      [fieldName]: {
        ...currentField,
        locked_by_admin: !currentField.locked_by_admin,
      },
    };

    await updateVisibility.mutateAsync({
      therapistId: therapist.id!,
      fieldVisibility: newVisibility,
    });
  };

  const handleVisibilityToggle = async (
    therapist: ExtendedTherapist,
    fieldName: keyof TherapistFieldVisibility
  ) => {
    const fv = therapist.field_visibility ?? DEFAULT_FIELD_VISIBILITY;
    const currentField = fv[fieldName];
    const newVisibility: TherapistFieldVisibility = {
      ...fv,
      [fieldName]: {
        ...currentField,
        is_visible: !currentField.is_visible,
      },
    };

    await updateVisibility.mutateAsync({
      therapistId: therapist.id!,
      fieldVisibility: newVisibility,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Perfiles de Psicólogos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive font-semibold">Error al cargar terapeutas</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Revisa la consola para más detalles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!therapists || therapists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Perfiles de Psicólogos
              </CardTitle>
              <CardDescription className="mt-1.5">
                Administra los perfiles, campos visibles y bloqueos de edición
              </CardDescription>
            </div>
            <CreateTherapistDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No hay psicólogos registrados</p>
            <p className="text-sm text-muted-foreground mt-2">
              Crea un nuevo perfil usando el botón de arriba
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión de Perfiles de Psicólogos
            </CardTitle>
            <CardDescription className="mt-1.5">
              Administra los perfiles, campos visibles y bloqueos de edición
            </CardDescription>
          </div>
          <div className="w-full sm:w-auto">
            <CreateTherapistDialog />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {therapists.map((therapist) => {
            const fv = therapist.field_visibility ?? DEFAULT_FIELD_VISIBILITY;
            const visibleCount = Object.values(fv).filter((f: { is_visible: boolean }) => f.is_visible).length;
            const lockedCount = Object.values(fv).filter((f: { locked_by_admin: boolean }) => f.locked_by_admin).length;

            return (
              <div
                key={therapist.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Info section: photo + name + badges */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <TherapistPhotoUploader
                    therapistId={therapist.id!}
                    therapistName={therapist.name!}
                    currentPhotoUrl={therapist.photo_url ?? null}
                  />

                  <div className="min-w-0">
                    <p className="font-semibold truncate">{therapist.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
                      <Badge variant={therapist.is_active ? 'default' : 'secondary'}>
                        {therapist.is_active ? 'Visible' : 'Oculto'}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {visibleCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {lockedCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions section: toggle + buttons */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                  {/* Toggle to show/hide therapist card */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {therapist.is_active ? 'Visible' : 'Oculto'}
                    </span>
                    <Switch
                      checked={therapist.is_active}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({
                        therapistId: therapist.id!,
                        isActive: checked
                      })}
                      disabled={toggleActiveMutation.isPending}
                    />
                  </div>

                  {/* Visibility Control Dialog */}
                  <Dialog key={`visibility-${therapist.id}`}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Visibilidad</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[92vw] sm:max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Control de Visibilidad</DialogTitle>
                        <DialogDescription>
                          {therapist.name} - Configura qué campos son visibles y cuáles están bloqueados
                        </DialogDescription>
                      </DialogHeader>

                      <VisibilityControlContent
                        therapistId={therapist.id!}
                        therapists={therapists}
                        onVisibilityToggle={handleVisibilityToggle}
                        onLockToggle={handleLockToggle}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Edit Profile Dialog */}
                  <Dialog open={editDialogOpen && selectedTherapist?.id === therapist.id} onOpenChange={(open) => {
                    setEditDialogOpen(open);
                    if (open) {
                      setSelectedTherapist(therapist);
                      setIsPreviewVisible(false);
                    } else {
                      setIsPreviewVisible(false);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedTherapist(therapist);
                          setEditDialogOpen(true);
                          setIsPreviewVisible(false);
                        }}
                      >
                        <Edit className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={`max-w-[92vw] ${isPreviewVisible ? 'sm:max-w-7xl' : 'sm:max-w-4xl'} max-h-[90vh] overflow-y-auto transition-all duration-300`}>
                      <DialogHeader>
                        <DialogTitle>Editar Perfil</DialogTitle>
                        <DialogDescription>
                          Editando perfil de {therapist.name}
                        </DialogDescription>
                      </DialogHeader>

                      <TherapistProfileEditor
                        therapistId={therapist.id!}
                        isAdmin={true}
                        onPreviewToggle={setIsPreviewVisible}
                      />
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteTherapistMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Borrar</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar psicólogo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción intentará eliminar el perfil de {therapist.name}. Si el backend no soporta borrado, se desactivará automáticamente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteTherapistMutation.mutate(therapist.id!)}
                        >
                          Sí, eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}

          {(!therapists || therapists.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              No hay psicólogos registrados.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
