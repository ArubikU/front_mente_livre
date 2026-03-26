import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UniversityPromoBannerProps {
  className?: string;
}

export function UniversityPromoBanner({ className }: UniversityPromoBannerProps) {
  const { t } = useTranslation('home');

  return (
    <div className={`card-professional p-4 sm:p-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border-primary/15 ${className}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 sm:gap-4">
        {/* Icono circular azul */}
        <div className="flex-shrink-0 p-2.5 sm:p-3 rounded-full bg-primary/10">
          <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
            {t('universityBanner.title')}
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            {t('universityBanner.description')}
          </p>
          <p className="text-primary font-medium text-xs sm:text-sm mt-1">
            {t('universityBanner.slogan')}
          </p>
        </div>

        <Button asChild className="w-full md:w-auto shrink-0 gap-2 h-10 sm:h-9 mt-2 md:mt-0 shadow-md">
          <Link to="/auth">
            {t('universityBanner.cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
