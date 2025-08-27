import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from '../components/ui/use-toast';

interface Documento {
  id: number;
  beneficiaria_id: number;
  nome_arquivo: string;
  tipo_documento: string;
  categoria: string;
  tamanho: number;
  mime_type: string;
  status: 'ativo' | 'removido';
  uploaded_by: number;
  uploaded_by_nome: string;
  data_upload: string;
}

interface DocumentoVersao {
  id: number;
  documento_id: number;
  numero_versao: number;
  tamanho: number;
  modificado_por: number;
  modificado_por_nome: string;
  data_modificacao: string;
  motivo_modificacao?: string;
}

interface UploadDocumentoParams {
  beneficiariaId: number;
  file: File;
  tipo: string;
  categoria: string;
  metadata?: Record<string, any>;
}

interface AtualizarDocumentoParams {
  documentoId: number;
  file: File;
  motivoModificacao: string;
  metadata?: Record<string, any>;
}

export function useDocumentos(beneficiariaId: number) {
  const queryClient = useQueryClient();

  const { data: documentos, isLoading } = useQuery<Documento[]>({
    queryKey: ['documentos', beneficiariaId],
    queryFn: () => api.get(`/documentos/${beneficiariaId}`).then(res => res.data),
    enabled: !!beneficiariaId
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, tipo, categoria, metadata }: Omit<UploadDocumentoParams, 'beneficiariaId'>) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);
      formData.append('categoria', categoria);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      return api.post(`/documentos/${beneficiariaId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documentos', beneficiariaId]);
      toast({
        title: 'Sucesso!',
        description: 'Documento enviado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro!',
        description: error.response?.data?.error || 'Erro ao enviar documento.',
        variant: 'destructive'
      });
    }
  });

  const atualizarMutation = useMutation({
    mutationFn: async ({ documentoId, file, motivoModificacao, metadata }: AtualizarDocumentoParams) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('motivoModificacao', motivoModificacao);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      return api.put(`/documentos/${documentoId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documentos', beneficiariaId]);
      toast({
        title: 'Sucesso!',
        description: 'Documento atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro!',
        description: error.response?.data?.error || 'Erro ao atualizar documento.',
        variant: 'destructive'
      });
    }
  });

  const excluirMutation = useMutation({
    mutationFn: (documentoId: number) =>
      api.delete(`/documentos/${documentoId}`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['documentos', beneficiariaId]);
      toast({
        title: 'Sucesso!',
        description: 'Documento excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro!',
        description: error.response?.data?.error || 'Erro ao excluir documento.',
        variant: 'destructive'
      });
    }
  });

  const downloadDocumento = async (documentoId: number, nomeArquivo: string) => {
    try {
      const response = await api.get(`/documentos/${documentoId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      toast({
        title: 'Erro!',
        description: error.response?.data?.error || 'Erro ao baixar documento.',
        variant: 'destructive'
      });
    }
  };

  const { data: versoes, isLoading: loadingVersoes } = useQuery<DocumentoVersao[]>({
    queryKey: ['documentos', 'versoes', beneficiariaId],
    queryFn: () => api.get(`/documentos/${beneficiariaId}/versoes`).then(res => res.data),
    enabled: !!beneficiariaId
  });

  return {
    documentos,
    isLoading,
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isLoading,
    atualizar: atualizarMutation.mutate,
    isAtualizando: atualizarMutation.isLoading,
    excluir: excluirMutation.mutate,
    isExcluindo: excluirMutation.isLoading,
    download: downloadDocumento,
    versoes,
    loadingVersoes
  };
}
