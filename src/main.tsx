import { createRoot } from 'react-dom/client'
import App from './App' // official entry component
import './index.css'

// Adicionar tratamento de erro global
window.addEventListener('error', (e) => {
  console.error('Global Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled Promise Rejection:', e.reason);
});

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (error) {
  console.error('Erro ao renderizar App:', error);
  // Fallback para erro
  document.getElementById("root")!.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Erro de Inicialização</h1>
      <p>Houve um problema ao carregar o aplicativo:</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${error}</pre>
    </div>
  `;
}
