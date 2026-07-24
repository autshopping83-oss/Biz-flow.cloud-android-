// src/components/TermsModal.tsx
// Modal de Termos de Uso — aparece apenas na 1ª execução
import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';

const STORAGE_KEY = 'bizflow_terms_accepted';

export const hasAcceptedTerms = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
};

export const acceptTerms = (): void => {
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
};

export const TermsModal: React.FC<{ onAccept: () => void }> = ({ onAccept }) => {
  const [visible, setVisible] = useState(true);

  const handleAccept = () => {
    acceptTerms();
    setVisible(false);
    onAccept();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-center mb-3">
            <Logo className="w-12 h-12" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Termos de Uso e Privacidade</h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Ao continuar, concorda com os nossos Termos de Uso e Política de Privacidade.
            Os seus dados são processados localmente no dispositivo e apenas sincronizados com a nuvem se optar por conectar uma conta.
          </p>

          <div className="flex gap-3 text-sm">
            <a
              href="https://www.biz-flow.cloud/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <i className="fa-solid fa-file-contract mr-1"></i> Termos
            </a>
            <a
              href="https://www.biz-flow.cloud/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <i className="fa-solid fa-shield-halved mr-1"></i> Privacidade
            </a>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
          <button
            onClick={handleAccept}
            className="w-full py-4 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-sm uppercase tracking-wider"
          >
            Aceitar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
