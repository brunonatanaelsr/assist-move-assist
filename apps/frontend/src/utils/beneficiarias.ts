import type { Beneficiaria } from '@/types/shared';
import {
  formatarCPF,
  statusBeneficiariaDisplay,
  stripNonDigits,
  formatDateLocale,
} from '@/utils/formatters';

export type BeneficiariaStatusDisplay = 'Ativa' | 'Inativa' | 'Aguardando' | 'Desistente';

export interface BeneficiariasFilters {
  search?: string;
  status?: BeneficiariaStatusDisplay | 'Todas';
  programa?: string;
}

export interface BeneficiariasStats {
  total: number;
  ativas: number;
  aguardando: number;
  inativas: number;
  desistentes: number;
}

const statusDisplayMap: Record<Beneficiaria['status'], BeneficiariaStatusDisplay> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  pendente: 'Aguardando',
  desistente: 'Desistente',
};

const badgeVariants: Record<BeneficiariaStatusDisplay, 'default' | 'secondary' | 'outline'> = {
  Ativa: 'default',
  Aguardando: 'secondary',
  Inativa: 'outline',
  Desistente: 'secondary',
};

const fallbackStatusFromActiveFlag = (ativo?: boolean | null): BeneficiariaStatusDisplay => {
  if (ativo === false) return 'Inativa';
  return 'Ativa';
};

export const deriveBeneficiariaStatus = (
  beneficiaria: Partial<Beneficiaria> & { ativo?: boolean | null; status?: string | null }
): BeneficiariaStatusDisplay => {
  if (beneficiaria.status && statusDisplayMap[beneficiaria.status as Beneficiaria['status']]) {
    return statusDisplayMap[beneficiaria.status as Beneficiaria['status']];
  }

  const normalized = (beneficiaria.status || '').toLowerCase();
  if (normalized in statusDisplayMap) {
    return statusDisplayMap[normalized as Beneficiaria['status']];
  }

  return fallbackStatusFromActiveFlag(beneficiaria.ativo);
};

export const getBeneficiariaBadgeVariant = (
  status: BeneficiariaStatusDisplay
): 'default' | 'secondary' | 'outline' => badgeVariants[status] ?? 'default';

export const getBeneficiariaInitials = (nome?: string | null): string => {
  if (!nome) return 'UN';
  return nome
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const formatCpf = (cpf?: string | null): string => {
  if (!cpf) return '';
  return formatarCPF(cpf);
};

export const formatBeneficiariaDate = (dateString?: string | null): string => {
  return formatDateLocale(dateString, 'pt-BR');
};

export const generatePaedi = (
  beneficiaria: Pick<Beneficiaria, 'id'> & { data_criacao?: string | null; created_at?: string | null }
): string => {
  const isoDate = beneficiaria.data_criacao || beneficiaria.created_at;
  const createdAt = isoDate ? new Date(isoDate) : new Date();
  const year = Number.isNaN(createdAt.getTime()) ? new Date().getFullYear() : createdAt.getFullYear();
  const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
  return `MM-${year}-${sequence}`;
};

export const normalizeBeneficiariaSearch = (search?: string) => {
  const raw = search ?? '';
  const normalized = raw.trim().toLowerCase();
  const numeric = stripNonDigits(raw);
  return {
    normalized,
    numeric,
    hasSearch: normalized.length > 0 || numeric.length > 0,
  };
};

export const filterBeneficiarias = (
  beneficiarias: Beneficiaria[],
  filters: BeneficiariasFilters
): Beneficiaria[] => {
  const { normalized, numeric, hasSearch } = normalizeBeneficiariaSearch(filters.search);
  const statusFilter = filters.status ?? 'Todas';
  const programaFilter = filters.programa ?? 'Todos';

  return beneficiarias.filter((beneficiaria) => {
    const nome = beneficiaria.nome_completo?.toLowerCase() ?? '';
    const cpfNumbers = stripNonDigits(beneficiaria.cpf ?? '');
    const paedi = generatePaedi(beneficiaria).toLowerCase();
    const statusDisplay = deriveBeneficiariaStatus(beneficiaria);

    const matchesSearch =
      !hasSearch ||
      nome.includes(normalized) ||
      (numeric.length > 0 && cpfNumbers.includes(numeric)) ||
      paedi.includes(normalized);

    const matchesStatus = statusFilter === 'Todas' || statusDisplay === statusFilter;
    const beneficiariaPrograma = beneficiaria.programa_servico?.toLowerCase() ?? '';
    const matchesPrograma =
      programaFilter === 'Todos' ||
      !filters.programa ||
      beneficiariaPrograma === programaFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPrograma;
  });
};

export const buildBeneficiariasStats = (beneficiarias: Beneficiaria[]): BeneficiariasStats => {
  return beneficiarias.reduce<BeneficiariasStats>(
    (acc, beneficiaria) => {
      const status = deriveBeneficiariaStatus(beneficiaria);

      if (status === 'Ativa') acc.ativas += 1;
      if (status === 'Aguardando') acc.aguardando += 1;
      if (status === 'Inativa') acc.inativas += 1;
      if (status === 'Desistente') acc.desistentes += 1;

      acc.total += 1;
      return acc;
    },
    { total: 0, ativas: 0, aguardando: 0, inativas: 0, desistentes: 0 }
  );
};

export const toStatusFilterValue = (display: string): Beneficiaria['status'] | undefined => {
  const normalized = display.toLowerCase();
  if (normalized === 'todas') return undefined;

  const entries = Object.entries(statusDisplayMap) as Array<[
    Beneficiaria['status'],
    BeneficiariaStatusDisplay
  ]>;

  const match = entries.find(([, label]) => label.toLowerCase() === normalized);
  return match?.[0];
};

export const getStatusDisplay = (status: Beneficiaria['status']): BeneficiariaStatusDisplay => {
  const label = statusBeneficiariaDisplay(status) as BeneficiariaStatusDisplay | string;
  return (['Ativa', 'Inativa', 'Aguardando', 'Desistente'].includes(label)
    ? (label as BeneficiariaStatusDisplay)
    : statusDisplayMap[status]) ?? 'Ativa';
};
