import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { FormData } from '@/types';

export default function DebugDashboard() {
  const [debug, setDebug] = useState<FormData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const debugLoad = async () => {
      try {
        console.log('=== DEBUG DASHBOARD ===');
        
        // Testar API
        console.log('Testando API...');
        const response = await api.getBeneficiarias();
        console.log('Resposta da API:', response);

        setDebug({
          apiResponse: response,
          dataType: typeof response.data,
          dataIsArray: Array.isArray(response.data),
          dataLength: response.data?.length || 0,
          responseKeys: Object.keys(response || {}),
          error: null
        });
        
      } catch (error) {
        console.error('Erro no debug:', error);
        setDebug({
          error: error.message,
          stack: error.stack
        });
      } finally {
        setLoading(false);
      }
    };

    debugLoad();
  }, []);

  if (loading) {
    return <div className="p-4">Carregando debug...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🐛 Debug Dashboard</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify(debug, null, 2)}
        </pre>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold">Console Logs:</h2>
        <p>Abra o DevTools (F12) para ver os logs detalhados.</p>
      </div>
    </div>
  );
}
