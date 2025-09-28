import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBeneficiarias, beneficiariasKeys } from './useBeneficiarias';
import { beneficiariasService } from '@/services/api';
import type { Beneficiaria } from '@/types/shared';
import type { ListBeneficiariasParams } from '@/types/beneficiarias';

interface BeneficiariasStats {
  total: number;
  ativas: number;
  aguardando: number;
  inativas: number;
}

const emptyStats: BeneficiariasStats = {
  total: 0,
  ativas: 0,
  aguardando: 0,
  inativas: 0,
};

const getBeneficiariaStatus = (beneficiaria: Beneficiaria): 'Ativa' | 'Inativa' | 'Aguardando' => {
  if (beneficiaria.status) {
    const normalized = beneficiaria.status.toLowerCase();
    if (normalized === 'ativa') return 'Ativa';
    if (normalized === 'inativa') return 'Inativa';
    if (normalized === 'aguardando' || normalized === 'pendente') return 'Aguardando';
  }

  return beneficiaria.ativo ? 'Ativa' : 'Inativa';
};

const buildStats = (beneficiarias: Beneficiaria[]): BeneficiariasStats => {
  return beneficiarias.reduce<BeneficiariasStats>(
    (acc, beneficiaria) => {
      const status = getBeneficiariaStatus(beneficiaria);

      if (status === 'Ativa') acc.ativas += 1;
      if (status === 'Inativa') acc.inativas += 1;
      if (status === 'Aguardando') acc.aguardando += 1;

      acc.total += 1;
      return acc;
    },
    { ...emptyStats }
  );
};

export interface BeneficiariasOverviewData {
  beneficiarias: Beneficiaria[];
  stats: BeneficiariasStats;
  backendError?: string;
}

export const useBeneficiariasOverview = (params: ListBeneficiariasParams = {}) => {
  const queryClient = useQueryClient();

  const query = useBeneficiarias<BeneficiariasOverviewData>(params, {
    select: (response) => {
      if (!response || response.success === false) {
        return {
          beneficiarias: [],
          stats: { ...emptyStats },
          backendError: response?.message,
        } satisfies BeneficiariasOverviewData;
      }

      const data = Array.isArray(response.data) ? response.data : [];

      return {
        beneficiarias: data,
        stats: buildStats(data),
      } satisfies BeneficiariasOverviewData;
    },
  });

  const firstBeneficiariaId = useMemo(() => {
    const first = query.data?.beneficiarias?.[0];
    return first?.id ? String(first.id) : undefined;
  }, [query.data?.beneficiarias]);

  useEffect(() => {
    if (!firstBeneficiariaId) return;

    void queryClient.prefetchQuery({
      queryKey: beneficiariasKeys.detail(firstBeneficiariaId),
      queryFn: () => beneficiariasService.buscarPorId(firstBeneficiariaId),
    });
  }, [firstBeneficiariaId, queryClient]);

  return query;
};

export default useBeneficiariasOverview;
