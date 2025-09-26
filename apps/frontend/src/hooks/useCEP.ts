import { useCallback, useState } from 'react';

type CEPResult = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string; // estado
  erro?: boolean;
};

export function useCEP() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCEP = useCallback(async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data: CEPResult = await res.json();
      if ((data as any).erro) {
        setError('CEP não encontrado');
        return null;
      }
      return data;
    } catch (e: any) {
      setError('Erro ao buscar CEP');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchCEP, loading, error };
}

export default useCEP;

