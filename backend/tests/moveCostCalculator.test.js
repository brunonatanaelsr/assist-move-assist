const { calculateMoveCost, CONSTANTS } = require('../utils/moveCostCalculator');
const { Decimal } = require('decimal.js');

describe('calculateMoveCost', () => {
  test('calcula custo básico corretamente', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: false,
      isWeekend: false
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe('450.00'); // 150 (base) + 200 (volume) + 50 (distância)
  });

  test('aplica multiplicador para itens frágeis', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: true,
      isWeekend: false
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe('540.00'); // (150 + 200 + 50) * 1.2
  });

  test('aplica multiplicador de fim de semana', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: false,
      isWeekend: true
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe('585.00'); // (150 + 200 + 50) * 1.3
  });

  test('considera paradas adicionais', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: false,
      isWeekend: false,
      additionalStops: 2
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe('460.00'); // 450 + (2 * 5)
  });

  test('adiciona custo por andar', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: false,
      isWeekend: false,
      floorNumber: 3
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe('480.00'); // 450 + (3 * 10)
  });

  test('rejeita volume abaixo do mínimo', () => {
    const result = calculateMoveCost({
      volume: '0.5',
      distance: '20',
      hasFragileItems: false,
      isWeekend: false
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Volume mínimo é 1m³');
  });

  test('rejeita volume acima do máximo', () => {
    const result = calculateMoveCost({
      volume: '51',
      distance: '20',
      hasFragileItems: false,
      isWeekend: false
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Volume máximo é 50m³');
  });

  test('rejeita distância abaixo do mínimo', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '0.5',
      hasFragileItems: false,
      isWeekend: false
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Distância mínima é 1km');
  });

  test('rejeita distância acima do máximo', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '101',
      hasFragileItems: false,
      isWeekend: false
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Distância máxima é 100km');
  });

  test('lida com números decimais precisos', () => {
    const result = calculateMoveCost({
      volume: '10.5',
      distance: '20.7',
      hasFragileItems: false,
      isWeekend: false
    });

    expect(result.success).toBe(true);
    const expectedTotal = new Decimal('150.00')  // base
      .plus(new Decimal('10.5').times('20.00'))  // volume
      .plus(new Decimal('20.7').times('2.50'))   // distância
      .toDecimalPlaces(2)
      .toString();
    expect(result.total).toBe(expectedTotal);
  });

  test('retorna detalhes do cálculo', () => {
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
