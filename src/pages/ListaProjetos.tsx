import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { ProjetosService } from '../services/projetos';
import { IProjeto } from '../types/projetos';
import { cn } from '../lib/utils';

export function ListaProjetos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projetos', { page, search }],
    queryFn: () => ProjetosService.listar({
      page,
      limit: 10,
      search,
      orderBy: 'titulo',
      orderDir: 'ASC'
    }),
    select: (response) => ({
      data: response.data,
      pagination: response.pagination
    })
  });

  const columns = [
    {
      header: 'Título',
      accessorKey: 'titulo' as keyof IProjeto,
    },
    {
      header: 'Responsável',
      accessorKey: 'responsavel' as keyof IProjeto,
    },
    {
      header: 'Data Início',
      accessorKey: 'data_inicio' as keyof IProjeto,
      cell: (item: IProjeto) => 
        format(new Date(item.data_inicio), 'dd/MM/yyyy', { locale: ptBR })
    },
    {
      header: 'Data Fim',
      accessorKey: 'data_fim' as keyof IProjeto,
      cell: (item: IProjeto) => 
        item.data_fim ? format(new Date(item.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : '-'
    },
    {
      header: 'Status',
      accessorKey: 'status' as keyof IProjeto,
      cell: (item: IProjeto) => (
        <div className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          {
            'bg-yellow-100 text-yellow-800': item.status === 'PLANEJADO',
            'bg-green-100 text-green-800': item.status === 'EM_ANDAMENTO',
            'bg-blue-100 text-blue-800': item.status === 'CONCLUIDO',
            'bg-red-100 text-red-800': item.status === 'CANCELADO',
          }
        )}>
          {item.status.replace('_', ' ')}
        </div>
      )
    },
    {
      header: 'Beneficiárias',
      accessorKey: 'beneficiarias_impactadas' as keyof IProjeto,
      cell: (item: IProjeto) => item.beneficiarias_impactadas || 0
    }
  ];

  const actions = [
    {
      label: 'Visualizar',
      onClick: (item: IProjeto) => navigate(`/projetos/${item.id}`)
    },
    {
      label: 'Editar',
      onClick: (item: IProjeto) => navigate(`/projetos/${item.id}/editar`)
    },
    {
      label: 'Excluir',
      onClick: async (item: IProjeto) => {
        const motivo = await prompt('Por favor, informe o motivo da exclusão:');
        if (motivo) {
          await ProjetosService.excluir(item.id, motivo);
          queryClient.invalidateQueries({ queryKey: ['projetos'] });
        }
      }
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <Button onClick={() => navigate('/projetos/novo')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        actions={actions}
        loading={isLoading}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar por título ou responsável...'
        }}
        pagination={data?.pagination && {
          ...data.pagination,
          page,
          onPageChange: setPage
        }}
      />
    </div>
  );
}
