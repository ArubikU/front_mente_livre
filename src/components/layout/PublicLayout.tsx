import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicHeader } from './PublicHeader';
import logoBlanco from '@/assets/logo-blanco.png';
import { Mail, Phone, MapPin, Heart } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      
      {/* Footer - Profesional con gradiente azul profundo */}
      <footer className="bg-gradient-to-br from-secondary via-secondary to-[hsl(217,70%,35%)] text-white">
        <div className="container py-10 sm:py-14 px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {/* Logo & Description */}
            <div className="sm:col-span-2">
              <img src={logoBlanco} alt="Mente Livre" className="h-12 sm:h-14 w-auto mb-4" />
              <p className="text-white/80 max-w-md leading-relaxed text-sm sm:text-base">
                {t('footer.description')}
              </p>
              {/* Sello de confianza */}
              <div className="flex items-center gap-2 mt-4 text-white/60">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-xs">Plataforma de salud mental profesional</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-base sm:text-lg mb-4 text-white">{t('footer.links')}</h3>
              <nav className="flex flex-col gap-2.5">
                <Link to="/" className="text-white/75 hover:text-white transition-colors text-sm sm:text-base hover:translate-x-1 transform duration-200">
                  {t('nav.home')}
                </Link>
                <Link to="/terapeutas" className="text-white/75 hover:text-white transition-colors text-sm sm:text-base hover:translate-x-1 transform duration-200">
                  {t('nav.therapists')}
                </Link>
                <Link to="/terminos-y-condiciones" className="text-white/75 hover:text-white transition-colors text-sm sm:text-base hover:translate-x-1 transform duration-200">
                  {t('footer.termsAndConditions')}
                </Link>
              </nav>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-base sm:text-lg mb-4 text-white">{t('footer.contact')}</h3>
              <div className="flex flex-col gap-3">
                <a 
                  className="flex items-center gap-2.5 text-white/75 hover:text-white transition-colors text-sm sm:text-base group" 
                  href="mailto:mentelivre.pe@gmail.com"
                >
                  <Mail className="h-4 w-4 flex-shrink-0 text-primary group-hover:scale-110 transition-transform" />
                  <span className="break-all">mentelivre.pe@gmail.com</span>
                </a>
                <a 
                  className="flex items-center gap-2.5 text-white/75 hover:text-white transition-colors text-sm sm:text-base group" 
                  href="https://wa.me/51912089799?text=Hola%20%F0%9F%91%8B%20Tengo%20una%20consulta%20sobre%20Mente%20Livre%20y%20me%20gustar%C3%ADa%20recibir%20m%C3%A1s%20informaci%C3%B3n.%20Gracias."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4 flex-shrink-0 text-primary group-hover:scale-110 transition-transform" />
                  +51 912 089 799
                </a>
                <span className="flex items-center gap-2.5 text-white/75 text-sm sm:text-base">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary/80" />
                  Lima, Perú
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-white/50 text-center sm:text-left">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <p className="text-xs sm:text-sm text-white/50 text-center sm:text-right">
              {t('footer.tagline')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
