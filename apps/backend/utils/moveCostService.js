const { calculateMoveCost } = require('./moveCostCalculator');

const cacheStore = new Map();

function generateCacheKey(prefix, params = {}) {
  const sortValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => sortValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = sortValue(value[key]);
          return acc;
        }, {});
    }

    return value;
  };

  const sorted = sortValue(params);
  return `${prefix}:${JSON.stringify(sorted)}`;
}

async function withCache(key, resolver, ttlSeconds = 300) {
  const now = Date.now();
  const cached = cacheStore.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const result = await Promise.resolve(resolver());
  cacheStore.set(key, {
    value: result,
    expiresAt: now + ttlSeconds * 1000
  });

  return result;
}

/**
 * Calcula o custo da mudança com cache
 * @param {Object} params Parâmetros do cálculo
 * @returns {Promise<Object>} Resultado do cálculo
 */
async function calculateMoveCostWithCache(params) {
  // Gerar chave de cache baseada nos parâmetros
  const cacheKey = generateCacheKey('move:cost', {
    volume: params.volume,
    distance: params.distance,
    hasFragileItems: params.hasFragileItems,
    isWeekend: params.isWeekend,
    additionalStops: params.additionalStops,
    floorNumber: params.floorNumber
  });

  // Cache por 1 hora para cálculos frequentes
  return withCache(cacheKey, () => calculateMoveCost(params), 60 * 60);
}

module.exports = {
  calculateMoveCostWithCache
};
