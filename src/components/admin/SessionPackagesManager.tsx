import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface SessionPackage {
    id: string;
    name: string;
    session_count: number;
    discount_percent: number;
    is_active: boolean;
    created_at?: string;
}

export function SessionPackagesManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        session_count: 2,
        discount_percent: 0,
        is_active: true
    });

    const { data: packages, isLoading } = useQuery({
        queryKey: ['admin-session-packages'],
        queryFn: async () => {
            const response = await apiClient.get<{ data: SessionPackage[] }>('/session-packages');
            if (response && 'data' in response && Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiClient.post('/session-packages', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-session-packages'] });
            toast({ title: 'Éxito', description: 'Paquete de sesiones creado correctamente' });
            handleCloseDialog();
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo crear el paquete', variant: 'destructive' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!editingPackage?.id) throw new Error("No ID");
            return apiClient.put(`/session-packages/${editingPackage.id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-session-packages'] });
            toast({ title: 'Éxito', description: 'Paquete actualizado correctamente' });
            handleCloseDialog();
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo actualizar el paquete', variant: 'destructive' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiClient.delete(`/session-packages/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-session-packages'] });
            toast({ title: 'Éxito', description: 'Paquete eliminado correctamente' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'No se pudo eliminar el paquete', variant: 'destructive' });
        }
    });

    const handleOpenDialog = (pkg?: SessionPackage) => {
        if (pkg) {
            setEditingPackage(pkg);
            setFormData({
                name: pkg.name,
                session_count: pkg.session_count,
                discount_percent: pkg.discount_percent,
                is_active: pkg.is_active
            });
        } else {
            setEditingPackage(null);
            setFormData({
                name: '',
                session_count: 2,
                discount_percent: 0,
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingPackage(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPackage) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este paquete?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl">Paquetes de Sesiones</CardTitle>
                    <CardDescription>
                        Configura opciones para que los usuarios compren múltiples sesiones con descuento
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Nuevo Paquete
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Cargando paquetes...</div>
                ) : packages && packages.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Sesiones</TableHead>
                                    <TableHead>Descuento (%)</TableHead>
                                    <TableHead>Activo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {packages.map((pkg) => (
                                    <TableRow key={pkg.id}>
                                        <TableCell className="font-medium">{pkg.name}</TableCell>
                                        <TableCell>{pkg.session_count}</TableCell>
                                        <TableCell>{pkg.discount_percent}%</TableCell>
                                        <TableCell>
                                            {pkg.is_active ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <X className="h-4 w-4 text-red-500" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(pkg)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg.id)} className="text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No hay paquetes de sesiones configurados.
                    </div>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>{editingPackage ? 'Editar Paquete' : 'Nuevo Paquete'}</DialogTitle>
                                <DialogDescription>
                                    Ingresa los detalles del paquete de sesiones.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre del paquete</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Paquete Mensual (4 sesiones)"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="session_count">N° de Sesiones</Label>
                                        <Input
                                            id="session_count"
                                            type="number"
                                            min="2"
                                            value={formData.session_count}
                                            onChange={e => setFormData({ ...formData, session_count: parseInt(e.target.value) || 2 })}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="discount_percent">Descuento (%)</Label>
                                        <Input
                                            id="discount_percent"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={formData.discount_percent}
                                            onChange={e => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <Label htmlFor="is_active">Paquete activo y visible</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingPackage ? 'Guardar Cambios' : 'Crear Paquete'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
