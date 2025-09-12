import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Tipagem segura do state vindo do ProtectedRoute
type LocationState = {
  from?: { pathname: string };
} | null;

export default function Auth() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || null;

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
  });

  const from = state?.from?.pathname || "/";

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // se já logado, não renderiza nada (ou poderia <Navigate to={from} replace />)
  if (user) return null;

  // Detecta ambiente dev p/ mostrar credenciais de exemplo
  const isDev = useMemo(() => {
    // Vite: import.meta.env.DEV / CRA: process.env.NODE_ENV === 'development'
    // Fazemos um fallback seguro que funciona em ambos.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viteDev = typeof import.meta !== "undefined" && (import.meta as any)?.env?.DEV;
    const craDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
    return Boolean(viteDev || craDev);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center shadow-primary">
              <Heart className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Instituto Move Marias</CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestão — Acesso Restrito
          </CardDescription>
        </CardHeader>

        <CardContent>
          {(errors.email || errors.password || authError) && (
            <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive" data-testid="error-message">
              <AlertDescription>
                {authError || errors.email?.message || errors.password?.message}
              </AlertDescription>
            </Alert>
          )}

          <form
            data-testid="login-form"
            onSubmit={handleSubmit(async (data) => {
              setAuthError(null);
              const { error } = await signIn(data.email, data.password);
              if (error) {
                // opcional: setar erro do RHF nos campos
                setError("email", { message: "Credenciais inválidas" });
                setError("password", { message: " " }); // espaço para manter layout
                setAuthError("Email e/ou senha incorretos. Tente novamente.");
                return;
              }
              navigate(from, { replace: true });
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email"
                autoComplete="email"
                autoFocus
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={isSubmitting}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="senha"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  disabled={isSubmitting}
                  {...register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="login-button">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {isDev && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Credenciais padrão (dev):</p>
              <p>Email: bruno@move.com</p>
              <p>Senha: 15002031</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
