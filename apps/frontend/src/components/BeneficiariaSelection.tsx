import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface BeneficiariaSelectionProps {
  title: string;
  description: string;
}

export function BeneficiariaSelection({ title, description }: BeneficiariaSelectionProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Beneficiária</CardTitle>
          <CardDescription>
            Para preencher este formulário, você precisa selecionar uma beneficiária específica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vá para a página de beneficiárias e selecione uma para acessar seus formulários.
            </p>
            <Button asChild>
              <Link to="/beneficiarias">Ver Beneficiárias</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}