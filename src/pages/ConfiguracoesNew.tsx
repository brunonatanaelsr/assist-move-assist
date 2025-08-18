import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Settings, 
  Users, 
  Shield, 
  Key, 
  Trash2, 
  Plus, 
  Edit, 
  User,
  Camera,
  Save,
  Download,
  FileText,
  Database,
  Server,
  Palette,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Upload,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/usePostgreSQLAuth';
import { useToast } from '@/components/ui/use-toast';
import { exportarDados, exportarBeneficiarias, exportarProjetos, exportarOficinas } from '@/utils/exportService';

interface UserProfile {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  foto_url?: string;
  bio?: string;
  tipo_usuario: 'super_admin' | 'admin' | 'coordenador' | 'profissional' | 'assistente';
  ativo: boolean;
  data_criacao: string;
  ultimo_acesso?: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  module: string;
  permission: 'read' | 'write' | 'admin';
  user_name: string;
}

interface SystemConfig {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
}

interface ExportConfig {
  formato: 'pdf' | 'excel' | 'csv';
  dados: 'beneficiarias' | 'oficinas' | 'projetos' | 'formularios' | 'todos';
  periodo: 'ultimo_mes' | 'ultimo_trimestre' | 'ultimo_ano' | 'personalizado';
  data_inicio?: string;
  data_fim?: string;
}

// Mock data para desenvolvimento
const mockUsers: UserProfile[] = [
  {
    id: '1',
    user_id: '1',
    nome_completo: 'Ana Silva Santos',
    email: 'ana.santos@movemarias.org',
    telefone: '(11) 99999-1111',
    cargo: 'Coordenadora Geral',
    departamento: 'Coordenação',
    foto_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b526?w=400',
    bio: 'Coordenadora com 8 anos de experiência em projetos sociais.',
    tipo_usuario: 'super_admin',
    ativo: true,
    data_criacao: '2024-01-01',
    ultimo_acesso: '2024-08-07'
  },
  {
    id: '2',
    user_id: '2',
    nome_completo: 'Maria Oliveira',
    email: 'maria.oliveira@movemarias.org',
    telefone: '(11) 99999-2222',
    cargo: 'Assistente Social',
    departamento: 'Atendimento',
    foto_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Assistente social especializada em acompanhamento familiar.',
    tipo_usuario: 'profissional',
    ativo: true,
    data_criacao: '2024-02-01',
    ultimo_acesso: '2024-08-06'
  },
  {
    id: '3',
    user_id: '3',
    nome_completo: 'Carlos Roberto',
    email: 'carlos.roberto@movemarias.org',
    telefone: '(11) 99999-3333',
    cargo: 'Coordenador de Projetos',
    departamento: 'Projetos',
    foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    bio: 'Responsável pela gestão e coordenação de projetos sociais.',
    tipo_usuario: 'coordenador',
    ativo: true,
    data_criacao: '2024-03-01',
    ultimo_acesso: '2024-08-05'
  }
];

const mockPermissions: UserPermission[] = [
  { id: '1', user_id: '1', module: 'beneficiarias', permission: 'admin', user_name: 'Ana Silva Santos' },
  { id: '2', user_id: '1', module: 'oficinas', permission: 'admin', user_name: 'Ana Silva Santos' },
  { id: '3', user_id: '1', module: 'projetos', permission: 'admin', user_name: 'Ana Silva Santos' },
  { id: '4', user_id: '1', module: 'usuarios', permission: 'admin', user_name: 'Ana Silva Santos' },
  { id: '5', user_id: '2', module: 'beneficiarias', permission: 'write', user_name: 'Maria Oliveira' },
  { id: '6', user_id: '2', module: 'formularios', permission: 'write', user_name: 'Maria Oliveira' },
  { id: '7', user_id: '3', module: 'oficinas', permission: 'admin', user_name: 'Carlos Roberto' },
  { id: '8', user_id: '3', module: 'projetos', permission: 'admin', user_name: 'Carlos Roberto' }
];

const mockSystemConfig: SystemConfig[] = [
  { id: '1', chave: 'nome_organizacao', valor: 'Move Marias', descricao: 'Nome da organização', tipo: 'string' },
  { id: '2', chave: 'email_organizacao', valor: 'contato@movemarias.org', descricao: 'Email oficial', tipo: 'string' },
  { id: '3', chave: 'telefone_organizacao', valor: '(11) 3333-4444', descricao: 'Telefone oficial', tipo: 'string' },
  { id: '4', chave: 'endereco_organizacao', valor: 'Rua das Flores, 123', descricao: 'Endereço da sede', tipo: 'string' },
  { id: '5', chave: 'max_beneficiarias', valor: '1000', descricao: 'Máximo de beneficiárias', tipo: 'number' },
  { id: '6', chave: 'backup_automatico', valor: 'true', descricao: 'Backup automático habilitado', tipo: 'boolean' },
  { id: '7', chave: 'notificacoes_email', valor: 'true', descricao: 'Notificações por email', tipo: 'boolean' }
];

const modules = [
  { value: 'beneficiarias', label: 'Beneficiárias', icon: Users },
  { value: 'formularios', label: 'Formulários', icon: FileText },
  { value: 'oficinas', label: 'Oficinas', icon: Users },
  { value: 'projetos', label: 'Projetos', icon: Users },
  { value: 'relatorios', label: 'Relatórios', icon: FileText },
  { value: 'usuarios', label: 'Usuários', icon: Users },
  { value: 'configuracoes', label: 'Configurações', icon: Settings }
];

const tiposUsuario = [
  { value: 'super_admin', label: 'Super Administrador', color: 'bg-red-100 text-red-800' },
  { value: 'admin', label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
  { value: 'coordenador', label: 'Coordenador', color: 'bg-blue-100 text-blue-800' },
  { value: 'profissional', label: 'Profissional', color: 'bg-green-100 text-green-800' },
  { value: 'assistente', label: 'Assistente', color: 'bg-gray-100 text-gray-800' }
];

const permissions = [
  { value: 'read', label: 'Visualizar', color: 'bg-gray-100 text-gray-800' },
  { value: 'write', label: 'Editar', color: 'bg-blue-100 text-blue-800' },
  { value: 'admin', label: 'Administrar', color: 'bg-red-100 text-red-800' }
];

export default function Configuracoes() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>(mockPermissions);
  const [systemConfig, setSystemConfig] = useState<SystemConfig[]>(mockSystemConfig);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('perfil');
  
  // Estados para formulários
  const [showUserForm, setShowUserForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    formato: 'pdf',
    dados: 'beneficiarias',
    periodo: 'ultimo_mes'
  });
  
  // Estados para perfil pessoal
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nome_completo: profile?.nome_completo || '',
    email: profile?.email || '',
    telefone: '',
    cargo: '',
    bio: '',
    foto_url: profile?.foto_url || ''
  });

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      // Em produção, salvar no banco de dados
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
      setEditingProfile(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (formData: FormData) => {
    try {
      setLoading(true);
      const newUser: UserProfile = {
        id: Date.now().toString(),
        user_id: Date.now().toString(),
        nome_completo: formData.get('nome_completo') as string,
        email: formData.get('email') as string,
        telefone: formData.get('telefone') as string,
        cargo: formData.get('cargo') as string,
        departamento: formData.get('departamento') as string,
        tipo_usuario: formData.get('tipo_usuario') as UserProfile['tipo_usuario'],
        ativo: true,
        data_criacao: new Date().toISOString(),
        foto_url: ''
      };
      
      setUsers(prev => [...prev, newUser]);
      setShowUserForm(false);
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o usuário.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async (formData: FormData) => {
    try {
      setLoading(true);
      const userId = formData.get('user_id') as string;
      const user = users.find(u => u.id === userId);
      
      const newPermission: UserPermission = {
        id: Date.now().toString(),
        user_id: userId,
        module: formData.get('module') as string,
        permission: formData.get('permission') as UserPermission['permission'],
        user_name: user?.nome_completo || ''
      };
      
      setUserPermissions(prev => [...prev, newPermission]);
      setShowPermissionForm(false);
      toast({
        title: "Sucesso",
        description: "Permissão adicionada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a permissão.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      
      const filename = `export_${exportConfig.dados}_${exportConfig.formato}_${new Date().toISOString().split('T')[0]}`;
      
      toast({
        title: "Exportação iniciada",
        description: `Preparando arquivo ${filename}...`
      });
      
      // Dados mock para exportação baseados no tipo selecionado
      let dados: Record<string, unknown>[] = [];
      let titulo = '';
      
      switch (exportConfig.dados) {
        case 'formularios':
          dados = mockUsers.map(user => ({
            nome: user.nome_completo,
            email: user.email,
            cargo: user.cargo || 'Não informado',
            departamento: user.departamento || 'Não informado',
            tipoUsuario: user.tipo_usuario,
            status: user.ativo ? 'Ativo' : 'Inativo'
          }));
          titulo = 'Relatório de Usuários';
          break;
          
        case 'beneficiarias':
          // Dados mock de beneficiárias
          dados = [
            { nome: 'Maria Silva', idade: 28, telefone: '(11) 99999-9999', email: 'maria@example.com', profissao: 'Cozinheira', status: 'Ativa' },
            { nome: 'Ana Santos', idade: 35, telefone: '(11) 88888-8888', email: 'ana@example.com', profissao: 'Costureira', status: 'Ativa' },
            { nome: 'Joana Oliveira', idade: 42, telefone: '(11) 77777-7777', email: 'joana@example.com', profissao: 'Diarista', status: 'Pausada' }
          ];
          titulo = 'Relatório de Beneficiárias';
          break;
          
        case 'projetos':
          dados = [
            { nome: 'Capacitação em Culinária', dataInicio: '2024-01-15', status: 'Ativo', coordenador: 'Ana Silva', vagasTotal: 20, vagasOcupadas: 15 },
            { nome: 'Curso de Costura', dataInicio: '2024-02-01', status: 'Ativo', coordenador: 'Maria Santos', vagasTotal: 15, vagasOcupadas: 12 },
            { nome: 'Empreendedorismo Feminino', dataInicio: '2024-03-01', status: 'Planejado', coordenador: 'Joana Lima', vagasTotal: 25, vagasOcupadas: 0 }
          ];
          titulo = 'Relatório de Projetos';
          break;
          
        case 'oficinas':
          dados = [
            { nome: 'Oficina de Pintura', instrutor: 'Carlos Silva', dataInicio: '2024-01-10', local: 'Sala 1', status: 'Ativa', vagasTotal: 10, vagasOcupadas: 8 },
            { nome: 'Oficina de Artesanato', instrutor: 'Lucia Santos', dataInicio: '2024-02-05', local: 'Sala 2', status: 'Ativa', vagasTotal: 12, vagasOcupadas: 10 }
          ];
          titulo = 'Relatório de Oficinas';
          break;
          
        default:
          dados = mockUsers;
          titulo = 'Relatório Geral';
      }
      
      // Chamar a função de exportação apropriada
      const options = {
        formato: exportConfig.formato as 'pdf' | 'excel' | 'csv',
        dados,
        filename,
        titulo
      };
      
      switch (exportConfig.dados) {
        case 'beneficiarias':
          await exportarBeneficiarias(options);
          break;
        case 'projetos':
          await exportarProjetos(options);
          break;
        case 'oficinas':
          await exportarOficinas(options);
          break;
        default:
          await exportarDados(options);
      }
      
      toast({
        title: "Exportação concluída",
        description: "Arquivo baixado com sucesso!"
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSystemConfig = async (configId: string, newValue: string) => {
    try {
      setSystemConfig(prev => prev.map(config => 
        config.id === configId ? { ...config, valor: newValue } : config
      ));
      
      toast({
        title: "Sucesso",
        description: "Configuração atualizada!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a configuração.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600">Gerencie perfis, permissões e configurações do sistema</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Dados
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Dados</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Formato</Label>
                  <Select value={exportConfig.formato} onValueChange={(value: ExportConfig['formato']) =>
                    setExportConfig(prev => ({...prev, formato: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dados</Label>
                  <Select value={exportConfig.dados} onValueChange={(value: ExportConfig['dados']) =>
                    setExportConfig(prev => ({...prev, dados: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beneficiarias">Beneficiárias</SelectItem>
                      <SelectItem value="oficinas">Oficinas</SelectItem>
                      <SelectItem value="projetos">Projetos</SelectItem>
                      <SelectItem value="formularios">Formulários</SelectItem>
                      <SelectItem value="todos">Todos os dados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={exportConfig.periodo} onValueChange={(value: ExportConfig['periodo']) =>
                    setExportConfig(prev => ({...prev, periodo: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ultimo_mes">Último mês</SelectItem>
                      <SelectItem value="ultimo_trimestre">Último trimestre</SelectItem>
                      <SelectItem value="ultimo_ano">Último ano</SelectItem>
                      <SelectItem value="personalizado">Período personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {exportConfig.periodo === 'personalizado' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data início</Label>
                      <Input type="date" />
                    </div>
                    <div>
                      <Label>Data fim</Label>
                      <Input type="date" />
                    </div>
                  </div>
                )}
                <Button onClick={handleExportData} disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Exportar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="perfil">
            <User className="h-4 w-4 mr-2" />
            Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="permissoes">
            <Shield className="h-4 w-4 mr-2" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="sistema">
            <Settings className="h-4 w-4 mr-2" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="banco">
            <Database className="h-4 w-4 mr-2" />
            Banco de Dados
          </TabsTrigger>
        </TabsList>

        {/* Aba Meu Perfil */}
        <TabsContent value="perfil" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Perfil Pessoal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileData.foto_url} />
                    <AvatarFallback className="text-lg">
                      {profileData.nome_completo.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{profileData.nome_completo}</h3>
                  <p className="text-gray-600">{profileData.email}</p>
                  <Badge className={tiposUsuario.find(t => t.value === profile?.tipo_usuario)?.color}>
                    {tiposUsuario.find(t => t.value === profile?.tipo_usuario)?.label}
                  </Badge>
                </div>
                <Button
                  onClick={() => setEditingProfile(!editingProfile)}
                  variant={editingProfile ? "outline" : "default"}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {editingProfile ? 'Cancelar' : 'Editar'}
                </Button>
              </div>

              {editingProfile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={profileData.nome_completo}
                      onChange={(e) => setProfileData(prev => ({...prev, nome_completo: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({...prev, email: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={profileData.telefone}
                      onChange={(e) => setProfileData(prev => ({...prev, telefone: e.target.value}))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Input
                      value={profileData.cargo}
                      onChange={(e) => setProfileData(prev => ({...prev, cargo: e.target.value}))}
                      placeholder="Seu cargo"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({...prev, bio: e.target.value}))}
                      placeholder="Conte um pouco sobre você..."
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setEditingProfile(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Usuários */}
        <TabsContent value="usuarios" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Gerenciar Usuários ({users.length})</span>
              </CardTitle>
              {isAdmin && (
                <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Usuário</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleAddUser(new FormData(e.target as HTMLFormElement));
                    }} className="space-y-4">
                      <div>
                        <Label>Nome Completo</Label>
                        <Input name="nome_completo" required />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input name="email" type="email" required />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input name="telefone" />
                      </div>
                      <div>
                        <Label>Cargo</Label>
                        <Input name="cargo" />
                      </div>
                      <div>
                        <Label>Departamento</Label>
                        <Input name="departamento" />
                      </div>
                      <div>
                        <Label>Tipo de Usuário</Label>
                        <Select name="tipo_usuario" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposUsuario.map(tipo => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowUserForm(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Criar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.foto_url} />
                        <AvatarFallback>
                          {user.nome_completo.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{user.nome_completo}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500">{user.cargo} - {user.departamento}</p>
                        {user.ultimo_acesso && (
                          <p className="text-xs text-gray-400">
                            Último acesso: {new Date(user.ultimo_acesso).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={tiposUsuario.find(t => t.value === user.tipo_usuario)?.color}>
                        {tiposUsuario.find(t => t.value === user.tipo_usuario)?.label}
                      </Badge>
                      <Badge variant={user.ativo ? "default" : "secondary"}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {isAdmin && (
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Permissões */}
        <TabsContent value="permissoes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Permissões por Módulo</span>
              </CardTitle>
              {isAdmin && (
                <Dialog open={showPermissionForm} onOpenChange={setShowPermissionForm}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Permissão
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Permissão</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleAddPermission(new FormData(e.target as HTMLFormElement));
                    }} className="space-y-4">
                      <div>
                        <Label>Usuário</Label>
                        <Select name="user_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.nome_completo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Módulo</Label>
                        <Select name="module" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o módulo" />
                          </SelectTrigger>
                          <SelectContent>
                            {modules.map(module => (
                              <SelectItem key={module.value} value={module.value}>
                                {module.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Permissão</Label>
                        <Select name="permission" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a permissão" />
                          </SelectTrigger>
                          <SelectContent>
                            {permissions.map(perm => (
                              <SelectItem key={perm.value} value={perm.value}>
                                {perm.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowPermissionForm(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Adicionar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module) => {
                  const modulePermissions = userPermissions.filter(p => p.module === module.value);
                  return (
                    <div key={module.value} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <module.icon className="h-5 w-5" />
                        <h3 className="font-medium">{module.label}</h3>
                        <Badge variant="outline">{modulePermissions.length} usuários</Badge>
                      </div>
                      <div className="space-y-2">
                        {modulePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between text-sm">
                            <span>{permission.user_name}</span>
                            <div className="flex items-center space-x-2">
                              <Badge className={permissions.find(p => p.value === permission.permission)?.color}>
                                {permissions.find(p => p.value === permission.permission)?.label}
                              </Badge>
                              {isAdmin && (
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {modulePermissions.length === 0 && (
                          <p className="text-gray-500 text-sm">Nenhuma permissão configurada</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Sistema */}
        <TabsContent value="sistema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configurações do Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemConfig.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{config.descricao}</h4>
                    <p className="text-sm text-gray-600">{config.chave}</p>
                  </div>
                  <div className="w-48">
                    {config.tipo === 'boolean' ? (
                      <Switch
                        checked={config.valor === 'true'}
                        onCheckedChange={(checked) => 
                          handleUpdateSystemConfig(config.id, checked.toString())
                        }
                      />
                    ) : (
                      <Input
                        value={config.valor}
                        onChange={(e) => handleUpdateSystemConfig(config.id, e.target.value)}
                        type={config.tipo === 'number' ? 'number' : 'text'}
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Banco de Dados */}
        <TabsContent value="banco" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Configurações do Banco de Dados</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center space-x-2">
                    <Server className="h-4 w-4" />
                    <span>Status da Conexão</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>PostgreSQL conectado</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Host: localhost</p>
                    <p>Porta: 5432</p>
                    <p>Banco: move_marias_prod</p>
                    <p>Última sincronização: {new Date().toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Ações de Manutenção</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Fazer Backup
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      Restaurar Backup
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Executar Migrações
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verificar Integridade
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Estatísticas do Banco</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">45</p>
                    <p className="text-sm text-gray-600">Tabelas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">1.2K</p>
                    <p className="text-sm text-gray-600">Registros</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">85MB</p>
                    <p className="text-sm text-gray-600">Tamanho</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">99%</p>
                    <p className="text-sm text-gray-600">Disponibilidade</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
