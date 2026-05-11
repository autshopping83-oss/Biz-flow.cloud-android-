export type DocumentType = 'RECEIPT' | 'INVOICE' | 'QUOTE' | 'INVOICE_RECEIPT';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  id: string;
  type: DocumentType; 
  number: string;
  date: string;
  dueDate?: string; 
  
  // Localization
  currency: string; // e.g., 'USD', 'EUR', 'MZN'
  language: string; // 'pt', 'en', 'es', 'fr'

  // Client Info
  clientName: string;
  clientContact: string;
  clientLocation: string;
  clientNuit: string;
  
  // Company/Issuer Info
  companyName?: string;
  companyAddress?: string;
  companyNuit?: string;
  companyContact?: string;
  companyLogo?: string; // Base64
  
  // Items
  items: LineItem[];
  
  // Financials
  subtotal: number;
  taxRate: number; 
  taxAmount: number;
  discount: number; 
  total: number;
  paymentMethod?: string;
  
  // Visuals
  stampText?: string;
  signatureData?: string; 
  status?: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  documentTheme?: 'color' | 'bw'; // NOVO: tema do documento
  
  // Meta
  createdAt: number;
  pdfUrl?: string; // URL do PDF gerado
  synced?: boolean; // Status de sincronização
}

export type SubscriptionPlan = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface CompanySettings {
  name: string;
  address: string;
  nuit: string;
  contact: string;
  logo?: string;
  defaultTaxRate?: number;
  currency: string;
  language: string;
  theme?: 'light' | 'dark';
  plan: SubscriptionPlan;
  isAdmin?: boolean; // New field to track admin status
  customStamp?: string; // Base64 image for custom stamp
  signature?: string; // Base64 image for digital signature
}

export interface Comment {
  id: string;
  userName: string;
  userLogo?: string;
  content: string;
  timestamp: number;
  location?: string;
  likes: number;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO YYYY-MM-DD
  timestamp: number;
  receiptId?: string;
}

export interface SavedClient {
  name: string;
  contact: string;
  nuit: string;
  location: string;
  userId?: string;
}

export interface SavedProduct {
  description: string;
  unitPrice: number;
  userId?: string;
}

// --- NEW PRODUCT CATALOG INTERFACE ---
export interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  user_name: string;
  proof_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// --- DIGITAL GOODS API TYPES ---
export interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<ItemDetails[]>;
  listPurchases(): Promise<PurchaseDetails[]>;
  consume(purchaseToken: string): Promise<void>;
}

export interface ItemDetails {
  itemId: string;
  title: string;
  price: {
    currency: string;
    value: string;
  };
  description: string;
  type: 'subscription' | 'inapp';
}

export interface PurchaseDetails {
  itemId: string;
  purchaseToken: string;
  acknowledged: boolean;
  purchaseState: 'purchased' | 'pending';
}

export interface BluetoothPrinter {
  id: string;
  name: string;
  gatt?: {
    connect: () => Promise<any>;
    connected: boolean;
    disconnect: () => void;
    getPrimaryService: (uuid: string) => Promise<any>;
    getPrimaryServices: (uuid?: string) => Promise<any[]>;
  };
}

