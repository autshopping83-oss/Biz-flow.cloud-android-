import React, { forwardRef } from 'react';
import { ReceiptData, CompanySettings } from '../types';
import { getTranslation, formatMoney } from '../services/translationService';

interface Props {
  data: ReceiptData;
  companySettings?: CompanySettings;
  captureId?: string;
  layout?: 'a4' | 'thermal';
}

// --- STYLES ---

const getA4Style = (theme: 'color' | 'bw'): React.CSSProperties => ({
  width: '210mm',
  minHeight: '297mm',
  padding: '20mm 25mm',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: theme === 'bw' ? '#000000' : '#0f172a',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: theme === 'bw' ? '"Courier New", Courier, monospace' : 'system-ui, -apple-system, sans-serif',
  lineHeight: theme === 'bw' ? 1.6 : 1.5,
  fontSize: theme === 'bw' ? '12px' : '14px',
});

const thermalStyle: React.CSSProperties = {
  width: '384px',
  minHeight: 'auto',
  padding: '16px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#000000',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '"Courier New", Courier, monospace',
  lineHeight: 1.4,
  fontSize: '12px',
};

// --- COMPONENT ---

const DocumentPreview = forwardRef<HTMLDivElement, Props>(({ data, companySettings, captureId = "receipt-capture-area", layout = 'a4' }, ref) => {
  const lang = data.language || 'pt';
  const currency = data.currency || 'MZN';
  const theme = data.documentTheme || 'color';

  const t = (key: string) => getTranslation(lang, key);

  const getStampStyle = (text: string, isBw: boolean) => {
    if (isBw) {
      return "border-[3px] border-black px-4 py-1 font-bold text-2xl uppercase tracking-[0.15em] opacity-40 transform -rotate-12 whitespace-nowrap bg-white";
    }
    const base = "border-[6px] px-6 py-2 rounded-xl font-black text-6xl uppercase tracking-[0.2em] opacity-30 mix-blend-multiply transform -rotate-12 border-double whitespace-nowrap";
    const textLower = text.toLowerCase();
    if (['pago', 'paid', 'pagado', 'payé', 'bezahlt'].some(w => textLower.includes(w))) return `${base} border-emerald-700 text-emerald-700`;
    if (['emitido', 'issued', 'emitida', 'émis', 'ausgestellt'].some(w => textLower.includes(w))) return `${base} border-blue-700 text-blue-700`;
    if (['pendente', 'pending', 'vencido', 'overdue', 'anulado', 'void', 'annulé'].some(w => textLower.includes(w))) return `${base} border-red-700 text-red-700`;
    return `${base} border-slate-700 text-slate-700`;
  };

  let title = t('receipt');
  if (data.type === 'INVOICE') title = t('invoice');
  if (data.type === 'INVOICE_RECEIPT') title = t('invoiceReceipt');
  if (data.type === 'QUOTE') title = t('quote');

  const displayCompanyName = data.companyName || 'BIZ-FLOW';

  // ======== LAYOUT TÉRMICO (58/80mm) ========
  if (layout === 'thermal') {
    const isBw = theme === 'bw';
    return (
      <div ref={ref} id={captureId} style={thermalStyle}>
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-3" style={{ borderBottom: isBw ? '2px solid #000' : '1px solid #94a3b8', paddingBottom: '8px' }}>
          <div className="text-lg font-black uppercase tracking-[0.2em] mb-1">{displayCompanyName}</div>
          {data.companyContact && <div className="text-[11px]">{data.companyContact}</div>}
          {data.companyAddress && <div className="text-[11px]">{data.companyAddress}</div>}
          {data.companyNuit && <div className="text-[10px] uppercase">{t('taxId')}: {data.companyNuit}</div>}
        </div>

        {/* Title & Number */}
        <div className="mb-2 text-center">
          <div className="text-sm font-black uppercase tracking-[0.2em]">{title}</div>
          <div className="text-[12px]">#{data.number || '0000'}</div>
          <div className="text-[11px]">{t('date')}: {data.date}</div>
          {data.dueDate && <div className="text-[11px]">{t('dueDate')}: {data.dueDate}</div>}
        </div>

        {/* Separator */}
        <div style={{ borderTop: isBw ? '1px dashed #000' : '1px dashed #94a3b8' }} className="my-2"></div>

        {/* Client */}
        <div className="mb-2 text-[11px]">
          <div className="font-black uppercase tracking-[0.15em] mb-1">{t('billedTo')}</div>
          <div>{data.clientName || '---'}</div>
          {data.clientLocation && <div>{data.clientLocation}</div>}
          {data.clientContact && <div>{data.clientContact}</div>}
          {data.clientNuit && <div>{t('taxId')}: {data.clientNuit}</div>}
        </div>

        {/* Separator */}
        <div style={{ borderTop: isBw ? '1px solid #000' : '1px solid #cbd5e1' }} className="my-2"></div>

        {/* Items Header */}
        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1">
          <span className="flex-1">{t('description')}</span>
          <span className="w-12 text-center">{t('qty')}</span>
          <span className="w-20 text-right">{t('total')}</span>
        </div>

        {/* Items */}
        <div className="space-y-2 text-[11px]">
          {data.items && data.items.length > 0 ? (
            data.items.map((item) => (
              <div key={item.id}>
                <div className="font-bold">{item.description}</div>
                <div className="flex justify-between text-[10px]">
                  <span className="flex-1">{item.quantity} x {formatMoney(item.unitPrice, currency, lang)}</span>
                  <span className="w-20 text-right">{formatMoney(item.total, currency, lang)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="italic text-slate-500 text-center py-2">---</div>
          )}
        </div>

        {/* Separator */}
        <div style={{ borderTop: isBw ? '2px solid #000' : '2px solid #0f172a' }} className="my-3"></div>

        {/* Totals */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between"><span>{t('subtotal')}</span><span>{formatMoney(data.subtotal, currency, lang)}</span></div>
          {data.discount > 0 && <div className="flex justify-between"><span>{t('discount')}</span><span>-{formatMoney(data.discount, currency, lang)}</span></div>}
          {data.taxRate > 0 && <div className="flex justify-between"><span>{t('tax')} ({data.taxRate}%)</span><span>{formatMoney(data.taxAmount, currency, lang)}</span></div>}
          <div className="flex justify-between font-black text-[12px] pt-1" style={{ borderTop: isBw ? '1px dashed #000' : '1px dashed #94a3b8' }}>
            <span>{t('finalTotal')}</span>
            <span>{formatMoney(data.total, currency, lang)}</span>
          </div>
        </div>

        {/* Payment Method */}
        {data.type === 'INVOICE_RECEIPT' && data.paymentMethod && (
          <div className="mt-2 text-[11px]">
            <div className="font-bold">{t('paymentMethod')}: {t(data.paymentMethod.toLowerCase() as any)}</div>
          </div>
        )}

        {/* Stamp */}
        {(companySettings?.customStamp || data.stampText) && (
          <div className="text-center mt-3 pt-2" style={{ borderTop: isBw ? '1px solid #000' : '1px solid #cbd5e1' }}>
            {companySettings?.customStamp ? (
              <img src={companySettings.customStamp} alt="Stamp" className="mx-auto h-10 object-contain opacity-60" />
            ) : (
              <div className="text-[11px] font-black uppercase tracking-[0.2em]">{data.stampText}</div>
            )}
          </div>
        )}

        {/* Signature */}
        {(data.signatureData || companySettings?.signature) && (
          <div className="mt-2 text-center">
            <img src={data.signatureData || companySettings?.signature || ''} alt="Signature" className="mx-auto max-h-12 object-contain" />
            <div className="text-[9px] uppercase tracking-[0.15em] mt-1">{t('signature')}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-3 pt-2" style={{ borderTop: isBw ? '1px dashed #000' : '1px dashed #94a3b8' }}>
          <div className="text-[9px] uppercase tracking-[0.15em]">{t('generatedBy')} • Biz-flow.cloud</div>
        </div>
      </div>
    );
  }

  // ======== LAYOUT A4 (com scaling responsivo para mobile) ========
  const isBw = theme === 'bw';
  const a4Style = getA4Style(theme);

  // Cores baseadas no tema
  const colors = isBw 
    ? { primary: '#000000', secondary: '#333333', muted: '#666666', light: '#e5e5e5', border: '#cccccc', accent: '#000000' }
    : { primary: '#0f172a', secondary: '#334155', muted: '#94a3b8', light: '#f1f5f9', border: '#e2e8f0', accent: '#2563eb' };

  return (
    <div className="a4-responsive-wrapper" style={{ overflow: 'hidden', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <style>{`
        .a4-responsive-wrapper .a4-content {
          transform-origin: top center;
          width: 210mm;
        }
        @media (max-width: 820px) {
          .a4-responsive-wrapper .a4-content { transform: scale(0.48); }
          .a4-responsive-wrapper { height: 143mm; }
        }
        @media (max-width: 500px) {
          .a4-responsive-wrapper .a4-content { transform: scale(0.43); }
          .a4-responsive-wrapper { height: 128mm; }
        }
        @media (max-width: 400px) {
          .a4-responsive-wrapper .a4-content { transform: scale(0.38); }
          .a4-responsive-wrapper { height: 113mm; }
        }
      `}</style>
      <div ref={ref} id={captureId} style={a4Style} className="a4-content">
      
      {/* === TOP BAR === */}
      <div 
        style={{ 
          height: isBw ? '4px' : '8px', 
          backgroundColor: colors.primary, 
          width: '100%', 
          marginBottom: isBw ? '24px' : '32px', 
          flexShrink: 0 
        }}
      ></div>

      {/* === HEADER === */}
      <div style={{ marginBottom: isBw ? '24px' : '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        {/* Left: Company Info */}
        <div style={{ width: '50%' }}>
          {data.companyLogo ? (
            <img src={data.companyLogo} alt="Logo" style={{ height: isBw ? '48px' : '72px', marginBottom: '16px', objectFit: 'contain', filter: isBw ? 'grayscale(100%) contrast(120%)' : 'none' }} />
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ 
                fontWeight: 900, 
                fontSize: isBw ? '20px' : '28px', 
                color: colors.primary, 
                letterSpacing: '-0.03em', 
                textTransform: 'uppercase',
                fontFamily: isBw ? '"Courier New", monospace' : 'inherit'
              }}>
                {displayCompanyName}
              </h2>
            </div>
          )}
          <div style={{ fontSize: isBw ? '11px' : '12px', color: colors.muted, lineHeight: 1.6 }}>
            {data.companyAddress && <div>{data.companyAddress}</div>}
            {data.companyContact && <div>{data.companyContact}</div>}
            {data.companyNuit && <div style={{ fontFamily: 'monospace', fontSize: isBw ? '10px' : '11px' }}>{t('taxId')}: {data.companyNuit}</div>}
          </div>
        </div>

        {/* Right: Document Title */}
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ 
            fontWeight: 900, 
            fontSize: isBw ? '28px' : '42px', 
            color: colors.primary, 
            letterSpacing: '-0.02em', 
            marginBottom: isBw ? '4px' : '8px',
            textTransform: 'uppercase',
            fontFamily: isBw ? '"Courier New", monospace' : 'inherit'
          }}>
            {title}
          </h1>
          <div style={{ fontSize: isBw ? '14px' : '18px', fontFamily: 'monospace', color: colors.muted, marginBottom: isBw ? '8px' : '16px' }}>
            #{data.number || '0000'}
          </div>
          <div style={{ fontSize: isBw ? '11px' : '12px', color: colors.secondary }}>
            <span style={{ color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '8px', fontWeight: 700 }}>{t('date')}:</span>
            {data.date}
          </div>
          {data.dueDate && (
            <div style={{ fontSize: isBw ? '11px' : '12px', color: colors.secondary, marginTop: '4px' }}>
              <span style={{ color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '8px', fontWeight: 700 }}>{t('dueDate')}:</span>
              {data.dueDate}
            </div>
          )}
        </div>
      </div>

      {/* === WATERMARK STAMP === */}
      {(data.stampText || companySettings?.customStamp) && (
        <div style={{ position: 'absolute', top: isBw ? '120px' : '160px', right: isBw ? '25px' : '40px', zIndex: 0, pointerEvents: 'none', userSelect: 'none' }}>
          {companySettings?.customStamp ? (
            <img 
              src={companySettings.customStamp} 
              alt="Stamp" 
              style={{ 
                width: isBw ? '80px' : '120px', 
                height: isBw ? '80px' : '120px', 
                objectFit: 'contain', 
                opacity: isBw ? 0.25 : 0.3, 
                transform: 'rotate(-12deg)',
                filter: isBw ? 'grayscale(100%)' : 'none'
              }} 
            />
          ) : (
            <div className={getStampStyle(data.stampText || '', isBw)}>
              {data.stampText}
            </div>
          )}
        </div>
      )}

      {/* === CLIENT INFO === */}
      <div style={{ 
        marginBottom: isBw ? '20px' : '32px', 
        paddingTop: isBw ? '12px' : '24px', 
        borderTop: `1px solid ${colors.light}`,
        flexShrink: 0
      }}>
        <h3 style={{ 
          fontSize: isBw ? '9px' : '10px', 
          fontWeight: 900, 
          color: colors.muted, 
          textTransform: 'uppercase', 
          letterSpacing: '0.2em', 
          marginBottom: isBw ? '8px' : '12px' 
        }}>
          {t('billedTo')}
        </h3>
        <div style={{ color: colors.primary }}>
          <div style={{ fontWeight: 900, fontSize: isBw ? '16px' : '22px', marginBottom: isBw ? '4px' : '8px' }}>
            {data.clientName || '---'}
          </div>
          <div style={{ fontSize: isBw ? '11px' : '13px', color: isBw ? '#333' : '#475569', maxWidth: '400px' }}>
            {data.clientLocation && <div>{data.clientLocation}</div>}
            {data.clientContact && <div>{data.clientContact}</div>}
            {data.clientNuit && <div style={{ fontFamily: 'monospace', fontSize: isBw ? '10px' : '12px', opacity: 0.7 }}>{t('taxId')}: {data.clientNuit}</div>}
          </div>
        </div>
      </div>

      {/* === ITEMS TABLE === */}
      <div style={{ marginBottom: isBw ? '16px' : '32px', flexGrow: 1 }}>
        {/* Table Header */}
        <div style={{ 
          display: 'flex', 
          borderBottom: isBw ? `2px solid ${colors.primary}` : `2px solid ${colors.primary}`,
          paddingBottom: isBw ? '8px' : '12px',
          marginBottom: isBw ? '4px' : '0'
        }}>
          <div style={{ flex: '4', fontSize: isBw ? '9px' : '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: colors.primary }}>
            {t('description')}
          </div>
          <div style={{ flex: '1', textAlign: 'center', fontSize: isBw ? '9px' : '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: colors.primary }}>
            {t('qty')}
          </div>
          <div style={{ flex: '2', textAlign: 'right', fontSize: isBw ? '9px' : '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: colors.primary }}>
            {t('price')}
          </div>
          <div style={{ flex: '2', textAlign: 'right', fontSize: isBw ? '9px' : '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: colors.primary }}>
            {t('total')}
          </div>
        </div>

        {/* Table Rows */}
        {data.items && data.items.length > 0 ? (
          data.items.map((item) => (
            <div key={item.id} style={{ 
              display: 'flex', 
              padding: isBw ? '8px 0' : '12px 0', 
              borderBottom: `1px solid ${colors.light}`,
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: '4', paddingRight: '12px' }}>
                <div style={{ fontWeight: 700, color: colors.primary, fontSize: isBw ? '11px' : '13px' }}>{item.description}</div>
              </div>
              <div style={{ flex: '1', textAlign: 'center', color: isBw ? '#333' : colors.secondary, fontSize: isBw ? '11px' : '13px' }}>
                {item.quantity}
              </div>
              <div style={{ flex: '2', textAlign: 'right', fontFamily: 'monospace', color: isBw ? '#333' : colors.secondary, fontSize: isBw ? '11px' : '13px' }}>
                {formatMoney(item.unitPrice, currency, lang)}
              </div>
              <div style={{ flex: '2', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: colors.primary, fontSize: isBw ? '11px' : '13px' }}>
                {formatMoney(item.total, currency, lang)}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', fontStyle: 'italic', color: colors.muted }}>
            ---
          </div>
        )}
      </div>

      {/* === SUMMARY & FOOTER (pushes to bottom) === */}
      <div style={{ marginTop: 'auto', flexShrink: 0 }}>
        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: isBw ? '24px' : '40px' }}>
          <div style={{ width: isBw ? '240px' : '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isBw ? '11px' : '13px', color: isBw ? '#333' : colors.muted, marginBottom: '6px' }}>
              <span>{t('subtotal')}</span>
              <span style={{ fontFamily: 'monospace' }}>{formatMoney(data.subtotal, currency, lang)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isBw ? '11px' : '13px', color: isBw ? '#000' : '#059669', marginBottom: '6px' }}>
                <span>{t('discount')}</span>
                <span style={{ fontFamily: 'monospace' }}>- {formatMoney(data.discount, currency, lang)}</span>
              </div>
            )}
            {data.taxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isBw ? '11px' : '13px', color: isBw ? '#333' : colors.muted, marginBottom: '6px' }}>
                <span>{t('tax')} ({data.taxRate}%)</span>
                <span style={{ fontFamily: 'monospace' }}>{formatMoney(data.taxAmount, currency, lang)}</span>
              </div>
            )}
            {data.type === 'INVOICE_RECEIPT' && data.paymentMethod && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isBw ? '11px' : '13px', color: isBw ? '#000' : colors.secondary, marginBottom: '8px' }}>
                <span style={{ fontWeight: 700 }}>{t('paymentMethod')}</span>
                <span style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>{t(data.paymentMethod.toLowerCase() as any)}</span>
              </div>
            )}
            
            {/* Total Box */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingTop: isBw ? '12px' : '16px',
              borderTop: isBw ? `2px solid ${colors.primary}` : `2px solid ${colors.primary}`,
              marginTop: isBw ? '8px' : '4px'
            }}>
              <span style={{ 
                fontSize: isBw ? '10px' : '11px', 
                fontWeight: 900, 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em',
                color: colors.primary 
              }}>
                {t('finalTotal')}
              </span>
              <div style={{ 
                backgroundColor: isBw ? colors.primary : colors.accent, 
                color: '#ffffff', 
                padding: isBw ? '6px 14px' : '10px 20px', 
                borderRadius: isBw ? '0' : '8px',
                fontSize: isBw ? '16px' : '22px', 
                fontWeight: 900, 
                fontFamily: 'monospace',
                boxShadow: isBw ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}>
                {formatMoney(data.total, currency, lang)}
              </div>
            </div>
          </div>
        </div>

        {/* Signature & Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end',
          paddingTop: isBw ? '16px' : '24px',
          borderTop: `1px solid ${colors.light}`
        }}>
          {/* Signature */}
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: isBw ? '48px' : '64px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', marginBottom: '8px' }}>
              {(data.signatureData || companySettings?.signature) && (
                <img 
                  src={data.signatureData || companySettings?.signature} 
                  alt="Signature" 
                  style={{ 
                    position: 'absolute', 
                    bottom: '4px', 
                    maxHeight: isBw ? '48px' : '72px', 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    filter: isBw ? 'grayscale(100%) contrast(150%)' : 'none',
                    mixBlendMode: isBw ? 'multiply' : 'multiply'
                  }} 
                />
              )}
              <div style={{ width: '100%', borderBottom: `1px solid ${colors.border}` }}></div>
            </div>
            <div style={{ fontSize: '8px', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900 }}>
              {t('signature')}
            </div>
          </div>

          {/* Generated By */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: isBw ? '8px' : '9px', fontWeight: 900, color: isBw ? '#999' : colors.light, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>
              Biz-flow.cloud
            </div>
            <div style={{ fontSize: '8px', color: colors.muted, fontWeight: 700 }}>
              {t('generatedBy')} • {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
});

export default DocumentPreview;
