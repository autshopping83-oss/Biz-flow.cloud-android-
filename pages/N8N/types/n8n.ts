/**
 * Tipos específicos para integrações N8N
 */

export type N8nIntegrationType = 
  | 'email'
  | 'whatsapp'
  | 'chatbot'
  | 'documents'
  | 'payments'
  | 'crm'
  | 'erp'
  | 'custom';

export type N8nIntegrationStatus = 'connected' | 'disconnected' | 'error' | 'testing';

export interface N8nIntegration {
  id: N8nIntegrationType;
  name: string;
  description: string;
  icon: string;
  status: N8nIntegrationStatus;
  configurable: boolean;
  docsUrl?: string;
}

export interface N8nWebhookPayload {
  event: string;
  timestamp: number;
  userId?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export type WebhookEventType = 
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'document.shared'
  | 'user.registered'
  | 'user.login'
  | 'payment.received'
  | 'payment.requested'
  | 'test.connection'
  | 'notification.email'
  | 'notification.whatsapp'
  | 'notification.chatbot'
  | 'sync.completed'
  | 'error.occurred';

export interface EmailConfig {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface WhatsAppConfig {
  phone: string;
  message: string;
  mediaUrl?: string;
}

export interface ChatbotConfig {
  platform: 'telegram' | 'messenger' | 'slack' | 'discord' | 'whatsapp';
  recipientId: string;
  message: string;
}

export interface DocumentNotification {
  documentId: string;
  documentNumber: string;
  documentType: string;
  clientName: string;
  total: number;
  currency: string;
  pdfUrl?: string;
}

export interface PaymentNotification {
  paymentId: string;
  amount: number;
  currency: string;
  payerName: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
}
