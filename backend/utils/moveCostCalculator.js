const { Decimal } = require('decimal.js');

/**
 * Constantes para cálculos
 */
const CONSTANTS = {
  BASE_COST: new Decimal('150.00'),         // Custo base da mudança
  DISTANCE_COST_KM: new Decimal('2.50'),    // Custo por km
  VOLUME_COST_M3: new Decimal('20.00'),     // Custo por m³
  MIN_VOLUME: new Decimal('1.0'),           // Volume mínimo em m³
  MAX_VOLUME: new Decimal('50.0'),          // Volume máximo em m³
  MIN_DISTANCE: new Decimal('1.0'),         // Distância mínima em km
  MAX_DISTANCE: new Decimal('100.0'),       // Distância máxima em km
  WEIGHT_FACTOR: new Decimal('1.2'),        // Fator de peso para itens frágeis
  WEEKEND_MULTIPLIER: new Decimal('1.3'),   // Multiplicador para fins de semana
};

/**
 * Calcula o custo da mudança considerando volume, distância e fatores adicionais
 * @param {Object} params Parâmetros do cálculo
 * @param {number|string} params.volume Volume em m³
 * @param {number|string} params.distance Distância em km
 * @param {boolean} params.hasFragileItems Se possui itens frágeis
 * @param {boolean} params.isWeekend Se a mudança é no fim de semana
 * @param {number|string} [params.additionalStops=0] Paradas adicionais
 * @param {number|string} [params.floorNumber=0] Número do andar
 * @returns {Object} Resultado do cálculo com detalhamento
 * @throws {Error} Se os parâmetros forem inválidos
 */
function calculateMoveCost({
  volume,
  distance,
  hasFragileItems = false,
  isWeekend = false,
  additionalStops = 0,
  floorNumber = 0
}) {
  try {
    // Validar e converter entradas para Decimal
    const volumeDecimal = new Decimal(volume);
    const distanceDecimal = new Decimal(distance);
    const additionalStopsDecimal = new Decimal(additionalStops);
    const floorNumberDecimal = new Decimal(floorNumber);

    // Validações
    if (volumeDecimal.lessThan(CONSTANTS.MIN_VOLUME)) {
      throw new Error(`Volume mínimo é ${CONSTANTS.MIN_VOLUME}m³`);
    }
    if (volumeDecimal.greaterThan(CONSTANTS.MAX_VOLUME)) {
      throw new Error(`Volume máximo é ${CONSTANTS.MAX_VOLUME}m³`);
    }
    if (distanceDecimal.lessThan(CONSTANTS.MIN_DISTANCE)) {
      throw new Error(`Distância mínima é ${CONSTANTS.MIN_DISTANCE}km`);
    }
    if (distanceDecimal.greaterThan(CONSTANTS.MAX_DISTANCE)) {
      throw new Error(`Distância máxima é ${CONSTANTS.MAX_DISTANCE}km`);
    }

    // Cálculo do custo base
    let baseCost = CONSTANTS.BASE_COST;
    
    // Adicionar custo por volume
    const volumeCost = volumeDecimal.times(CONSTANTS.VOLUME_COST_M3);
    
    // Adicionar custo por distância
    const distanceCost = distanceDecimal.times(CONSTANTS.DISTANCE_COST_KM);
    
    // Calcular subtotal
    let subtotal = baseCost.plus(volumeCost).plus(distanceCost);

    // Adicionar custo por itens frágeis
    if (hasFragileItems) {
      subtotal = subtotal.times(CONSTANTS.WEIGHT_FACTOR);
    }

    // Adicionar custo por paradas adicionais
    const stopsCost = additionalStopsDecimal.times(CONSTANTS.DISTANCE_COST_KM.times(2));
    subtotal = subtotal.plus(stopsCost);

    // Adicionar custo por andar (após o térreo)
    if (floorNumberDecimal.greaterThan(0)) {
      const floorCost = floorNumberDecimal.times(new Decimal('10.00'));
      subtotal = subtotal.plus(floorCost);
    }

    // Aplicar multiplicador de fim de semana
    if (isWeekend) {
      subtotal = subtotal.times(CONSTANTS.WEEKEND_MULTIPLIER);
    }

    // Arredondar para 2 casas decimais
    const total = subtotal.toDecimalPlaces(2);

    return {
      success: true,
      total: total.toString(),
      details: {
        baseCost: baseCost.toString(),
        volumeCost: volumeCost.toString(),
        distanceCost: distanceCost.toString(),
        stopsCost: stopsCost.toString(),
        floorCost: floorNumberDecimal.greaterThan(0) ? 
          floorNumberDecimal.times(new Decimal('10.00')).toString() : '0.00',
        hasFragileItems,
        isWeekend,
        multipliers: {
          fragileItems: hasFragileItems ? CONSTANTS.WEIGHT_FACTOR.toString() : '1.00',
          weekend: isWeekend ? CONSTANTS.WEEKEND_MULTIPLIER.toString() : '1.00'
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  calculateMoveCost,
  CONSTANTS
};
