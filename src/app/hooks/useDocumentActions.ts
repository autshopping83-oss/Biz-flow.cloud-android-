import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import { validators } from '../../utils/validators';
import { ReceiptData } from '../../types';

interface UseDocumentActionsParams {
  formData: ReceiptData;
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
  handleSave: (silent?: boolean) => Promise<void>;
}

const isCapacitor = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

// --- Geração de PDF via jsPDF puro (confiável, sem html2canvas) ---
function generatePdfJsPDF(formData: ReceiptData, fMoney: (val: number) => string): { blob: Blob; fileName: string } {
  const doc = formData;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const tipo = { INVOICE: 'FATURA', RECEIPT: 'RECIBO', INVOICE_RECEIPT: 'FACTURA-RECIBO', QUOTE: 'ORÇAMENTO' }[doc.type] || doc.type;
  let y = 20;

  // Cabeçalho
  pdf.setFontSize(18);
  pdf.text(doc.companyName || 'Biz-flow', 105, y, { align: 'center' }); y += 10;
  if (doc.companyAddress) { pdf.setFontSize(8); pdf.text(doc.companyAddress, 105, y, { align: 'center' }); y += 6; }
  if (doc.companyNuit) { pdf.setFontSize(8); pdf.text('NUIT: ' + doc.companyNuit, 105, y, { align: 'center' }); y += 6; }
  y += 4;

  // Tipo e número
  pdf.setFontSize(14);
  pdf.text(tipo + ' Nº ' + doc.number, 105, y, { align: 'center' }); y += 10;

  // Data e cliente
  pdf.setFontSize(10);
  pdf.text('Data: ' + doc.date, 20, y);
  if (doc.dueDate) { pdf.text('Vencimento: ' + doc.dueDate, 130, y); }
  y += 8;

  if (doc.clientName) { pdf.text('Cliente: ' + doc.clientName, 20, y); y += 6; }
  if (doc.clientNuit) { pdf.text('NUIT: ' + doc.clientNuit, 20, y); y += 6; }
  if (doc.clientContact) { pdf.text('Contato: ' + doc.clientContact, 20, y); y += 6; }
  if (doc.clientLocation) { pdf.text('Local: ' + doc.clientLocation, 20, y); y += 6; }
  y += 4;

  // Separador
  pdf.setDrawColor(200);
  pdf.line(20, y, 190, y); y += 6;

  // Itens
  pdf.setFontSize(9);
  pdf.text('Descrição', 20, y);
  pdf.text('Qtd', 115, y);
  pdf.text('Preço', 140, y);
  pdf.text('Total', 175, y);
  y += 6;

  pdf.line(20, y, 190, y); y += 4;

  pdf.setFontSize(8);
  for (const item of doc.items) {
    if (y > 270) { pdf.addPage(); y = 20; }
    pdf.text(item.description.substring(0, 55), 20, y);
    pdf.text(String(item.quantity), 115, y, { align: 'right' });
    pdf.text(fMoney(item.unitPrice), 140, y, { align: 'right' });
    pdf.text(fMoney(item.total), 175, y, { align: 'right' });
    y += 5;
  }

  y += 3;
  pdf.line(20, y, 190, y); y += 6;

  // Totais
  pdf.setFontSize(10);
  pdf.text('Subtotal:', 120, y);
  pdf.text(fMoney(doc.subtotal), 175, y, { align: 'right' }); y += 6;

  if (doc.taxRate > 0) {
    pdf.text('IVA (' + doc.taxRate + '%):', 120, y);
    pdf.text(fMoney(doc.taxAmount), 175, y, { align: 'right' }); y += 6;
  }

  if (doc.discount > 0) {
    pdf.text('Desconto:', 120, y);
    pdf.text('-' + fMoney(doc.discount), 175, y, { align: 'right' }); y += 6;
  }

  pdf.setFontSize(14);
  pdf.setTextColor(37, 99, 235);
  pdf.text('TOTAL: ' + fMoney(doc.total), 175, y + 4, { align: 'right' });

  // Selo
  if (doc.stampText) {
    pdf.setTextColor(200, 50, 50);
    pdf.setFontSize(20);
    pdf.text(doc.stampText, 105, 120, { align: 'center', angle: -15 });
    pdf.setTextColor(0, 0, 0);
  }

  // Rodapé
  const pageCount = pdf.getNumberOfPages();
  pdf.setFontSize(7);
  pdf.setTextColor(128);
  pdf.text('Gerado por Biz-flow.cloud', 105, 290, { align: 'center' });
  pdf.text(`Página 1/${pageCount}`, 190, 290, { align: 'right' });

  const sanitizedNumber = validators.fileName(formData.number);
  const sanitizedClientName = validators.fileName(formData.clientName);
  const fileName = sanitizedClientName
    ? `${sanitizedNumber}_${sanitizedClientName}.pdf`
    : `${sanitizedNumber}_documento.pdf`;

  return { blob: pdf.output('blob'), fileName };
}

// --- Blob → Base64 ---
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Constante: path da pasta Biz-flow no dispositivo
const APP_FOLDER = 'Biz-flow';

export const useDocumentActions = ({
  formData,
  notify,
  handleSave,
}: UseDocumentActionsParams) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Helper: formatar dinheiro
  const fMoney = (val: number) => `${val.toLocaleString()} ${formData.currency || 'MZN'}`;

  // Helper: Guardar no dispositivo (pastas Biz-flow/)
  const saveToDevice = async (blob: Blob, fileName: string): Promise<string | null> => {
    if (!isCapacitor) return null;
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      // Garantir que a pasta Biz-flow existe
      try {
        await Filesystem.mkdir({ path: APP_FOLDER, directory: Directory.Documents, recursive: true });
      } catch {}
      const base64 = await blobToBase64(blob);
      const path = `${APP_FOLDER}/${fileName}`;
      await Filesystem.writeFile({ path, data: base64, directory: Directory.Documents });
      const uri = await Filesystem.getUri({ path, directory: Directory.Documents });
      return uri.uri;
    } catch { return null; }
  };

  // Helper: Guardar em cache (para share temporário)
  const saveToCache = async (blob: Blob, fileName: string): Promise<string | null> => {
    if (!isCapacitor) return null;
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const base64 = await blobToBase64(blob);
      const path = `temp/${fileName}`;
      await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
      const uri = await Filesystem.getUri({ path, directory: Directory.Cache });
      return uri.uri;
    } catch { return null; }
  };

  // Geração de PDF: jsPDF puro (confiável, 0% dependência de DOM/rede)
  const generatePDFBlob = useCallback(async (): Promise<{ blob: Blob; fileName: string } | null> => {
    try {
      return generatePdfJsPDF(formData, fMoney);
    } catch (e) {
      console.error('jsPDF generation error:', e);
      return null;
    }
  }, [formData, fMoney]);

  const handleGeneratePDF = useCallback(async () => {
    setIsGeneratingPdf(true);
    notify('A gerar PDF...', 'info');

    try {
      const pdfData = await generatePDFBlob();
      if (!pdfData) throw new Error('Falha ao gerar PDF.');
      const { blob, fileName } = pdfData;

      if (isCapacitor) {
        const uri = await saveToDevice(blob, fileName);
        if (uri) {
          notify(`PDF guardado em ${APP_FOLDER}/${fileName}`, 'success');
        } else {
          notify('Erro ao guardar PDF.', 'error');
        }
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        notify('Documento descarregado!', 'success');
      }
      await handleSave(true);
    } catch {
      notify('Erro na geração do PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [formData, generatePDFBlob, handleSave, notify]);

  // WhatsApp: GERA PDF → GUARDA LOCAL → SHARE SHEET com PDF anexado
  const handleShareWhatsApp = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    notify('A preparar documento...', 'info');

    try {
      const pdfData = await generatePDFBlob();
      if (!pdfData) throw new Error('Erro ao gerar PDF.');

      if (isCapacitor) {
        // 1. Guardar PDF na pasta Biz-flow (persistente)
        const uri = await saveToDevice(pdfData.blob, pdfData.fileName);
        if (!uri) throw new Error('Erro ao guardar PDF.');

        // 2. Guardar também em cache para o Share sheet
        const cacheUri = await saveToCache(pdfData.blob, pdfData.fileName);

        // 3. Abrir Share sheet nativo com o PDF anexado
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: `Documento ${formData.number}`,
          text: `Segue o documento ${formData.number}`,
          url: cacheUri || uri,
          dialogTitle: 'Compartilhar Documento',
        });
        notify('Documento partilhado!', 'success');
      } else {
        // Web: navigator.share
        const file = new File([pdfData.blob], pdfData.fileName, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: pdfData.fileName, text: formData.number });
          notify('Partilha concluída!', 'success');
        } else if (formData.clientContact && validators.phone(formData.clientContact)) {
          const cleanPhone = formData.clientContact.replace(/\D/g, '');
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá, segue o documento ${formData.number}.`)}`, '_blank');
          notify('WhatsApp aberto!', 'success');
        }
      }
    } catch (e: any) {
      if (e?.message !== 'canceled') {
        notify('Erro ao partilhar: ' + (e?.message || ''), 'error');
      }
    } finally {
      setIsSharing(false);
    }
  }, [formData, generatePDFBlob, isSharing, notify]);

  // Impressão Térmica
  const handlePrintThermal = useCallback(async () => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const doc = formData;

      if (isCapacitor) {
        // BLE nativo
        try {
          const { BLEPrinterService } = await import('../../features/bluetooth/BLEPrinterService');
          const { ThermalPrinter } = await import('../../features/bluetooth/thermalPrinterProtocol');

          // Scanear e conectar se necessário
          if (!BLEPrinterService.isConnected()) {
            notify('A procurar impressoras Bluetooth...', 'info');
            const devices = await BLEPrinterService.scanDevices(8000);
            if (devices.length === 0) {
              notify('Nenhuma impressora encontrada. Verifique se está ligada.', 'error');
              setIsPrinting(false);
              return;
            }
            await BLEPrinterService.connect(devices[0]!.deviceId);
            notify(`Conectado a: ${devices[0]!.name}`, 'success');
          }

          const printer = new ThermalPrinter();
          const data = printer.buildDocument({
            companyName: doc.companyName || 'Biz-flow',
            companyNuit: doc.companyNuit,
            documentType: { INVOICE: 'FATURA', RECEIPT: 'RECIBO', INVOICE_RECEIPT: 'FACTURA-RECIBO', QUOTE: 'ORÇAMENTO' }[doc.type] || doc.type,
            documentNumber: doc.number,
            date: doc.date,
            clientName: doc.clientName,
            clientNuit: doc.clientNuit,
            items: doc.items.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.total,
            })),
            subtotal: doc.subtotal,
            taxRate: doc.taxRate,
            taxAmount: doc.taxAmount,
            discount: doc.discount,
            total: doc.total,
            currency: doc.currency,
            stampText: doc.stampText,
          }).getData();

          await BLEPrinterService.print(data);
          notify('Documento enviado para impressão!', 'success');
        } catch (e: any) {
          notify('Erro na impressão: ' + (e?.message || 'Verifique a impressora.'), 'error');
        }
      } else {
        // Web: browser print
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          notify('Bloqueador de pop-ups ativo.', 'error');
          setIsPrinting(false);
          return;
        }
        const fM = (val: number) => `${val.toLocaleString()} ${doc.currency || 'MT'}`;
        const tipo = { INVOICE: 'FATURA', RECEIPT: 'RECIBO', INVOICE_RECEIPT: 'FACTURA-RECIBO', QUOTE: 'ORÇAMENTO' }[doc.type] || doc.type;
        const itemsHtml = doc.items.map(item => `
          <tr>
            <td style="padding:2px 0;font-size:10px">${item.description}</td>
            <td style="padding:2px 0;font-size:10px;text-align:right">${item.quantity}x</td>
            <td style="padding:2px 0;font-size:10px;text-align:right">${fM(item.unitPrice)}</td>
            <td style="padding:2px 0;font-size:10px;text-align:right;font-weight:bold">${fM(item.total)}</td>
          </tr>`).join('');

        printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Imprimir Talão</title>
<style>
  @page { width: 80mm; margin: 0; padding: 0; }
  body { width: 72mm; margin: 0 auto; padding: 5mm 0; font-family: monospace; font-size: 11px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .h1 { font-size: 14px; font-weight: bold; margin: 2px 0; }
  .h2 { font-size: 12px; margin: 2px 0; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; }
  .total { font-size: 16px; font-weight: bold; margin: 8px 0; }
  .footer { margin-top: 10px; font-size: 10px; }
  @media print { body { width: 58mm; } }
</style></head><body>
  <div class="center">
    ${doc.companyName ? `<div class="h1">${doc.companyName}</div>` : ''}
    ${doc.companyNuit ? `<div class="h2">NUIT: ${doc.companyNuit}</div>` : ''}
  </div>
  <hr><div class="center"><div class="h1">${tipo}</div><div class="h2">Nº ${doc.number}</div><div class="h2">${doc.date}</div></div><hr>
  ${doc.clientName ? `<div><b>Cliente:</b> ${doc.clientName}</div>` : ''}
  <hr><table><tr style="font-weight:bold;font-size:10px"><td>Descrição</td><td style="text-align:right">Qtd</td><td style="text-align:right">Preço</td><td style="text-align:right">Total</td></tr>${itemsHtml}</table><hr>
  <div style="text-align:right"><div><b>Subtotal:</b> ${fM(doc.subtotal)}</div>${doc.taxRate > 0 ? `<div><b>IVA (${doc.taxRate}%):</b> ${fM(doc.taxAmount)}</div>` : ''}${doc.discount > 0 ? `<div><b>Desconto:</b> -${fM(doc.discount)}</div>` : ''}<div class="total">Total: ${fM(doc.total)}</div></div>
  ${doc.stampText ? `<hr><div class="center bold" style="font-size:14px">${doc.stampText}</div>` : ''}
  <hr><div class="center footer"><p>Obrigado pela preferência!</p><p>Gerado por Biz-flow</p></div>
</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
        notify('Talão enviado para impressão.', 'success');
      }
    } catch (erro) {
      console.error('Erro impressão:', erro);
      notify('Erro ao imprimir.', 'error');
    } finally {
      setIsPrinting(false);
    }
  }, [isPrinting, formData, notify]);

  return {
    isGeneratingPdf,
    isSharing,
    isPrinting,
    handleGeneratePDF,
    handleShareWhatsApp,
    handlePrintThermal,
    generatePDFBlob,
  };
};
