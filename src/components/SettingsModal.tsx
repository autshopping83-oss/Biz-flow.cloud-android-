import React from 'react';
import { CompanySettings } from '../types';
import { CURRENCIES, LANGUAGES } from '../services/translationService';

interface SettingsModalProps {
  companySettings: CompanySettings;
  onClose: () => void;
  onUpdate: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStampUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestFolderPermission: () => Promise<void>;
  onSaveSettings: () => Promise<void>;
  isSavingSettings: boolean;
  localDirHandle: unknown;
  onSaveSignature: () => void;
  onClearSignature: () => void;
  settingsSignatureCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleSettingsSignatureStartDrawing: (e: MouseEvent | TouchEvent) => void;
  handleSettingsSignatureDraw: (e: MouseEvent | TouchEvent) => void;
  handleSettingsSignatureStopDrawing: () => void;
  gmailConectado?: boolean;
  gmailEmail?: string;
  onConectarGmail?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  companySettings,
  onClose,
  onUpdate,
  onLogoChange,
  onStampUpload,
  onRequestFolderPermission,
  onSaveSettings,
  isSavingSettings,
  localDirHandle,
  onSaveSignature,
  onClearSignature,
  settingsSignatureCanvasRef,
  handleSettingsSignatureStartDrawing,
  handleSettingsSignatureDraw,
  handleSettingsSignatureStopDrawing,
  gmailConectado,
  gmailEmail,
  onConectarGmail,
}) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
         style={{ paddingTop: 'var(--safe-area-top, 0px)' }}>
      <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
        <h2 className="text-xl font-bold dark:text-white">Configurações</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors">
          <i className="fa-solid fa-times text-slate-500"></i>
        </button>
      </div>
      <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Nome da Empresa</label>
            <input type="text" name="name" value={companySettings.name} onChange={onUpdate} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Seu Logotipo</label>
            <div className="flex items-center gap-4">
              {companySettings.logo && <img src={companySettings.logo} alt="logo" className="w-12 h-12 rounded-lg object-cover bg-slate-100" />}
              <input type="file" onChange={onLogoChange} accept="image/*" className="text-xs dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Endereço</label>
          <input type="text" name="address" value={companySettings.address} onChange={onUpdate} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Contacto (Geral)</label>
            <input type="text" name="contact" value={companySettings.contact} onChange={onUpdate} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">NUIT</label>
            <input type="text" name="nuit" value={companySettings.nuit} onChange={onUpdate} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">WhatsApp / Telemovel (seu)</label>
            <input type="text" name="userPhone" value={companySettings.userPhone || ''} onChange={onUpdate} placeholder="258840000000" className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Email (seu)</label>
            <input type="email" name="userEmail" value={companySettings.userEmail || ''} onChange={onUpdate} placeholder="contato@exemplo.com" className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">IVA Padrão (%)</label>
            <input type="number" name="defaultTaxRate" value={companySettings.defaultTaxRate} onChange={onUpdate} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Moeda</label>
            <select name="currency" value={companySettings.currency} onChange={onUpdate} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors">
              {CURRENCIES.map(c => <option key={`${c.code}-${c.flag}`} value={c.code}>{c.flag} {c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Idioma</label>
            <select name="language" value={companySettings.language} onChange={onUpdate} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white transition-colors">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3">Definições de Armazenamento</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Ative o armazenamento em uma pasta local para salvar PDFs diretamente no seu computador.
            Isso é recomendado para ter backups e acesso offline.
          </p>
          <button onClick={onRequestFolderPermission} className="bg-emerald-50 text-emerald-700 font-bold text-xs py-3 px-5 rounded-xl flex items-center gap-2 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors">
            <i className="fa-solid fa-folder-tree"></i>
            {localDirHandle ? 'Pasta Local Ativa' : 'Ativar Armazenamento Local (Web)'}
          </button>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3">Carimbo Personalizado</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Carregue uma imagem personalizada que será usada como carimbo em todos os seus documentos.
          </p>
          <div className="flex items-center gap-4">
            {companySettings.customStamp && <img src={companySettings.customStamp} alt="carimbo" className="w-16 h-16 rounded-lg object-cover bg-slate-100" />}
            <input type="file" onChange={onStampUpload} accept="image/*" className="text-xs dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3">Assinatura Padrão</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Desenhe sua assinatura padrão que será aplicada automaticamente a todos os documentos.
          </p>
          <div className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-crosshair mb-4">
            <canvas
              ref={settingsSignatureCanvasRef}
              width={400}
              height={128}
              className="w-full h-full"
              onMouseDown={handleSettingsSignatureStartDrawing as unknown as React.MouseEventHandler<HTMLCanvasElement>}
              onMouseMove={handleSettingsSignatureDraw as unknown as React.MouseEventHandler<HTMLCanvasElement>}
              onMouseUp={handleSettingsSignatureStopDrawing}
              onMouseLeave={handleSettingsSignatureStopDrawing}
              onTouchStart={handleSettingsSignatureStartDrawing as unknown as React.TouchEventHandler<HTMLCanvasElement>}
              onTouchMove={handleSettingsSignatureDraw as unknown as React.TouchEventHandler<HTMLCanvasElement>}
              onTouchEnd={handleSettingsSignatureStopDrawing}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onClearSignature} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Limpar</button>
            <button onClick={onSaveSignature} className="bg-purple-600 text-white font-bold text-xs py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">Guardar Assinatura</button>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3">
            <i className="fa-regular fa-envelope mr-2"></i> Email (Gmail)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Conecte a sua conta Gmail para enviar documentos diretamente por email com PDF anexo.
          </p>
          <div className="flex items-center gap-4">
            {gmailConectado ? (
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                  <i className="fa-regular fa-circle-check text-lg"></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">Gmail Conectado</p>
                  <p className="text-xs text-slate-500">{gmailEmail || 'Email sincronizado'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                  <i className="fa-regular fa-envelope text-lg"></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Gmail nao conectado</p>
                  <p className="text-xs text-slate-500">Conecte para enviar emails com PDF</p>
                </div>
              </div>
            )}
            <button onClick={onConectarGmail}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                gmailConectado
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
              }`}>
              {gmailConectado ? 'Reconectar' : 'Conectar Gmail'}
            </button>
          </div>
        </div>
      </div>
      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex gap-4 transition-colors">
        <button onClick={onClose} className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-colors">Cancelar</button>
        <button onClick={onSaveSettings} disabled={isSavingSettings} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all">{isSavingSettings ? <i className="fa-solid fa-spinner animate-spin"></i> : 'GUARDAR ALTERAÇÕES'}</button>
      </div>
    </div>
  </div>
);
