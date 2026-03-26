import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { DEFAULT_FIELD_VISIBILITY } from '@/types/therapist-profile';

const ROLE_OPTIONS = [
    'Psicólogo/a',
    'Psicoterapeuta',
    'Supervisora Clínica',
    'Supervisor Clínico',
    'Consejero/a Psicológico',
];


interface CreateTherapistFormData {
    name: string;
    role_title: string;
    university: string;
    hourly_rate: number;
    is_active: boolean;
    is_visible_in_about: boolean;
}

const initialFormData: CreateTherapistFormData = {
    name: '',
    role_title: 'Psicólogo/a',
    university: '',
    hourly_rate: 30,
    is_active: true,
    is_visible_in_about: false,
};

export function CreateTherapistDialog() {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<CreateTherapistFormData>(initialFormData);
    const queryClient = useQueryClient();

    const createTherapistMutation = useMutation({
        mutationFn: async (data: CreateTherapistFormData) => {
            const insertData = {
                name: data.name.trim(),
                role_title: data.role_title,
                university: data.university.trim(),
                hourly_rate: data.hourly_rate,
                is_active: data.is_active,
                is_visible_in_about: data.is_visible_in_about,
                experience_topics: [] as string[],
                field_visibility: JSON.parse(JSON.stringify(DEFAULT_FIELD_VISIBILITY)),
            };

            await apiClient.createtherapist(insertData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-all-therapists'] });
            queryClient.invalidateQueries({ queryKey: ['admin-therapists'] });
            queryClient.invalidateQueries({ queryKey: ['therapists'] });
            queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
            queryClient.invalidateQueries({ queryKey: ['therapists-for-linking'] });
            toast.success('Psicólogo creado exitosamente');
            setFormData(initialFormData);
            setOpen(false);
        },
        onError: (error) => {
            console.error('Error creating therapist:', error);
            toast.error('Error al crear el psicólogo');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }
        if (!formData.university.trim()) {
            toast.error('La universidad es obligatoria');
            return;
        }

        createTherapistMutation.mutate(formData);
    };

    const updateField = <K extends keyof CreateTherapistFormData>(
        field: K,
        value: CreateTherapistFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar psicólogo
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Agregar nuevo psicólogo</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo perfil psicológico. Podrás editarlo después con más detalles.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre completo *</Label>
                        <Input
                            id="name"
                            placeholder="Ej: María García López"
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            required
                        />
                    </div>

                    {/* Rol clínico */}
                    <div className="space-y-2">
                        <Label htmlFor="role_title">Rol clínico *</Label>
                        <Select
                            value={formData.role_title}
                            onValueChange={(value) => updateField('role_title', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>


                    {/* Universidad */}
                    <div className="space-y-2">
                        <Label htmlFor="university">Universidad / Formación principal *</Label>
                        <Input
                            id="university"
                            placeholder="Ej: Universidad Nacional Mayor de San Marcos"
                            value={formData.university}
                            onChange={(e) => updateField('university', e.target.value)}
                            required
                        />
                    </div>


                    {/* Tarifa */}
                    <div className="space-y-2">
                        <Label htmlFor="hourly_rate">Tarifa por hora (S/)</Label>
                        <Input
                            id="hourly_rate"
                            type="number"
                            min={0}
                            step={5}
                            value={formData.hourly_rate}
                            onChange={(e) => updateField('hourly_rate', Number(e.target.value))}
                        />
                    </div>

                    {/* Switches de visibilidad */}
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-medium text-sm">Estado del perfil</h4>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_active">Visible en consejería</Label>
                                <p className="text-xs text-muted-foreground">
                                    Aparecerá en la grilla de psicólogos y podrá recibir citas
                                </p>
                            </div>
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => updateField('is_active', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_visible_in_about">Visible en Conócenos</Label>
                                <p className="text-xs text-muted-foreground">
                                    Aparecerá en la sección "Nuestro equipo" de Conócenos
                                </p>
                            </div>
                            <Switch
                                id="is_visible_in_about"
                                checked={formData.is_visible_in_about}
                                onCheckedChange={(checked) => updateField('is_visible_in_about', checked)}
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={createTherapistMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={createTherapistMutation.isPending}
                        >
                            {createTherapistMutation.isPending ? 'Creando...' : 'Crear psicólogo'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
