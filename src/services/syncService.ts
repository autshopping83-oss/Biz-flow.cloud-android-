// src/services/syncService.ts
import { supabase, isSupabaseAvailable } from './supabase';
import { db } from './db';

export interface SyncResult {
  documents: number;
  clients: number;
  products: number;
  transactions: number;
  errors: string[];
}

export const syncToSupabase = async (userId: string): Promise<SyncResult> => {
  const result: SyncResult = { documents: 0, clients: 0, products: 0, transactions: 0, errors: [] };

  if (!userId || userId === 'local' || !isSupabaseAvailable()) return result;

  try {
    // Sync documents
    const docs = await db.receipts.where('userId').equals(userId).toArray();
    if (docs.length > 0) {
      const mapped = docs.map(d => ({
        id: d.id, user_id: userId, type: d.type, number: d.number, date: d.date,
        currency: d.currency, client_name: d.clientName, client_contact: d.clientContact,
        client_location: d.clientLocation, client_nuit: d.clientNuit,
        items: JSON.stringify(d.items), subtotal: d.subtotal, tax_rate: d.taxRate,
        tax_amount: d.taxAmount, discount: d.discount, total: d.total,
        stamp_text: d.stampText, signature_data: d.signatureData,
        document_theme: d.documentTheme, status: d.status, pdf_url: d.pdfUrl,
        synced: true, created_at: new Date(d.createdAt).toISOString(),
      }));
      const { error } = await supabase!.from('documents').upsert(mapped, { onConflict: 'id' }).abortSignal(AbortSignal.timeout(10000));
      if (error) result.errors.push(`documents: ${error.message}`);
      else result.documents = mapped.length;
    }
  } catch (e) {
    result.errors.push(`documents: ${(e as Error).message}`);
  }

  try {
    // Sync clients
    const clients = await db.clients.where('userId').equals(userId).toArray();
    if (clients.length > 0) {
      const mapped = clients.map(c => ({
        user_id: userId, name: c.name, contact: c.contact,
        nuit: c.nuit, location: c.location,
      }));
      const { error } = await supabase!.from('saved_clients').insert(mapped).abortSignal(AbortSignal.timeout(10000));
      if (error) result.errors.push(`clients: ${error.message}`);
      else result.clients = mapped.length;
    }
  } catch (e) {
    result.errors.push(`clients: ${(e as Error).message}`);
  }

  try {
    // Sync products
    const products = await db.products.where('userId').equals(userId).toArray();
    if (products.length > 0) {
      const mapped = products.map(p => ({
        user_id: userId, description: p.description, unit_price: p.unitPrice,
      }));
      const { error } = await supabase!.from('saved_products').insert(mapped).abortSignal(AbortSignal.timeout(10000));
      if (error) result.errors.push(`products: ${error.message}`);
      else result.products = mapped.length;
    }
  } catch (e) {
    result.errors.push(`products: ${(e as Error).message}`);
  }

  try {
    // Sync transactions
    const txns = await db.transactions.where('userId').equals(userId).toArray();
    if (txns.length > 0) {
      const mapped = txns.map(t => ({
        user_id: userId, type: t.type, amount: t.amount,
        description: t.description, category: t.category, date: t.date,
        receipt_id: t.receiptId,
      }));
      const { error } = await supabase!.from('transactions').insert(mapped).abortSignal(AbortSignal.timeout(10000));
      if (error) result.errors.push(`transactions: ${error.message}`);
      else result.transactions = mapped.length;
    }
  } catch (e) {
    result.errors.push(`transactions: ${(e as Error).message}`);
  }

  return result;
};

export const syncSingleDocument = async (doc: {
  id: string; userId: string; type: string; number: string; date: string;
  currency: string; clientName: string; clientContact: string;
  clientLocation: string; clientNuit: string; items: unknown[];
  subtotal: number; taxRate: number; taxAmount: number; discount: number; total: number;
  stampText?: string; signatureData?: string; documentTheme?: string;
  status?: string; createdAt: number;
}) => {
  if (!doc.userId || doc.userId === 'local' || !isSupabaseAvailable()) return;
  try {
    await supabase!.from('documents').upsert({
      id: doc.id, user_id: doc.userId, type: doc.type, number: doc.number,
      date: doc.date, currency: doc.currency, client_name: doc.clientName,
      client_contact: doc.clientContact, client_location: doc.clientLocation,
      client_nuit: doc.clientNuit, items: JSON.stringify(doc.items),
      subtotal: doc.subtotal, tax_rate: doc.taxRate, tax_amount: doc.taxAmount,
      discount: doc.discount, total: doc.total, stamp_text: doc.stampText,
      signature_data: doc.signatureData, document_theme: doc.documentTheme,
      status: doc.status, synced: true,
      created_at: new Date(doc.createdAt).toISOString(),
    }, { onConflict: 'id' }).abortSignal(AbortSignal.timeout(10000));
  } catch (e) {
    console.warn('Sync single document failed:', e);
  }
};
