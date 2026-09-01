// src/components/DocumentShareModal.tsx
import { useState } from 'react';
import { ReceiptData, CompanySettings } from '../types';
import { getTranslation } from '../services/translationService';
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
  onGetPdfBlob?: () => Promise<{ blob: Blob; fileName: string } | null>;
}

type ShareMethod = 'email' | 'whatsapp' | 'download' | 'print' | 'nativeshare' | null;

async function getPdfData(onGetPdfBlob: (() => Promise<{ blob: Blob; fileName: string } | null>) | undefined, fMoney: (val: number) => string, formData: ReceiptData, lang: string): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    if (onGetPdfBlob) {
      const data = await onGetPdfBlob();
      if (data) return data;
    }
    return gerarPdfFallback(fMoney, formData, lang);
  } catch (e) {
    console.error('getPdfData FAIL:', e);
    return null;
  }
}

async function gerarPdfFallback(fMoney: (val: number) => string, formData: ReceiptData, lang: string): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const doc = formData;
    const t = (k: string) => getTranslation(lang, k);
    const tipo =
      doc.type === 'INVOICE' ? t('invoice')
      : doc.type === 'RECEIPT' ? t('receipt')
      : doc.type === 'INVOICE_RECEIPT' ? t('invoiceReceipt')
      : t('quote');
    let y = 20;
    pdf.setFontSize(18);
    pdf.text(doc.companyName || 'biz-flow.cloud', 105, y, { align: 'center' }); y += 10;
    pdf.setFontSize(14);
    pdf.text(tipo + ' #' + doc.number, 105, y, { align: 'center' }); y += 8;
    pdf.setFontSize(10);
    pdf.text(`${t('issueDate')}: ` + doc.date, 20, y); y += 8;
    if (doc.clientName) { pdf.text(`${t('clientLabel')}: ` + doc.clientName, 20, y); y += 6; }
    y += 4;
    pdf.setFontSize(8);
    doc.items.forEach(item => {
      const line = `${item.description}  |  ${item.quantity}x  |  ${fMoney(item.unitPrice)}  |  ${fMoney(item.total)}`;
      if (y > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, 20, y); y += 6;
    });
    y += 4; pdf.setFontSize(12);
    pdf.text(`${t('subtotalLabel')}: ` + fMoney(doc.subtotal), 190, y, { align: 'right' }); y += 7;
    if (doc.taxRate > 0) { pdf.text(`${t('vat')} (` + doc.taxRate + '%): ' + fMoney(doc.taxAmount), 190, y, { align: 'right' }); y += 7; }
    if (doc.discount > 0) { pdf.text(`${t('discount')}: -` + fMoney(doc.discount), 190, y, { align: 'right' }); y += 7; }
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235);
    pdf.text(`${t('grandTotal')}: ` + fMoney(doc.total), 190, y + 4, { align: 'right' });
    const blob = pdf.output('blob');
    const fileName = (doc.number || 'documento').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
    return { blob, fileName };
  } catch { return null; }
}

async function savePdfToCache(blob: Blob, fileName: string): Promise<string | null> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const path = `temp/${fileName}`;
    await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
    const uri = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Filesystem.stat({ path, directory: Directory.Cache });
    console.log('PDF cache OK:', uri.uri);
    return uri.uri;
  } catch (e) {
    console.error('savePdfToCache FAIL:', e);
    return null;
  }
}

async function savePdfToDevice(blob: Blob, fileName: string): Promise<string | null> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    try { await Filesystem.mkdir({ path: 'Biz-flow', directory: Directory.Documents, recursive: true }); } catch {}
    await Filesystem.writeFile({ path: `Biz-flow/${fileName}`, data: base64, directory: Directory.Documents });
    const uri = await Filesystem.getUri({ path: `Biz-flow/${fileName}`, directory: Directory.Documents });
    await Filesystem.stat({ path: `Biz-flow/${fileName}`, directory: Directory.Documents });
    console.log('PDF device OK:', uri.uri);
    return uri.uri;
  } catch (e) {
    console.error('savePdfToDevice FAIL:', e);
    return null;
  }
}

export const DocumentShareModal: React.FC<DocumentShareModalProps> = ({
  formData, companySettings, userId, isGeneratingPdf, isPrinting,
  onGeneratePDF, onPrintThermal, onClose, t, fMoney, onGetPdfBlob,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ShareMethod>(null);
  const [recipientEmail, setRecipientEmail] = useState(formData.clientContact || '');
  const [recipientName, setRecipientName] = useState(formData.clientName || '');
  const [recipientPhone, setRecipientPhone] = useState(formData.clientWhatsApp || formData.clientContact || '');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const isNative = typeof window !== 'undefined' && !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  const qt = (key: string) => getTranslation(companySettings.language, key);

  // Gera PDF (html2canvas → jsPDF fallback)
  const getPdf = async () => getPdfData(onGetPdfBlob, fMoney, formData, companySettings.language);

  // Native Share Sheet (Android share sheet com PDF anexado)
  const handleNativeShare = async () => {
    setIsSending(true);
    setSendResult(null);
    const pdfData = await getPdf();
    if (!pdfData) {
      setSendResult({ success: false, message: qt('pdfGenerateError') });
      setIsSending(false);
      return;
    }
    try {
      const uri = await savePdfToCache(pdfData.blob, pdfData.fileName);
      if (uri) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: pdfData.fileName, url: uri, dialogTitle: qt('shareDocument') });
        setSendResult({ success: true, message: qt('docShared') });
      } else {
        setSendResult({ success: false, message: qt('pdfPrepareError') });
      }
    } catch {
      setSendResult({ success: false, message: qt('shareCancelled') });
    } finally {
      setIsSending(false);
    }
  };

  // Baixar PDF (salva no dispositivo)
  const handleDownload = async () => {
    setIsSending(true);
    setSendResult(null);
    const pdfData = await getPdf();
    if (!pdfData) {
      // Fallback para o método antigo (onGeneratePDF via useDocumentActions)
      await onGeneratePDF();
      onClose();
      return;
    }
    if (isNative) {
      const uri = await savePdfToDevice(pdfData.blob, pdfData.fileName);
      if (uri) {
        setSendResult({ success: true, message: `${qt('pdfSavedAt')} Biz-flow/${pdfData.fileName}` });
      } else {
        setSendResult({ success: false, message: qt('pdfSaveError') });
      }
    } else {
      // Web fallback: download
      const url = URL.createObjectURL(pdfData.blob);
      const a = document.createElement('a');
      a.href = url; a.download = pdfData.fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSendResult({ success: true, message: `${qt('pdfDownloaded')} "${pdfData.fileName}"` });
    }
    setIsSending(false);
  };

  // WhatsApp (Gera PDF → guarda local → Share sheet com PDF anexado)
  const handleSendWhatsApp = async (telefone: string) => {
    if (isNative) {
      // Gerar PDF primeiro
      const pdfData = await getPdf();
      if (!pdfData) {
        setSendResult({ success: false, message: qt('pdfGenerateError') });
        return;
      }
      try {
        // Guardar PDF na pasta Biz-flow do dispositivo
        const uri = await savePdfToDevice(pdfData.blob, pdfData.fileName);
        const cacheUri = await savePdfToCache(pdfData.blob, pdfData.fileName);
        // Abrir Share sheet nativo com o PDF
        const { Share } = await import('@capacitor/share');
        const cuerpo = `${qt('msgGreeting')} ${recipientName}, ${qt('msgDocument').toLowerCase()} ${formData.number}`;
        await Share.share({
          title: formData.number,
          text: cuerpo,
          url: cacheUri || uri || undefined,
          dialogTitle: qt('shareViaWhatsApp'),
        });
        setSendResult({ success: true, message: `${qt('docSharedWith')} ${recipientName}!` });
      } catch (e: any) {
        const isCancel = e?.message === 'canceled' || e?.message?.includes('cancel');
        setSendResult({ success: false, message: isCancel ? qt('shareCancelled') : qt('whatsAppOpenError') });
      }
    } else {
      // Web: wa.me com texto
      const cleanPhone = telefone.replace(/\D/g, '');
      const texto = `${qt('msgGreeting')} ${recipientName}, ${qt('msgDocument').toLowerCase()} ${formData.number} ${qt('msgTotal')} ${fMoney(formData.total)}. ${qt('msgBizFlow')}`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(texto)}`, '_blank');
      setSendResult({ success: true, message: `${qt('whatsAppOpened')} ${recipientName}!` });
    }
  };

  // Email (guarda PDF + tenta Share sheet; fallback mailto: com destinatário)
  const handleSendEmail = async (destinatario: string) => {
    if (isNative) {
      const pdfData = await getPdf();
      if (!pdfData) {
        setSendResult({ success: false, message: qt('pdfGenerateError') });
        return;
      }
      let deviceUri: string | null = null;
      try {
        deviceUri = await savePdfToDevice(pdfData.blob, pdfData.fileName);
        const cacheUri = await savePdfToCache(pdfData.blob, pdfData.fileName);
        if (cacheUri) {
          const { Share } = await import('@capacitor/share');
          const bodyTxt = `${qt('msgGreeting')} ${recipientName},\n\n${qt('msgDocument').toLowerCase()} ${formData.number}.\n\n${qt('msgClosing')},\n${companySettings.name}`;
          await Share.share({
            title: formData.number,
            text: bodyTxt,
            url: cacheUri,
            dialogTitle: qt('sendDocEmailDialog'),
          });
          setSendResult({ success: true, message: `${qt('docSharedWith')} ${recipientName}!` });
        } else {
          throw new Error(qt('cacheSaveError'));
        }
      } catch (e) {
        const err = e as { message?: string } | undefined;
        const isCancel = err?.message === 'canceled' || err?.message?.includes('cancel');
        if (isCancel) {
          setSendResult({ success: false, message: qt('shareCancelled') });
        } else {
          // Fallback: abrir email nativo com destinatário preenchido
          try {
            const { AppLauncher } = await import('@capacitor/app-launcher');
            const subject = `${formData.number}`;
            const body = `${qt('msgGreeting')} ${recipientName},\n\n${qt('msgDocument').toLowerCase()} ${formData.number}.\n\n${qt('msgClosing')},\n${companySettings.name}`;
            const mailtoUrl = `mailto:${destinatario}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            await AppLauncher.openUrl({ url: mailtoUrl });
            const savedMsg = deviceUri ? qt('pdfSavedAppend') : '';
            setSendResult({ success: true, message: `${qt('emailOpenedFor')} ${recipientName}!${savedMsg}` });
          } catch {
            setSendResult({ success: false, message: qt('emailOpenError') });
          }
        }
      }
    } else {
      // Web: mailto:
      const subject = `${formData.number}`;
      const body = `${qt('msgGreeting')} ${recipientName},\n\n${qt('msgDocument').toLowerCase()} ${formData.number}.\n\n${qt('msgClosing')},\n${companySettings.name}`;
      window.open(`mailto:${destinatario}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
      setSendResult({ success: true, message: `${qt('emailOpenedFor')} ${recipientName}!` });
    }
  };

  // Enviar (após preencher formulário)
  const handleSend = async (method: 'email' | 'whatsapp') => {
    const recipient = method === 'email' ? recipientEmail : recipientPhone;
    if (!recipient || !recipientName) return;
    setIsSending(true);
    setSendResult(null);

    if (method === 'email') {
      await handleSendEmail(recipient);
    } else {
      await handleSendWhatsApp(recipient);
    }
    setIsSending(false);
  };

  // Impressão Térmica
  const handlePrint = async () => {
    if (isNative) {
      // Tentar BLE nativo, se falhar avisar
      try {
        await onPrintThermal();
      } catch {
        setSendResult({ success: false, message: qt('printBluetoothError') });
        return;
      }
    } else {
      await onPrintThermal();
    }
    onClose();
  };

  const viewProps = {
    formData, companySettings, userId, isGeneratingPdf, isPrinting,
    onGeneratePDF, onPrintThermal, onClose, t, fMoney,
    selectedMethod, setSelectedMethod,
    recipientEmail, setRecipientEmail,
    recipientName, setRecipientName,
    recipientPhone, setRecipientPhone,
    isSending, sendResult,
    handleSend, handleDownload, handlePrint,
    handleNativeShare, isNative,
  };

  return <DocumentShareModalView {...viewProps} />;
};

export default DocumentShareModal;
