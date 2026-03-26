import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Phone, Mail, Copy, Check } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import type { Appointment as BackendAppointment } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface AppointmentWithTherapist {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  contact_phone: string | null;
  consultation_reason: string | null;
  status: string;
  therapist: {
    name: string;
  } | null;
}

export function AppointmentsCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['calendar-appointments', format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('date_from', format(monthStart, 'yyyy-MM-dd'));
      params.append('date_to', format(monthEnd, 'yyyy-MM-dd'));
      
      // Usar el método get del apiClient
      const data = await apiClient.get<{ data: BackendAppointment[] }>(`/appointments?${params.toString()}`);
      
      if (data && 'data' in data && Array.isArray(data.data)) {
        return data.data.map(apt => ({
          id: apt.id || '',
          appointment_date: apt.appointment_date || '',
          start_time: apt.start_time || '',
          end_time: apt.end_time || '',
          patient_name: apt.patient_name || '',
          patient_email: apt.patient_email || '',
          patient_phone: apt.patient_phone || null,
          contact_phone: apt.patient_phone || null,
          consultation_reason: apt.consultation_reason || null,
          status: apt.status || 'pending',
          therapist: apt.therapist_name ? { name: apt.therapist_name } : null,
        } as AppointmentWithTherapist));
      }
      return [];
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({
        title: 'Copiado',
        description: 'Número copiado al portapapeles',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar',
        variant: 'destructive',
      });
    }
  };

  const calendarStart = startOfWeek(monthStart, { locale: es });
  const calendarEnd = endOfWeek(monthEnd, { locale: es });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    return appointments?.filter(apt => 
      apt.appointment_date === format(date, 'yyyy-MM-dd')
    ) || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'pending_payment': return 'bg-amber-500 text-white';
      case 'payment_review': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-primary text-primary-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const selectedDayAppointments = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Calendario de Citas
        </CardTitle>
        <CardDescription>
          Vista mensual de todas las citas programadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[80px] p-1 border rounded-lg transition-colors text-left relative",
                  isCurrentMonth ? "bg-card" : "bg-muted/30",
                  isSelected && "ring-2 ring-primary",
                  isToday && "border-primary",
                  "hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    !isCurrentMonth && "text-muted-foreground",
                    isToday && "text-primary font-bold"
                  )}
                >
                  {format(day, 'd')}
                </span>
                
                {dayAppointments.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "text-[10px] px-1 py-0.5 rounded truncate",
                          getStatusColor(apt.status)
                        )}
                        title={`${apt.start_time.slice(0, 5)} - ${apt.patient_name}`}
                      >
                        {apt.start_time.slice(0, 5)}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayAppointments.length - 2} más
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day details */}
        {selectedDate && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold mb-3 capitalize">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </h4>
            
            {selectedDayAppointments.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {selectedDayAppointments.map((apt) => {
                    const phoneNumber = apt.contact_phone || apt.patient_phone;
                    
                    return (
                      <div
                        key={apt.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium truncate">{apt.patient_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {apt.therapist?.name || 'Sin psicólogo'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}
                            </p>
                            
                            {/* Consultation reason */}
                            {apt.consultation_reason && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium">Motivo:</span> {apt.consultation_reason}
                              </p>
                            )}
                            
                            {/* Contact info - always visible for admin */}
                            <div className="pt-2 mt-2 border-t space-y-1">
                              {phoneNumber && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-foreground">{phoneNumber}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(phoneNumber, apt.id);
                                    }}
                                  >
                                    {copiedId === apt.id ? (
                                      <Check className="h-3 w-3 text-success" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              )}
                              {apt.patient_email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{apt.patient_email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge className={cn("shrink-0", getStatusColor(apt.status))}>
                            {STATUS_LABELS[apt.status as keyof typeof STATUS_LABELS] || apt.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay citas programadas para este día
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Leyenda:</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-success" />
              <span className="text-xs">Confirmada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-warning" />
              <span className="text-xs">Pendiente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-xs">En revisión</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-destructive" />
              <span className="text-xs">Cancelada</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
