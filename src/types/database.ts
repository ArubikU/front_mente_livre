// Re-export types from API - Direct exports work better with TypeScript
export type {
  Therapist,
  WeeklySchedule,
  Appointment,
  User,
  PromoCode,
  SiteContent,
  TeamProfile,
} from '@/api/types';

// Additional types that might be needed
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'pending_payment' | 'payment_review';

export type UserRole = 'admin' | 'therapist' | 'user';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  payment_review: 'Pago en revisión',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
