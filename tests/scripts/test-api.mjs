// Script de teste para verificar conectividade da API
console.log('Testing API configuration...');

const API_BASE_URL = 'http://localhost:3000/api';
console.log('API_BASE_URL:', API_BASE_URL);

fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'bruno@move.com',
    password: '15002031'
  })
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Success:', data);
})
.catch(error => {
  console.error('Error:', error);
});
