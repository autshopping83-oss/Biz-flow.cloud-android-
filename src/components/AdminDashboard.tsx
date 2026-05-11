
import React, { useEffect, useState } from 'react';
import { PaymentRequest } from '../types';
import { useToast } from './ToastContext';

interface Props {
  onClose: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onClose }) => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  const loadData = async () => {
    setLoading(true);
    setRequests([]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async () => {
    notify('O serviço de pagamento atual foi removido. Atualize para um novo provedor.', 'info');
  };

  const handleReject = async () => {
    notify('O serviço de pagamento atual foi removido. Atualize para um novo provedor.', 'info');
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto animate-fadeIn text-slate-900">
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Admin Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold">
                        <i className="fa-solid fa-lock"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Painel Admin</h1>
                        <p className="text-xs text-slate-400">Gerenciamento de Pagamentos Manuais</p>
                    </div>
                </div>
                <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-bold hover:bg-slate-700">
                    Sair do Admin
                </button>
            </div>

            <div className="max-w-6xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">Solicitações Pendentes</h2>
                    <button onClick={loadData} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600">
                        <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>

                {requests.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <i className="fa-solid fa-check-circle text-6xl text-emerald-100 dark:text-emerald-900/30 mb-4"></i>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Tudo limpo!</h3>
                        <p className="text-slate-400">Nenhuma solicitação de pagamento pendente.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Proof Preview */}
                                <div className="w-full md:w-48 h-32 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group flex-none">
                                    <img src={req.proof_url} alt="Comprovativo" className="w-full h-full object-cover" />
                                    <a 
                                      href={req.proof_url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition"
                                    >
                                        <i className="fa-solid fa-eye mr-2"></i> Ver
                                    </a>
                                </div>

                                {/* Info */}
                                <div className="flex-grow">
                                    <h3 className="text-lg font-bold dark:text-white">{req.user_name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mb-2">{req.user_id}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded">Pendente</span>
                                        <span className="text-slate-400 text-xs">{new Date(req.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button 
                                        onClick={() => handleReject(req.id)}
                                        className="flex-1 md:flex-none px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                                    >
                                        Rejeitar
                                    </button>
                                    <button 
                                        onClick={() => handleApprove(req)}
                                        className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-check"></i> Aprovar PRO
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
