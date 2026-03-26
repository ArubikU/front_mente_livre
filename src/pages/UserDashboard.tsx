import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/integrations/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Calendar, Clock, User, LogOut, CreditCard, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
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
import type { Appointment as BackendAppointment } from '@/api/types';

interface DisplayAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_name: string;
  patient_phone: string | null;
  contact_phone: string | null;
  consultation_reason: string | null;
  therapist: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}
const UserDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const dateLocale = i18n.language === 'en' ? enUS : es;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const isLoading = authLoading || profileLoading;

  // Profile is already fetched via useUserProfile hook

  // Fetch user appointments
  const {
    data: appointments,
    isLoading: appointmentsLoading
  } = useQuery({
    queryKey: ['user-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.email) return [];

      const response = await apiClient.getappointments();
      if (response && 'data' in response && Array.isArray(response.data)) {
        // Filtrar solo las citas del usuario actual (por email)
        const userAppointments = response.data
          .filter((apt: BackendAppointment) => apt.patient_email === user.email)
          .map((apt: BackendAppointment): DisplayAppointment => ({
            id: apt.id || '',
            appointment_date: apt.appointment_date || '',
            start_time: apt.start_time || '',
            end_time: apt.end_time || '',
            status: apt.status || 'pending',
            patient_name: apt.patient_name || '',
            patient_phone: apt.patient_phone || null,
            contact_phone: apt.patient_phone || null,
            consultation_reason: apt.consultation_reason || null,
            therapist: {
              id: apt.therapist_id || '',
              name: apt.therapist_name || t('dashboard:user.therapist'),
              photo_url: null // TODO: Obtener desde therapist_photos
            }
          }));

        // Ordenar por fecha descendente
        return userAppointments.sort((a, b) => {
          const dateA = new Date(a.appointment_date).getTime();
          const dateB = new Date(b.appointment_date).getTime();
          return dateB - dateA;
        });
      }
      return [];
    },
    enabled: !!user?.id && !!user?.email
  });
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiClient.updateappointment(appointmentId, {
        status: 'cancelled' as const
      });
    },
    onSuccess: () => {
      toast({
        title: t('dashboard:user.cancelSuccess'),
        description: t('dashboard:user.cancelSuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] });
    },
    onError: (error: Error) => {
      console.error('Error canceling appointment:', error);
      toast({
        title: t('dashboard:user.cancelError'),
        description: error.message || t('dashboard:user.cancelErrorDesc'),
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await signOut();
    toast({
      title: t('dashboard:user.logoutSuccess'),
      description: t('dashboard:user.logoutDesc')
    });
    navigate('/');
  };

  const canCancelAppointment = (status: string) => {
    return ['pending_payment', 'payment_review', 'confirmed', 'pending'].includes(status);
  };
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }> = {
      pending_payment: {
        label: t('dashboard:user.status.pending_payment'),
        variant: 'destructive'
      },
      payment_review: {
        label: t('dashboard:user.status.payment_review'),
        variant: 'secondary'
      },
      confirmed: {
        label: t('dashboard:user.status.confirmed'),
        variant: 'default'
      },
      completed: {
        label: t('dashboard:user.status.completed'),
        variant: 'outline'
      },
      cancelled: {
        label: t('dashboard:user.status.cancelled'),
        variant: 'outline'
      },
      pending: {
        label: t('dashboard:user.status.pending'),
        variant: 'secondary'
      }
    };
    const config = statusConfig[status] || {
      label: status,
      variant: 'outline' as const
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  if (isLoading) {
    return <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    </PublicLayout>;
  }
  const userName = profile?.first_name || profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario';
  return <PublicLayout>
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('dashboard:user.hello', { name: userName })}
          </h1>

        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/terapeutas')} variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            {t('dashboard:user.bookAppointment')}
          </Button>
          <Button onClick={handleLogout} variant="ghost">
            <LogOut className="mr-2 h-4 w-4" />
            {t('dashboard:user.logout')}
          </Button>
        </div>
      </div>

      {/* Appointments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('dashboard:user.myAppointments')}
          </CardTitle>
          <CardDescription>
            {t('dashboard:user.appointmentsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div> : appointments && appointments.length > 0 ? <div className="space-y-4">
            {appointments.map(appointment => <div key={appointment.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {appointment.therapist?.name || t('dashboard:user.therapist')}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(appointment.appointment_date), "d 'de' MMMM, yyyy", {
                        locale: dateLocale
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(appointment.start_time)}
                    </span>
                  </div>
                  {appointment.consultation_reason && <p className="text-sm text-muted-foreground mt-1">
                    {t('dashboard:user.reason')}: {appointment.consultation_reason}
                  </p>}
                  {appointment.status === 'payment_review' && (appointment.contact_phone || appointment.patient_phone) && (
                    <p className="text-sm text-primary mt-1 font-medium">
                      📞 {t('dashboard:user.contact')}: {appointment.contact_phone || appointment.patient_phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 md:flex-shrink-0">
                {getStatusBadge(appointment.status)}
                {(appointment.status === 'pending_payment' || appointment.status === 'payment_review') && <Button size="sm" variant="outline" onClick={() => navigate(`/pago/${appointment.id}`)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {appointment.status === 'pending_payment' ? t('dashboard:user.pay') : t('dashboard:user.viewPayment')}
                </Button>}
                {canCancelAppointment(appointment.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('dashboard:user.cancel')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('dashboard:user.cancelDialogTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('dashboard:user.cancelDialogDesc', {
                            therapist: appointment.therapist?.name,
                            date: format(parseISO(appointment.appointment_date), "d 'de' MMMM", { locale: dateLocale })
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('dashboard:user.keep')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelAppointmentMutation.mutate(appointment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('dashboard:user.confirmCancel')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>)}
          </div> : <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('dashboard:user.noAppointments')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('dashboard:user.bookFirst')}
            </p>
            <Button onClick={() => navigate('/terapeutas')}>
              {t('dashboard:user.viewTherapists')}
            </Button>
          </div>}
        </CardContent>
      </Card>
    </div>
  </PublicLayout>;
};
export default UserDashboard;