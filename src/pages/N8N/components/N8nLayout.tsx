/**
 * Layout da página N8N com sidebar de navegação entre integrações
 */

import React from 'react';
import { N8nIntegrationType, N8nIntegrationStatus } from '../types/n8n';
import { N8nStatusBadge } from './N8nStatusBadge';

interface NavItem {
  id: N8nIntegrationType;
  label: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'email',
    label: 'Email',
    icon: 'fa-solid fa-envelope',
    description: 'SendGrid, SMTP',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'fa-brands fa-whatsapp',
    description: 'Twilio, Evolution API',
  },
  {
    id: 'chatbot',
    label: 'Chatbot',
    icon: 'fa-solid fa-robot',
    description: 'Telegram, Messenger, Slack',
  },
  {
    id: 'documents',
    label: 'Documentos',
    icon: 'fa-solid fa-file-invoice',
    description: 'Notificações e sincronia',
  },
  {
    id: 'payments',
    label: 'Pagamentos',
    icon: 'fa-solid fa-credit-card',
    description: 'Notificações de pagamento',
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'fa-solid fa-users',
    description: 'Gestão de clientes',
  },
  {
    id: 'erp',
    label: 'ERP',
    icon: 'fa-solid fa-building',
    description: 'Sistemas empresariais',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    icon: 'fa-solid fa-code',
    description: 'Webhooks customizados',
  },
];

interface N8nLayoutProps {
  children: React.ReactNode;
  activeIntegration: N8nIntegrationType;
  onNavigate: (id: N8nIntegrationType) => void;
  integrationStatus: Record<string, N8nIntegrationStatus>;
  onTestConnection: () => void;
  isTesting: boolean;
  webhookUrl: string;
}

export const N8nLayout: React.FC<N8nLayoutProps> = ({
  children,
  activeIntegration,
  onNavigate,
  integrationStatus,
  onTestConnection,
  isTesting,
  webhookUrl,
}) => {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col flex-none">
        {/* Header */}
        <div className="p-4 border-b dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <i className="fa-solid fa-plug text-white text-xs"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold dark:text-white">Integrações</h2>
              <p className="text-[10px] text-slate-400">via n8n</p>
            </div>
          </div>

          {/* Test Connection Button */}
          <button
            onClick={onTestConnection}
            disabled={isTesting}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg py-2 text-xs font-bold hover:from-purple-700 hover:to-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isTesting ? (
              <i className="fa-solid fa-spinner animate-spin"></i>
            ) : (
              <i className="fa-solid fa-plug"></i>
            )}
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </button>

          {/* Webhook URL */}
          <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
            <p className="text-[9px] text-slate-400 font-bold mb-0.5">Webhook URL</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate">
              {webhookUrl}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeIntegration === item.id;
            const status = integrationStatus[item.id];

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    isActive
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <i className={item.icon}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{item.label}</span>
                    {status && <N8nStatusBadge status={status} />}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
            <p className="text-[9px] text-slate-400 font-bold mb-0.5">Status Geral</p>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  integrationStatus['webhook'] === 'connected'
                    ? 'bg-emerald-500'
                    : integrationStatus['webhook'] === 'testing'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {integrationStatus['webhook'] === 'connected'
                  ? 'Webhook ativo'
                  : integrationStatus['webhook'] === 'testing'
                  ? 'Testando...'
                  : 'Não testado'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <div className="p-6 max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
