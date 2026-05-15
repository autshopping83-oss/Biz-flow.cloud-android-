/**
 * Webhook Service Base
 * Serviço base para todas as integrações N8N
 */

import { N8nWebhookPayload, N8nWebhookResponse, WebhookEventType } from '../types/n8n';

const N8N_WEBHOOK_URL = 'https://n8nwebhook.maneger.eliclik.online/webhook/714e3c9d-293d-4041-8468-634d536c4bf8';

class WebhookService {
  private webhookUrl: string;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    this.webhookUrl = N8N_WEBHOOK_URL;
    this.timeout = 15000;
    this.retryAttempts = 3;
  }

  setWebhookUrl(url: string) {
    this.webhookUrl = url;
  }

  getWebhookUrl(): string {
    return this.webhookUrl;
  }

  async send(
    event: WebhookEventType,
    data: Record<string, unknown>,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<N8nWebhookResponse> {
    const payload: N8nWebhookPayload = {
      event,
      timestamp: Date.now(),
      userId,
      data,
      metadata: {
        source: 'biz-flowcloud',
        version: '1.0.0',
        platform: typeof window !== 'undefined' ? navigator.userAgent || 'web' : 'server',
        ...metadata,
      },
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
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn(`[Webhook] Tentativa ${attempt}/${this.retryAttempts} - Timeout`);
        } else {
          console.warn(`[Webhook] Tentativa ${attempt}/${this.retryAttempts} - Erro:`, error instanceof Error ? error.message : error);
        }

        if (attempt < this.retryAttempts) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Falha ao enviar webhook após múltiplas tentativas',
    };
  }

  async testConnection(): Promise<N8nWebhookResponse> {
    return this.send('test.connection', {
      test: true,
      message: 'Teste de conexão do BizFlow Cloud',
      appName: 'BizFlow Cloud',
      timestamp: new Date().toISOString(),
    });
  }
}

export const webhookService = new WebhookService();
