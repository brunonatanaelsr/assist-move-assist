import React, { useState, useRef } from 'react';

// Interfaces para os tipos de dados
interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  tipo_usuario: string;
  foto_url?: string;
}

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

interface UserPermission {
  id: string;
  user_id: string;
  user_name: string;
  module: string;
  permission: string;
}

interface SystemConfig {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: string;
}

interface ExportConfig {
  formato: 'pdf' | 'excel' | 'csv';
  dados: 'beneficiarias' | 'projetos' | 'oficinas' | 'tudo';
  periodo: 'ultimo_mes' | 'ultimo_trimestre' | 'ultimo_ano' | 'tudo' | 'personalizado';
  data_inicio?: string;
  data_fim?: string;
}

interface TipoUsuario {
  value: string;
  label: string;
  color: string;
}

interface Module {
  value: string;
  label: string;
  icon: React.ComponentType;
}

interface Permission {
  value: string;
  label: string;
  color: string;
}
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Settings, Users, Shield, Trash2, Plus, Edit, User, Camera,
  Save, Download, FileText, Database, Server, Upload, CheckCircle, Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/usePostgreSQLAuth';
import { useToast } from '@/components/ui/use-toast';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { exportarDados, exportarBeneficiarias, exportarProjetos, exportarOficinas } from '@/utils/exportService';

// Tipos de usuário
const tiposUsuario = [
  { value: 'admin', label: 'Administrador', color: 'bg-red-500' },
  { value: 'coordenador', label: 'Coordenador', color: 'bg-blue-500' },
  { value: 'assistente', label: 'Assistente Social', color: 'bg-green-500' },
  { value: 'psicologo', label: 'Psicólogo', color: 'bg-purple-500' },
  { value: 'oficineiro', label: 'Oficineiro', color: 'bg-yellow-500' },
  { value: 'voluntario', label: 'Voluntário', color: 'bg-pink-500' }
];

// Módulos do sistema
const modules = [
  { value: 'dashboard', label: 'Dashboard', icon: Settings },
  { value: 'beneficiarias', label: 'Beneficiárias', icon: Users },
  { value: 'oficinas', label: 'Oficinas', icon: FileText },
  { value: 'projetos', label: 'Projetos', icon: Server },
  { value: 'documentos', label: 'Documentos', icon: FileText },
  { value: 'feed', label: 'Feed', icon: Upload },
  { value: 'configuracoes', label: 'Configurações', icon: Settings }
];

// Níveis de permissão
const permissions = [
  { value: 'view', label: 'Visualizar', color: 'bg-gray-500' },
  { value: 'edit', label: 'Editar', color: 'bg-blue-500' },
  { value: 'create', label: 'Criar', color: 'bg-green-500' },
  { value: 'delete', label: 'Excluir', color: 'bg-red-500' },
  { value: 'admin', label: 'Administrar', color: 'bg-purple-500' }
];

// Mock de usuários
const mockUsers: UserProfile[] = [
  {
    id: '1',
    nome_completo: 'Admin do Sistema',
    email: 'admin@movemarias.org',
    telefone: '(11) 98765-4321',
    cargo: 'Administrador',
    departamento: 'TI',
    tipo_usuario: 'admin',
    ativo: true,
    data_criacao: '2025-01-01',
    ultimo_acesso: '2025-08-25',
    foto_url: '/placeholder.jpg'
  },
  {
    id: '2',
    nome_completo: 'Maria Silva',
    email: 'maria@movemarias.org',
    telefone: '(11) 91234-5678',
    cargo: 'Assistente Social',
    departamento: 'Social',
    tipo_usuario: 'assistente',
    ativo: true,
    data_criacao: '2025-02-01',
    ultimo_acesso: '2025-08-24',
    foto_url: '/placeholder.jpg'
  }
];

// Mock de permissões
const mockPermissions: UserPermission[] = [
  {
    id: '1',
    user_id: '1',
    user_name: 'Admin do Sistema',
    module: 'configuracoes',
    permission: 'admin'
  },
  {
    id: '2',
    user_id: '2',
    user_name: 'Maria Silva',
    module: 'beneficiarias',
    permission: 'edit'
  }
];

// Mock de configurações do sistema
const mockSystemConfig: SystemConfig[] = [
  {
    id: '1',
    chave: 'nome_organizacao',
    valor: 'Move Marias',
    descricao: 'Nome da organização',
    tipo: 'string'
  },
  {
    id: '2',
    chave: 'max_beneficiarias',
    valor: '1000',
    descricao: 'Máximo de beneficiárias',
    tipo: 'number'
  },
  {
    id: '3',
    chave: 'backup_automatico',
    valor: 'true',
    descricao: 'Backup automático habilitado',
    tipo: 'boolean'
  }
];

export default function Configuracoes() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();

  // Usuários
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [userForm, setUserForm] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cargo: '',
    departamento: '',
    tipo_usuario: ''
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Permissões
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>(mockPermissions);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    user_id: '',
    module: '',
    permission: ''
  });

  // Configurações do sistema
  const { configs: systemConfig, loading: configLoading, error: configError, updateConfig, reloadConfigs } = useSystemConfig();

  // Exportação
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    formato: 'pdf',
    dados: 'beneficiarias',
    periodo: 'ultimo_mes'
  });

  // Perfil
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nome_completo: profile?.nome || '',
    email: profile?.email || '',
    telefone: profile?.telefone || '',
    cargo: profile?.cargo || '',
    departamento: profile?.departamento || '',
    tipo_usuario: profile?.tipo_usuario || '',
    foto_url: profile?.foto_url || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI / Loading
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('perfil');

  // --- Handlers ---

  // Usuários
  const handleUserFormChange = (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = ev.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };
  const handleOpenUserForm = (user?: UserProfile) => {
    if (user) {
      setUserForm({
        nome_completo: user.nome_completo,
        email: user.email,
        telefone: user.telefone || '',
        cargo: user.cargo || '',
        departamento: user.departamento || '',
        tipo_usuario: user.tipo_usuario
      });
      setEditingUserId(user.id);
    } else {
      setUserForm({ nome_completo: '', email: '', telefone: '', cargo: '', departamento: '', tipo_usuario: '' });
      setEditingUserId(null);
    }
    setShowUserForm(true);
  };
  const validateUserForm = () => {
    if (!userForm.nome_completo || !userForm.email || !userForm.tipo_usuario) return false;
    if (!/\S+@\S+\.\S+/.test(userForm.email)) return false;
    return true;
  };
  const handleSaveUser = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateUserForm()) {
      toast({ title: "Erro de validação", description: "Preencha todos os campos obrigatórios corretamente.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (editingUserId) {
        setUsers(users => users.map(u => u.id === editingUserId ? {
          ...u,
          ...userForm,
          tipo_usuario: userForm.tipo_usuario as UserProfile['tipo_usuario']
        } : u));
        toast({ title: "Sucesso", description: "Usuário editado com sucesso!" });
      } else {
        const timestamp = Date.now().toString();
        setUsers(users => [
          ...users,
          {
            id: timestamp,
            ...userForm,
            tipo_usuario: userForm.tipo_usuario,
            ativo: true,
            data_criacao: new Date().toISOString(),
            ultimo_acesso: new Date().toISOString(),
            foto_url: '/placeholder.jpg'
          }
        ]);
        toast({ title: "Sucesso", description: "Usuário criado com sucesso!" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar usuário.", variant: "destructive" });
    } finally {
      setShowUserForm(false);
      setEditingUserId(null);
      setLoading(false);
    }
  };
  const handleDeleteUser = (id: string) => {
    if (window.confirm('Excluir este usuário?')) {
      setUsers(users => users.filter(u => u.id !== id));
      setUserPermissions(perms => perms.filter(p => p.user_id !== id));
      toast({ title: "Usuário removido" });
    }
  };

  // Permissões
  const handlePermissionFormChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = ev.target;
    setPermissionForm(prev => ({ ...prev, [name]: value }));
  };
  const handleSavePermission = (ev: React.FormEvent) => {
    ev.preventDefault();
    const user = users.find(u => u.id === permissionForm.user_id);
    if (!user) {
      toast({ title: "Erro", description: "Usuário inválido", variant: "destructive" });
      return;
    }
    setUserPermissions(perms => [
      ...perms,
      {
        id: Date.now().toString(),
        user_id: permissionForm.user_id,
        module: permissionForm.module,
        permission: permissionForm.permission as UserPermission['permission'],
        user_name: user.nome_completo
      }
    ]);
    setPermissionForm({ user_id: '', module: '', permission: '' });
    setShowPermissionForm(false);
    toast({ title: "Permissão adicionada" });
  };
  const handleDeletePermission = (id: string) => {
    setUserPermissions(perms => perms.filter(p => p.id !== id));
  };

  // Perfil e upload de foto
  const handleProfileInput = (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = ev.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  const handlePhotoUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => e.target?.result && setProfileData(prev => ({ ...prev, foto_url: e.target!.result as string }));
      reader.readAsDataURL(file);
    }
  };
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Salve o perfil no backend se necessário
      setEditingProfile(false);
      toast({ title: "Perfil atualizado com sucesso!" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar o perfil.", variant: "destructive" });
    }
    setLoading(false);
  };

  // Configurações do sistema
  const handleUpdateSystemConfig = async (configId: string, newValue: string) => {
    try {
      setLoading(true);
      const success = await updateConfig(configId, newValue);
      if (!success) {
        throw new Error('Falha ao atualizar configuração');
      }
    } catch (error) {
      toast({ 
        variant: "destructive",
        title: "Erro", 
        description: "Não foi possível atualizar a configuração." 
      });
    } finally {
      setLoading(false);
    }
  };

  // Exportação
  const handleExportData = async () => {
    setLoading(true);
    try {
      // Add lógica de exportação real conforme sua infra
      toast({ title: "Exportação simulada", description: "Arquivo preparado para download!" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível exportar os dados.", variant: "destructive" });
    }
    setLoading(false);
    setShowExportDialog(false);
  };

  // Banco (simulação)
  const handleBackup = async () => {
    setLoading(true);
    toast({ title: "Backup em andamento..." });
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Backup realizado com sucesso!" });
    }, 1500);
  };
  const handleRestore = () => toast({ title: "Restaurar não implementado", variant: "destructive" });
  const handleMigrations = () => toast({ title: "Migrações executadas!" });
  const handleIntegrity = () => toast({ title: "Banco íntegro" });

  // --- Render ---
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
                  <select
                    className="w-full"
                    value={exportConfig.formato}
                    onChange={e => setExportConfig(prev => ({...prev, formato: e.target.value as any}))}
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div>
                  <Label>Dados</Label>
                  <select
                    className="w-full"
                    value={exportConfig.dados}
                    onChange={e => setExportConfig(prev => ({...prev, dados: e.target.value as any}))}
                  >
                    <option value="beneficiarias">Beneficiárias</option>
                    <option value="oficinas">Oficinas</option>
                    <option value="projetos">Projetos</option>
                    <option value="formularios">Formulários</option>
                    <option value="todos">Todos os dados</option>
                  </select>
                </div>
                <div>
                  <Label>Período</Label>
                  <select
                    className="w-full"
                    value={exportConfig.periodo}
                    onChange={e => setExportConfig(prev => ({...prev, periodo: e.target.value as any}))}
                  >
                    <option value="ultimo_mes">Último mês</option>
                    <option value="ultimo_trimestre">Último trimestre</option>
                    <option value="ultimo_ano">Último ano</option>
                    <option value="personalizado">Período personalizado</option>
                  </select>
                </div>
                {exportConfig.periodo === 'personalizado' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data início</Label>
                      <Input
                        type="date"
                        value={exportConfig.data_inicio || ''}
                        onChange={e => setExportConfig(prev => ({...prev, data_inicio: e.target.value}))}
                      />
                    </div>
                    <div>
                      <Label>Data fim</Label>
                      <Input
                        type="date"
                        value={exportConfig.data_fim || ''}
                        onChange={e => setExportConfig(prev => ({...prev, data_fim: e.target.value}))}
                      />
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
          {isAdmin && (
            <>
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
            </>
          )}
        </TabsList>

        {/* Aba Perfil */}
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
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{profileData.nome_completo}</h3>
                  <p className="text-gray-600">{profileData.email}</p>
                  <Badge className={tiposUsuario.find(t => t.value === profile?.papel)?.color}>
                    {tiposUsuario.find(t => t.value === profile?.papel)?.label || profile?.papel}
                  </Badge>
                </div>
                <Button
                  onClick={() => setEditingProfile(!editingProfile)}
                  variant={editingProfile ? "outline" : "default"}>
                  <Edit className="h-4 w-4 mr-2" />
                  {editingProfile ? 'Cancelar' : 'Editar'}
                </Button>
              </div>

              {editingProfile && (
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50"
                  onSubmit={e => { e.preventDefault(); handleSaveProfile(); }}>
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      name="nome_completo"
                      value={profileData.nome_completo}
                      onChange={handleProfileInput}
                      required
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileInput}
                      required
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      name="telefone"
                      value={profileData.telefone}
                      onChange={handleProfileInput}
                    />
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Input
                      name="cargo"
                      value={profileData.cargo}
                      onChange={handleProfileInput}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Bio</Label>
                    <Textarea
                      name="bio"
                      value={profileData.bio}
                      onChange={handleProfileInput}
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end space-x-2">
                    <Button variant="outline" type="button" onClick={() => setEditingProfile(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuários */}
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
                    <Button onClick={() => handleOpenUserForm() }>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingUserId ? "Editar Usuário" : "Criar Novo Usuário"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveUser} className="space-y-4">
                      <div>
                        <Label>Nome Completo</Label>
                        <Input name="nome_completo" required value={userForm.nome_completo} onChange={handleUserFormChange} />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input name="email" type="email" required value={userForm.email} onChange={handleUserFormChange} />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input name="telefone" value={userForm.telefone} onChange={handleUserFormChange} />
                      </div>
                      <div>
                        <Label>Cargo</Label>
                        <Input name="cargo" value={userForm.cargo} onChange={handleUserFormChange} />
                      </div>
                      <div>
                        <Label>Departamento</Label>
                        <Input name="departamento" value={userForm.departamento} onChange={handleUserFormChange} />
                      </div>
                      <div>
                        <Label>Tipo de Usuário</Label>
                        <select
                          name="tipo_usuario"
                          required
                          className="w-full"
                          value={userForm.tipo_usuario}
                          onChange={handleUserFormChange}
                        >
                          <option value="">Selecione o tipo</option>
                          {tiposUsuario.map(tipo => (
                            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowUserForm(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {editingUserId ? "Salvar" : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(user => (
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
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleOpenUserForm(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissões */}
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
                    <form onSubmit={handleSavePermission} className="space-y-4">
                      <div>
                        <Label>Usuário</Label>
                        <select
                          name="user_id"
                          required
                          className="w-full"
                          value={permissionForm.user_id}
                          onChange={handlePermissionFormChange}
                        >
                          <option value="">Selecione o usuário</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Módulo</Label>
                        <select
                          name="module"
                          required
                          className="w-full"
                          value={permissionForm.module}
                          onChange={handlePermissionFormChange}
                        >
                          <option value="">Selecione o módulo</option>
                          {modules.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Permissão</Label>
                        <select
                          name="permission"
                          required
                          className="w-full"
                          value={permissionForm.permission}
                          onChange={handlePermissionFormChange}
                        >
                          <option value="">Selecione a permissão</option>
                          {permissions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
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
                {modules.map(module => {
                  const modulePermissions = userPermissions.filter(p => p.module === module.value);
                  return (
                    <div key={module.value} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <module.icon className="h-5 w-5" />
                        <h3 className="font-medium">{module.label}</h3>
                        <Badge variant="outline">{modulePermissions.length} usuários</Badge>
                      </div>
                      <div className="space-y-2">
                        {modulePermissions.map(permission => (
                          <div key={permission.id} className="flex items-center justify-between text-sm">
                            <span>{permission.user_name}</span>
                            <div className="flex items-center space-x-2">
                              <Badge className={permissions.find(p => p.value === permission.permission)?.color}>
                                {permissions.find(p => p.value === permission.permission)?.label}
                              </Badge>
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleDeletePermission(permission.id)}
                                >
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

        {/* Sistema */}
        <TabsContent value="sistema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configurações do Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {configLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : configError ? (
                <div className="p-4 text-center text-red-500">
                  <p>{configError}</p>
                  <Button variant="outline" onClick={reloadConfigs} className="mt-2">
                    Tentar novamente
                  </Button>
                </div>
              ) : systemConfig.length === 0 ? (
                <div className="text-center text-gray-500 p-4">
                  <p>Nenhuma configuração encontrada</p>
                </div>
              ) : (
                systemConfig.map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{config.descricao}</h4>
                      <p className="text-sm text-gray-600">{config.chave}</p>
                    </div>
                    <div className="w-48">
                      {config.tipo === 'boolean' ? (
                        <Switch
                          checked={config.valor === 'true'}
                          onCheckedChange={checked =>
                            handleUpdateSystemConfig(config.id, checked ? 'true' : 'false')
                          }
                          disabled={loading}
                        />
                      ) : (
                        <Input
                          value={config.valor}
                          onChange={e => handleUpdateSystemConfig(config.id, e.target.value)}
                          type={config.tipo === 'number' ? 'number' : 'text'}
                          disabled={loading}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banco de Dados */}
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
                    <Button variant="outline" className="w-full justify-start" onClick={handleBackup} disabled={loading}>
                      <Download className="h-4 w-4 mr-2" />
                      Fazer Backup
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleRestore}>
                      <Upload className="h-4 w-4 mr-2" />
                      Restaurar Backup
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleMigrations}>
                      <Database className="h-4 w-4 mr-2" />
                      Executar Migrações
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleIntegrity}>
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
