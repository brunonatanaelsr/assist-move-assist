import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, MoreHorizontal, Edit, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import usePersistedFilters from "@/hooks/usePersistedFilters";
import { useBeneficiarias } from "@/hooks/useBeneficiarias";
import type { Beneficiaria } from "@/types/shared";
import {
  buildBeneficiariasStats,
  deriveBeneficiariaStatus,
  filterBeneficiarias,
  formatBeneficiariaDate,
  formatCpf,
  generatePaedi,
  getBeneficiariaBadgeVariant,
  getBeneficiariaInitials,
  normalizeBeneficiariaSearch,
  toStatusFilterValue,
} from "@/utils/beneficiarias";

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ["Todas", "Ativa", "Aguardando", "Inativa", "Desistente"] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

type QueryFilters = {
  search?: string;
  status?: Beneficiaria['status'];
  page: number;
  limit: number;
};

export default function Beneficiarias() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const { state: filterState, set: setFilters } = usePersistedFilters({
    key: "beneficiarias:filters",
    initial: { search: "", status: "Todas", programa: "Todos", page: 1 },
  });

  const searchTerm = (filterState.search as string) ?? "";
  const selectedStatus = ((filterState.status as StatusOption) ?? "Todas") as StatusOption;
  const programaFilter = (filterState.programa as string) ?? "Todos";
  const currentPage = Number(filterState.page || 1);

  const { hasSearch } = useMemo(() => normalizeBeneficiariaSearch(searchTerm), [searchTerm]);

  const queryFilters = useMemo<QueryFilters>(
    () => ({
      search: searchTerm.trim() ? searchTerm.trim() : undefined,
      status: toStatusFilterValue(selectedStatus) ?? undefined,
      page: Math.max(currentPage, 1),
      limit: ITEMS_PER_PAGE,
    }),
    [currentPage, searchTerm, selectedStatus]
  );

  const beneficiariasQuery = useBeneficiarias(queryFilters);
  const beneficiariasResponse = beneficiariasQuery.data;
  const beneficiariasPayload = beneficiariasResponse?.data;
  const beneficiarias: Beneficiaria[] = useMemo(
    () => (beneficiariasPayload?.items ?? []) as Beneficiaria[],
    [beneficiariasPayload]
  );
  const pagination = beneficiariasPayload?.pagination;

  const filteredBeneficiarias = useMemo(
    () =>
      filterBeneficiarias(beneficiarias, {
        search: searchTerm,
        status: selectedStatus,
        programa: programaFilter,
      }),
    [beneficiarias, programaFilter, searchTerm, selectedStatus]
  );

  const manualTotalPages = Math.max(1, Math.ceil(filteredBeneficiarias.length / ITEMS_PER_PAGE));
  const manualSafePage = Math.min(Math.max(currentPage, 1), manualTotalPages);
  const manualStartIndex = (manualSafePage - 1) * ITEMS_PER_PAGE;
  const manualEndIndex = manualStartIndex + ITEMS_PER_PAGE;

  const limit = pagination?.limit ?? ITEMS_PER_PAGE;
  const serverPage = pagination?.page ?? queryFilters.page;
  const totalItems = pagination?.total ?? filteredBeneficiarias.length;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / limit));
  const effectiveServerPage = Math.min(Math.max(serverPage, 1), totalPages);
  const displayPage = pagination ? effectiveServerPage : manualSafePage;
  const startIndex = pagination ? (effectiveServerPage - 1) * limit : manualStartIndex;
  const paginatedBeneficiarias = pagination
    ? filteredBeneficiarias
    : filteredBeneficiarias.slice(manualStartIndex, manualEndIndex);
  const showingFrom = paginatedBeneficiarias.length === 0 ? 0 : startIndex + 1;
  const showingTo = paginatedBeneficiarias.length === 0 ? 0 : startIndex + paginatedBeneficiarias.length;
  const disablePrev = displayPage <= 1;
  const disableNext = displayPage >= totalPages;
  const shouldShowPagination = totalPages > 1;

  const stats = useMemo(() => buildBeneficiariasStats(beneficiarias), [beneficiarias]);
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
    (selectedStatus !== "Todas" ? 1 : 0) +
    (programaFilter !== "Todos" ? 1 : 0) +
    (hasSearch ? 1 : 0);

  useEffect(() => {
    if (currentPage !== 1) {
      setFilters({ page: 1 });
    }
  }, [searchTerm, selectedStatus, programaFilter, currentPage, setFilters]);

  useEffect(() => {
    if (!pagination && currentPage !== manualSafePage) {
      setFilters({ page: manualSafePage });
    }
  }, [currentPage, manualSafePage, pagination, setFilters]);

  const goToPage = (page: number) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    setFilters({ page: safePage });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Beneficiárias</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro das beneficiárias do instituto
          </p>
        </div>
        <Button className="w-fit" size="lg" onClick={() => navigate('/beneficiarias/nova')} data-testid="cadastrar-beneficiaria">
          <Plus className="h-4 w-4 mr-2" />
          Nova Beneficiária
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{showLoading ? "..." : stats.total}</div>
            <p className="text-sm text-muted-foreground">Total de Beneficiárias</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{showLoading ? "..." : stats.ativas}</div>
            <p className="text-sm text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{showLoading ? "..." : stats.aguardando}</div>
            <p className="text-sm text-muted-foreground">Aguardando</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{showLoading ? "..." : stats.inativas}</div>
            <p className="text-sm text-muted-foreground">Inativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Lista de Beneficiárias</CardTitle>
        </CardHeader>
        <CardContent>
          {queryError && (
            <Alert variant="destructive" className="mb-4" data-testid="beneficiarias-error">
              <AlertTitle>Não foi possível carregar as beneficiárias</AlertTitle>
              <AlertDescription>
                {queryError.message || "Ocorreu um erro ao carregar os dados. Tente novamente."}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou PAEDI..."
                  value={searchTerm}
                  onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                {activeFilterCount > 0 ? (
                  <span
                    aria-label="Quantidade de filtros ativos"
                    className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center"
                  >
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>
              <Button
                variant="default"
                onClick={() => setFilters({ search: searchTerm, page: 1 })}
                data-testid="search-button"
              >
                Buscar
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setFilters({ status: e.target.value, page: 1 })}
                      className="w-full p-2 border rounded-md"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Programa/Serviço</label>
                    <select
                      value={programaFilter}
                      onChange={(e) => setFilters({ programa: e.target.value, page: 1 })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Assistência Social">Assistência Social</option>
                      <option value="Educação Profissional">Educação Profissional</option>
                      <option value="Capacitação Técnica">Capacitação Técnica</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ status: "Todas", programa: "Todos", search: "", page: 1 });
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <div className="rounded-md border border-border overflow-hidden" data-testid="beneficiaria-lista">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Beneficiária</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>PAEDI</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Início</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-4">
                      <ListSkeleton rows={6} columns={6} />
                    </TableCell>
                  </TableRow>
                ) : paginatedBeneficiarias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
                      <EmptyState
                        title={searchTerm ? "Nenhuma beneficiária encontrada" : "Nenhuma beneficiária cadastrada"}
                        description={
                          searchTerm
                            ? "Ajuste sua busca ou filtros e tente novamente."
                            : "Comece cadastrando a primeira beneficiária."
                        }
                        actionLabel={!searchTerm ? "Cadastrar beneficiária" : undefined}
                        onAction={!searchTerm ? () => navigate('/beneficiarias/nova') : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBeneficiarias.map((beneficiaria) => {
                    const statusDisplay = deriveBeneficiariaStatus(beneficiaria);
                    return (
                      <TableRow key={beneficiaria.id} className="hover:bg-muted/30" data-testid="beneficiaria-item">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getBeneficiariaInitials(beneficiaria.nome_completo)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{beneficiaria.nome_completo}</div>
                              <div className="text-sm text-muted-foreground">{beneficiaria.telefone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{formatCpf(beneficiaria.cpf)}</TableCell>
                        <TableCell className="font-mono text-sm font-medium text-primary">
                          {generatePaedi(beneficiaria)}
                        </TableCell>
                        <TableCell>{beneficiaria.status || "Não definido"}</TableCell>
                        <TableCell>
                          <Badge variant={getBeneficiariaBadgeVariant(statusDisplay)}>
                            {statusDisplay}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatBeneficiariaDate(beneficiaria.data_nascimento)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/beneficiarias/${beneficiaria.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver PAEDI
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/beneficiarias/${beneficiaria.id}/editar`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/beneficiarias/${beneficiaria.id}/declaracoes-recibos`)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Gerar Documento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {shouldShowPagination && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {showingFrom} a {showingTo} de {totalItems} beneficiárias
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(displayPage - 1)}
                  disabled={disablePrev}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {displayPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(displayPage + 1)}
                  disabled={disableNext}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
