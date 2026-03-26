import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, LogOut, User, LayoutDashboard, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSelector } from './LanguageSelector';
import logoNegro from '@/assets/logo-negro.png';
import { cn } from '@/lib/utils';

export function PublicHeader() {
  const { t } = useTranslation('common');
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll effect detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const isAdmin = userRole === 'admin';
  const isTherapist = userRole === 'therapist';
  const hasStaffAccess = isAdmin || isTherapist;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const mainNavItems = [
    { to: '/', label: t('nav.home') },
    { to: '/conocenos', label: t('nav.about') },
    { to: '/terapeutas', label: t('nav.therapists') },
  ];

  const isActiveRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-background/98 backdrop-blur-lg shadow-soft border-b border-border/50"
          : "bg-background/80 backdrop-blur-sm border-b border-transparent"
      )}
    >
      {/* Main header row - Compacto en móvil */}
      <div className="container flex items-center justify-between h-16 md:h-auto md:py-2">
        {/* Logo - Más pequeño en móvil, con transición */}
        <Link to="/" className="flex items-center group flex-shrink-0">
          <img
            src={logoNegro}
            alt="Mente Livre"
            className={cn(
              "w-auto transition-all duration-300 group-hover:scale-105",
              isScrolled ? "h-[30px] md:h-[60px] lg:h-[72px]" : "h-9 md:h-[72px] lg:h-24"
            )}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
              isActiveRoute('/')
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/conocenos"
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
              isActiveRoute('/conocenos')
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            {t('nav.about')}
          </Link>
          <Link
            to="/terapeutas"
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
              isActiveRoute('/terapeutas')
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            {t('nav.therapists')}
          </Link>
          {user && (
            <Link
              to="/mi-cuenta"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                isActiveRoute('/mi-cuenta')
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              {t('nav.myAppointments')}
            </Link>
          )}
          {hasStaffAccess && (
            <Link
              to="/dashboard"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1.5",
                isActiveRoute('/dashboard')
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              {isAdmin ? t('nav.dashboard') : t('nav.myPanel')}
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin/disponibilidad"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1.5",
                isActiveRoute('/admin/disponibilidad')
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <Clock className="h-4 w-4" />
              {t('nav.schedules')}
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSelector />
          {user ? (
            <>
              <Link to="/mi-cuenta">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary rounded-full">
                  <User className="h-4 w-4" />
                  {t('nav.myAccount')}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 rounded-full border-primary/30 hover:border-primary hover:bg-primary/5"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary rounded-full">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/terapeutas">
                <Button size="sm" className="gap-1.5 shadow-primary rounded-full btn-elevated">
                  {t('nav.bookAppointment')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSelector />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="p-4 border-b">
                  <img src={logoNegro} alt="Mente Livre" className="h-10 w-auto" />
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-1">
                    <Link
                      to="/"
                      className="flex items-center px-4 py-3 text-base font-medium rounded-lg hover:bg-muted transition-colors"
                    >
                      {t('nav.home')}
                    </Link>
                    <Link
                      to="/conocenos"
                      className="flex items-center px-4 py-3 text-base font-medium rounded-lg hover:bg-muted transition-colors"
                    >
                      {t('nav.about')}
                    </Link>
                    <Link
                      to="/terapeutas"
                      className="flex items-center px-4 py-3 text-base font-medium rounded-lg hover:bg-muted transition-colors"
                    >
                      {t('nav.therapists')}
                    </Link>
                    {user && (
                      <>
                        <Link
                          to="/mi-cuenta"
                          className="flex items-center px-4 py-3 text-base font-medium rounded-lg hover:bg-muted transition-colors"
                        >
                          {t('nav.myAppointments')}
                        </Link>
                        {hasStaffAccess && (
                          <Link
                            to="/dashboard"
                            className="flex items-center gap-2 px-4 py-3 text-base font-medium text-primary rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            <LayoutDashboard className="h-5 w-5" />
                            {isAdmin ? t('nav.dashboard') : t('nav.myPanel')}
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            to="/admin/disponibilidad"
                            className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg hover:bg-muted transition-colors"
                          >
                            <Clock className="h-5 w-5" />
                            {t('nav.schedules')}
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </nav>

                {/* Mobile Actions */}
                <div className="p-4 border-t space-y-3">
                  {user ? (
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </Button>
                  ) : (
                    <>
                      <Link to="/auth" className="block">
                        <Button variant="outline" className="w-full">
                          {t('nav.login')}
                        </Button>
                      </Link>
                      <Link to="/terapeutas" className="block">
                        <Button className="w-full gap-2">
                          {t('nav.bookAppointment')}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Navigation Bar - Compact pills */}
      <nav className="md:hidden border-t border-border/40 bg-background overflow-x-auto">
        <div className="flex items-center justify-start gap-1 px-4 py-2 min-w-max">
          {mainNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap",
                isActiveRoute(item.to)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/mi-cuenta"
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap",
                isActiveRoute('/mi-cuenta')
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t('nav.myAppointments')}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
