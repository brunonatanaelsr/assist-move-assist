module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/integration/',
    '<rootDir>/tests/',
    '<rootDir>/src/repositories/__tests__/',
    '<rootDir>/src/__tests__/helpers/',
    '<rootDir>/src/__tests__/repositories/',
    '<rootDir>/src/routes/__tests__/feed.routes.test.ts',
    '<rootDir>/src/routes/__tests__/oficina.flows.test.ts',
    '<rootDir>/src/routes/__tests__/auth.test.ts',
    '<rootDir>/src/routes/__tests__/beneficiarias.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^cpf-cnpj-validator$': '<rootDir>/src/__mocks__/cpf-cnpj-validator.js',
    '^ansi-regex$': '<rootDir>/tests/mocks/ansi-regex.js',
    '^strip-ansi$': '<rootDir>/tests/mocks/strip-ansi.js',
    '^string-length$': '<rootDir>/tests/mocks/string-length.js',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  moduleDirectories: ['node_modules', 'src'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testTimeout: 10000,
  verbose: true
};
