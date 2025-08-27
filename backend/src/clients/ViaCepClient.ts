import { Pool } from 'pg';
import { BaseApiClient } from './BaseApiClient';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export class ViaCepClient extends BaseApiClient {
  constructor(pool: Pool) {
    super(
      'https://viacep.com.br/ws',
      'viacep',
      pool,
      {
        // Configurações específicas para ViaCEP
        circuitBreaker: {
          maxErrors: 3,
          resetTimeout: 30000 // 30 segundos
        },
        retry: {
          maxRetries: 2,
          initialDelay: 500,
          maxDelay: 2000
        }
      }
    );
  }

  async getEndereco(cep: string): Promise<ViaCepResponse> {
    const cleanCep = cep.replace(/\D/g, '');
    
    return this.request<ViaCepResponse>(
      {
        url: `/${cleanCep}/json`,
        method: 'GET'
      },
      `viacep:${cleanCep}`,
      86400 // Cache por 24 horas
    );
  }

  async getEnderecosPorLogradouro(
    uf: string,
    cidade: string,
    logradouro: string
  ): Promise<ViaCepResponse[]> {
    return this.request<ViaCepResponse[]>(
      {
        url: `/${uf}/${cidade}/${logradouro}/json`,
        method: 'GET'
      },
      `viacep:${uf}:${cidade}:${logradouro}`,
      3600 // Cache por 1 hora
    );
  }
}
