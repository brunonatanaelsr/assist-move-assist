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
} catch (error: any) {
  console.error('Erro ao renderizar App:', error);
  // Fallback seguro sem innerHTML
  const root = document.getElementById('root');
  if (root) {
    const wrap = document.createElement('div');
    wrap.style.padding = '20px';
    wrap.style.fontFamily = 'Arial, sans-serif';

    const h1 = document.createElement('h1');
    h1.textContent = 'Erro de Inicialização';

    const p = document.createElement('p');
    p.textContent = 'Houve um problema ao carregar o aplicativo:';

    const pre = document.createElement('pre');
    pre.style.background = '#f5f5f5';
    pre.style.padding = '10px';
    pre.style.borderRadius = '4px';
    pre.textContent = String(error?.message || error || 'Erro desconhecido');

    wrap.appendChild(h1);
    wrap.appendChild(p);
    wrap.appendChild(pre);
    root.replaceChildren(wrap);
  }
}
