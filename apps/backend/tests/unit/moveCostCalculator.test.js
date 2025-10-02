const { calculateMoveCost, CONSTANTS } = require('../utils/moveCostCalculator');
const { Decimal } = require('decimal.js');

describe('calculateMoveCost', () => {
  const computeExpectedTotal = ({
    volume,
    distance,
    hasFragileItems = false,
    isWeekend = false,
    additionalStops = 0,
    floorNumber = 0
  }) => {
    const volumeDecimal = new Decimal(volume);
    const distanceDecimal = new Decimal(distance);
    const additionalStopsDecimal = new Decimal(additionalStops);
    const floorNumberDecimal = new Decimal(floorNumber);

    let subtotal = CONSTANTS.BASE_COST
      .plus(volumeDecimal.times(CONSTANTS.VOLUME_COST_M3))
      .plus(distanceDecimal.times(CONSTANTS.DISTANCE_COST_KM));

    if (hasFragileItems) {
      subtotal = subtotal.times(CONSTANTS.WEIGHT_FACTOR);
    }

    const stopsCost = additionalStopsDecimal.times(CONSTANTS.DISTANCE_COST_KM.times(2));
    subtotal = subtotal.plus(stopsCost);

    if (floorNumberDecimal.greaterThan(0)) {
      subtotal = subtotal.plus(floorNumberDecimal.times(new Decimal('10.00')));
    }

    if (isWeekend) {
      subtotal = subtotal.times(CONSTANTS.WEEKEND_MULTIPLIER);
    }

    return subtotal.toDecimalPlaces(2).toString();
  };

  test('calcula custo básico corretamente', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: false,
      isWeekend: false
    });

    expect(result.success).toBe(true);
    const expectedTotal = computeExpectedTotal({ volume: '10', distance: '20' });
    expect(result.total).toBe(expectedTotal); // 150 (base) + 200 (volume) + 50 (distância) = 400
  });

  test('aplica multiplicador para itens frágeis', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: true,
      isWeekend: false
    });

    expect(result.success).toBe(true);
    const expectedTotal = computeExpectedTotal({
      volume: '10',
      distance: '20',
      hasFragileItems: true
    });
    expect(result.total).toBe(expectedTotal); // (150 + 200 + 50) * 1.2 = 480
  });

  test('aplica multiplicador de fim de semana', () => {
    const result = calculateMoveCost({
      volume: '10',
      distance: '20',
      hasFragileItems: false,
      isWeekend: true
    });

    expect(result.success).toBe(true);
    const expectedTotal = computeExpectedTotal({
      volume: '10',
      distance: '20',
      isWeekend: true
    });
    expect(result.total).toBe(expectedTotal); // (150 + 200 + 50) * 1.3 = 520
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
    const expectedTotal = computeExpectedTotal({
      volume: '10',
      distance: '20',
      additionalStops: 2
    });
    expect(result.total).toBe(expectedTotal); // 150 + 200 + 50 + (2 * 5) = 410
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
    const expectedTotal = computeExpectedTotal({
      volume: '10',
      distance: '20',
      floorNumber: 3
    });
    expect(result.total).toBe(expectedTotal); // 150 + 200 + 50 + (3 * 10) = 430
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
    const expectedTotal = CONSTANTS.BASE_COST  // base
      .plus(new Decimal('10.5').times(CONSTANTS.VOLUME_COST_M3))  // volume
      .plus(new Decimal('20.7').times(CONSTANTS.DISTANCE_COST_KM))   // distância
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
