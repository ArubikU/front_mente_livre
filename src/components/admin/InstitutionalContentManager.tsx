import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Save, RotateCcw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

// Content ID is fixed for single source of truth
const CONTENT_ID = '00000000-0000-0000-0000-000000000001';

// Default values for restoration
const DEFAULT_CONTENT = {
  about_title: '¿Quiénes Somos?',
  about_intro: 'En Mente Livre nos dedicamos a acompañar a jóvenes y universitarios en su bienestar emocional y mental. Nuestro equipo combina profesionales titulados y practicantes avanzados con formación especializada en psicología, enfocados en brindar atención online de calidad, cercana y confiable.',
  mission: 'Brindar acompañamiento emocional accesible y de calidad a jóvenes universitarios, promoviendo su bienestar mental durante una etapa crucial de sus vidas',
  vision: 'Ser referentes en salud mental a nivel nacional construyendo una comunidad donde el bienestar psicológico sea prioridad y esté al alcance de todos',
  approach: 'Ofrecemos consejería psicológica, enfocada en orientación breve y objetivos concretos',
  purpose: '',
  values: ['Confidencialidad', 'Accesibilidad', 'Compromiso social', 'Profesionalismo', 'Empatía'],
};

// Validation schema
const contentSchema = z.object({
  about_title: z.string().trim().min(1, 'El título es obligatorio').max(100, 'Máximo 100 caracteres'),
  about_intro: z.string().trim().min(50, 'Mínimo 50 caracteres').max(1200, 'Máximo 1200 caracteres'),
  mission: z.string().trim().min(20, 'La misión debe tener al menos 20 caracteres').max(500, 'Máximo 500 caracteres'),
  vision: z.string().trim().min(20, 'La visión debe tener al menos 20 caracteres').max(500, 'Máximo 500 caracteres'),
  approach: z.string().trim().min(20, 'El enfoque debe tener al menos 20 caracteres').max(500, 'Máximo 500 caracteres'),
  purpose: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
  values: z.array(z.string()).optional(),
});

interface SiteContent {
  id: string;
  about_title: string;
  about_intro: string;
  mission: string;
  vision: string;
  approach: string;
  purpose: string | null;
  values: string[] | null;
  updated_at: string;
}

export function InstitutionalContentManager() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<SiteContent>>({});
  const [valuesInput, setValuesInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current content
  const { data: content, isLoading } = useQuery({
    queryKey: ['site-content'],
    queryFn: async () => {
      const response = await apiClient.getsitecontent();
      if (response && 'data' in response && response.data) {
        // Backend returns array or single object - handle both
        const content = Array.isArray(response.data) ? response.data[0] : response.data;
        if (content && content.id === CONTENT_ID) {
          return content as SiteContent;
        }
      }
      // Return default if not found
      return {
        id: CONTENT_ID,
        ...DEFAULT_CONTENT,
        updated_at: new Date().toISOString(),
      } as SiteContent;
    },
  });

  // Initialize form when content loads
  useEffect(() => {
    if (content) {
      setFormData({
        about_title: content.about_title,
        about_intro: content.about_intro,
        mission: content.mission,
        vision: content.vision,
        approach: content.approach,
        purpose: content.purpose || '',
        values: content.values || [],
      });
      setValuesInput((content.values || []).join(', '));
      setHasChanges(false);
    }
  }, [content]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SiteContent>) => {
      // Parse values from comma-separated string
      const valuesArray = valuesInput
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const updateData = {
        ...data,
        values: valuesArray.length > 0 ? valuesArray : undefined,
        purpose: data.purpose ?? undefined,
      };

      // The backend endpoint expects the ID in the body
      await apiClient.updatesitecontent({ id: CONTENT_ID, ...updateData } as import('@/api/types').SiteContentUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-content'] });
      toast.success('Contenido institucional actualizado', {
        description: 'Los cambios se reflejarán en la página "Conócenos".',
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      setHasChanges(false);
      setErrors({});
    },
    onError: (error) => {
      console.error('Error updating content:', error);
      toast.error('Error al guardar los cambios');
    },
  });

  const handleChange = (field: keyof SiteContent, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleValuesChange = (value: string) => {
    setValuesInput(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate
    const result = contentSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error('Por favor corrige los errores antes de guardar');
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleRestore = () => {
    setFormData(DEFAULT_CONTENT);
    setValuesInput(DEFAULT_CONTENT.values.join(', '));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
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
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contenido Institucional
            </CardTitle>
            <CardDescription className="mt-1">
              Edita los textos de la página "Conócenos" y la identidad de Mente Livre
            </CardDescription>
          </div>
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Cambios sin guardar
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* About Title */}
        <div className="space-y-2">
          <Label htmlFor="about_title">
            Título principal
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="about_title"
            value={formData.about_title || ''}
            onChange={(e) => handleChange('about_title', e.target.value)}
            placeholder="¿Quiénes Somos?"
            maxLength={100}
            className={errors.about_title ? 'border-destructive' : ''}
          />
          {errors.about_title && (
            <p className="text-xs text-destructive">{errors.about_title}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {(formData.about_title || '').length}/100 caracteres
          </p>
        </div>

        {/* About Intro */}
        <div className="space-y-2">
          <Label htmlFor="about_intro">
            Texto introductorio
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="about_intro"
            value={formData.about_intro || ''}
            onChange={(e) => handleChange('about_intro', e.target.value)}
            placeholder="Texto principal que aparece al inicio de la página Conócenos..."
            rows={5}
            maxLength={1200}
            className={errors.about_intro ? 'border-destructive' : ''}
          />
          {errors.about_intro && (
            <p className="text-xs text-destructive">{errors.about_intro}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {(formData.about_intro || '').length}/1200 caracteres
          </p>
        </div>

        <Separator />

        {/* Mission */}
        <div className="space-y-2">
          <Label htmlFor="mission">
            Misión
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="mission"
            value={formData.mission || ''}
            onChange={(e) => handleChange('mission', e.target.value)}
            placeholder="¿Qué hacemos y para quién?"
            rows={3}
            maxLength={500}
            className={errors.mission ? 'border-destructive' : ''}
          />
          {errors.mission && (
            <p className="text-xs text-destructive">{errors.mission}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {(formData.mission || '').length}/500 caracteres
          </p>
        </div>

        {/* Vision */}
        <div className="space-y-2">
          <Label htmlFor="vision">
            Visión
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="vision"
            value={formData.vision || ''}
            onChange={(e) => handleChange('vision', e.target.value)}
            placeholder="¿Hacia dónde queremos llegar?"
            rows={3}
            maxLength={500}
            className={errors.vision ? 'border-destructive' : ''}
          />
          {errors.vision && (
            <p className="text-xs text-destructive">{errors.vision}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {(formData.vision || '').length}/500 caracteres
          </p>
        </div>

        {/* Approach */}
        <div className="space-y-2">
          <Label htmlFor="approach">
            Enfoque
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="approach"
            value={formData.approach || ''}
            onChange={(e) => handleChange('approach', e.target.value)}
            placeholder="Consejería psicológica, no psicoterapia clínica..."
            rows={3}
            maxLength={500}
            className={errors.approach ? 'border-destructive' : ''}
          />
          {errors.approach && (
            <p className="text-xs text-destructive">{errors.approach}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {(formData.approach || '').length}/500 caracteres
          </p>
        </div>

        <Separator />

        {/* Purpose (optional) */}
        <div className="space-y-2">
          <Label htmlFor="purpose">
            Propósito
            <span className="text-muted-foreground ml-1 text-xs">(opcional)</span>
          </Label>
          <Textarea
            id="purpose"
            value={formData.purpose || ''}
            onChange={(e) => handleChange('purpose', e.target.value)}
            placeholder="Propósito adicional o mensaje especial..."
            rows={2}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {(formData.purpose || '').length}/500 caracteres
          </p>
        </div>

        {/* Values (optional) */}
        <div className="space-y-2">
          <Label htmlFor="values">
            Valores
            <span className="text-muted-foreground ml-1 text-xs">(opcional, separados por coma)</span>
          </Label>
          <Input
            id="values"
            value={valuesInput}
            onChange={(e) => handleValuesChange(e.target.value)}
            placeholder="Accesibilidad, Confidencialidad, Compromiso..."
          />
          <p className="text-xs text-muted-foreground">
            Ejemplo: Accesibilidad, Confidencialidad, Compromiso social
          </p>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Restaurar valores por defecto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restaurar contenido por defecto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto reemplazará todos los campos con los valores originales. 
                  Los cambios no se guardarán hasta que presiones "Guardar cambios".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore}>
                  Restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending || !hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

        {content?.updated_at && (
          <p className="text-xs text-muted-foreground text-right">
            Última actualización: {new Date(content.updated_at).toLocaleDateString('es-PE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
