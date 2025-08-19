const { calculateMoveCost } = require('../utils/moveCostCalculator');
const { calculateMoveCostWithCache } = require('../utils/moveCostService');

/**
 * Função auxiliar para medir tempo de execução
 * @param {Function} fn Função a ser medida
 * @param {Array} args Argumentos para a função
 */
async function measureExecutionTime(fn, args) {
  const start = process.hrtime();
  await fn(...args);
  const [seconds, nanoseconds] = process.hrtime(start);
  return seconds * 1000 + nanoseconds / 1e6; // Converter para milissegundos
}

/**
 * Executa benchmark dos cálculos de custo
 * @param {number} iterations Número de iterações
 */
async function runBenchmark(iterations = 1000) {
  console.log(`\nExecutando benchmark com ${iterations} iterações...`);
  console.log('----------------------------------------');

  // Parâmetros de teste
  const testParams = {
    volume: '10',
    distance: '20',
    hasFragileItems: true,
    isWeekend: false,
    additionalStops: 2,
    floorNumber: 3
  };

  // Benchmark sem cache
  let totalTimeNoCache = 0;
  for (let i = 0; i < iterations; i++) {
    totalTimeNoCache += await measureExecutionTime(calculateMoveCost, [testParams]);
  }

  // Benchmark com cache
  let totalTimeWithCache = 0;
  for (let i = 0; i < iterations; i++) {
    totalTimeWithCache += await measureExecutionTime(calculateMoveCostWithCache, [testParams]);
  }

  // Calcular médias
  const avgTimeNoCache = totalTimeNoCache / iterations;
  const avgTimeWithCache = totalTimeWithCache / iterations;
  const improvement = ((avgTimeNoCache - avgTimeWithCache) / avgTimeNoCache) * 100;

  // Imprimir resultados
  console.log('Resultados do Benchmark:');
  console.log('----------------------------------------');
  console.log(`Tempo médio sem cache: ${avgTimeNoCache.toFixed(2)}ms`);
  console.log(`Tempo médio com cache: ${avgTimeWithCache.toFixed(2)}ms`);
  console.log(`Melhoria de performance: ${improvement.toFixed(2)}%`);
  console.log('----------------------------------------');
}

// Exportar para uso via CLI
if (require.main === module) {
  runBenchmark().catch(console.error);
}

module.exports = {
  runBenchmark
};
