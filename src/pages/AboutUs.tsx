import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, Shield, Target, Eye, Compass, Sparkles } from 'lucide-react';
import { WhatsAppButton } from '@/components/chat/WhatsAppButton';


interface SiteContent {
    about_title: string;
    about_intro: string;
    mission: string;
    vision: string;
    approach: string;
    purpose: string | null;
    values: string[] | null;
}

interface TeamProfile {
    id: string;
    member_type: 'clinical' | 'institutional';
    full_name: string;
    public_role_title: string;
    professional_level: string | null;
    public_bio: string | null;
    friendly_photo_url: string | null;
    order_index: number | null;
    /** Backend puede devolver 1/0 (MySQL) */
    is_visible_public?: boolean | number;
}

// Textos por defecto (como en Lovable): backend puede sobrescribirlos vía site_content
const DEFAULT_MISSION = '';
const DEFAULT_VISION = '';
const DEFAULT_APPROACH = '';
const DEFAULT_PURPOSE = 'Acompañar a jóvenes en su bienestar emocional con profesionalismo y calidez.';

export default function AboutUs() {
    // Fetch institutional content from CMS
    const {
        data: siteContent,
        isLoading: contentLoading,
        isError: contentError,
    } = useQuery({
        queryKey: ['site-content'],
        queryFn: async (): Promise<SiteContent | null> => {
            try {
                const response = await apiClient.getsitecontent();
                if (!response || typeof response !== 'object') return null;
                // Backend devuelve { data: content }; aceptar también respuesta directa
                const raw = (response as { data?: SiteContent; success?: boolean }).data ?? response;
                const content = raw as SiteContent;
                if (content && typeof content === 'object') return content;
                return null;
            } catch {
                return null;
            }
        },
    });

    // Fetch ALL team profiles from unified table (solo visibles públicamente)
    const {
        data: teamProfiles,
        isLoading: teamLoading,
        isError: _teamError,
    } = useQuery({
        queryKey: ['about-team-profiles'],
        queryFn: async (): Promise<TeamProfile[]> => {
            try {
                const response = await apiClient.getteamprofiles();
                if (!response || typeof response !== 'object') return [];
                const raw = (response as { data?: TeamProfile[] }).data ?? response;
                const list = Array.isArray(raw) ? raw : [];
                // Backend puede devolver is_visible_public como 1/0 (MySQL); tratar como booleano
                const visible = list.filter(
                    (p: TeamProfile) => Boolean(p.is_visible_public)
                );
                return visible.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
            } catch {
                return [];
            }
        },
    });

    // Team card component - Editorial design with large rectangular photo
    const TeamCard = ({
        name,
        role,
        bio,
        photoUrl,
        subtitle
    }: {
        name: string;
        role: string;
        bio: string | null;
        photoUrl: string | null;
        subtitle?: string | null;
    }) => (
        <article className="group card-professional overflow-hidden h-full flex flex-col">
            {/* Large rectangular photo - dominant visual element */}
            <div className="relative overflow-hidden rounded-t-2xl">
                <div className="aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]">
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={`${name} - ${role}`}
                            className="w-full h-full object-cover object-[50%_25%] group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent">
                            <Users className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground/40" />
                        </div>
                    )}
                </div>
            </div>

            {/* Text content area */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 leading-tight">
                    {name}
                </h3>

                <p className="text-sm sm:text-base text-primary font-semibold mb-1">
                    {role}
                </p>

                {subtitle && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 font-medium">
                        {subtitle}
                    </p>
                )}

                {bio && (
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-auto">
                        {bio}
                    </p>
                )}
            </div>
        </article>
    );

    const LoadingCards = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto px-4 sm:px-0">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card">
                    <Skeleton className="aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] w-full" />
                    <div className="p-5 sm:p-6">
                        <Skeleton className="h-6 w-40 mb-2" />
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-24 mb-4" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <PublicLayout>
            {/* 1. Hero Section - ¿Quiénes Somos? con texto blanco */}
            <section className="py-10 sm:py-12 md:py-16 gradient-hero">
                <div className="container px-4 sm:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        {contentLoading ? (
                            <>
                                <Skeleton className="h-10 sm:h-12 w-48 sm:w-64 mx-auto mb-4 sm:mb-6 bg-white/20" />
                                <Skeleton className="h-20 sm:h-24 w-full bg-white/20" />
                            </>
                        ) : (
                            <>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
                                    {siteContent?.about_title || '¿Quiénes Somos?'}
                                </h1>
                                <p className="text-base sm:text-lg md:text-xl text-white/85 leading-relaxed">
                                    {siteContent?.about_intro ?? (contentError ? 'No se pudo cargar el contenido. Puedes intentar recargar la página.' : '')}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. Team Section - Nuestro Equipo */}
            <section className="py-12 sm:py-16 md:py-24 section-cool">
                <div className="container px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10 sm:mb-14">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                            El equipo
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Jóvenes que te entienden.
                        </p>
                    </div>

                    {teamLoading ? (
                        <LoadingCards />
                    ) : teamProfiles && teamProfiles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
                            {teamProfiles.map((member) => (
                                <TeamCard
                                    key={member.id}
                                    name={member.full_name}
                                    role={member.public_role_title}
                                    bio={member.public_bio}
                                    photoUrl={member.friendly_photo_url}
                                    subtitle={member.professional_level}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 sm:py-16">
                            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-sm sm:text-base text-muted-foreground">
                                Pronto conocerás a nuestro equipo de profesionales.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Mission, Vision, Approach, Valores - section-warm con iconos en gradiente */}
            <section className="py-10 sm:py-12 md:py-16 section-warm">
                <div className="container px-4 sm:px-6">
                    {contentLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="text-center p-4 sm:p-6">
                                    <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-full mx-auto mb-3 sm:mb-4" />
                                    <Skeleton className="h-5 w-28 sm:w-32 mx-auto mb-2" />
                                    <Skeleton className="h-16 sm:h-20 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                            {/* Misión */}
                            <div className="text-center p-4 sm:p-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 mb-3 sm:mb-4">
                                    <Target className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold mb-2">Misión</h3>
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                    {siteContent?.mission ?? DEFAULT_MISSION}
                                </p>
                            </div>

                            {/* Visión */}
                            <div className="text-center p-4 sm:p-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 mb-3 sm:mb-4">
                                    <Eye className="h-7 w-7 sm:h-8 sm:w-8 text-secondary-foreground" />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold mb-2">Visión</h3>
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                    {siteContent?.vision ?? DEFAULT_VISION}
                                </p>
                            </div>

                            {/* Enfoque */}
                            <div className="text-center p-4 sm:p-6 sm:col-span-2 md:col-span-1">
                                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-accent to-accent/80 mb-3 sm:mb-4">
                                    <Compass className="h-7 w-7 sm:h-8 sm:w-8 text-accent-foreground" />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold mb-2">Enfoque</h3>
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                    {siteContent?.approach ?? DEFAULT_APPROACH}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Propósito (siempre visible: backend o texto por defecto como en Lovable) */}
                    {(() => {
                        const purposeText = siteContent?.purpose?.trim() || DEFAULT_PURPOSE;
                        return (
                            <div className="max-w-3xl mx-auto mt-8 sm:mt-12 text-center px-4">
                                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 mb-3 sm:mb-4">
                                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold mb-2">Propósito</h3>
                                <p className="text-muted-foreground text-sm sm:text-base">
                                    {purposeText}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Nuestros Valores (desde backend; si no hay, no se muestra la sección) */}
                    {siteContent?.values && siteContent.values.length > 0 && (
                        <div className="max-w-3xl mx-auto mt-8 sm:mt-12 text-center px-4">
                            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Nuestros Valores</h3>
                            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                                {siteContent.values.map((value, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs sm:text-sm py-0.5 sm:py-1 px-2 sm:px-3">
                                        {value}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 4. Compromiso, Confidencialidad, Equipo - bloque con gradiente y texto blanco */}
            <section className="py-10 sm:py-12 md:py-16 gradient-hero">
                <div className="container px-4 sm:px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                        <div className="text-center p-4 sm:p-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 mb-3 sm:mb-4">
                                <Heart className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">Precios justos</h3>
                            <p className="text-white/80 text-xs sm:text-sm">
                                La salud mental no debería ser un lujo.
                            </p>
                        </div>
                        <div className="text-center p-4 sm:p-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 mb-3 sm:mb-4">
                                <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">100% privado</h3>
                            <p className="text-white/80 text-xs sm:text-sm">
                                Lo que hables aquí, aquí se queda.
                            </p>
                        </div>
                        <div className="text-center p-4 sm:p-6 sm:col-span-2 md:col-span-1">
                            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 mb-3 sm:mb-4">
                                <Users className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">Jóvenes preparados</h3>
                            <p className="text-white/80 text-xs sm:text-sm">
                                Psicólogos en formación con supervisión profesional.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <WhatsAppButton />
        </PublicLayout>
    );
}


