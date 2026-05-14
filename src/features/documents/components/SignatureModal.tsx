/**
 * SignatureModal - Modal de assinatura digital
 * 
 * Extraído do App.tsx para respeitar SRP e limite de 250 linhas.
 */

import React, { RefObject } from 'react';

interface SignatureModalProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ canvasRef, onSave, onClear, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-lg dark:text-white">Assinatura Digital</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors hover:bg-slate-200">
            <i className="fa-solid fa-times text-slate-500"></i>
          </button>
        </div>
        <div className="p-6 flex-grow flex flex-col">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Desenhe no campo abaixo. A sua assinatura será adicionada ao documento.
          </p>
          <div className="w-full h-48 md:h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-crosshair">
            <canvas ref={canvasRef} className="w-full h-full"></canvas>
          </div>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end gap-4 flex-shrink-0">
          <button
            onClick={onClear}
            className="bg-white dark:bg-slate-700 border dark:border-slate-600 text-slate-700 dark:text-white font-bold py-3 px-6 rounded-xl transition-colors hover:bg-slate-100"
          >
            Limpar
          </button>
          <button
            onClick={onSave}
            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors hover:bg-blue-700 shadow-lg shadow-blue-500/20"
          >
            Guardar Assinatura
          </button>
        </div>
      </div>
    </div>
  );
};
