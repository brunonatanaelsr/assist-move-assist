import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { cn } from '../lib/utils';
import { BeneficiariasService } from '../services/beneficiarias';
import { IBeneficiaria } from '../types/beneficiarias';

export function ListaBeneficiarias() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['beneficiarias', { page, search }],
    queryFn: () => BeneficiariasService.listar({
      page,
      limit: 10,
      search,
      orderBy: 'nome_completo',
      orderDir: 'ASC'
    }),
    select: (response) => ({
      data: response.data,
      pagination: response.pagination
    })
  });

  const columns = [
    {
      header: 'Nome',
      accessorKey: 'nome_completo' as keyof IBeneficiaria,
    },
    {
      header: 'CPF',
      accessorKey: 'cpf' as keyof IBeneficiaria,
    },
    {
      header: 'Data de Nascimento',
      accessorKey: 'data_nascimento' as keyof IBeneficiaria,
      cell: (item: IBeneficiaria) => 
        format(new Date(item.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })
    },
    {
      header: 'Telefone',
      accessorKey: 'telefone' as keyof IBeneficiaria,
    },
    {
      header: 'Status',
      accessorKey: 'status' as keyof IBeneficiaria,
      cell: (item: IBeneficiaria) => (
        <div className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          {
            'bg-green-100 text-green-800': item.status === 'ATIVA',
            'bg-yellow-100 text-yellow-800': item.status === 'ACOMPANHAMENTO',
            'bg-red-100 text-red-800': item.status === 'INATIVA',
            'bg-blue-100 text-blue-800': item.status === 'CONCLUIDO',
          }
        )}>
          {item.status}
        </div>
      )
    }
  ];

  const actions = [
    {
      label: 'Visualizar',
      onClick: (item: IBeneficiaria) => navigate(`/beneficiarias/${item.id}`)
    },
    {
      label: 'Editar',
      onClick: (item: IBeneficiaria) => navigate(`/beneficiarias/${item.id}/editar`)
    },
    {
      label: 'Excluir',
      onClick: async (item: IBeneficiaria) => {
        const motivo = await prompt('Por favor, informe o motivo da exclusão:');
        if (motivo) {
          await BeneficiariasService.excluir(item.id, motivo);
          // Recarrega a lista
          queryClient.invalidateQueries({ queryKey: ['beneficiarias'] });
        }
      }
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Beneficiárias</h1>
        <Button onClick={() => navigate('/beneficiarias/novo')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nova Beneficiária
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
          placeholder: 'Buscar por nome, CPF ou email...'
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
