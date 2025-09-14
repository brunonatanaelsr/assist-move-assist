import React, { createContext, useContext, useState, useCallback } from 'react';
import { Formulario, FormularioFiltros, TipoFormulario } from '../types/formularios';
import { apiService } from '@/services/apiService';

interface FormulariosContextData {
  formularios: Formulario[];
  filtros: FormularioFiltros;
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  setFiltros: (filtros: FormularioFiltros) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  carregarFormularios: () => Promise<void>;
  carregarFormulario: (id: number, tipo: TipoFormulario) => Promise<Formulario | null>;
  salvarFormulario: (formulario: Partial<Formulario>) => Promise<Formulario>;
  excluirFormulario: (id: number) => Promise<void>;
}

const FormulariosContext = createContext<FormulariosContextData>(
  {} as FormulariosContextData
);

export const FormulariosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [filtros, setFiltros] = useState<FormularioFiltros>({});
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const carregarFormularios = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: pageSize,
      };
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.beneficiaria_id) params.beneficiaria_id = filtros.beneficiaria_id;
      if (filtros.data_inicio) params.data_inicio = filtros.data_inicio.toISOString();
      if (filtros.data_fim) params.data_fim = filtros.data_fim.toISOString();
      if (filtros.responsavel) params.responsavel = filtros.responsavel;

      const resp = await apiService.listFormularios(params);
      if (resp.success) {
        const d: any = resp.data || {};
        setFormularios(d.data || []);
        setTotal(d.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtros]);

  const carregarFormulario = useCallback(async (id: number, tipo: TipoFormulario) => {
    try {
      const resp = await apiService.getFormulario(String(tipo), id);
      return resp.success ? (resp.data as any) : null;
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      return null;
    }
  }, []);

  const salvarFormulario = useCallback(async (formulario: Partial<Formulario>) => {
    try {
      if (!formulario.tipo) throw new Error('tipo é obrigatório');
      if (formulario.id) {
        const resp = await apiService.updateFormulario(String(formulario.tipo), Number(formulario.id), formulario);
        if (!resp.success) throw new Error(resp.message || 'Falha ao atualizar formulário');
        await carregarFormularios();
        return resp.data as any;
      } else {
        const resp = await apiService.createFormulario(String(formulario.tipo), formulario);
        if (!resp.success) throw new Error(resp.message || 'Falha ao criar formulário');
        await carregarFormularios();
        return resp.data as any;
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      throw error;
    }
  }, [carregarFormularios]);

  const excluirFormulario = useCallback(async (id: number) => {
    try {
      // Endpoint de exclusão para formulários genéricos
      const resp = await apiService.delete<any>(`/formularios/${id}`);
      if (resp && (resp as any).success === false) throw new Error((resp as any).message || 'Falha ao excluir formulário');
      await carregarFormularios();
    } catch (error) {
      console.error('Erro ao excluir formulário:', error);
      throw error;
    }
  }, [carregarFormularios]);

  return (
    <FormulariosContext.Provider
      value={{
        formularios,
        filtros,
        loading,
        total,
        page,
        pageSize,
        setFiltros,
        setPage,
        setPageSize,
        carregarFormularios,
        carregarFormulario,
        salvarFormulario,
        excluirFormulario,
      }}
    >
      {children}
    </FormulariosContext.Provider>
  );
};

export const useFormularios = () => {
  const context = useContext(FormulariosContext);
  if (!context) {
    throw new Error('useFormularios must be used within a FormulariosProvider');
  }
  return context;
};
