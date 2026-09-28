import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registrar Service Worker para notificações externas e PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // SW pronto para notificações
      })
      .catch((err) => {
        console.warn('Registro de ServiceWorker ignorado ou não suportado:', err);
      });
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'fenix_open_tab' && event.data.tab) {
      window.dispatchEvent(
        new CustomEvent('fenix_open_tab', {
          detail: {
            tab: event.data.tab,
            metadata: event.data.metadata,
          },
        })
      );
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
