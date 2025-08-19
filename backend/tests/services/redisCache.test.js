const Redis = require('redis');
const { withCache, invalidateCache, generateCacheKey } = require('../../utils/redisCache');

// Mock do Redis
jest.mock('redis', () => {
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };

  return {
    createClient: jest.fn().mockReturnValue(mockRedisClient)
  };
});

describe('Redis Cache Tests', () => {
  let redisClient;

  beforeEach(() => {
    redisClient = Redis.createClient();
    jest.clearAllMocks();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const params1 = { a: 1, b: 2, c: 3 };
      const params2 = { c: 3, b: 2, a: 1 };

      const key1 = generateCacheKey('test', params1);
      const key2 = generateCacheKey('test', params2);

      // Mesmos parâmetros em ordem diferente devem gerar mesma chave
      expect(key1).toBe(key2);
    });

    it('should handle nested objects', () => {
      const params = {
        outer: {
          inner: {
            value: 42
          }
        }
      };

      const key = generateCacheKey('test', params);
      expect(key).toContain('test:');
      expect(key).toContain('42');
    });
  });

  describe('Cache Operations', () => {
    it('should return cached data when available', async () => {
      const key = 'test:key';
      const cachedData = { value: 42 };
      redisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const fn = jest.fn();
      const result = await withCache(key, fn);

      expect(result).toEqual(cachedData);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call function when cache misses', async () => {
      const key = 'test:key';
      const data = { value: 42 };
      redisClient.get.mockResolvedValue(null);
      const fn = jest.fn().mockResolvedValue(data);

      const result = await withCache(key, fn);

      expect(result).toEqual(data);
      expect(fn).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalled();
    });

    it('should handle cache invalidation', async () => {
      const key = 'test:key';
      await invalidateCache(key);

      expect(redisClient.del).toHaveBeenCalledWith(key);
    });
  });

  describe('Error Handling', () => {
    it('should fallback to function on Redis error', async () => {
      const key = 'test:key';
      const data = { value: 42 };
      redisClient.get.mockRejectedValue(new Error('Redis Error'));
      const fn = jest.fn().mockResolvedValue(data);

      const result = await withCache(key, fn);

      expect(result).toEqual(data);
      expect(fn).toHaveBeenCalled();
    });

    it('should handle function errors', async () => {
      const key = 'test:key';
      const error = new Error('Function Error');
      redisClient.get.mockResolvedValue(null);
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withCache(key, fn)).rejects.toThrow(error);
    });

    it('should handle cache invalidation errors', async () => {
      const key = 'test:key';
      redisClient.del.mockRejectedValue(new Error('Redis Error'));

      await expect(invalidateCache(key)).resolves.not.toThrow();
    });
  });

  describe('TTL Handling', () => {
    it('should set default TTL', async () => {
      const key = 'test:key';
      const data = { value: 42 };
      redisClient.get.mockResolvedValue(null);
      const fn = jest.fn().mockResolvedValue(data);

      await withCache(key, fn);

      expect(redisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(data),
        'EX',
        300 // 5 minutes default
      );
    });

    it('should respect custom TTL', async () => {
      const key = 'test:key';
      const data = { value: 42 };
      const ttl = 60; // 1 minute
      redisClient.get.mockResolvedValue(null);
      const fn = jest.fn().mockResolvedValue(data);

      await withCache(key, fn, ttl);

      expect(redisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(data),
        'EX',
        ttl
      );
    });
  });
});
