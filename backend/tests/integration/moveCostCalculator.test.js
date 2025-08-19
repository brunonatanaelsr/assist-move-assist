const { calculateMoveCost, CONSTANTS } = require('../../utils/moveCostCalculator');
const { calculateMoveCostWithCache } = require('../../utils/moveCostService');
const { Decimal } = require('decimal.js');

describe('Move Cost Calculator Tests', () => {
  describe('Basic Calculations', () => {
    it('should calculate base cost correctly', () => {
      const result = calculateMoveCost({
        volume: '10',
        distance: '20',
        hasFragileItems: false,
        isWeekend: false
      });

      expect(result.success).toBe(true);
      // Custo base (150) + Volume (10 * 20) + Distância (20 * 2.5)
      expect(result.total).toBe('400.00');
    });

    it('should apply fragile items multiplier', () => {
      const result = calculateMoveCost({
        volume: '10',
        distance: '20',
        hasFragileItems: true,
        isWeekend: false
      });

      expect(result.success).toBe(true);
      // (Custo base + Volume + Distância) * 1.2
      expect(result.total).toBe('480.00');
    });

    it('should apply weekend multiplier', () => {
      const result = calculateMoveCost({
        volume: '10',
        distance: '20',
        hasFragileItems: false,
        isWeekend: true
      });

      expect(result.success).toBe(true);
      // (Custo base + Volume + Distância) * 1.3
      expect(result.total).toBe('520.00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum values', () => {
      const result = calculateMoveCost({
        volume: '1',
        distance: '1',
        hasFragileItems: false,
        isWeekend: false
      });

      expect(result.success).toBe(true);
      // Custo base (150) + Volume (1 * 20) + Distância (1 * 2.5)
      expect(result.total).toBe('172.50');
    });

    it('should reject volume below minimum', () => {
      const result = calculateMoveCost({
        volume: '0.5',
        distance: '20',
        hasFragileItems: false,
        isWeekend: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Volume mínimo é 1m³');
    });

    it('should reject distance above maximum', () => {
      const result = calculateMoveCost({
        volume: '10',
        distance: '101',
        hasFragileItems: false,
        isWeekend: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Distância máxima é 100km');
    });
  });

  describe('Additional Features', () => {
    it('should calculate additional stops cost', () => {
      const result = calculateMoveCost({
        volume: '10',
        distance: '20',
        hasFragileItems: false,
        isWeekend: false,
        additionalStops: 2
      });

      expect(result.success).toBe(true);
      // Base (400) + Stops (2 * 5)
      expect(result.total).toBe('410.00');
    });

    it('should calculate floor number cost', () => {
      const result = calculateMoveCost({
        volume: '10',
        distance: '20',
        hasFragileItems: false,
        isWeekend: false,
        floorNumber: 3
      });

      expect(result.success).toBe(true);
      // Base (400) + Floors (3 * 10)
      expect(result.total).toBe('430.00');
    });
  });

  describe('Precision and Rounding', () => {
    it('should handle decimal values precisely', () => {
      const result = calculateMoveCost({
        volume: '10.5',
        distance: '20.7',
        hasFragileItems: false,
        isWeekend: false
      });

      expect(result.success).toBe(true);
      // Verificar se o resultado tem exatamente 2 casas decimais
      expect(result.total).toMatch(/^\d+\.\d{2}$/);
    });

    it('should maintain precision with multiple multipliers', () => {
      const result = calculateMoveCost({
        volume: '10.5',
        distance: '20.7',
        hasFragileItems: true,
        isWeekend: true,
        additionalStops: 2,
        floorNumber: 3
      });

      expect(result.success).toBe(true);
      expect(result.total).toMatch(/^\d+\.\d{2}$/);
    });
  });

  describe('Detailed Cost Breakdown', () => {
    it('should provide detailed cost breakdown', () => {
      const result = calculateMoveCost({
        volume: '10',
        distance: '20',
        hasFragileItems: true,
        isWeekend: true,
        additionalStops: 2,
        floorNumber: 3
      });

      expect(result.success).toBe(true);
      expect(result.details).toEqual(expect.objectContaining({
        baseCost: '150.00',
        volumeCost: '200.00',
        distanceCost: '50.00',
        stopsCost: '10.00',
        floorCost: '30.00',
        hasFragileItems: true,
        isWeekend: true,
        multipliers: {
          fragileItems: '1.20',
          weekend: '1.30'
        }
      }));
    });
  });
});

describe('Move Cost Service Tests', () => {
  describe('Cache Integration', () => {
    it('should use cache for repeated calculations', async () => {
      const params = {
        volume: '10',
        distance: '20',
        hasFragileItems: false,
        isWeekend: false
      };

      // Primeira chamada - deve calcular
      const result1 = await calculateMoveCostWithCache(params);
      expect(result1.success).toBe(true);

      // Segunda chamada - deve usar cache
      const result2 = await calculateMoveCostWithCache(params);
      expect(result2.success).toBe(true);
      expect(result2.total).toBe(result1.total);
    });

    it('should recalculate for different parameters', async () => {
      const result1 = await calculateMoveCostWithCache({
        volume: '10',
        distance: '20',
        hasFragileItems: false,
        isWeekend: false
      });

      const result2 = await calculateMoveCostWithCache({
        volume: '15',
        distance: '25',
        hasFragileItems: true,
        isWeekend: true
      });

      expect(result1.total).not.toBe(result2.total);
    });
  });
});
