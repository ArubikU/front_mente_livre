import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { API_BASE_URL } from '@/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, GripVertical, Users, Building2 } from 'lucide-react';
import type { TeamProfile } from '@/api/types';

interface TeamMember {
  id: string;
  full_name: string;
  role_title: string;
  short_bio: string | null;
  friendly_photo_url: string | null;
  is_visible_public: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  full_name: string;
  role_title: string;
  short_bio: string;
  friendly_photo_url: string;
  is_visible_public: boolean;
  order_index: number;
}

const INITIAL_FORM_DATA: FormData = {
  full_name: '',
  role_title: '',
  short_bio: '',
  friendly_photo_url: '',
  is_visible_public: false,
  order_index: 0,
};

export function InstitutionalTeamManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // Fetch all team members (admin can see all)
  // Note: Using team_profiles with member_type='institutional'
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['institutional-team-members'],
    queryFn: async () => {
      const response = await apiClient.getteamprofiles();
      if (response && 'data' in response && Array.isArray(response.data)) {
        const profiles = (response.data as TeamProfile[])
          .filter((p) => p.member_type === 'institutional')
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((p) => ({
            id: p.id,
            full_name: p.full_name,
            role_title: p.public_role_title,
            short_bio: p.public_bio,
            friendly_photo_url: p.friendly_photo_url || null,
            is_visible_public: Boolean(p.is_visible_public),
            order_index: p.order_index || 0,
            created_at: p.created_at || '',
            updated_at: p.updated_at || '',
          } as TeamMember));
        return profiles;
      }
      return [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiClient.createteamprofile({
        member_type: 'institutional',
        full_name: data.full_name,
        public_role_title: data.role_title,
        public_bio: data.short_bio || undefined,
        friendly_photo_url: data.friendly_photo_url || undefined,
        is_visible_public: data.is_visible_public,
        order_index: data.order_index,
      });
    },
    onSuccess: () => {
      toast({ title: 'Miembro agregado', description: 'El miembro del equipo institucional ha sido creado.' });
      queryClient.invalidateQueries({ queryKey: ['institutional-team-members'] });
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear el miembro.',
        variant: 'destructive'
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      await apiClient.updateteamprofile(id, {
        full_name: data.full_name,
        public_role_title: data.role_title,
        public_bio: data.short_bio || undefined,
        friendly_photo_url: data.friendly_photo_url || undefined,
        is_visible_public: data.is_visible_public,
        order_index: data.order_index,
      });
    },
    onSuccess: () => {
      toast({ title: 'Miembro actualizado', description: 'Los cambios han sido guardados.' });
      queryClient.invalidateQueries({ queryKey: ['institutional-team-members'] });
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el miembro.',
        variant: 'destructive'
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteteamprofile(id);
    },
    onSuccess: () => {
      toast({ title: 'Miembro eliminado', description: 'El miembro ha sido eliminado del equipo.' });
      queryClient.invalidateQueries({ queryKey: ['institutional-team-members'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el miembro.',
        variant: 'destructive'
      });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      await apiClient.updateteamprofile(id, { is_visible_public: isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutional-team-members'] });
      toast({ title: 'Visibilidad actualizada' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo cambiar la visibilidad.', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingMember(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      role_title: member.role_title,
      short_bio: member.short_bio || '',
      friendly_photo_url: member.friendly_photo_url || '',
      is_visible_public: member.is_visible_public,
      order_index: member.order_index,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    // Set next order_index
    const maxOrder = teamMembers?.reduce((max, m) => Math.max(max, m.order_index), -1) ?? -1;
    setFormData({ ...INITIAL_FORM_DATA, order_index: maxOrder + 1 });
    setEditingMember(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.role_title.trim()) {
      toast({ title: 'Error', description: 'Nombre y cargo son obligatorios.', variant: 'destructive' });
      return;
    }
    if (formData.short_bio && formData.short_bio.length > 600) {
      toast({ title: 'Error', description: 'La biografía no puede exceder 600 caracteres.', variant: 'destructive' });
      return;
    }

    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const bioCharCount = formData.short_bio?.length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Equipo Institucional</CardTitle>
              <CardDescription>
                Gestiona los miembros del equipo institucional que aparecen en "Conócenos"
              </CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar miembro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? 'Editar miembro' : 'Agregar nuevo miembro'}
                </DialogTitle>
                <DialogDescription>
                  {editingMember
                    ? 'Modifica la información del miembro del equipo institucional.'
                    : 'Añade un nuevo miembro al equipo institucional de Mente Livre.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ej: María García López"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role_title">Cargo / Rol público *</Label>
                  <Input
                    id="role_title"
                    value={formData.role_title}
                    onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                    placeholder="Ej: Founder, CEO, Supervisión Clínica"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_bio">Biografía institucional</Label>
                  <Textarea
                    id="short_bio"
                    value={formData.short_bio}
                    onChange={(e) => setFormData({ ...formData, short_bio: e.target.value })}
                    placeholder="Breve descripción institucional (máx. 600 caracteres)"
                    rows={4}
                    maxLength={600}
                  />
                  <p className={`text-xs ${bioCharCount > 550 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {bioCharCount}/600 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="friendly_photo_url">URL de foto</Label>
                  <Input
                    id="friendly_photo_url"
                    type="url"
                    value={formData.friendly_photo_url}
                    onChange={(e) => setFormData({ ...formData, friendly_photo_url: e.target.value })}
                    placeholder="https://ejemplo.com/foto.jpg"
                  />
                  {formData.friendly_photo_url && (
                    <div className="mt-2 flex justify-center">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={(() => {
                          const rawUrl = formData.friendly_photo_url;
                          if (!rawUrl) return undefined;
                          return rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                        })()} alt="Preview" />
                        <AvatarFallback>
                          {formData.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ML'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_index">Orden de aparición</Label>
                  <Input
                    id="order_index"
                    type="number"
                    min={0}
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Los miembros se ordenan de menor a mayor
                  </p>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_visible">Visible en "Conócenos"</Label>
                    <p className="text-xs text-muted-foreground">
                      Si está activo, aparecerá en la página pública
                    </p>
                  </div>
                  <Switch
                    id="is_visible"
                    checked={formData.is_visible_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_visible_public: checked })}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingMember ? 'Guardar cambios' : 'Crear miembro'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {!teamMembers || teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay miembros institucionales registrados.</p>
            <p className="text-sm">Agrega el primer miembro del equipo institucional.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="text-muted-foreground cursor-move">
                  <GripVertical className="h-5 w-5" />
                </div>

                <Avatar className="h-12 w-12">
                  <AvatarImage src={(() => {
                    const rawUrl = member.friendly_photo_url;
                    if (!rawUrl) return undefined;
                    return rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                  })()} alt={member.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">{member.full_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      #{member.order_index}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.role_title}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={member.is_visible_public}
                    onCheckedChange={(checked) =>
                      toggleVisibilityMutation.mutate({ id: member.id, isVisible: checked })
                    }
                    aria-label="Toggle visibility"
                  />

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(member)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará a {member.full_name} del equipo institucional.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(member.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
