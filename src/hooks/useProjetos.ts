import { useState, useCallback } from 'react';
import { ProjetosService } from '../services/projetos';
import { IProjeto } from '../types/projetos';
import { toast } from 'react-hot-toast';

export const useProjetos = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projetos, setProjetos] = useState<IProjeto[]>([]);
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
      const response = await ProjetosService.listar(params);
      setProjetos(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Erro ao carregar projetos');
      toast.error('Não foi possível carregar os projetos');
      console.error('Erro ao listar projetos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const obter = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await ProjetosService.obter(id);
      return response.data;
    } catch (err) {
      setError('Erro ao carregar projeto');
      toast.error('Não foi possível carregar os dados do projeto');
      console.error('Erro ao obter projeto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const criar = useCallback(async (projeto: Partial<IProjeto>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await ProjetosService.criar(projeto);
      toast.success('Projeto cadastrado com sucesso!');
      return response.data;
    } catch (err) {
      setError('Erro ao criar projeto');
      toast.error('Não foi possível cadastrar o projeto');
      console.error('Erro ao criar projeto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizar = useCallback(async (id: string, projeto: Partial<IProjeto>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await ProjetosService.atualizar(id, projeto);
      toast.success('Projeto atualizado com sucesso!');
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar projeto');
      toast.error('Não foi possível atualizar os dados do projeto');
      console.error('Erro ao atualizar projeto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const excluir = useCallback(async (id: string, motivo: string) => {
    try {
      setLoading(true);
      setError(null);
      await ProjetosService.excluir(id, motivo);
      toast.success('Projeto excluído com sucesso!');
      return true;
    } catch (err) {
      setError('Erro ao excluir projeto');
      toast.error('Não foi possível excluir o projeto');
      console.error('Erro ao excluir projeto:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    projetos,
    pagination,
    listar,
    obter,
    criar,
    atualizar,
    excluir
  };
};
