import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { apiService } from '@/services/api';

interface SystemConfig {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: string;
}

export function useSystemConfig() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/api/configuracoes/sistema');
      
      if (response.success) {
        setConfigs(response.data);
      } else {
        throw new Error(response.message || 'Erro ao carregar configurações');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar configurações';
      setError(errorMessage);
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = async (id: string, valor: string) => {
    try {
      setLoading(true);
      setError(null); // Limpa erro anterior
      
      // Atualiza otimisticamente o estado local
      setConfigs(prevConfigs => 
        prevConfigs.map(config => 
          config.id === id ? { ...config, valor } : config
        )
      );

      const response = await apiService.put(`/api/configuracoes/sistema/${id}`, { valor });
      
      if (!response.success) {
        // Reverte a alteração local em caso de erro
        setConfigs(prevConfigs => 
          prevConfigs.map(config => 
            config.id === id ? { ...config, valor: config.valor } : config
          )
        );
        setError(response.message || 'Erro ao atualizar configuração');
        return false;
      }

      return true;
    } catch (err) {
      // Reverte a alteração local em caso de erro
      setConfigs(prevConfigs => 
        prevConfigs.map(config => 
          config.id === id ? { ...config, valor: config.valor } : config
        )
      );
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar configuração';
      setError(errorMessage);
      console.error('Erro ao atualizar configuração:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Carrega as configurações quando o componente monta
  useEffect(() => {
    loadConfigs();
  }, []);

  return {
    configs,
    loading,
    error,
    updateConfig,
    reloadConfigs: loadConfigs
  };
}
