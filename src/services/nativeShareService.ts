// src/services/nativeShareService.ts
// Serviço de compartilhamento nativo usando Capacitor Share

import { Share } from '@capacitor/share';
import { AppLauncher } from '@capacitor/app-launcher';

export const NativeShareService = {
  /**
   * Abre o share sheet nativo do Android com um ficheiro
   */
  async shareFile(fileUri: string, title: string, dialogTitle?: string): Promise<void> {
    try {
      await Share.share({
        title,
        url: fileUri,
        dialogTitle: dialogTitle || 'Compartilhar Documento',
      });
    } catch (error: any) {
      if (error?.message !== 'canceled') {
        console.warn('Share error:', error);
      }
    }
  },

  /**
   * Abre o share sheet com texto apenas
   */
  async shareText(text: string, title?: string): Promise<void> {
    try {
      await Share.share({
        title: title || 'Biz-flow.cloud',
        text,
        dialogTitle: 'Compartilhar',
      });
    } catch (e) {
      console.warn('Share text error:', e);
    }
  },

  /**
   * Abre o WhatsApp com uma mensagem para um número específico
   */
  async shareWhatsApp(phone: string, text: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    try {
      await AppLauncher.openUrl({ url });
    } catch {
      window.open(url, '_blank');
    }
  },
};
