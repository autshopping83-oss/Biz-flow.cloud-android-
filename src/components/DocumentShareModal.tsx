// src/components/DocumentShareModal.tsx
import { useState } from 'react';
import { ReceiptData, CompanySettings } from '../types';
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

async function getPdfData(onGetPdfBlob: (() => Promise<{ blob: Blob; fileName: string } | null>) | undefined, fMoney: (val: number) => string, formData: ReceiptData): Promise<{ blob: Blob; fileName: string } | null> {
  // Tenta html2canvas via hook primeiro
  if (onGetPdfBlob) {
    const data = await onGetPdfBlob();
    if (data) return data;
  }
  // Fallback: jsPDF puro
  return gerarPdfFallback(fMoney, formData);
}

async function gerarPdfFallback(fMoney: (val: number) => string, formData: ReceiptData): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const doc = formData;
    const tipo = { INVOICE: 'FACTURA', RECEIPT: 'RECIBO', INVOICE_RECEIPT: 'FACTURA-RECIBO', QUOTE: 'ORÇAMENTO' }[doc.type] || doc.type;
    let y = 20;
    pdf.setFontSize(18);
    pdf.text(doc.companyName || 'Biz-flow', 105, y, { align: 'center' }); y += 10;
    pdf.setFontSize(14);
    pdf.text(tipo + ' #' + doc.number, 105, y, { align: 'center' }); y += 8;
    pdf.setFontSize(10);
    pdf.text('Data: ' + doc.date, 20, y); y += 8;
    if (doc.clientName) { pdf.text('Cliente: ' + doc.clientName, 20, y); y += 6; }
    y += 4;
    pdf.setFontSize(8);
    doc.items.forEach(item => {
      const line = `${item.description}  |  ${item.quantity}x  |  ${fMoney(item.unitPrice)}  |  ${fMoney(item.total)}`;
      if (y > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, 20, y); y += 6;
    });
    y += 4; pdf.setFontSize(12);
    pdf.text('Subtotal: ' + fMoney(doc.subtotal), 190, y, { align: 'right' }); y += 7;
    if (doc.taxRate > 0) { pdf.text('IVA (' + doc.taxRate + '%): ' + fMoney(doc.taxAmount), 190, y, { align: 'right' }); y += 7; }
    if (doc.discount > 0) { pdf.text('Desconto: -' + fMoney(doc.discount), 190, y, { align: 'right' }); y += 7; }
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235);
    pdf.text('Total: ' + fMoney(doc.total), 190, y + 4, { align: 'right' });
    const blob = pdf.output('blob');
    const fileName = (doc.number || 'documento').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
    return { blob, fileName };
  } catch { return null; }
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
    await Filesystem.writeFile({ path: `Documents/${fileName}`, data: base64, directory: Directory.Documents });
    const uri = await Filesystem.getUri({ path: `Documents/${fileName}`, directory: Directory.Documents });
    return uri.uri;
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
    await Filesystem.writeFile({ path: `temp/${fileName}`, data: base64, directory: Directory.Cache });
    const uri = await Filesystem.getUri({ path: `temp/${fileName}`, directory: Directory.Cache });
    return uri.uri;
  } catch { return null; }
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

  const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

  // Gera PDF (html2canvas → jsPDF fallback)
  const getPdf = async () => getPdfData(onGetPdfBlob, fMoney, formData);

  // Native Share Sheet (Android share sheet com PDF anexado)
  const handleNativeShare = async () => {
    setIsSending(true);
    setSendResult(null);
    const pdfData = await getPdf();
    if (!pdfData) {
      setSendResult({ success: false, message: 'Erro ao gerar PDF.' });
      setIsSending(false);
      return;
    }
    try {
      const uri = await savePdfToCache(pdfData.blob, pdfData.fileName);
      if (uri) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: pdfData.fileName, url: uri, dialogTitle: 'Compartilhar Documento' });
        setSendResult({ success: true, message: 'Documento partilhado!' });
      } else {
        setSendResult({ success: false, message: 'Erro ao preparar PDF.' });
      }
    } catch {
      setSendResult({ success: false, message: 'Partilha cancelada.' });
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
        setSendResult({ success: true, message: `PDF guardado em: Documentos/${pdfData.fileName}` });
      } else {
        setSendResult({ success: false, message: 'Erro ao guardar PDF.' });
      }
    } else {
      // Web fallback: download
      const url = URL.createObjectURL(pdfData.blob);
      const a = document.createElement('a');
      a.href = url; a.download = pdfData.fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSendResult({ success: true, message: `PDF "${pdfData.fileName}" descarregado!` });
    }
    setIsSending(false);
  };

  // WhatsApp (Gera PDF → guarda local → Share sheet com PDF anexado)
  const handleSendWhatsApp = async (telefone: string) => {
    if (isNative) {
      // Gerar PDF primeiro
      const pdfData = await getPdf();
      if (!pdfData) {
        setSendResult({ success: false, message: 'Erro ao gerar PDF.' });
        return;
      }
      try {
        // Guardar PDF na pasta Biz-flow do dispositivo
        const uri = await savePdfToDevice(pdfData.blob, pdfData.fileName);
        const cacheUri = await savePdfToCache(pdfData.blob, pdfData.fileName);
        // Abrir Share sheet nativo com o PDF
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: `Documento ${formData.number}`,
          text: `Olá ${recipientName}, segue o documento ${formData.number}`,
          url: cacheUri || uri,
          dialogTitle: 'Enviar via WhatsApp',
        });
        setSendResult({ success: true, message: `Documento partilhado com ${recipientName}!` });
      } catch {
        setSendResult({ success: true, message: `Partilha cancelada.` });
      }
    } else {
      // Web: wa.me com texto
      const cleanPhone = telefone.replace(/\D/g, '');
      const texto = `Olá ${recipientName}, segue o documento ${formData.number} no valor de ${fMoney(formData.total)}. Biz-flow`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(texto)}`, '_blank');
      setSendResult({ success: true, message: `WhatsApp aberto para ${recipientName}!` });
    }
  };

  // Email (abre app nativo ou mailto:)
  const handleSendEmail = async (destinatario: string) => {
    const subject = `Documento ${formData.number}`;
    const body = `Olá ${recipientName},\n\nSegue o documento ${formData.number}.\n\nCumprimentos,\n${companySettings.name}`;
    const mailtoUrl = `mailto:${destinatario}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (isNative) {
      try {
        const { AppLauncher } = await import('@capacitor/app-launcher');
        await AppLauncher.openUrl({ url: mailtoUrl });
      } catch {
        window.open(mailtoUrl, '_blank');
      }
    } else {
      window.open(mailtoUrl, '_blank');
    }
    setSendResult({ success: true, message: `Email aberto para ${recipientName}!` });
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
        setSendResult({ success: false, message: 'Conecte uma impressora Bluetooth primeiro.' });
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
