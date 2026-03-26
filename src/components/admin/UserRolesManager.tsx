import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import type { User } from '@/types/database';
import { Users, Shield, ShieldOff, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';

export function UserRolesManager() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(false);

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const response = await apiClient.getusers();
            if (response && 'data' in response && Array.isArray(response.data)) {
                return response.data as User[];
            }
            return [];
        },
    });

    const assignRoleMutation = useMutation({
        mutationFn: async (userId: string) => {
            await apiClient.assignuserrole(userId, { role_name: 'admin' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('Rol de administrador asignado');
        },
        onError: () => toast.error('Error al asignar rol'),
    });

    const removeRoleMutation = useMutation({
        mutationFn: async (userId: string) => {
            await apiClient.removeuserrole(userId, 'admin');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('Rol de administrador removido');
        },
        onError: () => toast.error('Error al remover rol'),
    });

    const filteredUsers = (users ?? []).filter((u) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (u.email ?? '').toLowerCase().includes(q) ||
            (u.full_name ?? '').toLowerCase().includes(q)
        );
    });

    return (
        <Card>
            <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setExpanded(!expanded)}
            >
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Gestión de Usuarios</span>
                    {users && (
                        <Badge variant="secondary" className="ml-auto mr-2">
                            {users.length}
                        </Badge>
                    )}
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </CardTitle>
                <CardDescription className="text-sm">
                    Lista de usuarios registrados y asignación de roles
                </CardDescription>
            </CardHeader>

            {expanded && (
                <CardContent>
                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por email o nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-auto max-h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="hidden sm:table-cell">Nombre</TableHead>
                                        <TableHead>Roles</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                {search ? 'Sin resultados' : 'No hay usuarios'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((user) => {
                                            const userIsAdmin = user.roles?.some((r: any) => r.name === 'admin') ?? false;
                                            return (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-mono text-xs sm:text-sm max-w-[200px] truncate">
                                                        {user.email}
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell text-sm">
                                                        {user.full_name || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.roles && user.roles.length > 0 ? (
                                                                user.roles.map((r: any) => (
                                                                    <Badge
                                                                        key={r.id}
                                                                        variant={r.name === 'admin' ? 'default' : 'secondary'}
                                                                        className="text-xs"
                                                                    >
                                                                        {r.name}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">sin rol</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {userIsAdmin ? (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-destructive hover:text-destructive gap-1"
                                                                        disabled={removeRoleMutation.isPending}
                                                                    >
                                                                        <ShieldOff className="h-4 w-4" />
                                                                        <span className="hidden sm:inline">Quitar Admin</span>
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>¿Quitar rol de administrador?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Se quitará el rol de admin a <strong>{user.email}</strong>. Podrás volver a asignarlo después.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => user.id && removeRoleMutation.mutate(user.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Sí, quitar
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="gap-1"
                                                                onClick={() => user.id && assignRoleMutation.mutate(user.id)}
                                                                disabled={assignRoleMutation.isPending}
                                                            >
                                                                <Shield className="h-4 w-4" />
                                                                <span className="hidden sm:inline">Hacer Admin</span>
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
