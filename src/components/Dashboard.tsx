
import React, { useState } from 'react';
import { ReceiptData, CompanySettings, DocumentType } from '../types';
import { formatMoney } from '../services/translationService';
import { CommunityFeed } from './CommunityFeed';
import { FinanceManager } from './FinanceManager';
import { ProductCatalog } from './ProductCatalog';
import { AdminDashboard } from './AdminDashboard';
import { UserManagement } from './UserManagement';
import { Logo } from './Logo';

interface DashboardProps {
  history: ReceiptData[];
  companySettings: CompanySettings;
  onLogout: () => void;
  onNewDocument: (type: DocumentType) => void;
  onOpenSettings: () => void;
  onLoadDocument: (doc: ReceiptData) => void;
  onViewHistory: () => void;
  onToggleTheme: () => void;
  t: (key: any) => string;
  userId: string;
  onDeleteDocument?: (id: string) => void;
  onInstallApp?: () => void;
  showInstallButton?: boolean;
  orgId?: string;
}

type DashTab = 'OVERVIEW' | 'COMMUNITY' | 'HISTORY' | 'FINANCE' | 'CATALOG';

export const Dashboard: React.FC<DashboardProps> = ({
  history, companySettings, onLogout, onNewDocument, onOpenSettings, onLoadDocument, onViewHistory, onToggleTheme, t, userId, onDeleteDocument, onInstallApp, showInstallButton, orgId
}) => {
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab>('OVERVIEW');
  const [showCatalog, setShowCatalog] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const recentHistory = history.slice(0, 5);

  const handleNav = (tab: DashTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
    if (tab === 'CATALOG') {
      setShowCatalog(true);
    }
  };

  // Calculate Monthly Revenue
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = history
    .filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear && (d.type === 'INVOICE' || d.type === 'RECEIPT');
    })
    .reduce((sum, d) => sum + d.total, 0);

  // URL do novo aplicativo de Ebooks
  const PAGES_APP_URL = window.location.hostname.includes('localhost') 
    ? 'http://localhost:5173' 
    : 'https://p-gina-biz-flow.vercel.app';

  const handleOpenEbooks = () => {
     window.open(PAGES_APP_URL, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative overflow-x-hidden transition-colors duration-500">
      
      {/* --- SIDEBAR DRAWER --- */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsMenuOpen(false)}
      ></div>
      
      <div className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
           <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" />
              <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">Menu</span>
           </div>
           <button onClick={() => setIsMenuOpen(false)} className="w-9 h-9 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors">
              <i className="fa-solid fa-times text-lg"></i>
           </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
            <div className="px-5 py-5 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">
                  Versão Completa
                </p>
                <div className="flex items-center gap-3">
                   {companySettings.logo ? (
                      <img src={companySettings.logo} className="w-10 h-10 rounded-full object-cover bg-white" />
                   ) : (
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400"><i className="fa-solid fa-building"></i></div>
                   )}
                   <div className="overflow-hidden">
                      <p className="font-bold text-slate-900 dark:text-white truncate text-base leading-tight">{companySettings.name || 'Minha Empresa'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate opacity-80">{companySettings.contact || 'Sem contato'}</p>
                   </div>
                </div>
            </div>

            {/* Install Button Highlighted */}
            {showInstallButton && onInstallApp && (
                <button onClick={onInstallApp} className="w-full text-left px-5 py-4 mb-2 rounded-xl font-bold flex items-center gap-4 border transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                     <i className="fa-solid fa-download w-5 text-center"></i> Instalar Aplicativo
                </button>
            )}
            
            {/* Nav Items */}
            <button onClick={() => handleNav('OVERVIEW')} className={`w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border transition-all ${activeTab === 'OVERVIEW' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm' : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <i className={`fa-solid fa-house w-5 text-center ${activeTab === 'OVERVIEW' ? 'text-blue-600' : 'text-slate-400'}`}></i> {t('dashboard')}
            </button>

            <button onClick={() => handleNav('FINANCE')} className={`w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border transition-all ${activeTab === 'FINANCE' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm' : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <i className={`fa-solid fa-chart-pie w-5 text-center ${activeTab === 'FINANCE' ? 'text-blue-600' : 'text-slate-400'}`}></i> {t('finance')}
            </button>

            <button onClick={() => handleNav('CATALOG')} className={`w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border transition-all ${activeTab === 'CATALOG' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm' : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <i className={`fa-solid fa-boxes-stacked w-5 text-center ${activeTab === 'CATALOG' ? 'text-blue-600' : 'text-slate-400'}`}></i> Catálogo
            </button>

            <button onClick={() => handleNav('COMMUNITY')} className={`w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border transition-all ${activeTab === 'COMMUNITY' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm' : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <i className={`fa-solid fa-users w-5 text-center ${activeTab === 'COMMUNITY' ? 'text-blue-600' : 'text-slate-400'}`}></i> Comunidade
            </button>
            
            <button onClick={handleOpenEbooks} className="w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border border-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                 <i className="fa-solid fa-layer-group w-5 text-center text-indigo-500"></i> Vender E-books
            </button>

            <button onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('navigate', { detail: 'apiDashboard' })); }} className="w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border border-transparent text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                 <i className="fa-solid fa-code w-5 text-center text-purple-500"></i> API Dashboard
            </button>

            {companySettings.isAdmin && (
              <>
                <button onClick={() => { setShowAdmin(true); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border border-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <i className="fa-solid fa-lock w-5 text-center text-red-500"></i> Painel Admin
                </button>
                <button onClick={() => { setShowUserManagement(true); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-4 border border-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                  <i className="fa-solid fa-users-gear w-5 text-center text-emerald-500"></i> Sub-usuários
                </button>
              </>
            )}
            
            <div className="border-t border-slate-100 dark:border-slate-800 my-4 mx-2"></div>

            <button onClick={onToggleTheme} className="w-full text-left px-5 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-4 transition-colors">
                 <i className={`fa-solid ${companySettings.theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-slate-400 w-5 text-center`}></i> {companySettings.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </button>
            <button onClick={() => { setIsMenuOpen(false); onOpenSettings(); }} className="w-full text-left px-5 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-4 transition-colors">
                 <i className="fa-solid fa-gear text-slate-400 w-5 text-center"></i> {t('settings')}
            </button>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
           <button onClick={onLogout} className="w-full text-left px-5 py-3 rounded-xl text-red-600 font-bold hover:bg-red-50 dark:hover:bg-slate-800 border border-transparent hover:border-red-100 dark:hover:border-slate-700 flex items-center gap-3 transition-all">
             <i className="fa-solid fa-right-from-bracket w-5 text-center"></i> Sair da Conta
           </button>
        </div>
      </div>

      {/* Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-md transition-colors duration-300">
         <div className="max-w-6xl mx-auto px-4 md:px-6 h-18 flex justify-between items-center py-3">
            <div className="flex items-center gap-4">
               <button onClick={() => setIsMenuOpen(true)} className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors">
                 <i className="fa-solid fa-bars text-xl"></i>
               </button>

               <div className="flex items-center gap-2.5 animate-fadeIn">
                  <div className="flex items-center justify-center hidden xs:flex">
                    <Logo className="w-9 h-9" />
                  </div>
                  <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">Biz-flow</span>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={onOpenSettings} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                 <i className="fa-solid fa-gear"></i>
               </button>
            </div>
         </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
         
         {activeTab === 'COMMUNITY' ? (
            <CommunityFeed currentUser={companySettings} t={t} />
         ) : activeTab === 'FINANCE' ? (
            <FinanceManager currency={companySettings.currency} t={t} userId={userId} lang={companySettings.language} />
         ) : (
            <div className="animate-fadeIn">
                 {/* Overview Header */}
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard')}</h1>
                      <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Bem-vindo ao seu escritório digital.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-default">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-xl">
                          <i className="fa-solid fa-wallet"></i>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receita Mensal</p>
                          <p className="font-black text-slate-900 dark:text-white text-2xl leading-none tracking-tight">{formatMoney(monthlyRevenue, companySettings.currency, companySettings.language)}</p>
                        </div>
                    </div>
                 </div>

                 {/* ACTION CARDS GRID */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                     {/* Invoice Card */}
                     <button onClick={() => onNewDocument('INVOICE')} 
                        className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[20px] p-7 text-white shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 hover:scale-[1.02] transition-all duration-300 text-left border border-white/10"
                     >
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.08] group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500"><i className="fa-solid fa-file-invoice text-9xl"></i></div>
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 text-white text-2xl shadow-inner border border-white/20 group-hover:rotate-6 transition-transform">
                           <i className="fa-solid fa-plus"></i>
                        </div>
                        <h3 className="font-bold text-2xl tracking-tight">{t('newInvoice')}</h3>
                        <p className="text-blue-100 text-sm mt-2 opacity-90 font-medium">Emitir fatura fiscal.</p>
                     </button>

                     {/* Receipt Card */}
                     <button onClick={() => onNewDocument('RECEIPT')} 
                        className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[20px] p-7 text-white shadow-xl shadow-emerald-600/20 hover:shadow-2xl hover:shadow-emerald-600/30 hover:scale-[1.02] transition-all duration-300 text-left border border-white/10"
                     >
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.08] group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500"><i className="fa-solid fa-receipt text-9xl"></i></div>
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 text-white text-2xl shadow-inner border border-white/20 group-hover:rotate-6 transition-transform">
                           <i className="fa-solid fa-plus"></i>
                        </div>
                        <h3 className="font-bold text-2xl tracking-tight">{t('newReceipt')}</h3>
                        <p className="text-emerald-100 text-sm mt-2 opacity-90 font-medium">Comprovativo.</p>
                     </button>

                     {/* Invoice-Receipt Card */}
                     <button onClick={() => onNewDocument('INVOICE_RECEIPT')} 
                        className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[20px] p-7 text-white shadow-xl shadow-indigo-600/20 hover:shadow-2xl hover:shadow-indigo-600/30 hover:scale-[1.02] transition-all duration-300 text-left border border-white/10"
                     >
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.08] group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500"><i className="fa-solid fa-file-invoice-dollar text-9xl"></i></div>
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 text-white text-2xl shadow-inner border border-white/20 group-hover:rotate-6 transition-transform">
                           <i className="fa-solid fa-plus"></i>
                        </div>
                        <h3 className="font-bold text-2xl tracking-tight">{t('invoiceReceipt')}</h3>
                        <p className="text-indigo-100 text-sm mt-2 opacity-90 font-medium">Factura-Recibo com seleção de pagamento.</p>
                     </button>

                     {/* Quote Card */}
                     <button onClick={() => onNewDocument('QUOTE')} 
                        className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-700 rounded-[20px] p-7 text-white shadow-xl shadow-purple-600/20 hover:shadow-2xl hover:shadow-purple-600/30 hover:scale-[1.02] transition-all duration-300 text-left border border-white/10"
                     >
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.08] group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500"><i className="fa-solid fa-clipboard-list text-9xl"></i></div>
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 text-white text-2xl shadow-inner border border-white/20 group-hover:rotate-6 transition-transform">
                           <i className="fa-solid fa-plus"></i>
                        </div>
                        <h3 className="font-bold text-2xl tracking-tight">{t('newQuote')}</h3>
                        <p className="text-violet-100 text-sm mt-2 opacity-90 font-medium">Criar cotação.</p>
                     </button>

                     {/* BizFlow Pages / Ebooks Card - UNLOCKED FOR EVERYONE */}
                     <button onClick={handleOpenEbooks}
                        className="group relative overflow-hidden rounded-[20px] p-7 text-left shadow-xl transition-all duration-300 border bg-white dark:bg-slate-800 shadow-slate-200/50 dark:shadow-black/50 hover:shadow-2xl hover:scale-[1.02] border-slate-200 dark:border-slate-700"
                     >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><i className="fa-solid fa-layer-group text-9xl text-indigo-600"></i></div>
                        
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white text-2xl shadow-lg transition-transform group-hover:rotate-6 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-200 dark:shadow-none">
                           <i className="fa-solid fa-layer-group"></i>
                        </div>
                        <h3 className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white leading-tight">Vender E-books & Produtos</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 font-medium leading-relaxed">
                          Crie páginas de vendas profissionais, gerencie produtos digitais e aceite pagamentos.
                        </p>
                     </button>
                 </div>

                 {/* QUICK ACCESS BAR */}
                 <div className="mb-12">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Acesso Rápido</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <button onClick={() => handleNav('FINANCE')} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all flex items-center gap-3 group shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fa-solid fa-arrow-trend-down"></i></div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Nova Despesa</span>
                       </button>
                       
                       <button onClick={() => handleNav('FINANCE')} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex items-center gap-3 group shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fa-solid fa-chart-simple"></i></div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Relatórios</span>
                       </button>
                       
                       <button onClick={() => handleNav('COMMUNITY')} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all flex items-center gap-3 group shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fa-solid fa-users"></i></div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Comunidade</span>
                       </button>
                    </div>
                 </div>
                 
                 {/* RECENTS HEADER */}
                 <div className="flex justify-between items-end mb-6 px-1">
                     <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recentes</h2>
                     {history.length > 0 && (
                       <button onClick={onViewHistory} className="text-sm text-blue-600 font-bold hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">
                         Ver histórico <i className="fa-solid fa-arrow-right text-xs"></i>
                       </button>
                     )}
                 </div>
                 
                 {/* RECENTS LIST */}
                 {history.length === 0 ? (
                   <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center animate-scaleIn">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
                         <i className="fa-solid fa-folder-open text-3xl"></i>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-bold text-lg">Nenhum documento criado</p>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 max-w-xs mx-auto">Seu histórico de faturas e recibos aparecerá aqui. Comece criando um novo.</p>
                   </div>
                 ) : (
                   <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-slideUp">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                         {recentHistory.map((doc, idx) => (
                            <div key={doc.id} onClick={() => onLoadDocument(doc)} 
                                 className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group"
                                 style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                               <div className="flex items-center gap-5">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm transition-transform group-hover:scale-110 ${doc.type === 'INVOICE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : doc.type === 'QUOTE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'}`}>
                                      {doc.type === 'INVOICE' ? 'FAT' : doc.type === 'QUOTE' ? 'COT' : 'REC'}
                                   </div>
                                   <div>
                                      <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base">{doc.clientName || 'Sem Nome'}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 font-medium opacity-80">{doc.number} • {doc.date}</p>
                                   </div>
                               </div>
                               <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${
                                      doc.stampText?.includes('PAID') || doc.stampText?.includes('PAGO') ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50' : 
                                      doc.stampText?.includes('PEND') ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                  }`}>
                                      {doc.stampText || 'DRAFT'}
                                  </span>
                                  <p className="font-black text-slate-900 dark:text-white text-lg tabular-nums">{formatMoney(doc.total, doc.currency)}</p>
                                  <div className="flex items-center gap-2">
                                     {onDeleteDocument && (
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                                            className="w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center justify-center"
                                            title="Excluir"
                                         >
                                            <i className="fa-solid fa-trash"></i>
                                         </button>
                                     )}
                                     <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-white transition-colors"></i>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                 )}
            </div>
         )}

      {/* Product Catalog Modal */}
      {showCatalog && (
        <ProductCatalog
          userId={userId}
          t={t}
          fMoney={formatMoney}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdmin && (
        <AdminDashboard
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* User Management Modal */}
      {showUserManagement && (
        <UserManagement
          userId={userId}
          orgId={orgId || userId}
          isAdmin={companySettings.isAdmin || false}
          onClose={() => setShowUserManagement(false)}
          currentUserEmail={companySettings.contact}
        />
      )}
      </main>
    </div>
  );
};
