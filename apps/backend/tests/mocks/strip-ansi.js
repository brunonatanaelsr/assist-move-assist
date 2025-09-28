const ansiRegex = require('./ansi-regex');

module.exports = function stripAnsi(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input.replace(ansiRegex(), '');
};

module.exports.default = module.exports;
