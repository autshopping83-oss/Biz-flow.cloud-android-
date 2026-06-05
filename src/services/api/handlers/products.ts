/**
 * Handlers de Produtos para a API
 */

import { db } from '../../db';
import { ApiRequest, ApiResponse } from '../types';

export async function listProducts(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const products = await db.products.where('userId').equals(userId).toArray();
  return { status: 200, success: true, data: products, timestamp: Date.now() };
}

export async function createProduct(req: ApiRequest): Promise<ApiResponse> {
  const userId = req.userId!;
  const product = req.body as Record<string, unknown> | undefined;
  if (!product) return { status: 400, success: false, error: 'Body é obrigatório', timestamp: Date.now() };
  const id = await db.products.add({ ...product, userId, createdAt: Date.now() } as any);
  return { status: 201, success: true, data: { id }, message: 'Produto criado', timestamp: Date.now() };
}

export async function updateProduct(req: ApiRequest): Promise<ApiResponse> {
  const id = req.params!.id!;
  await db.products.update(id, req.body as any);
  return { status: 200, success: true, message: 'Produto atualizado', timestamp: Date.now() };
}

export async function deleteProduct(req: ApiRequest): Promise<ApiResponse> {
  const { id } = req.params!;
  await db.products.delete(id);
  return { status: 200, success: true, message: 'Produto eliminado', timestamp: Date.now() };
}
