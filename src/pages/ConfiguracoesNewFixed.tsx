import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Users, Edit, Trash2, Plus } from 'lucide-react';
import UserForm from '@/components/UserForm';
import { useToast } from '@/components/ui/use-toast';

interface UserProfile {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  tipo_usuario: string;
  ativo: boolean;
  data_criacao: string;
  ultimo_acesso: string;
  foto_url?: string;
}

// Mock data
const mockUsers: UserProfile[] = [
  {
    id: '1',
    nome_completo: 'Admin do Sistema',
    email: 'admin@example.com',
    tipo_usuario: 'admin',
    ativo: true,
    data_criacao: '2025-08-25',
    ultimo_acesso: '2025-08-25'
  }
];

export default function Configuracoes() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [activeTab, setActiveTab] = useState('usuarios');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const handleUserSubmit = (formData: any) => {
    try {
      if (editingUser) {
        // Atualizar usuário existente
        setUsers(users => users.map(user =>
          user.id === editingUser.id
            ? { ...user, ...formData }
            : user
        ));
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso",
        });
      } else {
        // Criar novo usuário
        const newUser: UserProfile = {
          id: Date.now().toString(),
          ...formData,
          ativo: true,
          data_criacao: new Date().toISOString(),
          ultimo_acesso: new Date().toISOString()
        };
        setUsers(users => [...users, newUser]);
        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso",
        });
      }
      setShowUserForm(false);
      setEditingUser(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar usuário",
        variant: "destructive"
      });
    }
  };

  const handleUserDelete = (userId: string) => {
    try {
      setUsers(users.filter(user => user.id !== userId));
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover usuário",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  return (
    <div className="container mx-auto py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div>Usuários</div>
                <Button onClick={() => setShowUserForm(true)}>
                  <Plus className="mr-2" /> Adicionar Usuário
                </Button>

                <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                      </DialogTitle>
                    </DialogHeader>
                    <UserForm
                      onSubmit={handleUserSubmit}
                      onCancel={() => {
                        setShowUserForm(false);
                        setEditingUser(null);
                      }}
                      initialData={editingUser || undefined}
                    />
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.foto_url} />
                        <AvatarFallback>
                          {user.nome_completo?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.nome_completo}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <Badge>{user.tipo_usuario}</Badge>
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUserDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
