import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Shield, Heart, Users, Clock, Filter, Sparkles, CheckCircle2 } from 'lucide-react';
import heroIllustration from '@/assets/hero-illustration.png';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { TherapistCard } from '@/components/therapists/TherapistCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/integrations/api/client';
import type { Therapist, WeeklySchedule } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppButton } from '@/components/chat/WhatsAppButton';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AccountTypeBadge } from '@/components/pricing/AccountTypeBadge';
import { UniversityPromoBanner } from '@/components/therapists/UniversityPromoBanner';
import { getDisplayPrice } from '@/lib/pricingUtils';
import { LogoCarousel } from '@/components/home/LogoCarousel';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const TIME_RANGES_CONFIG = [
  { value: 'morning', start: '08:00', end: '12:00' },
  { value: 'afternoon', start: '12:00', end: '18:00' },
  { value: 'evening', start: '18:00', end: '22:00' }
];

const DAY_KEYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function Index() {
  const { t } = useTranslation(['home', 'common']);
  const { user } = useAuth();
  const { profile, isLoading: isLoadingProfile } = useUserProfile();
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const {
    data: therapists,
    isLoading: loadingTherapists
  } = useQuery({
    queryKey: ['therapists'],
    queryFn: async () => {
      const response = await apiClient.gettherapists();
      if (response && 'data' in response && Array.isArray(response.data)) {
        // Filtrar solo terapeutas activos y ordenar por nombre
        return (response.data as Therapist[])
          .filter(t => t.is_active !== false)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      return [];
    }
  });
  
  const {
    data: allSchedules
  } = useQuery({
    queryKey: ['all-schedules'],
    queryFn: async () => {
      // Obtener horarios de todos los terapeutas
      if (!therapists || therapists.length === 0) {
        return [];
      }
      
      const schedulePromises = therapists.map(async (therapist) => {
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
      return allSchedulesArrays.flat().filter(s => s.is_active !== false) as WeeklySchedule[];
    },
    enabled: !!therapists && therapists.length > 0
  });
  // Mapeo de día string a número (1=Lunes, 7=Domingo)
  const dayNameToNumber: Record<DayOfWeek, number> = useMemo(() => ({
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  }), []);

  const getSchedulesForTherapist = useCallback(
    (therapistId: string) => allSchedules?.filter(s => s.therapist_id === therapistId) || [],
    [allSchedules]
  );
  const isTimeInRange = useCallback(
    (scheduleStart: string, scheduleEnd: string, rangeStart: string, rangeEnd: string) =>
      scheduleStart < rangeEnd && scheduleEnd > rangeStart,
    []
  );
  const filteredTherapists = useMemo(() => {
    if (!therapists) return [];
    if (selectedDay === 'all' && selectedTimeRange === 'all') return therapists;
    return therapists.filter(therapist => {
      const schedules = getSchedulesForTherapist(therapist.id || '');
      if (schedules.length === 0) return false;
      let matchingSchedules = schedules;
      if (selectedDay !== 'all') {
        const dayNumber = dayNameToNumber[selectedDay as DayOfWeek];
        matchingSchedules = schedules.filter(s => s.day_of_week === dayNumber);
      }
      if (matchingSchedules.length === 0) return false;
      if (selectedTimeRange !== 'all') {
        const timeRange = TIME_RANGES_CONFIG.find(t => t.value === selectedTimeRange);
        if (timeRange && matchingSchedules.length > 0) {
          matchingSchedules = matchingSchedules.filter(s => {
            if (!s.start_time || !s.end_time) return false;
            return isTimeInRange(s.start_time, s.end_time, timeRange.start, timeRange.end);
          });
        }
      }
      return matchingSchedules.length > 0;
    });
  }, [therapists, selectedDay, selectedTimeRange, getSchedulesForTherapist, isTimeInRange, dayNameToNumber]);
  const hasActiveFilters = selectedDay !== 'all' || selectedTimeRange !== 'all';
  
  const clearFilters = () => {
    setSelectedDay('all');
    setSelectedTimeRange('all');
  };

  const getTimeRangeLabel = (value: string) => {
    const config = TIME_RANGES_CONFIG.find(r => r.value === value);
    if (!config) return '';
    const label = t(`home:filters.${value}`);
    return `${label} (${config.start} - ${config.end})`;
  };
  return <PublicLayout>
      {/* Hero Section */}
      <section className="relative min-h-[88vh] flex items-center py-16 sm:py-20 lg:py-24 overflow-hidden bg-red-600">
        {/* Soft decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-50/30 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10 px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Text column */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-primary/15">
                <Sparkles className="h-3.5 w-3.5" />
                Terapia pensada para estudiantes
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold mb-5 sm:mb-6 leading-tight tracking-tight text-foreground">
                PSICOLOGIA PARA TODOS
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('home:hero.subtitle')}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gap-2 text-base px-7 py-6 rounded-xl shadow-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    TEST DEPLOY FUNCIONANDO
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/terapeutas" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto gap-2 text-base px-7 py-6 rounded-xl border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                  >
                    {t('home:hero.ctaSecondary')}
                  </Button>
                </Link>
              </div>

              {/* Microcopy trust signals */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 justify-center lg:justify-start">
                {[
                  t('home:hero.trust1'),
                  t('home:hero.trust2'),
                  t('home:hero.trust3'),
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Illustration column */}
            <div className="flex justify-center items-center order-1 lg:order-2">
              <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-teal-400/10 rounded-3xl blur-2xl scale-95" />
                <img
                  src={heroIllustration}
                  alt="Terapia online para estudiantes"
                  className="relative w-full h-auto object-contain drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Wave bottom transition */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg
            className="relative block w-full h-16 sm:h-20 lg:h-24"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.11,141.23,111.31,221.89,91.17,299.52,71.84,257.95,68.16,321.39,56.44Z"
              className="fill-background"
            />
          </svg>
        </div>
      </section>

      {/* Logo Carousel Section */}
      <LogoCarousel />

      {/* Therapists Section - Fondo alternado frío */}
      <section className="py-12 sm:py-16 lg:py-20 section-cool">
        <div className="container px-4 sm:px-6">
          {/* Account Type Badge */}
          <ScrollReveal animation="fade-in" delay={0}>
            <div className="flex justify-center mb-4 sm:mb-6">
              {user && !isLoadingProfile && profile?.account_type && (
                <AccountTypeBadge accountType={profile.account_type} size="lg" />
              )}
              {!user && (
                <Badge variant="outline" className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-background/80 border-primary/20">
                  {t('common:account.public')}
                </Badge>
              )}
            </div>
          </ScrollReveal>

          {/* University Promo Banner */}
          {(!user || (profile && profile.account_type !== 'university_pe')) && (
            <ScrollReveal animation="fade-up" delay={100}>
              <UniversityPromoBanner className="max-w-4xl mx-auto mb-8 sm:mb-10" />
            </ScrollReveal>
          )}

          <ScrollReveal animation="fade-up" delay={150}>
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                {t('home:therapists.title')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
                {t('home:therapists.subtitle')}
              </p>
            </div>
          </ScrollReveal>

          {/* Availability Filters - Card profesional */}
          <div className="max-w-3xl mx-auto mb-8 sm:mb-10">
            <div className="card-professional p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Filter className="h-4 w-4 text-primary" />
                  <span>{t('home:filters.filterBy')}:</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger className="w-full bg-background border-border/60">
                      <SelectValue placeholder={t('home:filters.allDays')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('home:filters.allDays')}</SelectItem>
                      {DAY_KEYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {t(`home:days.${day}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger className="w-full bg-background border-border/60">
                      <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-secondary" />
                      <SelectValue placeholder={t('home:filters.allTimes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('home:filters.allTimes')}</SelectItem>
                      {TIME_RANGES_CONFIG.map(range => (
                        <SelectItem key={range.value} value={range.value}>
                          {getTimeRangeLabel(range.value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground w-full sm:w-auto">
                      {t('home:filters.clear')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Active filters badges */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 justify-center mt-4 pt-3 border-t border-border/50">
                  {selectedDay !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-xs bg-primary/15 text-primary border-primary/20">
                      {t(`home:days.${selectedDay}`)}
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

          {/* Therapist Grid */}
          {loadingTherapists ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card-professional p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <Skeleton className="h-16 w-16 sm:h-24 sm:w-24 rounded-full" />
                    <div className="flex-1 w-full text-center sm:text-left">
                      <Skeleton className="h-5 w-32 mx-auto sm:mx-0 mb-2" />
                      <Skeleton className="h-4 w-40 mx-auto sm:mx-0 mb-3" />
                      <div className="flex gap-2 justify-center sm:justify-start mb-4">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTherapists && filteredTherapists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
              {filteredTherapists.map(therapist => {
                const priceInfo = getDisplayPrice(therapist, profile?.account_type ?? null);
                return (
                  <TherapistCard 
                    key={therapist.id} 
                    therapist={therapist} 
                    schedules={getSchedulesForTherapist(therapist.id || '')}
                    priceInfo={priceInfo}
                    isLoadingPrice={isLoadingProfile}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <p className="text-muted-foreground text-base sm:text-lg px-4">
                {hasActiveFilters 
                  ? t('home:therapists.noResults') 
                  : t('home:therapists.noAvailable')
                }
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                  {t('home:filters.clear')}
                </Button>
              )}
            </div>
          )}

          <div className="text-center mt-8 sm:mt-10">
            <Link to="/terapeutas">
              <Button variant="outline" size="lg" className="gap-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5">
                {t('home:therapists.viewAll')}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section - Cards con iconos azules */}
      <section className="py-12 sm:py-16 lg:py-20 section-warm relative">
        <div className="container px-4 sm:px-6">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                {t('home:features.title')}
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Feature Card 1 */}
            <ScrollReveal animation="fade-up" delay={0}>
              <div className="card-professional p-6 sm:p-8 text-center group hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-5 group-hover:scale-110 transition-transform">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">
                  {t('home:features.confidentiality.title')}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('home:features.confidentiality.description')}
                </p>
              </div>
            </ScrollReveal>

            {/* Feature Card 2 */}
            <ScrollReveal animation="fade-up" delay={100}>
              <div className="card-professional p-6 sm:p-8 text-center group hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-5 group-hover:scale-110 transition-transform">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">
                  {t('home:features.team.title')}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('home:features.team.description')}
                </p>
              </div>
            </ScrollReveal>

            {/* Feature Card 3 */}
            <ScrollReveal animation="fade-up" delay={200}>
              <div className="card-professional p-6 sm:p-8 text-center group hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-5 group-hover:scale-110 transition-transform">
                  <Heart className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">
                  {t('home:features.personalized.title')}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('home:features.personalized.description')}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section - Gradiente azul dinámico */}
      <section className="py-12 sm:py-16 lg:py-20 gradient-cta relative overflow-hidden">
        {/* Patrón decorativo sutil */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="container text-center px-4 sm:px-6 relative z-10">
          <ScrollReveal animation="scale-in">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/20">
              <Sparkles className="h-4 w-4" />
              {t('home:hero.title')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3 sm:mb-4">
              {t('home:cta.title')}
            </h2>
              <p className="text-primary-foreground/85 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                {t('home:cta.subtitle')}
              </p>
              {user ? (
                <Link to="/terapeutas">
                  <Button size="lg" variant="secondary" className="gap-2 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto shadow-lg hover:shadow-xl">
                    {t('home:cta.button')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="gap-2 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto shadow-lg hover:shadow-xl">
                    {t('home:cta.loginFirst')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              )}
          </ScrollReveal>
        </div>
      </section>

      {/* WhatsApp Button */}
      <WhatsAppButton />
    </PublicLayout>;
}
