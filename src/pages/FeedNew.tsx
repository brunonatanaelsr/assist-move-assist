import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  Share2, 
  Filter, 
  Search, 
  TrendingUp,
  Users,
  Calendar,
  Trophy,
  Newspaper,
  Megaphone,
  Loader2,
  Upload,
  Trash2,
  MoreVertical,
  Edit2
} from 'lucide-react';
import { useAuth } from '@/hooks/usePostgreSQLAuth';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/apiService';

interface Post {
  id: number;
  tipo: 'anuncio' | 'evento' | 'noticia' | 'conquista';
  titulo: string;
  conteudo: string;
  autor_id: number;
  autor_nome: string;
  autor_foto?: string;
  imagem_url?: string;
  curtidas: number;
  comentarios: number;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

interface Comment {
  id: number;
  post_id: number;
  autor_id: number;
  autor_nome: string;
  autor_foto?: string;
  conteudo: string;
  data_criacao: string;
  data_atualizacao: string;
}

interface Stats {
  total_posts: number;
  total_anuncios: number;
  total_eventos: number;
  total_noticias: number;
  total_conquistas: number;
  total_curtidas: number;
  total_comentarios: number;
  media_curtidas: string;
  posts_recentes: number;
}

const tiposPost = [
  { value: 'anuncio', label: 'Anúncio', icon: Megaphone, color: 'bg-blue-100 text-blue-800' },
  { value: 'evento', label: 'Evento', icon: Calendar, color: 'bg-green-100 text-green-800' },
  { value: 'noticia', label: 'Notícia', icon: Newspaper, color: 'bg-purple-100 text-purple-800' },
  { value: 'conquista', label: 'Conquista', icon: Trophy, color: 'bg-yellow-100 text-yellow-800' }
];

export default function Feed() {
  const { isAdmin, profile, user } = useAuth();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [curtidas, setCurtidas] = useState<Record<number, boolean>>({});
  
  // Estados para comentários
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});

  // Estados para estatísticas
  const [stats, setStats] = useState<Stats>({
    total_posts: 0,
    total_anuncios: 0,
    total_eventos: 0,
    total_noticias: 0,
    total_conquistas: 0,
    total_curtidas: 0,
    total_comentarios: 0,
    media_curtidas: '0.0',
    posts_recentes: 0
  });

  const [formData, setFormData] = useState({
    tipo: 'anuncio' as const,
    titulo: '',
    conteudo: '',
    autor_nome: profile?.nome_completo || '',
    imagem_url: ''
  });
  
  // Estados para upload de imagem
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Estados para exclusão
  const [deletingPosts, setDeletingPosts] = useState<Set<number>>(new Set());

  // Estados para edição
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    tipo: 'anuncio' as 'anuncio' | 'evento' | 'noticia' | 'conquista',
    titulo: '',
    conteudo: '',
    imagem_url: ''
  });
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState<string>('');

  // Carregar posts e estatísticas
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar posts e estatísticas
      const [postsResponse, statsResponse] = await Promise.all([
        apiService.getFeed(),
        apiService.getFeedStats()
      ]);

      if (postsResponse.success && postsResponse.data) {
        setPosts(postsResponse.data);
        setFilteredPosts(postsResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do feed:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do feed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar posts
  useEffect(() => {
    let filtered = [...posts];

    if (filtroTipo !== 'todos') {
      filtered = filtered.filter(post => post.tipo === filtroTipo);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        post =>
          post.titulo.toLowerCase().includes(searchLower) ||
          post.conteudo.toLowerCase().includes(searchLower) ||
          post.autor_nome.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPosts(filtered);
  }, [posts, filtroTipo, searchTerm]);

  // Curtir post
  const handleLike = async (postId: number) => {
    try {
      const response = await apiService.likeFeedPost(postId);
      
      if (response.success) {
        // Atualizar estado local
        setPosts(prev => 
          prev.map(post => 
            post.id === postId 
              ? { ...post, curtidas: response.data.curtidas }
              : post
          )
        );
        
        setCurtidas(prev => ({ ...prev, [postId]: true }));
        
        toast({
          title: 'Sucesso',
          description: 'Post curtido!',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao curtir post',
        variant: 'destructive',
      });
    }
  };

  // Compartilhar post
  const handleShare = async (postId: number) => {
    try {
      const response = await apiService.shareFeedPost(postId);
      
      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Post compartilhado!',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao compartilhar post',
        variant: 'destructive',
      });
    }
  };

  // ====== FUNÇÕES DE COMENTÁRIOS ======
  
  // Carregar comentários de um post
  const loadComments = async (postId: number) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      
      const response = await apiService.getCommentsByPostId(postId);
      
      if (response.success && response.data) {
        setComments(prev => ({ ...prev, [postId]: response.data }));
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar comentários',
        variant: 'destructive',
      });
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Alternar visualização de comentários
  const toggleComments = async (postId: number) => {
    const isShowing = showComments[postId];
    
    setShowComments(prev => ({ ...prev, [postId]: !isShowing }));
    
    // Se está abrindo os comentários e ainda não carregou, carregar agora
    if (!isShowing && !comments[postId]) {
      await loadComments(postId);
    }
  };

  // Criar novo comentário
  const handleCreateComment = async (postId: number) => {
    const conteudo = newComment[postId]?.trim();
    
    if (!conteudo) {
      toast({
        title: 'Erro',
        description: 'Digite um comentário',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiService.createComment(postId, { conteudo });
      
      if (response.success && response.data) {
        // Atualizar lista de comentários
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), response.data]
        }));
        
        // Atualizar contador de comentários no post
        setPosts(prev => 
          prev.map(post => 
            post.id === postId 
              ? { ...post, comentarios: post.comentarios + 1 }
              : post
          )
        );
        
        // Limpar campo de comentário
        setNewComment(prev => ({ ...prev, [postId]: '' }));
        
        toast({
          title: 'Sucesso',
          description: 'Comentário adicionado!',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar comentário',
        variant: 'destructive',
      });
    }
  };

  // ====== FUNÇÕES DE UPLOAD DE IMAGEM ======
  
  // Selecionar arquivo de imagem
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Erro',
          description: 'Tipo de arquivo inválido. Use jpeg, jpg, png, gif ou webp',
          variant: 'destructive',
        });
        return;
      }

      // Verificar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'Arquivo muito grande. Tamanho máximo: 5MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Limpar URL manual se houver
      setFormData(prev => ({ ...prev, imagem_url: '' }));
    }
  };

  // Fazer upload da imagem
  const handleImageUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadingImage(true);
      
      const response = await apiService.uploadImage(selectedFile);
      
      if (response.success && response.data) {
        // Usar URL completa do servidor
        const fullUrl = `http://localhost:3000${response.data.url}`;
        setFormData(prev => ({ ...prev, imagem_url: fullUrl }));
        
        toast({
          title: 'Sucesso',
          description: 'Imagem enviada com sucesso!',
        });
      } else {
        throw new Error(response.message || 'Erro no upload');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Remover imagem selecionada
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imagem_url: '' }));
  };

  // Criar novo post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.conteudo) {
      toast({
        title: 'Erro',
        description: 'Título e conteúdo são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      let finalImageUrl = formData.imagem_url;

      // Se há um arquivo selecionado mas ainda não foi feito upload, fazer agora
      if (selectedFile && !formData.imagem_url) {
        setUploadingImage(true);
        
        const uploadResponse = await apiService.uploadImage(selectedFile);
        
        if (uploadResponse.success && uploadResponse.data) {
          finalImageUrl = `http://localhost:3000${uploadResponse.data.url}`;
        } else {
          throw new Error(uploadResponse.message || 'Erro no upload da imagem');
        }
        
        setUploadingImage(false);
      }

      const response = await apiService.createFeedPost({
        ...formData,
        imagem_url: finalImageUrl,
        autor_nome: profile?.nome_completo || formData.autor_nome
      });

      if (response.success && response.data) {
        // Recarregar dados
        await loadData();
        
        // Reset form
        setFormData({
          tipo: 'anuncio',
          titulo: '',
          conteudo: '',
          autor_nome: profile?.nome_completo || '',
          imagem_url: ''
        });
        handleRemoveImage();
        setShowForm(false);

        toast({
          title: 'Sucesso',
          description: 'Post criado com sucesso!',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar post',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Excluir post
  const handleDeletePost = async (postId: number) => {
    // Confirmar exclusão
    if (!confirm('Tem certeza que deseja excluir este post?')) {
      return;
    }

    try {
      // Adicionar post ao conjunto de exclusões
      setDeletingPosts(prev => new Set([...prev, postId]));

      const response = await apiService.deleteFeedPost(postId);

      if (response.success) {
        // Recarregar dados
        await loadData();
        
        toast({
          title: 'Sucesso',
          description: 'Post excluído com sucesso!',
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir post',
        variant: 'destructive',
      });
    } finally {
      // Remover post do conjunto de exclusões
      setDeletingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  // Iniciar edição de post
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditFormData({
      tipo: post.tipo,
      titulo: post.titulo,
      conteudo: post.conteudo,
      imagem_url: post.imagem_url || ''
    });
    // Se há imagem existente, mostrar como preview
    if (post.imagem_url) {
      setEditImagePreview(post.imagem_url);
    }
    setShowEditForm(true);
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingPost(null);
    setShowEditForm(false);
    setEditFormData({
      tipo: 'anuncio',
      titulo: '',
      conteudo: '',
      imagem_url: ''
    });
    setEditSelectedFile(null);
    setEditImagePreview('');
  };

  // Funções de upload para edição
  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validações
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Erro',
          description: 'Tipo de arquivo inválido. Use jpeg, jpg, png, gif ou webp',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'Arquivo muito grande. Tamanho máximo: 5MB',
          variant: 'destructive',
        });
        return;
      }

      setEditSelectedFile(file);
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Limpar URL manual
      setEditFormData(prev => ({ ...prev, imagem_url: '' }));
    }
  };

  const handleEditImageUpload = async () => {
    if (!editSelectedFile) return;

    try {
      setEditUploadingImage(true);
      
      const uploadResponse = await apiService.uploadImage(editSelectedFile);
      
      if (uploadResponse.success && uploadResponse.data) {
        const fullUrl = `http://localhost:3000${uploadResponse.data.url}`;
        setEditFormData(prev => ({ ...prev, imagem_url: fullUrl }));
        
        toast({
          title: 'Sucesso',
          description: 'Imagem enviada com sucesso!',
        });
      } else {
        throw new Error(uploadResponse.message || 'Erro no upload');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setEditUploadingImage(false);
    }
  };

  const handleEditRemoveImage = () => {
    setEditSelectedFile(null);
    setEditImagePreview('');
    setEditFormData(prev => ({ ...prev, imagem_url: '' }));
  };

  // Submeter edição do post
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPost) return;
    
    if (!editFormData.titulo || !editFormData.conteudo) {
      toast({
        title: 'Erro',
        description: 'Título e conteúdo são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      let finalImageUrl = editFormData.imagem_url;

      // Upload automático se necessário
      if (editSelectedFile && !editFormData.imagem_url) {
        setEditUploadingImage(true);
        
        const uploadResponse = await apiService.uploadImage(editSelectedFile);
        
        if (uploadResponse.success && uploadResponse.data) {
          finalImageUrl = `http://localhost:3000${uploadResponse.data.url}`;
        } else {
          throw new Error(uploadResponse.message || 'Erro no upload da imagem');
        }
      }

      const response = await apiService.updateFeedPost(editingPost.id, {
        ...editFormData,
        imagem_url: finalImageUrl
      });

      if (response.success) {
        // Recarregar dados
        await loadData();
        
        toast({
          title: 'Sucesso',
          description: 'Post editado com sucesso!',
        });

        // Reset estados
        handleCancelEdit();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao editar post',
        variant: 'destructive',
      });
    } finally {
      setEditUploadingImage(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `${diffDays - 1} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const isPostEdited = (post: Post) => {
    const created = new Date(post.data_criacao);
    const updated = new Date(post.data_atualizacao);
    return updated.getTime() - created.getTime() > 1000; // Diferença maior que 1 segundo
  };

  // Verificar se o usuário pode editar/excluir um post
  const canModifyPost = (post: Post) => {
    // 1. Autor do post pode sempre editar/excluir seus próprios posts
    if (String(post.autor_id) === profile?.id) {
      return true;
    }
    
    // 2. Apenas superadmin pode editar/excluir posts de outros usuários
    if (user?.role === 'superadmin') {
      return true;
    }
    
    // 3. Admins comuns NÃO podem editar posts de outros usuários
    return false;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTipoConfig = (tipo: Post['tipo']) => {
    return tiposPost.find(t => t.value === tipo) || tiposPost[0];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
              <p className="text-gray-500">Carregando feed...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Feed da Comunidade</h1>
              {user?.role === 'superadmin' && (
                <Badge variant="destructive" className="text-xs">
                  Super Admin - Todas as Permissões
                </Badge>
              )}
              {user?.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">
                  Admin - Permissões Limitadas
                </Badge>
              )}
            </div>
            <p className="text-gray-600">
              Acompanhe as últimas novidades e conquistas
              {user?.role === 'superadmin' && (
                <span className="ml-2 text-blue-600 text-sm">• Você pode editar/excluir qualquer post</span>
              )}
              {user?.role === 'admin' && (
                <span className="ml-2 text-amber-600 text-sm">• Você pode editar/excluir apenas seus posts</span>
              )}
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Post
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={formData.tipo} onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposPost.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            <div className="flex items-center">
                              <tipo.icon className="h-4 w-4 mr-2" />
                              {tipo.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Digite o título..."
                    />
                  </div>
                  
                  <div>
                    <Label>Conteúdo</Label>
                    <Textarea
                      value={formData.conteudo}
                      onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                      placeholder="Digite o conteúdo..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label>URL da Imagem (opcional)</Label>
                    <Input
                      value={formData.imagem_url}
                      onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Ou faça upload de uma imagem</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="image-upload"
                          disabled={uploadingImage}
                        />
                        <label
                          htmlFor="image-upload"
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 
                            cursor-pointer hover:bg-gray-50 transition-colors text-sm
                            ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingImage ? 'Enviando...' : 'Escolher arquivo'}
                        </label>
                        
                        {selectedFile && (
                          <Button
                            type="button"
                            onClick={handleImageUpload}
                            disabled={uploadingImage}
                            size="sm"
                          >
                            {uploadingImage ? 'Enviando...' : 'Fazer Upload'}
                          </Button>
                        )}
                      </div>

                      {/* Preview da imagem */}
                      {(imagePreview || formData.imagem_url) && (
                        <div className="relative inline-block">
                          <img
                            src={imagePreview || formData.imagem_url}
                            alt="Preview"
                            className="max-w-xs max-h-40 rounded-lg border object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-sm font-bold"
                          >
                            ×
                          </button>
                        </div>
                      )}

                      {selectedFile && (
                        <div className="text-sm text-gray-600">
                          Arquivo: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Publicar</Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Modal de Edição */}
          {showEditForm && (
            <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <Label>Tipo do Post</Label>
                    <Select value={editFormData.tipo} onValueChange={(value: any) => setEditFormData({ ...editFormData, tipo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anuncio">📢 Anúncio</SelectItem>
                        <SelectItem value="evento">📅 Evento</SelectItem>
                        <SelectItem value="noticia">📰 Notícia</SelectItem>
                        <SelectItem value="conquista">🏆 Conquista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={editFormData.titulo}
                      onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })}
                      placeholder="Digite o título..."
                    />
                  </div>
                  
                  <div>
                    <Label>Conteúdo</Label>
                    <Textarea
                      value={editFormData.conteudo}
                      onChange={(e) => setEditFormData({ ...editFormData, conteudo: e.target.value })}
                      placeholder="Digite o conteúdo..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label>URL da Imagem (opcional)</Label>
                    <Input
                      value={editFormData.imagem_url}
                      onChange={(e) => setEditFormData({ ...editFormData, imagem_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Ou faça upload de uma imagem</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditFileSelect}
                          className="hidden"
                          id="edit-image-upload"
                          disabled={editUploadingImage}
                        />
                        <label
                          htmlFor="edit-image-upload"
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 
                            cursor-pointer hover:bg-gray-50 transition-colors text-sm
                            ${editUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <Upload className="h-4 w-4" />
                          {editUploadingImage ? 'Enviando...' : 'Escolher arquivo'}
                        </label>
                        
                        {editSelectedFile && (
                          <Button
                            type="button"
                            onClick={handleEditImageUpload}
                            disabled={editUploadingImage}
                            size="sm"
                          >
                            {editUploadingImage ? 'Enviando...' : 'Fazer Upload'}
                          </Button>
                        )}
                      </div>

                      {/* Preview da imagem */}
                      {(editImagePreview || editFormData.imagem_url) && (
                        <div className="relative inline-block">
                          <img
                            src={editImagePreview || editFormData.imagem_url}
                            alt="Preview"
                            className="max-w-xs max-h-40 rounded-lg border object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleEditRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-sm font-bold"
                          >
                            ×
                          </button>
                        </div>
                      )}

                      {editSelectedFile && (
                        <div className="text-sm text-gray-600">
                          Arquivo: {editSelectedFile.name} ({(editSelectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={editUploadingImage}
                    >
                      {editUploadingImage ? 'Processando...' : 'Salvar Alterações'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Posts</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_posts}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Curtidas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.total_curtidas}</p>
                </div>
                <Heart className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Comentários</p>
                  <p className="text-2xl font-bold text-green-600">{stats.total_comentarios}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Média de Curtidas</p>
                  <p className="text-2xl font-bold text-purple-600">{parseFloat(stats.media_curtidas || '0').toFixed(1)}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar posts..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tiposPost.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  <div className="flex items-center">
                    <tipo.icon className="h-4 w-4 mr-2" />
                    {tipo.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const tipoConfig = getTipoConfig(post.tipo);
            const IconComponent = tipoConfig.icon;

            return (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.autor_foto} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(post.autor_nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{post.autor_nome}</p>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${tipoConfig.color} text-xs`}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {tipoConfig.label}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(post.data_criacao)}
                            {isPostEdited(post) && (
                              <span className="ml-1 text-xs text-gray-400">(editado)</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu de opções - só aparece para: 1) autor do post, 2) super_admin */}
                    {canModifyPost(post) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            disabled={deletingPosts.has(post.id)}
                          >
                            {deletingPosts.has(post.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditPost(post)}
                            disabled={deletingPosts.has(post.id)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar post
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 focus:text-red-600"
                            disabled={deletingPosts.has(post.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Seção de Comentários */}
                  {showComments[post.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {/* Formulário para novo comentário */}
                      <div className="flex space-x-3 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(profile?.nome_completo || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex space-x-2">
                          <Input
                            placeholder="Escreva um comentário..."
                            value={newComment[post.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ 
                              ...prev, 
                              [post.id]: e.target.value 
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleCreateComment(post.id);
                              }
                            }}
                            className="flex-1 h-8"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleCreateComment(post.id)}
                            disabled={!newComment[post.id]?.trim()}
                          >
                            Comentar
                          </Button>
                        </div>
                      </div>

                      {/* Lista de comentários */}
                      <div className="space-y-3">
                        {loadingComments[post.id] ? (
                          <div className="text-center py-4">
                            <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Carregando comentários...</p>
                          </div>
                        ) : comments[post.id] && comments[post.id].length > 0 ? (
                          comments[post.id].map((comment) => (
                            <div key={comment.id} className="flex space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.autor_foto} />
                                <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                                  {getInitials(comment.autor_nome)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-sm text-gray-900">
                                      {comment.autor_nome}
                                    </p>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(comment.data_criacao)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{comment.conteudo}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 py-4 text-sm">
                            Seja o primeiro a comentar!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <CardTitle className="text-lg font-semibold text-gray-900 mt-3">
                    {post.titulo}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {post.conteudo}
                  </p>

                  {post.imagem_url && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={post.imagem_url}
                        alt="Imagem do post"
                        className="w-full h-64 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-6">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-2 text-sm transition-colors ${
                          curtidas[post.id] 
                            ? 'text-red-600 hover:text-red-700' 
                            : 'text-gray-500 hover:text-red-600'
                        }`}
                        disabled={curtidas[post.id]}
                      >
                        <Heart className={`h-4 w-4 ${curtidas[post.id] ? 'fill-current' : ''}`} />
                        <span>{post.curtidas} curtidas</span>
                      </button>

                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comentarios} comentários</span>
                      </button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(post.id)}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>Nenhum post encontrado</p>
                <p className="text-sm">Tente ajustar os filtros ou termos de busca</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
