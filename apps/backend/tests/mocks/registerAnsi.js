const path = require('path');

const ansiRegexPath = require.resolve('ansi-regex');
const mockPath = path.resolve(__dirname, 'ansi-regex.js');
const mockModule = require(mockPath);

require.cache[ansiRegexPath] = {
  id: ansiRegexPath,
  filename: ansiRegexPath,
  loaded: true,
  exports: mockModule
};
