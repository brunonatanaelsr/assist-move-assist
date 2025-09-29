import { useEffect, useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import usePersistedFilters from '@/hooks/usePersistedFilters';
import { useBeneficiarias, useBeneficiaria } from '@/hooks/useBeneficiarias';
import type { Beneficiaria } from '@/types/shared';
import type { BeneficiariaListResponse, ListBeneficiariasParams } from '@/types/beneficiarias';
import type { BeneficiariasStats, BeneficiariasFilters, BeneficiariaStatusDisplay } from '@/utils/beneficiarias';
import {
  buildBeneficiariasStats,
  filterBeneficiarias,
  normalizeBeneficiariaSearch,
  toStatusFilterValue,
} from '@/utils/beneficiarias';

const DEFAULT_FILTERS: Required<BeneficiariasFilters> & { page: number } = {
  search: '',
  status: 'Todas',
  programa: 'Todos',
  page: 1,
};

const DEFAULT_STATUS_OPTIONS: ReadonlyArray<'Todas' | BeneficiariaStatusDisplay> = [
  'Todas',
  'Ativa',
  'Aguardando',
  'Inativa',
  'Desistente',
];

const DEFAULT_PROGRAM_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Assistência Social', label: 'Assistência Social' },
  { value: 'Educação Profissional', label: 'Educação Profissional' },
  { value: 'Capacitação Técnica', label: 'Capacitação Técnica' },
];

export type BeneficiariasListPaginationStrategy = 'client' | 'api' | 'auto';

export interface UseBeneficiariasListConfig {
  itemsPerPage?: number;
  storageKey?: string;
  paginationStrategy?: BeneficiariasListPaginationStrategy;
  statusOptions?: ReadonlyArray<'Todas' | BeneficiariaStatusDisplay>;
  programOptions?: ReadonlyArray<{ value: string; label: string }>;
  initialFilters?: Partial<Required<BeneficiariasFilters> & { page: number }>;
}

export interface UseBeneficiariasListResult {
  query: UseQueryResult<BeneficiariaListResponse>;
  beneficiarias: Beneficiaria[];
  allBeneficiarias: Beneficiaria[];
  filteredBeneficiarias: Beneficiaria[];
  stats: BeneficiariasStats & { total: number };
  rawStats: BeneficiariasStats;
  filters: {
    searchTerm: string;
    selectedStatus: string;
    programaFilter: string;
    currentPage: number;
  };
  setFilters: (patch: Partial<typeof DEFAULT_FILTERS>) => void;
  resetFilters: () => void;
  hasSearch: boolean;
  showLoading: boolean;
  queryError?: Error;
  activeFilterCount: number;
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    showingFrom: number;
    showingTo: number;
    pageSize: number;
  };
  statusOptions: ReadonlyArray<'Todas' | BeneficiariaStatusDisplay>;
  programOptions: ReadonlyArray<{ value: string; label: string }>;
  shouldPaginateClient: boolean;
}

const ensureStatusOption = (
  value: string,
  options: ReadonlyArray<'Todas' | BeneficiariaStatusDisplay>
): 'Todas' | BeneficiariaStatusDisplay => {
  const fallback = options[0] ?? 'Todas';
  if (options.includes(value as 'Todas' | BeneficiariaStatusDisplay)) {
    return value as 'Todas' | BeneficiariaStatusDisplay;
  }
  return fallback;
};

const ensureProgramOption = (
  value: string,
  options: ReadonlyArray<{ value: string; label: string }>
): string => {
  if (options.some((option) => option.value === value)) {
    return value;
  }
  return options[0]?.value ?? 'Todos';
};

export const useBeneficiariasList = (
  config: UseBeneficiariasListConfig = {}
): UseBeneficiariasListResult => {
  const {
    itemsPerPage = 10,
    storageKey = 'beneficiarias:filters',
    paginationStrategy = 'client',
    statusOptions = DEFAULT_STATUS_OPTIONS,
    programOptions = DEFAULT_PROGRAM_OPTIONS,
    initialFilters = {},
  } = config;

  const { state: filterState, set: setFilters, reset } = usePersistedFilters({
    key: storageKey,
    initial: { ...DEFAULT_FILTERS, ...initialFilters },
  });

  const searchTerm = (filterState.search as string) ?? DEFAULT_FILTERS.search;
  const selectedStatusRaw = (filterState.status as string) ?? DEFAULT_FILTERS.status;
  const programaFilterRaw = (filterState.programa as string) ?? DEFAULT_FILTERS.programa;
  const currentPageRaw = Number(filterState.page || DEFAULT_FILTERS.page);

  const selectedStatus = ensureStatusOption(selectedStatusRaw, statusOptions);
  const programaFilter = ensureProgramOption(programaFilterRaw, programOptions);
  const currentPage = Number.isNaN(currentPageRaw) ? DEFAULT_FILTERS.page : currentPageRaw;
  const trimmedSearch = searchTerm.trim();

  const statusFilterValue = useMemo(
    () => toStatusFilterValue(selectedStatus),
    [selectedStatus]
  );

  const shouldRequestApiPagination = paginationStrategy === 'api';

  const queryParams = useMemo(() => {
    const params: ListBeneficiariasParams = {
      search: trimmedSearch || undefined,
      status: statusFilterValue,
    };

    if (shouldRequestApiPagination) {
      params.page = currentPage;
      params.limit = itemsPerPage;
    }

    return params;
  }, [currentPage, itemsPerPage, shouldRequestApiPagination, statusFilterValue, trimmedSearch]);

  const beneficiariasQuery = useBeneficiarias(queryParams);
  const beneficiariasResponse = beneficiariasQuery.data;

  const beneficiarias = useMemo(() => {
    if (!beneficiariasResponse || beneficiariasResponse.success === false) {
      return [] as Beneficiaria[];
    }

    const data = beneficiariasResponse.data;
    return Array.isArray(data) ? data : [];
  }, [beneficiariasResponse]);

  const firstBeneficiariaId = beneficiarias.length > 0 ? String(beneficiarias[0].id) : '';
  useBeneficiaria(firstBeneficiariaId);

  const apiHasPagination = Boolean(beneficiariasResponse?.pagination);
  const shouldPaginateClient =
    paginationStrategy === 'client' || (paginationStrategy === 'auto' && !apiHasPagination);

  const rawStats = useMemo(() => buildBeneficiariasStats(beneficiarias), [beneficiarias]);

  const filteredBeneficiarias = useMemo(() => {
    if (shouldPaginateClient) {
      return filterBeneficiarias(beneficiarias, {
        search: searchTerm,
        status: selectedStatus,
        programa: programaFilter,
      });
    }

    return beneficiarias;
  }, [beneficiarias, programaFilter, searchTerm, selectedStatus, shouldPaginateClient]);

  const pagination = useMemo(() => {
    if (shouldPaginateClient) {
      const totalItems = filteredBeneficiarias.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      const safePage = Math.min(Math.max(currentPage, 1), totalPages);
      const startIndex = (safePage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      return {
        totalItems,
        totalPages,
        currentPage: safePage,
        showingFrom: totalItems === 0 ? 0 : startIndex + 1,
        showingTo: totalItems === 0 ? 0 : Math.min(endIndex, totalItems),
        pageSize: itemsPerPage,
        items: filteredBeneficiarias.slice(startIndex, endIndex),
      };
    }

    const paginationData = beneficiariasResponse?.pagination;
    const pageSize = paginationData?.limit ?? itemsPerPage;
    const apiPage = paginationData?.page ?? currentPage;
    const totalItems = paginationData?.total ?? beneficiarias.length;
    const computedTotalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
    const totalPages = paginationData?.totalPages ?? computedTotalPages;
    const safePage = Math.min(Math.max(apiPage, 1), Math.max(totalPages, 1));
    const showingFrom = beneficiarias.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const showingTo = beneficiarias.length === 0 ? 0 : showingFrom + beneficiarias.length - 1;

    return {
      totalItems,
      totalPages,
      currentPage: safePage,
      showingFrom,
      showingTo,
      pageSize,
      items: beneficiarias,
    };
  }, [
    beneficiarias,
    beneficiariasResponse?.pagination,
    currentPage,
    filteredBeneficiarias,
    itemsPerPage,
    shouldPaginateClient,
  ]);

  useEffect(() => {
    if (shouldPaginateClient && currentPage !== pagination.currentPage) {
      setFilters({ page: pagination.currentPage });
    }
  }, [currentPage, pagination.currentPage, setFilters, shouldPaginateClient]);

  const stats = useMemo(
    () => ({
      ...rawStats,
      total: shouldPaginateClient ? rawStats.total : pagination.totalItems,
    }),
    [pagination.totalItems, rawStats, shouldPaginateClient]
  );

  const { hasSearch } = useMemo(() => normalizeBeneficiariaSearch(searchTerm), [searchTerm]);
  const showLoading = beneficiariasQuery.isLoading || beneficiariasQuery.isFetching;

  const backendErrorMessage =
    beneficiariasResponse && beneficiariasResponse.success === false
      ? beneficiariasResponse.message
      : undefined;

  const queryError = beneficiariasQuery.isError
    ? (beneficiariasQuery.error as Error | undefined)
    : backendErrorMessage
    ? new Error(backendErrorMessage)
    : undefined;

  const activeFilterCount =
    (selectedStatus !== 'Todas' ? 1 : 0) +
    (programaFilter !== 'Todos' ? 1 : 0) +
    (hasSearch ? 1 : 0);

  return {
    query: beneficiariasQuery,
    beneficiarias: pagination.items,
    allBeneficiarias: beneficiarias,
    filteredBeneficiarias,
    stats,
    rawStats,
    filters: {
      searchTerm,
      selectedStatus,
      programaFilter,
      currentPage: pagination.currentPage,
    },
    setFilters: setFilters as (patch: Partial<typeof DEFAULT_FILTERS>) => void,
    resetFilters: () => reset(),
    hasSearch,
    showLoading,
    queryError,
    activeFilterCount,
    pagination: {
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      currentPage: pagination.currentPage,
      showingFrom: pagination.showingFrom,
      showingTo: pagination.showingTo,
      pageSize: pagination.pageSize,
    },
    statusOptions,
    programOptions,
    shouldPaginateClient,
  };
};

export default useBeneficiariasList;
