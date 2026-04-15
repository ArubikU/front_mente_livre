import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lock, GraduationCap, Building2, Calendar, Sparkles } from 'lucide-react';
import type { Therapist, WeeklySchedule } from '@/api/types';
import { getAvailabilityStatus } from '@/hooks/useTherapists';
import { API_BASE_URL } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import type { DisplayPriceResult } from '@/lib/pricingUtils';

interface TherapistCardProps {
    therapist: Therapist;
    schedules?: WeeklySchedule[];
    priceInfo?: DisplayPriceResult;
    isLoadingPrice?: boolean;
}

export function TherapistCard({
    therapist,
    schedules,
    priceInfo,
    isLoadingPrice = false,
}: TherapistCardProps) {
    const { userRole } = useAuth();
    const availability = getAvailabilityStatus(schedules || []);
    const initials = therapist.name!.split(' ').map(n => n[0]).join('').slice(0, 2);

    const canBook = !userRole || userRole !== 'therapist'; // Admins can book on behalf of patients

    const pricingRecord = (therapist as { pricing?: Record<string, { price?: number }> }).pricing;
    const regularPrice: number = pricingRecord?.public?.price != null
        ? Number(pricingRecord.public.price)
        : (therapist.hourly_rate ? Number(therapist.hourly_rate) : 50);
    const displayPrice: number = priceInfo?.displayPrice ?? regularPrice;
    const isUniversityRate = priceInfo?.isUniversityRate ?? false;
    const hasDiscount = isUniversityRate && regularPrice > displayPrice;

    const mainPhoto = Array.isArray(therapist.photos) && therapist.photos.length > 0
        ? therapist.photos[0]
        : null;

    const CardWrapper = ({ children }: { children: React.ReactNode }) => {
        if (canBook) {
            return (
                <Link to={`/reservar/${therapist.id}`} className="block group">
                    {children}
                </Link>
            );
        }
        return <div className="block group">{children}</div>;
    };

    const academicInfo = null;

    const availabilityLabel = availability.type === 'today' ? 'Disponible hoy'
        : availability.type === 'tomorrow' ? 'Disponible mañana'
            : 'Esta semana';

    return (
        <CardWrapper>
            <Card className={`h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card border border-border/50 ${canBook ? 'hover:border-primary/30' : 'hover:border-muted'}`}>
                <div className="p-5 flex gap-4 h-full">
                    <div className="flex-shrink-0">
                        <Avatar className={`h-20 w-20 ring-2 ${canBook ? 'ring-primary/10 group-hover:ring-primary/30' : 'ring-muted'} transition-all duration-300`}>
                            {(() => {
                                const rawUrl = mainPhoto?.photo_url || (therapist as { photo_url?: string }).photo_url;
                                if (!rawUrl) return undefined;
                                const srcValue = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}/uploads/${rawUrl.replace(/^uploads\//, '')}`;
                                return (
                                    <AvatarImage
                                        src={srcValue}
                                        alt={therapist.name}
                                        className="object-cover"
                                        style={{ objectPosition: mainPhoto?.photo_position || (therapist as { photo_position?: string }).photo_position || '50% 20%' }}
                                    />
                                );
                            })()}
                            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                        <h3 className={`text-lg font-bold text-foreground leading-tight truncate ${canBook ? 'group-hover:text-primary' : ''} transition-colors`}>
                            {therapist.name}
                        </h3>

                        {academicInfo && (
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                                <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{academicInfo}</span>
                            </div>
                        )}

                        {therapist.university && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{therapist.university}</span>
                            </div>
                        )}

                        {availability.type !== 'none' && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-medium"
                                >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {availabilityLabel}
                                </Badge>
                            </div>
                        )}

                        <div className="flex-1 min-h-2" />

                        <div className={`flex items-center gap-3 mt-3 ${isUniversityRate && hasDiscount ? 'justify-start' : 'justify-between'}`}>
                            <div className={`flex flex-col ${isUniversityRate && hasDiscount ? 'flex-shrink-0' : ''}`}>
                                {isLoadingPrice ? (
                                    <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                                ) : isUniversityRate && hasDiscount ? (
                                    <>
                                        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                            <span className="text-xs text-muted-foreground line-through whitespace-nowrap">S/ {regularPrice.toFixed(0)}</span>
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-primary/10 text-primary border-primary/20 shrink-0 whitespace-nowrap">
                                                Precio especial
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground whitespace-nowrap mt-0.5">
                                            <span className="text-base font-semibold text-primary">
                                                S/ {displayPrice.toFixed(0)}
                                            </span>
                                            <span className="text-xs"> / sesión</span>
                                        </p>
                                        <p className="text-xs text-primary mt-0.5">Ahorras S/ {(regularPrice - displayPrice).toFixed(0)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                                            <span className="text-base font-semibold text-foreground">
                                                S/ {displayPrice.toFixed(0)}
                                            </span>
                                            <span className="text-xs"> / sesión</span>
                                        </p>
                                        {isUniversityRate && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Sparkles className="h-3 w-3 text-primary" />
                                                <span className="text-xs text-primary font-medium">
                                                    Precio especial
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {canBook ? (
                                <Button
                                    size="sm"
                                    className={`font-semibold text-sm w-full sm:w-auto px-6 shadow-md ${isUniversityRate && hasDiscount ? '-translate-x-8 translate-y-4' : ''}`}
                                >
                                    Empieza hoy
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-medium text-xs gap-1 text-muted-foreground cursor-not-allowed"
                                    disabled
                                >
                                    <Lock className="h-3 w-3" />
                                    Solo pacientes
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </CardWrapper>
    );
}
