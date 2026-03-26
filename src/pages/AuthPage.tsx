import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const AuthPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);
  const { user, signIn, signUp, googleLogin, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  // Register form state
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleAuth = async (credential?: string, successDescription?: string, errorTitle?: string) => {
    if (!credential) {
      toast({
        title: errorTitle || 'Error al iniciar sesión con Google',
        description: 'No se recibió credencial de Google.',
        variant: 'destructive',
      });
      return;
    }

    setIsGoogleLoading(true);
    const { error } = await googleLogin(credential);
    setIsGoogleLoading(false);

    if (error) {
      toast({
        title: errorTitle || 'Error al iniciar sesión con Google',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: '¡Bienvenido!',
      description: successDescription || 'Has iniciado sesión correctamente con Google.',
    });
    navigate('/');
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(loginEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    setIsLoading(false);

    if (error) {
      let errorMessage = "Ocurrió un error al iniciar sesión.";
      const msg = error.message || "";

      if (msg.includes("Invalid login credentials") || msg.includes("incorrectos") || msg.includes("credenciales")) {
        errorMessage = "Email o contraseña incorrectos.";
      } else if (msg.includes("Email not confirmed") || msg.includes("verifica tu email")) {
        errorMessage = "Por favor verifica tu email antes de iniciar sesión.";
      } else if (!msg.startsWith("HTTP") && msg.length > 0 && msg.length < 200) {
        errorMessage = msg;
      }

      toast({
        title: t('auth:errors.loginError'), // "Error al iniciar sesión"
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "¡Bienvenido!",
      description: "Has iniciado sesión correctamente.",
    });

    navigate('/');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast({
        title: "Campo requerido",
        description: "Por favor ingresa tu email.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(forgotEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://backend.mentelivre.org/';
      const response = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotEmail })
      });

      if (!response.ok) {
        throw new Error('Error al enviar solicitud de recuperación');
      }

      const data = await response.json();

      // En desarrollo, mostrar el link si está disponible
      let description = data.message || "Revisa tu bandeja de entrada para restablecer tu contraseña.";
      if (data.reset_link) {
        description += `\n\n🔗 Link de desarrollo: ${data.reset_link}`;
        console.log('Reset link (solo desarrollo):', data.reset_link);
      }

      toast({
        title: "Correo enviado",
        description: description,
        duration: data.reset_link ? 10000 : 5000, // Más tiempo si hay link
      });

      setForgotEmail('');
      setShowForgotPassword(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error al enviar el correo. Intenta de nuevo.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerFirstName || !registerLastName || !registerEmail || !registerPassword || !registerConfirmPassword) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(registerEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido.",
        variant: "destructive",
      });
      return;
    }

    if (registerPassword.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Por favor verifica que las contraseñas sean iguales.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const fullName = `${registerFirstName} ${registerLastName}`;
    const { error } = await signUp(registerEmail, registerPassword, fullName);

    setIsLoading(false);

    if (error) {
      let errorMessage = "Ocurrió un error al registrarte.";
      const msg = error.message || "";

      if (msg.includes("already registered") || msg.includes("ya está registrado")) {
        errorMessage = "Este email ya está registrado. Intenta iniciar sesión.";
      } else if (msg.includes("invalid email") || msg.includes("inválido")) {
        errorMessage = "El formato del email no es válido.";
      } else if (msg.includes("weak password") || msg.includes("muy débil")) {
        errorMessage = "La contraseña es muy débil.";
      } else if (!msg.startsWith("HTTP") && msg.length > 0 && msg.length < 200) {
        // Usar mensaje del backend si parece mensaje para el usuario
        errorMessage = msg;
      }

      toast({
        title: "Error al registrarse",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "¡Registro exitoso!",
      description: "Tu cuenta ha sido creada correctamente.",
    });

    // Clear form
    setRegisterFirstName('');
    setRegisterLastName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setActiveTab('login');
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <PublicLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              {t('auth:welcome.title')}
            </CardTitle>
            <CardDescription>
              {t('auth:welcome.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{t('auth:tabs.login')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth:tabs.register')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {/* Google Login Button */}
                <div className="w-full flex justify-center mb-4 min-h-[40px]">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => handleGoogleAuth(
                      credentialResponse.credential,
                      'Has iniciado sesión correctamente con Google.',
                      'Error al iniciar sesión con Google',
                    )}
                    onError={() => {
                      toast({
                        title: 'Error al iniciar sesión con Google',
                        description: 'Falló el inicio de sesión con Google.',
                        variant: 'destructive',
                      });
                    }}
                    useOneTap
                    theme="outline"
                    text="signin_with"
                    shape="pill"
                    width="320"
                  />
                </div>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('auth:login.orEmail')}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth:login.emailLabel')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder={t('auth:placeholders.email')}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        disabled={isLoading || authLoading || isGoogleLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth:login.passwordLabel')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth:placeholders.password')}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading || authLoading || isGoogleLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading || authLoading || isGoogleLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth:login.loading')}
                      </>
                    ) : (
                      t('auth:login.submitButton')
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="w-full text-sm text-primary hover:underline mt-2"
                  >
                    {t('auth:login.forgotPassword')}
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                {/* Google Register Button */}
                <div className="w-full flex justify-center mb-4 min-h-[40px]">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => handleGoogleAuth(
                      credentialResponse.credential,
                      'Cuenta creada correctamente con Google.',
                      'Error al registrarse con Google',
                    )}
                    onError={() => {
                      toast({
                        title: 'Error al registrarse con Google',
                        description: 'Falló el registro con Google.',
                        variant: 'destructive',
                      });
                    }}
                    theme="outline"
                    text="signup_with"
                    shape="pill"
                    width="320"
                  />
                </div>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('auth:register.orEmail')}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">{t('auth:register.firstNameLabel')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-firstname"
                          type="text"
                          placeholder={t('auth:placeholders.firstName')}
                          value={registerFirstName}
                          onChange={(e) => setRegisterFirstName(e.target.value)}
                          className="pl-10"
                          disabled={isLoading || authLoading || isGoogleLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">{t('auth:register.lastNameLabel')}</Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        placeholder={t('auth:placeholders.lastName')}
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        disabled={isLoading || authLoading || isGoogleLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t('auth:register.emailLabel')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder={t('auth:placeholders.email')}
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-10"
                        disabled={isLoading || authLoading || isGoogleLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t('auth:register.passwordLabel')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth:placeholders.minChars')}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading || authLoading || isGoogleLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">{t('auth:register.confirmPasswordLabel')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth:placeholders.confirmPassword')}
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        className="pl-10"
                        disabled={isLoading || authLoading || isGoogleLoading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading || authLoading || isGoogleLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth:register.loading')}
                      </>
                    ) : (
                      t('auth:register.submitButton')
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>{t('auth:forgotPassword.title')}</CardTitle>
                    <CardDescription>
                      {t('auth:forgotPassword.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">{t('auth:forgotPassword.emailLabel')}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="forgot-email"
                            type="email"
                            placeholder={t('auth:placeholders.email')}
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="pl-10"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setForgotEmail('');
                          }}
                          disabled={isLoading}
                        >
                          {t('auth:forgotPassword.cancelButton')}
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('auth:forgotPassword.loading')}
                            </>
                          ) : (
                            t('auth:forgotPassword.submitButton')
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </PublicLayout>
    </GoogleOAuthProvider>
  );
};

export default AuthPage;
