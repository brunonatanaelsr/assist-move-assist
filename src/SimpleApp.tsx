import React from 'react';

const SimpleApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Sistema Move Marias</h1>
      <p>Teste de funcionamento - App renderizando!</p>
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        marginTop: '10px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>Status do Sistema:</h3>
        <ul>
          <li>✅ Frontend carregando</li>
          <li>✅ React renderizando</li>
          <li>✅ HTML/CSS funcionando</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleApp;
