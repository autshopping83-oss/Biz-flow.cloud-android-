
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ToastContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// --- INITIALIZATION ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- SERVICE WORKER REGISTRATION (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // IMPORTANTE: Usar './service-worker.js' (relativo) em vez de '/service-worker.js' (absoluto)
    // para evitar erros de origem em ambientes de preview como AI Studio.
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((registration) => {
        console.log('SW registered successfully: ', registration.scope);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
