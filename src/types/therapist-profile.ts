import type { Therapist } from '@/api/types';

// Types for therapist profile visibility control
export interface FieldVisibility {
  is_visible: boolean;
  locked_by_admin: boolean;
}

export interface TherapistFieldVisibility {
  photo_url: FieldVisibility;
  name: FieldVisibility;
  university: FieldVisibility;
  therapeutic_approach: FieldVisibility;
}

export interface ExtendedTherapist extends Omit<Therapist,
  'age' | 'pricing' | 'years_experience' | 'specialty' | 'therapeutic_approach' | 'short_description' | 'modality' | 'photos' | 'field_visibility'
> {
  // Campos adicionales que puedan necesitarse (algunos permiten null desde backend)
  age?: number | null;
  years_experience?: number | null;
  specialty?: string | null;
  therapeutic_approach?: string | null;
  short_description?: string | null;
  modality?: string | null;
  availability_schedule?: string | null;
  academic_credentials?: string | null;
  pricing?: Array<{ tier: string; price: number }> | Record<string, unknown>;
  photos?: Array<{
    photo_type?: 'profile' | 'friendly' | string;
    photo_url: string;
    photo_position?: string;
    is_active?: boolean;
    created_at?: string;
  }>;
  experience_topics?: string[];
  population_served?: string[];
  field_visibility?: TherapistFieldVisibility;
  photo_url?: string | null;
  photo_position?: string | null;
}

// Default visibility settings
export const DEFAULT_FIELD_VISIBILITY: TherapistFieldVisibility = {
  photo_url: { is_visible: true, locked_by_admin: false },
  name: { is_visible: true, locked_by_admin: true },
  university: { is_visible: true, locked_by_admin: false },
  therapeutic_approach: { is_visible: true, locked_by_admin: false },
};

// Field labels in Spanish
export const FIELD_LABELS: Record<keyof TherapistFieldVisibility, string> = {
  photo_url: 'Foto de perfil',
  name: 'Nombre completo',
  university: 'Universidad',
  therapeutic_approach: 'Enfoque terapéutico',
};

// Field categories for grouping in forms
export const FIELD_CATEGORIES = {
  basic: ['photo_url', 'name', 'university'] as const,
  professional: ['therapeutic_approach'] as const,
};

export type FieldCategory = keyof typeof FIELD_CATEGORIES;

export const CATEGORY_LABELS: Record<FieldCategory, string> = {
  basic: 'Datos Básicos',
  professional: 'Información Profesional',
};
