/**
 * N8N Webhook Service
 * 
 * Serviço para integrar o aplicativo com o n8n via webhooks.
 * Permite conectar serviços externos como:
 * - Email (SendGrid, SMTP)
 * - WhatsApp (Twilio, Baileys, Evolution API)
 * - Chatbot (Telegram, Messenger)
 * - CRM, ERP, e outras ferramentas
 * 
 * Webhook URL: https://n8nwebhook.maneger.eliclik.online/webhook/714e3c9d-293d-4041-8468-634d536c4bf8
 */

const N8N_WEBHOOK_URL = 'https://n8nwebhook.maneger.eliclik.online/webhook/714e3c9d-293d-4041-8468-634d536c4bf8';

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

class N8nWebhookService {
  private webhookUrl: string;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    this.webhookUrl = N8N_WEBHOOK_URL;
    this.timeout = 15000; // 15 seconds
    this.retryAttempts = 3;
  }

  /**
   * Configurar URL do webhook (para testes ou override)
   */
  setWebhookUrl(url: string) {
    this.webhookUrl = url;
  }

  /**
   * Enviar payload para o webhook do n8n
   */
  async send(event: WebhookEventType, data: Record<string, any>, userId?: string, metadata?: Record<string, any>): Promise<N8nWebhookResponse> {
    const payload: N8nWebhookPayload = {
      event,
      timestamp: Date.now(),
      userId,
      data,
      metadata: {
        source: 'biz-flowcloud',
        version: '1.0.0',
        platform: typeof window !== 'undefined' ? (window.navigator as any)?.userAgent || 'web' : 'server',
        ...metadata
      }
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Source': 'biz-flowcloud',
            'X-Event-Type': event,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json().catch(() => ({ success: true }));
        
        return {
          success: true,
          message: `Evento "${event}" enviado com sucesso`,
          data: result,
        };

      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          console.warn(`[N8nWebhook] Tentativa ${attempt}/${this.retryAttempts} - Timeout`);
        } else {
          console.warn(`[N8nWebhook] Tentativa ${attempt}/${this.retryAttempts} - Erro:`, error.message);
        }

        if (attempt < this.retryAttempts) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Falha ao enviar webhook após múltiplas tentativas',
    };
  }

  /**
   * Enviar notificação por email via n8n
   */
  async sendEmail(to: string, subject: string, body: string, userId?: string) {
    return this.send('notification.email', {
      to,
      subject,
      body,
      type: 'email',
    }, userId);
  }

  /**
   * Enviar notificação WhatsApp via n8n
   */
  async sendWhatsApp(phone: string, message: string, userId?: string) {
    return this.send('notification.whatsapp', {
      phone,
      message,
      type: 'whatsapp',
    }, userId);
  }

  /**
   * Enviar mensagem para chatbot via n8n
   */
  async sendChatbotMessage(platform: string, recipientId: string, message: string, userId?: string) {
    return this.send('notification.chatbot', {
      platform, // 'telegram', 'messenger', 'slack', 'discord'
      recipientId,
      message,
      type: 'chatbot',
    }, userId);
  }

  /**
   * Notificar criação de documento
   */
  async notifyDocumentCreated(document: any, userId?: string) {
    return this.send('document.created', {
      documentId: document.id,
      documentNumber: document.number,
      documentType: document.type,
      clientName: document.clientName,
      total: document.total,
      currency: document.currency,
      date: document.date,
    }, userId);
  }

  /**
   * Notificar pagamento recebido
   */
  async notifyPaymentReceived(payment: any, userId?: string) {
    return this.send('payment.received', {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      payerName: payment.payerName,
      method: payment.method,
      date: new Date().toISOString(),
    }, userId);
  }

  /**
   * Testar conexão com o webhook
   */
  async testConnection(): Promise<N8nWebhookResponse> {
    return this.send('test.connection', {
      test: true,
      message: 'Teste de conexão do BizFlow Cloud',
      appName: 'BizFlow Cloud',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Enviar documento compartilhado via WhatsApp/Email
   */
  async shareDocument(document: any, method: 'whatsapp' | 'email', recipient: string, userId?: string) {
    const eventType = method === 'whatsapp' ? 'notification.whatsapp' : 'notification.email';
    
    return this.send(eventType, {
      method,
      recipient,
      documentId: document.id,
      documentNumber: document.number,
      documentType: document.type,
      clientName: document.clientName,
      total: document.total,
      currency: document.currency,
      pdfUrl: document.pdfUrl,
      shareLink: `${window.location.origin}/shared/${document.id}`,
    }, userId);
  }
}

export const n8nWebhookService = new N8nWebhookService();
