/**
 * Hook personalizado para integrações N8N
 * Gerencia estado, loading e erros das integrações
 */

import { useState, useCallback } from 'react';
import { N8nWebhookResponse, N8nIntegrationStatus, WebhookEventType } from '../types/n8n';
import { webhookService } from '../services/webhookService';

interface UseN8nWebhookReturn {
  isTesting: boolean;
  lastResult: N8nWebhookResponse | null;
  integrationStatus: Record<string, N8nIntegrationStatus>;
  testConnection: () => Promise<void>;
  sendEvent: (event: string, data: Record<string, unknown>) => Promise<N8nWebhookResponse | null>;
  setIntegrationStatus: (id: string, status: N8nIntegrationStatus) => void;
  resetResult: () => void;
}

export const useN8nWebhook = (userId?: string): UseN8nWebhookReturn => {
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<N8nWebhookResponse | null>(null);
  const [integrationStatus, setIntegrationStatusState] = useState<Record<string, N8nIntegrationStatus>>({});

  const setIntegrationStatus = useCallback((id: string, status: N8nIntegrationStatus) => {
    setIntegrationStatusState(prev => ({ ...prev, [id]: status }));
  }, []);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setLastResult(null);
    setIntegrationStatus('webhook', 'testing');

    try {
      const result = await webhookService.testConnection();
      setLastResult(result);
      setIntegrationStatus('webhook', result.success ? 'connected' : 'error');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setLastResult({ success: false, error: message });
      setIntegrationStatus('webhook', 'error');
    } finally {
      setIsTesting(false);
    }
  }, []);

  const sendEvent = useCallback(async (
    event: string,
    data: Record<string, unknown>
  ): Promise<N8nWebhookResponse | null> => {
    setIsTesting(true);
    try {
      const result = await webhookService.send(event as WebhookEventType, data, userId);
      setLastResult(result);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const result = { success: false, error: message };
      setLastResult(result);
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [userId]);

  const resetResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    isTesting,
    lastResult,
    integrationStatus,
    testConnection,
    sendEvent,
    setIntegrationStatus,
    resetResult,
  };
};
