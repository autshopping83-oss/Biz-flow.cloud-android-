import { db } from './db';
import { supabase } from './supabaseClient';
import { syncService } from './syncService';
import { n8nWebhookService } from './n8nWebhookService';
import { productService } from './productService';
import { orgService } from './orgService';
import { ReceiptData, Transaction } from '../types';

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  userId?: string;
  params?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  timestamp: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ApiEndpoint = {
  method: ApiRequest['method'];
  path: string;
  handler: (req: ApiRequest) => Promise<ApiResponse>;
  description: string;
  auth: boolean;
};

function success(data: unknown, pagination?: ApiResponse['pagination'], message?: string): ApiResponse {
  return { status: 200, success: true, data, message, timestamp: Date.now(), pagination };
}

function error(status: number, errorMessage: string): ApiResponse {
  return { status, success: false, error: errorMessage, timestamp: Date.now() };
}

import {
  healthCheck,
  listDocuments, getDocument, createDocument, deleteDocument,
  listProducts, createProduct, updateProduct, deleteProductApi,
  listTransactions, createTransaction,
  listClients,
  getStats,
  getSyncStatus, forceSync,
  n8nWebhook, n8nTest,
  listOrgMembers,
} from './apiServiceHandlers';

class ApiService {
  private endpoints: Map<string, ApiEndpoint> = new Map();
  private baseUrl: string;
  private apiKey: string | null = null;

  constructor() {
    this.baseUrl = '/api';
    this.registerEndpoints();
  }

  setApiKey(key: string) { this.apiKey = key; }
  getApiKey(): string | null { return this.apiKey; }

  generateApiKey(): string {
    const key = `bf_${Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('')}`;
    this.apiKey = key;
    return key;
  }

  private registerEndpoints() {
    const doc = { listDocuments, getDocument, createDocument, deleteDocument };
    const prod = { listProducts, createProduct, updateProduct, deleteProductApi };
    const txn = { listTransactions, createTransaction };
    const sys = { healthCheck, getSyncStatus, forceSync };
    const n8n = { n8nWebhook, n8nTest };

    this.register({ method: 'GET', path: '/documents', handler: doc.listDocuments, description: 'Listar todos os documentos', auth: true });
    this.register({ method: 'GET', path: '/documents/:id', handler: doc.getDocument, description: 'Obter documento por ID', auth: true });
    this.register({ method: 'POST', path: '/documents', handler: doc.createDocument, description: 'Criar documento', auth: true });
    this.register({ method: 'DELETE', path: '/documents/:id', handler: doc.deleteDocument, description: 'Eliminar documento', auth: true });

    this.register({ method: 'GET', path: '/products', handler: prod.listProducts, description: 'Listar produtos', auth: true });
    this.register({ method: 'POST', path: '/products', handler: prod.createProduct, description: 'Criar produto', auth: true });
    this.register({ method: 'PUT', path: '/products/:id', handler: prod.updateProduct, description: 'Atualizar produto', auth: true });
    this.register({ method: 'DELETE', path: '/products/:id', handler: prod.deleteProductApi, description: 'Eliminar produto', auth: true });

    this.register({ method: 'GET', path: '/transactions', handler: txn.listTransactions, description: 'Listar transações', auth: true });
    this.register({ method: 'POST', path: '/transactions', handler: txn.createTransaction, description: 'Criar transação', auth: true });

    this.register({ method: 'GET', path: '/clients', handler: listClients, description: 'Listar clientes', auth: true });
    this.register({ method: 'GET', path: '/stats', handler: getStats, description: 'Estatísticas do dashboard', auth: true });

    this.register({ method: 'GET', path: '/health', handler: sys.healthCheck, description: 'Health check', auth: false });
    this.register({ method: 'GET', path: '/sync/status', handler: sys.getSyncStatus, description: 'Status da sincronização', auth: true });
    this.register({ method: 'POST', path: '/sync/force', handler: sys.forceSync, description: 'Forçar sincronização', auth: true });

    this.register({ method: 'POST', path: '/n8n/webhook', handler: n8n.n8nWebhook, description: 'Receber webhook do n8n', auth: false });
    this.register({ method: 'POST', path: '/n8n/test', handler: n8n.n8nTest, description: 'Testar conexão n8n', auth: false });

    this.register({ method: 'GET', path: '/org/members', handler: listOrgMembers, description: 'Listar membros da org', auth: true });
  }

  private register(endpoint: ApiEndpoint) {
    this.endpoints.set(`${endpoint.method}:${endpoint.path}`, endpoint);
  }

  private matchEndpoint(method: string, path: string): { endpoint: ApiEndpoint; params: Record<string, string> } | null {
    for (const [, endpoint] of this.endpoints) {
      if (endpoint.method !== method) continue;
      const ep = endpoint.path.split('/');
      const rp = path.split('/');
      if (ep.length !== rp.length) continue;
      const params: Record<string, string> = {};
      let match = true;
      for (let i = 0; i < ep.length; i++) {
        if (ep[i]!.startsWith(':')) {
          params[ep[i]!.slice(1)] = rp[i]!;
        } else if (ep[i] !== rp[i]) {
          match = false;
          break;
        }
      }
      if (match) return { endpoint, params };
    }
    return null;
  }

  async handleRequest(req: ApiRequest): Promise<ApiResponse> {
    try {
      let path = req.path.replace(this.baseUrl, '');
      if (path.endsWith('/')) path = path.slice(0, -1);
      if (!path.startsWith('/')) path = '/' + path;

      const match = this.matchEndpoint(req.method, path);
      if (!match) return error(404, `Endpoint não encontrado: ${req.method} ${path}`);

      const { endpoint, params } = match;

      if (endpoint.auth) {
        const apiKey = req.headers?.['x-api-key'] || req.query?.['api_key'];
        if (this.apiKey && apiKey === this.apiKey) { /* ok */ }
        else if (req.userId) { /* ok */ }
        else return error(401, 'Autenticação necessária');
      }

      return await endpoint.handler({ ...req, params });
    } catch (err: unknown) {
      console.error('[API] Erro interno:', err);
      return error(500, `Erro interno: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  listEndpoints(): ApiEndpoint[] { return Array.from(this.endpoints.values()); }

  getOpenApiDocs(): Record<string, unknown> {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const endpoint of this.endpoints.values()) {
      const method = endpoint.method.toLowerCase();
      if (!paths[endpoint.path]) paths[endpoint.path] = {};
      paths[endpoint.path]![method] = {
        summary: endpoint.description,
        security: endpoint.auth ? [{ apiKey: [] }] : [],
        responses: { '200': { description: 'Sucesso' }, '401': { description: 'Não autorizado' }, '404': { description: 'Não encontrado' } },
      };
    }
    return {
      openapi: '3.0.0',
      info: { title: 'BizFlow Cloud API', version: '1.0.0', description: 'API RESTful interna para integrações com n8n e serviços externos' },
      servers: [{ url: '/api', description: 'API local' }],
      paths,
    };
  }
}

export const apiService = new ApiService();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__BIZFLOW_API__ = {
    request: (req: ApiRequest) => apiService.handleRequest(req),
    endpoints: () => apiService.listEndpoints(),
    docs: () => apiService.getOpenApiDocs(),
    generateKey: () => apiService.generateApiKey(),
  };
}

export default apiService;
