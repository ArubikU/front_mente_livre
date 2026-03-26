import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, CreditCard, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
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

interface Appointment {
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

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel: (id: string) => void;
  isCancelling?: boolean;
}

const statusConfig: Record<string, {
  labelEs: string;
  labelEn: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = {
  pending_payment: {
    labelEs: 'Pendiente de pago',
    labelEn: 'Pending payment',
    variant: 'destructive'
  },
  payment_review: {
    labelEs: 'Pago en revisión',
    labelEn: 'Payment review',
    variant: 'secondary'
  },
  confirmed: {
    labelEs: 'Confirmada',
    labelEn: 'Confirmed',
    variant: 'default'
  },
  completed: {
    labelEs: 'Completada',
    labelEn: 'Completed',
    variant: 'outline'
  },
  cancelled: {
    labelEs: 'Cancelada',
    labelEn: 'Cancelled',
    variant: 'outline'
  },
  pending: {
    labelEs: 'Pendiente',
    labelEn: 'Pending',
    variant: 'secondary'
  }
};

export function AppointmentCard({ appointment, onCancel, isCancelling }: AppointmentCardProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const dateLocale = isSpanish ? es : enUS;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const canCancel = ['pending_payment', 'payment_review', 'confirmed', 'pending'].includes(appointment.status);
  const config = statusConfig[appointment.status] || { labelEs: appointment.status, labelEn: appointment.status, variant: 'outline' as const };
  const statusLabel = isSpanish ? config.labelEs : config.labelEn;

  const formattedDate = format(
    parseISO(appointment.appointment_date), 
    isSpanish ? "d 'de' MMMM" : "MMMM d", 
    { locale: dateLocale }
  );

  return (
    <div className="border rounded-xl p-3 sm:p-4 hover:bg-muted/50 transition-colors space-y-3">
      {/* Top row: Avatar + Name + Status */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
              {appointment.therapist?.name || (isSpanish ? 'Psicólogo' : 'Psychologist')}
            </h3>
            <Badge variant={config.variant} className="flex-shrink-0 text-xs">
              {statusLabel}
            </Badge>
          </div>
          
          {/* Date and time - compact on mobile */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(appointment.start_time)}
            </span>
          </div>
        </div>
      </div>

      {/* Consultation reason - only if exists */}
      {appointment.consultation_reason && (
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 pl-0 sm:pl-[52px]">
          {isSpanish ? 'Motivo' : 'Reason'}: {appointment.consultation_reason}
        </p>
      )}

      {/* Contact phone for payment_review */}
      {appointment.status === 'payment_review' && (appointment.contact_phone || appointment.patient_phone) && (
        <p className="text-xs sm:text-sm text-primary font-medium pl-0 sm:pl-[52px]">
          📞 {isSpanish ? 'Contacto' : 'Contact'}: {appointment.contact_phone || appointment.patient_phone}
        </p>
      )}

      {/* Action buttons - full width on mobile, stacked */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:pl-[52px]">
        {(appointment.status === 'pending_payment' || appointment.status === 'payment_review') && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => navigate(`/pago/${appointment.id}`)}
            className="w-full sm:w-auto h-10 sm:h-9 text-sm"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {appointment.status === 'pending_payment' 
              ? (isSpanish ? 'Pagar' : 'Pay') 
              : (isSpanish ? 'Ver pago' : 'View payment')
            }
          </Button>
        )}
        
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-full sm:w-auto h-10 sm:h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isCancelling}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {isSpanish ? 'Cancelar cita' : 'Cancel'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="mx-4 sm:mx-0 max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isSpanish ? '¿Cancelar esta cita?' : 'Cancel this appointment?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isSpanish 
                    ? `Esta acción no se puede deshacer. La cita con ${appointment.therapist?.name} para el ${formattedDate} será cancelada.`
                    : `This action cannot be undone. The appointment with ${appointment.therapist?.name} for ${formattedDate} will be cancelled.`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">
                  {isSpanish ? 'No, mantener' : 'No, keep it'}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onCancel(appointment.id)}
                  className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isSpanish ? 'Sí, cancelar cita' : 'Yes, cancel'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
