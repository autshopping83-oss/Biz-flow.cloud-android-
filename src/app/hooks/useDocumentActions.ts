import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { saveDirectoryHandle } from '../../services/storageService';
import { connectToPrinter, printTicket } from '../../services/printerService';
import { supabase } from '../../services/supabaseClient';
import { validators } from '../../utils/validators';
import { ReceiptData, BluetoothPrinter } from '../../types';

interface UseDocumentActionsParams {
  formData: ReceiptData;
  sessionUserId?: string;
  receiptRef: React.RefObject<HTMLDivElement>;
  ghostReceiptRef: React.RefObject<HTMLDivElement>;
  thermalReceiptRef: React.RefObject<HTMLDivElement>;
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
  handleSave: (silent?: boolean) => Promise<void>;
}

export const useDocumentActions = ({
  formData,
  sessionUserId,
  receiptRef,
  ghostReceiptRef,
  thermalReceiptRef,
  notify,
  handleSave,
}: UseDocumentActionsParams) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printer, setPrinter] = useState<BluetoothPrinter | null>(null);
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);

  const requestFolderPermission = useCallback(async () => {
    if (!window.showDirectoryPicker) return null;
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setLocalDirHandle(handle);
      await saveDirectoryHandle(handle);
      notify('Pasta de armazenamento ativada!', 'success');
      return handle;
    } catch {
      notify('Permissão de pasta não concedida.', 'info');
      return null;
    }
  }, [notify]);

  const generatePDFBlob = useCallback(async (): Promise<{ blob: Blob; fileName: string; base64: string } | null> => {
    const targetRef = ghostReceiptRef.current || receiptRef.current;
    if (!targetRef) return null;

    try {
      const canvas = await html2canvas(targetRef, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        windowWidth: 1280,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('receipt-capture-ghost');
          if (el) {
            el.style.transform = 'none';
            el.style.boxShadow = 'none';
            el.style.margin = '0';
            el.style.padding = '25mm';
            el.style.position = 'static';
            el.style.width = '210mm';
            el.style.minHeight = '297mm';
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      const sanitizedNumber = validators.fileName(formData.number);
      const sanitizedClientName = validators.fileName(formData.clientName);
      const fileName = sanitizedClientName
        ? `${sanitizedNumber}_${sanitizedClientName}.pdf`
        : `${sanitizedNumber}_documento.pdf`;

      return { blob: pdf.output('blob'), fileName, base64: pdf.output('datauristring').split(',')[1] };
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [formData, ghostReceiptRef, receiptRef]);

  const handleGeneratePDF = useCallback(async () => {
    setIsGeneratingPdf(true);
    notify('Preparando Documento A4...', 'info');

    try {
      const pdfData = await generatePDFBlob();
      if (!pdfData) throw new Error('Falha ao gerar PDF.');

      const { blob, fileName, base64 } = pdfData;

      if (window.Capacitor?.isNativePlatform()) {
        try {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
          });
          notify(`Salvo nativamente em: ${savedFile.uri}`, 'success');
          if (sessionUserId) await handleSave(true);
          return;
        } catch (nativeErr) {
          console.error('Native save error:', nativeErr);
        }
      }

      let dirHandle = localDirHandle;
      if (!dirHandle && window.showDirectoryPicker) {
        dirHandle = await requestFolderPermission();
      }

      if (dirHandle) {
        try {
          const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
          if (permission !== 'granted') await dirHandle.requestPermission({ mode: 'readwrite' });
          const subfolderName = formData.type === 'INVOICE' ? 'Faturas' : formData.type === 'INVOICE_RECEIPT' ? 'Faturas-Recibos' : formData.type === 'QUOTE' ? 'Orcamentos' : 'Recibos';
          const subDir = await dirHandle.getDirectoryHandle(subfolderName, { create: true });
          const fileHandle = await subDir.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          notify(`Salvo com sucesso na pasta: ${subfolderName}`, 'success');
        } catch {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          link.click();
        }
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      }

      if (sessionUserId) await handleSave(true);
    } catch {
      notify('Erro na geração do PDF. Tente novamente.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [formData, generatePDFBlob, handleSave, localDirHandle, notify, requestFolderPermission, sessionUserId]);

  const handleShareWhatsApp = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    notify('Preparando partilha direta...', 'info');

    try {
      const pdfData = await generatePDFBlob();
      if (!pdfData) throw new Error('Erro ao gerar ficheiro.');

      const { blob, fileName } = pdfData;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName, text: `Envio de ${formData.number}` });
        notify('Partilha concluída!', 'success');
      } else {
        if (!formData.clientContact || !validators.phone(formData.clientContact)) {
          notify('Número de telefone inválido. Verifique o contato do cliente.', 'error');
          setIsSharing(false);
          return;
        }
        const cleanPhone = formData.clientContact.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá, segue o documento ${formData.number}.`)}`, '_blank');
        notify('Aviso: Seu navegador não suporta partilha de ficheiros direta. Abrindo chat...', 'info');
      }
    } catch {
      notify('Erro ao partilhar documento.', 'error');
    } finally {
      setIsSharing(false);
    }
  }, [formData, generatePDFBlob, isSharing, notify]);

  const handlePrintThermal = useCallback(async () => {
    if (isPrinting) return;
    const targetRef = thermalReceiptRef.current;
    if (!targetRef) {
      notify('Erro: Recibo térmico não encontrado.', 'error');
      return;
    }

    setIsPrinting(true);

    try {
      let currentPrinter = printer;
      if (!currentPrinter || !currentPrinter.gatt?.connected) {
        notify('Solicitando acesso Bluetooth...', 'info');
        currentPrinter = await connectToPrinter();
        if (currentPrinter) {
          setPrinter(currentPrinter);
          notify(`Conectado: ${currentPrinter.name}`, 'success');
        } else {
          setIsPrinting(false);
          return;
        }
      }

      if (currentPrinter) {
        notify('Enviando para impressão térmica...', 'info');
        await printTicket(currentPrinter, targetRef);
        notify('Impressão enviada!', 'success');
      }
    } catch {
      notify('Erro na impressão. Verifique a conexão Bluetooth.', 'error');
      setPrinter(null);
    } finally {
      setIsPrinting(false);
    }
  }, [isPrinting, notify, printer, thermalReceiptRef]);

  return {
    isGeneratingPdf,
    isSharing,
    isPrinting,
    localDirHandle,
    requestFolderPermission,
    handleGeneratePDF,
    handleShareWhatsApp,
    handlePrintThermal,
  };
};
