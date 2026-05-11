/**
 * DocumentShareModal
 * 
 * Modal de compartilhamento de documentos que permite ao usuário:
 * - Enviar por Email (via webhook N8N)
 * - Enviar por WhatsApp (via webhook N8N)
 * - Baixar PDF
 * - Imprimir via Bluetooth
 * 
 * As informações são enviadas ao webhook com identificação completa do documento.
 */

import React, { useState } from 'react';
import { ReceiptData, CompanySettings } from '../types';
import { emailService } from '../pages/N8N/services/emailService';
import { whatsappService } from '../pages/N8N/services/whatsappService';
import { documentService } from '../pages/N8N/services/documentService';
import { webhookService } from '../pages/N8N/services/webhookService';

interface DocumentShareModalProps {
  formData: ReceiptData;
  companySettings: CompanySettings;
  userId?: string;
  isGeneratingPdf: boolean;
  isPrinting: boolean;
  onGeneratePDF: () => Promise<void>;
  onPrintThermal: () => Promise<void>;
  onClose: () => void;
  t: (key: any) => string;
  fMoney: (val: number) => string;
}

type ShareMethod = 'email' | 'whatsapp' | 'download' | 'print' | null;

export const DocumentShareModal: React.FC<DocumentShareModalProps> = ({
  formData,
  companySettings,
  userId,
  isGeneratingPdf,
  isPrinting,
  onGeneratePDF,
  onPrintThermal,
  onClose,
  t,
  fMoney,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ShareMethod>(null);
  const [recipientEmail, setRecipientEmail] = useState(formData.clientContact || '');
  const [recipientName, setRecipientName] = useState(formData.clientName || '');
  const [recipientPhone, setRecipientPhone] = useState(formData.clientContact || '');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const documentTypeLabel = formData.type === 'INVOICE' ? 'Fatura' 
    : formData.type === 'INVOICE_RECEIPT' ? 'Fatura-Recibo'
    : formData.type === 'QUOTE' ? 'Orçamento' : 'Recibo';

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientName) return;
    setIsSending(true);
    setSendResult(null);

    try {
      // 1. Notificar criação do documento via webhook
      await documentService.notifyCreated({
        documentId: formData.id,
        documentNumber: formData.number,
        documentType: formData.type,
        clientName: recipientName,
        total: formData.total,
        currency: formData.currency,
        pdfUrl: formData.pdfUrl,
      }, userId);

      // 2. Enviar email com os dados do documento via webhook
      const result = await emailService.sendInvoiceEmail(
        recipientEmail,
        formData.number,
        recipientName,
        '', // PDF será anexado pelo n8n
        userId
      );

      // 3. Notificar compartilhamento via webhook
      await documentService.notifyShared(
        {
          documentId: formData.id,
          documentNumber: formData.number,
          documentType: formData.type,
          clientName: recipientName,
          total: formData.total,
          currency: formData.currency,
          pdfUrl: formData.pdfUrl,
        },
        'email',
        recipientEmail,
        userId
      );

      // 4. Enviar dados completos do documento para o webhook
      await webhookService.send('document.shared', {
        method: 'email',
        recipient: recipientEmail,
        recipientName,
        documentId: formData.id,
        documentNumber: formData.number,
        documentType: formData.type,
        documentTypeLabel,
        clientName: recipientName,
        clientContact: recipientEmail,
        total: formData.total,
        currency: formData.currency,
        subtotal: formData.subtotal,
        taxRate: formData.taxRate,
        taxAmount: formData.taxAmount,
        discount: formData.discount,
        date: formData.date,
        dueDate: formData.dueDate,
        items: formData.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        companyName: companySettings.name,
        companyContact: companySettings.contact,
        companyNuit: companySettings.nuit,
        stampText: formData.stampText,
        paymentMethod: formData.paymentMethod,
        shareLink: typeof window !== 'undefined' 
          ? `${window.location.origin}/shared/${formData.id}`
          : undefined,
      }, userId, {
        channel: 'email',
        template: 'invoice',
        priority: 'normal',
      });

      setSendResult({
        success: true,
        message: `Documento ${formData.number} enviado com sucesso para ${recipientEmail}!`,
      });
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.message || 'Erro ao enviar email. Tente novamente.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!recipientPhone || !recipientName) return;
    setIsSending(true);
    setSendResult(null);

    try {
      // 1. Notificar criação do documento via webhook
      await documentService.notifyCreated({
        documentId: formData.id,
        documentNumber: formData.number,
        documentType: formData.type,
        clientName: recipientName,
        total: formData.total,
        currency: formData.currency,
        pdfUrl: formData.pdfUrl,
      }, userId);

      // 2. Enviar WhatsApp com os dados do documento via webhook
      const result = await whatsappService.sendDocument(
        recipientPhone,
        formData.number,
        recipientName,
        formData.total,
        formData.currency,
        formData.pdfUrl,
        userId
      );

      // 3. Notificar compartilhamento via webhook
      await documentService.notifyShared(
        {
          documentId: formData.id,
          documentNumber: formData.number,
          documentType: formData.type,
          clientName: recipientName,
          total: formData.total,
          currency: formData.currency,
          pdfUrl: formData.pdfUrl,
        },
        'whatsapp',
        recipientPhone,
        userId
      );

      // 4. Enviar dados completos do documento para o webhook
      await webhookService.send('document.shared', {
        method: 'whatsapp',
        recipient: recipientPhone,
        recipientName,
        documentId: formData.id,
        documentNumber: formData.number,
        documentType: formData.type,
        documentTypeLabel,
        clientName: recipientName,
        clientContact: recipientPhone,
        total: formData.total,
        currency: formData.currency,
        subtotal: formData.subtotal,
        taxRate: formData.taxRate,
        taxAmount: formData.taxAmount,
        discount: formData.discount,
        date: formData.date,
        dueDate: formData.dueDate,
        items: formData.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        companyName: companySettings.name,
        companyContact: companySettings.contact,
        companyNuit: companySettings.nuit,
        stampText: formData.stampText,
        paymentMethod: formData.paymentMethod,
        shareLink: typeof window !== 'undefined' 
          ? `${window.location.origin}/shared/${formData.id}`
          : undefined,
      }, userId, {
        channel: 'whatsapp',
        template: 'invoice',
        priority: 'normal',
      });

      setSendResult({
        success: true,
        message: `Documento ${formData.number} enviado com sucesso para ${recipientPhone}!`,
      });
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.message || 'Erro ao enviar WhatsApp. Tente novamente.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = async () => {
    await onGeneratePDF();
    onClose();
  };

  const handlePrint = async () => {
    await onPrintThermal();
    onClose();
  };

  const resetSelection = () => {
    setSelectedMethod(null);
    setSendResult(null);
  };

  // Tela de seleção inicial
  if (!selectedMethod) {
    return (
      <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold dark:text-white">Compartilhar Documento</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {documentTypeLabel} <span className="font-mono font-bold">#{formData.number}</span>
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <i className="fa-solid fa-times text-slate-500"></i>
              </button>
            </div>
          </div>

          {/* Document Summary */}
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

          {/* Share Options */}
          <div className="p-6 space-y-3">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Escolha como deseja enviar
            </p>

            {/* Email */}
            <button
              onClick={() => setSelectedMethod('email')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-envelope text-xl"></i>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold dark:text-white">Enviar por Email</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Envia o documento como anexo via webhook</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors"></i>
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => setSelectedMethod('whatsapp')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <i className="fa-brands fa-whatsapp text-xl"></i>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold dark:text-white">Enviar por WhatsApp</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Envia a mensagem com resumo do documento via webhook</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors"></i>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownload}
              disabled={isGeneratingPdf}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-file-pdf text-xl"></i>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold dark:text-white">Baixar PDF</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gera e salva o documento em formato PDF A4</p>
              </div>
              {isGeneratingPdf ? (
                <i className="fa-solid fa-spinner animate-spin text-purple-500"></i>
              ) : (
                <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors"></i>
              )}
            </button>

            {/* Print Thermal */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-receipt text-xl"></i>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold dark:text-white">Imprimir Talão Térmico</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Imprime em bobina 58/80mm via Bluetooth</p>
              </div>
              {isPrinting ? (
                <i className="fa-solid fa-spinner animate-spin text-slate-500"></i>
              ) : (
                <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors"></i>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de formulário de envio (Email ou WhatsApp)
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button onClick={resetSelection} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
              <i className="fa-solid fa-arrow-left text-xs"></i>
            </button>
            <div>
              <h2 className="text-lg font-bold dark:text-white">
                {selectedMethod === 'email' ? 'Enviar por Email' : 'Enviar por WhatsApp'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {documentTypeLabel} #{formData.number}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Nome do Destinatário */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
              Nome do Destinatário
            </label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Email ou Telefone */}
          {selectedMethod === 'email' ? (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Email do Destinatário
              </label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Telefone do Destinatário (WhatsApp)
              </label>
              <div className="relative">
                <i className="fa-brands fa-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="258840000000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Document Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumo do Documento</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Número</span>
              <span className="font-bold dark:text-white font-mono">#{formData.number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Cliente</span>
              <span className="font-bold dark:text-white">{recipientName || formData.clientName || '---'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Data</span>
              <span className="font-bold dark:text-white">{formData.date}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Total</span>
              <span className="font-black text-blue-600 dark:text-blue-400">{fMoney(formData.total)}</span>
            </div>
            {formData.items.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Itens</p>
                {formData.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400 py-0.5">
                    <span className="truncate max-w-[200px]">{item.description}</span>
                    <span>{item.quantity}x {fMoney(item.unitPrice)}</span>
                  </div>
                ))}
                {formData.items.length > 3 && (
                  <p className="text-xs text-slate-400 mt-1">+{formData.items.length - 3} itens</p>
                )}
              </div>
            )}
          </div>

          {/* Result Message */}
          {sendResult && (
            <div className={`rounded-xl p-4 text-sm ${
              sendResult.success
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              <div className="font-bold mb-1 flex items-center gap-2">
                {sendResult.success ? (
                  <><i className="fa-solid fa-check-circle text-emerald-500"></i> Sucesso</>
                ) : (
                  <><i className="fa-solid fa-exclamation-circle text-red-500"></i> Erro</>
                )}
              </div>
              <p className="text-xs opacity-80">{sendResult.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {selectedMethod === 'email' ? (
              <button
                onClick={handleSendEmail}
                disabled={isSending || !recipientEmail || !recipientName}
                className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <><i className="fa-solid fa-spinner animate-spin"></i> Enviando...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane"></i> Enviar Email</>
                )}
              </button>
            ) : (
              <button
                onClick={handleSendWhatsApp}
                disabled={isSending || !recipientPhone || !recipientName}
                className="flex-1 bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <><i className="fa-solid fa-spinner animate-spin"></i> Enviando...</>
                ) : (
                  <><i className="fa-brands fa-whatsapp"></i> Enviar WhatsApp</>
                )}
              </button>
            )}
            <button
              onClick={resetSelection}
              disabled={isSending}
              className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentShareModal;
