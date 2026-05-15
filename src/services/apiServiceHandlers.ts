import { db } from './db';
import { syncService } from './syncService';
import { n8nWebhookService } from './n8nWebhookService';
import { productService } from './productService';
import { orgService } from './orgService';
import { ApiRequest, ApiResponse } from './apiService';
import type { Transaction } from '../types';

function success(data: unknown, pagination?: ApiResponse['pagination'], message?: string): ApiResponse {
  return { status: 200, success: true, data, message, timestamp: Date.now(), pagination };
}

function error(status: number, errorMessage: string): ApiResponse {
  return { status, success: false, error: errorMessage, timestamp: Date.now() };
}

export async function healthCheck(): Promise<ApiResponse> {
  return success({
    status: 'ok',
    app: 'BizFlow Cloud',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: 'N/A',
    environment: typeof import.meta !== 'undefined' ? import.meta.env.MODE : 'production',
  });
}

// ============================================================
// DOCUMENTS
// ============================================================

export async function listDocuments(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const page = parseInt(req.query?.page || '1');
  const limit = parseInt(req.query?.limit || '50');
  const type = req.query?.type;

  let documents = await db.receipts.where('userId').equals(userId).reverse().sortBy('date');

  if (type) documents = documents.filter(d => d.type === type);

  const total = documents.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return success(documents.slice(start, start + limit), { page, limit, total, totalPages });
}

export async function getDocument(req: ApiRequest): Promise<ApiResponse> {
  const { id } = req.params!;
  const document = await db.receipts.get(id);
  if (!document) return error(404, 'Documento não encontrado');
  return success(document);
}

export async function createDocument(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const data = req.body as Record<string, unknown> | undefined;
  if (!data) return error(400, 'Body é obrigatório');

  const document = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: (data.type as string) || 'RECEIPT',
    number: (data.number as string) || `API-${Date.now()}`,
    date: (data.date as string) || new Date().toISOString().split('T')[0],
    currency: (data.currency as string) || 'MZN',
    language: (data.language as string) || 'pt',
    clientName: (data.clientName as string) || '',
    clientContact: (data.clientContact as string) || '',
    clientLocation: (data.clientLocation as string) || '',
    clientNuit: (data.clientNuit as string) || '',
    items: (data.items as unknown[]) || [],
    subtotal: (data.subtotal as number) || 0,
    taxRate: (data.taxRate as number) || 0,
    taxAmount: (data.taxAmount as number) || 0,
    discount: (data.discount as number) || 0,
    total: (data.total as number) || 0,
    createdAt: Date.now(),
  };

  await db.receipts.put(document);
  await syncService.addToQueue('receipts', 'INSERT', { ...document, userId } as Record<string, unknown>);
  n8nWebhookService.notifyDocumentCreated(document, userId).catch(() => {});

  return success(document, undefined, 'Documento criado com sucesso');
}

export async function deleteDocument(req: ApiRequest): Promise<ApiResponse> {
  const { id } = req.params!;
  const userId = req.userId!;

  const document = await db.receipts.get(id);
  if (!document) return error(404, 'Documento não encontrado');

  await db.receipts.delete(id);
  await syncService.addToQueue('receipts', 'DELETE', { id, userId });

  return success(null, undefined, 'Documento eliminado com sucesso');
}

// ============================================================
// PRODUCTS
// ============================================================

export async function listProducts(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const category = req.query?.category;

  let products = await db.catalog.where('userId').equals(userId).toArray();
  if (category) products = products.filter(p => p.category === category);

  return success(products);
}

export async function createProduct(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const body = req.body as Record<string, unknown> | undefined;
  const { name, price, category } = body || {};

  if (!name || price === undefined) return error(400, 'name e price são obrigatórios');

  const product = await productService.createProduct(
    name as string, price as number, userId, category as string | undefined
  );
  return success(product, undefined, 'Produto criado com sucesso');
}

export async function updateProduct(req: ApiRequest): Promise<ApiResponse> {
  const { id } = req.params!;
  const updates = req.body;
  if (!updates) return error(400, 'Body é obrigatório');

  const product = await productService.updateProduct(id, updates as Record<string, unknown>);
  return success(product, undefined, 'Produto atualizado com sucesso');
}

export async function deleteProductApi(req: ApiRequest): Promise<ApiResponse> {
  const { id } = req.params!;
  await productService.deleteProduct(id);
  return success(null, undefined, 'Produto eliminado com sucesso');
}

// ============================================================
// TRANSACTIONS
// ============================================================

export async function listTransactions(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const type = req.query?.type;
  const startDate = req.query?.start_date;
  const endDate = req.query?.end_date;

  let transactions = await db.transactions.where('userId').equals(userId).reverse().sortBy('date');

  if (type) transactions = transactions.filter(t => t.type === type);
  if (startDate) transactions = transactions.filter(t => t.date >= startDate);
  if (endDate) transactions = transactions.filter(t => t.date <= endDate);

  return success(transactions);
}

export async function createTransaction(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const data = req.body as Record<string, unknown> | undefined;

  if (!data || !data.type || !data.amount || !data.description) {
    return error(400, 'type, amount e description são obrigatórios');
  }

  const transaction: Transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: data.type as 'INCOME' | 'EXPENSE',
    amount: data.amount as number,
    description: data.description as string,
    category: (data.category as string) || 'Outros',
    date: (data.date as string) || new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
  };

  await db.transactions.add(transaction);
  await syncService.addToQueue('transactions', 'INSERT', transaction as unknown as Record<string, unknown>);

  return success(transaction, undefined, 'Transação criada com sucesso');
}

// ============================================================
// CLIENTS
// ============================================================

export async function listClients(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const clients = await db.clients.where('userId').equals(userId).toArray();
  return success(clients);
}

// ============================================================
// STATS
// ============================================================

export async function getStats(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;

  const documents = await db.receipts.where('userId').equals(userId).toArray();
  const transactions = await db.transactions.where('userId').equals(userId).toArray();
  const products = await db.catalog.where('userId').equals(userId).toArray();
  const clients = await db.clients.where('userId').equals(userId).toArray();

  const totalRevenue = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

  return success({
    documents: {
      total: documents.length,
      byType: {
        RECEIPT: documents.filter(d => d.type === 'RECEIPT').length,
        INVOICE: documents.filter(d => d.type === 'INVOICE').length,
        QUOTE: documents.filter(d => d.type === 'QUOTE').length,
        INVOICE_RECEIPT: documents.filter(d => d.type === 'INVOICE_RECEIPT').length,
      },
    },
    financial: { totalRevenue, totalExpenses, balance: totalRevenue - totalExpenses, transactionCount: transactions.length },
    catalog: { totalProducts: products.length, totalClients: clients.length },
  });
}

// ============================================================
// SYNC
// ============================================================

export async function getSyncStatus(): Promise<ApiResponse> {
  const queueSize = await syncService.getQueueSize();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return success({
    online: isOnline,
    pendingSync: queueSize,
    lastSync: null,
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

export async function forceSync(): Promise<ApiResponse> {
  try {
    await syncService.processQueue();
    return success(null, undefined, 'Sincronização forçada concluída');
  } catch (err: unknown) {
    return error(500, `Erro na sincronização: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ============================================================
// N8N
// ============================================================

export async function n8nWebhook(req: ApiRequest): Promise<ApiResponse> {
  const body = req.body as Record<string, unknown> | undefined;
  const { event, data } = body || {};

  if (!event) return error(400, 'event é obrigatório');

  switch (event) {
    case 'document.create':
      if (data) return createDocument({ ...req, body: data });
      break;
    case 'sync.trigger':
      await syncService.processQueue();
      return success(null, undefined, 'Sincronização acionada pelo n8n');
    case 'notification.sent':
      return success(null, undefined, 'Notificação processada');
  }

  return success({ received: true, event, data }, undefined, 'Evento recebido');
}

export async function n8nTest(): Promise<ApiResponse> {
  const result = await n8nWebhookService.testConnection();
  return result.success
    ? success(result.data, undefined, 'Conexão com n8n OK')
    : error(502, `Falha na conexão com n8n: ${result.error ?? 'erro desconhecido'}`);
}

// ============================================================
// ORG
// ============================================================

export async function listOrgMembers(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const orgId = await orgService.getOrgId(userId);

  if (!orgId) return error(404, 'Organização não encontrada');

  const members = await orgService.listMembers(orgId);
  return success(members);
}
