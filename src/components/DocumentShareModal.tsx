import React, { useState } from 'react';
import { ReceiptData, CompanySettings } from '../types';
import { emailService } from '../pages/N8N/services/emailService';
import { whatsappService } from '../pages/N8N/services/whatsappService';
import { documentService } from '../pages/N8N/services/documentService';
import { webhookService } from '../pages/N8N/services/webhookService';
import { DocumentShareModalView } from './DocumentShareModalView';

interface DocumentShareModalProps {
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
}

type ShareMethod = 'email' | 'whatsapp' | 'download' | 'print' | null;

interface SharedItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

function buildDocumentPayload(
  formData: ReceiptData,
  companySettings: CompanySettings,
  method: 'email' | 'whatsapp',
  recipient: string,
  recipientName: string
): Record<string, unknown> {
  const documentTypeLabel = formData.type === 'INVOICE' ? 'Fatura'
    : formData.type === 'INVOICE_RECEIPT' ? 'Fatura-Recibo'
    : formData.type === 'QUOTE' ? 'Orçamento' : 'Recibo';

  return {
    method,
    recipient,
    recipientName,
    documentId: formData.id,
    documentNumber: formData.number,
    documentType: formData.type,
    documentTypeLabel,
    clientName: recipientName,
    clientContact: recipient,
    total: formData.total,
    currency: formData.currency,
    subtotal: formData.subtotal,
    taxRate: formData.taxRate,
    taxAmount: formData.taxAmount,
    discount: formData.discount,
    date: formData.date,
    dueDate: formData.dueDate,
    items: formData.items.map((item: SharedItem) => ({
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
  };
}

export const DocumentShareModal: React.FC<DocumentShareModalProps> = ({
  formData, companySettings, userId, isGeneratingPdf, isPrinting,
  onGeneratePDF, onPrintThermal, onClose, t, fMoney,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ShareMethod>(null);
  const [recipientEmail, setRecipientEmail] = useState(formData.clientContact || '');
  const [recipientName, setRecipientName] = useState(formData.clientName || '');
  const [recipientPhone, setRecipientPhone] = useState(formData.clientContact || '');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async (method: 'email' | 'whatsapp') => {
    const recipient = method === 'email' ? recipientEmail : recipientPhone;
    if (!recipient || !recipientName) return;
    setIsSending(true);
    setSendResult(null);

    try {
      await documentService.notifyCreated({
        documentId: formData.id, documentNumber: formData.number,
        documentType: formData.type, clientName: recipientName,
        total: formData.total, currency: formData.currency, pdfUrl: formData.pdfUrl,
      }, userId);

      if (method === 'email') {
        await emailService.sendInvoiceEmail(recipient, formData.number, recipientName, '', userId);
      } else {
        await whatsappService.sendDocument(recipient, formData.number, recipientName, formData.total, formData.currency, formData.pdfUrl, userId);
      }

      await documentService.notifyShared({
        documentId: formData.id, documentNumber: formData.number,
        documentType: formData.type, clientName: recipientName,
        total: formData.total, currency: formData.currency, pdfUrl: formData.pdfUrl,
      }, method, recipient, userId);

      const payload = buildDocumentPayload(formData, companySettings, method, recipient, recipientName);
      await webhookService.send('document.shared', payload, userId, {
        channel: method, template: 'invoice', priority: 'normal',
      });

      setSendResult({ success: true, message: `Documento ${formData.number} enviado com sucesso para ${recipient}!` });
    } catch (err: unknown) {
      setSendResult({ success: false, message: err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = async () => { await onGeneratePDF(); onClose(); };
  const handlePrint = async () => { await onPrintThermal(); onClose(); };

  const viewProps = {
    formData, companySettings, userId, isGeneratingPdf, isPrinting,
    onGeneratePDF, onPrintThermal, onClose, t, fMoney,
    selectedMethod, setSelectedMethod,
    recipientEmail, setRecipientEmail,
    recipientName, setRecipientName,
    recipientPhone, setRecipientPhone,
    isSending, sendResult,
    handleSend, handleDownload, handlePrint,
  };

  return <DocumentShareModalView {...viewProps} />;
};

export default DocumentShareModal;
