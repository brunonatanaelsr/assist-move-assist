import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await forgotPassword.mutateAsync({ email });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle>Email enviado!</CardTitle>
            <CardDescription>
              Enviamos instruções para recuperar sua senha para {email}. Por favor,
              verifique sua caixa de entrada.
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmail('');
                setSubmitted(false);
              }}
            >
              Tentar outro email
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Lembrou sua senha?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entre aqui
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Digite seu email e enviaremos instruções para recuperar sua senha
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={forgotPassword.isPending}
            >
              {forgotPassword.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Enviar instruções'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Lembrou sua senha?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entre aqui
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
