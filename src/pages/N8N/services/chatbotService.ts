/**
 * Chatbot Integration Service
 * Integração com chatbots via N8N (Telegram, Messenger, Slack, Discord)
 */

import { webhookService } from './webhookService';
import { ChatbotConfig } from '../types/n8n';

class ChatbotService {
  /**
   * Enviar mensagem para chatbot
   */
  async sendMessage(config: ChatbotConfig, userId?: string) {
    return webhookService.send(
      'notification.chatbot',
      {
        platform: config.platform,
        recipientId: config.recipientId,
        message: config.message,
        type: 'chatbot',
      },
      userId
    );
  }

  /**
   * Enviar notificação de novo documento via chatbot
   */
  async notifyNewDocument(
    platform: ChatbotConfig['platform'],
    recipientId: string,
    documentNumber: string,
    clientName: string,
    total: number,
    currency: string,
    userId?: string
  ) {
    const message = `📄 *Novo Documento*\n\n*Número:* ${documentNumber}\n*Cliente:* ${clientName}\n*Valor:* ${total.toFixed(2)} ${currency}\n\nDocumento gerado com sucesso no BizFlow Cloud!`;

    return this.sendMessage({ platform, recipientId, message }, userId);
  }

  /**
   * Enviar alerta de pagamento via chatbot
   */
  async sendPaymentAlert(
    platform: ChatbotConfig['platform'],
    recipientId: string,
    amount: number,
    currency: string,
    payerName: string,
    userId?: string
  ) {
    const message = `💰 *Pagamento Recebido*\n\n*Valor:* ${amount.toFixed(2)} ${currency}\n*Pagador:* ${payerName}\n\nPagamento processado com sucesso no BizFlow Cloud!`;

    return this.sendMessage({ platform, recipientId, message }, userId);
  }

  /**
   * Enviar relatório diário via chatbot
   */
  async sendDailyReport(
    platform: ChatbotConfig['platform'],
    recipientId: string,
    report: {
      totalDocuments: number;
      totalRevenue: number;
      currency: string;
      date: string;
    },
    userId?: string
  ) {
    const message = `📊 *Relatório Diário - ${report.date}*\n\n📄 Documentos: ${report.totalDocuments}\n💰 Receita: ${report.totalRevenue.toFixed(2)} ${report.currency}\n\n_Acompanhe mais detalhes no BizFlow Cloud!_`;

    return this.sendMessage({ platform, recipientId, message }, userId);
  }

  /**
   * Enviar mensagem personalizada
   */
  async sendCustomMessage(
    platform: ChatbotConfig['platform'],
    recipientId: string,
    message: string,
    userId?: string
  ) {
    return this.sendMessage({ platform, recipientId, message }, userId);
  }
}

export const chatbotService = new ChatbotService();
