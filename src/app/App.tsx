

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ReceiptData, CompanySettings, DocumentType, LineItem, SavedClient, SavedProduct, BluetoothPrinter } from '../types';
import { Logo } from '../components/Logo';
import { useToast } from '../components/ToastContext';
import { useSignatureCanvas } from './hooks/useSignatureCanvas';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { useDocumentActions } from './hooks/useDocumentActions';

// Services
import { saveReceipt, getHistory, generateNextReceiptNumber, saveCompanySettings, getCompanySettings, getSavedClients, getSavedProducts, deleteReceipt } from '../services/storageService';
import { improveDescription } from '../services/geminiService';
import { getTranslation, formatMoney, CURRENCIES, LANGUAGES } from '../services/translationService';
import { orgService } from '../services/orgService';
import { supabase } from '../services/supabaseClient';
import { syncService } from '../services/syncService';
import { productService } from '../services/productService';
import { validators } from '../utils/validators';
import { DocumentShareModal } from '../components/DocumentShareModal';
import { SettingsModal } from '../components/SettingsModal';

// --- LAZY COMPONENTS (Code Splitting) ---
const DocumentPreview = lazy(() => import('../components/ReceiptPreview'));
const Dashboard = lazy(() => import('../components/Dashboard').then(module => ({ default: module.Dashboard })));
const AuthScreens = lazy(() => import('../components/AuthScreens').then(module => ({ default: module.AuthScreens })));
const EditorForm = lazy(() => import('../components/EditorForm').then(module => ({ default: module.EditorForm })));
const AdminDashboard = lazy(() => import('../components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const DeleteAccount = lazy(() => import('../components/DeleteAccount').then(module => ({ default: module.DeleteAccount })));
const HistoryPage = lazy(() => import('../components/HistoryPage').then(module => ({ default: module.HistoryPage })));
const ApiDocs = lazy(() => import('../components/ApiDocs').then(module => ({ default: module.ApiDocs })));
const ApiDashboard = lazy(() => import('../components/ApiDashboard').then(module => ({ default: module.ApiDashboard })));

declare global {
  interface Window {
    showDirectoryPicker?: any;
    deferredPrompt?: any; 
  }
}

const PageLoader = () => (
  <div className="fixed top-0 left-0 w-full h-full bg-white dark:bg-slate-900 z-[9999] flex flex-col items-center justify-center">
     <Logo className="w-20 h-20 mb-6 animate-pulse" />
     <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 animate-spin"></div>
     <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider">Carregando...</p>
  </div>
);

const InitialReceipt: ReceiptData = {
  id: '',
  type: 'RECEIPT', 
  number: '',
  date: new Date().toISOString().split('T')[0],
  currency: 'MZN',
  language: 'pt',
  clientName: '',
  clientContact: '',
  clientLocation: '',
  clientNuit: '',
  items: [],
  subtotal: 0,
  taxRate: 0,
  taxAmount: 0,
  discount: 0,
  total: 0,
  stampText: 'PAGO',
  signatureData: '',
  documentTheme: 'color',
  createdAt: Date.now(),
};

const DefaultSettings: CompanySettings = {
  name: '', address: '', contact: '', nuit: '', logo: '', defaultTaxRate: 16, currency: 'MZN', language: 'pt', theme: 'light', plan: 'PRO', isAdmin: false
};

interface AppProps {
  onReady?: () => void;
}

const App: React.FC<AppProps> = ({ onReady }) => {
  const [currentView, setCurrentView] = useState<any>('loading'); 
  const [isGuest, setIsGuest] = useState(false);
  const [history, setHistory] = useState<ReceiptData[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DefaultSettings);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [formData, setFormData] = useState<ReceiptData>(InitialReceipt);
  const [newItem, setNewItem] = useState<Partial<LineItem>>({ description: '', quantity: 1, unitPrice: 0 });
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const ghostReceiptRef = useRef<HTMLDivElement>(null); 
  const thermalReceiptRef = useRef<HTMLDivElement>(null);
  const { canvasRef, settingsSignatureCanvasRef, clearCanvas, getCanvasDataUrl, handleSettingsSignatureStartDrawing, handleSettingsSignatureDraw, handleSettingsSignatureStopDrawing } = useSignatureCanvas(showSignatureModal);
  const { notify } = useToast(); 

  const t = (key: any) => getTranslation(companySettings.language, key);
  const fMoney = (val: number) => formatMoney(val, companySettings.currency, companySettings.language);

  const { initializeUserData } = useAppLifecycle({
    currentView,
    isGuest,
    setCurrentView,
    setIsGuest,
    setSession,
    setHistory,
    setSavedClients,
    setSavedProducts,
    setCompanySettings,
    setIsOnline,
    setSyncing,
    setLocalDirHandle,
    onReady,
  });

  const handleUpdateSettings = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const handleUpdateSettings = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCompanySettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CRÍTICA #5: File Upload RCE - Validar tipo/tamanho
    const validation = validators.imageFile(file);
    if (!validation.valid) {
      notify(validation.error || "Arquivo inválido", "error");
      return;
    }

    if (!file.type.startsWith('image/')) {
      notify("Apenas imagens permitidas", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result.length > 3 * 1024 * 1024) {
        notify("Arquivo convertido muito grande", "error");
        return;
      }
      setCompanySettings(prev => ({ ...prev, logo: result }));
      notify("Logo carregado com sucesso!", "success");
    };
    reader.onerror = () => {
      notify("Erro ao ler arquivo", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    if (!session?.user?.id) return;
    setIsSavingSettings(true);
    try {
      await saveCompanySettings(companySettings, session.user.id);
      notify("Definições da empresa guardadas com sucesso!", "success");
      setShowSettingsModal(false);
    } catch (err: any) {
      // SEGURANÇA: Mensagem genérica - não expor detalhes do erro
      notify("Erro ao guardar definições. Tente novamente.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // SEGURANÇA: Validar tipo e tamanho do arquivo
    const validation = validators.imageFile(file);
    if (!validation.valid) {
      notify(validation.error || "Arquivo inválido", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result.length > 3 * 1024 * 1024) {
        notify("Arquivo convertido muito grande", "error");
        return;
      }
      setCompanySettings(prev => ({ ...prev, customStamp: result }));
      notify("Carimbo personalizado carregado!", "success");
    };
    reader.onerror = () => {
      notify("Erro ao ler arquivo", "error");
    };
    reader.readAsDataURL(file);
  };

  const saveSettingsSignature = () => {
    const signatureData = getCanvasDataUrl(settingsSignatureCanvasRef.current);
    if (signatureData) {
      setCompanySettings(prev => ({ ...prev, signature: signatureData }));
      notify("Assinatura padrão guardada!", "success");
    }
  };

  const clearSettingsSignature = () => {
    clearCanvas(settingsSignatureCanvasRef.current);
  };


  const [showShareModal, setShowShareModal] = useState(false);

  const openShareModal = () => {
    setShowShareModal(true);
  };

  const handleSave = async (silent = false) => {
    if (!session?.user?.id) return;
    if (!formData.clientName || formData.items.length === 0) return;
    const newHistory = await saveReceipt(formData, session.user.id);
    setHistory(newHistory);
    if (!silent) notify("Dados sincronizados.", 'success');
  };


  const { isGeneratingPdf, isSharing, isPrinting, localDirHandle, requestFolderPermission, handleGeneratePDF, handleShareWhatsApp, handlePrintThermal } = useDocumentActions({
    formData,
    sessionUserId: session?.user?.id,
    receiptRef,
    ghostReceiptRef,
    thermalReceiptRef,
    notify,
    handleSave,
  });

  const initNewDocument = (type: DocumentType) => {
    if (!session?.user?.id && !isGuest) return;
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      ...InitialReceipt, 
      id: crypto.randomUUID(), 
      type, 
      number: generateNextReceiptNumber(history, type), 
      date: today,
      taxRate: type === 'INVOICE' ? companySettings.defaultTaxRate || 0 : 0,
      currency: companySettings.currency, 
      language: companySettings.language, 
      companyName: companySettings.name,
      companyAddress: companySettings.address, 
      companyContact: companySettings.contact, 
      companyNuit: companySettings.nuit, 
      companyLogo: companySettings.logo,
    });
    setMobileTab('editor');
    setCurrentView('app');
  };

  const handleDuplicateDocument = (doc: ReceiptData) => {
    const newDoc = { ...doc } as any;
    delete newDoc.pdfUrl;
    delete newDoc.synced;
    setFormData({
        ...newDoc,
        id: crypto.randomUUID(),
        number: generateNextReceiptNumber(history, doc.type),
        date: new Date().toISOString().split('T')[0],
    });
    setCurrentView('app');
    notify('Documento duplicado com novo número e data.', 'info');
  }

  const toggleTheme = () => {
      const newTheme = companySettings.theme === 'dark' ? 'light' : 'dark';
      setCompanySettings(p => ({ ...p, theme: newTheme }));
      if (session?.user?.id) {
          supabase.from('profiles').update({ theme: newTheme }).eq('id', session.user.id);
      }
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setIsGuest(false); 
    setSession(null);
    setCurrentView('login'); 
  };

  const handleLogin = async (email: string, pass: string) => {
    // CRÍTICA #13: Email Validation
    if (!email.trim() || !validators.email(email)) {
      notify("Email inválido", "error");
      return;
    }

    if (!pass || pass.length < 6) {
      notify("Senha deve ter pelo menos 6 caracteres", "error");
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(),
        password: pass 
      });
      if (error) throw error;
      notify("Login bem-sucedido!", "success");
    } catch (e: any) {
      // CRÍTICA #7: Mensagens de erro genéricas
      if (e.message?.includes('Invalid login credentials')) {
        notify("Email ou senha incorretos", "error");
      } else {
        notify("Erro ao fazer login. Tente novamente.", "error");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (email: string, pass: string, data: any) => {
    // SEGURANÇA: Validar email antes de enviar
    if (!email.trim() || !validators.email(email)) {
      notify("Email inválido", "error");
      return;
    }

    // Validar força da senha
    const passwordValidation = validators.password(pass);
    if (!passwordValidation.valid) {
      notify(`Senha fraca. Necessário: ${passwordValidation.errors.join(', ')}`, "error");
      return;
    }

    setAuthLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password: pass,
        options: {
          data: {
            full_name: data?.name?.trim() || '',
            company_name: data?.companyName?.trim() || ''
          }
        }
      });
      if (error) throw error;
      
      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          company_name: data?.companyName?.trim() || '',
          address: data?.address?.trim() || '',
          currency: data?.currency || 'MZN',
          language: data?.language || 'pt',
          logo: data?.logo || null
        });
      }
      
      notify("Conta criada! Verifique seu email para confirmar.", "success");
    } catch (e: any) {
      // SEGURANÇA: Mensagens genéricas - não expor detalhes do servidor
      if (e.message?.includes('already registered')) {
        notify("Este email já está registado", "error");
      } else {
        notify("Erro no registo. Tente novamente mais tarde.", "error");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const clearSignature = () => {
    clearCanvas(canvasRef.current);
  };

  const saveSignature = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const blank = document.createElement('canvas');
          blank.width = canvas.width;
          blank.height = canvas.height;
          if (canvas.toDataURL() === blank.toDataURL()) {
              notify("A assinatura está vazia.", "info");
              return;
          }
          const dataUrl = canvas.toDataURL('image/png');
          setFormData(p => ({ ...p, signatureData: dataUrl }));
          setShowSignatureModal(false);
          notify("Assinatura guardada!", "success");
      }
  };
  
  return (
    <Suspense fallback={<PageLoader />}>
      {currentView === 'deleteAccount' && (
          <DeleteAccount onBack={() => { window.location.href = '/'; }} />
      )}

      {currentView === 'loading' && <PageLoader />}

      {['login', 'register', 'forgotPassword', 'updatePassword'].includes(currentView) && (
        <AuthScreens 
          view={currentView} 
          setView={setCurrentView} 
          onLogin={handleLogin} 
          onRegister={handleRegister} 
          onGoogleLogin={() => supabase.auth.signInWithOAuth({provider: 'google'})} 
          isLoading={authLoading} 
          onInstall={handleInstallApp}
          showInstallButton={!!installPrompt}
        />
      )}

      {currentView === 'home' && !isGuest && (
        <Dashboard 
          history={history} companySettings={companySettings} onLogout={handleLogout} onNewDocument={initNewDocument}
          onOpenSettings={() => setShowSettingsModal(true)} onLoadDocument={(doc) => { setFormData(doc); setCurrentView('app'); setMobileTab('preview'); }}
          onViewHistory={() => setCurrentView('history')} onToggleTheme={toggleTheme} t={t} userId={session?.user?.id || ''}
          onDeleteDocument={async (id) => {
             const updated = await deleteReceipt(id, session.user.id);
             setHistory(updated);
          }}
          onInstallApp={handleInstallApp}
          showInstallButton={!!installPrompt}
        />
      )}

      {currentView === 'history' && !isGuest && (
          <HistoryPage 
              history={history} 
              onBack={() => setCurrentView('home')} 
              onLoadDocument={(doc) => { setFormData(doc); setCurrentView('app'); }}
              onDeleteDocument={async (id) => {
                const updated = await deleteReceipt(id, session.user.id);
                setHistory(updated);
              }}
              onDuplicateDocument={handleDuplicateDocument}
              currency={companySettings.currency}
              lang={companySettings.language}
          />
      )}

      {currentView === 'apiDocs' && (
        <ApiDocs onBack={() => setCurrentView('login')} initialTab="general" />
      )}

      {currentView === 'apiDashboard' && (
        <ApiDashboard
          userId={session?.user?.id}
          onBack={() => setCurrentView('home')}
          onOpenDocs={() => setCurrentView('apiDocs')}
        />
      )}
      
      {(currentView === 'app' || isGuest) && (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col h-screen overflow-hidden transition-colors duration-500">
           <header className="bg-white dark:bg-slate-900 h-16 flex-none shadow-sm z-30 border-b dark:border-slate-800 transition-colors">
              <div className="max-w-[1600px] mx-auto px-4 h-full flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <button onClick={() => isGuest ? setCurrentView('login') : setCurrentView('home')} className="text-slate-400 hover:text-slate-900 dark:hover:text-white w-8 h-8 flex items-center justify-center transition-colors"><i className={`fa-solid ${isGuest ? 'fa-home' : 'fa-arrow-left'}`}></i></button>
                    
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-colors ${isOnline ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                      {syncing ? 'Sincronizando...' : (isOnline ? 'Online' : 'Offline')}
                    </div>
                  </div>
                 <div className="flex gap-2">
                    <button onClick={() => setShowSettingsModal(true)} className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-transform active:scale-90 bg-slate-50 dark:bg-slate-800"><i className="fa-solid fa-gear"></i></button>
                    
                    <button onClick={handleShareWhatsApp} disabled={isSharing} className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-black shadow-xl shadow-[#25D366]/20 flex items-center gap-2 hover:bg-[#20bd5a] transition-all active:scale-95 disabled:opacity-50">
                       {isSharing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-brands fa-whatsapp text-lg"></i>} 
                       <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    <button onClick={openShareModal} disabled={isPrinting || isGeneratingPdf} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-black shadow-xl shadow-blue-600/20 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                       {(isPrinting || isGeneratingPdf) ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-share-nodes"></i>} 
                       <span className="hidden lg:inline">Compartilhar</span>
                    </button>
                 </div>
              </div>
           </header>
           
           <div className="md:hidden flex bg-white dark:bg-slate-900 border-b dark:border-slate-800 h-14 transition-colors">
              <button onClick={() => setMobileTab('editor')} className={`flex-1 font-black text-xs tracking-widest ${mobileTab === 'editor' ? 'text-blue-600 border-b-[3px] border-blue-600' : 'text-slate-400'}`}>1. DADOS</button>
              <button onClick={() => setMobileTab('preview')} className={`flex-1 font-black text-xs tracking-widest ${mobileTab === 'preview' ? 'text-blue-600 border-b-[3px] border-blue-600' : 'text-slate-400'}`}>2. PRÉVIA A4</button>
           </div>

           <div className="flex-grow flex overflow-hidden max-w-[1600px] mx-auto w-full transition-colors">
              <div className={`w-full md:w-[450px] bg-white dark:bg-slate-900 border-r dark:border-slate-800 overflow-y-auto transition-colors ${mobileTab === 'preview' ? 'hidden md:block' : 'block'}`}>
                 <div className="p-6">
                    <EditorForm 
                       formData={formData} onChange={(e) => {
                          const { name, value } = e.target;
                          setFormData(p => ({...p, [name]: value}));
                       }} 
                       newItem={newItem} onNewItemChange={(e) => {
                          const { name, value } = e.target;
                          setNewItem(p => ({...p, [name]: value}));
                       }}
                       onAddItem={() => { 
                          if (!newItem.description) return;
                          const q = Number(newItem.quantity) || 1;
                          const p = Number(newItem.unitPrice) || 0;
                          setFormData(prev => ({
                            ...prev, 
                            items: [...prev.items, { 
                              id: crypto.randomUUID(), 
                              description: newItem.description!, 
                              quantity: q, 
                              unitPrice: p, 
                              total: q * p 
                            }]
                          })); 
                          setNewItem({description:'', quantity:1, unitPrice:0}); 
                       }} 
                       onRemoveItem={(id) => setFormData(p => ({...p, items: p.items.filter(i => i.id !== id)}))}
                       onEnhanceDescription={async () => { setIsEnhancing(true); const res = await improveDescription(newItem.description || ''); setNewItem(p => ({...p, description: res})); setIsEnhancing(false); }}
                       isEnhancing={isEnhancing} t={t} fMoney={fMoney} onInitNew={initNewDocument} onSign={() => setShowSignatureModal(true)}
                       statusOptions={['PAGO', 'EMITIDO', 'PENDENTE', 'ANULADO']}
                       onClearClient={() => setFormData(p => ({...p, clientName:'', clientContact:'', clientLocation:'', clientNuit:''}))}
                       savedClients={savedClients} savedProducts={savedProducts}
                       onThemeChange={(theme) => setFormData(p => ({ ...p, documentTheme: theme }))}
                       userId={session?.user?.id}
                    />
                 </div>
              </div>
              <div className={`flex-grow bg-slate-200 dark:bg-slate-950 overflow-y-auto flex flex-col items-center p-4 md:p-10 transition-colors ${mobileTab === 'editor' ? 'hidden md:flex' : 'flex'}`}>
                 <div className="bg-white shadow-2xl origin-top mb-10 overflow-hidden transition-shadow" style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                   <DocumentPreview data={formData} companySettings={companySettings} ref={receiptRef} captureId="receipt-preview-main" />
                 </div>
              </div>
           </div>

           <div className="fixed top-0 left-0 pointer-events-none opacity-0" style={{ zIndex: -100 }}>
             <div style={{ position: 'absolute', top: 0, left: '-9999px' }}>
                <DocumentPreview data={formData} companySettings={companySettings} ref={ghostReceiptRef} captureId="receipt-capture-ghost" layout="a4" />
             </div>
             <div style={{ position: 'absolute', top: 0, left: '-9999px' }}>
                <DocumentPreview data={formData} companySettings={companySettings} ref={thermalReceiptRef} captureId="receipt-thermal-ghost" layout="thermal" />
             </div>
           </div>
        </div>
      )}

      {showSettingsModal && (
        <SettingsModal
          companySettings={companySettings}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={handleUpdateSettings}
          onLogoChange={handleLogoChange}
          onStampUpload={handleStampUpload}
          onRequestFolderPermission={requestFolderPermission}
          onSaveSettings={handleSaveSettings}
          isSavingSettings={isSavingSettings}
          localDirHandle={localDirHandle}
          onSaveSignature={saveSettingsSignature}
          onClearSignature={clearSettingsSignature}
          settingsSignatureCanvasRef={settingsSignatureCanvasRef}
          handleSettingsSignatureStartDrawing={handleSettingsSignatureStartDrawing}
          handleSettingsSignatureDraw={handleSettingsSignatureDraw}
          handleSettingsSignatureStopDrawing={handleSettingsSignatureStopDrawing}
        />
      )}

      {showShareModal && (
        <DocumentShareModal
          formData={formData}
          companySettings={companySettings}
          userId={session?.user?.id}
          isGeneratingPdf={isGeneratingPdf}
          isPrinting={isPrinting}
          onGeneratePDF={handleGeneratePDF}
          onPrintThermal={handlePrintThermal}
          onClose={() => setShowShareModal(false)}
          t={t}
          fMoney={fMoney}
        />
      )}

      {showSignatureModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                      <h3 className="font-bold text-lg dark:text-white">Assinatura Digital</h3>
                      <button onClick={() => setShowSignatureModal(false)} className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors hover:bg-slate-200">
                          <i className="fa-solid fa-times text-slate-500"></i>
                      </button>
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Desenhe no campo abaixo. A sua assinatura será adicionada ao documento.</p>
                      <div className="w-full h-48 md:h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-crosshair">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full"
                        ></canvas>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end gap-4 flex-shrink-0">
                      <button onClick={clearSignature} className="bg-white dark:bg-slate-700 border dark:border-slate-600 text-slate-700 dark:text-white font-bold py-3 px-6 rounded-xl transition-colors hover:bg-slate-100">
                          Limpar
                      </button>
                      <button onClick={saveSignature} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                          Guardar Assinatura
                      </button>
                  </div>
              </div>
          </div>
      )}
    </Suspense>
  );
};
export default App;
