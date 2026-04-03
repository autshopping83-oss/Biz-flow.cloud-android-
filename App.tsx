
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ReceiptData, CompanySettings, DocumentType, LineItem, SavedClient, SavedProduct, BluetoothPrinter } from './types';
import { Logo } from './components/Logo';
import { useToast } from './components/ToastContext';

// Services
import { saveReceipt, getHistory, generateNextReceiptNumber, saveCompanySettings, getCompanySettings, getSavedClients, getSavedProducts, deleteReceipt, saveDirectoryHandle, getDirectoryHandle } from './services/storageService';
import { improveDescription } from './services/geminiService';
import { getTranslation, formatMoney } from './services/translationService';
import { supabase } from './services/supabaseClient';
import { connectToPrinter, printTicket } from './services/printerService';
import { syncService } from './services/syncService';
import { BleClient } from '@capacitor-community/bluetooth-le';

// --- LAZY COMPONENTS (Code Splitting) ---
const DocumentPreview = lazy(() => import('./components/ReceiptPreview')); 
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const AuthScreens = lazy(() => import('./components/AuthScreens').then(module => ({ default: module.AuthScreens })));
const EditorForm = lazy(() => import('./components/EditorForm').then(module => ({ default: module.EditorForm })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard }))); 
const DeleteAccount = lazy(() => import('./components/DeleteAccount').then(module => ({ default: module.DeleteAccount }))); 
const HistoryPage = lazy(() => import('./components/HistoryPage').then(module => ({ default: module.HistoryPage })));

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
  createdAt: Date.now(),
};

const DefaultSettings: CompanySettings = {
  name: '', address: '', contact: '', nuit: '', logo: '', defaultTaxRate: 16, currency: 'MZN', language: 'pt', theme: 'light', plan: 'PRO', isAdmin: false
};

const App: React.FC = () => {
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  
  const [printer, setPrinter] = useState<BluetoothPrinter | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const ghostReceiptRef = useRef<HTMLDivElement>(null); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const { notify } = useToast(); 

  const t = (key: any) => getTranslation(companySettings.language, key);
  const fMoney = (val: number) => formatMoney(val, companySettings.currency);

  useEffect(() => {
    const subtotal = formData.items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
    const taxRate = Number(formData.taxRate) || 0;
    const discount = Number(formData.discount) || 0;
    
    const taxAmount = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + taxAmount;

    if (subtotal !== formData.subtotal || taxAmount !== formData.taxAmount || total !== formData.total) {
      setFormData(prev => ({ ...prev, subtotal, taxAmount, total }));
    }
  }, [formData.items, formData.taxRate, formData.discount]);

  useEffect(() => {
    if (companySettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [companySettings.theme]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      window.deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const view = params.get('view');

    if (action === 'delete_account') {
        setCurrentView('deleteAccount');
        return; 
    }

    if (view === 'updatePassword') {
        setCurrentView('updatePassword');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        initializeUserData(session.user.id);
      } else {
        if (currentView === 'loading' && view !== 'updatePassword') setCurrentView('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        if (event === 'PASSWORD_RECOVERY') {
            setCurrentView('updatePassword');
            return;
        }
        if (session) {
            if(currentView !== 'history') initializeUserData(session.user.id);
        } else if (!isGuest && action !== 'delete_account') {
            const allowedViews = ['register', 'forgotPassword', 'updatePassword'];
            if (!allowedViews.includes(currentView)) {
                setCurrentView('login');
            }
        }
    });

    getDirectoryHandle().then(handle => { if (handle) setLocalDirHandle(handle); });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (Capacitor.isNativePlatform()) {
      BleClient.initialize().catch(console.error);
    }

    syncService.setNotifyCallback((isSyncing) => {
      setSyncing(isSyncing);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isGuest]);

  const initializeUserData = async (userId: string) => {
      setIsGuest(false);
      fetchProfile(userId);
      await loadLocalData(userId);
      await syncService.pullFromSupabase(userId);
      await loadLocalData(userId); // Reload after pull
      if(currentView !== 'history') setCurrentView('home');
  };

  const loadLocalData = async (userId: string) => {
    if (!userId) return;
    const hist = await getHistory(userId);
    setHistory(hist);
    setSavedClients(await getSavedClients(userId));
    setSavedProducts(await getSavedProducts(userId));
    const localSettings = await getCompanySettings(userId);
    if (localSettings) setCompanySettings(prev => ({...prev, ...localSettings, plan: 'PRO'})); 
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      if (data) {
        setCompanySettings(prev => ({
          ...prev,
          name: data.company_name || '', 
          address: data.address || '', 
          contact: data.contact || '', 
          nuit: data.nuit || '',
          logo: data.logo || '', 
          currency: data.currency || 'MZN', 
          language: data.language || 'pt', 
          theme: (data.theme as any) || 'light', 
          plan: 'PRO', 
          isAdmin: data.is_admin || false,
          defaultTaxRate: data.default_tax_rate || 16
        }));
      }
    } catch (e) {
      console.warn("Perfil não encontrado no Supabase, usando definições locais.");
    }
  };

  const handleUpdateSettings = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCompanySettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanySettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    if (!session?.user?.id) return;
    setIsSavingSettings(true);
    try {
      await saveCompanySettings(companySettings, session.user.id);
      notify("Definições da empresa guardadas com sucesso!", "success");
      setShowSettingsModal(false);
    } catch (err: any) {
      notify("Erro ao guardar definições: " + err.message, "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const requestFolderPermission = async () => {
    if (!window.showDirectoryPicker) return null;
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setLocalDirHandle(handle);
      await saveDirectoryHandle(handle);
      notify("Pasta de armazenamento ativada!", "success");
      return handle;
    } catch (e) {
      notify("Permissão de pasta não concedida.", "info");
      return null;
    }
  };

  const generatePDFBlob = async (): Promise<{ blob: Blob, fileName: string, base64: string } | null> => {
    const targetRef = ghostReceiptRef.current || receiptRef.current;
    if (!targetRef) return null;

    const captureId = targetRef === ghostReceiptRef.current ? "receipt-capture-ghost" : "receipt-preview-main";

    try {
      const canvas = await html2canvas(targetRef, {
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, 
        height: 1123,
        windowWidth: 1280, 
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById(captureId);
          if (el) {
            el.style.transform = 'none';
            el.style.boxShadow = 'none';
            el.style.margin = '0';
            el.style.padding = '25mm';
            el.style.position = 'static';
            el.style.width = '210mm';
            el.style.minHeight = '297mm';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.90);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `${formData.number}_${formData.clientName.replace(/\s+/g, '_') || 'documento'}.pdf`;
      return { blob: pdf.output('blob'), fileName, base64: pdf.output('datauristring').split(',')[1] };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    notify("Preparando Documento A4...", "info");
    
    try {
      const pdfData = await generatePDFBlob();
      if (!pdfData) throw new Error("Falha ao gerar PDF.");

      const { blob, fileName, base64 } = pdfData;

      if (Capacitor.isNativePlatform()) {
        try {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents,
            recursive: true
          });
          notify(`Salvo nativamente em: ${savedFile.uri}`, "success");
          if (session?.user?.id) handleSave(true);
          return;
        } catch (nativeErr: any) {
          console.error("Native save error:", nativeErr);
        }
      }

      let dirHandle = localDirHandle;
      if (!dirHandle && window.showDirectoryPicker) {
         dirHandle = await requestFolderPermission();
      }

      if (dirHandle) {
        try {
          const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
          if (permission !== 'granted') await dirHandle.requestPermission({ mode: 'readwrite' });
          const subfolderName = formData.type === 'INVOICE' ? 'Faturas' : formData.type === 'QUOTE' ? 'Orcamentos' : 'Recibos';
          const subDir = await dirHandle.getDirectoryHandle(subfolderName, { create: true });
          const fileHandle = await subDir.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          notify(`Salvo com sucesso na pasta: ${subfolderName}`, "success");
        } catch (dirErr) {
           const link = document.createElement('a');
           link.href = URL.createObjectURL(blob);
           link.download = fileName;
           link.click();
        }
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      }
      if (session?.user?.id) handleSave(true); 
    } catch (error: any) {
      notify(`Erro na geração: ${error.message}`, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (isSharing) return;
    setIsSharing(true);
    notify("Preparando partilha direta...", "info");

    try {
        const pdfData = await generatePDFBlob();
        if (!pdfData) throw new Error("Erro ao gerar ficheiro.");

        const { blob, fileName } = pdfData;
        const file = new File([blob], fileName, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: fileName,
                text: `Envio de ${formData.type === 'INVOICE' ? 'Fatura' : 'Documento'} - ${formData.number}`,
            });
            notify("Partilha concluída!", "success");
        } else {
            const text = `Olá, segue o documento ${formData.number}. Pode descarregar no aplicativo.`;
            window.open(`https://wa.me/${formData.clientContact.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
            notify("Aviso: Seu navegador não suporta partilha de ficheiros direta. Abrindo chat...", "info");
        }
    } catch (e: any) {
        if (e.name !== 'AbortError') {
            notify(`Erro ao partilhar: ${e.message}`, "error");
        }
    } finally {
        setIsSharing(false);
    }
  };

  const handlePrintThermal = async () => {
    if (isPrinting) return;
    const targetRef = ghostReceiptRef.current;
    if (!targetRef) {
        notify("Erro: Recibo não encontrado.", "error");
        return;
    }

    setIsPrinting(true);

    try {
        let currentPrinter = printer;
        if (!currentPrinter || !currentPrinter.gatt?.connected) {
            notify("Solicitando acesso Bluetooth...", "info");
            currentPrinter = await connectToPrinter();
            if (currentPrinter) {
                setPrinter(currentPrinter);
                notify(`Conectado: ${currentPrinter.name}`, "success");
            } else {
                setIsPrinting(false);
                return;
            }
        }

        if (currentPrinter) {
            notify("Enviando para impressão térmica...", "info");
            await printTicket(currentPrinter, targetRef);
            notify("Impressão enviada!", "success");
        }
    } catch (e: any) {
        notify(`Erro na impressão: ${e.message}`, "error");
        setPrinter(null);
    } finally {
        setIsPrinting(false);
    }
  };

  const handleSave = async (silent = false) => {
    if (!session?.user?.id) return;
    if (!formData.clientName || formData.items.length === 0) return;
    const newHistory = await saveReceipt(formData, session.user.id);
    setHistory(newHistory);
    if (!silent) notify("Dados sincronizados.", 'success');
  };

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
    const newDoc = { ...doc };
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
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      notify("Login bem-sucedido!", "success");
    } catch (e: any) {
      notify("Erro ao entrar: " + (e.message || "Credenciais inválidas"), "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (email: string, pass: string, data: any) => {
    setAuthLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: {
          data: {
            full_name: data.name,
            company_name: data.companyName
          }
        }
      });
      if (error) throw error;
      
      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          company_name: data.companyName,
          currency: data.currency,
          language: data.language,
          logo: data.logo
        });
      }
      
      notify("Conta criada! Verifique seu email.", "success");
    } catch (e: any) {
      notify("Erro no registo: " + e.message, "error");
    } finally {
      setAuthLoading(false);
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
          onGuestAccess={() => { setIsGuest(true); setCurrentView('app'); }} 
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

                    <button onClick={handlePrintThermal} disabled={isPrinting} className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-black shadow-xl shadow-slate-900/10 flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
                       {isPrinting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-print"></i>} 
                       <span className="hidden lg:inline">Térmica</span>
                    </button>

                    <button onClick={handleGeneratePDF} disabled={isGeneratingPdf} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-black shadow-xl shadow-blue-600/20 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95">
                       {isGeneratingPdf ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-file-pdf"></i>} 
                       <span className="hidden lg:inline">PDF</span>
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
                    />
                 </div>
              </div>
              <div className={`flex-grow bg-slate-200 dark:bg-slate-950 overflow-y-auto flex flex-col items-center p-4 md:p-10 transition-colors ${mobileTab === 'editor' ? 'hidden md:flex' : 'flex'}`}>
                 <div className="bg-white shadow-2xl origin-top mb-10 overflow-hidden transition-shadow" style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                   <DocumentPreview data={formData} ref={receiptRef} captureId="receipt-preview-main" />
                 </div>
              </div>
           </div>

           <div className="fixed top-0 left-0 pointer-events-none opacity-0" style={{ zIndex: -100 }}>
             <div style={{ position: 'absolute', top: 0, left: '-9999px' }}>
                <DocumentPreview data={formData} ref={ghostReceiptRef} captureId="receipt-capture-ghost" />
             </div>
           </div>
        </div>
      )}

      {showSettingsModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn">
             <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
                 <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                     <h2 className="text-xl font-bold dark:text-white">Configurações</h2>
                     <button onClick={() => setShowSettingsModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors"><i className="fa-solid fa-times text-slate-500"></i></button>
                 </div>
                 <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin">...</div>
                 <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 flex gap-4 transition-colors">
                     <button onClick={() => setShowSettingsModal(false)} className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-colors">Cancelar</button>
                     <button onClick={handleSaveSettings} disabled={isSavingSettings} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all">{isSavingSettings ? <i className="fa-solid fa-spinner animate-spin"></i> : 'GUARDAR ALTERAÇÕES'}</button>
                 </div>
             </div>
         </div>
       )}
       {showSignatureModal && (
          <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden transition-colors">...</div>
          </div>
       )}
    </Suspense>
  );
};
export default App;
