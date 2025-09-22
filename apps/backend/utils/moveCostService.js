const { withCache, generateCacheKey } = require('./redisCache');
const { calculateMoveCost } = require('./moveCostCalculator');

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
