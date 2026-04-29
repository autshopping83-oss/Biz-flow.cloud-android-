
import React, { forwardRef } from 'react';
import { ReceiptData } from '../types';
import { getTranslation, formatMoney } from '../services/translationService';

interface Props {
  data: ReceiptData;
  captureId?: string;
}

const DocumentPreview = forwardRef<HTMLDivElement, Props>(({ data, captureId = "receipt-capture-area" }, ref) => {
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

  return (
    <div 
      ref={ref} 
      id={captureId}
      className="relative bg-white text-slate-900 font-sans leading-relaxed overflow-hidden"
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        padding: '25mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column'
      }}
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
      {data.stampText && (
        <div className="absolute top-[160px] right-[40px] z-0 pointer-events-none select-none">
           <div className={getStampStyle(data.stampText)}>
             {data.stampText}
           </div>
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
                 {data.signatureData && (
                   <img 
                     src={data.signatureData} 
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
