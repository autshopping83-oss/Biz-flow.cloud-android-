/**
 * API Service - API RESTful interna do BizFlow Cloud
 * 
 * Refatorado: handlers extraídos para módulos separados.
 * Responsabilidades: orquestrar router, autenticação e handlers.
 */

import { ApiRequest, ApiResponse, ApiEndpoint } from './types';
import { ApiRouter } from './router';
import * as documentHandlers from './handlers/documents';
import * as productHandlers from './handlers/products';
import * as systemHandlers from './handlers/system';

class ApiService {
  private router = new ApiRouter();
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
    const endpoints: ApiEndpoint[] = [
      // Documentos
      { method: 'GET', path: '/documents', handler: documentHandlers.listDocuments, description: 'Listar documentos', auth: true },
      { method: 'GET', path: '/documents/:id', handler: documentHandlers.getDocument, description: 'Obter documento', auth: true },
      { method: 'POST', path: '/documents', handler: documentHandlers.createDocument, description: 'Criar documento', auth: true },
      { method: 'DELETE', path: '/documents/:id', handler: documentHandlers.deleteDocument, description: 'Eliminar documento', auth: true },
      // Produtos
      { method: 'GET', path: '/products', handler: productHandlers.listProducts, description: 'Listar produtos', auth: true },
      { method: 'POST', path: '/products', handler: productHandlers.createProduct, description: 'Criar produto', auth: true },
      { method: 'PUT', path: '/products/:id', handler: productHandlers.updateProduct, description: 'Atualizar produto', auth: true },
      { method: 'DELETE', path: '/products/:id', handler: productHandlers.deleteProduct, description: 'Eliminar produto', auth: true },
      // Sistema
      { method: 'GET', path: '/health', handler: systemHandlers.healthCheck, description: 'Health check', auth: false },
      { method: 'GET', path: '/sync/status', handler: systemHandlers.getSyncStatus, description: 'Status sync', auth: true },
      { method: 'POST', path: '/sync/force', handler: systemHandlers.forceSync, description: 'Forçar sync', auth: true },
    ];

    endpoints.forEach(ep => this.router.register(ep));
  }

  async handleRequest(req: ApiRequest): Promise<ApiResponse> {
    try {
      let path = req.path.replace(this.baseUrl, '');
      if (path.endsWith('/')) path = path.slice(0, -1);
      if (!path.startsWith('/')) path = '/' + path;

      const match = this.router.match(req.method, path);
      if (!match) {
        return { status: 404, success: false, error: `Endpoint não encontrado: ${req.method} ${path}`, timestamp: Date.now() };
      }

      const { endpoint, params } = match;

      if (endpoint.auth) {
        const authError = this.verifyAuth(req);
        if (authError) return authError;
      }

      return await endpoint.handler({ ...req, params });
    } catch (error: any) {
      console.error('[API] Erro interno:', error);
      return { status: 500, success: false, error: `Erro interno: ${error.message}`, timestamp: Date.now() };
    }
  }

  private verifyAuth(req: ApiRequest): ApiResponse | null {
    const apiKey = req.headers?.['x-api-key'] || req.query?.['api_key'];
    if (this.apiKey && apiKey === this.apiKey) return null;
    if (req.userId) return null;
    return { status: 401, success: false, error: 'Autenticação necessária', timestamp: Date.now() };
  }

  listEndpoints(): ApiEndpoint[] {
    return this.router.listEndpoints();
  }

  getOpenApiDocs(): any {
    const paths: Record<string, any> = {};
    this.router.listEndpoints().forEach(ep => {
      const cleanPath = ep.path.replace(/:([^/]+)/g, '{$1}');
      if (!paths[cleanPath]) paths[cleanPath] = {};
      paths[cleanPath][ep.method.toLowerCase()] = {
        summary: ep.description,
        security: ep.auth ? [{ apiKey: [] }] : [],
      };
    });
    return {
      openapi: '3.0.0',
      info: { title: 'BizFlow Cloud API', version: '1.0.0' },
      paths,
    };
  }
}

export const apiService = new ApiService();
export type { ApiRequest, ApiResponse, ApiEndpoint };
