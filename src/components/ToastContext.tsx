
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  notify: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[300px] max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border-l-4 p-4 flex items-start gap-3 transform transition-all duration-300 animate-slideDown ${
              toast.type === 'success' ? 'border-emerald-500' : 
              toast.type === 'error' ? 'border-red-500' : 'border-blue-500'
            }`}
          >
            <div className={`mt-0.5 text-lg ${
              toast.type === 'success' ? 'text-emerald-500' : 
              toast.type === 'error' ? 'text-red-500' : 'text-blue-500'
            }`}>
              <i className={`fa-solid ${
                toast.type === 'success' ? 'fa-circle-check' : 
                toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'
              }`}></i>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm capitalize">{toast.type === 'info' ? 'Informação' : toast.type === 'error' ? 'Erro' : 'Sucesso'}</h4>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
