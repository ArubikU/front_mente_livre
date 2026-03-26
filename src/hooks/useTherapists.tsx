import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import type { Therapist, WeeklySchedule } from '@/api/types';

// type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'; // Defined in database.ts

export function useTherapists() {
  return useQuery({
    queryKey: ['therapists'],
    queryFn: async () => {
      const response = await apiClient.gettherapists();
      if (response && 'data' in response) {
        return response.data as Therapist[];
      }
      return [];
    },
  });
}

export function useTherapist(id: string) {
  return useQuery({
    queryKey: ['therapist', id],
    queryFn: async () => {
      const response = await apiClient.gettherapist(id);
      if (response && 'data' in response) {
        return response.data as Therapist;
      }
      return null;
    },
    enabled: !!id,
  });
}

export function useTherapistSchedules(therapistId: string) {
  return useQuery({
    queryKey: ['therapist-schedules', therapistId],
    queryFn: async () => {
      const response = await apiClient.gettherapistschedules(therapistId);
      if (response && 'data' in response) {
        return response.data as WeeklySchedule[];
      }
      return [];
    },
    enabled: !!therapistId,
  });
}

export type AvailabilityStatus = {
  label: string;
  type: 'today' | 'tomorrow' | 'this-week' | 'next-week' | 'none';
};

// Mapeo de índice de día (1-7) a nombre de día (reservado para uso futuro)
// const dayIndexToDayName: Record<number, DayOfWeek> = {
//   1: 'monday',
//   2: 'tuesday',
//   3: 'wednesday',
//   4: 'thursday',
//   5: 'friday',
//   6: 'saturday',
//   7: 'sunday'
// };

export function getAvailabilityStatus(schedules: WeeklySchedule[]): AvailabilityStatus {
  if (!schedules || schedules.length === 0) {
    return { label: 'Sin disponibilidad próxima', type: 'none' };
  }
  
  // Filtrar solo schedules activos
  const activeSchedules = schedules.filter(s => s.is_active !== false);
  if (activeSchedules.length === 0) {
    return { label: 'Sin disponibilidad próxima', type: 'none' };
  }
  
  const today = new Date();
  const currentDayIndex = ((today.getDay() + 6) % 7) + 1; // Convert to 1=Monday, 7=Sunday

  // Convertir day_of_week a número si viene como string
  const scheduleDays = activeSchedules.map(s => {
    const day: number | string | undefined = s.day_of_week;
    if (typeof day === 'string') {
      const dayMap: Record<string, number> = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
        'friday': 5, 'saturday': 6, 'sunday': 7
      };
      return dayMap[(day as string).toLowerCase()] ?? Number(day);
    }
    return Number(day);
  }).filter(d => d >= 1 && d <= 7);
  
  if (scheduleDays.length === 0) {
    return { label: 'Sin disponibilidad próxima', type: 'none' };
  }
  
  // Buscar el próximo día disponible
  for (let i = 0; i < 14; i++) {
    const checkDayIndex = ((currentDayIndex - 1 + i) % 7) + 1; // Keep in 1-7 range
    
    if (scheduleDays.includes(checkDayIndex)) {
      if (i === 0) {
        return { label: 'Disponible hoy', type: 'today' };
      } else if (i === 1) {
        return { label: 'Disponible mañana', type: 'tomorrow' };
      } else if (i <= 6) {
        return { label: 'Disponible esta semana', type: 'this-week' };
      } else {
        return { label: 'Disponible la siguiente semana', type: 'next-week' };
      }
    }
  }
  
  return { label: 'Sin disponibilidad próxima', type: 'none' };
}

export function getNextAvailableDay(schedules: WeeklySchedule[]): string | null {
  if (!schedules || schedules.length === 0) return null;
  
  const today = new Date();
  const currentDayIndex = ((today.getDay() + 6) % 7) + 1; // Convert to 1=Monday, 7=Sunday

  const scheduleDays = schedules.map(s => s.day_of_week);
  
  for (let i = 0; i < 7; i++) {
    const checkDayIndex = ((currentDayIndex - 1 + i) % 7) + 1; // Keep in 1-7 range
    
    if (scheduleDays.includes(checkDayIndex)) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      return nextDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
    }
  }
  
  return null;
}
