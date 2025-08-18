import { useState, useCallback } from 'react';
import { OficinasService } from '../services/oficinas';
import { IOficina } from '../types/oficinas';
import { toast } from 'react-hot-toast';

export const useOficinas = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oficinas, setOficinas] = useState<IOficina[]>([]);
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
      const response = await OficinasService.listar(params);
      setOficinas(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Erro ao carregar oficinas');
      toast.error('Não foi possível carregar as oficinas');
      console.error('Erro ao listar oficinas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const obter = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await OficinasService.obter(id);
      return response.data;
    } catch (err) {
      setError('Erro ao carregar oficina');
      toast.error('Não foi possível carregar os dados da oficina');
      console.error('Erro ao obter oficina:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const criar = useCallback(async (oficina: Partial<IOficina>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await OficinasService.criar(oficina);
      toast.success('Oficina cadastrada com sucesso!');
      return response.data;
    } catch (err) {
      setError('Erro ao criar oficina');
      toast.error('Não foi possível cadastrar a oficina');
      console.error('Erro ao criar oficina:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizar = useCallback(async (id: string, oficina: Partial<IOficina>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await OficinasService.atualizar(id, oficina);
      toast.success('Oficina atualizada com sucesso!');
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar oficina');
      toast.error('Não foi possível atualizar os dados da oficina');
      console.error('Erro ao atualizar oficina:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const excluir = useCallback(async (id: string, motivo: string) => {
    try {
      setLoading(true);
      setError(null);
      await OficinasService.excluir(id, motivo);
      toast.success('Oficina excluída com sucesso!');
      return true;
    } catch (err) {
      setError('Erro ao excluir oficina');
      toast.error('Não foi possível excluir a oficina');
      console.error('Erro ao excluir oficina:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const listarParticipantes = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await OficinasService.listarParticipantes(id);
      return response.data;
    } catch (err) {
      setError('Erro ao carregar participantes');
      toast.error('Não foi possível carregar os participantes da oficina');
      console.error('Erro ao listar participantes:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    oficinas,
    pagination,
    listar,
    obter,
    criar,
    atualizar,
    excluir,
    listarParticipantes
  };
};
