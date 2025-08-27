import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Pool } from 'pg';
import { logger } from '../config/logger';
import CacheService from '../services/CacheService';

interface CircuitBreakerConfig {
  maxErrors: number;
  resetTimeout: number; // ms
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
}

export abstract class BaseApiClient {
  protected axios: AxiosInstance;
  protected cache: CacheService;
  protected pool: Pool;
  private serviceName: string;
  
  private circuitBreaker: CircuitBreakerConfig = {
    maxErrors: 5,
    resetTimeout: 60000 // 1 minuto
  };

  private retry: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000, // 1 segundo
    maxDelay: 10000 // 10 segundos
  };

  constructor(
    baseURL: string, 
    serviceName: string,
    pool: Pool,
    config?: {
      circuitBreaker?: Partial<CircuitBreakerConfig>,
      retry?: Partial<RetryConfig>
    }
  ) {
    this.serviceName = serviceName;
    this.pool = pool;
    this.cache = new CacheService(pool);
    
    // Merge configs
    if (config?.circuitBreaker) {
      this.circuitBreaker = { ...this.circuitBreaker, ...config.circuitBreaker };
    }
    if (config?.retry) {
      this.retry = { ...this.retry, ...config.retry };
    }

    this.axios = axios.create({
      baseURL,
      timeout: 5000
    });

    // Interceptors para logs e métricas
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(async (config) => {
      const isCircuitOpen = await this.isCircuitOpen();
      if (isCircuitOpen) {
        throw new Error('Circuit breaker is open');
      }
      return config;
    });

    this.axios.interceptors.response.use(
      async (response) => {
        await this.logApiCall(response.config, response);
        await this.updateIntegrationStatus('success');
        return response;
      },
      async (error) => {
        await this.logApiCall(error.config, error.response, error);
        await this.updateIntegrationStatus('error');
        throw error;
      }
    );
  }

  protected async request<T>(
    config: AxiosRequestConfig,
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<T> {
    try {
      // Se tiver cache key, tenta buscar do cache
      if (cacheKey) {
        const cached = await this.cache.get<T>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Faz a requisição com retry
      const response = await this.retryRequest<T>(config);

      // Se tiver cache key, salva no cache
      if (cacheKey) {
        await this.cache.set(cacheKey, response, { ttl: cacheTTL });
      }

      return response;
    } catch (error) {
      // Em caso de erro, tenta usar cache expirado
      if (cacheKey) {
        const stale = await this.cache.getStale<T>(cacheKey);
        if (stale) {
          logger.warn('Usando cache expirado devido a erro:', { 
            service: this.serviceName,
            error 
          });
          return stale;
        }
      }
      
      throw error;
    }
  }

  private async retryRequest<T>(
    config: AxiosRequestConfig,
    attempt = 1
  ): Promise<T> {
    try {
      const response = await this.axios.request<T>(config);
      return response.data;
    } catch (error) {
      if (attempt >= this.retry.maxRetries) {
        throw error;
      }

      // Calcula delay com exponential backoff
      const delay = Math.min(
        this.retry.initialDelay * Math.pow(2, attempt - 1),
        this.retry.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retryRequest<T>(config, attempt + 1);
    }
  }

  private async logApiCall(
    config: AxiosRequestConfig,
    response: any,
    error?: any
  ): Promise<void> {
    try {
      const endTime = Date.now();
      const startTime = (config as any).startTime || endTime;
      const responseTime = endTime - startTime;

      await this.pool.query(
        `INSERT INTO api_logs (
          endpoint,
          method,
          status,
          response_time,
          error_message,
          request_body,
          response_body
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          config.url,
          config.method,
          response?.status || 500,
          responseTime,
          error?.message,
          config.data,
          response?.data
        ]
      );
    } catch (logError) {
      logger.error('Erro ao salvar log de API:', { logError });
    }
  }

  private async isCircuitOpen(): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT is_circuit_open, circuit_open_until 
         FROM integration_status 
         WHERE service = $1`,
        [this.serviceName]
      );

      if (!result.rows[0]) return false;

      const { is_circuit_open, circuit_open_until } = result.rows[0];

      if (!is_circuit_open) return false;

      // Se passou o tempo de reset, fecha o circuito
      if (new Date(circuit_open_until) < new Date()) {
        await this.updateIntegrationStatus('reset');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Erro ao verificar circuit breaker:', { error });
      return false;
    }
  }

  private async updateIntegrationStatus(
    event: 'success' | 'error' | 'reset'
  ): Promise<void> {
    try {
      switch (event) {
        case 'success':
          await this.pool.query(
            `INSERT INTO integration_status (
              service, 
              status,
              last_success,
              error_count,
              is_circuit_open
            ) VALUES ($1, 'healthy', CURRENT_TIMESTAMP, 0, false)
            ON CONFLICT (service) 
            DO UPDATE SET 
              status = 'healthy',
              last_success = CURRENT_TIMESTAMP,
              error_count = 0,
              is_circuit_open = false,
              updated_at = CURRENT_TIMESTAMP`,
            [this.serviceName]
          );
          break;

        case 'error':
          await this.pool.query(
            `INSERT INTO integration_status (
              service, 
              status,
              error_count,
              is_circuit_open,
              circuit_open_until
            ) VALUES (
              $1, 
              'error',
              1,
              CASE WHEN 1 >= $2 THEN true ELSE false END,
              CASE WHEN 1 >= $2 
                THEN CURRENT_TIMESTAMP + interval '1 minute' * $3
                ELSE null 
              END
            )
            ON CONFLICT (service) 
            DO UPDATE SET 
              status = 'error',
              error_count = 
                CASE WHEN 
                  integration_status.error_count + 1 >= $2 
                THEN 0 ELSE integration_status.error_count + 1 END,
              is_circuit_open = 
                CASE WHEN 
                  integration_status.error_count + 1 >= $2 
                THEN true ELSE false END,
              circuit_open_until = 
                CASE WHEN 
                  integration_status.error_count + 1 >= $2 
                THEN CURRENT_TIMESTAMP + interval '1 minute' * $3
                ELSE null END,
              updated_at = CURRENT_TIMESTAMP`,
            [
              this.serviceName,
              this.circuitBreaker.maxErrors,
              this.circuitBreaker.resetTimeout / 60000
            ]
          );
          break;

        case 'reset':
          await this.pool.query(
            `UPDATE integration_status 
             SET 
              status = 'unknown',
              error_count = 0,
              is_circuit_open = false,
              circuit_open_until = null,
              updated_at = CURRENT_TIMESTAMP
             WHERE service = $1`,
            [this.serviceName]
          );
          break;
      }
    } catch (error) {
      logger.error('Erro ao atualizar status da integração:', { error });
    }
  }
}
