/**
 * Handlers de Documentos para a API
 */

import { db } from '../../db';
import { ApiRequest, ApiResponse } from '../types';

export async function listDocuments(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const page = parseInt(req.query?.page || '1');
  const limit = parseInt(req.query?.limit || '50');
  const type = req.query?.type;

  let documents = await db.receipts
    .where('userId').equals(userId)
    .reverse().sortBy('date');

  if (type) documents = documents.filter(d => d.type === type);

  const total = documents.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = documents.slice(start, start + limit);

  return {
    status: 200, success: true, data: paginated, timestamp: Date.now(),
    pagination: { page, limit, total, totalPages },
  };
}

export async function getDocument(req: ApiRequest): Promise<ApiResponse> {
  const { id } = req.params!;
  const document = await db.receipts.get(id);

  if (!document) {
    return { status: 404, success: false, error: 'Documento não encontrado', timestamp: Date.now() };
  }

  return { status: 200, success: true, data: document, timestamp: Date.now() };
}

export async function createDocument(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const doc = req.body as Record<string, unknown> | undefined;
  if (!doc) return { status: 400, success: false, error: 'Body é obrigatório', timestamp: Date.now() };

  const id = await db.receipts.add({
    ...doc, userId, createdAt: Date.now(), synced: false,
  } as any);

  return { status: 201, success: true, data: { id }, message: 'Documento criado', timestamp: Date.now() };
}

export async function deleteDocument(req: ApiRequest): Promise<ApiResponse> {
  const { id } = req.params!;
  await db.receipts.delete(id);
  return { status: 200, success: true, message: 'Documento eliminado', timestamp: Date.now() };
}
