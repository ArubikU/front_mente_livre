import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ExtendedTherapist, TherapistFieldVisibility } from '@/types/therapist-profile';
import { API_BASE_URL } from '@/api/types';
import { Calendar, GraduationCap, Clock, Users, Briefcase } from 'lucide-react';

interface TherapistProfilePreviewProps {
  therapist: ExtendedTherapist;
  formValues: {
    name?: string;
    specialty?: string;
    therapeutic_approach?: string;
    years_experience?: number | null;
    short_description?: string;
    modality?: string;
    population_served?: string;
    availability_schedule?: string;
    academic_credentials?: string;
    university?: string;
    hourly_rate?: number;
  };
  visibility: TherapistFieldVisibility;
}

export function TherapistProfilePreview({
  therapist,
  formValues,
  visibility
}: TherapistProfilePreviewProps) {
  const initials = formValues.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'PS';

  // Infer gender from first name
  const firstName = formValues.name?.split(' ')[0] || '';
  const isFemale = firstName.endsWith('a') || firstName.endsWith('í');
  const role = isFemale ? 'Psicóloga' : 'Psicólogo';

  const populationArray = formValues.population_served
    ?.split(',')
    .map(s => s.trim())
    .filter(Boolean) || [];

  return (
    <Card className="overflow-hidden bg-card border border-border/50">
      <div className="p-6 flex flex-col items-center text-center">
        {/* Avatar */}
        {visibility?.photo_url?.is_visible !== false && (
          <div className="relative mb-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/10">
              {(() => {
                const rawUrl = therapist.photo_url;
                if (!rawUrl) return undefined;
                const srcValue = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                return (
                  <AvatarImage
                    src={srcValue}
                    alt={formValues.name}
                    className="object-cover"
                    style={{ objectPosition: therapist.photo_position || '50% 20%' }}
                  />
                );
              })()}
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Name */}
        {visibility.name.is_visible && (
          <h3 className="text-lg font-bold text-foreground mb-1">
            {formValues.name || 'Sin nombre'}
          </h3>
        )}

        {/* Role */}
        <p className="text-sm text-muted-foreground mb-2">{role}</p>

        {/* Specialty */}
        {formValues.specialty && (
          <Badge variant="secondary" className="mb-3">
            {formValues.specialty}
          </Badge>
        )}

        {/* Short Description */}
        {formValues.short_description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {formValues.short_description}
          </p>
        )}

        {/* Info Grid */}
        <div className="w-full space-y-2 text-left">
          {visibility.therapeutic_approach.is_visible && formValues.therapeutic_approach && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{formValues.therapeutic_approach}</span>
            </div>
          )}

          {formValues.years_experience != null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                {formValues.years_experience} {formValues.years_experience === 1 ? 'año' : 'años'} de experiencia
              </span>
            </div>
          )}

          {visibility.university.is_visible && formValues.university && (
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{formValues.university}</span>
            </div>
          )}

          {populationArray.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{populationArray.join(', ')}</span>
            </div>
          )}

          {formValues.availability_schedule && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{formValues.availability_schedule}</span>
            </div>
          )}
        </div>

        {/* Price */}
        {true && (
          <p className="text-sm text-muted-foreground mt-4">
            <span className="text-lg font-semibold text-foreground">
              S/ {formValues.hourly_rate != null ? Number(formValues.hourly_rate).toFixed(0) : '0'}
            </span>
            <span className="text-xs"> / sesión</span>
          </p>
        )}

        {/* CTA Button */}
        <Button className="w-full font-medium mt-4" size="default">
          Agendar cita
        </Button>
      </div>
    </Card>
  );
}
