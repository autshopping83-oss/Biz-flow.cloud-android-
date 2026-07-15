/**
 * App - Componente principal orquestrador
 * v5: Android Capacitor - BottomNav, offline-first, sem login gate
 */

import React, { useState, lazy, Suspense } from 'react';
import { ReceiptData, CompanySettings, SavedClient, SavedProduct } from '../types';
import { Logo } from '../components/Logo';
import { V } from '../_cachebuster/version';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../features/auth/AuthContext';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { useDocumentEditor } from '../features/documents/hooks/useDocumentEditor';
import { useSignatureCanvas } from './hooks/useSignatureCanvas';
import { getTranslation, formatMoney } from '../services/translationService';
import { AppEditorView } from './views/AppEditorView';
import { SignatureModal } from '../features/documents/components/SignatureModal';
import { ConnectAccountModal } from '../features/auth/ConnectAccountModal';
import { DocumentShareModal } from '../components/DocumentShareModal';
import { SettingsModal } from '../components/SettingsModal';
import { ProductsPage } from '../features/products/ProductsPage';
import { ClientsPage } from '../features/clients/ClientsPage';
import { ClientHistory } from '../features/clients/ClientHistory';
import { AppShell } from '../components/AppShell';
import type { NavTab } from '../components/BottomNav';

const Dashboard = lazy(() => import('../components/Dashboard').then(m => ({ default: m.Dashboard })));
const HistoryPage = lazy(() => import('../components/HistoryPage').then(m => ({ default: m.HistoryPage })));
const FinanceManager = lazy(() => import('../components/FinanceManager').then(m => ({ default: m.FinanceManager })));

const PageLoader = () => (
  <div className="fixed top-0 left-0 w-full h-full bg-white dark:bg-slate-900 z-[9999] flex flex-col items-center justify-center">
    <Logo className="w-20 h-20 mb-6 animate-pulse" />
    <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 animate-spin" />
    <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider">Carregando...</p>
  </div>
);

const DefaultSettings: CompanySettings = {
  name: '', address: '', contact: '', nuit: '', logo: '',
  defaultTaxRate: 16, currency: 'MZN', language: 'pt',
  theme: 'light', plan: 'PRO', isAdmin: false,
};

type AppView = 'loading' | 'home' | 'history' | 'app' | 'products' | 'clients' | 'client-history';

const App: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? 'local';
  const isConnected = !!user;

  const [currentView, setCurrentView] = useState<AppView>('loading');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [history, setHistory] = useState<ReceiptData[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DefaultSettings);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [forcedDashTab, setForcedDashTab] = useState<string | undefined>(undefined);
  const [forceMenu, setForceMenu] = useState<number>(0);

  console.debug('BizFlow version:', V);

  const { notify } = useToast();
  const t = (key: string) => getTranslation(companySettings.language, key);
  const fMoney = (val: number) => formatMoney(val, companySettings.currency, companySettings.language);

  useAppLifecycle({
    userId, currentView, setCurrentView: (v: string) => setCurrentView(v as AppView),
    setHistory, setSavedClients, setSavedProducts, setCompanySettings,
    setIsOnline,
  });

  const editor = useDocumentEditor({
    history, companySettings,
    setHistory, setCurrentView: (v: string) => setCurrentView(v as AppView), notify,
  });

  const settingsSignature = useSignatureCanvas(false);
  const settingsCanvasRef = settingsSignature.settingsSignatureCanvasRef;

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setCurrentView('home');
      setForcedDashTab(undefined);
    } else if (tab === 'history') {
      setCurrentView('history');
    } else if (tab === 'finance') {
      setCurrentView('home');
      setForcedDashTab('FINANCE');
    } else if (tab === 'more') {
      setCurrentView('home');
      setForcedDashTab('OVERVIEW');
      setForceMenu(n => n + 1);
    }
  };

  const handleSettingsSaveSignature = () => {
    const canvas = settingsCanvasRef.current;
    if (!canvas) return;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      notify('A assinatura está vazia.', 'info');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setCompanySettings(p => ({ ...p, signature: dataUrl }));
    notify('Assinatura guardada!', 'success');
  };

  const handleSettingsClearSignature = () => {
    settingsSignature.clearCanvas(settingsCanvasRef.current);
    setCompanySettings(p => ({ ...p, signature: undefined }));
  };

  const handleViewClientHistory = (clientName: string) => {
    setSelectedClientId(clientName);
    setCurrentView('client-history');
  };

  const handleSync = async () => {
    if (syncing || !isConnected) return;
    setSyncing(true);
    try {
      const { syncToSupabase } = await import('../services/syncService');
      const result = await syncToSupabase(userId);
      if (result.errors.length > 0) {
        notify(`Sincronizado com alguns erros: ${result.errors.join(', ')}`, 'error');
      } else {
        notify(`Sincronizado! ${result.documents} docs, ${result.clients} clientes, ${result.products} produtos`, 'success');
      }
    } catch (e) {
      notify('Erro ao sincronizar: ' + (e as Error).message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = companySettings.theme === 'dark' ? 'light' : 'dark';
    setCompanySettings(p => ({ ...p, theme: newTheme }));
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('bizflow-theme', newTheme);
  };

  const goHome = () => { setCurrentView('home'); setActiveTab('home'); };

  // Render content based on currentView
  const renderContent = () => {
    switch (currentView) {
      case 'loading':
        return <PageLoader />;
      case 'home':
        return (
          <Dashboard history={history} companySettings={companySettings}
            onLogout={async () => {}}
            onNewDocument={editor.initNewDocument} onOpenSettings={() => setShowSettingsModal(true)}
            onLoadDocument={(doc) => { editor.setFormData(doc); setCurrentView('app'); editor.setMobileTab('preview'); }}
            onViewHistory={() => { setCurrentView('history'); setActiveTab('history'); }}
            onToggleTheme={toggleTheme}
            t={t} userId={userId} onDeleteDocument={editor.handleDeleteDocument}
            onInstallApp={() => {}} showInstallButton={false}
            onViewProducts={() => setCurrentView('products')} onViewClients={() => setCurrentView('clients')}
            onSync={handleSync} syncing={syncing} isConnected={isConnected}
            onOpenConnectAccount={() => setShowConnectModal(true)}
            defaultDashTab={forcedDashTab as any}
            openMenu={forceMenu > 0} />
        );
      case 'history':
        return (
          <HistoryPage history={history} onBack={goHome}
            onLoadDocument={(doc) => { editor.setFormData(doc); setCurrentView('app'); }}
            onDeleteDocument={editor.handleDeleteDocument} onDuplicateDocument={editor.handleDuplicateDocument}
            currency={companySettings.currency} lang={companySettings.language} />
        );
      case 'products':
        return <ProductsPage userId={userId} onBack={goHome} />;
      case 'clients':
        return (
          <ClientsPage userId={userId} savedClients={savedClients} onBack={goHome}
            onUpdateClients={setSavedClients} onViewHistory={handleViewClientHistory} />
        );
      case 'client-history':
        return selectedClientId ? (
          <ClientHistory clientName={selectedClientId} history={history}
            onBack={() => setCurrentView('clients')}
            onLoadDocument={(doc) => { editor.setFormData(doc); setCurrentView('app'); }} />
        ) : null;
      default:
        return null;
    }
  };

  const isFullscreen = currentView === 'app' || currentView === 'loading';

  return (
    <Suspense fallback={<PageLoader />}>
      {isFullscreen ? (
        <>
          {currentView === 'app' && (
            <AppEditorView formData={editor.formData} companySettings={companySettings} newItem={editor.newItem}
              isGuest={!isConnected} isOnline={isOnline} syncing={false}
              isEnhancing={editor.isEnhancing} isSharing={editor.isSharing}
              isPrinting={editor.isPrinting} isGeneratingPdf={editor.isGeneratingPdf}
              mobileTab={editor.mobileTab} savedClients={savedClients} savedProducts={savedProducts}
              receiptRef={editor.receiptRef} ghostReceiptRef={editor.ghostReceiptRef} thermalReceiptRef={editor.thermalReceiptRef}
              t={t} fMoney={fMoney}
              onBack={goHome}
              onOpenSettings={() => setShowSettingsModal(true)} onShareWhatsApp={editor.handleShareWhatsApp}
              onOpenShareModal={() => editor.setShowShareModal(true)} onSetMobileTab={editor.setMobileTab}
              onFormDataChange={editor.handleFormDataChange} onNewItemChange={editor.handleNewItemChange}
              onAddItem={editor.handleAddItem} onRemoveItem={editor.handleRemoveItem}
              onEnhanceDescription={editor.handleEnhanceDescription} onInitNew={editor.initNewDocument}
              onSign={() => editor.setShowSignatureModal(true)} onClearClient={editor.handleClearClient}
              onThemeChange={editor.handleThemeChange} userId={userId}
              onViewClientHistory={handleViewClientHistory}
              onUpdateProducts={setSavedProducts} />
          )}
          {currentView === 'loading' && <PageLoader />}
        </>
      ) : (
        <AppShell activeTab={activeTab} onTabChange={handleTabChange} isConnected={isConnected}>
          {renderContent()}
        </AppShell>
      )}

      {/* Modals */}
      {showConnectModal && (
        <ConnectAccountModal
          onClose={() => setShowConnectModal(false)}
          onConnected={() => notify('Conta conectada! Os dados serão sincronizados.', 'success')}
        />
      )}
      {showSettingsModal && (
        <SettingsModal companySettings={companySettings} onClose={() => setShowSettingsModal(false)}
          onUpdate={(e) => { const { name, value } = e.target; setCompanySettings(p => ({ ...p, [name]: value })); }}
          onLogoChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setCompanySettings(p => ({ ...p, logo: r.result as string })); r.readAsDataURL(f); }}
          onStampUpload={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setCompanySettings(p => ({ ...p, customStamp: r.result as string })); r.readAsDataURL(f); }}
          onRequestFolderPermission={async () => {}}
          onSaveSettings={async () => { const { saveCompanySettings } = await import('../services/storageService'); await saveCompanySettings(companySettings, userId); notify('Definições guardadas!', 'success'); setShowSettingsModal(false); }}
          isSavingSettings={false} localDirHandle={null}
          onSaveSignature={handleSettingsSaveSignature} onClearSignature={handleSettingsClearSignature}
          settingsSignatureCanvasRef={settingsCanvasRef as React.RefObject<HTMLCanvasElement | null>}
          handleSettingsSignatureStartDrawing={settingsSignature.handleSettingsSignatureStartDrawing as unknown as (e: MouseEvent | TouchEvent) => void}
          handleSettingsSignatureDraw={settingsSignature.handleSettingsSignatureDraw as unknown as (e: MouseEvent | TouchEvent) => void}
          handleSettingsSignatureStopDrawing={settingsSignature.handleSettingsSignatureStopDrawing}
          gmailConectado={false} gmailEmail="" onConectarGmail={async () => {}} />
      )}
      {editor.showShareModal && (
        <DocumentShareModal formData={editor.formData} companySettings={companySettings} userId={userId}
          isGeneratingPdf={editor.isGeneratingPdf} isPrinting={editor.isPrinting}
          onGeneratePDF={editor.handleGeneratePDF} onPrintThermal={editor.handlePrintThermal}
          onClose={() => editor.setShowShareModal(false)} t={t} fMoney={fMoney}
          onGetPdfBlob={editor.generatePDFBlob} />
      )}
      {editor.showSignatureModal && (
        <SignatureModal canvasRef={editor.canvasRef} onSave={editor.saveSignature}
          onClear={editor.clearSignature} onClose={() => editor.setShowSignatureModal(false)} />
      )}
    </Suspense>
  );
};

export default App;
