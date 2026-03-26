import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { useTranslation, Trans } from 'react-i18next';
import { CheckCircle, Loader2, AlertCircle, MessageCircle, CreditCard, QrCode } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import type { Appointment, Therapist } from '@/types/database';

export interface AppointmentWithDetails extends Omit<Appointment, 'id' | 'status'> {
  id: string;
  status: string;
  patient_email: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  therapist?: Therapist & { photo_url?: string };
  final_price?: number;
  original_price?: number;
  discount_applied?: number;
}
import { useToast } from '@/hooks/use-toast';
import MercadoPagoPayment from '@/components/payment/MercadoPagoPayment';
import CulqiPayment from '@/components/payment/CulqiPayment';
import IzipayPayment from '@/components/payment/IzipayPayment';
import { paymentConfig } from '@/config/payment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function Payment() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation(['payment', 'common']);
  const dateLocale = i18n.language === 'en' ? enUS : es;

  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'mp_card' | 'culqi' | 'izipay' | 'mp_direct' | 'mp_modal'>(() => {
    const envDefault = paymentConfig.defaultMethod as 'qr' | 'mp_card' | 'culqi' | 'izipay' | 'mp_modal' | undefined;

    // Priority 1: Env Var (if valid and enabled)
    if (envDefault === 'mp_modal' && paymentConfig.enableMpModal) return 'mp_modal';
    if (envDefault === 'culqi' && paymentConfig.enableCulqi) return 'culqi';
    if (envDefault === 'mp_card' && paymentConfig.enableMpCard) return 'mp_card';
    if (envDefault === 'izipay' && paymentConfig.enableIzipay) return 'izipay';
    if (envDefault === 'qr' && paymentConfig.enableQr) return 'qr';

    // Priority 2: Config Default (fallback logic from config object)
    return paymentConfig.defaultMethod as 'qr' | 'mp_card' | 'culqi' | 'izipay' | 'mp_modal';
  });

  useEffect(() => {
    console.log('Payment Method State:', paymentMethod);
    console.log('Config:', paymentConfig);
  }, [paymentMethod]);

  // Fetch appointment details
  const { data: appointment, isLoading, error } = useQuery<AppointmentWithDetails | null>({
    queryKey: ['appointment-payment', appointmentId],
    queryFn: async (): Promise<AppointmentWithDetails | null> => {
      if (!appointmentId) return null;
      const response = await apiClient.getappointment(appointmentId);
      if (response && 'data' in response && response.data) {
        const apt = response.data;
        // Fetch therapist info separately if needed
        if (apt.therapist_id) {
          try {
            const therapistResponse = await apiClient.gettherapist(apt.therapist_id);
            if (therapistResponse && 'data' in therapistResponse && therapistResponse.data) {
              return {
                ...apt,
                therapist: {
                  name: therapistResponse.data.name,
                  hourly_rate: therapistResponse.data.hourly_rate,
                  photo_url: (therapistResponse.data as { photo_url?: string }).photo_url,
                }
              };
            }
          } catch (err) {
            console.error('Error fetching therapist:', err);
          }
        }
        return apt as AppointmentWithDetails;
      }
      return null;
    },
    enabled: !!appointmentId,
  });

  // Redirect if appointment is not in pending_payment status
  useEffect(() => {
    if (appointment && appointment.status !== 'pending_payment') {
      if (appointment.status === 'payment_review') {
        setIsSuccess(true);
      } else {
        navigate('/terapeutas');
      }
    }
  }, [appointment, navigate]);

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId) throw new Error('No appointment ID');

      await apiClient.updateappointment(appointmentId, { status: 'payment_review' });
    },
    onSuccess: () => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['appointment-payment'] });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('payment:page.errors.confirmError'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmPaymentMutation.mutate();
  };

  const formatTimeToAMPM = (time: string) => {
    const [hours] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  // Confetti celebration effect
  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }, []);

  // Trigger confetti when success
  useEffect(() => {
    if (isSuccess) {
      fireConfetti();
    }
  }, [isSuccess, fireConfetti]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !appointment) {
    return (
      <PublicLayout>
        <div className="container py-20">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">{t('payment:page.notFoundTitle')}</h1>
            <p className="text-muted-foreground mb-6">
              {t('payment:page.notFoundDesc')}
            </p>
            <Button onClick={() => navigate('/terapeutas')}>
              {t('payment:page.backToTherapists')}
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isSuccess) {
    return (
      <PublicLayout>
        <div className="container py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-4">{t('payment:page.successTitle')}</h1>
            <p className="text-muted-foreground mb-6">
              {t('payment:page.successDesc')}
            </p>
            <Card className="mb-6 text-left">
              <CardContent className="pt-6 space-y-2">
                <p><strong>{t('payment:page.therapist')}:</strong> {appointment.therapist?.name}</p>
                <p><strong>{t('payment:page.date')}:</strong> {format(new Date((appointment.appointment_date ?? '') + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: dateLocale })}</p>
                <p><strong>{t('payment:page.time')}:</strong> {formatTimeToAMPM(appointment.start_time ?? '00:00')}</p>
                <p><strong>{t('payment:page.status')}:</strong> <span className="text-amber-600">{t('payment:page.statusReview')}</span></p>
              </CardContent>
            </Card>
            <Button onClick={() => navigate('/mi-cuenta')} size="lg">
              {t('payment:page.goToAppointments')}
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">
              {t('payment:page.title')}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Appointment Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">{appointment.therapist?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date((appointment.appointment_date ?? '') + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: dateLocale })} • {formatTimeToAMPM(appointment.start_time ?? '00:00')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('payment:page.duration')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('payment:page.amountToPay')}</p>
                  {appointment.discount_applied && Number(appointment.discount_applied) > 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground line-through">S/ {Number(appointment.original_price || 0).toFixed(0)}</p>
                      <p className="text-2xl font-bold text-primary">S/ {Number(appointment.final_price || 0).toFixed(0)}</p>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-primary">S/ {Number(appointment.final_price || appointment.therapist?.hourly_rate || 25).toFixed(0)}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Method Tabs - Show if more than one method is enabled */}
            {/* Payment Method Tabs - Show if more than one method is enabled */}
            {paymentConfig.methods.length > 1 && (
              <div className="flex gap-2 p-1 bg-muted rounded-lg flex-wrap">
                {paymentConfig.enableQr && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${paymentMethod === 'qr'
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >

                    <QrCode className="h-4 w-4" />
                    {t('payment:page.methods.yape')}
                  </button>
                )}

                {paymentConfig.enableMpDirect && (
                  <button
                    type="button"
                    onClick={() => window.open('https://link.mercadopago.com.pe/mentelivreorg', '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                  >
                    <CreditCard className="h-4 w-4" />
                    {t('payment:page.methods.mpDirect')}
                  </button>
                )}

                {paymentConfig.enableMpCard && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mp_card')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${paymentMethod === 'mp_card'
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    {t('payment:page.methods.cardMp')}
                  </button>
                )}

                {paymentConfig.enableCulqi && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('culqi')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${paymentMethod === 'culqi'
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    {t('payment:page.methods.cardCulqi')}
                  </button>
                )}

                {paymentConfig.enableMpModal && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mp_modal')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${paymentMethod === 'mp_modal'
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Mercado Pago (Pro)
                  </button>
                )}

                {paymentConfig.enableIzipay && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('izipay')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${paymentMethod === 'izipay'
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Izipay
                  </button>
                )}
              </div>
            )}

            {/* === QR Payment (Yape/Plin) === */}
            {(paymentMethod === 'qr' && paymentConfig.enableQr) && (
              <>
                <div className="text-center space-y-6">
                  <h3 className="text-xl font-bold">Realiza tu pago de S/ {Number(appointment.final_price || appointment.therapist?.hourly_rate || 25).toFixed(0)}</h3>

                  {/* Phone number highlight */}
                  <div className="bg-muted rounded-xl p-6 border">
                    <p className="text-sm text-muted-foreground mb-1">{t('payment:page.transferNumber')}</p>
                    <p className="text-3xl font-bold tracking-wide">923 452 444</p>
                    <p className="text-sm mt-2 text-muted-foreground">{t('payment:page.transferName')}</p>
                  </div>

                  {/* QR Codes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Yape QR */}
                    <div className="rounded-2xl overflow-hidden shadow-md border-2 border-purple-300">
                      <img
                        src="/qr-yape-new.png"
                        alt="QR Yape - Luis Alberto Sanchez Soca"
                        className="w-full h-auto"
                      />
                    </div>

                    {/* Plin QR */}
                    <div className="rounded-2xl overflow-hidden shadow-md border-2 border-cyan-300 bg-white">
                      <img
                        src="/qr-plin-new.png"
                        alt="QR Plin - Luis Alberto Sanchez Soca"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Form */}
                <div>
                  <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full text-lg py-6 font-bold"
                      disabled={confirmPaymentMutation.isPending}
                    >
                      {confirmPaymentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('payment:page.processing')}
                        </>
                      ) : (
                        t('payment:page.reserveBtn')
                      )}
                    </Button>

                    {/* Animated Notice */}
                    <div className="animate-fade-in relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-5 shadow-lg">
                      {/* Animated background effect */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse" />
                      <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />

                      <div className="relative flex items-center gap-4">
                        <div className="flex-shrink-0 bg-white/20 rounded-full p-3 animate-bounce">
                          <MessageCircle className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-white">
                          <p className="font-bold text-lg mb-1">{t('payment:page.whatsappTitle')}</p>
                          <p className="text-white/90 text-sm leading-relaxed">
                            <Trans
                              i18nKey="payment:page.whatsappDesc"
                              components={{
                                1: <span className="font-semibold" />
                              }}
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </>
            )}

            {/* === Card Payment (MercadoPago) === */}
            {(paymentMethod === 'mp_card' && paymentConfig.enableMpCard) && (
              <MercadoPagoPayment
                amount={Number(appointment.final_price || appointment.therapist?.hourly_rate || 25)}
                appointmentId={appointmentId || ''}
                payerEmail={appointment.patient_email}
                onSuccess={(_paymentId, status) => {
                  if (status === 'approved') {
                    setIsSuccess(true);
                    queryClient.invalidateQueries({ queryKey: ['appointment-payment'] });
                  } else {
                    // Pending/in_process — still show success-like state
                    setIsSuccess(true);
                    queryClient.invalidateQueries({ queryKey: ['appointment-payment'] });
                  }
                }}
                onError={(error) => {
                  toast({
                    title: t('payment:page.errors.paymentError'),
                    description: error,
                    variant: 'destructive',
                  });
                }}
              />
            )}

            {/* === Culqi Payment === */}
            {(paymentMethod === 'culqi' && paymentConfig.enableCulqi) && (
              <CulqiPayment
                amount={Number(appointment.final_price || appointment.therapist?.hourly_rate || 25)}
                appointmentId={appointmentId || ''}
                payerEmail={appointment.patient_email}
                onSuccess={(_paymentId, status) => {
                  if (status === 'approved') {
                    setIsSuccess(true);
                    queryClient.invalidateQueries({ queryKey: ['appointment-payment'] });
                  }
                }}
                onError={(error) => {
                  toast({
                    title: t('payment:page.errors.paymentError'),
                    description: error,
                    variant: 'destructive',
                  });
                }}
              />
            )}

            {/* === Izipay Payment === */}
            {(paymentMethod === 'izipay' && paymentConfig.enableIzipay) && (
              <IzipayPayment
                amount={Number(appointment.final_price || appointment.therapist?.hourly_rate || 25)}
                appointmentId={appointmentId || ''}
                payerEmail={appointment.patient_email}
                onSuccess={(_paymentId, status) => {
                  if (status === 'approved') {
                    setIsSuccess(true);
                    queryClient.invalidateQueries({ queryKey: ['appointment-payment'] });
                  }
                }}
                onError={(error) => {
                  toast({
                    title: t('payment:page.errors.paymentError'),
                    description: error,
                    variant: 'destructive',
                  });
                }}
              />
            )}

            {/* === MercadoPago Modal (Pro) === */}
            {(paymentMethod === 'mp_modal' && paymentConfig.enableMpModal) && (
              <MercadoPagoPayment
                amount={Number(appointment.final_price || appointment.therapist?.hourly_rate || 25)}
                appointmentId={appointmentId || ''}
                payerEmail={appointment.patient_email}
                mode="modal"
                onSuccess={(_paymentId, status) => {
                  if (status === 'approved') {
                    setIsSuccess(true);
                    queryClient.invalidateQueries({ queryKey: ['appointment-payment'] });
                  }
                }}
                onError={(error) => {
                  toast({
                    title: t('payment:page.errors.paymentError'),
                    description: error,
                    variant: 'destructive',
                  });
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}