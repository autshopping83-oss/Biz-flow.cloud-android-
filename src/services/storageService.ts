
import { ReceiptData, CompanySettings, DocumentType, Comment, Transaction, SavedClient, SavedProduct, Product } from '../types';
import { db } from './db';
import { syncService } from './syncService';

// Chaves de localStorage para fallback
const COMMENTS_KEY = 'bizflow_comments_v1';

// Migrate comments from localStorage to Dexie on first load
const migrateCommentsToDexie = async () => {
  try {
    const stored = localStorage.getItem(COMMENTS_KEY);
    if (stored) {
      const comments: Comment[] = JSON.parse(stored);
      if (comments.length > 0) {
        const existingCount = await db.comments.count();
        if (existingCount === 0) {
          await db.comments.bulkAdd(comments);
        }
        localStorage.removeItem(COMMENTS_KEY);
      }
    }
  } catch (e) {
    console.warn('Comments migration error:', e);
  }
};
migrateCommentsToDexie();

// --- GESTÃO DE DIRETÓRIOS LOCAIS (File System Access API) ---

export const saveDirectoryHandle = async (handle: any) => {
  try {
    const tx = db.transaction('rw', db.settings, () => {
       db.settings.put({ id: 'default_dir', handle } as any);
    });
  } catch (e) {
    console.error("Erro ao guardar handle da pasta", e);
  }
};

export const getDirectoryHandle = async () => {
  try {
    const item = await db.settings.get('default_dir');
    return item ? (item as any).handle : null;
  } catch (e) {
    return null;
  }
};

// --- CLIENTES SALVOS ---

export const getSavedClients = async (userId: string): Promise<SavedClient[]> => {
  if (!userId) return [];
  try {
    return await db.clients.where('userId').equals(userId).toArray();
  } catch (e) {
    return []; 
  }
};

export const getSavedProducts = async (userId: string): Promise<SavedProduct[]> => {
  if (!userId) return [];
  try {
    return await db.products.where('userId').equals(userId).toArray();
  } catch (e) {
    return [];
  }
};

// --- PRODUCT CATALOG CRUD FUNCTIONS ---

export const getProducts = async (userId: string): Promise<Product[]> => {
  if (!userId) return [];
  try {
    return await db.catalog.where('userId').equals(userId).sortBy('name');
  } catch (e) {
    return [];
  }
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  try {
    const newProduct: Product = {
      ...product,
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.catalog.add(newProduct);
    await syncService.addToQueue('catalog', 'INSERT', newProduct);

    return newProduct;
  } catch (e) {
    throw new Error('Erro ao adicionar produto');
  }
};

export const updateProduct = async (productId: string, updates: Partial<Pick<Product, 'name' | 'price' | 'category'>>): Promise<void> => {
  try {
    await db.catalog.update(productId, {
      ...updates,
      updatedAt: Date.now()
    });

    const updatedProduct = await db.catalog.get(productId);
    if (updatedProduct) {
      await syncService.addToQueue('catalog', 'UPDATE', updatedProduct);
    }
  } catch (e) {
    throw new Error('Erro ao atualizar produto');
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const product = await db.catalog.get(productId);
    if (product) {
      await db.catalog.delete(productId);
      await syncService.addToQueue('catalog', 'DELETE', product);
    }
  } catch (e) {
    throw new Error('Erro ao excluir produto');
  }
};

const learnClient = async (doc: ReceiptData, userId: string) => {
  if (!doc.clientName || !userId) return;
  try {
    const exists = await db.clients.where({ userId, name: doc.clientName }).first();
    if (!exists) {
      const newClient: SavedClient = {
        name: doc.clientName,
        contact: doc.clientContact,
        nuit: doc.clientNuit,
        location: doc.clientLocation,
        userId
      } as any;
      await db.clients.add(newClient);
      await syncService.addToQueue('clients', 'INSERT', newClient);
    }
  } catch (e) {}
};

const learnProducts = async (doc: ReceiptData, userId: string) => {
  if (!userId) return;
  try {
    for (const item of doc.items) {
      if (!item.description) continue;
      const exists = await db.products.where({ userId, description: item.description }).first();
      if (!exists) {
        const newProduct = { description: item.description, unitPrice: item.unitPrice, userId };
        await db.products.add(newProduct as any);
        await syncService.addToQueue('products', 'INSERT', newProduct);
      }
    }
  } catch (e) {}
};

export const saveReceipt = async (receipt: ReceiptData, userId: string): Promise<ReceiptData[]> => {
  if (!userId) return [];
  try {
    const dataWithUser = { ...receipt, userId };
    await db.receipts.put(dataWithUser);

    if (receipt.type === 'INVOICE_RECEIPT') {
      const transaction: Transaction = {
        id: `txn-${receipt.id}`,
        userId,
        type: 'INCOME',
        amount: receipt.total,
        description: `Venda ${receipt.number}`,
        category: 'Sales',
        date: receipt.date,
        timestamp: Date.now(),
        receiptId: receipt.id,
      };

      await db.transactions.put(transaction);
      await syncService.addToQueue('receipt_transaction_bundle', 'INSERT', { receipt: dataWithUser, transaction });
    } else {
      await syncService.addToQueue('receipts', 'INSERT', dataWithUser);
    }

    await learnClient(receipt, userId);
    await learnProducts(receipt, userId);
    
    return await getHistory(userId);
  } catch (e) {
    console.error("Save receipt error:", e);
    return [];
  }
};

export const deleteReceipt = async (id: string, userId: string): Promise<ReceiptData[]> => {
  if (!userId) return [];
  try {
    await db.receipts.delete(id);
    await syncService.addToQueue('receipts', 'DELETE', { id });
    return await getHistory(userId);
  } catch (e) {
    return [];
  }
};

export const getHistory = async (userId: string): Promise<ReceiptData[]> => {
  if (!userId) return [];
  try {
    return await db.receipts.where('userId').equals(userId).reverse().sortBy('date');
  } catch (e) {
    return [];
  }
};

export const checkDailyLimit = (userId: string): boolean => {
  return true;
};

export const generateNextReceiptNumber = (history: ReceiptData[], type: DocumentType): string => {
  let prefix = type === 'INVOICE' ? 'FAT' : type === 'INVOICE_RECEIPT' ? 'FAT-REC' : type === 'QUOTE' ? 'COT' : 'REC';
  const typeHistory = history.filter(h => (h.type || 'RECEIPT') === type);
  if (typeHistory.length === 0) return `${prefix}-0001`;
  const latest = typeHistory[0].number; 
  const parts = latest.split('-');
  if (parts.length === 2) {
    const num = parseInt(parts[1], 10);
    if (!isNaN(num)) return `${prefix}-${(num + 1).toString().padStart(4, '0')}`;
  }
  return `${prefix}-${(typeHistory.length + 1).toString().padStart(4, '0')}`;
};

export const saveCompanySettings = async (settings: CompanySettings, userId: string) => {
  if (!userId) return;
  const data = { ...settings, userId, id: userId };
  await db.settings.put(data as any);
  await syncService.addToQueue('settings', 'INSERT', data);
};

export const getCompanySettings = async (userId: string): Promise<CompanySettings | null> => {
  if (!userId) return null;
  const stored = await db.settings.get(userId);
  return stored ? stored as any : null;
};

export const getComments = async (): Promise<Comment[]> => {
  try {
    return await db.comments.orderBy('timestamp').reverse().toArray();
  } catch (e) {
    // Fallback to localStorage if Dexie fails
    const stored = localStorage.getItem(COMMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }
};

export const saveComment = async (comment: Comment): Promise<Comment[]> => {
  try {
    await db.comments.add(comment);
    return await getComments();
  } catch (e) {
    // Fallback to localStorage
    const current = localStorage.getItem(COMMENTS_KEY);
    const parsed = current ? JSON.parse(current) : [];
    const updated = [comment, ...parsed];
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(updated));
    return updated;
  }
};

export const deleteComment = async (commentId: string): Promise<Comment[]> => {
  try {
    await db.comments.delete(commentId);
    return await getComments();
  } catch (e) {
    // Fallback to localStorage
    const current = localStorage.getItem(COMMENTS_KEY);
    const parsed = current ? JSON.parse(current) : [];
    const updated = parsed.filter((c: Comment) => c.id !== commentId);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(updated));
    return updated;
  }
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  if (!userId) return [];
  return await db.transactions.where('userId').equals(userId).reverse().sortBy('date');
};

export const addTransaction = async (t: Transaction, userId: string): Promise<Transaction[]> => {
  if (!userId) return [];
  const data = { ...t, userId };
  await db.transactions.add(data);
  await syncService.addToQueue('transactions', 'INSERT', data);
  return await getTransactions(userId);
};

export const deleteTransaction = async (id: string, userId: string): Promise<Transaction[]> => {
  if (!userId) return [];
  await db.transactions.delete(id);
  await syncService.addToQueue('transactions', 'DELETE', { id });
  return await getTransactions(userId);
};
