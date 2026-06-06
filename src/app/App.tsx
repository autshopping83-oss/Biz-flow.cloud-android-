/**
 * App - Componente principal orquestrador
 * Refatorado: views e hooks extraídos para módulos separados.
 * Fluxo: App → useAppLifecycle + useAuth + useDocumentEditor → Views
 * v3: Payment via supabase.functions.invoke() - auth automática
 */

import React, { useState, lazy, Suspense } from 'react';
import { ReceiptData, CompanySettings, SavedClient, SavedProduct } from '../types';
import { Logo } from '../components/Logo';
import { V } from '../_cachebuster/version';
import { useToast } from '../components/ToastContext';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useDocumentEditor } from '../features/documents/hooks/useDocumentEditor';
import { getTranslation, formatMoney } from '../services/translationService';
import { supabase } from '../services/supabaseClient';
import { AppEditorView } from './views/AppEditorView';
import { SignatureModal } from '../features/documents/components/SignatureModal';
import { DocumentShareModal } from '../components/DocumentShareModal';
import { SettingsModal } from '../components/SettingsModal';
import type { Session } from '@supabase/supabase-js';

const Dashboard = lazy(() => import('../components/Dashboard').then(m => ({ default: m.Dashboard })));
const AuthScreens = lazy(() => import('../components/AuthScreens').then(m => ({ default: m.AuthScreens })));
const AdminDashboard = lazy(() => import('../components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DeleteAccount = lazy(() => import('../components/DeleteAccount').then(m => ({ default: m.DeleteAccount })));
const HistoryPage = lazy(() => import('../components/HistoryPage').then(m => ({ default: m.HistoryPage })));
const ApiDocs = lazy(() => import('../components/ApiDocs').then(m => ({ default: m.ApiDocs })));
const ApiDashboard = lazy(() => import('../components/ApiDashboard').then(m => ({ default: m.ApiDashboard })));

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    deferredPrompt?: { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> } | null;
  }
}

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

type AppView = 'loading' | 'login' | 'register' | 'forgotPassword' | 'updatePassword' | 'home' | 'history' | 'app' | 'apiDocs' | 'apiDashboard' | 'deleteAccount';

const App: React.FC<{ onReady?: () => void }> = ({ onReady }) => {
  const [currentView, setCurrentView] = useState<AppView>('loading');
  const [isGuest, setIsGuest] = useState(false);
  const [history, setHistory] = useState<ReceiptData[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DefaultSettings);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Window['deferredPrompt']>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const { notify } = useToast();
  const t = (key: string) => getTranslation(companySettings.language, key);
  const fMoney = (val: number) => formatMoney(val, companySettings.currency, companySettings.language);
  const { authLoading, handleLogin, handleRegister, handleLogout, handleGoogleLogin } = useAuth(notify);

  useAppLifecycle({
    currentView, isGuest, setCurrentView: (v: string) => setCurrentView(v as AppView), setIsGuest, setSession,
    setHistory, setSavedClients, setSavedProducts, setCompanySettings,
    setIsOnline, setSyncing, setLocalDirHandle: () => {}, onReady,
  });

  const editor = useDocumentEditor({
    sessionUserId: session?.user?.id, isGuest, history, companySettings,
    setHistory, setCurrentView: (v: string) => setCurrentView(v as AppView), notify,
  });

  const toggleTheme = () => {
    const newTheme = companySettings.theme === 'dark' ? 'light' : 'dark';
    setCompanySettings(p => ({ ...p, theme: newTheme }));
    if (session?.user?.id) supabase.from('profiles').update({ theme: newTheme }).eq('id', session.user.id);
  };

  const handleInstallApp = () => {
    if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.then(() => setInstallPrompt(null)); }
  };

  return (
    <Suspense fallback={<PageLoader />}>
      {currentView === 'loading' && <PageLoader />}
      {currentView === 'deleteAccount' && <DeleteAccount onBack={() => { window.location.href = '/'; }} />}
      {['login', 'register', 'forgotPassword', 'updatePassword'].includes(currentView) && (
        <AuthScreens view={currentView as 'login' | 'register' | 'forgotPassword' | 'updatePassword'} setView={setCurrentView}
          onLogin={(e, p) => handleLogin(e, p)} onRegister={(e, p, d) => handleRegister(e, p, d)}
          onGoogleLogin={handleGoogleLogin} isLoading={authLoading}
          onInstall={handleInstallApp} showInstallButton={!!installPrompt} />
      )}
      {currentView === 'home' && !isGuest && (
        <Dashboard history={history} companySettings={companySettings}
          onLogout={async () => { await handleLogout(); setIsGuest(false); setSession(null); setCurrentView('login'); }}
          onNewDocument={editor.initNewDocument} onOpenSettings={() => setShowSettingsModal(true)}
          onLoadDocument={(doc) => { editor.setFormData(doc); setCurrentView('app'); editor.setMobileTab('preview'); }}
          onViewHistory={() => setCurrentView('history')} onToggleTheme={toggleTheme}
          t={t} userId={session?.user?.id || ''} userEmail={session?.user?.email} userName={session?.user?.user_metadata?.full_name} onDeleteDocument={editor.handleDeleteDocument}
          onInstallApp={handleInstallApp} showInstallButton={!!installPrompt} />
      )}
      {currentView === 'history' && !isGuest && (
        <HistoryPage history={history} onBack={() => setCurrentView('home')}
          onLoadDocument={(doc) => { editor.setFormData(doc); setCurrentView('app'); }}
          onDeleteDocument={editor.handleDeleteDocument} onDuplicateDocument={editor.handleDuplicateDocument}
          currency={companySettings.currency} lang={companySettings.language} />
      )}
      {currentView === 'apiDocs' && <ApiDocs onBack={() => setCurrentView('login')} initialTab="general" />}
      {currentView === 'apiDashboard' && (
        <ApiDashboard userId={session?.user?.id} onBack={() => setCurrentView('home')} onOpenDocs={() => setCurrentView('apiDocs')} />
      )}
      {(currentView === 'app' || isGuest) && (
        <AppEditorView formData={editor.formData} companySettings={companySettings} newItem={editor.newItem}
          isGuest={isGuest} isOnline={isOnline} syncing={syncing}
          isEnhancing={editor.isEnhancing} isSharing={editor.isSharing}
          isPrinting={editor.isPrinting} isGeneratingPdf={editor.isGeneratingPdf}
          mobileTab={editor.mobileTab} savedClients={savedClients} savedProducts={savedProducts}
          receiptRef={editor.receiptRef} ghostReceiptRef={editor.ghostReceiptRef} thermalReceiptRef={editor.thermalReceiptRef}
          t={t} fMoney={fMoney}
          onBack={() => isGuest ? setCurrentView('login') : setCurrentView('home')}
          onOpenSettings={() => setShowSettingsModal(true)} onShareWhatsApp={editor.handleShareWhatsApp}
          onOpenShareModal={() => editor.setShowShareModal(true)} onSetMobileTab={editor.setMobileTab}
          onFormDataChange={editor.handleFormDataChange} onNewItemChange={editor.handleNewItemChange}
          onAddItem={editor.handleAddItem} onRemoveItem={editor.handleRemoveItem}
          onEnhanceDescription={editor.handleEnhanceDescription} onInitNew={editor.initNewDocument}
          onSign={() => editor.setShowSignatureModal(true)} onClearClient={editor.handleClearClient}
          onThemeChange={editor.handleThemeChange} userId={session?.user?.id} />
      )}
      {showSettingsModal && (
        <SettingsModal companySettings={companySettings} onClose={() => setShowSettingsModal(false)}
          onUpdate={(e) => { const { name, value } = e.target; setCompanySettings(p => ({ ...p, [name]: value })); }}
          onLogoChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setCompanySettings(p => ({ ...p, logo: r.result as string })); r.readAsDataURL(f); }}
          onStampUpload={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setCompanySettings(p => ({ ...p, customStamp: r.result as string })); r.readAsDataURL(f); }}
          onRequestFolderPermission={async () => { await editor.requestFolderPermission(); }}
          onSaveSettings={async () => { if (!session?.user?.id) return; const { saveCompanySettings } = await import('../services/storageService'); await saveCompanySettings(companySettings, session.user.id); notify('Definições guardadas!', 'success'); setShowSettingsModal(false); }}
          isSavingSettings={false} localDirHandle={editor.localDirHandle}
          onSaveSignature={() => {}} onClearSignature={() => {}} settingsSignatureCanvasRef={null as unknown as React.RefObject<HTMLCanvasElement | null>}
          handleSettingsSignatureStartDrawing={() => {}} handleSettingsSignatureDraw={() => {}} handleSettingsSignatureStopDrawing={() => {}} />
      )}
      {editor.showShareModal && (
        <DocumentShareModal formData={editor.formData} companySettings={companySettings} userId={session?.user?.id}
          isGeneratingPdf={editor.isGeneratingPdf} isPrinting={editor.isPrinting}
          onGeneratePDF={editor.handleGeneratePDF} onPrintThermal={editor.handlePrintThermal}
          onClose={() => editor.setShowShareModal(false)} t={t} fMoney={fMoney} />
      )}
      {editor.showSignatureModal && (
        <SignatureModal canvasRef={editor.canvasRef} onSave={editor.saveSignature}
          onClear={editor.clearSignature} onClose={() => editor.setShowSignatureModal(false)} />
      )}
    </Suspense>
  );
};

export default App;
