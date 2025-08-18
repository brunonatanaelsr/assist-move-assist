// Script de teste para debug da API
console.log('Testando conexão com a API...');

const API_URL = 'http://localhost:3000/api';

async function testLogin() {
  try {
    console.log('Fazendo requisição para:', `${API_URL}/auth/login`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'bruno@move.com',
        password: '15002031'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    return data;
  } catch (error) {
    console.error('Erro na requisição:', error);
    return null;
  }
}

// Teste imediato
testLogin();
