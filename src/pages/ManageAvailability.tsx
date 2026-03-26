import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, ArrowLeft, Calendar, ShieldAlert } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import type { Therapist } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TherapistSelector } from '@/components/admin/TherapistSelector';
import { TherapistAvailabilityManager } from '@/components/admin/TherapistAvailabilityManager';
import type {} from '@/api/types';
import logoNegro from '@/assets/logo-negro.png';

export default function ManageAvailability() {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);

  const { data: selectedTherapist } = useQuery({
    queryKey: ['therapist', selectedTherapistId],
    queryFn: async () => {
      if (!selectedTherapistId) return null;
      const response = await apiClient.gettherapist(selectedTherapistId);
      if (response && 'data' in response && response.data) {
        return response.data as Therapist;
      }
      return null;
    },
    enabled: !!selectedTherapistId,
  });

  // Redirigir si no es admin
  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, userRole, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground mb-4">
              Solo los administradores pueden acceder a esta página.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logoNegro} alt="Mente Livre" className="h-14 w-auto" />
          </Link>
        </div>
      </header>

      <main className="container py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')} 
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            Gestionar Disponibilidad
          </h1>
          <p className="text-muted-foreground">
            Configura los horarios disponibles para cada psicólogo
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Selector de psicólogo */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Psicólogo</CardTitle>
                <CardDescription>
                  Selecciona un psicólogo para gestionar su disponibilidad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TherapistSelector
                  value={selectedTherapistId}
                  onChange={setSelectedTherapistId}
                />
              </CardContent>
            </Card>
          </div>

          {/* Gestor de disponibilidad */}
          <div className="lg:col-span-3">
            {selectedTherapist ? (
              <TherapistAvailabilityManager
                therapistId={selectedTherapist.id}
                therapistName={selectedTherapist.name}
              />
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecciona un psicólogo para ver y editar su disponibilidad
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}