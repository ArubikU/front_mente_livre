import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, parse, isBefore, isSameDay, startOfDay, startOfWeek, addHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es, enUS } from 'date-fns/locale';
import { useTranslation, Trans } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, ArrowLeft, ShieldAlert, Info } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { apiClient } from '@/integrations/api/client';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend.mentelivre.org';
import type { Therapist, WeeklySchedule, Appointment as BackendAppointment, DayOfWeek } from '@/types/database';
// import type { Inline1 } from '@/api/types'; // Using any instead if needed
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PromoCodeInput } from '@/components/promo/PromoCodeInput';
import { usePromoCode } from '@/hooks/usePromoCode';
import { getDisplayPrice } from '@/lib/pricingUtils';
import { useMetaTags } from '@/hooks/useMetaTags';
import { useUserProfile } from '@/hooks/useUserProfile';



// Constantes para la regla de anticipación mínima
const TIMEZONE = 'America/Lima';
const MIN_HOURS_ADVANCE = 10;

const DAY_ORDER: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Helper functions to convert between day numbers (backend: 1-7) and day strings (frontend)
const dayStringToNumber = (dayStr: DayOfWeek): number => {
  const mapping: Record<DayOfWeek, number> = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 7
  };
  return mapping[dayStr] || 1;
};

export default function BookAppointment() {
  const { therapistId } = useParams<{ therapistId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { accountType, profile } = useUserProfile();
  const { t, i18n } = useTranslation(['booking', 'common']);
  const dateLocale = i18n.language === 'en' ? enUS : es;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [step, setStep] = useState<'select' | 'form'>('select');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    reason: '',
  });

  // Estado para código promocional
  const [appliedPromo, setAppliedPromo] = useState<{
    promoCodeId: string;
    code: string;
    discountPercent: number;
    finalPrice: number;
    discountAmount: number;
  } | null>(null);
  const { recordUsage } = usePromoCode();

  // Solo terapeutas no pueden agendar (admins sí pueden, en nombre de un paciente)
  const isStaff = userRole === 'admin' || userRole === 'therapist';
  const isAdmin = userRole === 'admin';


  // Pre-fill name if user is logged in (but not for admin — they're booking for a patient)
  useEffect(() => {
    if (profile?.full_name && !isAdmin) {
      setFormData(prev => ({ ...prev, name: profile.full_name || '' }));
    }
  }, [profile, isAdmin]);

  const { data: therapist, isLoading: loadingTherapist } = useQuery({
    queryKey: ['therapist', therapistId],
    queryFn: async () => {
      if (!therapistId) return null;
      const response = await apiClient.gettherapist(therapistId);
      if (response && 'data' in response && response.data) {
        const therapistData = response.data as Therapist;
        // Extraer photo_url del array de photos si existe
        if (therapistData.photos && Array.isArray(therapistData.photos) && therapistData.photos.length > 0) {
          const photos = therapistData.photos as any[];
          const profilePhoto = photos.find((p) => p.photo_type === 'profile') || photos[0];
          (therapistData as Therapist & { photo_url?: string | null }).photo_url = profilePhoto?.photo_url ?? null;
        }
        return therapistData;
      }
      return null;
    },
    enabled: !!therapistId,
  });

  const { data: sessionPackages } = useQuery({
    queryKey: ['session-packages', therapistId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: any[] }>('/session-packages');
      if (response && 'data' in response && Array.isArray(response.data)) {
        return response.data.filter(pkg => pkg.is_active);
      }
      return [];
    }
  });

  const { data: activeUserPackage } = useQuery({
    queryKey: ['active-user-package', therapistId],
    queryFn: async () => {
      if (!user?.email || !therapistId) return null;
      // We assume user can use their active package if exists
      const response = await apiClient.get<{ data: any[] }>('/patient-packages/my-packages');
      if (response && 'data' in response && Array.isArray(response.data)) {
        const active = response.data.find(p => p.therapist_id === therapistId && p.status === 'active' && p.used_sessions < p.total_sessions);
        return active || null;
      }
      return null;
    },
    enabled: !!user?.email && !!therapistId
  });

  const [selectedPackageId, setSelectedPackageId] = useState<string | 'single'>('single');

  // Dynamic Metadata
  useMetaTags({
    title: therapist ? `${t('booking:title')} - ${therapist.name}` : undefined,
    description: therapist ? t('booking:description', { name: therapist.name, specialty: therapist.specialty || 'Psicología' }) : undefined,
    image: (therapist as any)?.photo_url || undefined,
  });


  // Fetch base weekly schedules
  const { data: baseSchedules } = useQuery({
    queryKey: ['therapist-base-schedules', therapistId],
    queryFn: async () => {
      if (!therapistId) return [];
      const response = await apiClient.gettherapistschedules(therapistId);
      if (response && 'data' in response && Array.isArray(response.data)) {
        const schedules = (response.data as WeeklySchedule[]).filter(s => s.is_active !== false);
        return schedules;
      }
      return [];
    },
    enabled: !!therapistId,
  });

  // Fetch week-specific overrides for the next 30 days
  const { data: weekOverrides } = useQuery({
    queryKey: ['therapist-week-overrides-booking', therapistId],
    queryFn: async () => {
      if (!therapistId) return [];
      const today = new Date();

      // Get all week start dates we need to check for 30 days
      const weekStarts = new Set<string>();
      for (let i = 0; i <= 30; i++) {
        const date = addDays(today, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        weekStarts.add(format(weekStart, 'yyyy-MM-dd'));
      }

      // Fetch overrides for each week start date using apiClient
      const allOverrides: Array<WeeklySchedule & { week_start_date?: string }> = [];

      for (const weekStart of Array.from(weekStarts)) {
        try {
          const data = await apiClient.get<{ data: WeeklySchedule[] }>(
            `/therapists/${therapistId}/schedule-overrides?week_start_date=${weekStart}`
          );
          if (data && 'data' in data && Array.isArray(data.data)) {
            allOverrides.push(...data.data.filter((o) => o.is_active !== false));
          }
        } catch (error) {
          console.error(`Error fetching overrides for week ${weekStart}:`, error);
        }
      }

      return allOverrides;
    },
    enabled: !!therapistId,
  });

  // Obtener todas las citas existentes que bloquean slots para los próximos 30 días
  // Estados que bloquean: pending, pending_payment, payment_review, confirmed, completed
  const BLOCKING_STATUSES = ['pending', 'pending_payment', 'payment_review', 'confirmed', 'completed'] as const;

  const { data: allAppointments } = useQuery({
    queryKey: ['therapist-all-appointments', therapistId],
    queryFn: async () => {
      if (!therapistId) return [];
      const today = new Date();
      const thirtyDaysLater = addDays(today, 30);

      const params = new URLSearchParams();
      params.append('therapist_id', therapistId);
      params.append('date_from', format(today, 'yyyy-MM-dd'));
      params.append('date_to', format(thirtyDaysLater, 'yyyy-MM-dd'));

      // Usar el método get del apiClient
      const data = await apiClient.get<{ data: BackendAppointment[] }>(`/appointments?${params.toString()}`);

      if (data && 'data' in data && Array.isArray(data.data)) {
        // Solo incluir citas con estados que bloquean slots (excluir canceladas)
        return data.data.filter(apt =>
          apt.status && BLOCKING_STATUSES.includes(apt.status as typeof BLOCKING_STATUSES[number])
        );
      }
      return [];
    },
    enabled: !!therapistId,
    staleTime: 5000, // 5 segundos de gracia para evitar flickering
    refetchOnMount: 'always',
    gcTime: 1000 * 60, // 1 minuto en memoria background
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime || !therapistId) throw new Error('Datos incompletos');

      const startTime = selectedTime;
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHours = hours + 1;
      const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      const appointmentDate = format(selectedDate, 'yyyy-MM-dd');

      // VALIDACIÓN CRÍTICA: Verificar regla de 10 horas de anticipación (server-side check)
      // EXCEPCIÓN: Admins pueden agendar sin restricción
      if (userRole !== 'admin') {
        const nowInLima = toZonedTime(new Date(), TIMEZONE);
        const minBookingTime = addHours(nowInLima, MIN_HOURS_ADVANCE);

        // Construir datetime del slot seleccionado
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(hours, minutes, 0, 0);

        if (slotDateTime < minBookingTime) {
          throw new Error('MIN_ADVANCE_NOT_MET');
        }
      }

      // Verificar disponibilidad antes de insertar (server-side check)
      // El backend ya valida esto, pero verificamos localmente también
      const blockingAppointments = allAppointments?.filter(apt =>
        apt.appointment_date === appointmentDate &&
        apt.start_time === startTime &&
        apt.status !== undefined && BLOCKING_STATUSES.includes(apt.status as (typeof BLOCKING_STATUSES)[number])
      );

      if (blockingAppointments && blockingAppointments.length > 0) {
        throw new Error('SLOT_TAKEN');
      }

      // Get current user email (admin books on behalf of patient, so use form email)
      const patientEmail = isAdmin
        ? (formData.email.trim() || 'sin-email@mentelivre.com')
        : (user?.email || formData.email.trim() || 'sin-email@mentelivre.com');

      // Calcular precio final usando getDisplayPrice
      const priceInfo = therapist ? getDisplayPrice(therapist, accountType) : { displayPrice: 0 };
      const therapistPrice = priceInfo.displayPrice;

      // Si hay código promocional, el backend ya calculó el precio final sobre el precio del terapeuta
      // originalPrice es el precio del terapeuta (sin descuento del código)
      // finalPrice es el precio con descuento del código aplicado
      const originalPrice = therapistPrice;
      const finalPrice = appliedPromo ? appliedPromo.finalPrice : therapistPrice;

      const appointmentData: Partial<BackendAppointment> & { original_price: number; final_price: number; discount_applied?: number; promo_code_id?: string; patient_package_id?: string; new_package_id?: string } = {
        therapist_id: therapistId,
        user_id: isAdmin ? undefined : user?.id, // Admin books for patient, don't link admin's account
        patient_name: formData.name.trim(),
        patient_email: patientEmail,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        status: isAdmin ? 'confirmed' as const : 'pending_payment' as const,
        original_price: originalPrice,
        final_price: finalPrice,
      };

      if (selectedPackageId !== 'single' && selectedPackageId !== 'active') {
        const selectedPkg = sessionPackages?.find(p => p.id === selectedPackageId);
        if (selectedPkg) {
          const rawTotal = originalPrice * selectedPkg.session_count;
          const discountVal = Math.floor(rawTotal * (selectedPkg.discount_percent / 100));
          appointmentData.final_price = rawTotal - discountVal;
          appointmentData.original_price = rawTotal;
          // Important: We need backend support for creating the package during payment.
          // For now we will pass a custom flag so the backend PaymentController knows it's a package.
          appointmentData.new_package_id = selectedPkg.id;
        }
      } else if (selectedPackageId === 'active' && activeUserPackage) {
        appointmentData.patient_package_id = activeUserPackage.id;
        appointmentData.final_price = 0; // Already paid
      }

      // Agregar campos opcionales solo si tienen valor
      if (formData.phone.trim()) {
        appointmentData.patient_phone = formData.phone.trim();
      }
      if (formData.reason.trim()) {
        appointmentData.consultation_reason = formData.reason.trim();
      }
      if (appliedPromo) {
        appointmentData.discount_applied = appliedPromo.discountAmount;
        if (appliedPromo.promoCodeId) {
          appointmentData.promo_code_id = appliedPromo.promoCodeId;
        }
      }

      if (!therapistId) {
        throw new Error('Datos incompletos: falta el terapeuta');
      }

      const response = await apiClient.createappointment({
        ...appointmentData,
        therapist_id: therapistId,
      } as Parameters<typeof apiClient.createappointment>[0]);

      // El backend puede responder con { id, message } o { data: { id, ... } }
      let appointmentId: string;

      if ('data' in response && response.data) {
        // Formato ApiResponse estándar
        const data = response.data as BackendAppointment;
        appointmentId = data.id || '';
      } else if ('id' in (response as BackendAppointment)) {
        // Formato directo { id, message }
        const directResponse = response as BackendAppointment;
        appointmentId = directResponse.id ?? '';
      } else {
        throw new Error('Error al crear la cita: respuesta inválida');
      }

      if (!appointmentId) {
        throw new Error('Error al crear la cita: no se recibió ID');
      }

      // TODO: Enviar correo de confirmación (implementar endpoint de notificaciones en backend)
      console.log('Appointment created:', appointmentId);

      return { id: appointmentId };
    },
    onSuccess: async (data) => {
      // Registrar uso del código promocional si se aplicó uno
      if (appliedPromo) {
        const patientEmail = isAdmin
          ? (formData.email.trim() || 'sin-email@mentelivre.com')
          : (user?.email || formData.email.trim() || 'sin-email@mentelivre.com');
        await recordUsage(
          appliedPromo.promoCodeId,
          patientEmail,
          data.id,
          appliedPromo.discountAmount,
          appliedPromo.finalPrice
        );
      }
      queryClient.invalidateQueries({ queryKey: ['therapist-all-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-all-appointments', therapistId] });
      if (isAdmin) {
        navigate('/dashboard');
      } else {
        navigate(`/pago/${data.id}`);
      }
    },
    onError: (error: Error) => {
      if (error.message === 'MIN_ADVANCE_NOT_MET') {
        toast({
          title: 'Horario no disponible',
          description: 'Por organización del servicio, las citas se agendan con un mínimo de 10 horas de anticipación. Por favor elige otro horario.',
          variant: 'destructive',
        });
        queryClient.invalidateQueries({ queryKey: ['therapist-all-appointments', therapistId] });
        setSelectedTime(null);
        setSelectedDate(null);
        setStep('select');
      } else if (error.message === 'SLOT_TAKEN') {
        toast({
          title: 'Lo sentimos, este horario acaba de ser reservado',
          description: 'Otro usuario reservó este horario mientras completabas el formulario. Por favor elige otro horario disponible.',
          variant: 'destructive',
        });
        queryClient.invalidateQueries({ queryKey: ['therapist-all-appointments', therapistId] });
        setSelectedTime(null);
        setSelectedDate(null);
        setStep('select');
      } else {
        // Show specific error message from backend if available
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error, intenta nuevamente.';

        toast({
          title: 'Error al agendar',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });

  // Helper: verifica si un slot cumple con la regla de 10 horas de anticipación
  // EXCEPCIÓN: Admins ven todos los slots sin restricción
  const isSlotWithinMinAdvance = useCallback((slotDate: Date, slotTimeStr: string): boolean => {
    // Admins pueden ver todos los horarios
    if (isAdmin) return true;

    // Obtener hora actual en America/Lima
    const nowInLima = toZonedTime(new Date(), TIMEZONE);
    const minBookingTime = addHours(nowInLima, MIN_HOURS_ADVANCE);

    // Construir datetime del slot
    const [hours, minutes] = slotTimeStr.split(':').map(Number);
    const slotDateTime = new Date(slotDate);
    slotDateTime.setHours(hours, minutes, 0, 0);

    // El slot debe ser >= ahora + 10 horas
    return slotDateTime >= minBookingTime;
  }, [isAdmin]);

  // Genera las fechas disponibles con sus slots usando la última disponibilidad guardada
  // REGLA: Solo mostrar slots con al menos 10 horas de anticipación (excepto admins)
  const availableDatesWithSlots = useMemo(() => {
    // Need either base schedules or week overrides
    if (!baseSchedules && !weekOverrides) {
      return [];
    }

    const result: { date: Date; slots: string[] }[] = [];
    const nowInLima = toZonedTime(new Date(), TIMEZONE);
    const today = startOfDay(nowInLima);

    // Start from today (i=0) and extend to 30 days
    for (let i = 0; i <= 30; i++) {
      const date = addDays(today, i);
      const dayOfWeek = (date.getDay() + 6) % 7;
      const day = DAY_ORDER[dayOfWeek];
      const dateStr = format(date, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Check if there are overrides for this week (last-write-wins)
      // Backend returns day_of_week as number (1-7), convert to string for comparison
      const dayNumber = dayStringToNumber(day);
      const weekSpecificOverrides = weekOverrides?.filter(
        o => o.week_start_date === weekStart && Number(o.day_of_week) === dayNumber
      );

      // Use overrides if they exist for this week, otherwise use base schedules
      // Backend returns day_of_week as number (1-7), convert to string for comparison
      const daySchedules = weekSpecificOverrides && weekSpecificOverrides.length > 0
        ? weekSpecificOverrides
        : baseSchedules?.filter(s => Number(s.day_of_week) === dayNumber) || [];

      if (daySchedules.length === 0) {
        continue;
      }

      const slots: string[] = [];

      daySchedules.forEach(schedule => {
        const startStr = schedule.start_time ?? '00:00:00';
        const endStr = schedule.end_time ?? '23:59:59';
        const start = parse(startStr, 'HH:mm:ss', new Date());
        const end = parse(endStr, 'HH:mm:ss', new Date());

        let current = start;
        while (isBefore(current, end)) {
          const timeStr = format(current, 'HH:mm:ss');

          // REGLA CRÍTICA: Solo mostrar si el slot está a 10+ horas de anticipación (excepto admin)
          if (!isSlotWithinMinAdvance(date, timeStr)) {
            current = new Date(current.getTime() + 60 * 60 * 1000);
            continue;
          }

          // Verificar si este slot ya está reservado
          // Normalizar tiempos: extraer solo HH:MM:SS (puede venir con microsegundos o formato diferente)
          const isBooked = allAppointments?.some(a => {
            // Normalizar appointment_date (puede venir como 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS')
            const appointmentDate = a.appointment_date?.split(' ')[0] || '';

            // Normalizar start_time: extraer HH:MM:SS (puede venir como 'HH:MM:SS' o 'HH:MM:SS.000000')
            let appointmentStartTime = a.start_time || '';
            // Remover microsegundos si existen
            if (appointmentStartTime.includes('.')) {
              appointmentStartTime = appointmentStartTime.split('.')[0];
            }
            // Normalizar a formato HH:MM:SS (asegurar 2 dígitos en cada parte)
            const timeParts = appointmentStartTime.split(':');
            if (timeParts.length >= 2) {
              const hours = timeParts[0].padStart(2, '0');
              const minutes = timeParts[1].padStart(2, '0');
              const seconds = (timeParts[2] || '00').padStart(2, '0');
              appointmentStartTime = `${hours}:${minutes}:${seconds}`;
            }

            // Comparar fecha y hora exacta
            const matches = appointmentDate === dateStr && appointmentStartTime === timeStr;
            return matches;
          });

          if (!isBooked) {
            slots.push(timeStr);
          }

          current = new Date(current.getTime() + 60 * 60 * 1000);
        }
      });

      if (slots.length > 0) {
        result.push({ date, slots });
      }
    }

    return result;
  }, [baseSchedules, weekOverrides, allAppointments, isSlotWithinMinAdvance]);

  const formatTimeToAMPM = (time: string) => {
    const [hours] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:00 ${ampm}`;
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      setStep('form');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: t('booking:errors.nameRequired'), description: t('auth:errors.requiredDesc'), variant: 'destructive' });
      return;
    }

    if (isAdmin && !formData.email.trim()) {
      toast({ title: 'Email del paciente requerido', description: 'Ingresa el email del paciente para agendar.', variant: 'destructive' });
      return;
    }

    if (!formData.phone.trim()) {
      toast({ title: t('booking:errors.phoneRequired'), description: t('auth:errors.requiredDesc'), variant: 'destructive' });
      return;
    }

    if (!formData.reason.trim()) {
      toast({ title: t('booking:errors.reasonRequired'), description: t('auth:errors.requiredDesc'), variant: 'destructive' });
      return;
    }

    if (!consentAccepted) {
      toast({ title: t('booking:errors.consentRequired'), description: t('booking:errors.consentDesc'), variant: 'destructive' });
      return;
    }

    createAppointmentMutation.mutate();
  };


  // Block therapists from booking (admins can book on behalf of patients)
  if (!authLoading && isStaff && !isAdmin) {
    return (
      <PublicLayout>
        <div className="container py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-100 mb-6">
              <ShieldAlert className="h-12 w-12 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">{t('booking:restricted.title')}</h1>
            <p className="text-muted-foreground mb-6">
              {t('booking:restricted.description', { role: userRole === 'admin' ? 'admin' : 'therapist' })}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/terapeutas')} size="lg" variant="outline">
                {t('booking:restricted.viewTherapists')}
              </Button>
              <Button onClick={() => navigate('/dashboard')} size="lg">
                {t('booking:restricted.goToDashboard')}
              </Button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Removed early auth block to allow guest view


  return (
    <PublicLayout>
      <div className="container py-8">
        <Button variant="ghost" onClick={() => step === 'form' ? setStep('select') : navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('booking:back')}
        </Button>

        {loadingTherapist ? (
          <div className="grid lg:grid-cols-4 gap-8">
            <Card className="lg:col-span-1">
              <CardContent className="p-6">
                <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
                <Skeleton className="h-5 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-40 mx-auto" />
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <Skeleton className="h-[500px] w-full rounded-xl" />
            </div>
          </div>
        ) : therapist ? (
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Therapist Info Card */}
            <Card className="lg:col-span-1 h-fit shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-4 ring-4 ring-primary/20">
                    <AvatarImage
                      src={(() => {
                        const rawUrl = (therapist as Therapist & { photo_url?: string }).photo_url;
                        if (!rawUrl) return undefined;
                        if (rawUrl.startsWith('http')) return rawUrl;
                        return `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                      })()}
                      alt={therapist.name}
                      className="object-cover object-[50%_30%]"
                    />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                      {therapist!.name!.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="text-lg font-semibold mb-1">{therapist.name}</h2>
                  <p className="text-sm text-primary mb-1">
                    {therapist.experience_topics?.[0] ?? 'Psicología General'}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {therapist.university}
                  </p>

                  <Separator className="my-4 w-full" />

                  <div className="w-full space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('booking:duration')}</span>
                      <span className="font-medium">40 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('booking:price')}</span>
                      {(() => {
                        const priceInfo = getDisplayPrice(therapist, accountType);
                        const pricing = (therapist as { pricing?: Record<string, { price?: number }> }).pricing;
                        const publicPrice = pricing?.public?.price;
                        const legacyPublicRaw = (therapist as { price_public?: number | string }).price_public;
                        const legacyPublic = typeof legacyPublicRaw === 'string' ? Number(legacyPublicRaw) : legacyPublicRaw;
                        const originalPrice = publicPrice ?? legacyPublic ?? (therapist.hourly_rate ? Number(therapist.hourly_rate) : priceInfo.displayPrice);
                        const isDiscounted = priceInfo.isUniversityRate && originalPrice > priceInfo.displayPrice;
                        const savings = isDiscounted ? originalPrice - priceInfo.displayPrice : 0;

                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            {isDiscounted ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                                    S/ {originalPrice.toFixed(0)}
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    {t('booking:studentRate')}
                                  </span>
                                </div>
                                <span className="text-base font-semibold text-primary whitespace-nowrap">
                                  S/ {priceInfo.displayPrice.toFixed(0)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {t('booking:savings', { amount: savings.toFixed(0) })}
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-foreground whitespace-nowrap">
                                S/ {priceInfo.displayPrice.toFixed(0)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('booking:modality')}</span>
                      <span className="font-medium">{t('booking:modalityValue')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Section */}
            <Card className="lg:col-span-3 shadow-sm">
              <CardContent className="p-6">
                {step === 'select' ? (
                  <>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      {t('booking:selectDate')} & {t('booking:selectTime')}
                    </h2>

                    {availableDatesWithSlots.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Calendar Section - Left Side */}
                        <div className="flex flex-col">
                          <h3 className="font-medium mb-3 text-sm text-muted-foreground">{t('booking:selectDate')}</h3>
                          <div className="border rounded-xl p-4 bg-card">
                            <Calendar
                              mode="single"
                              selected={selectedDate || undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setSelectedDate(date);
                                  setSelectedTime(null);
                                }
                              }}
                              fromDate={new Date()}
                              toDate={addDays(new Date(), 30)}
                              disabled={(date) => {
                                // Bloquear fechas pasadas
                                if (isBefore(startOfDay(date), startOfDay(new Date()))) {
                                  return true;
                                }
                                // Bloquear fechas sin disponibilidad
                                const isAvailable = availableDatesWithSlots.some(
                                  d => isSameDay(startOfDay(d.date), startOfDay(date))
                                );
                                return !isAvailable;
                              }}
                              locale={dateLocale}
                              className="rounded-md pointer-events-auto w-full"
                              classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                                month: "space-y-4 w-full",
                                table: "w-full border-collapse",
                                head_row: "flex w-full",
                                head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
                                row: "flex w-full mt-2",
                                cell: "flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "h-9 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent text-accent-foreground",
                                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                day_disabled: "text-muted-foreground opacity-30",
                              }}
                            />
                          </div>
                        </div>

                        {/* Time Slots Section - Right Side */}
                        <div className="flex flex-col">
                          <h3 className="font-medium mb-3 text-sm text-muted-foreground">
                            {selectedDate
                              ? format(selectedDate, "EEEE d 'de' MMMM", { locale: dateLocale })
                              : t('booking:calendar.selectDate')
                            }
                          </h3>
                          <div className="border rounded-xl p-4 bg-card flex-1 min-h-[280px]">
                            {selectedDate ? (
                              (() => {
                                const selectedDateSlots = availableDatesWithSlots.find(
                                  d => isSameDay(startOfDay(d.date), startOfDay(selectedDate))
                                );

                                if (!selectedDateSlots || selectedDateSlots.slots.length === 0) {
                                  return (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                      <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                                      <p className="text-muted-foreground text-sm">{t('booking:calendar.noSlotsDate')}</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="grid grid-cols-2 gap-2">
                                    {selectedDateSlots.slots.map((slot) => {
                                      const isSelected = selectedTime === slot;
                                      return (
                                        <button
                                          key={slot}
                                          onClick={() => setSelectedTime(slot)}
                                          className={`
                                            flex items-center justify-center gap-2 px-3 py-3 rounded-lg border transition-all
                                            ${isSelected
                                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                              : 'bg-background hover:border-primary/50 hover:bg-muted/50'
                                            }
                                          `}
                                        >
                                          <Clock className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                          <span className="font-medium text-sm">{formatTimeToAMPM(slot)}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <CalendarIcon className="h-10 w-10 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground text-sm">{t('booking:calendar.selectDate')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <div className="space-y-2">
                          <p className="text-muted-foreground">{t('booking:calendar.noSlotsGeneral')}</p>
                          {(!baseSchedules || baseSchedules.length === 0) && (
                            <p className="text-xs text-muted-foreground">
                              {t('booking:calendar.therapistNoSchedule')}
                            </p>
                          )}
                          {baseSchedules && baseSchedules.length > 0 && availableDatesWithSlots.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              {t('booking:calendar.slotsBusy')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Continue / Guest CTA Button */}
                    <div className="mt-8 pt-6 border-t">
                      {user ? (
                        <Button
                          onClick={handleContinue}
                          disabled={!selectedDate || !selectedTime}
                          className="w-full"
                          size="lg"
                        >
                          {t('booking:continue')}
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          {!selectedDate || !selectedTime ? (
                            <Button disabled className="w-full" size="lg">
                              {t('booking:selectDate')}
                            </Button>
                          ) : (
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                              <h3 className="font-semibold text-lg mb-2">{t('booking:almostReady')}</h3>
                              <p className="text-muted-foreground text-sm mb-4">
                                <Trans
                                  i18nKey="booking:aboutToBook"
                                  values={{
                                    date: format(selectedDate, "EEEE d 'de' MMMM", { locale: dateLocale }),
                                    time: formatTimeToAMPM(selectedTime)
                                  }}
                                  components={{
                                    1: <span className="font-medium text-foreground" />,
                                    3: <span className="font-medium text-foreground" />
                                  }}
                                />
                                <br />
                                {t('booking:completeReservation')}
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button onClick={() => navigate('/mi-cuenta')} size="lg" className="px-8 shadow-md">
                                  {t('booking:loginToBook')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-center text-muted-foreground mt-3">
                        {t('booking:termsAcceptance')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Greeting for logged in users */}
                    {user && profile ? (
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">
                          {t('booking:greeting', { name: profile.full_name?.split(' ')[0] })}
                        </h2>
                        <p className="text-muted-foreground">
                          <Trans
                            i18nKey="booking:aboutToBook"
                            values={{
                              date: selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: dateLocale }),
                              time: selectedTime && formatTimeToAMPM(selectedTime)
                            }}
                            components={{
                              1: <span className="font-medium text-foreground" />,
                              3: <span className="font-medium text-foreground" />
                            }}
                          />
                        </p>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-xl font-semibold mb-2">{t('booking:completeDetails')}</h2>
                        <p className="text-muted-foreground mb-6">
                          {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: dateLocale })} • {selectedTime && formatTimeToAMPM(selectedTime)}
                        </p>
                      </>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Show name/email fields for guests or admin (booking on behalf of patient) */}
                      {(!user || isAdmin) && (
                        <div className="space-y-2">
                          <Label htmlFor="name">{isAdmin ? 'Nombre del paciente' : t('booking:form.name')} *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('booking:form.name')}
                            required
                          />
                        </div>
                      )}

                      {isAdmin && (
                        <div className="space-y-2">
                          <Label htmlFor="email">Email del paciente *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="paciente@email.com"
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('booking:form.phone')} *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                            setFormData(prev => ({ ...prev, phone: value }));
                          }}
                          placeholder="987654321"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reason">{t('booking:reason')} *</Label>
                        <Textarea
                          id="reason"
                          value={formData.reason}
                          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder={t('booking:reasonPlaceholder')}
                          rows={3}
                          required
                        />
                      </div>

                      {/* Promo Code Section */}
                      {therapist && user?.email && (
                        <div className="space-y-2">
                          <Label>{t('booking:form.promoCode')}</Label>
                          <PromoCodeInput
                            userEmail={user.email}
                            basePrice={(() => {
                              const priceInfo = getDisplayPrice(therapist, accountType);
                              return priceInfo.displayPrice;
                            })()}
                            onValidCode={(validation) => {
                              setAppliedPromo(validation);
                            }}
                            onClear={() => {
                              setAppliedPromo(null);
                            }}
                          />
                          {appliedPromo && (
                            <div className="text-sm text-muted-foreground">
                              {t('booking:price')}: <span className="line-through">S/ {(() => {
                                const priceInfo = getDisplayPrice(therapist, accountType);
                                return priceInfo.displayPrice.toFixed(0);
                              })()}</span>{' '}
                              → <span className="font-semibold text-primary">S/ {appliedPromo.finalPrice.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Consent Section */}
                      <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="consent"
                            checked={consentAccepted}
                            onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor="consent"
                              className="text-sm leading-relaxed cursor-pointer text-foreground"
                            >
                              <Trans
                                i18nKey="booking:form.consentLabel"
                                components={{
                                  1: (
                                    <Link
                                      to="/terminos-y-condiciones"
                                      target="_blank"
                                      className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      placeholder
                                    </Link>
                                  )
                                }}
                              />
                            </label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center ml-1.5 text-muted-foreground hover:text-primary transition-colors"
                                    aria-label="Más información"
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-xs text-center p-3"
                                >
                                  <p className="text-sm">
                                    {t('booking:form.consentTooltip')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>

                      {/* Package Selector */}
                      {!activeUserPackage && sessionPackages && sessionPackages.length > 0 && (
                        <div className="space-y-3 mt-4">
                          <Label className="text-base font-semibold">{t('booking:selectOptions', 'Opciones de sesión')}</Label>
                          <div className="grid gap-3">
                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedPackageId === 'single' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                              onClick={() => setSelectedPackageId('single')}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium">1 Sesión individual</span>
                                <span className="font-semibold text-primary">S/ {(() => {
                                  let finalP = getDisplayPrice(therapist, accountType).displayPrice;
                                  if (appliedPromo) finalP = appliedPromo.finalPrice;
                                  return finalP.toFixed(0);
                                })()}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Pago por sesión única</p>
                            </div>

                            {sessionPackages.map(pkg => {
                              const baseP = getDisplayPrice(therapist, accountType).displayPrice;
                              const rawTotal = baseP * pkg.session_count;
                              const discountVal = Math.floor(rawTotal * (pkg.discount_percent / 100));
                              const pkgPrice = rawTotal - discountVal;

                              return (
                                <div
                                  key={pkg.id}
                                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedPackageId === pkg.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                                  onClick={() => setSelectedPackageId(pkg.id)}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">{pkg.name} ({pkg.session_count} sesiones)</span>
                                    <div className="text-right">
                                      <span className="text-xs text-muted-foreground line-through mr-2">S/ {rawTotal.toFixed(0)}</span>
                                      <span className="font-semibold text-primary">S/ {pkgPrice.toFixed(0)}</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground">Ahorras {pkg.discount_percent}% (S/ {discountVal.toFixed(0)}). Precio final fijado.</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Active Package notification */}
                      {activeUserPackage && (
                        <div className="bg-primary/10 border-l-4 border-primary p-4 my-4 rounded-r-md">
                          <p className="text-sm font-medium text-primary-foreground mb-1">
                            ¡Tienes un paquete activo!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Usarás la sesión {activeUserPackage.used_sessions + 1} de {activeUserPackage.total_sessions} de tu paquete. <strong>No se te cobrará nada.</strong>
                          </p>
                          {(() => setSelectedPackageId('active'))()}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={!consentAccepted || createAppointmentMutation.isPending}
                      >
                        {createAppointmentMutation.isPending ? t('booking:loading') : t('booking:confirm')}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        {t('booking:verifyingPayment')}
                      </p>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{t('booking:therapistNotFound')}</p>
            <Button onClick={() => navigate('/terapeutas')} className="mt-4">
              {t('booking:restricted.viewTherapists')}
            </Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
