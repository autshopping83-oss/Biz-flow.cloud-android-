import { DigitalGoodsService, ItemDetails, PurchaseDetails } from '../types';
import { supabase } from './supabaseClient';

// --- CONFIGURAÇÃO GOOGLE PLAY ---
// 1. Crie uma assinatura na Play Console com este ID exato:
export const SUBSCRIPTION_ID = 'pro_monthly'; 

// 2. A Chave RSA Pública (que você pegou no console) é usada no BACKEND
// para validar o purchaseToken. Não é estritamente necessária aqui no front-end
// para iniciar a compra, mas guarde-a para futuras validações de servidor (Edge Functions).

// Helper para verificar se a API está disponível (Se estamos num TWA/Android)
export const isPlayBillingAvailable = async (): Promise<boolean> => {
  if ('getDigitalGoodsService' in window) {
    try {
      const service = await (window as any).getDigitalGoodsService('https://play.google.com/billing');
      return !!service;
    } catch (e) {
      console.warn("Digital Goods Service error (Not in TWA?):", e);
      return false;
    }
  }
  return false;
};

export const getSubscriptionDetails = async (): Promise<ItemDetails | null> => {
  try {
    if (!('getDigitalGoodsService' in window)) return null;
    
    const service = await (window as any).getDigitalGoodsService('https://play.google.com/billing') as DigitalGoodsService;
    const details = await service.getDetails([SUBSCRIPTION_ID]);
    
    return details.length > 0 ? details[0] : null;
  } catch (error) {
    console.error("Erro ao buscar detalhes da assinatura. Verifique se o ID 'pro_monthly' existe na Play Console e se o app está assinado/publicado em teste fechado.", error);
    return null;
  }
};

export const purchaseSubscription = async (userId: string): Promise<boolean> => {
  try {
    if (!('getDigitalGoodsService' in window)) throw new Error("Google Play indisponível");

    const service = await (window as any).getDigitalGoodsService('https://play.google.com/billing') as DigitalGoodsService;
    
    // Iniciar fluxo de pagamento nativo do Android
    // @ts-ignore - PaymentRequest API types incomplete in standard lib
    const request = new PaymentRequest([{
      supportedMethods: 'https://play.google.com/billing',
      data: {
        sku: SUBSCRIPTION_ID,
      },
    }]);

    const paymentResponse = await request.show();
    const { purchaseToken } = paymentResponse.details;

    // Acknowledge a compra no backend (ou aqui, se for client-side apenas para MVP)
    // NOTA: Em produção, você deve validar o purchaseToken no seu backend com a API do Google usando a chave RSA.
    // Para este MVP, vamos confiar no retorno e atualizar no Supabase.
    
    await acknowledgePurchase(userId, purchaseToken);
    
    // Finalizar a UI nativa
    await paymentResponse.complete('success');
    
    return true;
  } catch (error) {
    console.error("Erro na compra:", error);
    return false;
  }
};

const acknowledgePurchase = async (userId: string, token: string) => {
  // 1. Atualizar Perfil para PRO no Supabase
  const { error } = await supabase
      .from('profiles')
      .update({ plan: 'PRO', subscription_token: token })
      .eq('id', userId);

  if (error) console.error("Erro ao atualizar perfil:", error);
  
  // Opcional: Salvar log de transação
  await supabase.from('transactions').insert({
      user_id: userId,
      type: 'EXPENSE', // Tecnicamente é uma despesa do usuário
      amount: 0, // Valor real depende do Google, aqui registramos apenas o evento
      description: 'Assinatura Google Play PRO (Ativada)',
      category: 'Assinatura',
      date: new Date().toISOString().split('T')[0]
  });
};

// Verificar compras existentes ao iniciar o app (Restore Purchases)
export const checkActivePurchases = async (userId: string) => {
    try {
        if (!('getDigitalGoodsService' in window)) return;
        const service = await (window as any).getDigitalGoodsService('https://play.google.com/billing') as DigitalGoodsService;
        const purchases = await service.listPurchases();
        
        const proPurchase = purchases.find(p => p.itemId === SUBSCRIPTION_ID);
        
        if (proPurchase) {
            // Se o usuário tem a compra na Play Store mas não no app, ativamos
            await acknowledgePurchase(userId, proPurchase.purchaseToken);
        }
    } catch (e) {
        console.warn("Erro ao restaurar compras:", e);
    }
};