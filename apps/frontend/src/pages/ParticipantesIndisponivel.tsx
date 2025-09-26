import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, UsersRound } from "lucide-react";

const ParticipantesIndisponivel = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="max-w-2xl w-full shadow-lg border-border">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <UsersRound className="h-8 w-8 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Área de participantes indisponível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground text-center">
          <p>
            A gestão de participantes está temporariamente desativada enquanto
            migramos os dados para uma nova experiência. Durante esse período,
            utilize os relatórios de beneficiárias ou fale com o suporte para
            obter informações específicas.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                Voltar ao painel
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:suporte@institutoelas.org.br">
                <AlertTriangle className="mr-2 h-4 w-4" aria-hidden />
                Falar com o suporte
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParticipantesIndisponivel;
