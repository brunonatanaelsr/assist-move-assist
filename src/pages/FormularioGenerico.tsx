import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const formularioTitles: { [key: string]: string } = {
  "declaracao": "Declaração de Comparecimento",
  "recibo": "Recibo de Benefício", 
  "anamnese": "Anamnese Social",
  "evolucao": "Ficha de Evolução",
  "termo": "Termo de Consentimento",
  "visao": "Visão Holística",
  "roda-vida": "Roda da Vida",
  "plano": "Plano de Ação",
  "matricula": "Matrícula de Projetos"
};

export default function FormularioGenerico() {
  const { tipo } = useParams();
  const titulo = formularioTitles[tipo || ""] || "Formulário";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link to="/beneficiarias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{titulo}</h1>
          <p className="text-muted-foreground">
            Formulário em desenvolvimento
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {titulo}
          </CardTitle>
          <CardDescription>
            Esta funcionalidade está sendo desenvolvida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            O formulário "{titulo}" estará disponível em breve.
          </p>
          <div className="flex gap-2">
            <Button disabled>
              Preencher Formulário
            </Button>
            <Button variant="outline" asChild>
              <Link to="/beneficiarias">Voltar às Beneficiárias</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
