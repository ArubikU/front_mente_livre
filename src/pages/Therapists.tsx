import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, Clock, Filter } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { apiClient } from '@/integrations/api/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { TherapistCard } from '@/components/therapists/TherapistCard';
import { UniversityPromoBanner } from '@/components/therapists/UniversityPromoBanner';
import { AccountTypeBadge } from '@/components/pricing/AccountTypeBadge';
import { WhatsAppButton } from '@/components/chat/WhatsAppButton';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Therapist, WeeklySchedule } from '@/api/types';
import type { DayOfWeek } from '@/types/database';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getDisplayPrice } from '@/lib/pricingUtils';

const TIME_RANGES_CONFIG = [
  { value: 'morning', start: '08:00', end: '12:00' },
  { value: 'afternoon', start: '12:00', end: '18:00' },
  { value: 'evening', start: '18:00', end: '22:00' },
];

const DAY_KEYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function Therapists() {
  const { t } = useTranslation(['therapists', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');

  const { isLoading: profileLoading, isAuthenticated, accountType } = useUserProfile();
  const showUniversityBanner = !isAuthenticated || accountType === 'public' || accountType === null;

  const { data: therapists, isLoading: loadingTherapists } = useQuery<Therapist[]>({
    queryKey: ['therapists'],
    queryFn: async () => {
      const response = await apiClient.gettherapists();
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as Therapist[])
          .filter(t => t.is_active !== false)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      return [];
    },
    placeholderData: keepPreviousData,
  });

  const { data: allSchedules } = useQuery<WeeklySchedule[]>({
    queryKey: ['all-schedules'],
    queryFn: async () => {
      if (!therapists || therapists.length === 0) return [];
      const schedulePromises = therapists.map(async (therapist: Therapist) => {
        try {
          const response = await apiClient.gettherapistschedules(therapist.id || '');
          if (response && 'data' in response && Array.isArray(response.data)) {
            return response.data as WeeklySchedule[];
          }
          return [];
        } catch (error) {
          console.error(`Error fetching schedules for therapist ${therapist.id}:`, error);
          return [];
        }
      });
      const allSchedulesArrays = await Promise.all(schedulePromises);
      return allSchedulesArrays.flat().filter((s: WeeklySchedule) => s.is_active !== false) as WeeklySchedule[];
    },
    enabled: !!therapists && therapists.length > 0,
  });

  const isTimeInRange = (scheduleStart: string, scheduleEnd: string, rangeStart: string, rangeEnd: string) =>
    scheduleStart < rangeEnd && scheduleEnd > rangeStart;

  const getSchedulesForTherapist = useCallback(
    (therapistId: string) => allSchedules?.filter(s => s.therapist_id === therapistId) || [],
    [allSchedules]
  );

  const dayNameToNumber: Record<DayOfWeek, number> = useMemo(() => ({
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }), []);

  const filteredTherapists = useMemo(() => {
    if (!therapists) return [];
    return therapists.filter(therapist => {
      const matchesSearch =
        searchTerm === '' ||
        therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(therapist.experience_topics) &&
          therapist.experience_topics.some((topic: string) =>
            String(topic).toLowerCase().includes(searchTerm.toLowerCase())
          ));
      if (!matchesSearch) return false;
      if (selectedDay === 'all' && selectedTimeRange === 'all') return true;

      const schedules = getSchedulesForTherapist(therapist.id || '');
      if (!schedules || schedules.length === 0) return false;

      let matchingSchedules = schedules;
      if (selectedDay !== 'all') {
        const dayNumber = dayNameToNumber[selectedDay as DayOfWeek];
        matchingSchedules = schedules.filter((s: WeeklySchedule) => {
          const scheduleDay =
            typeof s.day_of_week === 'string'
              ? dayNameToNumber[s.day_of_week as DayOfWeek]
              : Number(s.day_of_week);
          return scheduleDay === dayNumber;
        });
      }
      if (matchingSchedules.length === 0) return false;

      if (selectedTimeRange !== 'all') {
        const timeRange = TIME_RANGES_CONFIG.find(r => r.value === selectedTimeRange);
        if (timeRange && matchingSchedules.length > 0) {
          matchingSchedules = matchingSchedules.filter((s: WeeklySchedule) => {
            if (!s.start_time || !s.end_time) return false;
            return isTimeInRange(s.start_time, s.end_time, timeRange.start, timeRange.end);
          });
        }
      }
      return matchingSchedules.length > 0;
    });
  }, [therapists, getSchedulesForTherapist, searchTerm, selectedDay, selectedTimeRange, dayNameToNumber]);

  const hasActiveFilters = selectedDay !== 'all' || selectedTimeRange !== 'all';
  const clearFilters = () => {
    setSelectedDay('all');
    setSelectedTimeRange('all');
  };

  const getTimeRangeLabel = (value: string) => {
    const config = TIME_RANGES_CONFIG.find(r => r.value === value);
    if (!config) return '';
    const label = t(`therapists:timeRanges.${value}`);
    return `${label} (${config.start} - ${config.end})`;
  };

  const getPriceInfoForTherapist = (therapist: Therapist) => getDisplayPrice(therapist, accountType ?? null);

  return (
    <PublicLayout>
      {/* Header Section - Fondo azul vibrante con texto blanco */}
      <section className="py-8 sm:py-12 gradient-hero">
        <div className="container px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
              {t('therapists:pageTitle')}
            </h1>
            <p className="text-sm sm:text-base text-white/80">
              {t('therapists:pageSubtitle')}
            </p>

            {/* Account type badge */}
            {isAuthenticated && accountType && (
              <div className="flex justify-center mt-3 sm:mt-4">
                <AccountTypeBadge accountType={accountType} size="lg" />
              </div>
            )}
          </div>

          {showUniversityBanner && (
            <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
              <UniversityPromoBanner />
            </div>
          )}

          {/* Filters Section - Card profesional */}
          <div className="max-w-4xl mx-auto">
            <div className="card-professional p-4 sm:p-5 space-y-3 sm:space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <Input
                  placeholder={t('therapists:searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 bg-background border-border/60 text-sm sm:text-base h-10 sm:h-11 focus:border-primary/50"
                />
              </div>

              {/* Availability Filters */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  <span>{t('therapists:filters.filterBy')}:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger className="w-full bg-background border-border/60 text-sm h-10">
                      <SelectValue placeholder={t('therapists:filters.dayPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('therapists:filters.allDays')}</SelectItem>
                      {DAY_KEYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {t(`therapists:days.${day}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger className="w-full bg-background border-border/60 text-sm h-10">
                      <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-secondary" />
                      <SelectValue placeholder={t('therapists:filters.timePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('therapists:filters.allTimes')}</SelectItem>
                      {TIME_RANGES_CONFIG.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {getTimeRangeLabel(range.value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground h-10 w-full sm:w-auto hover:text-primary"
                    >
                      {t('therapists:filters.clear')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Active filters badges */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  {selectedDay !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-xs bg-primary/15 text-primary border-primary/20">
                      {t(`therapists:days.${selectedDay}`)}
                    </Badge>
                  )}
                  {selectedTimeRange !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-xs bg-secondary/15 text-secondary border-secondary/20">
                      {getTimeRangeLabel(selectedTimeRange)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Therapist Grid - Fondo alternado frío */}
      <section className="py-8 sm:py-12 section-cool">
        <div className="container px-4 sm:px-6">
          {loadingTherapists ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-professional p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <Skeleton className="h-16 w-16 sm:h-24 sm:w-24 rounded-full" />
                    <div className="flex-1 w-full text-center sm:text-left">
                      <Skeleton className="h-5 w-32 mx-auto sm:mx-0 mb-2" />
                      <Skeleton className="h-4 w-20 mx-auto sm:mx-0 mb-3" />
                      <div className="flex gap-2 justify-center sm:justify-start mb-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-20 mx-auto sm:mx-0 mb-4" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTherapists && filteredTherapists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {filteredTherapists.map((therapist) => (
                <TherapistCard
                  key={therapist.id}
                  therapist={therapist}
                  schedules={getSchedulesForTherapist(therapist.id || '')}
                  priceInfo={getPriceInfoForTherapist(therapist)}
                  isLoadingPrice={profileLoading}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <p className="text-muted-foreground text-base sm:text-lg px-4">
                {searchTerm || hasActiveFilters
                  ? t('therapists:noResults')
                  : t('therapists:noAvailable')}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                  {t('therapists:filters.clear')}
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <WhatsAppButton />
    </PublicLayout>
  );
}
