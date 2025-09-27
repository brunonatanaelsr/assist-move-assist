import { useMemo } from 'react';
import type { Beneficiaria } from '@/types/shared';

export type BeneficiariaLike = Partial<Beneficiaria> & { ativo?: boolean | null };

export interface BeneficiariasStats {
  total: number;
  ativas: number;
  aguardando: number;
  inativas: number;
}

export const getBeneficiariaStatus = (beneficiaria: BeneficiariaLike) => {
  const status = (beneficiaria.status ?? '').toString().toLowerCase();

  switch (status) {
    case 'ativa':
      return 'Ativa';
    case 'inativa':
      return 'Inativa';
    case 'aguardando':
    case 'pendente':
      return 'Aguardando';
    case 'desistente':
      return 'Inativa';
    default:
      if (typeof beneficiaria.ativo === 'boolean') {
        return beneficiaria.ativo ? 'Ativa' : 'Inativa';
      }
      return 'Aguardando';
  }
};

export const useBeneficiariasStats = (beneficiarias?: BeneficiariaLike[]) => {
  return useMemo<BeneficiariasStats>(() => {
    const lista = beneficiarias ?? [];

    return lista.reduce<BeneficiariasStats>((acc, beneficiaria) => {
      const status = getBeneficiariaStatus(beneficiaria);

      acc.total += 1;

      switch (status) {
        case 'Ativa':
          acc.ativas += 1;
          break;
        case 'Inativa':
          acc.inativas += 1;
          break;
        case 'Aguardando':
        default:
          acc.aguardando += 1;
          break;
      }

      return acc;
    }, { total: 0, ativas: 0, aguardando: 0, inativas: 0 });
  }, [beneficiarias]);
};

export default useBeneficiariasStats;
