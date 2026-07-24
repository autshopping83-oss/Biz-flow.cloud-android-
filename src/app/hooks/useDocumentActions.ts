import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import { validators } from '../../utils/validators';
import { ReceiptData, CompanySettings } from '../../types';

// Escape HTML entities para prevenir XSS em document.write
function escapeHtml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// --- Template HTML/CSS Profissional para Impressão de Documentos ---
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
  /* === RESET & BASE === */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    padding: 10mm 12mm;
    max-width: 210mm;
    margin: 0 auto;
    background: #fff;
    position: relative;
  }

  /* === WATERMARK === */
  ${doc.stampText ? `
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-20deg);
    font-size: 48px;
    font-weight: 900;
    color: rgba(220, 38, 38, 0.12);
    pointer-events: none;
    z-index: 999;
    letter-spacing: 8px;
    text-transform: uppercase;
    white-space: nowrap;
  }` : ''}

  /* === HEADER === */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6mm;
    gap: 4mm;
  }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 60px; margin-bottom: 4px; }
  .header-left .company-name { font-size: 16px; font-weight: 700; color: #0f172a; }
  .header-left .company-detail { font-size: 9px; color: #64748b; margin-top: 1px; }
  .header-right { text-align: right; flex-shrink: 0; }
  .header-right .doc-type {
    font-size: 18px; font-weight: 800; color: #2563eb;
    letter-spacing: 2px; text-transform: uppercase;
  }
  .header-right .doc-number { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .header-right .doc-date { font-size: 9px; color: #64748b; margin-top: 2px; }

  /* === DIVIDER === */
  .divider {
    border: none;
    height: 2px;
    background: linear-gradient(to right, #2563eb, transparent);
    margin-bottom: 5mm;
  }

  /* === CLIENT SECTION === */
  .client-section {
    background: #f8fafc;
    border-radius: 4px;
    padding: 3mm 4mm;
    margin-bottom: 5mm;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2mm 4mm;
  }
  .client-section .label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
  .client-section .value { font-size: 11px; font-weight: 600; color: #0f172a; }

  /* === ITEMS TABLE === */
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  table.items thead th {
    background: #1e293b;
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 2.5mm 2mm;
    text-align: left;
  }
  table.items thead th:last-child { text-align: right; }
  table.items thead th:nth-child(2),
  table.items thead th:nth-child(3) { text-align: center; }
  table.items tbody td {
    padding: 1.5mm 2mm;
    font-size: 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  table.items tbody tr.even { background: #f8fafc; }
  table.items tbody tr.odd { background: #fff; }
  table.items tbody td.desc { max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  table.items tbody td.qty { text-align: center; }
  table.items tbody td.price { text-align: center; }
  table.items tbody td.total { text-align: right; font-weight: 600; }

  /* === COLUMN WIDTHS === */
  table.items .col-desc { width: 48%; }
  table.items .col-qty { width: 10%; }
  table.items .col-price { width: 20%; }
  table.items .col-total { width: 22%; }

  /* === FINANCIAL SUMMARY === */
  .finance-wrapper { display: flex; justify-content: flex-end; margin-bottom: 4mm; }
  .finance-box { width: 55%; }
  .finance-row {
    display: flex; justify-content: space-between;
    font-size: 10px; padding: 1.5mm 2mm;
    border-bottom: 1px solid #f1f5f9;
  }
  .finance-row .value { font-weight: 600; }
  .total-row {
    display: flex; justify-content: space-between; align-items: center;
    background: #2563eb; color: #fff;
    padding: 2.5mm 3mm;
    border-radius: 4px;
    margin-top: 2mm;
  }
  .total-row .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .total-row .value { font-size: 16px; font-weight: 800; }

  /* === SIGNATURE & STAMP === */
  .footer-section {
    display: flex; justify-content: space-between; align-items: flex-end;
    margin-top: 6mm; padding-top: 3mm;
    border-top: 1px solid #e2e8f0;
  }
  .footer-section .signature-area { max-height: 30px; }
  .footer-section .stamp-area { max-height: 30px; }
  .footer-note {
    text-align: center; font-size: 8px; color: #94a3b8;
    margin-top: 4mm; padding-top: 2mm;
    border-top: 1px solid #f1f5f9;
  }

  /* === RESPONSIVIDADE: THERMAL 58/80mm === */
  @media print {
    @page { margin: 5mm; }
    body { padding: 0; max-width: 100%; }
    .watermark { display: block; }
  }

  @media print and (max-width: 80mm) {
    body { font-size: 8px; padding: 2mm; }
    .header { flex-direction: column; gap: 1mm; }
    .header-right { text-align: left; }
    .header-left .company-name { font-size: 12px; }
    .header-left .logo { max-height: 30px; }
    .header-right .doc-type { font-size: 13px; }
    .client-section { grid-template-columns: 1fr; padding: 2mm; gap: 1mm; }
    table.items thead th { font-size: 7px; padding: 1.5mm 1mm; }
    table.items tbody td { font-size: 7px; padding: 1mm; }
    .finance-box { width: 100%; }
    .total-row .value { font-size: 12px; }
    .watermark { font-size: 24px; }
    .footer-section { flex-direction: column; gap: 2mm; }
  }

  @media print and (max-width: 58mm) {
    body { font-size: 7px; padding: 1.5mm; }
    .header-left .company-name { font-size: 10px; }
    .header-right .doc-type { font-size: 11px; }
    table.items thead th { font-size: 6px; padding: 1mm 0.5mm; letter-spacing: 0; }
    table.items tbody td { font-size: 6px; padding: 0.8mm 0.5mm; }
    .total-row { padding: 1.5mm 2mm; }
    .total-row .value { font-size: 10px; }
    .watermark { font-size: 18px; letter-spacing: 4px; }
  }
</style>
</head>
<body>

  ${doc.stampText ? `<div class="watermark">${e(doc.stampText)}</div>` : ''}

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ''}
      <div class="company-name">${e(doc.companyName || settings.name || 'Biz-flow')}</div>
      <div class="company-detail">${e(doc.companyNuit || settings.nuit || '') ? `NUIT: ${e(doc.companyNuit || settings.nuit || '')}` : ''}</div>
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

  <!-- CLIENTE -->
  ${doc.clientName ? `
  <div class="client-section">
    <div>
      <div class="label">Cliente</div>
      <div class="value">${e(doc.clientName)}</div>
    </div>
    ${doc.clientNuit ? `<div><div class="label">NUIT</div><div class="value">${e(doc.clientNuit)}</div></div>` : ''}
    ${doc.clientContact ? `<div><div class="label">Contacto</div><div class="value">${e(doc.clientContact)}</div></div>` : ''}
    ${doc.clientLocation ? `<div><div class="label">Localização</div><div class="value">${e(doc.clientLocation)}</div></div>` : ''}
  </div>` : ''}

  <!-- TABELA DE ITENS -->
  <table class="items">
    <thead>
      <tr>
        <th class="col-desc">Descrição</th>
        <th class="col-qty">Qtd</th>
        <th class="col-price">Preço Unit.</th>
        <th class="col-total">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <!-- RESUMO FINANCEIRO -->
  <div class="finance-wrapper">
    <div class="finance-box">
      <div class="finance-row">
        <span>Subtotal</span>
        <span class="value">${fM(doc.subtotal)}</span>
      </div>
      ${taxHtml}
      ${discountHtml}
      <div class="total-row">
        <span class="label">Total ${tipo === 'ORÇAMENTO' ? 'Estimado' : 'a Pagar'}</span>
        <span class="value">${fM(doc.total)}</span>
      </div>
    </div>
  </div>

  <!-- ASSINATURA / CARIMBO -->
  ${doc.signatureData || settings.customStamp ? `
  <div class="footer-section">
    ${doc.signatureData ? `<div><div style="font-size:8px;color:#94a3b8;margin-bottom:2px">Assinatura</div><img class="signature-area" src="${doc.signatureData}" alt="Assinatura" /></div>` : ''}
    ${settings.customStamp ? `<div><img class="stamp-area" src="${settings.customStamp}" alt="Carimbo" /></div>` : ''}
  </div>` : ''}

  <!-- RODAPÉ -->
  <div class="footer-note">
    Gerado por Biz-flow.cloud — Documento processado electronicamente
  </div>

</body>
</html>`;
}

interface UseDocumentActionsParams {
  formData: ReceiptData;
  companySettings: CompanySettings;
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
  handleSave: (silent?: boolean) => Promise<void>;
}

const isCapacitor = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

// --- Geração de PDF profissional via jsPDF (layout igual ao template HTML) ---
function generatePdfJsPDF(formData: ReceiptData, companySettings: CompanySettings, fMoney: (val: number) => string): { blob: Blob; fileName: string } {
  const doc = formData;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const tipo = { INVOICE: 'FATURA', RECEIPT: 'RECIBO', INVOICE_RECEIPT: 'FACTURA-RECIBO', QUOTE: 'ORÇAMENTO' }[doc.type] || doc.type;
  const pageW = 190; // largura util A4 (210 - 10*2 margens)
  const margin = 15;
  let y = margin;

  // === HELPERS ===
  const sectionLine = () => { pdf.setDrawColor(37, 99, 235); pdf.setLineWidth(0.5); pdf.line(margin, y, margin + pageW, y); y += 3; };
  const space = (mm: number) => { y += mm; };

  // === LOGO ===
  const logo = formData.companyLogo || companySettings.logo;
  if (logo) {
    try {
      const cleanLogo = logo.includes('base64,') ? logo.split('base64,')[1]! : logo;
      pdf.addImage(cleanLogo, 'PNG', margin, y, 35, 14);
    } catch {}
  }
  // Lado direito: tipo documento
  pdf.setFontSize(16); pdf.setTextColor(37, 99, 235); pdf.setFont('Helvetica', 'bold');
  pdf.text(tipo, margin + pageW, y + 5, { align: 'right' });
  pdf.setFontSize(11); pdf.setTextColor(15, 23, 42); pdf.setFont('Helvetica', 'bold');
  pdf.text('Nº ' + doc.number, margin + pageW, y + 10, { align: 'right' });
  pdf.setFontSize(8); pdf.setTextColor(100, 116, 139); pdf.setFont('Helvetica', 'normal');
  pdf.text('Emissão: ' + doc.date, margin + pageW, y + 14, { align: 'right' });
  if (doc.dueDate) pdf.text('Vencimento: ' + doc.dueDate, margin + pageW, y + 17, { align: 'right' });
  y += 18;

  // Nome empresa (esquerda, abaixo do logo)
  pdf.setFontSize(13); pdf.setTextColor(15, 23, 42); pdf.setFont('Helvetica', 'bold');
  pdf.text(doc.companyName || companySettings.name || 'Biz-flow', margin, y); y += 5;
  pdf.setFontSize(8); pdf.setTextColor(100, 116, 139); pdf.setFont('Helvetica', 'normal');
  if (doc.companyAddress || companySettings.address) { pdf.text(doc.companyAddress || companySettings.address || '', margin, y); y += 4; }
  if (doc.companyNuit || companySettings.nuit) { pdf.text('NUIT: ' + (doc.companyNuit || companySettings.nuit || ''), margin, y); y += 4; }
  if (doc.companyContact || companySettings.contact) { pdf.text(doc.companyContact || companySettings.contact || '', margin, y); y += 4; }
  y += 2;

  // Separador azul gradiente (simulado com linha grossa)
  pdf.setDrawColor(37, 99, 235); pdf.setLineWidth(0.8); pdf.line(margin, y, margin + pageW, y);
  y += 4;

  // === CLIENTE (caixa cinza) ===
  if (doc.clientName) {
    const cliY = y;
    pdf.setFillColor(248, 250, 252); pdf.rect(margin, y, pageW, 20, 'F');
    y += 2;
    pdf.setFontSize(7); pdf.setTextColor(148, 163, 184); pdf.setFont('Helvetica', 'bold');
    pdf.text('CLIENTE', margin + 3, y); y += 4;
    pdf.setFontSize(10); pdf.setTextColor(15, 23, 42); pdf.setFont('Helvetica', 'bold');
    pdf.text(doc.clientName, margin + 3, y); y += 5;
    pdf.setFontSize(8); pdf.setTextColor(100, 116, 139); pdf.setFont('Helvetica', 'normal');
    if (doc.clientNuit) { pdf.text('NUIT: ' + doc.clientNuit, margin + 3, y); }
    if (doc.clientContact) { pdf.text('Contato: ' + doc.clientContact, margin + 80, y); }
    y += 4;
    if (doc.clientLocation) { pdf.text('Local: ' + doc.clientLocation, margin + 3, y); }
    y = cliY + 22;
  }
  space(2);

  // === TABELA DE ITENS ===
  const colDesc = 90, colQtd = 20, colPreco = 33, colTotal = 37;
  const tX = margin;
  const headerY = y;

  pdf.setFillColor(30, 41, 59); pdf.rect(tX, headerY, pageW, 7, 'F');
  pdf.setFontSize(7); pdf.setTextColor(255, 255, 255); pdf.setFont('Helvetica', 'bold');
  pdf.text('Descrição', tX + 2, headerY + 5);
  pdf.text('Qtd', tX + colDesc + 2, headerY + 5);
  pdf.text('Preço Unit.', tX + colDesc + colQtd + 2, headerY + 5);
  pdf.text('Total', tX + colDesc + colQtd + colPreco + 2, headerY + 5);
  y = headerY + 9;

  pdf.setFontSize(8); pdf.setTextColor(30, 41, 59); pdf.setFont('Helvetica', 'normal');
  let rowCount = 0;
  for (const item of doc.items) {
    if (y > 270) { pdf.addPage(); y = margin; }
    const rowBg = rowCount % 2 === 0 ? 255 : 250;
    pdf.setFillColor(rowBg, rowBg, rowBg + 2);
    pdf.rect(tX, y - 2, pageW, 6, 'F');
    pdf.text(item.description.substring(0, 55), tX + 2, y);
    pdf.text(String(item.quantity), tX + colDesc + 2, y);
    pdf.text(fMoney(item.unitPrice), tX + colDesc + colQtd + 2, y);
    pdf.text(fMoney(item.total), tX + colDesc + colQtd + colPreco + 2, y);
    y += 5; rowCount++;
  }
  y += 2;
  pdf.setDrawColor(226, 232, 240); pdf.line(tX, y, tX + pageW, y); y += 5;

  // === RESUMO FINANCEIRO (alinhado à direita) ===
  const finX = 95; // inicio da secao financeira (55% de 190 = ~105)
  pdf.setFontSize(9); pdf.setTextColor(71, 85, 105); pdf.setFont('Helvetica', 'normal');
  pdf.text('Subtotal', finX, y); pdf.text(fMoney(doc.subtotal), margin + pageW, y, { align: 'right' }); y += 5;
  if (doc.taxRate > 0) {
    pdf.text('IVA (' + doc.taxRate + '%)', finX, y);
    pdf.text(fMoney(doc.taxAmount), margin + pageW, y, { align: 'right' }); y += 5;
  }
  if (doc.discount > 0) {
    pdf.text('Desconto', finX, y);
    pdf.text('- ' + fMoney(doc.discount), margin + pageW, y, { align: 'right' }); y += 5;
  }
  y += 1;
  // Caixa azul do total
  pdf.setFillColor(37, 99, 235); pdf.rect(finX, y - 1, margin + pageW - finX, 7, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(9); pdf.text('Total ' + (tipo === 'ORÇAMENTO' ? 'Estimado' : 'a Pagar'), finX + 2, y + 4);
  pdf.setFontSize(12); pdf.text(fMoney(doc.total), margin + pageW, y + 4, { align: 'right' });
  pdf.setTextColor(0); y += 10;

  // === WATERMARK (selo) ===
  if (doc.stampText) {
    pdf.setTextColor(220, 38, 38);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.text(doc.stampText, 105, 130, { align: 'center', angle: -20 });
    pdf.setTextColor(0);
  }

  // === ASSINATURA ===
  if (doc.signatureData) {
    y = Math.max(y, 235);
    pdf.setFontSize(7); pdf.setTextColor(148, 163, 184); pdf.setFont('Helvetica', 'bold');
    pdf.text('Assinatura', margin, y); y += 3;
    try {
      const cleanSig = doc.signatureData.includes('base64,') ? doc.signatureData.split('base64,')[1]! : doc.signatureData;
      pdf.addImage(cleanSig, 'PNG', margin, y, 30, 12);
      y += 14;
    } catch {}
  }

  // === CARIMBO ===
  if (companySettings.customStamp) {
    try {
      const cleanStamp = companySettings.customStamp.includes('base64,') ? companySettings.customStamp.split('base64,')[1]! : companySettings.customStamp;
      pdf.addImage(cleanStamp, 'PNG', margin + 120, Math.max(y, 230), 30, 12);
    } catch {}
  }

  // === RODAPÉ ===
  pdf.setFontSize(7); pdf.setTextColor(148, 163, 184); pdf.setFont('Helvetica', 'normal');
  pdf.text('Gerado por Biz-flow.cloud — Documento processado electronicamente', 105, 288, { align: 'center' });
  pdf.text('Página 1/' + pdf.getNumberOfPages(), margin + pageW, 288, { align: 'right' });

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
  companySettings,
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
      return generatePdfJsPDF(formData, companySettings, fMoney);
    } catch (e) {
      console.error('jsPDF generation error:', e);
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
        // Web: browser print with professional layout
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          notify('Bloqueador de pop-ups ativo.', 'error');
          setIsPrinting(false);
          return;
        }
        const fM = (val: number) => `${val.toLocaleString()} ${doc.currency || 'MT'}`;
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
