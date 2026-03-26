import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Eye, EyeOff, Lock, Unlock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// import { Switch } from '@/components/ui/switch'; // TODO: Use when implementing field visibility
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTherapistProfile, useUpdateTherapistProfile, useUpdateFieldVisibility } from '@/hooks/useTherapistProfile';
import type { TherapistFieldVisibility } from '@/types/therapist-profile';
import { FIELD_LABELS, CATEGORY_LABELS } from '@/types/therapist-profile';
import { TherapistProfilePreview } from './TherapistProfilePreview';

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  university: z.string().optional(),
  therapeutic_approach: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface TherapistProfileEditorProps {
  therapistId: string;
  isAdmin?: boolean;
  onPreviewToggle?: (isPreviewVisible: boolean) => void;
}

export function TherapistProfileEditor({ therapistId, isAdmin = false, onPreviewToggle }: TherapistProfileEditorProps) {
  const { data: therapist, isLoading } = useTherapistProfile(therapistId);
  const updateProfile = useUpdateTherapistProfile();
  const updateVisibility = useUpdateFieldVisibility();

  const [localVisibility, setLocalVisibility] = useState<TherapistFieldVisibility | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Notificar al padre cuando cambia el estado de preview
  useEffect(() => {
    if (onPreviewToggle) {
      onPreviewToggle(showPreview);
    }
  }, [showPreview, onPreviewToggle]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      university: '',
      therapeutic_approach: '',
    },
  });

  // Update form and visibility when therapist data loads
  useEffect(() => {
    if (therapist) {
      form.reset({
        name: therapist.name || '',
        university: therapist.university || '',
        therapeutic_approach: therapist.therapeutic_approach || '',
      });
      setLocalVisibility(therapist.field_visibility ?? null);
    }
  }, [therapist, form]);

  const handleSubmit = async (data: ProfileFormData) => {
    await updateProfile.mutateAsync({ therapistId, updates: data });
  };

  const handleVisibilityToggle = async (fieldName: keyof TherapistFieldVisibility) => {
    if (!localVisibility) return;

    const field = localVisibility[fieldName];

    // Prevent changing locked fields unless admin
    if (field.locked_by_admin && !isAdmin) return;

    const newVisibility: TherapistFieldVisibility = {
      ...localVisibility,
      [fieldName]: {
        ...field,
        is_visible: !field.is_visible,
      },
    };

    setLocalVisibility(newVisibility);
    await updateVisibility.mutateAsync({ therapistId, fieldVisibility: newVisibility });
  };

  const handleLockToggle = async (fieldName: keyof TherapistFieldVisibility) => {
    if (!localVisibility || !isAdmin) return;

    const field = localVisibility[fieldName];
    const newVisibility: TherapistFieldVisibility = {
      ...localVisibility,
      [fieldName]: {
        ...field,
        locked_by_admin: !field.locked_by_admin,
      },
    };

    setLocalVisibility(newVisibility);
    await updateVisibility.mutateAsync({ therapistId, fieldVisibility: newVisibility });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!therapist || !localVisibility) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No se encontró el perfil del terapeuta.
      </div>
    );
  }

  const renderVisibilityControl = (fieldName: keyof TherapistFieldVisibility) => {
    const field = localVisibility[fieldName];
    const isLocked = field.locked_by_admin;
    const isVisible = field.is_visible;

    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleVisibilityToggle(fieldName)}
          disabled={isLocked && !isAdmin}
          className={isVisible ? 'text-success' : 'text-muted-foreground'}
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        {isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleLockToggle(fieldName)}
            className={isLocked ? 'text-warning' : 'text-muted-foreground'}
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
        )}

        {isLocked && !isAdmin && (
          <Badge variant="secondary" className="text-xs">
            <Lock className="h-3 w-3 mr-1" />
            Bloqueado
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Editar Perfil</h2>
          <p className="text-muted-foreground">
            {isAdmin ? 'Administrar perfil y visibilidad de campos' : 'Gestiona tu información profesional'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          {showPreview ? 'Ocultar Vista Previa' : 'Ver Vista Previa'}
        </Button>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="basic">{CATEGORY_LABELS.basic}</TabsTrigger>
                <TabsTrigger value="professional">{CATEGORY_LABELS.professional}</TabsTrigger>
              </TabsList>

              {/* Basic Data Tab */}
              <TabsContent value="basic">
                <Card>
                  <CardHeader>
                    <CardTitle>{CATEGORY_LABELS.basic}</CardTitle>
                    <CardDescription>Información básica de tu perfil</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>{FIELD_LABELS.name}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {renderVisibilityControl('name')}
                    </div>

                    <Separator />

                    <div className="flex items-start justify-between gap-4">
                      <FormField
                        control={form.control}
                        name="university"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>{FIELD_LABELS.university}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ej: Universidad Nacional Mayor de San Marcos" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {renderVisibilityControl('university')}
                    </div>


                  </CardContent>
                </Card>
              </TabsContent>

              {/* Professional Tab */}
              <TabsContent value="professional">
                <Card>
                  <CardHeader>
                    <CardTitle>{CATEGORY_LABELS.professional}</CardTitle>
                    <CardDescription>Tu enfoque y experiencia profesional</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <FormField
                        control={form.control}
                        name="therapeutic_approach"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>{FIELD_LABELS.therapeutic_approach}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ej: Terapia Cognitivo-Conductual" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {renderVisibilityControl('therapeutic_approach')}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={updateProfile.isPending}
            >
              <Save className="h-4 w-4" />
              {updateProfile.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Form>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vista Previa Pública</CardTitle>
                <CardDescription>Así verán los usuarios tu tarjeta</CardDescription>
              </CardHeader>
              <CardContent>
                {therapist && localVisibility ? (
                  <TherapistProfilePreview
                    therapist={therapist}
                    formValues={form.watch()}
                    visibility={localVisibility}
                  />
                ) : (
                  <div>Loading preview...</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
