import React, { createContext, useContext, useState, useCallback } from 'react';
import { Formulario, FormularioFiltros, TipoFormulario } from '../types/formularios';

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
      const response = await fetch('/api/formularios?' + new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...filtros.tipo && { tipo: filtros.tipo },
        ...filtros.beneficiaria_id && { beneficiaria_id: filtros.beneficiaria_id.toString() },
        ...filtros.data_inicio && { data_inicio: filtros.data_inicio.toISOString() },
        ...filtros.data_fim && { data_fim: filtros.data_fim.toISOString() },
        ...filtros.responsavel && { responsavel: filtros.responsavel }
      }));

      const data = await response.json();
      setFormularios(data.data);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtros]);

  const carregarFormulario = useCallback(async (id: number, tipo: TipoFormulario) => {
    try {
      const response = await fetch(`/api/formularios/${tipo}/${id}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      return null;
    }
  }, []);

  const salvarFormulario = useCallback(async (formulario: Partial<Formulario>) => {
    try {
      const response = await fetch('/api/formularios', {
        method: formulario.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formulario),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }

      await carregarFormularios();
      return data.data;
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      throw error;
    }
  }, [carregarFormularios]);

  const excluirFormulario = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/formularios/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }

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
