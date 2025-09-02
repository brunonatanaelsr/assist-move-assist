import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Upload, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/apiService';

interface ProfileData {
  nome_completo: string;
  email: string;
  telefone: string;
  cargo: string;
  departamento: string;
  bio: string;
  foto_url: string;
  endereco?: string;
  data_nascimento?: string;
}

interface PasswordData {
  senha_atual: string;
  nova_senha: string;
  confirmar_senha: string;
}

export default function EditarPerfil() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'password' | 'preferences'>('info');
  
  const [profileData, setProfileData] = useState<ProfileData>({
    nome_completo: (profile as any)?.nome_completo || (profile as any)?.nome || '',
    email: profile?.email || '',
    telefone: profile?.telefone || '',
    cargo: profile?.cargo || '',
    departamento: profile?.departamento || '',
    bio: profile?.bio || '',
    foto_url: profile?.foto_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b526?w=400',
    endereco: profile?.endereco || '',
    data_nascimento: profile?.data_nascimento || ''
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  });

  const [preferences, setPreferences] = useState({
    notificacoes_email: true,
    notificacoes_sistema: true,
    tema_escuro: false,
    idioma: 'pt-BR'
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(true);

    try {
      const response = await apiService.uploadImage(file);

      if (response.success && response.data) {
        const imageUrl = `http://localhost:3000${response.data.url}`;
        setProfileData(prev => ({ ...prev, foto_url: imageUrl }));
        toast({
          title: "Sucesso",
          description: "Imagem carregada com sucesso!",
        });
      } else {
        throw new Error(response.message || 'Erro no upload da imagem.');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      // Validações básicas
      if (!profileData.nome_completo.trim()) {
        toast({
          title: "Erro",
          description: "Nome completo é obrigatório.",
          variant: "destructive"
        });
        return;
      }

      if (!profileData.email.trim()) {
        toast({
          title: "Erro",
          description: "Email é obrigatório.",
          variant: "destructive"
        });
        return;
      }

      await apiService.updateProfile({
        nome_completo: profileData.nome_completo,
        avatar_url: profileData.foto_url,
        cargo: profileData.cargo,
        departamento: profileData.departamento,
        bio: profileData.bio,
        telefone: profileData.telefone,
      });

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
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

  const handleChangePassword = async () => {
    try {
      // Validações
      if (!passwordData.senha_atual || !passwordData.nova_senha || !passwordData.confirmar_senha) {
        toast({
          title: "Erro",
          description: "Todos os campos são obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      if (passwordData.nova_senha !== passwordData.confirmar_senha) {
        toast({
          title: "Erro",
          description: "A confirmação da senha não confere.",
          variant: "destructive"
        });
        return;
      }

      if (passwordData.nova_senha.length < 6) {
        toast({
          title: "Erro",
          description: "A nova senha deve ter pelo menos 6 caracteres.",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      
      await apiService.changePassword(passwordData.senha_atual, passwordData.nova_senha);

      setPasswordData({
        senha_atual: '',
        nova_senha: '',
        confirmar_senha: ''
      });

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      
      // Em produção, salvar preferências no banco
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Sucesso",
        description: "Preferências salvas com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Perfil</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais e configurações</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveSection('info')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeSection === 'info' 
              ? 'bg-white shadow-sm text-primary' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Informações Pessoais</span>
        </button>
        <button
          onClick={() => setActiveSection('password')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeSection === 'password' 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Senha</span>
        </button>
        <button
          onClick={() => setActiveSection('preferences')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeSection === 'preferences' 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Preferências</span>
        </button>
      </div>

      {/* Informações Pessoais */}
      {activeSection === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informações Pessoais</span>
            </CardTitle>
            <CardDescription>
              Atualize suas informações pessoais e foto de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Foto de Perfil */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.foto_url} />
                  <AvatarFallback className="text-lg">
                    {profileData.nome_completo.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {uploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="font-medium">Foto de Perfil</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Clique no ícone da câmera para alterar sua foto
                </p>
                <p className="text-xs text-gray-500">
                  Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                </p>
              </div>
            </div>

            {/* Formulário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={profileData.nome_completo}
                  onChange={(e) => setProfileData(prev => ({...prev, nome_completo: e.target.value}))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({...prev, email: e.target.value}))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={profileData.telefone}
                  onChange={(e) => setProfileData(prev => ({...prev, telefone: e.target.value}))}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={profileData.data_nascimento}
                  onChange={(e) => setProfileData(prev => ({...prev, data_nascimento: e.target.value}))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={profileData.cargo}
                  onChange={(e) => setProfileData(prev => ({...prev, cargo: e.target.value}))}
                  placeholder="Seu cargo na organização"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="departamento">Departamento</Label>
                <Input
                  id="departamento"
                  value={profileData.departamento}
                  onChange={(e) => setProfileData(prev => ({...prev, departamento: e.target.value}))}
                  placeholder="Departamento ou setor"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={profileData.endereco}
                  onChange={(e) => setProfileData(prev => ({...prev, endereco: e.target.value}))}
                  placeholder="Endereço completo"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({...prev, bio: e.target.value}))}
                  placeholder="Conte um pouco sobre você e sua experiência..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => window.history.back()}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProfile} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alterar Senha */}
      {activeSection === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Alterar Senha</span>
            </CardTitle>
            <CardDescription>
              Mantenha sua conta segura com uma senha forte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="senha_atual">Senha Atual *</Label>
              <div className="relative">
                <Input
                  id="senha_atual"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.senha_atual}
                  onChange={(e) => setPasswordData(prev => ({...prev, senha_atual: e.target.value}))}
                  className="mt-1 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="nova_senha">Nova Senha *</Label>
              <Input
                id="nova_senha"
                type="password"
                value={passwordData.nova_senha}
                onChange={(e) => setPasswordData(prev => ({...prev, nova_senha: e.target.value}))}
                className="mt-1"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <Label htmlFor="confirmar_senha">Confirmar Nova Senha *</Label>
              <Input
                id="confirmar_senha"
                type="password"
                value={passwordData.confirmar_senha}
                onChange={(e) => setPasswordData(prev => ({...prev, confirmar_senha: e.target.value}))}
                className="mt-1"
              />
              {passwordData.confirmar_senha && passwordData.nova_senha !== passwordData.confirmar_senha && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <X className="h-4 w-4 mr-1" />
                  As senhas não conferem
                </p>
              )}
              {passwordData.confirmar_senha && passwordData.nova_senha === passwordData.confirmar_senha && (
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <Check className="h-4 w-4 mr-1" />
                  As senhas conferem
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Dicas para uma senha segura:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use pelo menos 6 caracteres</li>
                <li>• Combine letras maiúsculas e minúsculas</li>
                <li>• Inclua números e símbolos</li>
                <li>• Evite informações pessoais óbvias</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPasswordData({
                senha_atual: '',
                nova_senha: '',
                confirmar_senha: ''
              })}>
                Limpar
              </Button>
              <Button onClick={handleChangePassword} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Lock className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferências */}
      {activeSection === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Preferências</span>
            </CardTitle>
            <CardDescription>
              Configure suas preferências de sistema e notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notificações por Email</h4>
                  <p className="text-sm text-gray-600">Receber notificações importantes por email</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notificacoes_email}
                  onChange={(e) => setPreferences(prev => ({...prev, notificacoes_email: e.target.checked}))}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notificações do Sistema</h4>
                  <p className="text-sm text-gray-600">Mostrar notificações dentro da aplicação</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notificacoes_sistema}
                  onChange={(e) => setPreferences(prev => ({...prev, notificacoes_sistema: e.target.checked}))}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Tema Escuro</h4>
                  <p className="text-sm text-gray-600">Usar tema escuro na interface</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.tema_escuro}
                  onChange={(e) => setPreferences(prev => ({...prev, tema_escuro: e.target.checked}))}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPreferences({
                notificacoes_email: true,
                notificacoes_sistema: true,
                tema_escuro: false,
                idioma: 'pt-BR'
              })}>
                Restaurar Padrão
              </Button>
              <Button onClick={handleSavePreferences} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Salvar Preferências
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
