import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Calendar, Home, LogOut } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { API_BASE_URL } from '@/api/types';
import type { Therapist } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TherapistProfileEditor } from '@/components/therapist/TherapistProfileEditor';
import { TherapistAvailabilityManager } from '@/components/admin/TherapistAvailabilityManager';
import logoNegro from '@/assets/logo-negro.png';

type TherapistPhoto = {
    photo_type?: string | null;
    photo_url?: string | null;
    photo_position?: string | null;
};

type TherapistWithPhotos = Therapist & {
    photos?: TherapistPhoto[] | null;
    photo_url?: string | null;
    photo_position?: string | null;
};

export default function TherapistDashboard() {
    const navigate = useNavigate();
    const { user, userRole, therapistId, isLoading: authLoading, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Fetch current therapist data
    const { data: therapist, isLoading: loadingTherapist } = useQuery<TherapistWithPhotos | null>({
        queryKey: ['my-therapist-profile', therapistId],
        queryFn: async () => {
            if (!therapistId) {
                return null;
            }
            const response = await apiClient.gettherapist(therapistId);

            if (response && 'data' in response && response.data) {
                const therapistData = response.data as TherapistWithPhotos;

                // Extraer photo_url del array de photos si existe
                let photo_url: string | null = null;
                let photo_position: string | null = null;

                if (therapistData.photos && Array.isArray(therapistData.photos) && therapistData.photos.length > 0) {
                    // Buscar foto de perfil primero, si no existe usar la primera
                    const profilePhoto = therapistData.photos.find((p) => p.photo_type === 'profile') || therapistData.photos[0];
                    photo_url = profilePhoto?.photo_url ?? null;
                    photo_position = profilePhoto?.photo_position ?? null;
                }

                const finalPhotoUrl = photo_url ?? therapistData.photo_url ?? null;
                const finalPhotoPosition = photo_position ?? therapistData.photo_position ?? null;

                // Agregar photo_url y photo_position al objeto
                return {
                    ...therapistData,
                    photo_url: finalPhotoUrl,
                    photo_position: finalPhotoPosition,
                };
            }
            return null;
        },
        enabled: !!therapistId,
    });

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    // Redirect non-therapists
    if (!authLoading && (!user || userRole !== 'therapist')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
                    <p className="text-muted-foreground mb-6">
                        Solo los psicólogos pueden acceder a esta página.
                    </p>
                    <Link to="/">
                        <Button>Volver al Inicio</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (authLoading || loadingTherapist) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Cargando...</div>
            </div>
        );
    }

    if (!therapistId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Perfil No Vinculado</h1>
                    <p className="text-muted-foreground mb-6">
                        Tu cuenta no está vinculada a un perfil de psicólogo.
                        Contacta al administrador.
                    </p>
                    <Link to="/">
                        <Button>Volver al Inicio</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between">
                    <Link to="/" className="flex items-center">
                        <img src={logoNegro} alt="Mente Livre" className="h-10 w-auto" />
                    </Link>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:block">
                            {therapist?.name}
                        </span>
                        <Link to="/">
                            <Button variant="ghost" size="sm" className="gap-2">
                                <Home className="h-4 w-4" />
                                <span className="hidden sm:inline">Ver Sitio</span>
                            </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Salir</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-8">
                {/* Therapist Info Card */}
                {therapist && (
                    <Card className="mb-8">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-6">
                                <Avatar className="h-24 w-24 ring-2 ring-primary/10">
                                    <AvatarImage
                                        src={(() => {
                                            const rawUrl = therapist.photo_url;
                                            if (!rawUrl) return undefined;
                                            return rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                                        })()}
                                        alt={therapist.name}
                                        className="object-cover"
                                        style={{ objectPosition: therapist.photo_position || '50% 20%' }}
                                    />
                                    <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                                        {therapist.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'PS'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold mb-2">{therapist.name}</h1>
                                    <p className="text-muted-foreground">
                                        {therapist.role_title || 'Psicólogo/a'}
                                    </p>
                                    {therapist.university && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {therapist.university}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Mi Panel</h1>
                    <p className="text-muted-foreground">
                        Gestiona tu perfil y disponibilidad
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="profile" className="gap-2">
                            <User className="h-4 w-4" />
                            Mi Perfil
                        </TabsTrigger>
                        <TabsTrigger value="availability" className="gap-2">
                            <Calendar className="h-4 w-4" />
                            Disponibilidad
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <TherapistProfileEditor therapistId={therapistId} isAdmin={false} />
                    </TabsContent>

                    <TabsContent value="availability">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Mi Disponibilidad</h2>
                                <p className="text-muted-foreground">
                                    Configura tus horarios disponibles para atención
                                </p>
                            </div>
                            <TherapistAvailabilityManager
                                therapistId={therapistId}
                                therapistName={therapist?.name || ''}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
