import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DashboardData {
  resumo: {
    beneficiarias: {
      total: number;
      ativas: number;
      inativas: number;
      crescimento: number;
    };
    oficinas: {
      total: number;
      taxa_ocupacao: number;
      participantes: number;
      crescimento: number;
    };
    tarefas: {
      total: number;
      pendentes: number;
      concluidas: number;
      taxa_conclusao: number;
    };
    engajamento: {
      posts: number;
      comentarios: number;
      reacoes: number;
      taxa: number;
    };
  };
  graficos: {
    beneficiarias: Array<{
      mes: string;
      total: number;
      ativas: number;
      programa: string;
      total_programa: number;
    }>;
    oficinas: Array<{
      mes: string;
      total: number;
      taxa_ocupacao: number;
      participantes: number;
      media_participantes: number;
    }>;
    tarefas: Array<{
      responsavel: string;
      total: number;
      pendentes: number;
      concluidas: number;
      taxa_conclusao: number;
      media_dias: number;
    }>;
    engajamento: Array<{
      mes: string;
      posts: number;
      comentarios: number;
      reacoes: number;
      taxa: number;
    }>;
  };
  metricas_complexas: {
    crescimento_beneficiarias: number;
    crescimento_oficinas: number;
    taxa_retencao: number;
    media_participacao: number;
    eficiencia_oficinas: number;
    taxa_conclusao_tarefas: number;
  } | null;
  timestamp: string;
}

interface UseDashboardDataParams {
  periodo?: {
    inicio: Date;
    fim: Date;
  };
}

export function useDashboardData({ periodo }: UseDashboardDataParams = {}) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', periodo],
    queryFn: async () => {
      const { data } = await api.get('/dashboard', {
        params: {
          inicio: periodo?.inicio?.toISOString(),
          fim: periodo?.fim?.toISOString()
        }
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 30 * 60 * 1000 // 30 minutos
  });
}
