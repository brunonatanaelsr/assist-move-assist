import { Pool } from 'pg';
import { logger } from '../config/logger';

interface CacheOptions {
  ttl?: number; // tempo em segundos
  staleIfError?: boolean; // usar cache expirado em caso de erro
}

class CacheService {
  private pool: Pool;
  private defaultTTL: number = 3600; // 1 hora

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const query = `
        SELECT value, expires_at 
        FROM api_cache 
        WHERE key = $1
      `;
      
      const result = await this.pool.query(query, [key]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const { value, expires_at } = result.rows[0];
      
      // Retorna null se expirado
      if (new Date(expires_at) < new Date()) {
        return null;
      }

      return value as T;
    } catch (error) {
      logger.error('Erro ao buscar cache:', { error, key });
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const expires_at = new Date(Date.now() + ttl * 1000);

      const query = `
        INSERT INTO api_cache (key, value, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
      `;

      await this.pool.query(query, [key, value, expires_at]);
    } catch (error) {
      logger.error('Erro ao salvar cache:', { error, key });
      throw error;
    }
  }

  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Tenta buscar do cache
      const cached = await this.get<T>(key);
      if (cached) {
        return cached;
      }

      // Se não encontrou, busca dado novo
      const fresh = await fetchFn();
      
      // Salva no cache
      await this.set(key, fresh, options);
      
      return fresh;
    } catch (error) {
      // Se configurado para usar cache expirado em caso de erro
      if (options.staleIfError) {
        const stale = await this.getStale<T>(key);
        if (stale) {
          logger.warn('Usando cache expirado devido a erro:', { key, error });
          return stale;
        }
      }
      
      throw error;
    }
  }

  private async getStale<T>(key: string): Promise<T | null> {
    try {
      const query = `
        SELECT value
        FROM api_cache 
        WHERE key = $1
      `;
      
      const result = await this.pool.query(query, [key]);
      return result.rows[0]?.value as T || null;
    } catch (error) {
      logger.error('Erro ao buscar cache expirado:', { error, key });
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.pool.query(
        'DELETE FROM api_cache WHERE key = $1',
        [key]
      );
    } catch (error) {
      logger.error('Erro ao deletar cache:', { error, key });
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.pool.query('TRUNCATE TABLE api_cache');
    } catch (error) {
      logger.error('Erro ao limpar cache:', { error });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.pool.query('SELECT cleanup_expired_cache()');
    } catch (error) {
      logger.error('Erro na limpeza automática do cache:', { error });
      throw error;
    }
  }
}

export default CacheService;
