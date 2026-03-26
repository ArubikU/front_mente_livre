import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE_URL } from '@/api/types';
import type { Therapist } from '@/api/types';

interface Props {
  value: string | null;
  onChange: (therapistId: string) => void;
}

export function TherapistSelector({ value, onChange }: Props) {
  const { data: therapists, isLoading } = useQuery({
    queryKey: ['all-therapists-admin'],
    queryFn: async () => {
      const response = await apiClient.gettherapists();
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as Therapist[]).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      return [];
    },
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  const selectedTherapist = therapists?.find(t => t.id === value);

  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecciona un psicólogo">
          {selectedTherapist && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={(() => {
                  const rawUrl = (selectedTherapist as { photo_url?: string }).photo_url;
                  if (!rawUrl) return undefined;
                  return rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                })()} />
                <AvatarFallback className="text-xs">
                  {selectedTherapist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span>{selectedTherapist.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {therapists?.map((therapist) => (
          <SelectItem key={therapist.id} value={therapist.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={(() => {
                  const rawUrl = (therapist as { photo_url?: string }).photo_url;
                  if (!rawUrl) return undefined;
                  return rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                })()} />
                <AvatarFallback className="text-xs">
                  {therapist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span>{therapist.name}</span>
              {!therapist.is_active && (
                <span className="text-xs text-muted-foreground">(Inactivo)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
