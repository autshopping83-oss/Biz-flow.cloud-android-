/**
 * Email Integration Service
 * Envio de emails via N8N (SendGrid, SMTP, etc.)
 */

import { webhookService } from './webhookService';
import { EmailConfig } from '../types/n8n';

class EmailService {
  /**
   * Enviar email simples
   */
  async sendEmail(config: EmailConfig, userId?: string) {
    return webhookService.send(
      'notification.email',
      {
        to: config.to,
        subject: config.subject,
        body: config.body,
        attachments: config.attachments,
        type: 'email',
      },
      userId
    );
  }

  /**
   * Enviar fatura/recibo por email
   */
  async sendInvoiceEmail(
    to: string,
    documentNumber: string,
    clientName: string,
    pdfBase64: string,
    userId?: string
  ) {
    return this.sendEmail(
      {
        to,
        subject: `Documento ${documentNumber} - BizFlow Cloud`,
        body: `Olá ${clientName},\n\nSegue em anexo o documento ${documentNumber}.\n\nObrigado pela preferência!\n\n---\nBizFlow Cloud`,
        attachments: [{ filename: `${documentNumber}.pdf`, content: pdfBase64 }],
      },
      userId
    );
  }

  /**
   * Enviar email de boas-vindas
   */
  async sendWelcomeEmail(to: string, userName: string, userId?: string) {
    return this.sendEmail(
      {
        to,
        subject: 'Bem-vindo ao BizFlow Cloud! 🚀',
        body: `Olá ${userName},\n\nSeja bem-vindo ao BizFlow Cloud!\n\nEstamos felizes em tê-lo conosco. Comece já a emitir seus documentos fiscais.\n\nAtenciosamente,\nEquipe BizFlow`,
      },
      userId
    );
  }

  /**
   * Enviar relatório por email
   */
  async sendReportEmail(to: string, reportTitle: string, reportHtml: string, userId?: string) {
    return this.sendEmail(
      {
        to,
        subject: `Relatório: ${reportTitle} - BizFlow Cloud`,
        body: reportHtml,
      },
      userId
    );
  }
}

export const emailService = new EmailService();
