import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import type * as Types from '@/api/types';
import type { Therapist, User } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Search, Link2, Unlink, Mail, User as UserIcon, Check, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface TherapistWithUserLink extends Therapist {
}

interface UserRoleItem {
  id?: number;
  name?: string;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocurrió un error inesperado';
};

export function TherapistUserLinker() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);

  // Obtener todos los terapeutas
  const { data: therapists, isLoading: _loadingTherapists } = useQuery({
    queryKey: ['therapists-for-linking'],
    queryFn: async () => {
      const response = await apiClient.get<Types.getTherapists_Response>('/therapists?include_inactive=true');
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as TherapistWithUserLink[])
          .filter((therapist) => Boolean(therapist?.id && therapist?.name))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          .map(t => ({
            ...t,
            name: t.user_id ? `${t.name} (Vinculado)` : t.name
          }));
      }
      return [];
    },
  });

  // Buscar usuario por email
  const { data: searchResults, isLoading: isSearching, refetch: searchUser } = useQuery({
    queryKey: ['search-user', searchEmail],
    queryFn: async () => {
      if (!searchEmail.trim()) return [];

      // Usar apiClient para obtener usuarios
      const response = await apiClient.getusers();

      if (response && 'data' in response && Array.isArray(response.data)) {
        const searchTerm = searchEmail.trim().toLowerCase();
        return (response.data as User[])
          .filter((user) => {
            const email = (user.email || '').toLowerCase();
            const fullName = (user.full_name || '').toLowerCase();
            return email.includes(searchTerm) || fullName.includes(searchTerm);
          })
          .filter((user) => Boolean(user.id && user.email))
          .map((user) => ({
            id: user.id as string,
            email: user.email as string,
            full_name: user.full_name || user.first_name || null,
          } as UserProfile))
          .slice(0, 5);
      }
      return [];
    },
    enabled: false,
  });

  // Verificar si el usuario ya tiene rol de terapeuta
  const getUserRoleNames = async (userId: string): Promise<string[]> => {
    try {
      const response = await apiClient.getuserroles(userId);
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as UserRoleItem[])
          .map((role) => role?.name)
          .filter((role): role is string => Boolean(role));
      }
      return [];
    } catch {
      return [];
    }
  };

  const assignTherapistRoleIfNeeded = async (userId: string) => {
    const roles = await getUserRoleNames(userId);
    const hasTherapistRole = roles.includes('therapist');

    if (!hasTherapistRole) {
      await apiClient.assignuserrole(userId, { role_name: 'therapist' });
      return true;
    }

    return false;
  };

  const updateTherapistUserLink = async (therapistId: string, userId: string | null) => {
    await apiClient.put(`/therapists/${therapistId}`, { user_id: userId });
  };

  // Vincular usuario a terapeuta
  const linkMutation = useMutation({
    mutationFn: async ({ userId, therapistId }: { userId: string; therapistId: string }) => {
      // Verificar si el terapeuta ya tiene un usuario vinculado
      const therapistResponse = await apiClient.gettherapist(therapistId);
      if (!therapistResponse || !('data' in therapistResponse) || !therapistResponse.data) {
        throw new Error('Terapeuta no encontrado');
      }

      const therapist = therapistResponse.data;

      let assignedRoleInThisAction = false;
      try {
        assignedRoleInThisAction = await assignTherapistRoleIfNeeded(userId);
        await updateTherapistUserLink(therapistId, userId);
      } catch (error) {
        if (assignedRoleInThisAction) {
          try {
            await apiClient.removeuserrole(userId, 'therapist');
          } catch {
            // no-op rollback best effort
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Usuario vinculado',
        description: 'El usuario ha sido vinculado exitosamente al terapeuta.',
      });
      queryClient.invalidateQueries({ queryKey: ['therapists-for-linking'] });
      setSelectedUser(null);
      setSelectedTherapistId(null);
      setSearchEmail('');
      setSearchPerformed(false);
      setStep(1);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  // Desvincular usuario de terapeuta
  const unlinkMutation = useMutation({
    mutationFn: async (therapistId: string) => {
      // Obtener el user_id del terapeuta
      const therapistResponse = await apiClient.gettherapist(therapistId);
      if (!therapistResponse || !('data' in therapistResponse) || !therapistResponse.data) {
        throw new Error('Terapeuta no encontrado');
      }

      const therapist = therapistResponse.data as TherapistWithUserLink;
      if (!therapist.user_id) {
        throw new Error('El terapeuta no tiene un usuario vinculado');
      }

      // Eliminar el rol de terapeuta
      await apiClient.removeuserrole(therapist.user_id, 'therapist');

      // Desvincular el usuario del terapeuta
      await updateTherapistUserLink(therapistId, null);
    },
    onSuccess: () => {
      toast({
        title: 'Usuario desvinculado',
        description: 'El usuario ha sido desvinculado del terapeuta.',
      });
      queryClient.invalidateQueries({ queryKey: ['therapists-for-linking'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const handleSearch = () => {
    if (searchEmail.trim()) {
      setSearchPerformed(true);
      searchUser();
    }
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setStep(2);
  };

  const handleLink = () => {
    if (selectedUser && selectedTherapistId) {
      linkMutation.mutate({ userId: selectedUser.id, therapistId: selectedTherapistId });
    }
  };

  const therapistsList = therapists || [];
  const therapistsWithUser = therapistsList.filter((t: any) => t.user_id);
  const isLinking = linkMutation.isPending;

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-amber-600" />
          Vincular Usuarios a Psicólogos
        </CardTitle>
        <CardDescription>
          Busca un usuario registrado y vincúlalo a un perfil de psicólogo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6 min-h-[200px]">
          {step === 1 ? (
            <div key="linking-step-1" className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
                <h3 className="font-semibold text-lg">Buscar Usuario</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Ingresa el correo electrónico del usuario que deseas vincular.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="ejemplo@correo.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              <div className="mt-4 border rounded-md p-2 bg-muted/30 min-h-[100px]">
                {!searchPerformed ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">Realiza una búsqueda para ver usuarios.</p>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted'
                          }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {user.email?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.email}</p>
                            <p className="text-xs text-muted-foreground">ID: {user.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                        {selectedUser?.id === user.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-sm text-muted-foreground">No se encontraron usuarios con ese correo.</p>
                    <Button variant="link" size="sm" onClick={() => setSearchEmail('')} className="mt-1">
                      Limpiar búsqueda
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key="linking-step-2" className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
                <h3 className="font-semibold text-lg">Seleccionar Psicólogo</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona el psicólogo al que deseas vincular el usuario <strong>{selectedUser?.email}</strong>.
              </p>

              <Select value={selectedTherapistId || ''} onValueChange={setSelectedTherapistId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un psicólogo..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {therapistsList.map((therapist) => (
                      <SelectItem key={therapist.id!} value={therapist.id!}>
                        {therapist.name!}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button
                  onClick={handleLink}
                  disabled={!selectedTherapistId || isLinking}
                  className="gap-2"
                >
                  {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Vincular Usuario
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-6 border-t mt-4">
          <label className="text-sm font-medium text-muted-foreground block">
            Psicólogos con usuario vinculado
          </label>
          <div className="space-y-2 min-h-[40px]">
            {therapistsWithUser.length > 0 ? (
              therapistsWithUser.map((therapist) => (
                <div
                  key={`linked-therapist-${therapist.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      Vinculado
                    </Badge>
                    <span className="font-medium">{therapist.name!}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Desvincular usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                          El usuario perderá acceso al panel de psicólogo de {therapist.name!}.
                          Esta acción se puede revertir vinculando nuevamente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => unlinkMutation.mutate(therapist.id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Desvincular
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">
                No hay psicólogos vinculados actualmente.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
