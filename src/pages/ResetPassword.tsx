import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [hasRecoveryTokens, setHasRecoveryTokens] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const processRecoveryTokens = async () => {
      // Parse tokens from both hash and query params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check for recovery indicators
      const type = hashParams.get('type') || urlParams.get('type');
      const token = hashParams.get('token') || urlParams.get('token'); // Nuestro backend usa 'token'
      const errorCode = hashParams.get('error_code') || urlParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');

      // Handle error cases (e.g., expired token)
      if (errorCode) {
        toast({
          title: "Error",
          description: errorDescription?.replace(/\+/g, ' ') || "El enlace ha expirado o es inválido.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      // If we have recovery token, store it
      if (token && type === 'recovery') {
        setHasRecoveryTokens(true);
        
        try {
          // Store token temporarily for password reset
          localStorage.setItem('reset_token', token);
          setIsSessionReady(true);
          
          // Clean URL without losing page state
          window.history.replaceState({}, document.title, '/reset-password');
        } catch (err) {
          console.error('Error processing recovery:', err);
          toast({
            title: "Error",
            description: "Ocurrió un error procesando el enlace.",
            variant: "destructive",
          });
        }
      } else {
        // No tokens - check if we have a stored reset token
        const storedToken = localStorage.getItem('reset_token');
        if (storedToken) {
          setIsSessionReady(true);
          setHasRecoveryTokens(true);
        } else {
          // No tokens and no session - redirect to auth
          toast({
            title: "Enlace inválido",
            description: "Por favor solicita un nuevo enlace de recuperación.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/auth'), 2000);
        }
      }
    };

    processRecoveryTokens();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmNewPassword) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Por favor verifica que las contraseñas sean iguales.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const resetToken = localStorage.getItem('reset_token');
      if (!resetToken) {
        throw new Error('Token de recuperación no encontrado');
      }
      
      // TODO: Implement password reset endpoint in backend
      // The endpoint should be: POST /auth/reset-password
      // Body: { token: resetToken, new_password: newPassword }
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://backend.mentelivre.org/';
      const response = await fetch(`${baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: resetToken,
          new_password: newPassword
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al actualizar la contraseña' }));
        throw new Error(error.message || 'Error al actualizar la contraseña');
      }
      
      setIsSuccess(true);
      localStorage.removeItem('reset_token');
      
      toast({
        title: "¡Contraseña actualizada!",
        description: "Tu contraseña ha sido cambiada exitosamente.",
      });
      
      // Sign out and redirect to login
      await signOut();
      
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: unknown) {
      console.error('Password update error:', error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error al actualizar la contraseña.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 1, label: 'Muy débil', color: 'bg-red-500' };
    if (password.length < 8) return { strength: 2, label: 'Débil', color: 'bg-orange-500' };
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (password.length >= 8 && score >= 3) return { strength: 4, label: 'Fuerte', color: 'bg-green-500' };
    if (password.length >= 8 && score >= 2) return { strength: 3, label: 'Media', color: 'bg-yellow-500' };
    return { strength: 2, label: 'Débil', color: 'bg-orange-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Success state
  if (isSuccess) {
    return (
      <PublicLayout>
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-primary">¡Contraseña Actualizada!</h2>
                <p className="text-muted-foreground">
                  Tu contraseña ha sido cambiada exitosamente. Redirigiendo al inicio de sesión...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // Loading state while processing tokens
  if (!isSessionReady || !hasRecoveryTokens) {
    return (
      <PublicLayout>
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Verificando enlace de recuperación...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Crear Nueva Contraseña
            </CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña para completar el restablecimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    minLength={8}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded ${
                            level <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fortaleza: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repite tu nueva contraseña"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    minLength={8}
                  />
                </div>
                
                {/* Match indicator */}
                {confirmNewPassword.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    {newPassword === confirmNewPassword ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">Las contraseñas coinciden</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-red-600">Las contraseñas no coinciden</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || newPassword.length < 8 || newPassword !== confirmNewPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                Después de actualizar tu contraseña serás redirigido para iniciar sesión.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default ResetPassword;
