import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from '../components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useRef, useState } from 'react';

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
  const [isExcluindo, setIsExcluindo] = useState(false);
  const pendingTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const { data: documentos, isLoading } = useQuery<Documento[]>({
    queryKey: ['documentos', beneficiariaId],
    queryFn: (): Promise<Documento[]> => api.get<Documento[]>(`/documentos/${beneficiariaId}`).then(res => res.data as Documento[]),
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
      queryClient.invalidateQueries({ queryKey: ['documentos', beneficiariaId] });
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
      queryClient.invalidateQueries({ queryKey: ['documentos', beneficiariaId] });
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

  // Exclusão com opção de desfazer (apenas cliente por 4s)
  const excluirComUndo = (documentoId: number) => {
    const cacheKey = ['documentos', beneficiariaId] as const;
    const previous = queryClient.getQueryData<Documento[]>(cacheKey) || [];
    const updated = previous.filter((d) => d.id !== documentoId);

    // Otimista: remove do cache
    queryClient.setQueryData(cacheKey, updated);
    setIsExcluindo(true);

    // Programar exclusão real após 4s
    const timer = setTimeout(async () => {
      try {
        await api.delete(`/documentos/${documentoId}`);
        queryClient.invalidateQueries({ queryKey: cacheKey });
      } catch (error: any) {
        // Recarregar estado e informar erro
        queryClient.setQueryData(cacheKey, previous);
        toast({
          title: 'Erro!',
          description: error?.response?.data?.error || 'Erro ao excluir documento.',
          variant: 'destructive',
        });
      } finally {
        setIsExcluindo(false);
        delete pendingTimers.current[documentoId];
      }
    }, 4000);

    pendingTimers.current[documentoId] = timer;

    const { dismiss } = toast({
      title: 'Documento excluído',
      description: 'Você pode desfazer esta ação.',
      action: (
        <ToastAction altText="Desfazer" onClick={() => {
          // Cancelar exclusão e restaurar cache
          const t = pendingTimers.current[documentoId];
          if (t) clearTimeout(t);
          queryClient.setQueryData(cacheKey, previous);
          setIsExcluindo(false);
          delete pendingTimers.current[documentoId];
        }}>Desfazer</ToastAction>
      ),
    });

    // Auto-dismiss em 4s (sincronizado com execução)
    setTimeout(() => dismiss(), 4100);
  };

  const downloadDocumento = async (documentoId: number, nomeArquivo: string) => {
    try {
      const response = await api.get<Blob>(`/documentos/${documentoId}/download`, { responseType: 'blob' });
      const blob = response.data as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
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
    queryFn: (): Promise<DocumentoVersao[]> => api.get<DocumentoVersao[]>(`/documentos/${beneficiariaId}/versoes`).then(res => res.data as DocumentoVersao[]),
    enabled: !!beneficiariaId
  });

  return {
    documentos,
    isLoading,
    upload: uploadMutation.mutate,
    isUploading: (uploadMutation as any).isPending ?? (uploadMutation as any).isLoading,
    atualizar: atualizarMutation.mutate,
    isAtualizando: (atualizarMutation as any).isPending ?? (atualizarMutation as any).isLoading,
    excluir: excluirComUndo,
    isExcluindo,
    download: downloadDocumento,
    versoes,
    loadingVersoes
  };
}
