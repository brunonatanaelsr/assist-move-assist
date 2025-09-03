import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function FormulariosNavegacao() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/beneficiarias')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Beneficiárias
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Formulários e Documentos</h1>
            <p className="text-muted-foreground">
              Selecione uma beneficiária para acessar os formulários
            </p>
          </div>
        </div>

        {/* Aviso */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Ação Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              Para acessar os formulários específicos, você precisa:
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-orange-700">
              <li>Navegar para a lista de <strong>Beneficiárias</strong></li>
              <li>Selecionar uma beneficiária específica</li>
              <li>Acessar os formulários através do perfil da beneficiária</li>
            </ol>
          </CardContent>
        </Card>

        {/* Links de Navegação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/beneficiarias')}>
            <CardHeader>
              <CardTitle>Lista de Beneficiárias</CardTitle>
              <CardDescription>
                Acesse a lista completa de beneficiárias cadastradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Ver Beneficiárias
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/beneficiarias/nova')}>
            <CardHeader>
              <CardTitle>Nova Beneficiária</CardTitle>
              <CardDescription>
                Cadastre uma nova beneficiária no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Cadastrar Beneficiária
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Formulários Disponíveis</CardTitle>
            <CardDescription>
              Os seguintes formulários estão disponíveis para cada beneficiária:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Formulários de Avaliação:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Anamnese Social</li>
                  <li>• Roda da Vida</li>
                  <li>• Ficha de Evolução</li>
                  <li>• Visão Holística</li>
                  <li>• Plano de Ação</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Documentos:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Declarações e Recibos</li>
                  <li>• Termos de Consentimento</li>
                  <li>• Matrícula em Projetos</li>
                  <li>• Evolução da Beneficiária</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
