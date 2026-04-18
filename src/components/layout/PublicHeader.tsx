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

const PUBLIC_NAV = [
  { to: '/',           label: 'Inicio',         exact: true  },
  { to: '/terapeutas', label: 'Psicólogos',      exact: false },
  { to: '/conocenos',  label: 'Cómo funciona',   exact: false },
  { to: '/terapeutas', label: 'Precios',         exact: false },
];

export function PublicHeader() {
  const { t } = useTranslation('common');
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
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

  const isActiveRoute = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur-xl shadow-card border-b border-border/40'
          : 'bg-background/60 backdrop-blur-md border-b border-transparent'
      )}
    >
      <div className="container flex items-center justify-between h-16 lg:h-[68px]">

        {/* Logo */}
        <Link to="/" className="flex items-center group flex-shrink-0">
          <img
            src={logoNegro}
            alt="Mente Livre"
            className="h-9 w-auto transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Desktop Center Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {PUBLIC_NAV.map(({ to, label, exact }) => (
            <Link
              key={label}
              to={to}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200',
                isActiveRoute(to, exact)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {label}
            </Link>
          ))}

          {user && hasStaffAccess && (
            <Link
              to="/dashboard"
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1.5',
                isActiveRoute('/dashboard')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1.5',
                isActiveRoute('/admin/disponibilidad')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Clock className="h-4 w-4" />
              {t('nav.schedules')}
            </Link>
          )}
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground rounded-full font-medium"
                >
                  Iniciar sesión
                </Button>
              </Link>
              <Link to="/terapeutas">
                <Button
                  size="sm"
                  className="rounded-full shadow-primary btn-elevated font-semibold px-5 gap-1.5"
                >
                  Empezar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSelector />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <div className="flex flex-col h-full">
                {/* Mobile header */}
                <div className="p-4 border-b">
                  <img src={logoNegro} alt="Mente Livre" className="h-9 w-auto" />
                </div>

                {/* Mobile Nav */}
                <nav className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-1">
                    {PUBLIC_NAV.map(({ to, label }) => (
                      <Link
                        key={label}
                        to={to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center px-4 py-3 text-base font-medium rounded-xl hover:bg-muted transition-colors"
                      >
                        {label}
                      </Link>
                    ))}

                    {user && (
                      <>
                        <Link
                          to="/mi-cuenta"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center px-4 py-3 text-base font-medium rounded-xl hover:bg-muted transition-colors"
                        >
                          {t('nav.myAppointments')}
                        </Link>
                        {hasStaffAccess && (
                          <Link
                            to="/dashboard"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-base font-medium text-primary rounded-xl hover:bg-primary/10 transition-colors"
                          >
                            <LayoutDashboard className="h-5 w-5" />
                            {isAdmin ? t('nav.dashboard') : t('nav.myPanel')}
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            to="/admin/disponibilidad"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-xl hover:bg-muted transition-colors"
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
                      className="w-full gap-2 rounded-full"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </Button>
                  ) : (
                    <>
                      <Link to="/auth" className="block" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" className="w-full rounded-full">
                          Iniciar sesión
                        </Button>
                      </Link>
                      <Link to="/terapeutas" className="block" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full rounded-full gap-2">
                          Empezar
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
    </header>
  );
}
