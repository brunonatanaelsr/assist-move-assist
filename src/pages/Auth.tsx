import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Auth() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const from = location.state?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Tentando login com:', { email: loginEmail, password: '***' });
      
      // Usar API PostgreSQL
      const { error } = await signIn(loginEmail.trim().toLowerCase(), loginPassword);

      if (error) {
        console.error('Erro de login:', error);
        setError(`Erro de autenticação: ${error.message}`);
      } else {
        console.log('Login bem-sucedido');
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Instituto Move Marias</CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestão - Acesso Restrito
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(errors.email || errors.password) && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {errors.email?.message || errors.password?.message}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit(async (data) => {
            const { error } = await signIn(data.email, data.password);
            if (error) {
              return;
            }
            navigate(from, { replace: true });
          })} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email"
                {...register('email')}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                                  type={showPassword ? "text" : "password"}
                  placeholder="senha"
                  {...register('password')}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Credenciais padrão:</p>
            <p>Email: bruno@move.com</p>
            <p>Senha: 15002031</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}