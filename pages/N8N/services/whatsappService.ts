/**
 * WhatsApp Integration Service
 * Envio de mensagens WhatsApp via N8N (Twilio, Evolution API, Baileys)
 */

import { webhookService } from './webhookService';
import { WhatsAppConfig } from '../types/n8n';

class WhatsAppService {
  /**
   * Enviar mensagem WhatsApp simples
   */
  async sendMessage(config: WhatsAppConfig, userId?: string) {
    return webhookService.send(
      'notification.whatsapp',
      {
        phone: config.phone,
        message: config.message,
        mediaUrl: config.mediaUrl,
        type: 'whatsapp',
      },
      userId
    );
  }

  /**
   * Enviar documento (fatura/recibo) via WhatsApp
   */
  async sendDocument(
    phone: string,
    documentNumber: string,
    clientName: string,
    total: number,
    currency: string,
    pdfUrl?: string,
    userId?: string
  ) {
    const message = `🧾 *${documentNumber}*\n\nOlá *${clientName}*,\n\nSegue o seu documento no valor de *${total.toFixed(2)} ${currency}*.\n\nObrigado pela preferência!\n\n_Enviado via BizFlow Cloud_`;

    return this.sendMessage(
      {
        phone,
        message,
        mediaUrl: pdfUrl,
      },
      userId
    );
  }

  /**
   * Enviar lembrete de pagamento via WhatsApp
   */
  async sendPaymentReminder(
    phone: string,
    clientName: string,
    documentNumber: string,
    amount: number,
    currency: string,
    dueDate: string,
    userId?: string
  ) {
    const message = `⏰ *Lembrete de Pagamento*\n\nOlá *${clientName}*,\n\nO documento *${documentNumber}* no valor de *${amount.toFixed(2)} ${currency}* vence em *${dueDate}*.\n\nPor favor, realize o pagamento até a data de vencimento.\n\n_Enviado via BizFlow Cloud_`;

    return this.sendMessage({ phone, message }, userId);
  }

  /**
   * Enviar notificação de pagamento recebido
   */
  async sendPaymentConfirmation(
    phone: string,
    clientName: string,
    amount: number,
    currency: string,
    userId?: string
  ) {
    const message = `✅ *Pagamento Confirmado*\n\nOlá *${clientName}*,\n\nRecebemos o pagamento de *${amount.toFixed(2)} ${currency}* com sucesso!\n\nObrigado pela preferência!\n\n_Enviado via BizFlow Cloud_`;

    return this.sendMessage({ phone, message }, userId);
  }

  /**
   * Enviar mensagem personalizada
   */
  async sendCustomMessage(phone: string, message: string, userId?: string) {
    return this.sendMessage({ phone, message }, userId);
  }
}

export const whatsappService = new WhatsAppService();
