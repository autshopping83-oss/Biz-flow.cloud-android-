import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from '../components/ToastContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../features/auth/AuthContext';
import '../index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// --- GLOBAL TYPES ---
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
    };
  }
}

// --- CAPACITOR INIT (Android) ---
const initCapacitor = async () => {
  if (window.Capacitor?.isNativePlatform()) {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      // Garantir que o WebView não se sobreponha à barra de estado
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch {}

    // Safe area CSS — definir todas as variáveis
    document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 24px)');
    document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
    document.documentElement.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)');
    document.documentElement.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)');

    // Criar pasta Biz-flow no dispositivo (primeira execução)
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.mkdir({ path: 'Biz-flow', directory: Directory.Documents, recursive: true });
    } catch {}
  }
};

initCapacitor();

// --- GLOBAL UNHANDLED REJECTION HANDLER ---
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  // Evita que erros assíncronos escapem silenciosamente
});

// --- SERVICE WORKER REGISTRATION (PWA) ---
if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch(() => {
        // Silencioso - não crítico para o funcionamento
      });
  });
}

// --- INITIALIZATION ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
