import React from 'react';
import { ReceiptData, CompanySettings } from '../types';

type ShareMethod = 'email' | 'whatsapp' | 'download' | 'print' | null;

interface DocumentShareModalViewProps {
  formData: ReceiptData;
  companySettings: CompanySettings;
  userId?: string;
  isGeneratingPdf: boolean;
  isPrinting: boolean;
  onGeneratePDF: () => Promise<void>;
  onPrintThermal: () => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
  fMoney: (val: number) => string;
  selectedMethod: ShareMethod;
  setSelectedMethod: (m: ShareMethod) => void;
  recipientEmail: string;
  setRecipientEmail: (v: string) => void;
  recipientName: string;
  setRecipientName: (v: string) => void;
  recipientPhone: string;
  setRecipientPhone: (v: string) => void;
  isSending: boolean;
  sendResult: { success: boolean; message: string } | null;
  handleSend: (method: 'email' | 'whatsapp') => void;
  handleDownload: () => void;
  handlePrint: () => void;
}

const documentTypeLabel = (type: string) =>
  type === 'INVOICE' ? 'Fatura' : type === 'INVOICE_RECEIPT' ? 'Fatura-Recibo' : type === 'QUOTE' ? 'Orçamento' : 'Recibo';

export const DocumentShareModalView: React.FC<DocumentShareModalViewProps> = ({
  formData, isGeneratingPdf, isPrinting, onClose, t, fMoney,
  selectedMethod, setSelectedMethod,
  recipientEmail, setRecipientEmail, recipientName, setRecipientName, recipientPhone, setRecipientPhone,
  isSending, sendResult, handleSend, handleDownload, handlePrint,
}) => {
  const isEmail = selectedMethod === 'email';

  const renderSelection = () => (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold dark:text-white">Compartilhar Documento</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {documentTypeLabel(formData.type)} <span className="font-mono font-bold">#{formData.number}</span>
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <i className="fa-solid fa-times text-slate-500"></i>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <i className="fa-solid fa-file-invoice"></i>
              </div>
              <div>
                <p className="text-sm font-bold dark:text-white">{formData.clientName || 'Cliente'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formData.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">{fMoney(formData.total)}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{formData.currency}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Escolha como deseja enviar</p>

          {renderOption('email', 'fa-envelope', 'bg-blue-100', 'text-blue-600', 'Enviar por Email', 'Envia o documento como anexo via webhook')}
          {renderOption('whatsapp', 'fa-whatsapp', 'bg-emerald-100', 'text-emerald-600', 'Enviar por WhatsApp', 'Envia a mensagem com resumo do documento via webhook')}

          <button onClick={handleDownload} disabled={isGeneratingPdf}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group disabled:opacity-50">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-file-pdf text-xl"></i>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold dark:text-white">Baixar PDF</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gera e salva o documento em formato PDF A4</p>
            </div>
            {isGeneratingPdf ? <i className="fa-solid fa-spinner animate-spin text-purple-500"></i> : <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors"></i>}
          </button>

          <button onClick={handlePrint} disabled={isPrinting}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group disabled:opacity-50">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-receipt text-xl"></i>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold dark:text-white">Imprimir Talão Térmico</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Imprime em bobina 58/80mm via Bluetooth</p>
            </div>
            {isPrinting ? <i className="fa-solid fa-spinner animate-spin text-slate-500"></i> : <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors"></i>}
          </button>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );

  const renderOption = (method: ShareMethod, icon: string, iconBg: string, iconColor: string, title: string, desc: string) => {
    const isEmailOption = method === 'email';
    const hoverBorder = isEmailOption ? 'hover:border-blue-300 dark:hover:border-blue-600' : 'hover:border-emerald-300 dark:hover:border-emerald-600';
    const hoverBg = isEmailOption ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20';
    const chevronHover = isEmailOption ? 'group-hover:text-blue-500' : 'group-hover:text-emerald-500';

    return (
      <button onClick={() => setSelectedMethod(method)}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 ${hoverBorder} ${hoverBg} transition-all group`}>
        <div className={`w-12 h-12 rounded-xl ${iconBg} dark:bg-${isEmailOption ? 'blue' : 'emerald'}-900/30 flex items-center justify-center ${iconColor} dark:text-${isEmailOption ? 'blue' : 'emerald'}-400 group-hover:scale-110 transition-transform`}>
          {method === 'whatsapp' ? <i className="fa-brands fa-whatsapp text-xl"></i> : <i className={`fa-solid ${icon} text-xl`}></i>}
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold dark:text-white">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
        </div>
        <i className={`fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 ${chevronHover} transition-colors`}></i>
      </button>
    );
  };

  if (!selectedMethod) return renderSelection();

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedMethod(null)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
              <i className="fa-solid fa-arrow-left text-xs"></i>
            </button>
            <div>
              <h2 className="text-lg font-bold dark:text-white">{isEmail ? 'Enviar por Email' : 'Enviar por WhatsApp'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{documentTypeLabel(formData.type)} #{formData.number}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Nome do Destinatário</label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nome do cliente"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>

          {isEmail ? (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Email do Destinatário</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="cliente@exemplo.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Telefone do Destinatário (WhatsApp)</label>
              <div className="relative">
                <i className="fa-brands fa-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="258840000000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumo do Documento</p>
            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Número</span><span className="font-bold dark:text-white font-mono">#{formData.number}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Cliente</span><span className="font-bold dark:text-white">{recipientName || formData.clientName || '---'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Data</span><span className="font-bold dark:text-white">{formData.date}</span></div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700"><span className="text-slate-500 dark:text-slate-400">Total</span><span className="font-black text-blue-600 dark:text-blue-400">{fMoney(formData.total)}</span></div>
            {formData.items.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Itens</p>
                {formData.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400 py-0.5">
                    <span className="truncate max-w-[200px]">{item.description}</span><span>{item.quantity}x {fMoney(item.unitPrice)}</span>
                  </div>
                ))}
                {formData.items.length > 3 && <p className="text-xs text-slate-400 mt-1">+{formData.items.length - 3} itens</p>}
              </div>
            )}
          </div>

          {sendResult && (
            <div className={`rounded-xl p-4 text-sm ${sendResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
              <div className="font-bold mb-1 flex items-center gap-2">
                {sendResult.success ? <><i className="fa-solid fa-check-circle text-emerald-500"></i> Sucesso</> : <><i className="fa-solid fa-exclamation-circle text-red-500"></i> Erro</>}
              </div>
              <p className="text-xs opacity-80">{sendResult.message}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => handleSend(isEmail ? 'email' : 'whatsapp')}
              disabled={isSending || !(isEmail ? recipientEmail : recipientPhone) || !recipientName}
              className={`flex-1 ${isEmail ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}>
              {isSending ? <><i className="fa-solid fa-spinner animate-spin"></i> Enviando...</> : <><i className={`fa-solid ${isEmail ? 'fa-paper-plane' : 'fa-brands fa-whatsapp'}`}></i> {isEmail ? 'Enviar Email' : 'Enviar WhatsApp'}</>}
            </button>
            <button onClick={() => setSelectedMethod(null)} disabled={isSending}
              className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
