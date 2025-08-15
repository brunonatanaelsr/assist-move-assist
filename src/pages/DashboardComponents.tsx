import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardComponents() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste Componentes</h1>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Teste Card</CardTitle>
            <CardDescription>Este é um card de teste</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Conteúdo do card</p>
          </CardContent>
        </Card>
        
        <Button>Teste Button</Button>
        
        <Badge>Teste Badge</Badge>
      </div>
    </div>
  );
}
