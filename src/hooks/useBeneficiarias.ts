import { useState, useCallback } from 'react';
import { BeneficiariasService } from '../services/beneficiarias';
import { IBeneficiaria } from '../types/beneficiarias';
import { toast } from 'react-hot-toast';

export const useBeneficiarias = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beneficiarias, setBeneficiarias] = useState<IBeneficiaria[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const listar = useCallback(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await BeneficiariasService.listar(params);
      setBeneficiarias(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Erro ao carregar beneficiárias');
      toast.error('Não foi possível carregar as beneficiárias');
      console.error('Erro ao listar beneficiárias:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const obter = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await BeneficiariasService.obter(id);
      return response.data;
    } catch (err) {
      setError('Erro ao carregar beneficiária');
      toast.error('Não foi possível carregar os dados da beneficiária');
      console.error('Erro ao obter beneficiária:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const criar = useCallback(async (beneficiaria: Partial<IBeneficiaria>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await BeneficiariasService.criar(beneficiaria);
      toast.success('Beneficiária cadastrada com sucesso!');
      return response.data;
    } catch (err) {
      setError('Erro ao criar beneficiária');
      toast.error('Não foi possível cadastrar a beneficiária');
      console.error('Erro ao criar beneficiária:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizar = useCallback(async (id: string, beneficiaria: Partial<IBeneficiaria>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await BeneficiariasService.atualizar(id, beneficiaria);
      toast.success('Beneficiária atualizada com sucesso!');
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar beneficiária');
      toast.error('Não foi possível atualizar os dados da beneficiária');
      console.error('Erro ao atualizar beneficiária:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const excluir = useCallback(async (id: string, motivo: string) => {
    try {
      setLoading(true);
      setError(null);
      await BeneficiariasService.excluir(id, motivo);
      toast.success('Beneficiária excluída com sucesso!');
      return true;
    } catch (err) {
      setError('Erro ao excluir beneficiária');
      toast.error('Não foi possível excluir a beneficiária');
      console.error('Erro ao excluir beneficiária:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    beneficiarias,
    pagination,
    listar,
    obter,
    criar,
    atualizar,
    excluir
  };
};
