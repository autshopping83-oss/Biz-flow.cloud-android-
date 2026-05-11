import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, ItemDetails } from '../types';
import { PaymentModal } from './PaymentModal';
import { supabase } from '../services/supabaseClient';
import { isPlayBillingAvailable, getSubscriptionDetails, purchaseSubscription } from '../services/googlePlayService';
import { useToast } from './ToastContext';

interface PricingModalProps {
  currentPlan: SubscriptionPlan;
  onClose: () => void;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  userEmail?: string;
  userName?: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({ currentPlan, onClose, onSelectPlan, userEmail, userName }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [userId, setUserId] = useState<string>('');
  
  // Google Play States
  const [isGooglePlay, setIsGooglePlay] = useState(false);
  const [playDetails, setPlayDetails] = useState<ItemDetails | null>(null);
  const [isLoadingPlay, setIsLoadingPlay] = useState(false);
  
  const { notify } = useToast();

  // Fetch current user ID immediately when modal opens
  useEffect(() => {
     supabase.auth.getSession().then(({ data: { session } }) => {
         if (session?.user) {
             setUserId(session.user.id);
         }
     });

     // Check Google Play Availability
     const checkGooglePlay = async () => {
        const available = await isPlayBillingAvailable();
        setIsGooglePlay(available);
        if (available) {
            const details = await getSubscriptionDetails();
            setPlayDetails(details);
        }
     };
     checkGooglePlay();
  }, []);

  const handleEnterpriseClick = () => {
    window.open("https://wa.me/258840636794", "_blank");
  };

  const handleProClick = async () => {
    if (isGooglePlay) {
        // Fluxo Google Play
        if (!userId) {
            notify("Faça login para assinar.", "error");
            return;
        }
        setIsLoadingPlay(true);
        const success = await purchaseSubscription(userId);
        if (success) {
            notify("Assinatura PRO ativada com sucesso!", "success");
            onClose();
        } else {
            notify("Compra cancelada ou falhou.", "info");
        }
        setIsLoadingPlay(false);
    } else {
        // Fluxo Web Manual
        setShowPayment(true);
    }
  };

  if (showPayment) {
      return <PaymentModal onClose={() => setShowPayment(false)} userEmail={userEmail} userName={userName} userId={userId} />;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-5xl rounded-3xl shadow-2xl relative overflow-hidden animate-scaleIn my-auto">
        
        {/* Header */}
        <div className="p-8 text-center relative z-10">
          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-300 transition">
             <i className="fa-solid fa-times"></i>
          </button>
          
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            Planos e Preços
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Escolha a melhor solução para o seu negócio.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 pt-2 md:p-10">
          
          {/* FREE PLAN */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative">
             <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-2">Assinatura Gratuita</h3>
             <div className="text-4xl font-black text-slate-900 dark:text-white mb-4">$0 <span className="text-sm font-normal text-slate-400">/mês</span></div>
             <p className="text-sm text-slate-500 mb-6 flex-grow">
               Plano inicial para pequenos negócios com funcionalidades básicas de faturação.
             </p>
             <ul className="space-y-3 mb-8 text-sm text-slate-600 dark:text-slate-300">
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-green-500 mt-1"></i> Até 10 documentos por dia</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-green-500 mt-1"></i> Gestão básica de clientes</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-green-500 mt-1"></i> Controle de receitas/despesas</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-green-500 mt-1"></i> Exportação PDF limitada</li>
             </ul>
             <button 
                onClick={() => onClose()}
                disabled={currentPlan === 'FREE'}
                className={`w-full py-3 rounded-xl font-bold border transition-all ${currentPlan === 'FREE' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}
             >
                {currentPlan === 'FREE' ? 'Seu Plano Atual' : 'Voltar ao Grátis'}
             </button>
          </div>

          {/* PRO PLAN (Featured) */}
          <div className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-xl shadow-blue-900/20 text-white flex flex-col relative transform md:-translate-y-4 md:scale-105 z-10 border border-blue-400/30">
             <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
             <h3 className="text-lg font-bold text-blue-100 uppercase tracking-widest mb-2">Assinatura PRO</h3>
             
             <div className="flex items-baseline gap-2 mb-1">
                {/* Mostra preço do Google Play se disponível, senão fallback */}
                <span className="text-4xl font-black">
                    {playDetails ? playDetails.price.value : '$2.00'}
                </span>
                <span className="text-sm font-normal text-blue-200">
                    {playDetails ? `/${playDetails.price.currency}` : '/mês'}
                </span>
             </div>
             
             {!playDetails && <div className="text-xs font-medium text-blue-200 mb-4 opacity-80">(aprox. 130 MT)</div>}
             {isGooglePlay && <div className="text-xs font-bold text-green-300 mb-4 bg-green-900/30 px-2 py-1 rounded inline-block">Cobrado pela Google Play</div>}
             
             <p className="text-sm text-blue-100 mb-6 flex-grow opacity-90">
               Solução completa sem limites para empresas em crescimento.
             </p>
             <ul className="space-y-3 mb-8 text-sm text-white font-medium">
               <li className="flex items-start gap-2"><i className="fa-solid fa-circle-check text-yellow-400 mt-1"></i> <strong>Documentos Ilimitados</strong></li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-blue-300 mt-1"></i> Venda de E-books e Links</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-blue-300 mt-1"></i> Relatórios financeiros detalhados</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-blue-300 mt-1"></i> Multi-moeda + conversão auto</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-blue-300 mt-1"></i> Backup diário automático</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-blue-300 mt-1"></i> Suporte prioritário 24/7</li>
             </ul>
             <button 
                onClick={handleProClick}
                disabled={currentPlan === 'PRO' || isLoadingPlay}
                className="w-full bg-white text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg active:scale-95 disabled:opacity-80 disabled:cursor-default flex items-center justify-center gap-2"
             >
                {isLoadingPlay ? <i className="fa-solid fa-circle-notch animate-spin"></i> : null}
                {currentPlan === 'PRO' ? 'Plano Ativo' : (isGooglePlay ? 'Assinar via Google Play' : 'Assinar Agora')}
             </button>
          </div>

          {/* ENTERPRISE PLAN */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative">
             <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-2">Assinatura Empresarial</h3>
             <div className="text-3xl font-black text-slate-900 dark:text-white mb-4 mt-1">Sob Consulta</div>
             <p className="text-sm text-slate-500 mb-6 flex-grow">
               Solução personalizada para grandes volumes, com API e gestor dedicado.
             </p>
             <ul className="space-y-3 mb-8 text-sm text-slate-600 dark:text-slate-300">
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-slate-400 mt-1"></i> Tudo do plano PRO</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-slate-400 mt-1"></i> Múltiplos utilizadores (Multi-seat)</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-slate-400 mt-1"></i> Integração via API (ERP/CRM)</li>
               <li className="flex items-start gap-2"><i className="fa-solid fa-check text-slate-400 mt-1"></i> Gestor de conta dedicado</li>
             </ul>
             <button 
                onClick={handleEnterpriseClick}
                className="w-full py-3 rounded-xl font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
             >
                <i className="fa-brands fa-whatsapp text-green-500 text-lg"></i> Falar com Vendas
             </button>
          </div>

        </div>
        
        <div className="bg-slate-100 dark:bg-slate-900 p-4 text-center text-xs text-slate-400">
           Cancelamento disponível a qualquer momento. Reembolsos apenas em caso de falha técnica comprovada.
        </div>
      </div>
    </div>
  );
};