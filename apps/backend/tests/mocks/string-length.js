const stripAnsi = require('./strip-ansi');

module.exports = function stringLength(input) {
  const normalized = typeof input === 'string' ? input : String(input ?? '');
  return stripAnsi(normalized).length;
};

module.exports.default = module.exports;
