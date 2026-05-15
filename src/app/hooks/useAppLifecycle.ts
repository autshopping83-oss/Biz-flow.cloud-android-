import { useEffect } from 'react';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { supabase } from '../../services/supabaseClient';
import { syncService } from '../../services/syncService';
import { productService } from '../../services/productService';
import { getDirectoryHandle, getHistory, getSavedClients, getSavedProducts, getCompanySettings } from '../../services/storageService';
import { CompanySettings, ReceiptData, SavedClient, SavedProduct } from '../../types';
import type { Session } from '@supabase/supabase-js';

interface UseAppLifecycleParams {
  currentView: string;
  isGuest: boolean;
  setCurrentView: (view: string) => void;
  setIsGuest: (guest: boolean) => void;
  setSession: (session: Session | null) => void;
  setHistory: (history: ReceiptData[]) => void;
  setSavedClients: (clients: SavedClient[]) => void;
  setSavedProducts: (products: SavedProduct[]) => void;
  setCompanySettings: (settings: CompanySettings) => void;
  setIsOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLocalDirHandle: (handle: FileSystemDirectoryHandle | null) => void;
  onReady?: () => void;
}

export const useAppLifecycle = ({
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
}: UseAppLifecycleParams) => {
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
        if (currentView === 'loading' && view !== 'updatePassword') {
          setCurrentView('login');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('updatePassword');
        return;
      }
      if (session) {
        if (currentView !== 'history') {
          initializeUserData(session.user.id);
        }
      } else if (!isGuest && action !== 'delete_account') {
        const allowedViews = ['register', 'forgotPassword', 'updatePassword'];
        if (!allowedViews.includes(currentView)) {
          setCurrentView('login');
        }
      }
    });

    getDirectoryHandle().then(handle => {
      if (handle) setLocalDirHandle(handle);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (window.Capacitor?.isNativePlatform()) {
      BleClient.initialize().catch(console.error);
    }

    syncService.setNotifyCallback((isSyncing) => {
      setSyncing(isSyncing);
    });

    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'apiDashboard') {
        setCurrentView('apiDashboard');
      }
    };
    window.addEventListener('navigate', handleNavigate);

    onReady?.();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('navigate', handleNavigate);
    };
  }, [currentView, isGuest, setCurrentView, setIsGuest, setSession, setHistory, setSavedClients, setSavedProducts, setCompanySettings, setIsOnline, setSyncing, setLocalDirHandle, onReady]);

  const initializeUserData = async (userId: string) => {
    setIsGuest(false);
    fetchProfile(userId);
    await loadLocalData(userId);
    await syncService.pullFromSupabase(userId);
    await productService.syncFromSupabase(userId);
    await loadLocalData(userId);
    if (currentView !== 'history') setCurrentView('home');
  };

  const loadLocalData = async (userId: string) => {
    if (!userId) return;
    const hist = await getHistory(userId);
    setHistory(hist);
    setSavedClients(await getSavedClients(userId));
    setSavedProducts(await getSavedProducts(userId));
    const localSettings = await getCompanySettings(userId);
    if (localSettings) {
      setCompanySettings(prev => ({ ...prev, ...localSettings, plan: 'PRO' }));
    }
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
          theme: data.theme || 'light',
          plan: 'PRO',
          isAdmin: data.is_admin || false,
          defaultTaxRate: data.default_tax_rate || 16,
        }));
      }
    } catch {
      // Silencioso: mantém o app funcional mesmo se o perfil não existir
    }
  };

  return { initializeUserData, loadLocalData, fetchProfile };
};
