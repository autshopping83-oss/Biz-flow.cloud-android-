/**
 * API Documentation Page
 * 
 * Página pública de documentação da API do BizFlow Cloud.
 * Acessível sem cadastro/login.
 * 
 * Rotas:
 * - /api-docs (página principal)
 * - /api-docs/n8n (documentação específica do webhook n8n)
 */

import React, { useState, useEffect } from 'react';
import { apiService, ApiEndpoint } from '../services/apiService';

// ============================================================
// HELPER COMPONENTS
// ============================================================

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <div className="flex gap-4">
    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
      {number}
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-bold dark:text-white mb-2">{title}</h4>
      {children}
    </div>
  </div>
);

const UseCaseCard: React.FC<{ icon: string; title: string; description: string; color: string }> = ({ icon, title, description, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30 text-blue-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30 text-purple-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-600',
  };
  return (
    <div className={`rounded-xl p-4 border ${colorMap[color] || colorMap.blue}`}>
      <div className="flex items-center gap-3 mb-2">
        <i className={`${icon} text-lg`}></i>
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      <p className="text-xs opacity-70">{description}</p>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

interface ApiDocsProps {
  onBack?: () => void;
  initialTab?: 'general' | 'n8n';
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ onBack, initialTab = 'general' }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'n8n'>(initialTab);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    try {
      const eps = apiService.listEndpoints();
      setEndpoints(eps);
    } catch {
      setEndpoints([]);
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const testHealthEndpoint = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await apiService.handleRequest({
        method: 'GET',
        path: '/health',
      });
      setTestResult(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setTestResult(`Erro: ${e.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-500';
      case 'POST': return 'bg-blue-500';
      case 'PUT': return 'bg-amber-500';
      case 'PATCH': return 'bg-purple-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <i className="fa-solid fa-code text-white text-xs"></i>
            </div>
            <div>
              <h1 className="text-sm font-bold dark:text-white">API Documentation</h1>
              <p className="text-[10px] text-slate-400">BizFlow Cloud REST API</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full font-mono">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 flex gap-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <i className="fa-solid fa-book mr-2"></i>
            Documentação Geral
          </button>
          <button
            onClick={() => setActiveTab('n8n')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'n8n'
                ? 'text-purple-600 border-purple-600'
                : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <i className="fa-solid fa-plug mr-2"></i>
            Webhook n8n
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'general' ? (
          <GeneralDocs
            endpoints={endpoints}
            copyToClipboard={copyToClipboard}
            copied={copied}
            testHealthEndpoint={testHealthEndpoint}
            testLoading={testLoading}
            testResult={testResult}
            getMethodColor={getMethodColor}
          />
        ) : (
          <N8nDocs copyToClipboard={copyToClipboard} copied={copied} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t dark:border-slate-800 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-400">
            BizFlow Cloud API &copy; {new Date().getFullYear()} &mdash; 
            Documentação pública disponível para integrações.
          </p>
        </div>
      </footer>
    </div>
  );
};

// ============================================================
// GENERAL DOCS TAB
// ============================================================

interface GeneralDocsProps {
  endpoints: ApiEndpoint[];
  copyToClipboard: (text: string, label: string) => void;
  copied: string | null;
  testHealthEndpoint: () => void;
  testLoading: boolean;
  testResult: string | null;
  getMethodColor: (method: string) => string;
}

const GeneralDocs: React.FC<GeneralDocsProps> = ({
  endpoints, copyToClipboard, copied,
  testHealthEndpoint, testLoading, testResult, getMethodColor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAuth, setFilterAuth] = useState<'all' | 'auth' | 'public'>('all');

  const filteredEndpoints = endpoints.filter(ep => {
    const matchesSearch = ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ep.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAuth = filterAuth === 'all' ? true : filterAuth === 'auth' ? ep.auth : !ep.auth;
    return matchesSearch && matchesAuth;
  });

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-6 md:p-8 border border-blue-100 dark:border-blue-900/20">
        <h2 className="text-xl font-bold dark:text-white mb-3">Visão Geral</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          A API RESTful do BizFlow Cloud permite integrar o aplicativo com serviços externos,
          automatizar a criação de documentos, sincronizar dados e muito mais.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2">
              <i className="fa-solid fa-bolt text-blue-500 text-sm"></i>
            </div>
            <h4 className="text-xs font-bold dark:text-white mb-1">Rápido</h4>
            <p className="text-[10px] text-slate-400">Respostas em milissegundos com cache local IndexedDB</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-2">
              <i className="fa-solid fa-shield text-emerald-500 text-sm"></i>
            </div>
            <h4 className="text-xs font-bold dark:text-white mb-1">Seguro</h4>
            <p className="text-[10px] text-slate-400">Autenticação via API Key ou userId</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-2">
              <i className="fa-solid fa-wifi text-purple-500 text-sm"></i>
            </div>
            <h4 className="text-xs font-bold dark:text-white mb-1">Offline-first</h4>
            <p className="text-[10px] text-slate-400">Funciona offline, sincroniza quando online</p>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
        <h3 className="text-sm font-bold dark:text-white mb-3">Base URL</h3>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-mono text-sm flex items-center justify-between">
          <code className="text-blue-600 dark:text-blue-400">/api</code>
          <button
            onClick={() => copyToClipboard('/api', 'base-url')}
            className="text-xs text-slate-400 hover:text-blue-500 transition-colors"
          >
            {copied === 'base-url' ? <i className="fa-solid fa-check text-emerald-500"></i> : <i className="fa-solid fa-copy"></i>}
          </button>
        </div>
      </section>

      {/* Authentication */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
        <h3 className="text-sm font-bold dark:text-white mb-3">Autenticação</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Endpoints protegidos requerem autenticação. Forneça o userId ou uma API Key.
        </p>
        <div className="space-y-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Via Header:</p>
            <code className="text-sm font-mono text-blue-600 dark:text-blue-400">x-api-key: bf_your_api_key_here</code>
            <button
              onClick={() => copyToClipboard('x-api-key: bf_your_api_key_here', 'auth-header')}
              className="ml-2 text-xs text-slate-400 hover:text-blue-500"
            >
              {copied === 'auth-header' ? <i className="fa-solid fa-check text-emerald-500"></i> : <i className="fa-solid fa-copy"></i>}
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Via Query Parameter:</p>
            <code className="text-sm font-mono text-blue-600 dark:text-blue-400">?api_key=bf_your_api_key_here</code>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Via userId (in-app):</p>
            <code className="text-sm font-mono text-blue-600 dark:text-blue-400">{`{ userId: "user-uuid-aqui" }`}</code>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold dark:text-white">Endpoints</h3>
          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{filteredEndpoints.length} endpoints</span>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar endpoints..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs dark:text-white"
            />
          </div>
          <select
            value={filterAuth}
            onChange={(e) => setFilterAuth(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="auth">Autenticados</option>
            <option value="public">Públicos</option>
          </select>
        </div>

        <div className="space-y-2">
          {filteredEndpoints.map((ep, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${getMethodColor(ep.method)}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-slate-700 dark:text-slate-300 flex-1">{ep.path}</code>
                {ep.auth ? (
                  <span className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full font-bold">
                    <i className="fa-solid fa-lock mr-1"></i>Auth
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full font-bold">
                    <i className="fa-solid fa-unlock mr-1"></i>Public
                  </span>
                )}
              </div>
              <div className="px-4 pb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">{ep.description}</p>
              </div>
            </div>
          ))}
          {filteredEndpoints.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <i className="fa-solid fa-search text-2xl mb-2"></i>
              <p className="text-sm">Nenhum endpoint encontrado</p>
            </div>
          )}
        </div>
      </section>

      {/* Try It */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
        <h3 className="text-sm font-bold dark:text-white mb-3">
          <i className="fa-solid fa-flask text-purple-500 mr-2"></i>
          Testar API
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Teste o endpoint público de health check:
        </p>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
          <code className="text-sm font-mono text-blue-600 dark:text-blue-400">GET /api/health</code>
        </div>
        <button
          onClick={testHealthEndpoint}
          disabled={testLoading}
          className="bg-purple-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-purple-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
        >
          {testLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-play"></i>}
          {testLoading ? 'Testando...' : 'Executar Teste'}
        </button>
        {testResult && (
          <div className="mt-4 bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-emerald-400 font-mono">{testResult}</pre>
          </div>
        )}
      </section>

      {/* Code Examples */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
        <h3 className="text-sm font-bold dark:text-white mb-3">Exemplos de Uso</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">JavaScript (Fetch)</h4>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto relative group">
              <button
                onClick={() => copyToClipboard(`// Listar documentos
const response = await fetch('/api/documents', {
  headers: { 'x-api-key': 'bf_sua_chave_aqui' }
});
const data = await response.json();`, 'js-fetch')}
                className="absolute top-2 right-2 text-xs text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === 'js-fetch' ? <i className="fa-solid fa-check text-emerald-500"></i> : <i className="fa-solid fa-copy"></i>}
              </button>
              <pre className="text-xs text-emerald-400 font-mono">{`// Listar documentos
const response = await fetch('/api/documents', {
  headers: { 'x-api-key': 'bf_sua_chave_aqui' }
});
const data = await response.json();`}</pre>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">In-app (window.__BIZFLOW_API__)</h4>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto relative group">
              <button
                onClick={() => copyToClipboard(`// Acessar API diretamente no app
const result = await window.__BIZFLOW_API__.request({
  method: 'GET',
  path: '/stats',
  userId: 'seu-user-id'
});`, 'js-inapp')}
                className="absolute top-2 right-2 text-xs text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === 'js-inapp' ? <i className="fa-solid fa-check text-emerald-500"></i> : <i className="fa-solid fa-copy"></i>}
              </button>
              <pre className="text-xs text-emerald-400 font-mono">{`// Acessar API diretamente no app
const result = await window.__BIZFLOW_API__.request({
  method: 'GET',
  path: '/stats',
  userId: 'seu-user-id'
});`}</pre>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">n8n (HTTP Request Node)</h4>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto relative group">
              <button
                onClick={() => copyToClipboard(`{
  "method": "POST",
  "url": "https://seu-dominio.com/api/n8n/webhook",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "event": "document.create",
    "data": {
      "clientName": "Cliente Exemplo",
      "total": 1500,
      "items": [
        { "description": "Produto A", "quantity": 1, "unitPrice": 1500, "total": 1500 }
      ]
    }
  }
}`, 'n8n-json')}
                className="absolute top-2 right-2 text-xs text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === 'n8n-json' ? <i className="fa-solid fa-check text-emerald-500"></i> : <i className="fa-solid fa-copy"></i>}
              </button>
              <pre className="text-xs text-emerald-400 font-mono">{`{
  "method": "POST",
  "url": "https://seu-dominio.com/api/n8n/webhook",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "event": "document.create",
    "data": {
      "clientName": "Cliente Exemplo",
      "total": 1500,
      "items": [
        { "description": "Produto A", "quantity": 1, "unitPrice": 1500, "total": 1500 }
      ]
    }
  }
}`}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ============================================================
// N8N WEBHOOK DOCS TAB
// ============================================================

interface N8nDocsProps {
  copyToClipboard: (text: string, label: string) => void;
  copied: string | null;
}

const N8nDocs: React.FC<N8nDocsProps> = ({ copyToClipboard, copied }) => {
  const events = [
    {
      event: 'document.create',
      description: 'Criar um novo documento (fatura/recibo)',
      payload: `{
  "event": "document.create",
  "data": {
    "type": "INVOICE",
    "clientName": "Cliente Exemplo",
    "clientContact": "258840000000",
    "clientNuit": "123456789",
    "items": [
      {
        "description": "Produto A",
        "quantity": 2,
        "unitPrice": 750,
        "total": 1500
      }
    ],
    "subtotal": 1500,
    "taxRate": 16,
    "taxAmount": 240,
    "total": 1740
  }
}`,
    },
    {
      event: 'sync.trigger',
      description: 'Forçar sincronização com Supabase',
      payload: `{
  "event": "sync.trigger"
}`,
    },
    {
      event: 'notification.sent',
      description: 'Confirmar que uma notificação foi enviada',
      payload: `{
  "event": "notification.sent",
  "data": {
    "channel": "whatsapp",
    "recipient": "258840000000",
    "status": "delivered"
  }
}`,
    },
    {
      event: 'test.connection',
      description: 'Testar conexão entre n8n e BizFlow',
      payload: `{
  "event": "test.connection"
}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <section className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-2xl p-6 md:p-8 border border-purple-100 dark:border-purple-900/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-plug text-white"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white">Webhook n8n</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Integração com n8n.io</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          O BizFlow Cloud expõe um webhook para receber eventos do n8n. 
          Configure um nó "Webhook" no n8n apontando para o endpoint abaixo.
        </p>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-bold mb-1">Webhook URL</p>
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono text-purple-600 dark:text-purple-400">POST /api/n8n/webhook</code>
            <button
              onClick={() => copyToClipboard('POST /api/n8n/webhook', 'webhook-url')}
              className="text-xs text-slate-400 hover:text-purple-500"
            >
              {copied === 'webhook-url' ? <i className="fa-solid fa-check text-emerald-500"></i> : <i className="fa-solid fa-copy"></i>}
            </button>
          </div>
        </div>
      </section>

      {/* How to configure in n8n */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
        <h3 className="text-sm font-bold dark:text-white mb-4">
          <i className="fa-solid fa-gear text-purple-500 mr-2"></i>
          Configuração no n8n
        </h3>
        <div className="space-y-4">
          <Step number={1} title="Adicionar nó Webhook">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No n8n, adicione um nó <strong>Webhook</strong> ao seu workflow.
            </p>
          </Step>
          <Step number={2} title="Configurar o Webhook">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Method:</span>
                <code className="font-mono text-purple-600 dark:text-purple-400">POST</code>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Path:</span>
                <code className="font-mono text-purple-600 dark:text-purple-400">/api/n8n/webhook</code>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Response Mode:</span>
                <code className="font-mono text-purple-600 dark:text-purple-400">Last Node</code>
              </div>
            </div>
          </Step>
          <Step number={3} title="Adicionar nó HTTP Request">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ou use um nó <strong>HTTP Request</strong> para chamar a API diretamente:
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mt-2">
              <code className="text-xs font-mono text-blue-600 dark:text-blue-400">
                POST https://seu-dominio.com/api/n8n/webhook
              </code>
            </div>
          </Step>
        </div>
      </section>

      {/* Events */}
      <section>
        <h3 className="text-sm font-bold dark:text-white mb-4">Eventos Suportados</h3>
        <div className="space-y-4">
          {events.map((evt, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <code className="text-sm font-mono text-purple-600 dark:text-purple-400 font-bold">{evt.event}</code>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{evt.description}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(evt.payload, evt.event)}
                    className="text-xs text-slate-400 hover:text-purple-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border dark:border-slate-700"
                  >
                    {copied === evt.event ? <><i className="fa-solid fa-check text-emerald-500 mr-1"></i>Copiado</> : <><i className="fa-solid fa-copy mr-1"></i>Copiar</>}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <pre className="text-xs text-emerald-400 font-mono bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">{evt.payload}</pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Response Format */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
        <h3 className="text-sm font-bold dark:text-white mb-3">Formato da Resposta</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Todos os endpoints retornam respostas no formato JSON:
        </p>
        <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-emerald-400 font-mono">{`{
  "status": 200,
  "success": true,
  "data": { ... },
  "message": "Operação concluída",
  "timestamp": 1715099999999
}`}</pre>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-500 mb-1">Sucesso (200)</p>
            <code className="text-xs font-mono text-emerald-500">{`{ "success": true, "data": {...} }`}</code>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-500 mb-1">Erro (400/401/404/500)</p>
            <code className="text-xs font-mono text-red-500">{`{ "success": false, "error": "..." }`}</code>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
        <h3 className="text-sm font-bold dark:text-white mb-4">
          <i className="fa-solid fa-lightbulb text-amber-500 mr-2"></i>
          Casos de Uso
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <UseCaseCard
            icon="fa-solid fa-envelope"
            title="Notificação por Email"
            description="Disparar emails transacionais via n8n quando um documento é criado"
            color="blue"
          />
          <UseCaseCard
            icon="fa-brands fa-whatsapp"
            title="Alerta WhatsApp"
            description="Enviar notificações WhatsApp para clientes sobre faturas vencidas"
            color="emerald"
          />
          <UseCaseCard
            icon="fa-solid fa-robot"
            title="Chatbot Automático"
            description="Integrar chatbot para responder dúvidas de clientes automaticamente"
            color="purple"
          />
          <UseCaseCard
            icon="fa-solid fa-cloud-upload-alt"
            title="Sincronização Automática"
            description="Sincronizar dados entre BizFlow Cloud e outros sistemas via n8n"
            color="amber"
          />
        </div>
      </section>
    </div>
  );
};
