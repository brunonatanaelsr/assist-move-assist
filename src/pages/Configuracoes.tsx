import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const Configuracoes = () => {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="geral">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>
              {/* Adicione configurações gerais aqui */}
            </TabsContent>

            <TabsContent value="notificacoes">
              <h3 className="text-lg font-semibold mb-4">Configurações de Notificações</h3>
              {/* Adicione configurações de notificações aqui */}
            </TabsContent>

            <TabsContent value="sistema">
              <h3 className="text-lg font-semibold mb-4">Configurações do Sistema</h3>
              {/* Adicione configurações do sistema aqui */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
