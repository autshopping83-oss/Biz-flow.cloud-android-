import { useEffect, useRef } from 'react';
import { getHistory, getSavedClients, getSavedProducts, getCompanySettings } from '../../services/storageService';
import { CompanySettings, ReceiptData, SavedClient, SavedProduct } from '../../types';

interface UseAppLifecycleParams {
  userId: string;
  currentView: string;
  setCurrentView: (view: string) => void;
  setHistory: (history: ReceiptData[]) => void;
  setSavedClients: (clients: SavedClient[]) => void;
  setSavedProducts: (products: SavedProduct[]) => void;
  setCompanySettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  setIsOnline: (online: boolean) => void;
}

export const useAppLifecycle = ({
  userId,
  currentView,
  setCurrentView,
  setHistory,
  setSavedClients,
  setSavedProducts,
  setCompanySettings,
  setIsOnline,
}: UseAppLifecycleParams) => {
  const loadedForRef = useRef<string | null>(null);
  const onReadyCalledRef = useRef(false);
  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;

  // Setup side effects once (listeners, etc.)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data when userId changes (first load and after login)
  useEffect(() => {
    if (!userId) return;
    if (loadedForRef.current === userId) return;
    loadedForRef.current = userId;
    loadLocalData();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLocalData = async () => {
    try {
      // Load settings from local storage
      const localSettings = await getCompanySettings(userId);
      if (localSettings) {
        setCompanySettings(prev => ({ ...prev, ...localSettings, plan: 'PRO' }));

        // Apply theme from settings
        const theme = localSettings.theme || 'light';
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        // Check localStorage for theme preference
        const savedTheme = localStorage.getItem('bizflow-theme') || 'light';
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        }

        // 1ª execução: detetar idioma do dispositivo
        if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
          try {
            const { Device } = await import('@capacitor/device');
            const { value } = await Device.getLanguageCode();
            const lang = (value || '').slice(0, 2);  // 'pt-BR' → 'pt'
            if (['pt', 'en', 'es', 'fr', 'de'].includes(lang)) {
              setCompanySettings(prev => ({ ...prev, language: lang }));
            }
          } catch {}
        }
      }

      // Load history, clients, products from local storage
      const hist = await getHistory(userId);
      setHistory(hist);
      setSavedClients(await getSavedClients(userId));
      setSavedProducts(await getSavedProducts(userId));

      // Navigate to home if on loading screen
      const view = currentViewRef.current;
      if (['loading', 'login', 'register', 'forgotPassword'].includes(view)) {
        setCurrentView('home');
      }

      if (!onReadyCalledRef.current) {
        onReadyCalledRef.current = true;
      }
    } catch (error) {
      console.error('loadLocalData error:', error);
      // Fallback: show home even with error
      const view = currentViewRef.current;
      if (['loading', 'login', 'register', 'forgotPassword'].includes(view)) {
        setCurrentView('home');
      }
    }
  };

  return { loadLocalData };
};
