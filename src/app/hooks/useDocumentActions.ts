import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import { validators } from '../../utils/validators';
import { formatMoney } from '../../services/translationService';
import { ReceiptData, CompanySettings } from '../../types';

// Escape HTML entities para prevenir XSS em document.write
function escapeHtml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

const isCapacitor = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

// --- Template HTML/CSS Profissional (Monocromático) ---
function buildDocumentHtml(formData: ReceiptData, companySettings: CompanySettings, fM: (val: number) => string): string {
  const e = escapeHtml;
  const doc = formData;
  const settings = companySettings;
  const tipo = { INVOICE: 'FATURA', RECEIPT: 'RECIBO', INVOICE_RECEIPT: 'FACTURA-RECIBO', QUOTE: 'ORÇAMENTO' }[doc.type] || doc.type;
  const logo = doc.companyLogo || settings.logo;

  const itemsHtml = doc.items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td class="desc">${e(item.description)}</td>
      <td class="qty">${item.quantity}</td>
      <td class="price">${fM(item.unitPrice)}</td>
      <td class="total">${fM(item.total)}</td>
    </tr>`).join('');

  const taxHtml = doc.taxRate > 0 ? `
    <div class="finance-row">
      <span>IVA (${doc.taxRate}%):</span>
      <span class="value">${fM(doc.taxAmount)}</span>
    </div>` : '';

  const discountHtml = doc.discount > 0 ? `
    <div class="finance-row">
      <span>Desconto:</span>
      <span class="value">- ${fM(doc.discount)}</span>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>${tipo} ${doc.number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #000; line-height: 1.5; padding: 10mm 12mm; max-width: 210mm; margin: 0 auto; background: #fff; position: relative; }
  ${doc.stampText ? `.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-20deg); font-size: 48px; font-weight: 900; color: rgba(0, 0, 0, 0.10); pointer-events: none; z-index: 999; letter-spacing: 8px; text-transform: uppercase; white-space: nowrap; }` : ''}
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6mm; gap: 4mm; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 60px; margin-bottom: 4px; filter: grayscale(100%); }
  .header-left .company-name { font-size: 16px; font-weight: 800; color: #000; }
  .header-left .company-detail { font-size: 9px; color: #555; margin-top: 1px; }
  .header-right { text-align: right; flex-shrink: 0; }
  .header-right .doc-type { font-size: 18px; font-weight: 800; color: #000; letter-spacing: 2px; text-transform: uppercase; }
  .header-right .doc-number { font-size: 13px; font-weight: 700; color: #000; margin-top: 2px; }
  .header-right .doc-date { font-size: 9px; color: #555; margin-top: 2px; }
  .divider { border: none; height: 1.5px; background: #000; margin-bottom: 5mm; }
  .client-section { background: #f5f5f5; border: 1px solid #eee; border-radius: 4px; padding: 3mm 4mm; margin-bottom: 5mm; display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; }
  .client-section .label { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .client-section .value { font-size: 11px; font-weight: 700; color: #000; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  table.items thead th { background: #222; color: #fff; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; padding: 2.5mm 2mm; text-align: left; }
  table.items thead th:last-child, table.items thead th.col-qty, table.items thead th.col-price { text-align: right; }
  table.items tbody td { padding: 1.5mm 2mm; font-size: 10px; border-bottom: 1px solid #eee; }
  table.items tbody tr.even { background: #fafafa; }
  table.items tbody tr.odd { background: #fff; }
  table.items tbody td.qty, table.items tbody td.price, table.items tbody td.total { text-align: right; }
  table.items tbody td.total { font-weight: 700; }
  table.items .col-desc { width: 48%; }
  table.items .col-qty { width: 10%; }
  table.items .col-price { width: 20%; }
  table.items .col-total { width: 22%; }
  .finance-wrapper { display: flex; justify-content: flex-end; margin-bottom: 4mm; }
  .finance-box { width: 55%; }
  .finance-row { display: flex; justify-content: space-between; font-size: 10px; padding: 1.5mm 2mm; border-bottom: 1px solid #f5f5f5; }
  .finance-row .value { font-weight: 700; }
  .total-row { display: flex; justify-content: space-between; align-items: center; background: #000; color: #fff; padding: 2.5mm 3mm; border-radius: 4px; margin-top: 2mm; }
  .total-row .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .total-row .value { font-size: 16px; font-weight: 800; }
  .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6mm; padding-top: 3mm; border-top: 1px solid #eee; }
  .footer-section .signature-area { max-height: 30px; filter: grayscale(100%); }
  .footer-section .stamp-area { max-height: 30px; filter: grayscale(100%); }
  .footer-note { text-align: center; font-size: 8px; color: #888; margin-top: 4mm; padding-top: 2mm; }
  @media print { @page { margin: 5mm; } body { padding: 0; max-width: 100%; } }
</style>
</head>
<body>
  ${doc.stampText ? `<div class="watermark">${e(doc.stampText)}</div>` : ''}
  <div class="header">
    <div class="header-left">
      ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ''}
      <div class="company-name">${e(doc.companyName || settings.name || 'Biz-flow')}</div>
      ${e(doc.companyNuit || settings.nuit || '') ? `<div class="company-detail">NUIT: ${e(doc.companyNuit || settings.nuit || '')}</div>` : ''}
      <div class="company-detail">${e(doc.companyAddress || settings.address || '')}</div>
      <div class="company-detail">${e(doc.companyContact || settings.contact || '')}</div>
    </div>
    <div class="header-right">
      <div class="doc-type">${tipo}</div>
      <div class="doc-number">Nº ${e(doc.number)}</div>
      <div class="doc-date">Emissão: ${e(doc.date)}</div>
      ${doc.dueDate ? `<div class="doc-date">Vencimento: ${e(doc.dueDate)}</div>` : ''}
    </div>
  </div>
  <hr class="divider" />
  ${doc.clientName ? `
  <div class="client-section">
    <div><div class="label">Cliente</div><div class="value">${e(doc.clientName)}</div></div>
    ${doc.clientNuit ? `<div><div class="label">NUIT</div><div class="value">${e(doc.clientNuit)}</div></div>` : ''}
    ${doc.clientContact ? `<div><div class="label">Contacto</div><div class="value">${e(doc.clientContact)}</div></div>` : ''}
    ${doc.clientLocation ? `<div><div class="label">Localização</div><div class="value">${e(doc.clientLocation)}</div></div>` : ''}
  </div>` : ''}
  <table class="items">
    <thead>
      <tr><th class="col-desc">Descrição</th><th class="col-qty">Qtd</th><th class="col-price">Preço Unit.</th><th class="col-total">Total</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="finance-wrapper">
    <div class="finance-box">
      <div class="finance-row"><span>Subtotal</span><span class="value">${fM(doc.subtotal)}</span></div>
      ${taxHtml}
      ${discountHtml}
      <div class="total-row"><span class="label">Total ${tipo === 'ORÇAMENTO' ? 'Estimado' : 'a Pagar'}</span><span class="value">${fM(doc.total)}</span></div>
    </div>
  </div>
  ${doc.signatureData || settings.customStamp ? `
  <div class="footer-section">
    ${doc.signatureData ? `<div><div style="font-size:8px;color:#888;margin-bottom:2px">Assinatura</div><img class="signature-area" src="${doc.signatureData}" alt="Assinatura" /></div>` : ''}
    ${settings.customStamp ? `<div><img class="stamp-area" src="${settings.customStamp}" alt="Carimbo" /></div>` : ''}
  </div>` : ''}
  <div class="footer-note">Gerado por Biz-flow.cloud — Documento processado electronicamente</div>
</body>
</html>`;
}

// --- Geração de PDF profissional (Layout Clean & Monocromático) ---
function generatePdfJsPDF(formData: ReceiptData, companySettings: CompanySettings, fMoney: (val: number) => string): { blob: Blob; fileName: string } {
  try {
    const doc = formData;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const tipo = { INVOICE: 'FATURA', RECEIPT: 'RECIBO', INVOICE_RECEIPT: 'FACTURA-RECIBO', QUOTE: 'ORÇAMENTO' }[doc.type] || doc.type;
    const pageW = 185;
    const margin = 12;
    let y = margin;

    const logo = formData.companyLogo || companySettings.logo;
    let headerY = y;
    if (logo) {
      try {
        const cleanLogo = logo.includes('base64,') ? (logo.split('base64,').at(1) ?? logo) : logo;
        pdf.addImage(cleanLogo, 'PNG', margin, y, 30, 12);
        headerY = y + 12;
      } catch {}
    }

    pdf.setFontSize(16); pdf.setTextColor(0, 0, 0); pdf.setFont('Helvetica', 'bold');
    pdf.text(tipo, margin + pageW, y + 4, { align: 'right' });
    pdf.setFontSize(11); pdf.text('Nº ' + doc.number, margin + pageW, y + 9, { align: 'right' });
    pdf.setFontSize(8); pdf.setTextColor(80, 80, 80); pdf.setFont('Helvetica', 'normal');
    pdf.text('Emissão: ' + doc.date, margin + pageW, y + 13, { align: 'right' });
    if (doc.dueDate) pdf.text('Vencimento: ' + doc.dueDate, margin + pageW, y + 17, { align: 'right' });

    y = headerY > margin ? headerY : y + 14;
    pdf.setFontSize(12); pdf.setTextColor(0, 0, 0); pdf.setFont('Helvetica', 'bold');
    pdf.text(doc.companyName || companySettings.name || 'Biz-flow', margin, y); y += 5;
    pdf.setFontSize(8); pdf.setTextColor(80, 80, 80); pdf.setFont('Helvetica', 'normal');
    if (doc.companyNuit || companySettings.nuit) { pdf.text('NUIT: ' + (doc.companyNuit || companySettings.nuit || ''), margin, y); y += 4; }
    if (doc.companyAddress || companySettings.address) { pdf.text(doc.companyAddress || companySettings.address || '', margin, y); y += 4; }
    if (doc.companyContact || companySettings.contact) { pdf.text(doc.companyContact || companySettings.contact || '', margin, y); y += 4; }

    y += 2;
    pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.5); pdf.line(margin, y, margin + pageW, y);
    y += 6;

    if (doc.clientName) {
      pdf.setFillColor(245, 245, 245); pdf.rect(margin, y, pageW, 16, 'F');
      const cliY = y; y += 5;
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('Helvetica', 'bold');
      pdf.text('CLIENTE', margin + 4, y); y += 5;
      pdf.setFontSize(10); pdf.setTextColor(0, 0, 0); pdf.setFont('Helvetica', 'bold');
      pdf.text(doc.clientName, margin + 4, y);
      pdf.setFontSize(8); pdf.setTextColor(80, 80, 80); pdf.setFont('Helvetica', 'normal');
      if (doc.clientNuit) { pdf.text('NUIT: ' + doc.clientNuit, margin + 90, y); }
      y = cliY + 20;
    }

    const colDesc = 90, colQtd = 18, colPreco = 37;
    const tX = margin;

    pdf.setFillColor(30, 30, 30); pdf.rect(tX, y, pageW, 7, 'F');
    pdf.setFontSize(8); pdf.setTextColor(255, 255, 255); pdf.setFont('Helvetica', 'bold');
    pdf.text('Descrição', tX + 2, y + 4.5);
    pdf.text('Qtd', tX + colDesc + colQtd - 2, y + 4.5, { align: 'right' });
    pdf.text('Preço Unit.', tX + colDesc + colQtd + colPreco - 2, y + 4.5, { align: 'right' });
    pdf.text('Total', tX + pageW - 2, y + 4.5, { align: 'right' });
    y += 7;

    pdf.setFontSize(9); pdf.setTextColor(0, 0, 0); pdf.setFont('Helvetica', 'normal');
    let rowCount = 0;
    for (const item of doc.items) {
      if (y > 260) { pdf.addPage(); y = margin; }
      if (rowCount % 2 === 1) { pdf.setFillColor(250, 250, 250); pdf.rect(tX, y, pageW, 6, 'F'); }
      y += 4;
      pdf.text(item.description.substring(0, 55), tX + 2, y);
      pdf.text(String(item.quantity), tX + colDesc + colQtd - 2, y, { align: 'right' });
      pdf.text(fMoney(item.unitPrice), tX + colDesc + colQtd + colPreco - 2, y, { align: 'right' });
      pdf.text(fMoney(item.total), tX + pageW - 2, y, { align: 'right' });
      y += 2; rowCount++;
    }
    y += 2;
    pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3); pdf.line(tX, y, tX + pageW, y); y += 6;

    const finX = 110;
    pdf.setFontSize(9); pdf.setTextColor(80, 80, 80); pdf.setFont('Helvetica', 'normal');
    pdf.text('Subtotal', finX, y); pdf.text(fMoney(doc.subtotal), margin + pageW, y, { align: 'right' }); y += 5;
    if (doc.taxRate > 0) {
      pdf.text('IVA (' + doc.taxRate + '%)', finX, y);
      pdf.text(fMoney(doc.taxAmount), margin + pageW, y, { align: 'right' }); y += 5;
    }
    if (doc.discount > 0) {
      pdf.text('Desconto', finX, y);
      pdf.text('- ' + fMoney(doc.discount), margin + pageW, y, { align: 'right' }); y += 5;
    }
    y += 2;

    pdf.setFillColor(0, 0, 0); pdf.rect(finX, y, margin + pageW - finX, 8, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(9); pdf.text('TOTAL ' + (tipo === 'ORÇAMENTO' ? 'ESTIMADO' : 'A PAGAR'), finX + 2, y + 5.5);
    pdf.setFontSize(12); pdf.text(fMoney(doc.total), margin + pageW - 2, y + 5.5, { align: 'right' });
    pdf.setTextColor(0, 0, 0); y += 12;

    if (doc.stampText) {
      pdf.setTextColor(160, 160, 160);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(32);
      pdf.text(doc.stampText, 105, 140, { align: 'center', angle: -20 });
      pdf.setTextColor(0, 0, 0);
    }

    const footerY = Math.max(y, 250);
    y = footerY;

    if (doc.signatureData) {
      pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.2); pdf.line(margin, y - 2, margin + 40, y - 2);
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('Helvetica', 'bold');
      pdf.text('Assinatura', margin, y + 2);
      try {
        const cleanSig = doc.signatureData.includes('base64,') ? (doc.signatureData.split('base64,').at(1) ?? doc.signatureData) : doc.signatureData;
        pdf.addImage(cleanSig, 'PNG', margin, y + 4, 30, 12);
      } catch {}
    }
    if (companySettings.customStamp) {
      try {
        const cleanStamp = companySettings.customStamp.includes('base64,') ? (companySettings.customStamp.split('base64,').at(1) ?? companySettings.customStamp) : companySettings.customStamp;
        pdf.addImage(cleanStamp, 'PNG', margin + 120, y - 5, 30, 12);
      } catch {}
    }

    pdf.setFontSize(7); pdf.setTextColor(150, 150, 150); pdf.setFont('Helvetica', 'normal');
    pdf.text('Gerado por Biz-flow.cloud — Documento processado electronicamente', 105, 288, { align: 'center' });

    const sanitizedNumber = validators.fileName(formData.number);
    const sanitizedClientName = validators.fileName(formData.clientName);
    const fileName = sanitizedClientName
      ? `${sanitizedNumber}_${sanitizedClientName}.pdf`
      : `${sanitizedNumber}_documento.pdf`;

    return { blob: pdf.output('blob'), fileName };
  } catch (e) {
    console.error('generatePdfJsPDF CRASH:', e);
    throw e;
  }
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
  companySettings,
  notify,
  handleSave,
}: UseDocumentActionsParams) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Helper: formatar dinheiro com i18n
  const fMoney = (val: number) => formatMoney(val, (formData.currency || 'MZN'), (formData.language || 'pt'));

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
      console.log('generatePDFBlob: iniciando...', formData.type, formData.items.length, 'itens');
      const result = generatePdfJsPDF(formData, companySettings, fMoney);
      console.log('generatePDFBlob: sucesso', result.fileName);
      return result;
    } catch (e) {
      console.error('generatePDFBlob FAIL:', e);
      return null;
    }
  }, [formData, companySettings, fMoney]);

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

        // 1.5. Salvar documento no histórico (silencioso)
        await handleSave(true);

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

          // 2. Salvar documento no histórico (silencioso)
          await BLEPrinterService.print(data);
          await handleSave(true);

          notify('Documento enviado para impressão!', 'success');
        } catch (e: any) {
          notify('Erro na impressão: ' + (e?.message || 'Verifique a impressora.'), 'error');
        }
      } else {
        // Web: browser print with professional layout
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          notify('Bloqueador de pop-ups ativo.', 'error');
          setIsPrinting(false);
          return;
        }
        const fM = (val: number) => formatMoney(val, (doc.currency || 'MZN'), (doc.language || 'pt'));
        printWindow.document.write(buildDocumentHtml(formData, companySettings, fM));
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
  }, [isPrinting, formData, companySettings, notify]);

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
