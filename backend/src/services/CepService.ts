import axios from 'axios';
import { redis } from '../lib/redis';
import { logger } from '../utils/logger';

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
  erro?: boolean;
}

export class CepService {
  private readonly CACHE_TTL = 60 * 60 * 24 * 7; // 7 dias
  private readonly RATE_LIMIT_TTL = 60; // 1 minuto
  private readonly MAX_REQUESTS = 30; // Máximo de requisições por minuto

  constructor(private readonly redisClient = redis) {}

  async consultaCep(cep: string): Promise<ViaCepResponse> {
    const cleanCep = cep.replace(/\D/g, '');
    
    // Validação básica do CEP
    if (cleanCep.length !== 8) {
      throw new Error('CEP inválido');
    }

    // Verificar cache
    const cachedData = await this.redisClient.get(`cep:${cleanCep}`);
    if (cachedData) {
      logger.debug('CEP encontrado no cache', { cep: cleanCep });
      return JSON.parse(cachedData);
    }

    // Verificar rate limit
    const rateKey = `cep:ratelimit:${new Date().getMinutes()}`;
    const requestCount = await this.redisClient.incr(rateKey);
    
    // Definir TTL na primeira requisição do minuto
    if (requestCount === 1) {
      await this.redisClient.expire(rateKey, this.RATE_LIMIT_TTL);
    }

    // Verificar limite de requisições
    if (requestCount > this.MAX_REQUESTS) {
      logger.warn('Rate limit excedido para consulta de CEP', { cep: cleanCep });
      throw new Error('Muitas requisições. Tente novamente em alguns minutos.');
    }

    try {
      // Consultar ViaCEP
      const response = await axios.get<ViaCepResponse>(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
        { timeout: 5000 }
      );

      if (response.data.erro) {
        throw new Error('CEP não encontrado');
      }

      // Salvar no cache
      await this.redisClient.setex(
        `cep:${cleanCep}`,
        this.CACHE_TTL,
        JSON.stringify(response.data)
      );

      logger.debug('CEP consultado com sucesso', { cep: cleanCep });
      return response.data;

    } catch (error) {
      logger.error('Erro ao consultar CEP', { 
        cep: cleanCep, 
        error: error.message 
      });
      throw new Error('Erro ao consultar CEP. Tente novamente.');
    }
  }

  async preloadCeps(ceps: string[]): Promise<void> {
    const promises = ceps.map(async (cep) => {
      try {
        await this.consultaCep(cep);
      } catch (error) {
        logger.warn('Erro ao pré-carregar CEP', { 
          cep, 
          error: error.message 
        });
      }
    });

    await Promise.all(promises);
  }

  async clearCache(cep: string): Promise<void> {
    const cleanCep = cep.replace(/\D/g, '');
    await this.redisClient.del(`cep:${cleanCep}`);
  }
}
