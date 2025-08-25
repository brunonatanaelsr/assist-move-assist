// Mock do localStorage para os testes
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

// Mock do window.location para os testes
delete window.location;
window.location = {
  href: '',
};

// Configuração do processo.env para os testes
process.env.REACT_APP_API_URL = 'http://localhost:3001';
