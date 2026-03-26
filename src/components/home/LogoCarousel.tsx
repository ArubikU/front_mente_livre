import { useTranslation } from 'react-i18next';

interface Logo {
  name: string;
  src: string;
  alt?: string;
}

interface LogoCarouselProps {
  logos?: Logo[];
}

const defaultLogos: Logo[] = [
  { name: 'Universidad de Lima', src: '/logos/ulima.png', alt: 'Logo Universidad de Lima' },
  { name: 'PUCP', src: '/logos/pucp.png', alt: 'Logo PUCP' },
  { name: 'UPC', src: '/logos/upc.png', alt: 'Logo UPC' },
  { name: 'USMP', src: '/logos/usmp.png', alt: 'Logo USMP' },
  { name: 'UNMSM', src: '/logos/unmsm.png', alt: 'Logo UNMSM' },
];

export function LogoCarousel({ logos = defaultLogos }: LogoCarouselProps) {
  const { t } = useTranslation('home');
  
  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <section 
      className="py-12 sm:py-14 lg:py-16"
      style={{ backgroundColor: '#F5F7FA' }}
    >
      <div className="container px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {t('backers.title')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Instituciones que respaldan nuestra labor
          </p>
        </div>

        {/* Logo Carousel Container */}
        <div className="relative overflow-hidden">
          {/* Gradient fade on edges */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-6 sm:w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #F5F7FA, transparent)' }}
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-6 sm:w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #F5F7FA, transparent)' }}
          />
          
          {/* Scrolling container */}
          <div 
            className="flex items-center gap-4 sm:gap-5 animate-marquee-slow-institutional"
            style={{ width: 'max-content' }}
          >
            {duplicatedLogos.map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className="flex-shrink-0"
              >
                {/* Card: minimal padding, logo dominante */}
                <div className="bg-white rounded-lg px-4 py-4 sm:px-5 sm:py-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-border/30 flex items-center justify-center"
                  style={{ minWidth: '160px', width: '44vw', maxWidth: '220px' }}
                >
                  <img
                    src={logo.src}
                    alt={logo.alt || logo.name}
                    className="w-full h-auto max-h-20 sm:max-h-24 object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
