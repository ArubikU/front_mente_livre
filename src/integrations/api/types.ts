// Re-export types from API
export * from '@/api/types';

// Additional type exports
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Extended types for API responses (backend may return more than generated schema)
import type { Appointment, TherapistUpdate } from '@/api/types';

/** Day of week as number (0-6). Re-export alias for WeeklySchedule.day_of_week */
export type DayOfWeek = number;

/** TherapistUpdate plus fields used by admin/team flows */
export type TherapistUpdateExtended = TherapistUpdate & {
  is_visible_in_about?: boolean;
  role_title?: string;
  friendly_photo_url?: string | null;
};

/** Appointment with nested therapist and pricing (e.g. from dashboard/payment) */
export interface AppointmentWithDetails extends Appointment {
  therapist?: { name?: string; hourly_rate?: number; photo_url?: string };
  final_price?: number;
  discount_applied?: number;
  original_price?: number;
}
