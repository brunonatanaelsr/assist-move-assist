import { createRoot } from 'react-dom/client'
import App from './App' // official entry component
import axios from 'axios'
import './index.css'

// Adicionar tratamento de erro global
window.addEventListener('error', (e) => {
  console.error('Global Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled Promise Rejection:', e.reason);
});

try {
  // Configure API base URL for axios and fetch
  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
  axios.defaults.baseURL = API_BASE;
  // Patch window.fetch to rewrite relative /api calls to absolute API_BASE
  const origFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let url: any = input as any;
    if (typeof url === 'string' && url.startsWith('/api')) {
      url = API_BASE.replace(/\/$/, '') + url;
    } else if (url instanceof URL && url.pathname.startsWith('/api')) {
      url = new URL(API_BASE.replace(/\/$/, '') + url.pathname + url.search);
    }
    return origFetch(url, init);
  }) as any;

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
