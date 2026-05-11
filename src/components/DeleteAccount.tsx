
import React, { useState } from 'react';
import { Logo } from './Logo';
import { useToast } from './ToastContext';

interface Props {
  onBack: () => void;
}

export const DeleteAccount: React.FC<Props> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { notify } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real scenario, this would call a Supabase Edge Function to flag the account.
    // For compliance, providing a manual contact method mechanism is often sufficient if automated is not available.
    
    setIsSubmitted(true);
    notify("Solicitação registada.", "info");
  };

  const handleMailTo = () => {
      const subject = `Solicitação de Exclusão de Dados - ${email}`;
      const body = `Olá Equipa Biz-Flow,%0D%0A%0D%0AGostaria de solicitar a exclusão completa da minha conta e dados associados.%0D%0A%0D%0AEmail da conta: ${email}%0D%0AMotivo: ${reason}%0D%0A%0D%0AObrigado.`;
      window.open(`mailto:suporte@biz-flow.cloud?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 animate-scaleIn">
        
        <div className="flex justify-center mb-6">
           <Logo className="w-16 h-16" />
        </div>

        <h1 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">Exclusão de Dados</h1>
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-8">
            Conforme exigido pelas normas de privacidade, você pode solicitar a remoção completa da sua conta e dados.
        </p>

        {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email da Conta</label>
                    <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 dark:text-white"
                        placeholder="seu@email.com"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo (Opcional)</label>
                    <textarea 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 dark:text-white resize-none h-24"
                        placeholder="Por que você está nos deixando?"
                    />
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-200 mb-4">
                    <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                    Atenção: Esta ação é irreversível. Todos os seus recibos, clientes e histórico financeiro serão apagados permanentemente em até 30 dias.
                </div>

                <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/20">
                    Solicitar Exclusão
                </button>
                
                <button type="button" onClick={onBack} className="w-full text-slate-500 text-sm font-bold py-3 hover:text-slate-800 dark:hover:text-white transition">
                    Cancelar
                </button>
            </form>
        ) : (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                    <i className="fa-solid fa-check"></i>
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Solicitação Iniciada</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                        Para confirmar sua identidade e finalizar o processo, clique no botão abaixo para enviar o email de confirmação oficial.
                    </p>
                </div>
                
                <button onClick={handleMailTo} className="w-full bg-slate-900 dark:bg-blue-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2">
                    <i className="fa-solid fa-envelope"></i> Confirmar via Email
                </button>
                
                <button onClick={() => setIsSubmitted(false)} className="text-sm text-slate-400 underline">Voltar</button>
            </div>
        )}

      </div>
    </div>
  );
};
