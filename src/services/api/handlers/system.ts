/**
 * Handlers de Sistema para a API
 */

import { ApiRequest, ApiResponse } from '../types';

export async function healthCheck(_req: ApiRequest): Promise<ApiResponse> {
  return {
    status: 200, success: true,
    data: {
      status: 'ok', app: 'BizFlow Cloud', version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: typeof import.meta !== 'undefined' ? import.meta.env.MODE : 'production',
    },
    timestamp: Date.now(),
  };
}

export async function getSyncStatus(req: ApiRequest): Promise<ApiResponse> {
  const { syncService } = await import('../../syncService');
  const queueSize = await syncService.getQueueSize();
  return {
    status: 200, success: true,
    data: { queueSize, lastSync: Date.now() },
    timestamp: Date.now(),
  };
}

export async function forceSync(req: ApiRequest): Promise<ApiResponse> {
  const { syncService } = await import('../../syncService');
  await syncService.sync();
  return { status: 200, success: true, message: 'Sincronização forçada', timestamp: Date.now() };
}
