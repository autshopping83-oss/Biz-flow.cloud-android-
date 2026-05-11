
import { db, SyncQueueItem } from './db';
import { supabase } from './supabaseClient';

class SyncService {
  private isSyncing = false;
  private onStatusChange: ((syncing: boolean) => void) | null = null;
  private maxRetries = 5;
  private retryDelay = 1000; // 1 second initial delay

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
      setTimeout(() => this.sync(), 1000); // Initial sync attempt
    }
  }

  setNotifyCallback(callback: (syncing: boolean) => void) {
    this.onStatusChange = callback;
  }

  async addToQueue(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
    await db.syncQueue.add({
      table,
      action,
      data,
      timestamp: Date.now()
    });
    
    if (navigator.onLine) {
      this.sync();
    }
  }

  async sync() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    this.onStatusChange?.(true);

    try {
      const queue = await db.syncQueue.orderBy('timestamp').toArray();
      if (queue.length === 0) {
        this.isSyncing = false;
        this.onStatusChange?.(false);
        return;
      }

      for (const item of queue) {
        const success = await this.processItemWithRetry(item);
        if (success) {
          await db.syncQueue.delete(item.id!);
        } else {
          // If item has exceeded max retries, skip it to avoid blocking the queue
          if (item.retries && item.retries >= this.maxRetries) {
            console.warn(`Sync item ${item.id} exceeded max retries, skipping`);
            await db.syncQueue.delete(item.id!);
          }
          break; // Stop processing on failure to maintain order
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      this.isSyncing = false;
      this.onStatusChange?.(false);
    }
  }

  private async processItemWithRetry(item: SyncQueueItem, attempt = 0): Promise<boolean> {
    try {
      return await this.processItem(item);
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`Sync retry ${attempt + 1}/${this.maxRetries} for item ${item.id} after ${delay}ms`);
        
        // Update retry count in the queue
        await db.syncQueue.update(item.id!, { retries: (item.retries || 0) + 1 });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processItemWithRetry(item, attempt + 1);
      }
      console.error(`Sync failed after ${this.maxRetries} retries for item ${item.id}:`, error);
      return false;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<boolean> {
    try {
      const { table, action, data } = item;
      
      if (table === 'receipt_transaction_bundle') {
        const { receipt, transaction } = data;
        const receiptPayload = { ...receipt };
        const transactionPayload = { ...transaction };

        if (receiptPayload.userId) {
          receiptPayload.user_id = receiptPayload.userId;
          delete receiptPayload.userId;
        }
        if (transactionPayload.userId) {
          transactionPayload.user_id = transactionPayload.userId;
          delete transactionPayload.userId;
        }
        if (transactionPayload.receiptId) {
          transactionPayload.receipt_id = transactionPayload.receiptId;
          delete transactionPayload.receiptId;
        }

        const { error: receiptError } = await supabase
          .from('receipts')
          .upsert(receiptPayload);
        if (receiptError) {
          console.error('Error syncing receipt_transaction_bundle (receipt):', receiptError);
          return false;
        }

        const { error: transactionError } = await supabase
          .from('transactions')
          .upsert(transactionPayload);
        if (transactionError) {
          console.error('Error syncing receipt_transaction_bundle (transaction):', transactionError);
          return false;
        }

        return true;
      }

      let supabaseTable = table;
      let payload = { ...data };

      // Handle table name mapping
      if (table === 'settings') {
        supabaseTable = 'profiles';
      }

      // Handle field mapping (userId -> user_id)
      if (payload.userId) {
        payload.user_id = payload.userId;
        delete payload.userId;
      }

      // Handle specific field mapping for profiles
      if (table === 'settings') {
        if (payload.name) {
          payload.company_name = payload.name;
          delete payload.name;
        }
        if (payload.defaultTaxRate !== undefined) {
          payload.default_tax_rate = payload.defaultTaxRate;
          delete payload.defaultTaxRate;
        }
      }

      if (action === 'INSERT' || action === 'UPDATE') {
        const { error } = await supabase
          .from(supabaseTable)
          .upsert(payload);
        
        if (error) {
          console.error(`Error syncing ${table}:`, error);
          return false;
        }
      } else if (action === 'DELETE') {
        const { error } = await supabase
          .from(supabaseTable)
          .delete()
          .eq('id', data.id);
        
        if (error) {
          console.error(`Error deleting ${table}:`, error);
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error("Process item error:", e);
      return false;
    }
  }

  /**
   * Obter tamanho da fila de sincronização
   */
  async getQueueSize(): Promise<number> {
    try {
      return await db.syncQueue.count();
    } catch {
      return 0;
    }
  }

  /**
   * Processar a fila de sincronização manualmente
   */
  async processQueue(): Promise<void> {
    return this.sync();
  }

  // Initial pull from Supabase to local DB
  async pullFromSupabase(userId: string) {
    if (!userId || !navigator.onLine) return;

    try {
      const tables = ['receipts', 'transactions', 'clients', 'products', 'settings'];
      
      for (const table of tables) {
        let supabaseTable = table;
        if (table === 'settings') supabaseTable = 'profiles';

        const { data, error } = await supabase
          .from(supabaseTable)
          .select('*')
          .eq(supabaseTable === 'profiles' ? 'id' : 'user_id', userId);
        
        if (error) {
          console.error(`Error pulling ${table}:`, error);
          continue;
        }

        if (data) {
          const localTable = (db as any)[table];
          if (localTable) {
            const mappedData = data.map((d: any) => {
              const item = { ...d };
              // Map user_id back to userId
              if (item.user_id) {
                item.userId = item.user_id;
                delete item.user_id;
              }
              // Map profiles back to settings
              if (table === 'settings') {
                if (item.company_name) {
                  item.name = item.company_name;
                  delete item.company_name;
                }
                if (item.default_tax_rate !== undefined) {
                  item.defaultTaxRate = item.default_tax_rate;
                  delete item.default_tax_rate;
                }
                // Ensure id is userId for settings
                item.id = userId;
              }
              return item;
            });
            await localTable.bulkPut(mappedData);
          }
        }
      }
    } catch (e) {
      console.error("Pull error:", e);
    }
  }
}

export const syncService = new SyncService();
