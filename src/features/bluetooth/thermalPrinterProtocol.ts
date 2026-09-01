// src/features/bluetooth/thermalPrinterProtocol.ts
// Protocolo ESC/POS para impressoras térmicas 58/80mm

import { getTranslation } from '../../services/translationService';

export class ThermalPrinter {
  private data: number[] = [];

  initialize(): this {
    this.data.push(0x1B, 0x40); // ESC @
    return this;
  }

  text(text: string): this {
    const bytes = new TextEncoder().encode(text);
    this.data.push(...Array.from(bytes));
    this.lineFeed();
    return this;
  }

  lineFeed(n = 1): this {
    for (let i = 0; i < n; i++) {
      this.data.push(0x0A); // LF
    }
    return this;
  }

  bold(enable: boolean): this {
    this.data.push(0x1B, 0x45, enable ? 1 : 0); // ESC E n
    return this;
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    const modes = { left: 0, center: 1, right: 2 };
    this.data.push(0x1B, 0x61, modes[alignment]); // ESC a n
    return this;
  }

  fontSize(width: number, height: number): this {
    const n = ((height - 1) << 4) | (width - 1);
    this.data.push(0x1D, 0x21, n); // GS ! n
    return this;
  }

  underline(thickness: 0 | 1 | 2): this {
    this.data.push(0x1B, 0x2D, thickness); // ESC - n
    return this;
  }

  cut(): this {
    this.data.push(0x1D, 0x56, 0x00); // GS V 0 (cut full)
    return this;
  }

  beep(): this {
    this.data.push(0x1B, 0x42, 0x03, 0x03); // ESC B n t
    return this;
  }

  openDrawer(): this {
    this.data.push(0x1B, 0x70, 0x00, 0x19, 0xFA); // ESC p m t1 t2
    return this;
  }

  barcode(code: string, type: 'CODE128' | 'CODE39' | 'EAN13' = 'CODE128'): this {
    // GS k m n d1...dn
    const types: Record<string, number> = { CODE128: 73, CODE39: 69, EAN13: 67 };
    const m = types[type] ?? 73;
    const bytes = new TextEncoder().encode(code);
    this.data.push(0x1D, 0x6B, m, bytes.length);
    this.data.push(...Array.from(bytes));
    return this;
  }

  qrCode(data: string, size = 4): this {
    // Modelo
    this.data.push(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // Tamanho
    this.data.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);
    // Dados
    const bytes = new TextEncoder().encode(data);
    const pL = (bytes.length + 3) & 0xFF;
    const pH = ((bytes.length + 3) >> 8) & 0xFF;
    this.data.push(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
    this.data.push(...Array.from(bytes));
    // Print
    this.data.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  /**
   * Cria um separador visual (linha de traços)
   */
  separator(char = '-'): this {
    this.text(char.repeat(32));
    return this;
  }

  /**
   * Retorna os dados no formato Uint8Array para enviar ao BLE
   */
  getData(): Uint8Array {
    return new Uint8Array(this.data);
  }

  /**
   * Gera o conteúdo de uma impressão de documento fiscal
   */
  buildDocument(content: {
    companyName: string;
    companyNuit?: string;
    documentType: string;
    documentNumber: string;
    date: string;
    clientName?: string;
    clientNuit?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    currency?: string;
    lang?: string;
    stampText?: string;
  }): this {
    const lang = content.lang || '';
    const t = (k: string) => getTranslation(lang, k);
    const curr = content.currency || '';
    const fmt = (v: number) => (curr ? `${v.toLocaleString()} ${curr}` : v.toLocaleString());

    this.initialize()
      .align('center')
      .fontSize(2, 2)
      .bold(true)
      .text(content.companyName)
      .fontSize(1, 1)
      .bold(false);

    if (content.companyNuit) {
      this.text(`${t('taxId')}: ${content.companyNuit}`);
    }

    this.separator()
      .fontSize(2, 2)
      .bold(true)
      .text(content.documentType)
      .fontSize(1, 1)
      .bold(false)
      .text(`${t('reference')} ${content.documentNumber}`)
      .text(`${t('date')}: ${content.date}`);

    if (content.clientName) {
      this.separator()
        .bold(true).text(`${t('clientLabel')}:`).bold(false)
        .text(content.clientName);
      if (content.clientNuit) {
        this.text(`${t('taxId')}: ${content.clientNuit}`);
      }
    }

    this.separator()
      .align('left')
      .bold(true)
      .text(`${t('description')}          ${t('qty')}  ${t('unitPrice')}   ${t('total')}`)
      .bold(false);

    for (const item of content.items) {
      this.text(
        `${item.description.substring(0, 20).padEnd(20)} ${String(item.quantity).padStart(3)} ${fmt(item.unitPrice).padStart(7)} ${fmt(item.total).padStart(8)}`
      );
    }

    this.separator()
      .align('right')
      .text(`${t('subtotalLabel')}: ${fmt(content.subtotal)}`);

    if (content.taxRate > 0) {
      this.text(`${t('vat')} (${content.taxRate}%): ${fmt(content.taxAmount)}`);
    }

    if (content.discount > 0) {
      this.text(`${t('discount')}: -${fmt(content.discount)}`);
    }

    this.fontSize(2, 2)
      .bold(true)
      .text(`${t('grandTotal')}: ${fmt(content.total)}`)
      .fontSize(1, 1)
      .bold(false);

    if (content.stampText) {
      this.separator()
        .align('center')
        .fontSize(2, 2)
        .text(content.stampText)
        .fontSize(1, 1);
    }

    this.separator()
      .align('center')
      .text(t('generatedBy'))
      .lineFeed(3)
      .cut();

    return this;
  }
}
