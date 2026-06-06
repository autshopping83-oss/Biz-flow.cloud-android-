import React, { useState } from 'react';
import { useToast } from './ToastContext';

interface Props {
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  userId?: string;
}

const PLANS = [
  {
    id: 'Pro',
    name: 'Pro',
    price: '250 MT/mês',
    features: ['Negócios ilimitados', 'Clientes ilimitados', 'Relatórios avançados', 'Multi-moeda', 'Suporte prioritário'],
    popular: true,
  },
  {
    id: 'Empresarial',
    name: 'Empresarial',
    price: '500 MT/mês',
    features: ['Tudo do Pro', 'Acesso para equipa (3 users)', 'Contabilidade simplificada', 'Suporte prioritário 24h'],
    popular: false,
  },
];

const EDGE_FUNCTION_URL = import.meta.env.VITE_PAYSUITE_CREATE_PAYMENT_URL
  || 'https://ilukexelmihfdezbgcrp.supabase.co/functions/v1/create-payment';

export const PaymentModal: React.FC<Props> = ({ onClose, userEmail = '', userName = '', userId = '' }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Pro');
  const { notify } = useToast();

  const handleSubscribe = async () => {
    if (!userId) {
      notify('Erro de identificação. Faça login novamente.', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: selectedPlan,
          user_id: userId,
          return_url: 'https://biz-flow.cloud',
        }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.data?.checkout_url) {
        // Open PaySuite checkout in new tab
        window.open(data.data.checkout_url, '_blank');
        notify('Redirecionando para o pagamento...', 'info');
        onClose();
      } else {
        notify(data.message || 'Erro ao criar pagamento. Tente novamente.', 'error');
      }
    } catch (err) {
      console.error('Payment error:', err);
      notify('Erro de conexão. Tente novamente.', 'error');
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
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Planos BizFlow</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o plano ideal para o seu negócio</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Plan Selection */}
          <div className="grid gap-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    Mais popular
                  </span>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{plan.price}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === plan.id 
                      ? 'border-emerald-500 bg-emerald-500' 
                      : 'border-slate-300'
                  }`}>
                    {selectedPlan === plan.id && (
                      <i className="fa-solid fa-check text-white text-[10px]"></i>
                    )}
                  </div>
                </div>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <i className="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* Pay Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading || !userId}
            className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <i className="fa-solid fa-circle-notch animate-spin"></i>
            ) : (
              <i className="fa-solid fa-lock"></i>
            )}
            {loading ? 'A criar pagamento...' : `Assinar ${selectedPlan} — ${selectedPlan === 'Pro' ? '250 MT' : '500 MT'}`}
          </button>

          {/* Payment methods */}
          <div className="text-center">
            <p className="text-[10px] text-slate-400">
              Pagamento via M-Pesa, EMola ou Cartão • Pagamento seguro via PaySuite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
