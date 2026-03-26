import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Calendar, Clock, LogOut, Home, Mail, Shield, CalendarDays, CreditCard, CheckCircle, Phone, Settings, XCircle, Menu, User, Gift } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { Appointment as BackendAppointment, Therapist } from '@/types/database';
import { API_BASE_URL } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { TherapistSelector } from '@/components/admin/TherapistSelector';
import { TherapistAvailabilityManager } from '@/components/admin/TherapistAvailabilityManager';
import { AppointmentsCalendar } from '@/components/admin/AppointmentsCalendar';
import { TherapistUserLinker } from '@/components/admin/TherapistUserLinker';
import { AdminTherapistManager } from '@/components/admin/AdminTherapistManager';
import { InstitutionalContentManager } from '@/components/admin/InstitutionalContentManager';
import { PromoCodesManager } from '@/components/admin/PromoCodesManager';
import { SessionPackagesManager } from '@/components/admin/SessionPackagesManager';
import { EmailDomainRulesManager } from '@/components/admin/EmailDomainRulesManager';
import { TherapistPricingManager } from '@/components/admin/TherapistPricingManager';
import { PricingMetricsPanel } from '@/components/admin/PricingMetricsPanel';
import { UserRolesManager } from '@/components/admin/UserRolesManager';
import { AdminBookingShortcut } from '@/components/admin/AdminBookingShortcut';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

import logoNegro from '@/assets/logo-negro.png';
import { useTranslation } from 'react-i18next';

interface UserRoleItem {
  id?: number;
  name?: string;
}

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

type AppointmentWithAmounts = BackendAppointment & {
  final_price?: number | null;
  original_price?: number | null;
  amount_paid?: number | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user,
    userRole,
    therapistId,
    isLoading: authLoading,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMobile, setShowProfileMobile] = useState(false);
  const { t } = useTranslation('dashboard');

  const [selectedRole] = useState<string | null>(null); // For admin to view as other roles

  const { data: currentUserRoles } = useQuery({
    queryKey: ['current-user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as string[];
      const response = await apiClient.getuserroles(user.id);
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as UserRoleItem[])
          .map((role) => role?.name)
          .filter((role): role is string => Boolean(role));
      }
      return [] as string[];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const hasRole = (roleToFind: string) => {
    return (
      currentUserRoles?.includes(roleToFind) ||
      user?.roles?.some(r => r.name === roleToFind) ||
      userRole === roleToFind
    );
  };

  const isAdmin = hasRole('admin');
  const isTherapist = hasRole('therapist');
  const isPatient = hasRole('patient');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin');
    }
  }, [user, authLoading, navigate]);

  // Obtener perfil del usuario
  const { profile } = useUserProfile();
  const {
    data: therapists,
    isLoading: loadingTherapists
  } = useQuery({
    queryKey: ['admin-therapists'],
    queryFn: async () => {
      const response = await apiClient.gettherapists();
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as Therapist[]).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      return [];
    },
    enabled: !!user && isAdmin
  });

  // Obtener datos del terapeuta actual (para rol terapeuta)
  const {
    data: currentTherapist
  } = useQuery<TherapistWithPhotos | null>({
    queryKey: ['current-therapist', therapistId],
    queryFn: async () => {
      if (!therapistId) return null;
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

        return {
          ...therapistData,
          photo_url: finalPhotoUrl,
          photo_position: finalPhotoPosition,
        } as Therapist & { photo_url?: string | null; photo_position?: string | null };
      }
      return null;
    },
    enabled: !!user && isTherapist && !!therapistId
  });

  // Obtener datos del terapeuta seleccionado
  const selectedTherapist = therapists?.find(t => t.id === selectedTherapistId);

  // Citas para admin (todas) o terapeuta (solo las suyas)
  const {
    data: appointments,
    isLoading: loadingAppointments
  } = useQuery({
    queryKey: ['dashboard-appointments', isTherapist ? therapistId : 'all'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Construir query params según el backend
      const params = new URLSearchParams();
      params.append('date_from', today);
      if (isTherapist && therapistId) {
        params.append('therapist_id', therapistId);
      }

      // Usar el método get del apiClient
      const data = await apiClient.get<{ data: BackendAppointment[] }>(`/appointments?${params.toString()}`);

      if (data && 'data' in data && Array.isArray(data.data)) {
        // Ordenar y limitar
        const sorted = data.data
          .sort((a, b) => {
            const dateA = new Date(`${a.appointment_date}T${a.start_time || '00:00'}`).getTime();
            const dateB = new Date(`${b.appointment_date}T${b.start_time || '00:00'}`).getTime();
            return dateA - dateB;
          })
          .slice(0, 10);
        return sorted;
      }
      return [];
    },
    enabled: !!user && (isAdmin || (isTherapist && !!therapistId)),
    placeholderData: keepPreviousData,
  });

  // Pagos pendientes de revisión (solo admin)
  const {
    data: pendingPayments,
    isLoading: loadingPayments
  } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      // Usar el método get del apiClient
      const data = await apiClient.get<{ data: BackendAppointment[] }>(`/appointments?status=payment_review`);

      if (data && 'data' in data && Array.isArray(data.data)) {
        return data.data.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
      }
      return [];
    },
    enabled: !!user && isAdmin
  });

  // For patients, we also want to display their active packages
  const { data: userPackages, isLoading: loadingPackages } = useQuery({
    queryKey: ['my-patient-packages'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: any[] }>('/patient-packages/my-packages');
      if (response && 'data' in response && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    },
    enabled: isPatient && !!user?.id
  });

  // Send notification email (TODO: Implementar endpoint de notificaciones en backend)
  const sendNotification = async (
    appointmentId: string,
    action: 'confirmed' | 'cancelled',
    appointmentData: BackendAppointment,
    paymentDetails?: { amountPaid: number; paymentMethod: string }
  ) => {
    try {
      // TODO: Implementar endpoint de notificaciones en backend
      // Por ahora solo logueamos
      console.log('Notification would be sent:', {
        appointmentId,
        action,
        appointmentData,
        paymentDetails
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Confirmar pago
  const confirmPaymentMutation = useMutation({
    mutationFn: async (appointment: BackendAppointment) => {
      // Obtener precio del terapeuta
      let amountPaid = 0;
      if (appointment.therapist_id) {
        try {
          const therapistResponse = await apiClient.gettherapist(appointment.therapist_id);
          if (therapistResponse && 'data' in therapistResponse && therapistResponse.data) {
            const therapist = therapistResponse.data;
            amountPaid = therapist.hourly_rate ? Number(therapist.hourly_rate) : 0;
          }
        } catch (error) {
          console.error('Error fetching therapist pricing:', error);
        }
      }

      if (!appointment.id) {
        throw new Error('Falta el ID de la cita para confirmar pago');
      }
      await apiClient.updateappointment(appointment.id, {
        status: 'confirmed',
        // Nota: El backend debería manejar payment_confirmed_at, amount_paid, etc.
      });

      return { ...appointment, amountPaid };
    },
    onSuccess: (appointmentWithAmount) => {
      toast({
        title: 'Pago confirmado',
        description: 'La cita ha sido confirmada exitosamente.'
      });

      if (appointmentWithAmount.id) {
        sendNotification(
          appointmentWithAmount.id,
          'confirmed',
          appointmentWithAmount,
          {
            amountPaid: appointmentWithAmount.amountPaid,
            paymentMethod: 'Yape / Plin'
          }
        );
      }

      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo confirmar el pago.',
        variant: 'destructive'
      });
    }
  });

  // Cancelar cita
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointment: BackendAppointment) => {
      if (!appointment.id) throw new Error('Appointment ID is required');
      await apiClient.updateappointment(appointment.id, { status: 'cancelled' });
      return appointment;
    },
    onSuccess: (appointment) => {
      toast({
        title: 'Cita cancelada',
        description: 'La cita ha sido cancelada exitosamente.'
      });

      if (appointment.id) {
        sendNotification(appointment.id, 'cancelled', appointment);
      }

      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] });
    },
    onError: () => {
      toast({
        title: t('toasts.error_title'),
        description: t('toasts.appointment_cancel_error_desc'),
        variant: 'destructive'
      });
    }
  });

  const canCancelAppointment = (status: string) => {
    return ['pending_payment', 'payment_review', 'confirmed', 'pending'].includes(status);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const createdDate = user.created_at ? new Date(user.created_at) : new Date();
  const memberSince = format(createdDate, "d 'de' MMMM, yyyy", { locale: es });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'pending_payment':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'payment_review':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'completed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return '';
    }
  };

  // Helper to translate status labels
  const getStatusLabel = (status: string) => {
    // Map status to translation key
    // e.g. 'pending_payment' -> t('dashboard:status.pending_payment')
    return t(`status.${status}`) || status;
  };

  // Profile Card Component - Reutilizable para desktop y mobile
  const ProfileCard = ({ className = "", compact = false }: { className?: string; compact?: boolean }) => (
    <Card className={className}>
      <CardHeader className={`text-center ${compact ? 'pb-2 pt-4' : 'pb-2'}`}>
        <div className="mx-auto mb-3">
          <Avatar className={compact ? "h-16 w-16" : "h-20 w-20"}>
            {isTherapist && currentTherapist?.photo_url ? (
              <>
                <AvatarImage
                  src={(() => {
                    const rawUrl = currentTherapist.photo_url;
                    if (!rawUrl) return undefined;
                    return rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                  })()}
                  alt={currentTherapist.name || 'Therapist'}
                  className="object-cover"
                  style={{ objectPosition: currentTherapist.photo_position || '50% 20%' }}
                />
                <AvatarFallback className={`${compact ? 'text-lg' : 'text-xl'} gradient-primary text-primary-foreground`}>
                  {currentTherapist.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'PS'}
                </AvatarFallback>
              </>
            ) : (
              <AvatarFallback className={`${compact ? 'text-lg' : 'text-xl'} gradient-primary text-primary-foreground`}>
                {userInitials}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <CardTitle className={compact ? "text-lg" : "text-xl"}>{userName}</CardTitle>
        <CardDescription>
          {isAdmin && isTherapist ? 'Administrador & Psicólogo' : isAdmin ? t('roles.admin') : isTherapist ? t('roles.therapist') : t('roles.user')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground truncate">{user.email}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">{t('profile.member_since', { date: memberSince })}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Badge variant={userRole ? 'default' : 'secondary'}>
            {isAdmin && isTherapist ? 'Admin & Psicólogo' : isAdmin ? t('roles.admin') : isTherapist ? t('roles.therapist') : t('roles.no_role')}
          </Badge>
        </div>

        <div className="pt-3 border-t">
          <Button variant="outline" className="w-full" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            {t('actions.sign_out')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Appointment Card Component - Optimizado para móvil
  const AppointmentCard = ({ apt, showTherapist = false }: { apt: BackendAppointment; showTherapist?: boolean }) => (
    <div className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{apt.patient_name || t('common.no_name')}</p>
            {showTherapist && apt.therapist_name && (
              <p className="text-sm text-muted-foreground truncate">
                {apt.therapist_name}
              </p>
            )}
          </div>
          <Badge className={`${getStatusColor(apt.status ?? 'pending')} text-xs shrink-0`}>
            {getStatusLabel(apt.status ?? 'pending')}
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {format(new Date((apt.appointment_date ?? '') + 'T12:00:00'), "EEE d MMM", { locale: es })} • {(apt.start_time ?? '').slice(0, 5)}
          </p>
          {apt.consultation_reason && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {t('cards.reason')}: {apt.consultation_reason}
            </p>
          )}
          {(apt.patient_phone || (apt as { contact_phone?: string }).contact_phone) && (
            <p className="text-sm text-primary font-medium flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {(apt as { contact_phone?: string }).contact_phone || apt.patient_phone}
            </p>
          )}
        </div>

        {canCancelAppointment(apt.status ?? '') && (
          <div className="flex justify-end pt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2">
                  <XCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">{t('actions.cancel')}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('modals.cancel_title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('modals.cancel_desc', { name: apt.patient_name || t('common.this_patient') })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">{t('modals.keep')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cancelAppointmentMutation.mutate(apt)}
                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('modals.cancel_confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {!isTherapist && !isAdmin && apt.status === 'pending_payment' && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => navigate(`/payment/${apt.id}`)}>
              <CreditCard className="h-4 w-4 mr-2" />
              {t('actions.pay')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Payment Review Card - Optimizado para móvil
  const PaymentReviewCard = ({ apt }: { apt: AppointmentWithAmounts }) => {
    const amount =
      apt.final_price ??
      apt.original_price ??
      apt.amount_paid ??
      null;

    return (
      <div className="p-3 sm:p-4 rounded-lg border bg-card">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{apt.patient_name || t('common.no_name')}</p>
              <p className="text-sm text-muted-foreground truncate">
                {apt.therapist_name || t('common.unassigned')}
              </p>
            </div>
            <Badge className={`${getStatusColor(apt.status ?? 'pending')} text-xs shrink-0`}>
              {getStatusLabel(apt.status ?? 'pending')}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{format(new Date((apt.appointment_date ?? '') + 'T12:00:00'), "EEE d MMM", { locale: es })} • {(apt.start_time ?? '').slice(0, 5)}</p>
            {amount !== null && (
              <p className="text-foreground font-medium">
                {t('cards.amount')}: S/ {Number(amount).toFixed(0)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {apt.patient_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {apt.patient_phone}
                </span>
              )}
              {apt.patient_email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" />
                  {apt.patient_email}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => confirmPaymentMutation.mutate(apt)}
              disabled={confirmPaymentMutation.isPending}
              className="gap-2 w-full sm:flex-1"
            >
              <CheckCircle className="h-4 w-4" />
              Confirmar Pago
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 w-full sm:flex-1">
                  <XCircle className="h-4 w-4" />
                  Rechazar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. La cita de {apt.patient_name || 'este paciente'} será cancelada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">No, mantener</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cancelAppointmentMutation.mutate(apt)}
                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sí, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  // Use the selected role if admin is viewing as another role

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsive */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <img src={logoNegro} alt="Mente Livre" className="h-10 sm:h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                Ver Sitio
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden items-center gap-2">
            <Sheet open={showProfileMobile} onOpenChange={setShowProfileMobile}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <User className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Mi Perfil</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-60px)]">
                  <div className="p-4">
                    <ProfileCard compact />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm">
                <SheetHeader>
                  <SheetTitle>Menú</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 mt-6">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <Home className="h-5 w-5" />
                      Ver Sitio
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start gap-3" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                    <LogOut className="h-5 w-5" />
                    Cerrar Sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 sm:py-6 lg:py-8 px-4">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            ¡Hola, {userName.split(' ')[0]}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Bienvenido a tu panel personal
          </p>
        </div>

        {/* Layout Grid - Responsive */}
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6">

          {/* Profile Sidebar - Hidden on mobile (available via sheet) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <ProfileCard />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-4 sm:space-y-6">
            {/* Patient Packages Section */}
            {isPatient && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 sm:pb-4 border-b bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Gift className="h-5 w-5 text-primary" />
                        Mis Paquetes de Sesiones
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Tus paquetes de sesiones comprados
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6">
                  {loadingPackages ? (
                    <div className="space-y-3">
                      {[...Array(1)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                  ) : userPackages && userPackages.length > 0 ? (
                    <div className="space-y-4">
                      {userPackages.map((pkg: any) => (
                        <div key={pkg.id} className="flex flex-col sm:flex-row border rounded-lg p-4 justify-between items-start sm:items-center gap-4 bg-primary/5">
                          <div>
                            <h4 className="font-semibold">{pkg.packageName || 'Paquete Sesiones'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">Con {pkg.therapistName || 'Psicólogo no encontrado'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                                {pkg.status === 'active' ? 'Activo' : 'Completado'}
                              </Badge>
                              <span className="text-sm font-medium">
                                Sesiones: {pkg.used_sessions} / {pkg.total_sessions}
                              </span>
                            </div>
                          </div>
                          {pkg.status === 'active' && pkg.used_sessions < pkg.total_sessions && (
                            <Button
                              onClick={() => navigate(`/reservar/${pkg.therapist_id}`)}
                              className="w-full sm:w-auto whitespace-nowrap"
                            >
                              Programar siguiente sesión
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6 text-sm">
                      No tienes paquetes de sesiones activos.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stats Cards - Para admins */}
            {isAdmin && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xl sm:text-2xl font-bold">
                            {loadingTherapists ? <Skeleton className="h-6 w-8" /> : therapists?.length || 0}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Psicólogos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-success/10 shrink-0">
                          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xl sm:text-2xl font-bold">
                            {loadingAppointments ? <Skeleton className="h-6 w-8" /> : appointments?.length || 0}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Citas próximas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pagos Pendientes de Revisión */}
                <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/30">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span>Pagos en Revisión</span>
                      {pendingPayments && pendingPayments.length > 0 && (
                        <Badge className="bg-blue-600 text-white ml-auto">
                          {pendingPayments.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Citas que requieren confirmación de pago
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingPayments ? (
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                      </div>
                    ) : pendingPayments && pendingPayments.length > 0 ? (
                      <div className="space-y-3">
                        {pendingPayments.map((apt: AppointmentWithAmounts) => (
                          <PaymentReviewCard key={apt.id} apt={apt} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-6 text-sm">
                        No hay pagos pendientes de revisión
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Próximas Citas */}
                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Calendar className="h-5 w-5" />
                      Próximas Citas
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Las próximas citas programadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAppointments ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                      </div>
                    ) : appointments && appointments.length > 0 ? (
                      <div className="space-y-3">
                        {appointments.map((apt: BackendAppointment) => (
                          <AppointmentCard key={apt.id} apt={apt} showTherapist />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-6 text-sm">
                        No hay citas programadas próximamente
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Admin Tools - Collapsible on mobile */}
                <AdminBookingShortcut />
                <UserRolesManager />
                <TherapistUserLinker />
                <AdminTherapistManager />
                <TherapistPricingManager />
                <EmailDomainRulesManager />
                <PricingMetricsPanel />
                <PromoCodesManager />
                <SessionPackagesManager />
                <InstitutionalContentManager />
                <AppointmentsCalendar />

                {/* Gestión de Disponibilidad */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Settings className="h-5 w-5 text-primary" />
                      Gestión de Disponibilidad
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Configura los horarios de cada psicólogo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Selecciona un psicólogo
                      </label>
                      <TherapistSelector value={selectedTherapistId} onChange={setSelectedTherapistId} />
                    </div>

                    {selectedTherapist && (
                      <TherapistAvailabilityManager
                        therapistId={selectedTherapist.id!}
                        therapistName={selectedTherapist.name!}
                      />
                    )}

                    {!selectedTherapistId && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Selecciona un psicólogo para gestionar su disponibilidad
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Contenido para Terapeutas */}
            {isTherapist && therapistId && (
              <>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold">
                          {loadingAppointments ? <Skeleton className="h-6 w-8" /> : appointments?.length || 0}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Tus próximas citas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Calendar className="h-5 w-5" />
                      Mis Próximas Citas
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Tus citas programadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAppointments ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                      </div>
                    ) : appointments && appointments.length > 0 ? (
                      <div className="space-y-3">
                        {appointments.map((apt: BackendAppointment) => (
                          <AppointmentCard key={apt.id} apt={apt} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-6 text-sm">
                        No tienes citas programadas próximamente
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Settings className="h-5 w-5 text-primary" />
                      Mi Disponibilidad
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Configura tus horarios disponibles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentTherapist && (
                      <TherapistAvailabilityManager
                        therapistId={currentTherapist.id!}
                        therapistName={currentTherapist.name!}
                      />
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {isTherapist && !therapistId && !isAdmin && (
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Clock className="h-5 w-5 text-warning" />
                    Perfil Pendiente de Vinculación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Tu cuenta está registrada como psicólogo, pero aún no se ha vinculado tu perfil público o no tienes un perfil asignado a tu cuenta. Un administrador completará este proceso pronto, o puedes contactar al soporte.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Para usuarios sin rol u otros casos */}
            {!userRole && (
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Clock className="h-5 w-5 text-warning" />
                    Cuenta Pendiente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Tu cuenta ha sido creada exitosamente. Un administrador debe asignarte un rol
                    para que puedas acceder a todas las funcionalidades.
                  </p>
                  <Link to="/terapeutas">
                    <Button className="w-full sm:w-auto">
                      Ver Terapeutas Disponibles
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
