/**
 * API Service - API RESTful interna do BizFlow Cloud
 * 
 * Expõe endpoints para ser consumida por:
 * - Webhooks do n8n
 * - HTTP requests internos
 * - Outros serviços
 * 
 * A API fica disponível em:
 * - window.__BIZFLOW_API__ (in-app)
 * - /api/* (via Vite proxy ou servidor HTTP)
 */

import { db } from './db';
import { supabase } from './supabaseClient';
import { syncService } from './syncService';
import { n8nWebhookService } from './n8nWebhookService';
import { productService } from './productService';
import { orgService } from './orgService';
import { ReceiptData, Transaction, Product, CompanySettings, SavedClient } from '../types';

// ============================================================
// TIPOS DA API
// ============================================================

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  userId?: string;
  params?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  success: boolean;
  data?: any;
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

// ============================================================
// API SERVICE
// ============================================================

class ApiService {
  private endpoints: Map<string, ApiEndpoint> = new Map();
  private baseUrl: string;
  private apiKey: string | null = null;

  constructor() {
    this.baseUrl = '/api';
    this.registerEndpoints();
  }

  /**
   * Configurar chave de API para autenticação
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Obter chave de API
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Gerar uma nova chave de API
   */
  generateApiKey(): string {
    const key = `bf_${Array.from({ length: 32 }, () => 
      Math.random().toString(36).charAt(2)
    ).join('')}`;
    this.apiKey = key;
    return key;
  }

  /**
   * Registar todos os endpoints da API
   */
  private registerEndpoints() {
    // === DOCUMENTOS ===
    this.register({
      method: 'GET',
      path: '/documents',
      handler: this.listDocuments.bind(this),
      description: 'Listar todos os documentos (faturas/recibos)',
      auth: true,
    });
    this.register({
      method: 'GET',
      path: '/documents/:id',
      handler: this.getDocument.bind(this),
      description: 'Obter um documento pelo ID',
      auth: true,
    });
    this.register({
      method: 'POST',
      path: '/documents',
      handler: this.createDocument.bind(this),
      description: 'Criar um novo documento',
      auth: true,
    });
    this.register({
      method: 'DELETE',
      path: '/documents/:id',
      handler: this.deleteDocument.bind(this),
      description: 'Eliminar um documento',
      auth: true,
    });

    // === PRODUTOS ===
    this.register({
      method: 'GET',
      path: '/products',
      handler: this.listProducts.bind(this),
      description: 'Listar produtos do catálogo',
      auth: true,
    });
    this.register({
      method: 'POST',
      path: '/products',
      handler: this.createProduct.bind(this),
      description: 'Criar um novo produto',
      auth: true,
    });
    this.register({
      method: 'PUT',
      path: '/products/:id',
      handler: this.updateProduct.bind(this),
      description: 'Atualizar um produto',
      auth: true,
    });
    this.register({
      method: 'DELETE',
      path: '/products/:id',
      handler: this.deleteProductApi.bind(this),
      description: 'Eliminar um produto',
      auth: true,
    });

    // === TRANSAÇÕES ===
    this.register({
      method: 'GET',
      path: '/transactions',
      handler: this.listTransactions.bind(this),
      description: 'Listar transações financeiras',
      auth: true,
    });
    this.register({
      method: 'POST',
      path: '/transactions',
      handler: this.createTransaction.bind(this),
      description: 'Criar uma transação financeira',
      auth: true,
    });

    // === CLIENTES ===
    this.register({
      method: 'GET',
      path: '/clients',
      handler: this.listClients.bind(this),
      description: 'Listar clientes salvos',
      auth: true,
    });

    // === ESTATÍSTICAS ===
    this.register({
      method: 'GET',
      path: '/stats',
      handler: this.getStats.bind(this),
      description: 'Obter estatísticas do dashboard',
      auth: true,
    });

    // === SISTEMA ===
    this.register({
      method: 'GET',
      path: '/health',
      handler: this.healthCheck.bind(this),
      description: 'Verificar estado do servidor',
      auth: false,
    });
    this.register({
      method: 'GET',
      path: '/sync/status',
      handler: this.getSyncStatus.bind(this),
      description: 'Verificar estado da sincronização',
      auth: true,
    });
    this.register({
      method: 'POST',
      path: '/sync/force',
      handler: this.forceSync.bind(this),
      description: 'Forçar sincronização com Supabase',
      auth: true,
    });

    // === N8N WEBHOOK ===
    this.register({
      method: 'POST',
      path: '/n8n/webhook',
      handler: this.n8nWebhook.bind(this),
      description: 'Receber webhooks do n8n',
      auth: false,
    });
    this.register({
      method: 'POST',
      path: '/n8n/test',
      handler: this.n8nTest.bind(this),
      description: 'Testar conexão com n8n',
      auth: false,
    });

    // === ORGANIZAÇÃO ===
    this.register({
      method: 'GET',
      path: '/org/members',
      handler: this.listOrgMembers.bind(this),
      description: 'Listar membros da organização',
      auth: true,
    });
  }

  /**
   * Registar um endpoint
   */
  private register(endpoint: ApiEndpoint) {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  /**
   * Encontrar endpoint correspondente
   */
  private matchEndpoint(method: string, path: string): { endpoint: ApiEndpoint; params: Record<string, string> } | null {
    for (const [, endpoint] of this.endpoints) {
      if (endpoint.method !== method) continue;

      const endpointParts = endpoint.path.split('/');
      const requestParts = path.split('/');

      if (endpointParts.length !== requestParts.length) continue;

      const params: Record<string, string> = {};
      let match = true;

      for (let i = 0; i < endpointParts.length; i++) {
        if (endpointParts[i].startsWith(':')) {
          params[endpointParts[i].slice(1)] = requestParts[i];
        } else if (endpointParts[i] !== requestParts[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        return { endpoint, params };
      }
    }

    return null;
  }

  /**
   * Processar um request
   */
  async handleRequest(req: ApiRequest): Promise<ApiResponse> {
    try {
      // Normalizar path
      let path = req.path.replace(this.baseUrl, '');
      if (path.endsWith('/')) path = path.slice(0, -1);
      if (!path.startsWith('/')) path = '/' + path;

      // Encontrar endpoint
      const match = this.matchEndpoint(req.method, path);
      if (!match) {
        return this.error(404, `Endpoint não encontrado: ${req.method} ${path}`);
      }

      const { endpoint, params } = match;

      // Verificar autenticação
      if (endpoint.auth) {
        const authError = this.verifyAuth(req);
        if (authError) return authError;
      }

      // Adicionar parâmetros da URL ao request
      const enrichedReq = { ...req, params };

      // Executar handler
      return await endpoint.handler(enrichedReq);
    } catch (error: any) {
      console.error('[API] Erro interno:', error);
      return this.error(500, `Erro interno: ${error.message}`);
    }
  }

  /**
   * Verificar autenticação
   */
  private verifyAuth(req: ApiRequest): ApiResponse | null {
    // Verificar API key
    const apiKey = req.headers?.['x-api-key'] || req.query?.['api_key'];
    if (this.apiKey && apiKey === this.apiKey) {
      return null;
    }

    // Verificar userId
    if (req.userId) {
      return null;
    }

    return this.error(401, 'Autenticação necessária. Forneça x-api-key ou userId.');
  }

  // ============================================================
  // HANDLERS DOS ENDPOINTS
  // ============================================================

  /**
   * Health Check
   */
  private async healthCheck(req: ApiRequest): Promise<ApiResponse> {
    return this.success({
      status: 'ok',
      app: 'BizFlow Cloud',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'N/A',
      environment: typeof import.meta !== 'undefined' ? import.meta.env.MODE : 'production',
    });
  }

  /**
   * Listar documentos
   */
  private async listDocuments(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const page = parseInt(req.query?.page || '1');
    const limit = parseInt(req.query?.limit || '50');
    const type = req.query?.type;

    let documents = await db.receipts
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('date');

    if (type) {
      documents = documents.filter(d => d.type === type);
    }

    const total = documents.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = documents.slice(start, start + limit);

    return this.success(paginated, {
      page,
      limit,
      total,
      totalPages,
    });
  }

  /**
   * Obter documento por ID
   */
  private async getDocument(req: ApiRequest): Promise<ApiResponse> {
    const { id } = req.params!;
    const document = await db.receipts.get(id);

    if (!document) {
      return this.error(404, 'Documento não encontrado');
    }

    return this.success(document);
  }

  /**
   * Criar documento
   */
  private async createDocument(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const data = req.body;

    if (!data) {
      return this.error(400, 'Body é obrigatório');
    }

    const document: ReceiptData = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type || 'RECEIPT',
      number: data.number || `API-${Date.now()}`,
      date: data.date || new Date().toISOString().split('T')[0],
      currency: data.currency || 'MZN',
      language: data.language || 'pt',
      clientName: data.clientName || '',
      clientContact: data.clientContact || '',
      clientLocation: data.clientLocation || '',
      clientNuit: data.clientNuit || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      discount: data.discount || 0,
      total: data.total || 0,
      createdAt: Date.now(),
    };

    await db.receipts.put(document);
    await syncService.addToQueue('receipts', 'INSERT', { ...document, userId });

    // Notificar n8n
    n8nWebhookService.notifyDocumentCreated(document, userId).catch(() => {});

    return this.success(document, undefined, 'Documento criado com sucesso');
  }

  /**
   * Eliminar documento
   */
  private async deleteDocument(req: ApiRequest): Promise<ApiResponse> {
    const { id } = req.params!;
    const userId = req.userId!;

    const document = await db.receipts.get(id);
    if (!document) {
      return this.error(404, 'Documento não encontrado');
    }

    await db.receipts.delete(id);
    await syncService.addToQueue('receipts', 'DELETE', { id, userId });

    return this.success(null, undefined, 'Documento eliminado com sucesso');
  }

  /**
   * Listar produtos
   */
  private async listProducts(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const category = req.query?.category;

    let products = await db.catalog.where('userId').equals(userId).toArray();

    if (category) {
      products = products.filter(p => p.category === category);
    }

    return this.success(products);
  }

  /**
   * Criar produto
   */
  private async createProduct(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const { name, price, category } = req.body || {};

    if (!name || price === undefined) {
      return this.error(400, 'name e price são obrigatórios');
    }

    const product = await productService.createProduct(name, price, userId, category);
    return this.success(product, undefined, 'Produto criado com sucesso');
  }

  /**
   * Atualizar produto
   */
  private async updateProduct(req: ApiRequest): Promise<ApiResponse> {
    const { id } = req.params!;
    const updates = req.body;

    if (!updates) {
      return this.error(400, 'Body é obrigatório');
    }

    const product = await productService.updateProduct(id, updates);
    return this.success(product, undefined, 'Produto atualizado com sucesso');
  }

  /**
   * Eliminar produto
   */
  private async deleteProductApi(req: ApiRequest): Promise<ApiResponse> {
    const { id } = req.params!;

    await productService.deleteProduct(id);
    return this.success(null, undefined, 'Produto eliminado com sucesso');
  }

  /**
   * Listar transações
   */
  private async listTransactions(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const type = req.query?.type;
    const startDate = req.query?.start_date;
    const endDate = req.query?.end_date;

    let transactions = await db.transactions
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('date');

    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    if (startDate) {
      transactions = transactions.filter(t => t.date >= startDate);
    }
    if (endDate) {
      transactions = transactions.filter(t => t.date <= endDate);
    }

    return this.success(transactions);
  }

  /**
   * Criar transação
   */
  private async createTransaction(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const data = req.body;

    if (!data || !data.type || !data.amount || !data.description) {
      return this.error(400, 'type, amount e description são obrigatórios');
    }

    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      category: data.category || 'Outros',
      date: data.date || new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };

    await db.transactions.add(transaction);
    await syncService.addToQueue('transactions', 'INSERT', transaction);

    return this.success(transaction, undefined, 'Transação criada com sucesso');
  }

  /**
   * Listar clientes
   */
  private async listClients(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const clients = await db.clients.where('userId').equals(userId).toArray();
    return this.success(clients);
  }

  /**
   * Obter estatísticas
   */
  private async getStats(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;

    const documents = await db.receipts.where('userId').equals(userId).toArray();
    const transactions = await db.transactions.where('userId').equals(userId).toArray();
    const products = await db.catalog.where('userId').equals(userId).toArray();
    const clients = await db.clients.where('userId').equals(userId).toArray();

    const totalRevenue = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return this.success({
      documents: {
        total: documents.length,
        byType: {
          RECEIPT: documents.filter(d => d.type === 'RECEIPT').length,
          INVOICE: documents.filter(d => d.type === 'INVOICE').length,
          QUOTE: documents.filter(d => d.type === 'QUOTE').length,
          INVOICE_RECEIPT: documents.filter(d => d.type === 'INVOICE_RECEIPT').length,
        },
      },
      financial: {
        totalRevenue,
        totalExpenses,
        balance: totalRevenue - totalExpenses,
        transactionCount: transactions.length,
      },
      catalog: {
        totalProducts: products.length,
        totalClients: clients.length,
      },
    });
  }

  /**
   * Estado da sincronização
   */
  private async getSyncStatus(req: ApiRequest): Promise<ApiResponse> {
    const queueSize = await syncService.getQueueSize();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    return this.success({
      online: isOnline,
      pendingSync: queueSize,
      lastSync: null, // Poderia ser armazenado no futuro
      tables: {
        receipts: await db.receipts.count(),
        transactions: await db.transactions.count(),
        catalog: await db.catalog.count(),
        clients: await db.clients.count(),
        products: await db.products.count(),
        settings: await db.settings.count(),
      },
    });
  }

  /**
   * Forçar sincronização
   */
  private async forceSync(req: ApiRequest): Promise<ApiResponse> {
    try {
      await syncService.processQueue();
      return this.success(null, undefined, 'Sincronização forçada concluída');
    } catch (error: any) {
      return this.error(500, `Erro na sincronização: ${error.message}`);
    }
  }

  /**
   * Receber webhook do n8n
   */
  private async n8nWebhook(req: ApiRequest): Promise<ApiResponse> {
    const { event, data } = req.body || {};

    if (!event) {
      return this.error(400, 'event é obrigatório');
    }

    console.log(`[API] Webhook n8n recebido: ${event}`, data);

    // Processar eventos do n8n
    switch (event) {
      case 'document.create':
        if (data) {
          return await this.createDocument({ ...req, body: data });
        }
        break;
      case 'sync.trigger':
        await syncService.processQueue();
        return this.success(null, undefined, 'Sincronização acionada pelo n8n');
      case 'notification.sent':
        return this.success(null, undefined, 'Notificação processada');
      default:
        return this.success({ received: true, event, data }, undefined, 'Evento recebido');
    }

    return this.success({ received: true, event }, undefined, 'Evento recebido');
  }

  /**
   * Testar conexão n8n
   */
  private async n8nTest(req: ApiRequest): Promise<ApiResponse> {
    const result = await n8nWebhookService.testConnection();
    return result.success
      ? this.success(result.data, undefined, 'Conexão com n8n OK')
      : this.error(502, `Falha na conexão com n8n: ${result.error}`);
  }

  /**
   * Listar membros da organização
   */
  private async listOrgMembers(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const orgId = await orgService.getOrgId(userId);

    if (!orgId) {
      return this.error(404, 'Organização não encontrada');
    }

    const members = await orgService.listMembers(orgId);
    return this.success(members);
  }

  // ============================================================
  // MÉTODOS AUXILIARES
  // ============================================================

  private success(data: any, pagination?: ApiResponse['pagination'], message?: string): ApiResponse {
    return {
      status: 200,
      success: true,
      data,
      message,
      timestamp: Date.now(),
      pagination,
    };
  }

  private error(status: number, error: string): ApiResponse {
    return {
      status,
      success: false,
      error,
      timestamp: Date.now(),
    };
  }

  /**
   * Listar todos os endpoints registados
   */
  listEndpoints(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Obter documentação OpenAPI/Swagger simplificada
   */
  getOpenApiDocs(): any {
    const paths: Record<string, any> = {};

    for (const endpoint of this.endpoints.values()) {
      const method = endpoint.method.toLowerCase();
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }
      paths[endpoint.path][method] = {
        summary: endpoint.description,
        security: endpoint.auth ? [{ apiKey: [] }] : [],
        responses: {
          '200': { description: 'Sucesso' },
          '401': { description: 'Não autorizado' },
          '404': { description: 'Não encontrado' },
        },
      };
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'BizFlow Cloud API',
        version: '1.0.0',
        description: 'API RESTful interna do BizFlow Cloud para integrações com n8n e serviços externos',
      },
      servers: [
        { url: '/api', description: 'API local' },
      ],
      paths,
    };
  }
}

// ============================================================
// SINGLETON E EXPOSIÇÃO GLOBAL
// ============================================================

export const apiService = new ApiService();

// Expor API globalmente para acesso in-app
if (typeof window !== 'undefined') {
  (window as any).__BIZFLOW_API__ = {
    request: (req: ApiRequest) => apiService.handleRequest(req),
    endpoints: () => apiService.listEndpoints(),
    docs: () => apiService.getOpenApiDocs(),
    generateKey: () => apiService.generateApiKey(),
  };
}

export default apiService;
