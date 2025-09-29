import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, MoreHorizontal, Edit, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { UseBeneficiariasListConfig } from '@/hooks/useBeneficiariasList';
import useBeneficiariasList from '@/hooks/useBeneficiariasList';
import {
  deriveBeneficiariaStatus,
  formatBeneficiariaDate,
  formatCpf,
  generatePaedi,
  getBeneficiariaBadgeVariant,
  getBeneficiariaInitials,
} from '@/utils/beneficiarias';
import type { Beneficiaria } from '@/types/shared';

export interface BeneficiariasPageProps extends UseBeneficiariasListConfig {}

export default function BeneficiariasPage(props: BeneficiariasPageProps = {}) {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  const {
    beneficiarias,
    stats,
    filters: { searchTerm, selectedStatus, programaFilter },
    setFilters,
    resetFilters,
    hasSearch,
    showLoading,
    queryError,
    activeFilterCount,
    pagination,
    statusOptions,
    programOptions,
  } = useBeneficiariasList(props);

  const pageSize = pagination.pageSize;
  const totalItems = pagination.totalItems;
  const totalPages = pagination.totalPages;
  const safePage = pagination.currentPage;
  const showingFrom = pagination.showingFrom;
  const showingTo = pagination.showingTo;

  const showEmptyState = !showLoading && !queryError && beneficiarias.length === 0;
  const hasPagination = totalItems > pageSize;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Beneficiárias</h1>
          <p className="text-muted-foreground">Gerencie o cadastro das beneficiárias do instituto</p>
        </div>
        <Button
          className="w-fit"
          size="lg"
          onClick={() => navigate('/beneficiarias/nova')}
          data-testid="cadastrar-beneficiaria"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Beneficiária
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{showLoading ? '...' : stats.total}</div>
            <p className="text-sm text-muted-foreground">Total de Beneficiárias</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{showLoading ? '...' : stats.ativas}</div>
            <p className="text-sm text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{showLoading ? '...' : stats.aguardando}</div>
            <p className="text-sm text-muted-foreground">Aguardando</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{showLoading ? '...' : stats.inativas}</div>
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
                {queryError.message || 'Ocorreu um erro ao carregar os dados. Tente novamente.'}
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
                <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
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
              <Button variant="default" onClick={() => setFilters({ search: searchTerm, page: 1 })} data-testid="search-button">
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
                      {statusOptions.map((option) => (
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
                      {programOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetFilters();
                        setShowFilters(false);
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
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Nascimento</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {showLoading ? (
                  <TableRow data-testid="beneficiarias-loading">
                    <TableCell colSpan={7} className="py-4">
                      <ListSkeleton rows={pageSize} columns={6} />
                    </TableCell>
                  </TableRow>
                ) : showEmptyState ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
                      <EmptyState
                        title={hasSearch ? 'Nenhuma beneficiária encontrada' : 'Nenhuma beneficiária cadastrada'}
                        description={
                          hasSearch
                            ? 'Ajuste sua busca ou filtros e tente novamente.'
                            : 'Comece cadastrando a primeira beneficiária.'
                        }
                        actionLabel={!hasSearch ? 'Cadastrar beneficiária' : undefined}
                        onAction={!hasSearch ? () => navigate('/beneficiarias/nova') : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  beneficiarias.map((beneficiaria: Beneficiaria) => {
                    const statusDisplay = deriveBeneficiariaStatus(beneficiaria);
                    const badgeVariant = getBeneficiariaBadgeVariant(statusDisplay);
                    const telefone = beneficiaria.telefone || beneficiaria.contato1 || beneficiaria.telefone_secundario || 'Não informado';

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
                              <div className="text-sm text-muted-foreground">{beneficiaria.email || telefone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{formatCpf(beneficiaria.cpf)}</TableCell>
                        <TableCell className="font-mono text-sm font-medium text-primary">
                          {generatePaedi(beneficiaria)}
                        </TableCell>
                        <TableCell>{telefone}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant}>{statusDisplay}</Badge>
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
                              <DropdownMenuItem onClick={() => navigate(`/beneficiarias/${beneficiaria.id}/formularios/declaracoes-recibos`)}>
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
          {hasPagination && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {showingFrom} a {showingTo} de {totalItems} beneficiárias
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ page: Math.max(safePage - 1, 1) })}
                  disabled={safePage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {safePage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ page: Math.min(safePage + 1, totalPages) })}
                  disabled={safePage === totalPages}
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
