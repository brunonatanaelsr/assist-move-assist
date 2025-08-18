import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { OficinasService } from '../services/oficinas';
import { IOficina } from '../types/oficinas';
import { cn } from '../lib/utils';

export function ListaOficinas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['oficinas', { page, search }],
    queryFn: () => OficinasService.listar({
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
      accessorKey: 'titulo' as keyof IOficina,
    },
    {
      header: 'Facilitadora',
      accessorKey: 'facilitadora' as keyof IOficina,
    },
    {
      header: 'Data Início',
      accessorKey: 'data_inicio' as keyof IOficina,
      cell: (item: IOficina) => 
        format(new Date(item.data_inicio), 'dd/MM/yyyy', { locale: ptBR })
    },
    {
      header: 'Horário',
      accessorKey: 'horario_inicio' as keyof IOficina,
      cell: (item: IOficina) => `${item.horario_inicio} - ${item.horario_fim}`
    },
    {
      header: 'Vagas',
      accessorKey: 'vagas_disponiveis' as keyof IOficina,
      cell: (item: IOficina) => `${item.vagas_disponiveis}/${item.vagas_total}`
    },
    {
      header: 'Status',
      accessorKey: 'status' as keyof IOficina,
      cell: (item: IOficina) => (
        <div className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          {
            'bg-yellow-100 text-yellow-800': item.status === 'PLANEJADA',
            'bg-green-100 text-green-800': item.status === 'EM_ANDAMENTO',
            'bg-blue-100 text-blue-800': item.status === 'CONCLUIDA',
            'bg-red-100 text-red-800': item.status === 'CANCELADA',
          }
        )}>
          {item.status.replace('_', ' ')}
        </div>
      )
    }
  ];

  const actions = [
    {
      label: 'Visualizar',
      onClick: (item: IOficina) => navigate(`/oficinas/${item.id}`)
    },
    {
      label: 'Editar',
      onClick: (item: IOficina) => navigate(`/oficinas/${item.id}/editar`)
    },
    {
      label: 'Participantes',
      onClick: (item: IOficina) => navigate(`/oficinas/${item.id}/participantes`),
      isVisible: (item: IOficina) => 
        ['PLANEJADA', 'EM_ANDAMENTO'].includes(item.status)
    },
    {
      label: 'Excluir',
      onClick: async (item: IOficina) => {
        const motivo = await prompt('Por favor, informe o motivo da exclusão:');
        if (motivo) {
          await OficinasService.excluir(item.id, motivo);
          queryClient.invalidateQueries({ queryKey: ['oficinas'] });
        }
      }
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Oficinas</h1>
        <Button onClick={() => navigate('/oficinas/novo')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nova Oficina
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
          placeholder: 'Buscar por título ou facilitadora...'
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
