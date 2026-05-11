
import React, { useState } from 'react';
import { useToast } from './ToastContext';

interface Props {
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  userId?: string;
}

export const PaymentModal: React.FC<Props> = ({ onClose, userEmail = '', userName = '', userId = '' }) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { notify } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      notify("Por favor, anexe o comprovativo antes de validar.", "error");
      return;
    }

    if (!userId) {
       notify("Erro de identificação do usuário. Faça login novamente.", "error");
       return;
    }

    setLoading(true);

    try {
        notify("O serviço de pagamento atual foi removido. Em breve haverá integração com um novo provedor.", "info");
        onClose();
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scaleIn">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ativação PRO</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Plano PRO: <span className="font-black text-slate-900 dark:text-white">2.00 USD (130 MT)</span></p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <i className="fa-solid fa-times text-xl"></i>
            </button>
        </div>

        <div className="p-6 space-y-8">
            
            {/* Info Box instead of Link */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-1">Pagamento Manual</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                    Realize o pagamento através dos canais oficiais (M-Pesa, Transferência Bancária). Após o pagamento, anexe o comprovativo abaixo para ativação pela nossa equipe.
                </p>
            </div>

            {/* Upload de Comprovativo */}
            <div className="space-y-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase">Anexar Comprovativo</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Envie o recibo ou captura de tela da transferência.
                </p>
                
                <div className="relative group">
                    <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors ${file ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'}`}>
                        {file ? (
                            <>
                                <i className="fa-solid fa-check-circle text-2xl text-emerald-500 mb-2"></i>
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">{file.name}</span>
                                <span className="text-[10px] text-emerald-600/70">Clique para alterar</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-3 group-hover:text-blue-500 transition-colors"></i>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Toque para enviar comprovativo</span>
                                <span className="text-[10px] text-slate-400">PDF, JPG ou PNG</span>
                            </>
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleValidate}
                    disabled={loading || !file}
                    className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-check"></i>}
                    {loading ? 'Enviando...' : 'Enviar e Validar'}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};
