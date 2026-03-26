import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import logoNegro from '@/assets/logo-negro.png';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, googleLogin, isLoading } = useAuth();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', fullName: '' });

  // Only redirect if user is already logged in on initial mount
  useEffect(() => {
    const checkInitialSession = async () => {
      if (user && !isLoading) {
        // Add a small delay so we don't bounce them immediately while state initializes
        setTimeout(() => navigate('/'), 100);
      }
    };
    checkInitialSession();
  }, [user, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginData.email || !loginData.password) {
      toast({
        title: 'Campos incompletos',
        description: 'Completa todos los campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await signIn(loginData.email.trim(), loginData.password);

    if (error) {
      let errorMessage = 'Ocurrió un error, intenta nuevamente.';
      const msg = error.message || '';

      if (msg === 'Invalid login credentials' || msg.includes('incorrectos') || msg.includes('credenciales')) {
        errorMessage = 'Email o contraseña incorrectos.';
      } else if (msg.includes('Email not confirmed') || msg.includes('confirma tu email')) {
        errorMessage = 'Por favor confirma tu email antes de iniciar sesión.';
      } else if (msg.includes('Invalid email') || msg.includes('inválido')) {
        errorMessage = 'El formato del email no es válido.';
      } else if (!msg.startsWith('HTTP') && msg.length > 0 && msg.length < 200) {
        // Usar mensaje del backend si parece mensaje para el usuario
        errorMessage = msg;
      }

      toast({
        title: 'Error al iniciar sesión',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
      navigate('/');
    }

    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupData.fullName || !signupData.email || !signupData.password) {
      toast({
        title: 'Campos incompletos',
        description: 'Completa todos los campos.',
        variant: 'destructive',
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: 'Contraseña muy corta',
        description: 'La contraseña debe tener al menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor ingresa un email válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await signUp(signupData.email.trim(), signupData.password, signupData.fullName.trim());

    if (error) {
      let errorMessage = 'Ocurrió un error, intenta nuevamente.';
      const msg = error.message || '';

      if (msg.includes('already registered') || msg.includes('ya está registrado')) {
        errorMessage = 'Este email ya está registrado. Intenta iniciar sesión.';
      } else if (msg.includes('invalid email') || msg.includes('inválido')) {
        errorMessage = 'El formato del email no es válido.';
      } else if (msg.includes('weak password') || msg.includes('muy débil')) {
        errorMessage = 'La contraseña es muy débil.';
      } else if (!msg.startsWith('HTTP') && msg.length > 0 && msg.length < 200) {
        // Usar mensaje del backend si parece mensaje para el usuario
        errorMessage = msg;
      }

      toast({
        title: 'Error al registrarse',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Registro exitoso!',
        description: 'Tu cuenta ha sido creada. Bienvenido.',
      });
      navigate('/');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-elevated">
          <CardHeader className="text-center pb-2">
            <Link to="/" className="flex items-center justify-center mb-4">
              <img src={logoNegro} alt="Mente Livre" className="h-16 w-auto" />
            </Link>
            <CardTitle>Acceso Staff</CardTitle>
            <CardDescription>
              Panel de administración para psicólogos y administradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        O continúa con
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        if (credentialResponse.credential) {
                          const { error } = await googleLogin(credentialResponse.credential);
                          if (error) {
                            toast({
                              title: 'Error de autenticación',
                              description: error.message,
                              variant: 'destructive',
                            });
                          } else {
                            toast({
                              title: '¡Bienvenido!',
                              description: 'Has iniciado sesión correctamente con Google.',
                            });
                            navigate('/');
                          }
                        }
                      }}
                      onError={() => {
                        toast({
                          title: 'Error',
                          description: 'Falló el inicio de sesión con Google.',
                          variant: 'destructive',
                        });
                      }}
                      useOneTap
                      theme="outline"
                      text="signin_with"
                      shape="pill"
                      width="100%"
                    />
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <Input
                      id="signup-name"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={signupData.password}
                        onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Registrando...' : 'Crear Cuenta'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        O regístrate con
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        if (credentialResponse.credential) {
                          const { error } = await googleLogin(credentialResponse.credential);
                          if (error) {
                            toast({
                              title: 'Error de registro',
                              description: error.message,
                              variant: 'destructive',
                            });
                          } else {
                            toast({
                              title: '¡Bienvenido!',
                              description: 'Cuenta creada correctamente con Google.',
                            });
                            navigate('/');
                          }
                        }
                      }}
                      onError={() => {
                        toast({
                          title: 'Error',
                          description: 'Falló el registro con Google.',
                          variant: 'destructive',
                        });
                      }}
                      theme="outline"
                      text="signup_with"
                      shape="pill"
                      width="100%"
                    />
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </GoogleOAuthProvider>
  );
}
