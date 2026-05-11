
import Dexie, { Table } from 'dexie';
import { ReceiptData, Transaction, SavedClient, SavedProduct, CompanySettings, Product, Comment } from '../types';

export interface SyncQueueItem {
  id?: number;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
  retries?: number;
}

export class BizFlowDB extends Dexie {
  receipts!: Table<ReceiptData>;
  transactions!: Table<Transaction>;
  clients!: Table<SavedClient>;
  products!: Table<SavedProduct>;
  catalog!: Table<Product>;
  settings!: Table<CompanySettings & { id: string }>;
  syncQueue!: Table<SyncQueueItem>;
  comments!: Table<Comment>;

  constructor() {
    super('BizFlowDB');
    this.version(2).stores({
      receipts: 'id, userId, clientName, date, type',
      transactions: 'id, userId, date, type, receiptId',
      clients: '++id, userId, name',
      products: '++id, userId, description',
      catalog: 'id, userId, name, category',
      settings: 'id, userId',
      syncQueue: '++id, table, timestamp',
      comments: 'id, timestamp'
    });
  }
}

export const db = new BizFlowDB();
