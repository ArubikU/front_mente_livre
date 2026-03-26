import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, ChevronLeft, ChevronRight, Copy, CopyPlus, User, ShieldCheck, CalendarClock } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import type { WeeklySchedule } from '@/api/types';
import type { DayOfWeek } from '@/types/database';
import { DAY_LABELS } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addWeeks, subWeeks, addDays, isSameWeek, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  therapistId: string;
  therapistName: string;
  userRole?: 'admin' | 'therapist';
}

interface WeeklyScheduleOverride {
  id: string;
  therapist_id: string;
  week_start_date: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  updated_by_role?: string;
}

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00
type NormalizedSchedule = Omit<WeeklySchedule, 'day_of_week'> & { day_of_week: DayOfWeek };
type NormalizedOverride = WeeklyScheduleOverride & { day_of_week: DayOfWeek };

// Helper functions to convert between day_of_week formats
// Backend uses numbers (1-7), frontend uses strings ('monday', etc.)
const dayNumberToString = (day: number | string): DayOfWeek => {
  if (typeof day === 'string') return day as DayOfWeek;
  // 1 = Monday, 7 = Sunday
  return DAYS[day - 1] || 'monday';
};

const dayStringToNumber = (day: DayOfWeek): number => {
  return DAYS.indexOf(day) + 1;
};

export function TherapistAvailabilityManager({ therapistId, therapistName, userRole = 'admin' }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingSlots, setPendingSlots] = useState<Set<string>>(new Set());
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [weeksToCopy, setWeeksToCopy] = useState(4);
  
  // Start from current week's Monday
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const isCurrentWeek = isSameWeek(selectedWeekStart, new Date(), { weekStartsOn: 1 });
  const weekStartString = format(selectedWeekStart, 'yyyy-MM-dd');

  // Fetch base weekly schedules (template) - admins can see all, not just active
  const { data: baseSchedules, isLoading: isLoadingBase } = useQuery<NormalizedSchedule[]>({
    queryKey: ['therapist-schedules-admin', therapistId],
    queryFn: async () => {
      if (!therapistId) return [];
      const response = await apiClient.gettherapistschedules(therapistId);
      if (response && 'data' in response && Array.isArray(response.data)) {
        // Normalize day_of_week from number to string
        return (response.data as WeeklySchedule[])
          .filter(s => s.is_active !== false)
          .map(schedule => ({
            ...schedule,
            day_of_week: dayNumberToString(schedule.day_of_week ?? 1),
          }));
      }
      return [];
    },
  });

  // Fetch week-specific overrides - include all for this week, not just active
  const { data: weekOverrides, isLoading: isLoadingOverrides } = useQuery<NormalizedOverride[]>({
    queryKey: ['therapist-week-overrides', therapistId, weekStartString],
    queryFn: async () => {
      if (!therapistId) return [];
      
      try {
        // Usar el método get del apiClient
        const data = await apiClient.get<{ data: WeeklyScheduleOverride[] }>(
          `/therapists/${therapistId}/schedule-overrides?week_start_date=${weekStartString}`
        );
        if (data && 'data' in data && Array.isArray(data.data)) {
          return data.data
            .filter(o => o.is_active !== false)
            .map(override => ({
              ...override,
              day_of_week: dayNumberToString(override.day_of_week),
            }));
        }
      } catch (error) {
        console.error('Error fetching week overrides:', error);
      }
      return [];
    },
  });

  // Check if this week has any overrides (custom configuration)
  const hasWeekOverrides = weekOverrides && weekOverrides.length > 0;

  // Get last edit info for the current week
  const lastEditInfo = useMemo(() => {
    if (!hasWeekOverrides || !weekOverrides || weekOverrides.length === 0) {
      // Check base schedules for last edit
      if (baseSchedules && baseSchedules.length > 0) {
        const sorted = [...baseSchedules].sort((a, b) => 
          new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        );
        const latest = sorted[0];
        return {
          updatedAt: latest.updated_at || latest.created_at,
          updatedByRole: latest.updated_by_role || null,
          isBaseSchedule: true,
        };
      }
      return null;
    }
    
    // Find the most recent override
    const sorted = [...weekOverrides].sort((a, b) => 
      new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime()
    );
    const latest = sorted[0];
    return {
      updatedAt: latest.updated_at || latest.created_at,
      updatedByRole: latest.updated_by_role || null,
      isBaseSchedule: false,
    };
  }, [baseSchedules, weekOverrides, hasWeekOverrides]);

  // Create a map of active slots for the selected week
  const activeSlots = useMemo(() => {
    const slots = new Map<string, { id: string; isOverride: boolean }>();
    
    if (hasWeekOverrides) {
      // Use week-specific overrides
      weekOverrides?.forEach(schedule => {
        if (schedule.is_active) {
          const startHour = parseInt((schedule.start_time ?? '00:00').split(':')[0]);
          const endHour = parseInt((schedule.end_time ?? '23:59').split(':')[0]);
          for (let h = startHour; h < endHour; h++) {
            slots.set(`${schedule.day_of_week}-${h}`, { id: schedule.id ?? '', isOverride: true });
          }
        }
      });
    } else {
      // Use base schedules as template
      baseSchedules?.forEach(schedule => {
        if (schedule.is_active) {
          const startHour = parseInt((schedule.start_time ?? '00:00').split(':')[0]);
          const endHour = parseInt((schedule.end_time ?? '23:59').split(':')[0]);
          for (let h = startHour; h < endHour; h++) {
            slots.set(`${schedule.day_of_week}-${h}`, { id: schedule.id ?? '', isOverride: false });
          }
        }
      });
    }
    
    return slots;
  }, [baseSchedules, weekOverrides, hasWeekOverrides]);

  // Copy base schedule to this week
  const copyBaseToWeekMutation = useMutation({
    mutationFn: async () => {
      if (!baseSchedules) return;
      
      // Delete existing overrides for this week using apiClient
      await apiClient.delete(`/therapists/${therapistId}/schedule-overrides/week?week_start_date=${weekStartString}`);

      // Copy base schedules to this week
      const inserts = baseSchedules
        .filter(s => s.is_active)
        .map(schedule => ({
          week_start_date: weekStartString,
          day_of_week: typeof schedule.day_of_week === 'string' ? schedule.day_of_week : 
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][(schedule.day_of_week ?? 1) - 1] || 'monday',
          start_time: schedule.start_time ?? '00:00',
          end_time: schedule.end_time ?? '23:59',
          is_active: true,
          updated_by_role: userRole,
        }));

      if (inserts.length > 0) {
        await apiClient.post(`/therapists/${therapistId}/schedule-overrides/batch`, { overrides: inserts });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-week-overrides', therapistId, weekStartString] });
      queryClient.invalidateQueries({ queryKey: ['therapist-week-overrides-booking', therapistId] });
      toast({
        title: 'Horario copiado',
        description: 'El horario base se ha copiado a esta semana.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el horario.',
        variant: 'destructive',
      });
    },
  });

  // Copy current week to following weeks
  const copyToNextWeeksMutation = useMutation({
    mutationFn: async (numWeeks: number) => {
      // Get current week's schedule (either overrides or base) - backend expects day_of_week as number
      let scheduleSource: { day_of_week: number; start_time: string; end_time: string }[] = [];
      
      if (hasWeekOverrides && weekOverrides) {
        scheduleSource = weekOverrides.filter(s => s.is_active).map(s => ({
          day_of_week: dayStringToNumber(s.day_of_week),
          start_time: s.start_time ?? '00:00',
          end_time: s.end_time ?? '23:59',
        }));
      } else if (baseSchedules) {
        scheduleSource = baseSchedules.filter(s => s.is_active).map(s => ({
          day_of_week: dayStringToNumber(s.day_of_week as DayOfWeek),
          start_time: s.start_time ?? '00:00',
          end_time: s.end_time ?? '23:59',
        }));
      }

      if (scheduleSource.length === 0) {
        throw new Error('No hay horarios para copiar');
      }

      // Copy to each of the next weeks
      for (let i = 1; i <= numWeeks; i++) {
        const targetWeekStart = addWeeks(selectedWeekStart, i);
        const targetWeekString = format(targetWeekStart, 'yyyy-MM-dd');
        
        // Delete existing overrides for target week using apiClient
        await apiClient.delete(`/therapists/${therapistId}/schedule-overrides/week?week_start_date=${targetWeekString}`);

        // Insert new overrides
        const inserts = scheduleSource.map(schedule => ({
          week_start_date: targetWeekString,
          day_of_week: typeof schedule.day_of_week === 'number' ? schedule.day_of_week : dayStringToNumber(schedule.day_of_week as DayOfWeek),
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: true,
          updated_by_role: userRole,
        }));

        await apiClient.post(`/therapists/${therapistId}/schedule-overrides/batch`, { overrides: inserts });
      }
    },
    onSuccess: (_, numWeeks) => {
      queryClient.invalidateQueries({ queryKey: ['therapist-week-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-week-overrides-booking'] });
      setCopyDialogOpen(false);
      toast({
        title: 'Horarios copiados',
        description: `Se copiaron los horarios a las próximas ${numWeeks} semanas.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron copiar los horarios.',
        variant: 'destructive',
      });
    },
  });

  const toggleSlotMutation = useMutation({
    mutationFn: async ({ day, hour }: { day: DayOfWeek; hour: number }) => {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;

      // If we don't have overrides for this week yet, we need to create them first
      if (!hasWeekOverrides) {
        // Copy all base schedules to this week first
        const baseInserts = baseSchedules
          ?.filter(s => s.is_active)
          .map(schedule => ({
            therapist_id: therapistId,
            week_start_date: weekStartString,
            day_of_week: dayStringToNumber(schedule.day_of_week as DayOfWeek), // Convert to number for backend
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: true,
            updated_by_role: userRole,
          })) || [];

        if (baseInserts.length > 0) {
          await apiClient.post(`/therapists/${therapistId}/schedule-overrides/batch`, { overrides: baseInserts });
        }
      }

      // Now work with week overrides using apiClient
      const overridesData = await apiClient.get<{ data: WeeklyScheduleOverride[] }>(
        `/therapists/${therapistId}/schedule-overrides?week_start_date=${weekStartString}`
      );
      
      // Normalize day_of_week and filter by day
      const currentOverrides: NormalizedOverride[] = (overridesData?.data || [])
        .map((o) => ({
          ...o,
          day_of_week: dayNumberToString(o.day_of_week),
        }))
        .filter((o) => o.day_of_week === day);

      const existingOverride = currentOverrides?.find(
        s => s.start_time === startTime && s.end_time === endTime
      );

      if (existingOverride) {
        // Delete this specific slot
        await apiClient.delete(`/schedule-overrides/${existingOverride.id}`);
      } else {
        // Check if this hour is part of a larger block
        const containingBlock = currentOverrides?.find(s => {
          const blockStart = parseInt(s.start_time.split(':')[0]);
          const blockEnd = parseInt(s.end_time.split(':')[0]);
          return hour >= blockStart && hour < blockEnd;
        });

        if (containingBlock) {
          // Split the block
          const blockStart = parseInt(containingBlock.start_time.split(':')[0]);
          const blockEnd = parseInt(containingBlock.end_time.split(':')[0]);

          // Delete the original block
          await apiClient.delete(`/schedule-overrides/${containingBlock.id}`);

          // Create new blocks for remaining parts (excluding the clicked hour)
          const newBlocks = [];
          if (hour > blockStart) {
          newBlocks.push({
            week_start_date: weekStartString,
            day_of_week: dayStringToNumber(day), // Convert to number for backend
            start_time: `${blockStart.toString().padStart(2, '0')}:00:00`,
            end_time: `${hour.toString().padStart(2, '0')}:00:00`,
            is_active: true,
            updated_by_role: userRole,
          });
          }
          if (hour + 1 < blockEnd) {
          newBlocks.push({
            week_start_date: weekStartString,
            day_of_week: dayStringToNumber(day), // Convert to number for backend
            start_time: `${(hour + 1).toString().padStart(2, '0')}:00:00`,
            end_time: `${blockEnd.toString().padStart(2, '0')}:00:00`,
            is_active: true,
            updated_by_role: userRole,
          });
          }

          if (newBlocks.length > 0) {
            await apiClient.post(`/therapists/${therapistId}/schedule-overrides/batch`, { overrides: newBlocks });
          }
          // Note: We're removing the hour from the block, so don't create a new slot
        } else {
          // No existing slot or block - CREATE a new slot
          const requestBody = {
            week_start_date: weekStartString,
            day_of_week: dayStringToNumber(day), // Convert to number for backend
            start_time: startTime,
            end_time: endTime,
            is_active: true,
            updated_by_role: userRole,
          };
          
          await apiClient.post(`/therapists/${therapistId}/schedule-overrides`, requestBody);
        }
      }
    },
    onMutate: ({ day, hour }) => {
      setPendingSlots(prev => new Set(prev).add(`${day}-${hour}`));
    },
    onSettled: (_, __, { day, hour }) => {
      setPendingSlots(prev => {
        const next = new Set(prev);
        next.delete(`${day}-${hour}`);
        return next;
      });
      // Invalidate all related queries for sync
      queryClient.invalidateQueries({ queryKey: ['therapist-week-overrides', therapistId, weekStartString] });
      queryClient.invalidateQueries({ queryKey: ['therapist-week-overrides-booking', therapistId] });
    },
    onError: (error) => {
      console.error('Error toggling slot:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el horario.',
        variant: 'destructive',
      });
    },
  });

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}${ampm}`;
  };

  const goToPreviousWeek = () => setSelectedWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setSelectedWeekStart(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // La semana termina el domingo (6 días después del lunes)
  const weekEndDate = addDays(selectedWeekStart, 6);
  const weekLabel = `${format(selectedWeekStart, "d 'de' MMMM", { locale: es })} - ${format(weekEndDate, "d 'de' MMMM, yyyy", { locale: es })}`;

  const isLoading = isLoadingBase || isLoadingOverrides;

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
          <Clock className="h-5 w-5" />
          Disponibilidad de {therapistName}
        </CardTitle>
        <CardDescription>
          Configura la disponibilidad para cada semana específica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last edit indicator */}
        {lastEditInfo && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
            <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Última edición:</span>
              <Badge 
                variant={lastEditInfo.updatedByRole === 'admin' ? 'default' : 'secondary'}
                className="gap-1"
              >
                {lastEditInfo.updatedByRole === 'admin' ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                {lastEditInfo.updatedByRole === 'admin' ? 'Administrador' : 'Psicólogo'}
              </Badge>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(lastEditInfo.updatedAt ?? 0), { addSuffix: true, locale: es })}
              </span>
              {lastEditInfo.isBaseSchedule && (
                <Badge variant="outline" className="text-xs">
                  Horario base
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Week selector */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {weekLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {!isCurrentWeek && (
              <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
                Ir a semana actual
              </Button>
            )}
            {!hasWeekOverrides && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => copyBaseToWeekMutation.mutate()}
                disabled={copyBaseToWeekMutation.isPending}
              >
                <Copy className="h-4 w-4 mr-1" />
                Personalizar semana
              </Button>
            )}
            
            {/* Copy to following weeks dialog */}
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                >
                  <CopyPlus className="h-4 w-4 mr-1" />
                  Copiar a semanas siguientes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Copiar horario a semanas siguientes</DialogTitle>
                  <DialogDescription>
                    Copia el horario de esta semana a las próximas semanas. Esto sobrescribirá cualquier horario existente en esas semanas.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="weeksToCopy">Número de semanas a copiar</Label>
                  <Input
                    id="weeksToCopy"
                    type="number"
                    min={1}
                    max={12}
                    value={weeksToCopy}
                    onChange={(e) => setWeeksToCopy(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Se copiará desde la semana del {format(addWeeks(selectedWeekStart, 1), "d 'de' MMMM", { locale: es })} hasta la semana del {format(addWeeks(selectedWeekStart, weeksToCopy), "d 'de' MMMM", { locale: es })}.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => copyToNextWeeksMutation.mutate(weeksToCopy)}
                    disabled={copyToNextWeeksMutation.isPending}
                  >
                    {copyToNextWeeksMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Copiando...
                      </>
                    ) : (
                      <>
                        <CopyPlus className="h-4 w-4 mr-1" />
                        Copiar horarios
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status indicator */}
        {hasWeekOverrides ? (
          <div className="text-sm text-muted-foreground bg-primary/10 p-2 rounded">
            ✓ Esta semana tiene horario personalizado
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            Usando horario base. Haz clic en "Personalizar semana" o en una casilla para crear un horario específico.
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header with days */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="p-2 text-xs font-medium text-muted-foreground text-center">
                Hora
              </div>
              {DAYS.map((day) => (
                <div 
                  key={day} 
                  className="p-2 text-xs font-medium text-center bg-muted rounded"
                >
                  {DAY_LABELS[day].slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="space-y-1">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 gap-1">
                  <div className="p-2 text-xs text-muted-foreground text-center flex items-center justify-center">
                    {formatHour(hour)}
                  </div>
                  {DAYS.map((day) => {
                    const slotKey = `${day}-${hour}`;
                    const isActive = activeSlots.has(slotKey);
                    const isPending = pendingSlots.has(slotKey);

                    return (
                      <button
                        key={slotKey}
                        onClick={() => toggleSlotMutation.mutate({ day, hour })}
                        disabled={isPending}
                        className={cn(
                          "h-10 rounded border-2 transition-all duration-150",
                          "hover:scale-105 hover:shadow-md",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          isActive 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "bg-muted/30 border-transparent hover:border-primary/30 hover:bg-muted",
                          isPending && "opacity-50 cursor-wait"
                        )}
                      >
                        {isPending && (
                          <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary border-2 border-primary" />
                <span className="text-sm text-muted-foreground">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-muted/30 border-2 border-transparent" />
                <span className="text-sm text-muted-foreground">No disponible</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
