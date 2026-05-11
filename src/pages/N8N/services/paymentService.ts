/**
 * Payment Integration Service
 * Notificações e ações relacionadas a pagamentos via N8N
 */

import { webhookService } from './webhookService';
import { PaymentNotification } from '../types/n8n';

class PaymentService {
  /**
   * Notificar pagamento recebido
   */
  async notifyReceived(payment: PaymentNotification, userId?: string) {
    return webhookService.send(
      'payment.received',
      {
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        payerName: payment.payerName,
        method: payment.method,
        status: payment.status,
        date: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Notificar solicitação de pagamento
   */
  async notifyRequested(
    paymentId: string,
    amount: number,
    currency: string,
    payerName: string,
    dueDate: string,
    userId?: string
  ) {
    return webhookService.send(
      'payment.requested',
      {
        paymentId,
        amount,
        currency,
        payerName,
        dueDate,
        requestedAt: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Notificar pagamento aprovado
   */
  async notifyApproved(payment: PaymentNotification, userId?: string) {
    return this.notifyReceived(
      { ...payment, status: 'approved' },
      userId
    );
  }

  /**
   * Notificar pagamento rejeitado
   */
  async notifyRejected(
    paymentId: string,
    amount: number,
    currency: string,
    payerName: string,
    reason: string,
    userId?: string
  ) {
    return webhookService.send(
      'payment.requested',
      {
        paymentId,
        amount,
        currency,
        payerName,
        status: 'rejected',
        reason,
        rejectedAt: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Sincronizar pagamentos com sistema contábil
   */
  async syncWithAccounting(
    payment: PaymentNotification,
    accountingSystem: string,
    userId?: string
  ) {
    return webhookService.send(
      'sync.completed',
      {
        system: accountingSystem,
        action: 'sync_payment',
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        payerName: payment.payerName,
        method: payment.method,
        status: payment.status,
        syncedAt: new Date().toISOString(),
      },
      userId
    );
  }
}

export const paymentService = new PaymentService();
