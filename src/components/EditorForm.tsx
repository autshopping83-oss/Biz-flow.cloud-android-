
import React from 'react';
import { ReceiptData, LineItem, DocumentType, SavedClient, SavedProduct, Product } from '../types';
import { ProductSearch } from './ProductSearch';
import { productService } from '../services/productService';
import { useToast } from './ToastContext';
import { n8nWebhookService } from '../services/n8nWebhookService';

interface EditorFormProps {
  formData: ReceiptData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  newItem: Partial<LineItem>;
  onNewItemChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onEnhanceDescription: () => void;
  isEnhancing: boolean;
  t: (key: any) => string;
  fMoney: (val: number) => string;
  onInitNew: (type: DocumentType) => void;
  onSign: () => void;
  statusOptions: string[];
  onClearClient: () => void;
  savedClients: SavedClient[];
  savedProducts: SavedProduct[];
  onConvertQuote?: () => void;
  userId?: string;
  onThemeChange?: (theme: 'color' | 'bw') => void;
}

// --- HELPER COMPONENTS (Moved outside to prevent re-render focus loss) ---

const Section = ({ title, icon, children, action }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6 animate-fadeIn">
    <div className="bg-slate-50 dark:bg-slate-800 px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-blue-500 text-xs">
              <i className={`fa-solid ${icon}`}></i>
          </div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-5 space-y-4">
      {children}
    </div>
  </div>
);

const Input = ({ label, icon, ...props }: any) => (
  <div className="relative">
    {label && <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              <i className={`fa-solid ${icon}`}></i>
          </div>
        )}
        <input 
          {...props} 
          className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg ${icon ? 'pl-9 pr-3' : 'px-3'} py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-slate-400`} 
        />
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const EditorForm: React.FC<EditorFormProps> = ({
  formData, onChange, newItem, onNewItemChange, onAddItem, onRemoveItem,
  onEnhanceDescription, isEnhancing, t, fMoney, onInitNew, onSign, statusOptions, onClearClient,
  savedClients, savedProducts, onConvertQuote, userId, onThemeChange
}) => {

  // State for new product save modal
  const [showSaveProductModal, setShowSaveProductModal] = React.useState(false);
  const [pendingItem, setPendingItem] = React.useState<Partial<LineItem> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = React.useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = React.useState<Product | null>(null);
  const { notify } = useToast();

  const handleProductSelect = (product: Product) => {
    // When a product is selected from catalog, set its details in the new item
    const event = {
      target: {
        name: 'description',
        value: product.name
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onNewItemChange(event);
    
    const priceEvent = {
      target: {
        name: 'unitPrice',
        value: product.price.toString()
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onNewItemChange(priceEvent);
    
    setSelectedCatalogProduct(product);
  };

  const handleProductSearch = (value: string) => {
    const event = {
      target: {
        name: 'description',
        value
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onNewItemChange(event);
  };

  const handleShowNewProductModal = (productName: string) => {
    setPendingItem({
      ...newItem,
      description: productName
    });
    setShowSaveProductModal(true);
  };

  const handleSaveProductAndAdd = async () => {
    if (!pendingItem || !userId) return;

    setIsSavingProduct(true);
    try {
      const newProduct = await productService.createProduct(
        pendingItem.description || '',
        pendingItem.unitPrice || 0,
        userId,
        ''  // No category for now
      );

      notify(`Produto "${newProduct.name}" salvo no catálogo`, 'success');
      setShowSaveProductModal(false);
      setPendingItem(null);
      onAddItem();
    } catch (error) {
      console.error('Error saving product:', error);
      notify('Erro ao salvar produto', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleAddWithoutSaving = () => {
    setShowSaveProductModal(false);
    setPendingItem(null);
    onAddItem();
  };

  const handleAddItem = () => {
    if (!newItem.description?.trim()) return;

    // Check if product exists in catalog
    const existingProduct = savedProducts.find(p =>
      p.description.toLowerCase() === newItem.description!.toLowerCase()
    );

    if (!existingProduct) {
      // Product doesn't exist, show save modal
      setPendingItem(newItem);
      setShowSaveProductModal(true);
    } else {
      // Product exists, add directly
      onAddItem();
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
       
       {/* Type Switcher */}
       <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl flex text-sm font-bold shadow-inner">
          <button 
            onClick={() => formData.type !== 'INVOICE' && onInitNew('INVOICE')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${formData.type === 'INVOICE' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-file-invoice"></i> {t('invoice')}
          </button>
          <button 
            onClick={() => formData.type !== 'INVOICE_RECEIPT' && onInitNew('INVOICE_RECEIPT')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${formData.type === 'INVOICE_RECEIPT' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-file-invoice-dollar"></i> {t('invoiceReceipt')}
          </button>
          <button 
            onClick={() => formData.type !== 'RECEIPT' && onInitNew('RECEIPT')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${formData.type === 'RECEIPT' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-receipt"></i> {t('receipt')}
          </button>
          <button 
            onClick={() => formData.type !== 'QUOTE' && onInitNew('QUOTE')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${formData.type === 'QUOTE' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-clipboard-list"></i> {t('quote')}
          </button>
       </div>
       
       {/* Quote Conversion Banner */}
       {formData.type === 'QUOTE' && onConvertQuote && (
         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex justify-between items-center animate-fadeIn">
           <div className="text-sm text-blue-800 dark:text-blue-200 font-medium flex items-center gap-2">
             <i className="fa-solid fa-circle-info"></i> Orçamento Provisório
           </div>
           <button onClick={onConvertQuote} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-transform hover:scale-105">
             {t('convertToInvoice')}
           </button>
         </div>
       )}

       {/* Dates Section */}
       <div className="grid grid-cols-2 gap-4">
          <Input type="date" name="date" value={formData.date} onChange={onChange} label={t('date')} icon="fa-calendar" />
          {(formData.type === 'INVOICE' || formData.type === 'QUOTE') && (
             <Input type="date" name="dueDate" value={formData.dueDate || ''} onChange={onChange} label={formData.type === 'QUOTE' ? t('validUntil') : t('dueDate')} icon="fa-hourglass-half" style={{borderColor: '#FECACA'}} />
          )}
       </div>

       <Section 
          title={t('client')} 
          icon="fa-user-tie"
          action={
            <button 
                onClick={onClearClient}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
                <i className="fa-solid fa-plus"></i> {t('addClient')}
            </button>
          }
        >
          {/* Client Autocomplete */}
          <Input 
            name="clientName" 
            value={formData.clientName} 
            onChange={onChange} 
            placeholder="Nome do Cliente / Empresa" 
            list="client-list" 
            autoComplete="off"
            icon="fa-magnifying-glass"
          />
          <datalist id="client-list">
            {savedClients.map((c, i) => <option key={i} value={c.name} />)}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Input name="clientContact" value={formData.clientContact} onChange={onChange} placeholder="Email / Telefone" icon="fa-address-book" />
             <Input name="clientNuit" value={formData.clientNuit} onChange={onChange} placeholder="Tax ID / Reg. No." icon="fa-id-card" />
          </div>
          <Input name="clientLocation" value={formData.clientLocation} onChange={onChange} placeholder="Endereço / Cidade" icon="fa-location-dot" />
       </Section>

       <Section title={t('items')} icon="fa-boxes-stacked">
          {/* Existing Items */}
          <div className="space-y-2">
             {formData.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between group p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                   <div className="flex-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.description}</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                         <span className="bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{item.quantity}</span> x {fMoney(item.unitPrice)}
                      </p>
                   </div>
                   <div className="text-right pl-4">
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm font-mono">{fMoney(item.total)}</p>
                      <button onClick={() => onRemoveItem(item.id)} className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash"></i></button>
                   </div>
                </div>
             ))}
             {formData.items.length === 0 && <div className="text-center py-6 text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">Nenhum item adicionado</div>}
          </div>

          {/* Add New Item */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 shadow-sm">
              <div className="flex gap-2 mb-3">
                 <div className="flex-1">
                   {userId ? (
                     <ProductSearch
                       value={newItem.description || ''}
                       onChange={handleProductSearch}
                       onSelect={handleProductSelect}
                       onNewProduct={handleShowNewProductModal}
                       userId={userId}
                       placeholder="Digite o nome do produto..."
                       icon="fa-search"
                       currency={formData.currency}
                       allowCreate={true}
                       showNewProductModal={handleShowNewProductModal}
                     />
                   ) : (
                     <input
                       name="description"
                       value={newItem.description}
                       onChange={onNewItemChange}
                       placeholder="Digite o nome do produto..."
                       className="w-full bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 pl-3 pr-10 text-sm outline-none focus:border-blue-500 transition-colors"
                       autoComplete="off"
                     />
                   )}
                 </div>
                 <button
                   onClick={onEnhanceDescription}
                   disabled={isEnhancing || !newItem.description}
                   className="w-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition"
                   title="Melhorar com IA"
                 >
                    {isEnhancing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                 </button>
              </div>

              <div className="flex gap-2 items-stretch">
                  <input
                    type="number" name="quantity" min="1"
                    value={newItem.quantity} onChange={onNewItemChange}
                    className="w-[70px] bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 text-sm text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="Qtd"
                  />

                  {/* Price + Button Group (Merged) */}
                  <div className="flex flex-1 relative isolate min-w-0">
                      <input
                        type="number" name="unitPrice" min="0"
                        value={newItem.unitPrice} onChange={onNewItemChange}
                        className="flex-1 min-w-0 bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-l-lg rounded-r-none border-r-0 p-2.5 text-sm focus:z-10 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="Preço"
                      />
                      <button
                        onClick={handleAddItem} 
                        className="flex-none w-14 bg-blue-600 text-white rounded-r-lg rounded-l-none text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center z-0 active:bg-blue-800"
                        title="Adicionar"
                      >
                        <i className="fa-solid fa-plus text-lg"></i>
                      </button>
                  </div>
              </div>
          </div>
       </Section>

       {/* Theme Selector */}
       <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 flex shadow-sm">
          <button
            onClick={() => onThemeChange?.('color')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              formData.documentTheme === 'color' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-palette"></i> Colorido
          </button>
          <button
            onClick={() => onThemeChange?.('bw')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              formData.documentTheme === 'bw' 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-circle"></i> Preto & Branco
          </button>
       </div>

       <Section title="Totais & Estado" icon="fa-calculator">
           <div className="space-y-3 text-sm">
               <div className="flex justify-between text-slate-500 dark:text-slate-400">
                   <span>{t('subtotal')}</span>
                   <span className="font-mono font-medium">{fMoney(formData.subtotal)}</span>
               </div>
               <div className="flex justify-between items-center">
                   <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       {t('tax')} %
                       <input type="number" name="taxRate" value={formData.taxRate} onChange={onChange} className="w-14 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 text-center text-xs font-bold" />
                   </span>
                   <span className="font-mono text-slate-700 dark:text-slate-300">+ {fMoney(formData.taxAmount)}</span>
               </div>
               <div className="flex justify-between items-center">
                   <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       {t('discount')}
                       <input type="number" name="discount" value={formData.discount} onChange={onChange} className="w-16 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 text-center text-xs font-bold" />
                   </span>
                   <span className="font-mono text-green-600 dark:text-green-400">- {fMoney(formData.discount)}</span>
               </div>
               <div className="flex justify-between items-center pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 mt-2">
                   <span className="font-bold text-slate-900 dark:text-white text-base uppercase tracking-tight">{t('finalTotal')}</span>
                   <span className="font-black text-blue-600 dark:text-blue-400 text-2xl tracking-tight">{fMoney(formData.total)}</span>
               </div>
           </div>

           <div className="pt-4 grid grid-cols-2 gap-4 mt-2">
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('status')}</label>
                  <div className="relative">
                      <i className="fa-solid fa-tag absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
                      <select name="stampText" value={formData.stampText || ''} onChange={onChange} className="w-full bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-2 py-2.5 text-sm font-medium appearance-none cursor-pointer hover:border-slate-300 transition-colors">
                          {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                  </div>
               </div>
               <div>
                 {formData.type === 'INVOICE_RECEIPT' && (
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('paymentMethod')}</label>
                     <div className="relative">
                         <i className="fa-solid fa-dollar-sign absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
                         <select name="paymentMethod" value={formData.paymentMethod || ''} onChange={onChange} className="w-full bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-2 py-2.5 text-sm font-medium appearance-none cursor-pointer hover:border-slate-300 transition-colors">
                           <option value="">{t('selectPayment')}</option>
                           <option value="CASH">{t('cash')}</option>
                           <option value="CARD">{t('card')}</option>
                           <option value="BANK_TRANSFER">{t('bankTransfer')}</option>
                         </select>
                     </div>
                   </div>
                 )}
               </div>
               <button onClick={onSign} className={`w-full mt-auto h-[42px] rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 shadow-sm ${formData.signatureData ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                   <i className="fa-solid fa-pen-nib"></i> {formData.signatureData ? 'Assinado' : 'Assinar'}
               </button>
           </div>
       </Section>

       {/* Enviar Documento via Webhook */}
       <Section title="Enviar Documento" icon="fa-paper-plane">
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
             Envie este documento diretamente para o cliente via Email ou WhatsApp usando integração n8n.
           </p>
           <div className="grid grid-cols-2 gap-3">
             <button
               onClick={async () => {
                 if (!formData.clientContact) {
                   notify("Adicione um contacto do cliente primeiro", "error");
                   return;
                 }
                 notify("Enviando via WhatsApp...", "info");
                 const result = await n8nWebhookService.shareDocument(formData, 'whatsapp', formData.clientContact, userId);
                 if (result.success) {
                   notify("Documento enviado via WhatsApp com sucesso!", "success");
                 } else {
                   notify("Erro ao enviar. Verifique a integração n8n.", "error");
                 }
               }}
               className="bg-[#25D366] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#20bd5a] transition-all active:scale-95 shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2"
             >
               <i className="fa-brands fa-whatsapp text-lg"></i>
               WhatsApp
             </button>
             <button
               onClick={async () => {
                 if (!formData.clientContact) {
                   notify("Adicione um email do cliente primeiro", "error");
                   return;
                 }
                 notify("Enviando via Email...", "info");
                 const result = await n8nWebhookService.shareDocument(formData, 'email', formData.clientContact, userId);
                 if (result.success) {
                   notify("Documento enviado via Email com sucesso!", "success");
                 } else {
                   notify("Erro ao enviar. Verifique a integração n8n.", "error");
                 }
               }}
               className="bg-blue-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
             >
               <i className="fa-solid fa-envelope text-lg"></i>
               Email
             </button>
           </div>
       </Section>

       {/* Save New Product Modal */}
       {showSaveProductModal && pendingItem && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
             <div className="p-6">
               <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                   <i className="fa-solid fa-box text-blue-600 dark:text-blue-400 text-2xl"></i>
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                   Produto Novo Detectado
                 </h3>
                 <p className="text-slate-600 dark:text-slate-400 text-sm">
                   "{pendingItem.description}" não está no seu catálogo. Salvá-lo facilitará futuras vendas!
                 </p>
               </div>

               <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6 space-y-3">
                 <div>
                   <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Produto</span>
                   <div className="text-sm font-medium text-slate-900 dark:text-white mt-1 p-2 bg-white dark:bg-slate-700 rounded-lg">
                     {pendingItem.description}
                   </div>
                 </div>
                 <div>
                   <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Preço Base</span>
                   <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 p-2 bg-white dark:bg-slate-700 rounded-lg">
                     {fMoney(pendingItem.unitPrice || 0)}
                   </div>
                 </div>
               </div>

               <div className="flex gap-3">
                 <button
                   onClick={handleSaveProductAndAdd}
                   disabled={isSavingProduct}
                   className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                 >
                   {isSavingProduct ? (
                     <><i className="fa-solid fa-spinner animate-spin"></i> Salvando...</>
                   ) : (
                     <><i className="fa-solid fa-save"></i> Salvar e Adicionar</>
                   )}
                 </button>
                 <button
                   onClick={handleAddWithoutSaving}
                   className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                 >
                   Apenas Adicionar
                 </button>
               </div>
               <button
                 onClick={() => setShowSaveProductModal(false)}
                 className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mt-3 py-2 transition-colors"
               >
                 Cancelar
               </button>
             </div>
           </div>
         </div>
       )}

    </div>
  );
};
