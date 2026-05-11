/**
 * Document Integration Service
 * Notificações e ações relacionadas a documentos via N8N
 */

import { webhookService } from './webhookService';
import { DocumentNotification } from '../types/n8n';

class DocumentService {
  /**
   * Notificar criação de documento
   */
  async notifyCreated(document: DocumentNotification, userId?: string) {
    return webhookService.send(
      'document.created',
      {
        documentId: document.documentId,
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        clientName: document.clientName,
        total: document.total,
        currency: document.currency,
        date: new Date().toISOString().split('T')[0],
      },
      userId
    );
  }

  /**
   * Notificar atualização de documento
   */
  async notifyUpdated(document: DocumentNotification, userId?: string) {
    return webhookService.send(
      'document.updated',
      {
        documentId: document.documentId,
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        clientName: document.clientName,
        total: document.total,
        currency: document.currency,
        updatedAt: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Notificar exclusão de documento
   */
  async notifyDeleted(documentId: string, documentNumber: string, userId?: string) {
    return webhookService.send(
      'document.deleted',
      {
        documentId,
        documentNumber,
        deletedAt: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Notificar documento compartilhado
   */
  async notifyShared(
    document: DocumentNotification,
    method: 'whatsapp' | 'email',
    recipient: string,
    userId?: string
  ) {
    return webhookService.send(
      'document.shared',
      {
        method,
        recipient,
        documentId: document.documentId,
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        clientName: document.clientName,
        total: document.total,
        currency: document.currency,
        pdfUrl: document.pdfUrl,
        shareLink: typeof window !== 'undefined' 
          ? `${window.location.origin}/shared/${document.documentId}`
          : undefined,
      },
      userId
    );
  }

  /**
   * Sincronizar documentos com sistema externo (CRM/ERP)
   */
  async syncWithExternal(document: DocumentNotification, system: string, userId?: string) {
    return webhookService.send(
      'sync.completed',
      {
        system,
        action: 'sync',
        documentId: document.documentId,
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        total: document.total,
        currency: document.currency,
        syncedAt: new Date().toISOString(),
      },
      userId
    );
  }
}

export const documentService = new DocumentService();
