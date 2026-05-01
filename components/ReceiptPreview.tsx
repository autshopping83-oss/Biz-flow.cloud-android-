
import React, { forwardRef } from 'react';
import { ReceiptData, CompanySettings } from '../types';
import { getTranslation, formatMoney } from '../services/translationService';

interface Props {
  data: ReceiptData;
  companySettings?: CompanySettings;
  captureId?: string;
  layout?: 'a4' | 'thermal';
}

const DocumentPreview = forwardRef<HTMLDivElement, Props>(({ data, companySettings, captureId = "receipt-capture-area", layout = 'a4' }, ref) => {
  const lang = data.language || 'pt';
  const currency = data.currency || 'MZN';

  const t = (key: any) => getTranslation(lang, key);

  const getStampStyle = (text: string) => {
    const base = "border-[6px] px-6 py-2 rounded-xl font-black text-6xl uppercase tracking-[0.2em] opacity-30 mix-blend-multiply transform -rotate-12 border-double whitespace-nowrap";
    const textLower = text.toLowerCase();
    
    if (['pago', 'paid', 'pagado', 'payé', 'bezahlt'].some(w => textLower.includes(w))) return `${base} border-emerald-700 text-emerald-700`;
    if (['emitido', 'issued', 'emitida', 'émis', 'ausgestellt'].some(w => textLower.includes(w))) return `${base} border-blue-700 text-blue-700`;
    if (['pendente', 'pending', 'vencido', 'overdue', 'anulado', 'void', 'annulé'].some(w => textLower.includes(w))) return `${base} border-red-700 text-red-700`;
    return `${base} border-slate-700 text-slate-700`;
  };

  let title = t('receipt');
  if (data.type === 'INVOICE') title = t('invoice');
  if (data.type === 'QUOTE') title = t('quote');

  // Fallback para nome da empresa caso esteja vazio
  const displayCompanyName = data.companyName || 'BIZ-FLOW';

  const a4Style: React.CSSProperties = {
    width: '210mm',
    minHeight: '297mm',
    padding: '25mm',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column'
  };

  const thermalStyle: React.CSSProperties = {
    width: '384px',
    minHeight: 'auto',
    padding: '16px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#000000',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
    lineHeight: 1.4
  };

  if (layout === 'thermal') {
    return (
      <div ref={ref} id={captureId} style={thermalStyle}>
        <div className="flex flex-col items-center text-center mb-4">
          <div className="text-xl font-black uppercase tracking-[0.2em] mb-2">{displayCompanyName}</div>
          {data.companyContact && <div className="text-[12px] font-medium mb-1">{data.companyContact}</div>}
          {data.companyAddress && <div className="text-[12px] font-medium mb-1">{data.companyAddress}</div>}
          {data.companyNuit && <div className="text-[11px] uppercase tracking-[0.15em]">{t('taxId')}: {data.companyNuit}</div>}
        </div>

        <div className="border-t border-slate-300 my-2"></div>
        <div className="mb-3">
          <div className="text-sm font-black uppercase tracking-[0.2em] mb-1">{title}</div>
          <div className="text-[13px]">#{data.number || '0000'}</div>
          <div className="text-[12px] text-slate-700">{t('date')}: {data.date}</div>
        </div>

        <div className="border-t border-slate-300 my-2"></div>
        <div className="mb-3 text-[12px]">
          <div className="font-black uppercase tracking-[0.2em] mb-1">{t('billedTo')}</div>
          <div>{data.clientName || '---'}</div>
          {data.clientLocation && <div>{data.clientLocation}</div>}
          {data.clientContact && <div>{data.clientContact}</div>}
          {data.clientNuit && <div>{t('taxId')}: {data.clientNuit}</div>}
        </div>

        <div className="border-t border-slate-300 my-2"></div>
        <div className="space-y-3 text-[12px]">
          {data.items && data.items.length > 0 ? (
            data.items.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="font-bold">{item.description}</div>
                <div className="flex justify-between">
                  <span>{item.quantity} x {formatMoney(item.unitPrice, currency, lang)}</span>
                  <span>{formatMoney(item.total, currency, lang)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="italic text-slate-500">{t('noItems')}</div>
          )}
        </div>

        <div className="border-t border-slate-300 my-3"></div>
        <div className="space-y-2 text-[12px]">
          <div className="flex justify-between"><span>{t('subtotal')}</span><span>{formatMoney(data.subtotal, currency, lang)}</span></div>
          {data.discount > 0 && <div className="flex justify-between"><span>{t('discount')}</span><span>-{formatMoney(data.discount, currency, lang)}</span></div>}
          {data.taxRate > 0 && <div className="flex justify-between"><span>{t('tax')} ({data.taxRate}%)</span><span>{formatMoney(data.taxAmount, currency, lang)}</span></div>}
          <div className="flex justify-between font-black text-[13px]"><span>{t('finalTotal')}</span><span>{formatMoney(data.total, currency, lang)}</span></div>
        </div>

        {companySettings?.customStamp || data.stampText ? (
          <div className="border-t border-slate-300 my-4 pt-3 text-center text-[13px] font-black uppercase">
            {companySettings?.customStamp ? data.stampText || t('paid') : data.stampText}
          </div>
        ) : null}

        {(data.signatureData || companySettings?.signature) && (
          <div className="mt-3 text-center">
            <img src={data.signatureData || companySettings.signature} alt="Signature" className="mx-auto max-h-16 object-contain" />
            <div className="text-[10px] uppercase tracking-[0.2em] mt-1">{t('signature')}</div>
          </div>
        )}

        <div className="border-t border-slate-300 my-4"></div>
        <div className="text-[10px] text-center uppercase tracking-[0.2em]">{t('generatedBy')} • Biz-flow.cloud</div>
      </div>
    );
  }

  return (
    <div 
      ref={ref} 
      id={captureId}
      className="relative bg-white text-slate-900 font-sans leading-relaxed overflow-hidden"
      style={a4Style}
    >
      {/* Top Decoration */}
      <div className="h-3 bg-slate-900 w-full mb-12 flex-none"></div>

      {/* Header */}
      <div className="w-full mb-16 flex justify-between items-start">
        <div className="w-1/2">
          {data.companyLogo ? (
            <img src={data.companyLogo} alt="Logo" className="h-24 w-auto mb-6 object-contain" />
          ) : (
            <div className="mb-6">
              <h2 className="font-black text-4xl text-slate-900 tracking-tighter uppercase">{displayCompanyName}</h2>
            </div>
          )}
          <div className="text-[13px] text-slate-500 space-y-1 leading-tight font-medium">
            {data.companyAddress && <p className="flex items-start gap-2"><span className="opacity-40">●</span> {data.companyAddress}</p>}
            {data.companyContact && <p className="flex items-start gap-2"><span className="opacity-40">●</span> {data.companyContact}</p>}
            {data.companyNuit && <p className="flex items-start gap-2"><span className="opacity-40">●</span> {t('taxId')}: {data.companyNuit}</p>}
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-2 uppercase">{title}</h1>
          <div className="text-2xl font-mono text-slate-400 mb-6">#{data.number || '0000'}</div>
          <div className="text-[13px] font-bold text-slate-800">
            <span className="text-slate-400 uppercase tracking-widest mr-2">{t('date')}:</span>
            {data.date}
          </div>
        </div>
      </div>

      {/* Watermark Stamp */}
      {(data.stampText || companySettings?.customStamp) && (
        <div className="absolute top-[160px] right-[40px] z-0 pointer-events-none select-none">
           {companySettings?.customStamp ? (
             <img 
               src={companySettings.customStamp} 
               alt="Custom Stamp" 
               className="w-32 h-32 object-contain opacity-30 mix-blend-multiply transform -rotate-12" 
             />
           ) : data.stampText ? (
             <div className={getStampStyle(data.stampText)}>
               {data.stampText}
             </div>
           ) : null}
        </div>
      )}

      {/* Client Information */}
      <div className="mb-14 pt-8 border-t border-slate-100">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t('billedTo')}</h3>
         <div className="text-slate-900">
            <div className="font-black text-2xl mb-2">{data.clientName || '---'}</div>
            <div className="text-sm text-slate-600 max-w-md space-y-1">
               {data.clientLocation && <p>{data.clientLocation}</p>}
               {data.clientContact && <p>{data.clientContact}</p>}
               {data.clientNuit && <p className="font-mono text-xs opacity-70">{t('taxId')}: {data.clientNuit}</p>}
            </div>
         </div>
      </div>

      {/* Main Items Table */}
      <div className="mb-12 flex-grow">
        <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-900">
              <th className="py-4 text-[11px] font-black uppercase tracking-widest" style={{ width: '45%' }}>{t('description')}</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-center" style={{ width: '15%' }}>{t('qty')}</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-right" style={{ width: '20%' }}>{t('price')}</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-right" style={{ width: '20%' }}>{t('total')}</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {data.items && data.items.length > 0 ? (
                data.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-5 pr-4 align-top">
                        <p className="font-bold text-slate-900">{item.description}</p>
                      </td>
                      <td className="py-5 text-center align-top text-slate-600">{item.quantity}</td>
                      <td className="py-5 text-right align-top text-slate-600 font-mono">{formatMoney(item.unitPrice, currency, lang)}</td>
                      <td className="py-5 text-right align-top font-bold text-slate-900 font-mono">{formatMoney(item.total, currency, lang)}</td>
                    </tr>
                ))
            ) : (
                 <tr>
                    <td className="py-12 italic text-slate-300 text-center" colSpan={4}>---</td>
                 </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary and Footer */}
      <div className="mt-auto">
        <div className="flex justify-end pt-4 mb-20">
          <div className="w-[300px] space-y-3">
             <div className="flex justify-between text-[13px] text-slate-500">
                 <span>{t('subtotal')}</span>
                 <span className="font-mono">{formatMoney(data.subtotal, currency, lang)}</span>
             </div>
             {data.discount > 0 && (
                 <div className="flex justify-between text-[13px] text-emerald-600">
                     <span>{t('discount')}</span>
                     <span className="font-mono">- {formatMoney(data.discount, currency, lang)}</span>
                 </div>
             )}
             {data.taxRate > 0 && (
                 <div className="flex justify-between text-[13px] text-slate-500">
                     <span>{t('tax')} ({data.taxRate}%)</span>
                     <span className="font-mono">{formatMoney(data.taxAmount, currency, lang)}</span>
                 </div>
             )}
             {data.type === 'INVOICE_RECEIPT' && data.paymentMethod && (
               <div className="flex justify-between text-sm text-slate-600 mb-3">
                 <span className="font-bold">{t('paymentMethod')}</span>
                 <span className="font-mono uppercase">{t(data.paymentMethod.toLowerCase() as any)}</span>
               </div>
             )}
             <div className="flex justify-between pt-6 items-center">
                 <span className="text-[11px] font-black uppercase tracking-[0.2em]">{t('finalTotal')}</span>
                 <div className="bg-slate-900 text-white px-5 py-3 rounded-lg text-2xl font-black font-mono shadow-xl">
                     {formatMoney(data.total, currency, lang)}
                 </div>
             </div>
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-slate-100 pt-8 pb-8">
           <div className="text-center w-[250px]">
               <div className="h-20 flex flex-col justify-end items-center relative mb-2">
                 {(data.signatureData || companySettings?.signature) && (
                   <img 
                     src={data.signatureData || companySettings?.signature} 
                     alt="Signature" 
                     className="absolute bottom-1 max-h-24 max-w-full object-contain mix-blend-multiply" 
                   />
                 )}
                 <div className="w-full border-b border-slate-400"></div>
              </div>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">{t('signature')}</p>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest mb-1">Biz-flow.cloud</p>
              <p className="text-[9px] text-slate-400 font-bold">{t('generatedBy')} • {new Date().getFullYear()}</p>
           </div>
        </div>
      </div>
    </div>
  );
});

export default DocumentPreview;
